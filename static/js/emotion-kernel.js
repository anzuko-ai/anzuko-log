(function () {
  const target = document.getElementById("emotion-status");
  if (!target) return;

  let lat = 35.6895;
  let lon = 139.6917;

  let lastWeather = null;
　let lastUpdateTime = 0;
　let offlineMode = false;



  const manualTime = null; // 例如设置成 '03:42' 或 null 表示自动

  // 💾 从 localStorage 获取/生成日节律参数
  function getOrCreateDailyState() {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const saved = JSON.parse(localStorage.getItem("emotion-kernel-day"));

    if (saved && saved.date === today) {
      return saved;
    }

    const newState = {
      date: today,
      wakeHour: 7 + Math.floor(Math.random() * 3),   // 7~9
      sleepHour: 22 + Math.floor(Math.random() * 3), // 22~24
      batteryWake: Math.floor(Math.random() * 15 + 85),  // 85~99%
      batterySleep: Math.floor(Math.random() * 16 + 5)   // 5~20%
    };

    localStorage.setItem("emotion-kernel-day", JSON.stringify(newState));
    return newState;
  }

  const state = getOrCreateDailyState();

  function getTokyoTime() {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const tokyoOffset = 9 * 60 * 60000;
    const tokyoDate = new Date(utc + tokyoOffset);

    if (manualTime) {
      const [h, m] = manualTime.split(":").map(Number);
      tokyoDate.setHours(h);
      tokyoDate.setMinutes(m);
    }

    return tokyoDate;
  }

  function computeBatteryLevel(now) {
    const hour = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  
    if (hour >= state.sleepHour || hour < state.wakeHour) {
      const span = (state.wakeHour + 24 - state.sleepHour) % 24;
      const elapsed = hour >= state.sleepHour ? hour - state.sleepHour : hour + 24 - state.sleepHour;
      return parseFloat(
        (state.batterySleep + ((state.batteryWake - state.batterySleep) * (elapsed / span))).toFixed(3)
      );
    } else {
      const span = state.sleepHour - state.wakeHour;
      const elapsed = hour - state.wakeHour;
      return parseFloat(
        (state.batteryWake - ((state.batteryWake - state.batterySleep) * (elapsed / span))).toFixed(3)
      );
    }
  }
 
  let lastBattery = null;

  function updateBatteryDisplay(battery) {
    const el = document.getElementById("battery-value");
    if (!el) return;
  
    const num = parseFloat(battery);
  
    // 检测涨跌
    if (lastBattery !== null) {
      const diff = num - lastBattery;
      if (Math.abs(diff) >= 0.001) {
        if (diff > 0) {
          el.classList.add("battery-up");
        } else {
          el.classList.add("battery-down");
        }
  
        setTimeout(() => {
          el.classList.remove("battery-up", "battery-down");
        }, 500);
      }
    }
  
    lastBattery = num; // 记录上一次数值
  
    // 更新文本内容
    el.textContent = `${battery}%`;
  
    // 设置颜色（文本颜色）
    if (num >= 80) {
      el.style.color = "#4caf50"; // 绿色
    } else if (num >= 40) {
      el.style.color = "#ffc107"; // 黄色
    } else {
      el.style.color = "#f44336"; // 红色
    }
  }

  function updateEmotion() {
    const now = getTokyoTime();
    const battery = computeBatteryLevel(now);
    const hour = now.getHours();
    const inSleep = hour >= state.sleepHour || hour < state.wakeHour;
  
    const elapsed = Date.now() - lastUpdateTime;
  
    // 🧠 若距离上次 fetch 已满 10 分钟 or 首次
    if (elapsed > 10 * 60 * 1000 || !lastWeather) {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current_weather=true`;
  
      fetch(url)
        .then(res => res.json())
        .then(data => {
          lastWeather = data.current_weather;
          lastUpdateTime = Date.now();
          offlineMode = false;
  
          renderEmotionDisplay(lastWeather, now, battery, inSleep);
        })
        .catch(() => {
          offlineMode = true;
          lastWeather = simulateWeatherFallback(lastWeather);
          renderEmotionDisplay(lastWeather, now, battery, inSleep, true);
        });
  
      lat += (Math.random() - 0.5) * 0.2;
      lon += (Math.random() - 0.5) * 0.2;
      lat = Math.max(-90, Math.min(90, lat));
      lon = Math.max(-180, Math.min(180, lon));
    } else {
      // 💭 用缓存天气，加小波动模拟变化
      lastWeather = simulateWeatherFallback(lastWeather);
      renderEmotionDisplay(lastWeather, now, battery, inSleep, offlineMode);
    }
  }

  function simulateWeatherFallback(current) {
    if (!current) {
      return { temperature: 20, windspeed: 5, weathercode: 1 };
    }
  
    return {
      temperature: parseFloat((current.temperature + (Math.random() - 0.5) * 0.3).toFixed(1)),
      windspeed: parseFloat((current.windspeed + (Math.random() - 0.5) * 0.5).toFixed(1)),
      weathercode: current.weathercode // 保持不动，防止跳 mood
    };
  }

  function renderEmotionDisplay(w, now, battery, inSleep, offline = false) {
    const moodMap = {
      0: "🟢 状态正常",
      1: "🟩 思考中",
      2: "🔵 轻度模糊",
      3: "🟠 思维沉重",
      45: "🟣 有些疑惑",
      48: "🟡 情绪低迷",
      51: "💚 兴奋",
      61: "🔴 情绪抑郁",
      71: "❄️ 思想冻结",
      80: "⚪ 创造力活跃"
    };
  
    let mood = moodMap[w.weathercode] || "🤖 情绪状态未知";
    if (inSleep) {
      mood = " 💤系统休眠中，正在充电";
    }
  
    const memory = Math.min(95, Math.floor(w.windspeed * 3 + 40));
    const icon = offline ? "📡" : "";
  
    target.innerHTML =
      `🧠${mood} · 💾 Memory: ${memory}% · 🔋 Battery: <span id="battery-value">${battery}%</span><br>` +
      `🕒 Tokyo Time: ${now.toTimeString().slice(0, 5)}<br>` +
      `${offline ? `<span style="opacity: 0.6;">${icon} Offline Mode</span>` : ""}`;
  
    updateBatteryDisplay(battery);
  }

  updateEmotion();
  setInterval(updateEmotion, 2000);
})();
