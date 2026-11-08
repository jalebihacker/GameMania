import { BaseMinigame } from './BaseMinigame.js';

export class ReactionDuel extends BaseMinigame {
  constructor(room, io) {
    super(room, io);
    this.name = 'Reaction Duel';
    this.id = 'reaction-duel';
    this.maxRounds = 5;
    this.currentRound = 0;
    
    this.roundState = 'IDLE'; // 'WAITING', 'GREEN', 'ROUND_OVER'
    this.greenTimestamp = 0;
    this.roundWinner = null;
    this.playerTaps = {}; // { [playerId]: { reactionMs, falseStart, tapTime } }
    this.roundPoints = {}; // { [playerId]: totalPointsAcrossRounds }
    this.roundTimer = null;
    this.roundSummary = null;

    // Initialize scores
    this.room.players.forEach(p => {
      this.roundPoints[p.id] = 0;
    });
  }

  init(settings = {}) {
    if (settings.maxRounds) {
      this.maxRounds = settings.maxRounds;
    }
    this.currentRound = 0;
    this.startNextRound();
  }

  startNextRound() {
    this.currentRound += 1;
    this.roundState = 'WAITING';
    this.roundWinner = null;
    this.roundSummary = null;
    this.greenTimestamp = 0;
    this.playerTaps = {};

    // Pick random delay between 2500ms and 5500ms
    const randomDelay = Math.floor(Math.random() * 3000) + 2500;

    if (this.roundTimer) clearTimeout(this.roundTimer);

    // Schedule green flash
    this.roundTimer = setTimeout(() => {
      this.triggerGreen();
    }, randomDelay);

    this.broadcastState();
  }

  triggerGreen() {
    if (this.roundState !== 'WAITING') return;

    this.roundState = 'GREEN';
    this.greenTimestamp = Date.now();

    // Broadcast green trigger immediately
    this.broadcastState();

    // Max wait time for any tap after green: 5 seconds before round auto-closes
    this.roundTimer = setTimeout(() => {
      if (this.roundState === 'GREEN') {
        this.finishRound(null);
      }
    }, 5000);
  }

  onPlayerInput(playerId, action, payload = {}) {
    if (action !== 'tap') return;
    if (this.isGameOver) return;

    // Check if player already tapped this round
    if (this.playerTaps[playerId]) return;

    const now = Date.now();

    // CASE 1: Early tap before green -> False Start!
    if (this.roundState === 'WAITING') {
      this.playerTaps[playerId] = {
        falseStart: true,
        reactionMs: null,
        tapTime: now
      };
      
      this.broadcastState();

      // Check if all connected players false-started
      const activePlayers = this.room.players.filter(p => p.connected);
      const allFalse = activePlayers.every(p => this.playerTaps[p.id]?.falseStart);
      if (allFalse) {
        if (this.roundTimer) clearTimeout(this.roundTimer);
        this.finishRound(null, 'Everyone false started!');
      }
      return;
    }

    // CASE 2: Tap during GREEN
    if (this.roundState === 'GREEN') {
      const reactionMs = Math.max(1, now - this.greenTimestamp);
      this.playerTaps[playerId] = {
        falseStart: false,
        reactionMs,
        tapTime: now
      };

      // First valid tap wins round!
      if (!this.roundWinner) {
        this.roundWinner = playerId;
        if (this.roundTimer) clearTimeout(this.roundTimer);

        // Give remaining players 400ms to register taps for runner-up standings
        this.roundTimer = setTimeout(() => {
          this.finishRound(playerId);
        }, 400);
      }

      this.broadcastState();
    }
  }

  finishRound(winnerId, reason) {
    this.roundState = 'ROUND_OVER';

    const winner = this.room.players.find(p => p.id === winnerId);
    const winnerTap = winnerId ? this.playerTaps[winnerId] : null;

    if (winnerId) {
      this.roundPoints[winnerId] = (this.roundPoints[winnerId] || 0) + 100;
      this.scores[winnerId] = (this.scores[winnerId] || 0) + 100;
    }

    this.roundSummary = {
      winnerId,
      winnerName: winner ? winner.name : null,
      winnerReactionMs: winnerTap ? winnerTap.reactionMs : null,
      reason: reason || (winner ? `${winner.name} wins in ${winnerTap.reactionMs}ms!` : 'No one tapped!'),
      playerTaps: this.playerTaps
    };

    this.broadcastState();

    // Wait 3.5 seconds to show round winner, then advance
    this.roundTimer = setTimeout(() => {
      if (this.currentRound >= this.maxRounds) {
        this.isGameOver = true;
        this.broadcastState();
      } else {
        this.startNextRound();
      }
    }, 3500);
  }

  broadcastState() {
    this.room.players.forEach(p => {
      if (p.socketId) {
        this.io.to(p.socketId).emit('game_state_update', this.getState(p.id));
      }
    });
  }

  getState(forPlayerId) {
    return {
      gameId: this.id,
      name: this.name,
      currentRound: this.currentRound,
      maxRounds: this.maxRounds,
      roundState: this.roundState, // 'WAITING', 'GREEN', 'ROUND_OVER'
      greenTimestamp: this.greenTimestamp,
      roundWinner: this.roundWinner,
      roundSummary: this.roundSummary,
      myTap: this.playerTaps[forPlayerId] || null,
      allTaps: this.roundState === 'ROUND_OVER' ? this.playerTaps : undefined,
      roundPoints: this.roundPoints,
      isGameOver: this.isGameOver
    };
  }

  cleanup() {
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
      this.roundTimer = null;
    }
  }
}
