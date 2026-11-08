import React, { useEffect } from 'react';
import { playTapSound, playSuccessSound, playBuzzerSound } from '../../utils/audio';
import { vibrateLight, vibrateMedium, vibrateError } from '../../utils/haptics';
import { Zap, AlertTriangle, Trophy } from 'lucide-react';

export default function ReactionDuelView({ gameState, onPlayerInput }) {
  const {
    currentRound = 1,
    maxRounds = 5,
    roundState = 'WAITING', // 'WAITING', 'GREEN', 'ROUND_OVER'
    myTap,
    roundWinner,
    roundSummary,
    roundPoints = {}
  } = gameState;

  // Sound and vibration effects on state transitions
  useEffect(() => {
    if (roundState === 'GREEN') {
      vibrateMedium();
    } else if (roundState === 'ROUND_OVER') {
      if (roundSummary?.winnerId) {
        playSuccessSound();
      }
    }
  }, [roundState, roundSummary]);

  const handleTap = (e) => {
    e.preventDefault();

    if (myTap) return; // Already tapped this round
    if (roundState === 'ROUND_OVER') return;

    if (roundState === 'WAITING') {
      // Early tap
      playBuzzerSound();
      vibrateError();
    } else if (roundState === 'GREEN') {
      // Valid green tap
      playTapSound();
      vibrateLight();
    }

    onPlayerInput('tap', {});
  };

  // 1. ROUND OVER VIEW
  if (roundState === 'ROUND_OVER' && roundSummary) {
    const isWinner = myTap && !myTap.falseStart && roundSummary.winnerId === myTap.playerId;

    return (
      <div className="w-full max-w-md mx-auto px-4 py-4 flex flex-col items-center select-none text-center h-[calc(100vh-80px)] justify-between">
        {/* Header */}
        <div className="w-full flex items-center justify-between py-2 border-b border-slate-800">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
            Reaction Duel
          </span>
          <span className="text-xs font-mono font-bold bg-purple-500/10 text-purple-300 px-3 py-1 rounded-full border border-purple-500/20">
            Round {currentRound} / {maxRounds}
          </span>
        </div>

        {/* Round Winner Hero */}
        <div className="my-auto space-y-4 animate-pop-in">
          <div className="w-24 h-24 mx-auto rounded-full bg-slate-900 border-4 border-amber-400 flex items-center justify-center text-5xl shadow-xl shadow-amber-500/20">
            {roundSummary.winnerId ? '⚡' : '💀'}
          </div>

          <div>
            <h2 className="text-2xl font-black text-white">
              {roundSummary.reason}
            </h2>
            {roundSummary.winnerReactionMs && (
              <p className="text-4xl font-black font-mono text-emerald-400 mt-2">
                {roundSummary.winnerReactionMs} ms
              </p>
            )}
          </div>

          {/* Standings list for round */}
          {roundSummary.playerTaps && (
            <div className="w-full max-w-xs mx-auto bg-slate-900/90 rounded-2xl p-3 border border-slate-800 text-left space-y-2 mt-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Round Results
              </span>
              {Object.entries(roundSummary.playerTaps).map(([pid, tap]) => (
                <div key={pid} className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium truncate max-w-[140px]">
                    {pid === roundSummary.winnerId ? '👑 ' : ''}
                    {pid}
                  </span>
                  {tap.falseStart ? (
                    <span className="text-rose-400 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> False Start
                    </span>
                  ) : tap.reactionMs ? (
                    <span className="font-mono font-bold text-emerald-400">
                      {tap.reactionMs} ms
                    </span>
                  ) : (
                    <span className="text-slate-500">No tap</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-slate-400 animate-pulse font-medium mb-4">
          Next round starting in a moment...
        </p>
      </div>
    );
  }

  // 2. ACTIVE TAP SCREEN (WAITING or GREEN)
  const isGreen = roundState === 'GREEN';
  const hasFalseStarted = myTap?.falseStart;
  const hasTapped = Boolean(myTap);

  return (
    <div
      onPointerDown={handleTap}
      className={`fixed inset-0 z-30 select-none flex flex-col justify-between items-center p-6 text-center transition-colors duration-100 ${
        isGreen
          ? 'bg-emerald-500 text-white cursor-pointer'
          : hasFalseStarted
          ? 'bg-rose-950/90 text-rose-200'
          : 'bg-slate-950 text-white cursor-pointer'
      }`}
    >
      {/* Top Bar */}
      <div className="w-full flex items-center justify-between text-xs font-bold pt-2">
        <span className={isGreen ? 'text-emerald-950' : 'text-purple-400'}>
          Reaction Duel
        </span>
        <span
          className={`px-3 py-1 rounded-full font-mono ${
            isGreen
              ? 'bg-emerald-600/40 text-emerald-950 border border-emerald-400'
              : 'bg-slate-900 text-slate-300 border border-slate-800'
          }`}
        >
          Round {currentRound} of {maxRounds}
        </span>
      </div>

      {/* Main Reactive Body */}
      <div className="my-auto space-y-4">
        {hasFalseStarted ? (
          <div className="animate-pop-in space-y-2">
            <div className="text-6xl mb-2">🚫</div>
            <h1 className="text-3xl font-black text-rose-400">FALSE START!</h1>
            <p className="text-sm text-rose-300 font-medium max-w-xs mx-auto">
              You tapped before the screen turned green. Disqualified for this round!
            </p>
          </div>
        ) : isGreen ? (
          <div className="animate-pop-in space-y-2">
            <Zap className="w-20 h-20 mx-auto text-emerald-950 fill-emerald-950 animate-bounce" />
            <h1 className="text-5xl md:text-6xl font-black text-emerald-950 tracking-wider">
              TAP NOW!
            </h1>
            {hasTapped && (
              <p className="text-2xl font-mono font-black text-emerald-900 mt-2">
                ⚡ {myTap.reactionMs} ms
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-24 h-24 mx-auto rounded-full bg-rose-500/10 border-2 border-rose-500/30 flex items-center justify-center text-4xl animate-pulse">
              ⏳
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-100 tracking-wide">
              WAIT FOR GREEN...
            </h1>
            <p className="text-xs text-rose-400/90 font-semibold tracking-wide">
              ⚠️ Early taps will disqualify you!
            </p>
          </div>
        )}
      </div>

      {/* Bottom Hint */}
      <div className="pb-4">
        <p className={`text-xs font-semibold ${isGreen ? 'text-emerald-950 font-bold' : 'text-slate-500'}`}>
          {isGreen
            ? hasTapped
              ? 'Tap recorded! Comparing speeds...'
              : 'TAP ANYWHERE ON SCREEN!'
            : 'Keep your finger hovering and ready...'}
        </p>
      </div>
    </div>
  );
}
