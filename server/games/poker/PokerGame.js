const BaseGame = require("../BaseGame");
const { Hand } = require("pokersolver");

class PokerGame extends BaseGame {
  constructor(room) {
    super(room);

    this.deck = [];
    this.communityCards = [];
    this.pot = 0;

    this.currentTurnSeat = null;
    this.roundStage = "PRE_FLOP";

    this.currentBet = 0;
    this.bets = {};
    this.totalContributions = {};
    this.lastRaiserSeat = null;

    this.actionCounter = 0;
  }

  /* =============================== */

  start() {
    this.state = "ACTIVE";
    this.resetRound();
    this.collectActiveSeats();
    this.room.rotateDealer();
    this.postBlinds();
    this.dealHoleCards();
  }

  resetRound() {
    this.deck = this.generateDeck();
    this.shuffleDeck();
    this.communityCards = [];
    this.pot = 0;

    this.currentBet = 0;
    this.bets = {};
    this.totalContributions = {};
    this.lastRaiserSeat = null;
    this.actionCounter = 0;

    this.roundStage = "PRE_FLOP";

    this.room.seats.forEach(seat => {
      if (seat) {
        seat.status = "ACTIVE";
        seat.allIn = false;
        delete seat.holeCards;
      }
    });
  }

  collectActiveSeats() {
    this.activeSeats = this.room.seats
      .map((s, i) => (s ? i : null))
      .filter(i => i !== null);
  }

  postBlinds() {
    const dealer = this.room.dealerSeat;
    const sb = this.nextSeat(dealer);
    const bb = this.nextSeat(sb);

    this.bet(sb, this.room.settings.smallBlind);
    this.bet(bb, this.room.settings.bigBlind);

    this.currentBet = this.room.settings.bigBlind;
    this.lastRaiserSeat = bb;

    this.currentTurnSeat = this.nextSeat(bb);
  }

  dealHoleCards() {
    this.room.seats.forEach(seat => {
      if (seat) {
        seat.holeCards = [
          this.deck.pop(),
          this.deck.pop()
        ];
      }
    });
  }

  dealFlop() {
    this.communityCards.push(
      this.deck.pop(),
      this.deck.pop(),
      this.deck.pop()
    );
  }

  dealTurn() {
    this.communityCards.push(this.deck.pop());
  }

  dealRiver() {
    this.communityCards.push(this.deck.pop());
  }

  bet(seatIndex, amount) {
    const seat = this.room.seats[seatIndex];
    if (!seat) return;

    if (!this.bets[seatIndex]) this.bets[seatIndex] = 0;
    if (!this.totalContributions[seatIndex])
      this.totalContributions[seatIndex] = 0;

    if (amount >= seat.chips) {
      amount = seat.chips;
      seat.allIn = true;
    }

    seat.chips -= amount;
    this.bets[seatIndex] += amount;
    this.totalContributions[seatIndex] += amount;
    this.pot += amount;
  }

  handleAction(seatIndex, action, amount = 0) {
    if (seatIndex !== this.currentTurnSeat) return false;

    const seat = this.room.seats[seatIndex];
    if (!seat || seat.status !== "ACTIVE") return false;

    switch (action) {
      case "FOLD":
        seat.status = "FOLDED";
        break;

      case "CHECK":
        if ((this.bets[seatIndex] || 0) !== this.currentBet)
          return false;
        break;

      case "CALL":
        const callAmount =
          this.currentBet - (this.bets[seatIndex] || 0);
        this.bet(seatIndex, callAmount);
        break;

      case "RAISE":
        const currentPlayerBet = this.bets[seatIndex] || 0;
        const raiseTo = amount;

        if (raiseTo <= this.currentBet) return false;

        const needed = raiseTo - currentPlayerBet;
        if (needed > seat.chips) return false;

        this.bet(seatIndex, needed);
        this.currentBet = raiseTo;
        this.lastRaiserSeat = seatIndex;
        break;

      default:
        return false;
    }

    this.actionCounter++;
    this.advanceTurn();
    return true;
  }

  advanceTurn() {
    const activeNonAllIn = this.room.seats.filter(
      s => s && s.status === "ACTIVE" && !s.allIn
    );

    if (activeNonAllIn.length === 0) {
      this.finishAllIn();
      return;
    }

    const activeSeats = this.getActivePlayingSeats();

    if (activeSeats.length === 1) {
      this.showdown();
      return;
    }

    if (
      this.actionCounter >= activeSeats.length &&
      this.allBetsEqual()
    ) {
      this.advanceStage();
      return;
    }

    this.currentTurnSeat = this.nextSeat(this.currentTurnSeat);
  }

