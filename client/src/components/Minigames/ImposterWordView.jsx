import React, { useState, useEffect } from 'react';
import { playTapSound, playSuccessSound, playBuzzerSound, playVoteSound } from '../../utils/audio';
import { vibrateLight, vibrateMedium, vibrateWin, vibrateError } from '../../utils/haptics';
import { Eye, ShieldAlert, Sparkles, Send, Check, Clock, UserCheck } from 'lucide-react';

export default function ImposterWordView({ gameState, onPlayerInput, roomPlayers = [], isHost = false }) {
  const {
    currentRound = 1,
    maxRounds = 3,
    roundState = 'CLUE_PHASE',
    phaseExpiresAt = 0,
    category = '',
    myRole = 'crew',
    myWord = '',
    hasSubmittedClue = false,
    hasVoted = false,
    clues = {},
    votedPlayerCount = 0,
    resultSummary
  } = gameState;

  const [clueInput, setClueInput] = useState('');
  const [selectedTargetId, setSelectedTargetId] = useState('');
  const [imposterGuessInput, setImposterGuessInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);

  // Timer countdown
  useEffect(() => {
    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((phaseExpiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [phaseExpiresAt]);

  const handleSubmitClue = (e) => {
    e.preventDefault();
    const clue = clueInput.trim();
    if (!clue) return;
    playTapSound();
    vibrateLight();
    onPlayerInput('submit_clue', { clue });
  };

  const handleCastVote = (targetPlayerId) => {
    setSelectedTargetId(targetPlayerId);
    playVoteSound();
    vibrateLight();
    onPlayerInput('cast_vote', { targetPlayerId });
  };

  const handleImposterGuessSubmit = (e) => {
    e.preventDefault();
    const guess = imposterGuessInput.trim();
    if (!guess) return;
    playTapSound();
    vibrateLight();
    onPlayerInput('imposter_guess', { guess });
  };

  // Helper to find player details by ID
  const getPlayer = (id) => roomPlayers.find((p) => p.id === id) || { name: 'Player', avatar: '👤' };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-3 flex flex-col items-center select-none pb-24">
      {/* Top Header */}
      <div className="w-full flex items-center justify-between py-2 border-b border-slate-800 mb-3 text-xs font-bold">
        <div className="flex items-center gap-1.5 text-pink-400">
          <Eye className="w-4 h-4" />
          <span>Imposter Word</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-purple-300 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20">
            Round {currentRound} / {maxRounds}
          </span>
          <span className="font-mono text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {timeLeft}s
          </span>
        </div>
      </div>

      {/* PHASE 1: CLUE PHASE */}
      {roundState === 'CLUE_PHASE' && (
        <div className="w-full space-y-4 animate-pop-in">
          {/* Secret Word Card */}
          <div className="w-full bg-gradient-to-b from-slate-900 to-slate-950 rounded-3xl p-5 border border-pink-500/30 text-center shadow-xl relative overflow-hidden">
            <div className="text-xs uppercase font-extrabold tracking-widest text-pink-400 mb-1">
              Category: {category}
            </div>
            <p className="text-xs text-slate-400 mb-2">Your Secret Word</p>
            <div className="text-3xl font-black text-white tracking-wide py-2 px-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 inline-block shadow-inner">
              {myWord}
            </div>

            {myRole === 'imposter' ? (
              <div className="mt-3 p-2.5 rounded-xl bg-pink-500/10 border border-pink-500/30 text-pink-300 text-xs font-semibold flex items-center justify-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-pink-400 flex-shrink-0" />
                <span>You are the Imposter! Blend in with your decoy word.</span>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 mt-2 font-medium">
                Submit a 1-word clue that hints at the word without being too obvious!
              </p>
            )}
          </div>

          {/* Clue Input Form */}
          {hasSubmittedClue ? (
            <div className="w-full p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-1">
              <Check className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-sm font-bold text-emerald-300">Clue Submitted!</p>
              <p className="text-xs text-slate-400">Waiting for other players to submit clues...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmitClue} className="w-full space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Your One-Word Clue
                </label>
                <input
                  type="text"
                  maxLength={25}
                  value={clueInput}
                  onChange={(e) => setClueInput(e.target.value)}
                  placeholder="e.g. Cheese, Fast, Heavy..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-base focus:outline-none focus:border-pink-500 transition-colors"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={!clueInput.trim()}
                className="touch-btn w-full bg-gradient-to-r from-pink-600 to-purple-600 disabled:opacity-50 text-white text-base shadow-lg shadow-pink-600/30 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Submit Clue
              </button>
            </form>
          )}
        </div>
      )}

      {/* PHASE 2: REVEAL & DISCUSSION */}
      {roundState === 'REVEAL_PHASE' && (
        <div className="w-full space-y-4 animate-pop-in">
          <div className="text-center">
            <h2 className="text-xl font-black text-white">Clues Revealed!</h2>
            <p className="text-xs text-slate-400 mt-1">
              Discuss with your friends on voice or chat. Who looks suspicious?
            </p>
          </div>

          {/* Clues List */}
          <div className="space-y-2">
            {roomPlayers.map((player) => {
              const clue = clues[player.id] || '...';
              return (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{player.avatar}</span>
                    <span className="font-bold text-sm text-slate-200">{player.name}</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 font-black text-sm text-pink-300">
                    "{clue}"
                  </div>
                </div>
              );
            })}
          </div>

          {/* Host can start voting early */}
          {isHost && (
            <button
              onClick={() => onPlayerInput('start_voting_early', {})}
              className="touch-btn w-full bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs border border-purple-500/30 mt-2"
            >
              Start Voting Now ({timeLeft}s left)
            </button>
          )}
        </div>
      )}

      {/* PHASE 3: VOTING PHASE */}
      {roundState === 'VOTE_PHASE' && (
        <div className="w-full space-y-4 animate-pop-in">
          <div className="text-center">
            <h2 className="text-xl font-black text-white">Who is the Imposter?</h2>
            <p className="text-xs text-slate-400 mt-1">
              Cast your vote! ({votedPlayerCount}/{roomPlayers.length} voted)
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {roomPlayers.map((player) => {
              const isSelected = selectedTargetId === player.id;
              const clue = clues[player.id];
              return (
                <button
                  key={player.id}
                  disabled={hasVoted}
                  onClick={() => handleCastVote(player.id)}
                  className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-rose-900/40 border-rose-500 shadow-lg shadow-rose-500/20 scale-[1.01]'
                      : 'bg-slate-900/80 border-slate-800 hover:bg-slate-850 active:scale-95'
                  } ${hasVoted ? 'cursor-default opacity-80' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{player.avatar}</span>
                    <div>
                      <span className="font-extrabold text-sm text-white block">
                        {player.name}
                      </span>
                      {clue && (
                        <span className="text-xs text-pink-300/80 font-semibold">
                          Clue: "{clue}"
                        </span>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <span className="px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5" />
                      Voted
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {hasVoted && (
            <p className="text-xs text-center text-slate-400 animate-pulse font-medium">
              Vote locked! Waiting for final results...
            </p>
          )}
        </div>
      )}

      {/* PHASE 4: IMPOSTER GUESS PHASE */}
      {roundState === 'GUESS_PHASE' && (
        <div className="w-full space-y-4 animate-pop-in text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-amber-500/10 border-2 border-amber-400/40 flex items-center justify-center text-4xl shadow-lg">
            🕵️
          </div>
          <h2 className="text-xl font-black text-amber-300">
            Imposter Caught!
          </h2>

          {myRole === 'imposter' ? (
            <form onSubmit={handleImposterGuessSubmit} className="space-y-3">
              <p className="text-xs text-slate-300 font-medium">
                Last chance! Guess the crew's secret word to steal victory (+150 pts):
              </p>
              <input
                type="text"
                value={imposterGuessInput}
                onChange={(e) => setImposterGuessInput(e.target.value)}
                placeholder="Type the secret word..."
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-amber-500 text-white font-bold text-center text-lg focus:outline-none uppercase"
                autoFocus
              />
              <button
                type="submit"
                className="touch-btn w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-base shadow-lg"
              >
                Submit Guess ({timeLeft}s)
              </button>
            </form>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <p className="text-sm font-bold text-slate-200">
                The Imposter is guessing the secret word...
              </p>
              <p className="text-xs text-slate-400 mt-1">
                If they guess correctly, they steal the round points! ({timeLeft}s)
              </p>
            </div>
          )}
        </div>
      )}

      {/* PHASE 5: ROUND RESULT */}
      {roundState === 'ROUND_RESULT' && resultSummary && (
        <div className="w-full space-y-4 animate-pop-in text-center">
          <div className="w-24 h-24 mx-auto rounded-full bg-slate-900 border-4 border-pink-500 flex items-center justify-center text-5xl shadow-xl shadow-pink-500/20">
            {resultSummary.imposterCaught ? '🎉' : '🤫'}
          </div>

          <div>
            <h2 className="text-2xl font-black text-white">
              {resultSummary.imposterCaught
                ? resultSummary.imposterGuessSuccess
                  ? `${resultSummary.imposterName} stole victory with a correct guess!`
                  : `Crew caught the Imposter: ${resultSummary.imposterName}!`
                : `${resultSummary.imposterName} escaped detection!`}
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              Category: <span className="text-white font-bold">{resultSummary.category}</span>
            </p>
          </div>

          {/* Word Comparison */}
          <div className="flex gap-2">
            <div className="flex-1 p-3 rounded-2xl bg-purple-900/30 border border-purple-500/30">
              <span className="text-[10px] uppercase font-bold text-purple-300 block mb-1">
                Crew Word
              </span>
              <span className="text-lg font-black text-white">{resultSummary.crewWord}</span>
            </div>
            <div className="flex-1 p-3 rounded-2xl bg-pink-900/30 border border-pink-500/30">
              <span className="text-[10px] uppercase font-bold text-pink-300 block mb-1">
                Imposter Decoy
              </span>
              <span className="text-lg font-black text-white">{resultSummary.imposterWord}</span>
            </div>
          </div>

          {/* Voting Breakdown */}
          <div className="w-full bg-slate-900/90 rounded-2xl p-3 border border-slate-800 text-left space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Votes & Points
            </span>
            {roomPlayers.map((p) => {
              const votesReceived = resultSummary.voteCounts[p.id] || 0;
              const points = resultSummary.pointsAwarded[p.id] || 0;
              const isImposter = p.id === resultSummary.imposterId;
              return (
                <div key={p.id} className="flex items-center justify-between text-xs py-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{p.avatar}</span>
                    <span className="font-semibold text-slate-200">
                      {p.name} {isImposter && '(Imposter)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-slate-400">{votesReceived} votes</span>
                    {points > 0 && (
                      <span className="text-emerald-400 font-bold">+{points} pts</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-slate-400 animate-pulse font-medium">
            Advancing shortly...
          </p>
        </div>
      )}
    </div>
  );
}
