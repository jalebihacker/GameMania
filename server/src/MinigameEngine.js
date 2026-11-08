import { ReactionDuel } from './minigames/ReactionDuel.js';
import { ImposterWord } from './minigames/ImposterWord.js';

export class MinigameEngine {
  constructor(room, io, onGameFinished, onRoomUpdate) {
    this.room = room;
    this.io = io;
    this.onGameFinished = onGameFinished;
    this.onRoomUpdate = onRoomUpdate;
    this.activeGame = null;
    this.countdownTimer = null;
  }

  startCountdown(gameId) {
    this.room.status = 'COUNTDOWN';
    this.room.selectedGameId = gameId;

    const startTime = Date.now() + 400; // Small network buffer
    const durationMs = 3000;

    this.io.to(this.room.code).emit('countdown_start', {
      gameId,
      startTime,
      durationMs
    });

    if (this.onRoomUpdate) {
      this.onRoomUpdate(this.room.code);
    }

    this.countdownTimer = setTimeout(() => {
      this.launchGame(gameId);
    }, durationMs + 400);
  }

  launchGame(gameId) {
    this.room.status = 'IN_GAME';

    if (gameId === 'reaction-duel') {
      this.activeGame = new ReactionDuel(this.room, this.io);
    } else if (gameId === 'imposter-word') {
      this.activeGame = new ImposterWord(this.room, this.io);
    } else {
      // Default to Reaction Duel
      this.activeGame = new ReactionDuel(this.room, this.io);
    }

    if (this.onRoomUpdate) {
      this.onRoomUpdate(this.room.code);
    }

    this.activeGame.init();

    // Check game completion periodically
    this.pollInterval = setInterval(() => {
      if (this.activeGame && this.activeGame.isFinished()) {
        this.handleGameFinished();
      }
    }, 500);
  }

  handlePlayerInput(playerId, action, payload) {
    if (this.activeGame) {
      this.activeGame.onPlayerInput(playerId, action, payload);
    }
  }

  handleGameFinished() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    if (!this.activeGame) return;

    // Apply points to cumulative session scores
    const roundScores = this.activeGame.getScores();
    this.room.players.forEach(p => {
      if (roundScores[p.id]) {
        p.score = (p.score || 0) + roundScores[p.id];
      }
    });

    const finishedGameId = this.activeGame.id;
    const finalScores = roundScores;

    this.activeGame.cleanup();
    this.activeGame = null;

    this.room.status = 'FINAL_LEADERBOARD';

    this.onGameFinished(this.room, {
      gameId: finishedGameId,
      roundScores: finalScores
    });
  }

  cleanup() {
    if (this.countdownTimer) {
      clearTimeout(this.countdownTimer);
      this.countdownTimer = null;
    }
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this.activeGame) {
      this.activeGame.cleanup();
      this.activeGame = null;
    }
  }
}
