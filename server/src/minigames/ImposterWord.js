import { BaseMinigame } from './BaseMinigame.js';
import wordsData from '../data/imposterWords.json' with { type: 'json' };

export class ImposterWord extends BaseMinigame {
  constructor(room, io) {
    super(room, io);
    this.name = 'Imposter Word';
    this.id = 'imposter-word';
    this.maxRounds = 3;
    this.currentRound = 0;

    this.roundState = 'IDLE'; // 'CLUE_PHASE', 'REVEAL_PHASE', 'VOTE_PHASE', 'GUESS_PHASE', 'ROUND_RESULT'
    this.phaseTimer = null;
    this.phaseExpiresAt = 0;

    this.category = '';
    this.crewWord = '';
    this.imposterWord = '';
    this.imposterPlayerId = null;

    this.clues = {}; // { [playerId]: clueString }
    this.votes = {}; // { [voterPlayerId]: targetPlayerId }
    this.voteCounts = {}; // { [targetPlayerId]: count }
    this.imposterGuess = '';
    this.imposterGuessSuccess = false;
    this.resultSummary = null;

    this.roundPoints = {}; // { [playerId]: totalPointsAcrossRounds }
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
    this.clues = {};
    this.votes = {};
    this.voteCounts = {};
    this.imposterGuess = '';
    this.imposterGuessSuccess = false;
    this.resultSummary = null;

    const activePlayers = this.room.players.filter(p => p.connected);
    if (activePlayers.length < 2) {
      this.isGameOver = true;
      this.broadcastState();
      return;
    }

    // Pick random imposter
    const randomIndex = Math.floor(Math.random() * activePlayers.length);
    this.imposterPlayerId = activePlayers[randomIndex].id;

    // Pick random word pair
    const wordPair = wordsData[Math.floor(Math.random() * wordsData.length)];
    this.category = wordPair.category;
    this.crewWord = wordPair.crew;
    this.imposterWord = wordPair.imposter;

    // Start Phase 1: Clue Phase (40 seconds)
    this.roundState = 'CLUE_PHASE';
    this.setPhaseTimer(40, () => {
      this.startRevealPhase();
    });

    this.broadcastState();
  }

  setPhaseTimer(seconds, onExpire) {
    if (this.phaseTimer) clearTimeout(this.phaseTimer);
    this.phaseExpiresAt = Date.now() + seconds * 1000;
    this.phaseTimer = setTimeout(() => {
      onExpire();
    }, seconds * 1000);
  }

  onPlayerInput(playerId, action, payload = {}) {
    if (this.isGameOver) return;

    // Action 1: Submit Clue
    if (action === 'submit_clue' && this.roundState === 'CLUE_PHASE') {
      const clue = (payload.clue || '').trim().slice(0, 30);
      if (clue) {
        this.clues[playerId] = clue;
        this.broadcastState();

        // Check if all connected players submitted
        const activePlayers = this.room.players.filter(p => p.connected);
        const allSubmitted = activePlayers.every(p => Boolean(this.clues[p.id]));
        if (allSubmitted) {
          if (this.phaseTimer) clearTimeout(this.phaseTimer);
          this.startRevealPhase();
        }
      }
      return;
    }

    // Action 2: Host can advance early from discussion to voting
    if (action === 'start_voting_early' && this.roundState === 'REVEAL_PHASE') {
      const player = this.room.players.find(p => p.id === playerId);
      if (player?.isHost) {
        if (this.phaseTimer) clearTimeout(this.phaseTimer);
        this.startVotingPhase();
      }
      return;
    }

    // Action 3: Cast Vote
    if (action === 'cast_vote' && this.roundState === 'VOTE_PHASE') {
      const targetId = payload.targetPlayerId;
      if (targetId && targetId !== playerId) {
        this.votes[playerId] = targetId;
        this.broadcastState();

        // Check if all connected players voted
        const activePlayers = this.room.players.filter(p => p.connected);
        const allVoted = activePlayers.every(p => Boolean(this.votes[p.id]));
        if (allVoted) {
          if (this.phaseTimer) clearTimeout(this.phaseTimer);
          this.resolveVotes();
        }
      }
      return;
    }

    // Action 4: Imposter guesses the secret word
    if (action === 'imposter_guess' && this.roundState === 'GUESS_PHASE') {
      if (playerId === this.imposterPlayerId) {
        const guess = (payload.guess || '').trim().toLowerCase();
        const target = this.crewWord.trim().toLowerCase();

        this.imposterGuess = payload.guess;
        this.imposterGuessSuccess = guess === target || target.includes(guess);

        if (this.phaseTimer) clearTimeout(this.phaseTimer);
        this.concludeRound();
      }
      return;
    }
  }

  startRevealPhase() {
    this.roundState = 'REVEAL_PHASE';
    // Fill in default clue for anyone who timed out
    this.room.players.forEach(p => {
      if (!this.clues[p.id]) {
        this.clues[p.id] = '🤐 (No clue)';
      }
    });

    // 25 seconds for players to review clues & discuss
    this.setPhaseTimer(25, () => {
      this.startVotingPhase();
    });

    this.broadcastState();
  }

