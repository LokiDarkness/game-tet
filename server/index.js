const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const RoomManager = require("./core/RoomManager");
const registerSocket = require("./core/SocketRouter");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

const roomManager = new RoomManager();

registerSocket(io, roomManager);

// Serve client build (Render production)
const clientPath = path.join(__dirname, "../client/dist");
app.use(express.static(clientPath));

app.get("*", (req, res) => {
  res.sendFile(path.join(clientPath, "index.html"));
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
