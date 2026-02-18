class Room {
  constructor(id, gameType, hostId) {
    this.id = id;
    this.gameType = gameType;
    this.hostId = hostId;

    this.state = "WAITING";

    this.seats = Array(9).fill(null);
    this.audience = [];

    this.usedNames = new Set();

    this.settings = {
      smallBlind: 10,
      bigBlind: 20,
      autoStart: false
    };

    this.dealerSeat = -1;

    this.game = null;
    this.reconnectTimers = new Map();
  }

  totalUsers() {
    return (
      this.audience.length +
      this.seats.filter(s => s !== null).length
    );
  }

  isHost(socketId) {
    return socketId === this.hostId;
  }

  addAudience(socketId, displayName) {
    this.audience.push({ socketId, displayName, chips: 0 });
    this.usedNames.add(displayName);
  }

  setDisplayName(socketId, name) {
    if (this.usedNames.has(name)) return false;

    this.usedNames.add(name);

    const existing = this.audience.find(a => a.socketId === socketId);
    if (existing) {
      existing.displayName = name;
      return true;
    }

    this.audience.push({ socketId, displayName: name, chips: 0 });
    return true;
  }

  removeName(name) {
    this.usedNames.delete(name);
  }

  removeUser(socketId) {
    this.audience = this.audience.filter(a => a.socketId !== socketId);

    this.seats.forEach((seat, i) => {
      if (seat && seat.socketId === socketId) {
        this.removeSeatCompletely(i);
      }
    });
  }

  takeSeat(socketId, seatIndex) {
    if (seatIndex < 0 || seatIndex >= 9) return false;
    if (this.seats[seatIndex]) return false;

    const person = this.audience.find(a => a.socketId === socketId);
    if (!person) return false;
    if (!person.chips || person.chips <= 0) return false;

    this.seats[seatIndex] = {
      socketId,
      displayName: person.displayName,
      chips: person.chips,
      status: "ACTIVE",
      disconnectTurns: 0,
      allIn: false
    };

    this.audience = this.audience.filter(a => a.socketId !== socketId);

    return true;
  }

  removeSeatCompletely(seatIndex) {
    const seat = this.seats[seatIndex];
    if (!seat) return;

    const timer = this.reconnectTimers.get(seat.socketId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(seat.socketId);
    }

    this.removeName(seat.displayName);
    this.seats[seatIndex] = null;
  }

  assignChips(socketId, targetId, amount) {
    if (!this.isHost(socketId)) return false;
    if (this.state !== "WAITING") return false;

    const target = this.audience.find(a => a.socketId === targetId);
    if (!target) return false;

    target.chips = amount;
    return true;
  }

  updateSettings(socketId, newSettings) {
    if (!this.isHost(socketId)) return false;
    if (this.state !== "WAITING") return false;

    this.settings = { ...this.settings, ...newSettings };
    return true;
  }

  rotateDealer() {
    let next = this.dealerSeat;
    for (let i = 0; i < 9; i++) {
      next = (next + 1) % 9;
      if (this.seats[next]) {
        this.dealerSeat = next;
        return;
      }
    }
  }

  startGame() {
    this.state = "PLAYING";
  }

  endGame() {
    this.state = "WAITING";
  }

  getPublicState(socketId = null) {
    return {
      id: this.id,
      gameType: this.gameType,
      state: this.state,
      settings: this.settings,
      isHost: socketId === this.hostId,
      seats: this.seats.map(s =>
        s
          ? {
              displayName: s.displayName,
              chips: s.chips,
              status: s.status
            }
          : null
      ),
      audience: this.audience.map(a => ({
        displayName: a.displayName
      }))
    };
  }
}

module.exports = Room;
