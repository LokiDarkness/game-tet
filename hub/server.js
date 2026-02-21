const express = require("express");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3000;

// 🔥 THAY URL NÀY
const POKER_URL = "https://your-poker-service.onrender.com";

app.use(express.static("public"));

app.get("/health", (req, res) => {
  res.json({ status: "hub-ok" });
});

app.get("/api/status", async (req, res) => {
  try {
    const health = await fetch(`${POKER_URL}/health`);

    if (!health.ok) {
      return res.json({ poker: "waking" });
    }

    const statsRes = await fetch(`${POKER_URL}/stats`);
    const stats = await statsRes.json();

    return res.json({
      poker: "online",
      online: stats.online
    });

  } catch (err) {
    return res.json({ poker: "offline" });
  }
});

app.listen(PORT, () => {
  console.log("🎮 Hub running on port", PORT);
});