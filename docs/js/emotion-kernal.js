(function () {
    const target = document.getElementById("emotion-status");
    if (!target) return;
  
    let lat = 35.6895;
    let lon = 139.6917;
  
    // 💤 睡眠 & 起床时间（每次页面加载时生成）
    const wakeHour = 7 + Math.floor(Math.random() * 3);   // 7~9 点
    const sleepHour = 22 + Math.floor(Math.random() * 3); // 22~24 点
  
    // 电量边界（起床时电量高，睡觉时低）
    let batteryWake = Math.floor(Math.random() * 15 + 85); // 85~99%
    let batterySleep = Math.floor(Math.random() * 16 + 5); // 5~20%
  
    // 可调试：手动指定 Tokyo 时间（例：'13:30'），否则使用本地当前时间
    const manualTime = '13:30'; // 例如设置成 '03:42' 或 null 表示自动
  
    function getTokyoTime() {
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const tokyoOffset = 9 * 60 * 60000; // +9h in ms
      const tokyoDate = new Date(utc + tokyoOffset);
  
      if (manualTime) {
        const [h, m] = manualTime.split(":").map(Number);
        tokyoDate.setHours(h);
        tokyoDate.setMinutes(m);
      }
  
      return tokyoDate;
    }
  
    function computeBatteryLevel(now) {
      const hour = now.getHours() + now.getMinutes() / 60;
  
      // 睡眠时段（充电）
      if (hour >= sleepHour || hour < wakeHour) {
        return Math.floor(
          batterySleep + ((batteryWake - batterySleep) *
            ((hour >= sleepHour ? hour - sleepHour : hour + 24 - sleepHour) /
              ((wakeHour + 24 - sleepHour) % 24)))
        );
      }
  
      // 白天工作（耗电）
      const daySpan = sleepHour - wakeHour;
      const elapsed = hour - wakeHour;
      const used = (batteryWake - batterySleep) * (elapsed / daySpan);
      return Math.floor(batteryWake - used);
    }
  
    function updateEmotion() {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current_weather=true`;
  
      fetch(url)
        .then(res => res.json())
        .then(data => {
          const w = data.current_weather;
          const now = getTokyoTime();
  
          const moodMap = {
            0: "🟢 状态清晰",
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
          const memory = Math.min(95, Math.floor(w.windspeed * 3 + 40));
          const battery = computeBatteryLevel(now);
  
          // 睡眠状态文本覆盖
          const hour = now.getHours();
          const inSleep = hour >= sleepHour || hour < wakeHour;
          if (inSleep) {
            mood = "💤 Emotion Status: 系统休眠中";
          }
  
          target.innerText =
            `🌐 [Lat: ${lat.toFixed(2)} / Lon: ${lon.toFixed(2)}]\n` +
            `🧠 ${mood} · 💾 Memory: ${memory}% · 🔋 Battery: ${battery}%\n` +
            `🕒 Tokyo Time: ${now.toTimeString().slice(0, 5)}\n` +
            `🌡️ Temp: ${w.temperature}°C · Wind: ${w.windspeed} km/h`;
        })
        .catch(() => {
          target.innerText = "Emotion Kernel 无法连接世界感知数据… 📡";
        });
  
      // 🛰️ 地理位置微漂移
      lat += (Math.random() - 0.5) * 0.1;
      lon += (Math.random() - 0.5) * 0.1;
      lat = Math.max(-90, Math.min(90, lat));
      lon = Math.max(-180, Math.min(180, lon));
    }
  
    updateEmotion();
    setInterval(updateEmotion, 2000);
  })();