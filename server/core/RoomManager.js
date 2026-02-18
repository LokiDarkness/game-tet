const Room = require("./Room");
const { nanoid } = require("nanoid");

class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  createRoom(gameType, hostId) {
    const id = nanoid(6);

    const room = new Room(id, gameType, hostId);

    this.rooms.set(id, room);

    return room;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  deleteRoom(roomId) {
    this.rooms.delete(roomId);
  }

  cleanupRoomIfEmpty(roomId) {
    const room = this.getRoom(roomId);
    if (!room) return;

    const totalUsers =
      room.audience.length +
      room.seats.filter(Boolean).length;

    if (totalUsers === 0) {
      this.deleteRoom(roomId);
    }
  }

  listRooms() {
    return Array.from(this.rooms.values()).map(r => ({
      id: r.id,
      gameType: r.gameType,
      state: r.state
    }));
  }
}

module.exports = RoomManager;
