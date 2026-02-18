const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const RoomManager = require("./core/RoomManager");
const registerSocket = require("./core/SocketRouter");

const app = express();
const server = http.createServer(app);

/* =========================================
   CORS CONFIG (IMPORTANT)
========================================= */

const allowedOrigins = [
  "http://localhost:5173",              // Dev
  "https://game-tet-2.onrender.com"     // Frontend production
];

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://game-tet-2.onrender.com"
  ],
  credentials: true
}));

app.use(express.json());

/* =========================================
   SOCKET.IO CONFIG
========================================= */

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://game-tet-2.onrender.com"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});
/* =========================================
   GAME CORE
========================================= */

const roomManager = new RoomManager();
registerSocket(io, roomManager);

/* =========================================
   HEALTH CHECK ROUTE
========================================= */

app.get("/", (req, res) => {
  res.status(200).send("Poker Platform Backend Running 🚀");
});

/* =========================================
   ERROR HANDLER
========================================= */

app.use((err, req, res, next) => {
  console.error("Server Error:", err.message);
  res.status(500).json({ error: "Internal Server Error" });
});

/* =========================================
   START SERVER
========================================= */

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
