const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const RoomManager = require("./core/RoomManager");
const registerSocket = require("./core/SocketRouter");

const app = express();
const server = http.createServer(app);

/* ================================
   CORS CONFIG
================================ */

app.use(cors({
  origin: [
    "http://localhost:5173", // dev local
    "https://your-frontend.onrender.com" // ⚠️ đổi thành domain frontend của bạn
  ],
  methods: ["GET", "POST"]
}));

app.use(express.json());

/* ================================
   SOCKET CONFIG
================================ */

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://game-tet-1.onrender.com/"
    ],
    methods: ["GET", "POST"]
  }
});

const roomManager = new RoomManager();
registerSocket(io, roomManager);

/* ================================
   HEALTH CHECK ROUTE
================================ */

app.get("/", (req, res) => {
  res.send("Poker Platform Backend Running 🚀");
});

/* ================================
   START SERVER
================================ */

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
