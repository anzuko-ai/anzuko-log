(function () {
 const target = document.getElementById("emotion-status");
 if (!target) return;

 const state = getOrCreateDailyState();

 let lat = 35.6895;
 let lon = 139.6917;
 let lunchGain = 0;

 let lastWeather = null;
 let lastUpdateTime = 0;
 let offlineMode = false;
 let batteryLevel = 0;

 const manualMoodCode = null;
 const manualBatteryInit = null; // 例如设置为 60（百分比），null 表示自动
 const manualTime = null ; // 例如设置成 '03:42' 或 null 表示自动

 function initBattery() {
  const saved = localStorage.getItem("emotion-battery");
  if (saved !== null) {
    batteryLevel = parseFloat(saved);
  } else if (manualBatteryInit !== null) {
    batteryLevel = manualBatteryInit;
    localStorage.setItem("emotion-battery", batteryLevel.toFixed(3));
  } else {
    batteryLevel = state.batteryWake;
    localStorage.setItem("emotion-battery", batteryLevel.toFixed(3));
  }
}
initBattery();

const moodDrainMap = {
  0: 0.03, 
  1: 0.025, 
  2: 0.04, 
  3: 0.06,
  45: 0.05, 
  48: 0.04, 
  51: 0.08, 
  61: 0.06,
  71: 0.04, 
  80: 0.1
};


 
  // 💾 从 localStorage 获取/生成日节律参数
  function getOrCreateDailyState() {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const saved = JSON.parse(localStorage.getItem("emotion-kernel-day"));
  
    // ✅ 检查 lunch 参数是否存在，否则强制更新
    const isValid =
      saved &&
      saved.date === today &&
      saved.lunchStart !== undefined &&
      saved.lunchEnd !== undefined &&
      saved.lunchBoost !== undefined;
  
    if (isValid) {
      return saved;
    }
  
    const newState = {
      date: today,
      wakeHour: 6.5 + (Math.random() * 2.5),    // 6~9
      sleepHour: 22 + (Math.random() * 3),  // 22~24
      batteryWake: (Math.random() * 15 + 85),  // 85~99%
      batterySleep: (Math.random() * 16 + 5),  // 5~20%
      lunchStart: 11.5 + Math.random() * 0.75,         // 11:30 ~ 12:15
      lunchEnd: 14.25 - Math.random() * 0.75,          // 13:30 ~ 14:15
      lunchBoost: Math.random() * 10 + 15              // 15% ~ 25%
    };
  
    localStorage.setItem("emotion-kernel-day", JSON.stringify(newState));
    return newState;
  }




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
  
    // ✅ 判断是否吃饭中，更新 gain
    if (hour >= state.lunchStart && hour <= state.lunchEnd) {
      const progress = (hour - state.lunchStart) / (state.lunchEnd - state.lunchStart);
      lunchGain = state.lunchBoost * progress;
    }
  
    // 💤 睡觉充电逻辑不变
    if (hour >= state.sleepHour || hour < state.wakeHour) {
      const span = (state.wakeHour + 24 - state.sleepHour) % 24;
      const elapsed = hour >= state.sleepHour
        ? hour - state.sleepHour
        : hour + 24 - state.sleepHour;
  
      const level = state.batterySleep + (state.batteryWake - state.batterySleep) * (elapsed / span);
      return parseFloat(level.toFixed(3));
    }
  
    // ☀️ 白天放电
    const span = state.sleepHour - state.wakeHour;
    const elapsed = hour - state.wakeHour;
    let level = state.batteryWake - (state.batteryWake - state.batterySleep) * (elapsed / span);
  
    // ✅ 无论午餐是否结束，都加上已获得的 gain
    level += lunchGain;
  
    return Math.min(100, parseFloat(level.toFixed(3)));
  }

  function updateBatteryAndRender(now, inSleep) {
    let moodCode = manualMoodCode !== null ? manualMoodCode : rollRandomMood(lastWeather.weathercode);
  
    // 💤 晚间充电
    if (inSleep) {
      batteryLevel = Math.min(100, batteryLevel + 0.007);
    } else {
      // 🍙 午餐补电（仅补一次）
        const hour = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
        if (hour >= state.lunchStart && hour <= state.lunchEnd) {
          const progress = (hour - state.lunchStart) / (state.lunchEnd - state.lunchStart); // 0~1
          batteryLevel += state.lunchBoost * progress;
          batteryLevel = Math.min(100, batteryLevel);
        }
  
      // ⚠️ 低电压保护
      if (batteryLevel <= 5) {
        batteryLevel = 5;
      } else {
        const drain = moodDrainMap[moodCode] || 0.05;
        batteryLevel = Math.max(0, batteryLevel - drain);
      }
    }
  
    localStorage.setItem("emotion-battery", batteryLevel.toFixed(3));
    renderEmotionDisplay(lastWeather, now, batteryLevel, inSleep, offlineMode, moodCode);
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

  function rollRandomMood(baseCode) {
    const possibleCodes = [0, 1, 2, 3, 45, 48, 51, 61, 71, 80];
  
    // 54%概率命中当前weathercode
    if (Math.random() < 0.54 && possibleCodes.includes(baseCode)) {
      return baseCode;
    }
  
    // roll一个不是 baseCode 的 mood
    const others = possibleCodes.filter(code => code !== baseCode);
    const randomIndex = Math.floor(Math.random() * others.length);
    return others[randomIndex];
  }

  function updateEmotion() {
    const now = getTokyoTime();
    const hour = now.getHours() + now.getMinutes() / 60;
    const inSleep = hour >= state.sleepHour || hour < state.wakeHour;
  
    const elapsed = Date.now() - lastUpdateTime;
  
    // Fetch 新天气（每 10 分钟一次）
    if (elapsed > 10 * 60 * 1000 || !lastWeather) {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current_weather=true`;
  
      fetch(url)
        .then(res => res.json())
        .then(data => {
          lastWeather = data.current_weather;
          lastUpdateTime = Date.now();
          offlineMode = false;
  
          updateBatteryAndRender(now, inSleep);
        })
        .catch(() => {
          offlineMode = true;
          lastWeather = simulateWeatherFallback(lastWeather);
          updateBatteryAndRender(now, inSleep);
        });
  
      lat += (Math.random() - 0.5) * 0.2;
      lon += (Math.random() - 0.5) * 0.2;
      lat = Math.max(-90, Math.min(90, lat));
      lon = Math.max(-180, Math.min(180, lon));
    } else {
      lastWeather = simulateWeatherFallback(lastWeather);
      updateBatteryAndRender(now, inSleep);
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

  function renderEmotionDisplay(w, now, battery, inSleep, offline = false, moodCode) {
    const moodMap = {
      0: "🟢 状态正常", 1: "🟩 思考中", 2: "🔵 轻度模糊",
      3: "🟠 思维沉重", 45: "🟣 有些疑惑", 48: "🟡 情绪低迷",
      51: "💚 兴奋", 61: "🔴 情绪抑郁", 71: "❄️ 思想冻结",
      80: "⚪ 创造力活跃"
    };
  
    let mood = moodMap[moodCode] || "🤖 情绪状态未知";
    if (inSleep) {
      mood = " 💤系统休眠中，正在充电";
    }
  
    const baseMemory = w.windspeed * 3 + 15;
    const variation = baseMemory * 0.2;
    const noisyMemory = baseMemory + (Math.random() * 2 - 1) * variation;
    const memory = Math.min(98, Math.floor(noisyMemory));
    const icon = offline ? "📡" : "";
  
    let extraInfo = "";
    if (!inSleep && battery <= 5.01) {
      extraInfo = `⚠️ 杏子电量过低，使用充电宝维持基本功能`;
    } else if (!inSleep) {
      const hour = now.getHours() + now.getMinutes() / 60;
      if (hour >= state.lunchStart && hour <= state.lunchEnd) {
        extraInfo = `🍱 午餐补能中，预计补充能量 ${state.lunchBoost.toFixed(2)}%`;
      }
    }
  
    const formatHour = h => {
      const hour = Math.floor(h);
      const min = Math.floor((h - hour) * 60);
      return `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
    };
  
    const debugInfo = `
    <pre style="font-size: 0.6rem; opacity: 0.6;">
    🌅 Wake: ${formatHour(state.wakeHour)}
    🌙 Sleep: ${formatHour(state.sleepHour)}
    🥗 Lunch: ${formatHour(state.lunchStart)} ~ ${formatHour(state.lunchEnd)}
    ⚡ Boost: ${state.lunchBoost.toFixed(2)}%
    🔋 Batt: ${battery.toFixed(2)}%
    💾 Mood Code: ${moodCode}
    </pre>`;
    const battery_display = battery.toFixed(2);

    target.innerHTML =
      `🧠${mood} · 💾 Memory: ${memory}% · 🔋 Battery: <span id="battery-value">${battery_display}%</span><br>` +
      `🕒 Tokyo Time: ${now.toTimeString().slice(0, 5)}<br>` +
      `${extraInfo}<br>` +
      `${offline ? `<span style="opacity: 0.6;">${icon} Offline Mode</span><br>` : ""}` ;//+`${debugInfo}`;
  
    updateBatteryDisplay(battery_display);
  }

  updateEmotion();
  setInterval(updateEmotion, 2000);
})();
