class BaseGame {
  constructor(room) {
    this.room = room;
    this.state = "IDLE";
  }

  start() {}
  handleAction() {}
}

module.exports = BaseGame;
