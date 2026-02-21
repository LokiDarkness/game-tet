const cors = require("cors");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(cors());

app.use(express.static("public"));

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/stats", (req, res) => {
  res.json({ online: io.engine.clientsCount });
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
});

server.listen(PORT, () => {
  console.log("🃏 Poker running on port", PORT);
});