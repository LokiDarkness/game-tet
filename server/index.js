const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.json({ message: "Game Tet API is running 🚀" });
});

// Fake database RAM
let leaderboard = [];

// Save score
app.post("/api/score", (req, res) => {
  const { name, score } = req.body;

  if (!name || score == null) {
    return res.status(400).json({ error: "Missing name or score" });
  }

  leaderboard.push({ name, score });

  leaderboard.sort((a, b) => b.score - a.score);
  leaderboard = leaderboard.slice(0, 10);

  res.json({ success: true, leaderboard });
});

// Get leaderboard
app.get("/api/leaderboard", (req, res) => {
  res.json(leaderboard);
});

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
