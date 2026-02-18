const createGame = require("../games/GameFactory");

function registerSocket(io, roomManager) {

  function emitRoomState(room) {
    io.in(room.id).fetchSockets().then(sockets => {
      sockets.forEach(s => {
        s.emit("room:update", room.getPublicState(s.id));
      });
    });
  }

  function emitGameState(room) {
    if (!room.game) return;

    io.to(room.id).emit("game:update", {
      public: room.game.getPublicState()
    });

    room.seats.forEach((seat, seatIndex) => {
      if (!seat || !seat.holeCards) return;

      io.to(seat.socketId).emit("game:privateState", {
        seatIndex,
        holeCards: seat.holeCards
      });
    });
  }

  io.on("connection", (socket) => {

    /* ================= ROOM ================= */

    socket.on("room:create", ({ gameType }, callback) => {
      const room = roomManager.createRoom(gameType, socket.id);
      socket.join(room.id);
      callback({ roomId: room.id });
    });

    socket.on("room:list", (callback) => {
      callback(roomManager.listRooms());
    });

    socket.on("room:join", ({ roomId }, callback) => {
      const room = roomManager.getRoom(roomId);
      if (!room) {
        callback({ error: "Room not found" });
        return;
      }

      socket.join(roomId);
      socket.emit("room:requestDisplayName");
      callback({ success: true });
    });

    socket.on("room:setDisplayName", ({ roomId, name }) => {
      const room = roomManager.getRoom(roomId);
      if (!room) return;

      const ok = room.setDisplayName(socket.id, name);
      if (!ok) {
        socket.emit("room:nameTaken");
        return;
      }

      emitRoomState(room);
    });

    socket.on("room:assignChips", ({ roomId, targetId, amount }) => {
      const room = roomManager.getRoom(roomId);
      if (!room) return;

      if (!room.assignChips(socket.id, targetId, amount)) return;
      emitRoomState(room);
    });

    socket.on("room:takeSeat", ({ roomId, seatIndex }) => {
      const room = roomManager.getRoom(roomId);
      if (!room) return;

      if (!room.takeSeat(socket.id, seatIndex)) return;
      emitRoomState(room);
    });

    socket.on("room:updateSettings", ({ roomId, settings }) => {
      const room = roomManager.getRoom(roomId);
      if (!room) return;

      if (!room.updateSettings(socket.id, settings)) return;
      emitRoomState(room);
    });

    socket.on("room:startGame", ({ roomId }) => {
      const room = roomManager.getRoom(roomId);
      if (!room) return;

      if (!room.isHost(socket.id)) return;
      if (room.state !== "WAITING") return;

      const activeSeats = room.seats.filter(
        s => s && s.chips > 0
      );

      if (activeSeats.length < 2) return;

      const game = createGame(room);
      room.game = game;
      room.startGame();
      game.start();

      emitRoomState(room);
      emitGameState(room);
    });

    /* ================= GAME ================= */

    socket.on("game:action", ({ roomId, action, amount }) => {
      const room = roomManager.getRoom(roomId);
      if (!room || !room.game) return;

      const seatIndex = room.seats.findIndex(
        s => s && s.socketId === socket.id
      );

      if (seatIndex === -1) return;

      if (!room.game.handleAction(seatIndex, action, amount))
        return;

      emitGameState(room);
      emitRoomState(room);
    });

    /* ================= DISCONNECT ================= */

    socket.on("disconnect", () => {
      roomManager.rooms.forEach((room, roomId) => {

        if (room.hostId === socket.id) {
          roomManager.deleteRoom(roomId);
          return;
        }

        room.removeUser(socket.id);
        roomManager.cleanupRoomIfEmpty(roomId);
      });
    });

  });
}

module.exports = registerSocket;
