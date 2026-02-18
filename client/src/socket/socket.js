import { io } from "socket.io-client";

const socket = io("https://game-tet-1.onrender.com", {
  transports: ["websocket"]
});

export default socket;
