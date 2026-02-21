const pokerURL = "https://your-poker-service.onrender.com";

const statusEl = document.getElementById("pokerStatus");
const loading = document.getElementById("loadingOverlay");
const card = document.getElementById("pokerCard");

async function checkStatus() {
  try {
    const res = await fetch("/api/status");
    const data = await res.json();

    if (data.poker === "online") {
      statusEl.innerHTML =
        "🟢 Online<br>👥 " + data.online + " người online";
      statusEl.style.color = "#00ff88";
    }
    else if (data.poker === "waking") {
      statusEl.innerText = "🟡 Waking...";
      statusEl.style.color = "yellow";
    }
    else {
      statusEl.innerText = "🔴 Offline";
      statusEl.style.color = "red";
    }
  } catch {
    statusEl.innerText = "🔴 Offline";
  }
}

card.addEventListener("click", async () => {
  loading.style.display = "flex";

  const interval = setInterval(async () => {
    try {
      const res = await fetch(pokerURL + "/health");
      if (res.ok) {
        clearInterval(interval);
        window.location.href = pokerURL;
      }
    } catch {}
  }, 3000);
});

checkStatus();
setInterval(checkStatus, 10000);