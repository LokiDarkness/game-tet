import { useEffect } from "react";
import { io } from "socket.io-client";

function App() {

  useEffect(() => {
    const socket = io();
    socket.on("connect", () => {
      console.log("Connected:", socket.id);
    });
  }, []);

  return (
    <div style={{ padding: 40 }}>
      <h1>Poker Platform Running</h1>
    </div>
  );
}

export default App;
