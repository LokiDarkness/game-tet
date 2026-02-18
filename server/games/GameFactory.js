const PokerGame = require("./poker/PokerGame");

function createGame(room) {
  switch (room.gameType) {
    case "poker":
      return new PokerGame(room);
    default:
      return null;
  }
}

module.exports = createGame;