  startVotingPhase() {
    this.roundState = 'VOTE_PHASE';
    this.votes = {};

    // 25 seconds for voting
    this.setPhaseTimer(25, () => {
      this.resolveVotes();
    });

    this.broadcastState();
  }

  resolveVotes() {
    // Tally votes
    this.voteCounts = {};
    this.room.players.forEach(p => {
      this.voteCounts[p.id] = 0;
    });

    Object.values(this.votes).forEach(targetId => {
      if (this.voteCounts[targetId] !== undefined) {
        this.voteCounts[targetId] += 1;
      }
    });

    // Find highest voted player
    let maxVotes = -1;
    let mostVotedId = null;
    let isTie = false;

    Object.entries(this.voteCounts).forEach(([pid, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        mostVotedId = pid;
        isTie = false;
      } else if (count === maxVotes && count > 0) {
        isTie = true;
      }
    });

    const imposterCaught = !isTie && mostVotedId === this.imposterPlayerId;

    if (imposterCaught) {
      // Imposter gets a 12s chance to guess the crew's word to steal points!
      this.roundState = 'GUESS_PHASE';
      this.setPhaseTimer(12, () => {
        this.concludeRound();
      });
      this.broadcastState();
    } else {
      // Imposter escaped!
      this.concludeRound();
    }
  }

  concludeRound() {
    this.roundState = 'ROUND_RESULT';

    const imposterPlayer = this.room.players.find(p => p.id === this.imposterPlayerId);
    let maxVotes = -1;
    let mostVotedId = null;
    let isTie = false;

    Object.entries(this.voteCounts).forEach(([pid, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        mostVotedId = pid;
        isTie = false;
      } else if (count === maxVotes && count > 0) {
        isTie = true;
      }
    });

    const imposterCaught = !isTie && mostVotedId === this.imposterPlayerId;
    const pointsAwarded = {};

    if (imposterCaught) {
      if (this.imposterGuessSuccess) {
        // Imposter guessed secret word -> Steals victory!
        pointsAwarded[this.imposterPlayerId] = 150;
      } else {
        // Crew caught imposter -> Crew members who voted for imposter get 100 points
        Object.entries(this.votes).forEach(([voterId, targetId]) => {
          if (targetId === this.imposterPlayerId) {
            pointsAwarded[voterId] = 100;
          }
        });
      }
    } else {
      // Imposter evaded detection!
      pointsAwarded[this.imposterPlayerId] = 200;
    }

    // Apply to scores
    Object.entries(pointsAwarded).forEach(([pid, pts]) => {
      this.roundPoints[pid] = (this.roundPoints[pid] || 0) + pts;
      this.scores[pid] = (this.scores[pid] || 0) + pts;
    });

    this.resultSummary = {
      imposterId: this.imposterPlayerId,
      imposterName: imposterPlayer ? imposterPlayer.name : 'Unknown',
      imposterCaught,
      imposterGuess: this.imposterGuess,
      imposterGuessSuccess: this.imposterGuessSuccess,
      crewWord: this.crewWord,
      imposterWord: this.imposterWord,
      category: this.category,
      votes: this.votes,
      voteCounts: this.voteCounts,
      pointsAwarded
    };

    this.broadcastState();

    // 8 seconds result display before advancing or finishing
    this.setPhaseTimer(8, () => {
      if (this.currentRound >= this.maxRounds) {
        this.isGameOver = true;
        this.broadcastState();
      } else {
        this.startNextRound();
      }
    });
  }

  broadcastState() {
    this.room.players.forEach(p => {
      if (p.socketId) {
        this.io.to(p.socketId).emit('game_state_update', this.getState(p.id));
      }
    });
  }

  getState(forPlayerId) {
    const isImposter = forPlayerId === this.imposterPlayerId;
    const isRevealed = this.roundState === 'ROUND_RESULT';

    // Anti-cheat: During gameplay, player only sees their assigned word!
    const myWord = isImposter ? this.imposterWord : this.crewWord;
    const myRole = isImposter ? 'imposter' : 'crew';

    return {
      gameId: this.id,
      name: this.name,
      currentRound: this.currentRound,
      maxRounds: this.maxRounds,
      roundState: this.roundState, // 'CLUE_PHASE', 'REVEAL_PHASE', 'VOTE_PHASE', 'GUESS_PHASE', 'ROUND_RESULT'
      phaseExpiresAt: this.phaseExpiresAt,
      category: this.category,
      myRole,
      myWord,
      hasSubmittedClue: Boolean(this.clues[forPlayerId]),
      hasVoted: Boolean(this.votes[forPlayerId]),
      clues: (this.roundState === 'REVEAL_PHASE' || this.roundState === 'VOTE_PHASE' || this.roundState === 'GUESS_PHASE' || isRevealed) ? this.clues : {},
      votedPlayerCount: Object.keys(this.votes).length,
      imposterPlayerId: isRevealed ? this.imposterPlayerId : undefined,
      resultSummary: this.resultSummary,
      roundPoints: this.roundPoints,
      isGameOver: this.isGameOver
    };
  }

  cleanup() {
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }
  }
}
