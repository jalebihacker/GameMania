/**
 * BaseMinigame - Abstract class for party minigames
 * 
 * Standard Interface:
 * - init(room, settings, io)
 * - onPlayerInput(playerId, action, payload)
 * - onTick(deltaTime, elapsedMs)
 * - getState(forPlayerId)
 * - getScores()
 * - isFinished()
 * - cleanup()
 */
export class BaseMinigame {
  constructor(room, io) {
    this.room = room;
    this.io = io;
    this.isGameOver = false;
    this.scores = {}; // { [playerId]: scoreDelta }
  }

  // Initialize the minigame round
  init(settings = {}) {
    throw new Error('init() must be implemented by subclass');
  }

  // Handle player touch/action
  onPlayerInput(playerId, action, payload) {
    throw new Error('onPlayerInput() must be implemented by subclass');
  }

  // Server clock tick
  onTick(deltaTime, elapsedMs) {}

  // Filtered state per player (prevents cheating, e.g., secret imposter word)
  getState(forPlayerId) {
    return {};
  }

  // Get point changes for current round
  getScores() {
    return this.scores;
  }

  // Has the minigame reached its end condition?
  isFinished() {
    return this.isGameOver;
  }

  // Cleanup any timers or listeners
  cleanup() {}
}