  finishAllIn() {
    if (this.roundStage === "PRE_FLOP") this.dealFlop();
    if (this.roundStage === "FLOP") this.dealTurn();
    if (this.roundStage === "TURN") this.dealRiver();

    if (this.roundStage !== "RIVER") {
      this.roundStage =
        this.roundStage === "PRE_FLOP"
          ? "FLOP"
          : this.roundStage === "FLOP"
          ? "TURN"
          : "RIVER";

      this.finishAllIn();
    } else {
      this.showdown();
    }
  }

  getActivePlayingSeats() {
    return this.room.seats
      .map((s, i) =>
        s && s.status === "ACTIVE" ? i : null
      )
      .filter(i => i !== null);
  }

  allBetsEqual() {
    const values = Object.values(this.bets);
    if (values.length === 0) return true;
    const first = values[0];
    return values.every(v => v === first);
  }

  advanceStage() {
    this.currentBet = 0;
    this.bets = {};
    this.lastRaiserSeat = null;
    this.actionCounter = 0;

    if (this.roundStage === "PRE_FLOP") {
      this.dealFlop();
      this.roundStage = "FLOP";
    } else if (this.roundStage === "FLOP") {
      this.dealTurn();
      this.roundStage = "TURN";
    } else if (this.roundStage === "TURN") {
      this.dealRiver();
      this.roundStage = "RIVER";
    } else {
      this.showdown();
      return;
    }

    this.currentTurnSeat = this.nextSeat(
      this.room.dealerSeat
    );
  }

  showdown() {
    const pots = this.buildSidePots();

    pots.forEach(pot => {
      const hands = pot.eligibleSeats.map(seatIndex => {
        const seat = this.room.seats[seatIndex];
        const fullHand = [
          ...seat.holeCards,
          ...this.communityCards
        ];
        return {
          seatIndex,
          solved: Hand.solve(fullHand)
        };
      });

      const winners = Hand.winners(
        hands.map(h => h.solved)
      );

      const winningSeats = hands
        .filter(h => winners.includes(h.solved))
        .map(h => h.seatIndex);

      const split = Math.floor(
        pot.amount / winningSeats.length
      );

      winningSeats.forEach(seatIndex => {
        this.room.seats[seatIndex].chips += split;
      });
    });

    this.cleanupRoundState();
    this.room.endGame();
    this.state = "IDLE";
  }

  buildSidePots() {
    const contributions = Object.entries(
      this.totalContributions
    )
      .map(([seat, amount]) => ({
        seat: parseInt(seat),
        amount
      }))
      .sort((a, b) => a.amount - b.amount);

    const pots = [];
    let previous = 0;

    contributions.forEach((c, index) => {
      const diff = c.amount - previous;
      if (diff > 0) {
        const eligible = contributions
          .slice(index)
          .map(x => x.seat);

        pots.push({
          amount: diff * eligible.length,
          eligibleSeats: eligible
        });

        previous = c.amount;
      }
    });

    return pots;
  }

  cleanupRoundState() {
    this.communityCards = [];
    this.pot = 0;
    this.currentTurnSeat = null;
    this.currentBet = 0;
    this.bets = {};
    this.totalContributions = {};
    this.lastRaiserSeat = null;
    this.actionCounter = 0;

    this.room.seats.forEach(seat => {
      if (!seat) return;
      delete seat.holeCards;
      seat.allIn = false;
      if (seat.status === "FOLDED")
        seat.status = "ACTIVE";
    });
  }

  generateDeck() {
    const suits = ["H", "D", "C", "S"];
    const values = [
      "2","3","4","5","6","7","8","9",
      "T","J","Q","K","A"
    ];
    const deck = [];
    suits.forEach(s =>
      values.forEach(v => deck.push(v + s))
    );
    return deck;
  }

  shuffleDeck() {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [
        this.deck[j],
        this.deck[i]
      ];
    }
  }

  nextSeat(fromSeat) {
    for (let i = 1; i <= 9; i++) {
      const index = (fromSeat + i) % 9;
      const seat = this.room.seats[index];
      if (seat && seat.status === "ACTIVE")
        return index;
    }
    return null;
  }

  getPublicState() {
    return {
      pot: this.pot,
      communityCards: this.communityCards,
      currentTurnSeat: this.currentTurnSeat,
      roundStage: this.roundStage
    };
  }
}

module.exports = PokerGame;
