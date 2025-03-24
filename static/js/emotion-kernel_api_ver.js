(function () {
    const target = document.getElementById("emotion-status");
    if (!target) return;
  
    function updateEmotionDisplay(data) {
      const { battery, mood, time } = data;
  
      target.innerHTML =
        `🧠 ${mood} · 🔋 Battery: <span id="battery-value">${battery.toFixed(2)}%</span><br>` +
        `🕒 Tokyo Time: ${time}<br>` +
        ``;
    }
  
    function fetchEmotionData() {
      fetch("http://p4-tr1.devicloud.cn:3000/status") // ✅ 或者 IP 测试地址
        .then(res => res.json())
        .then(data => updateEmotionDisplay(data))
        .catch(() => {
          target.innerHTML = "📡 无法连接 emotion API,可能是杏子心情不好";
        });
    }
  
    fetchEmotionData();
    setInterval(fetchEmotionData, 86400);
  })();