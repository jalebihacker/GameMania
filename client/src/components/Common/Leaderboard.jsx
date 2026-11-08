import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Crown, Trophy, Play, RotateCcw, Home } from 'lucide-react';
import { playSuccessSound } from '../../utils/audio';
import { vibrateWin } from '../../utils/haptics';

export default function Leaderboard({
  leaderboard = [],
  isHost,
  onStartNextGame,
  onReturnToLobby,
  onResetScores,
  selectedGameId,
  minigamesList = []
}) {
  useEffect(() => {
    playSuccessSound();
    vibrateWin();

    // Confetti burst
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {}
  }, []);

  const firstPlace = leaderboard[0];
  const secondPlace = leaderboard[1];
  const thirdPlace = leaderboard[2];
  const otherPlaces = leaderboard.slice(3);

  const selectedGame = minigamesList.find((g) => g.id === selectedGameId);

  return (
    <div className="w-full max-w-md mx-auto px-4 py-4 flex flex-col items-center select-none pb-20">
      <div className="flex items-center gap-2 mb-2">
        <Trophy className="w-7 h-7 text-amber-400" />
        <h2 className="text-2xl font-black tracking-tight text-white">Leaderboard</h2>
      </div>
      <p className="text-xs text-slate-400 mb-6 font-medium">Session Standings</p>

      {/* Podium for Top 3 */}
      <div className="w-full flex items-end justify-center gap-2 mb-6 pt-6">
        {/* 2nd Place */}
        {secondPlace ? (
          <div className="flex-1 flex flex-col items-center">
            <div className="text-3xl mb-1">{secondPlace.avatar}</div>
            <div className="text-xs font-bold text-slate-200 truncate max-w-[80px]">
              {secondPlace.name}
            </div>
            <div className="text-xs font-mono font-semibold text-slate-400 mb-1">
              {secondPlace.score} pts
            </div>
            <div className="w-full h-20 rounded-t-xl bg-slate-800/90 border-t-2 border-slate-400 flex items-center justify-center font-black text-slate-400 text-lg shadow-md">
              2
            </div>
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {/* 1st Place */}
        {firstPlace && (
          <div className="flex-1 flex flex-col items-center relative -top-3">
            <Crown className="w-6 h-6 text-amber-400 mb-1 animate-bounce-subtle" />
            <div className="text-4xl mb-1">{firstPlace.avatar}</div>
            <div className="text-sm font-extrabold text-amber-300 truncate max-w-[90px]">
              {firstPlace.name}
            </div>
            <div className="text-xs font-mono font-bold text-amber-400 mb-1">
              {firstPlace.score} pts
            </div>
            <div className="w-full h-28 rounded-t-xl bg-gradient-to-b from-amber-500/20 to-slate-800/90 border-t-2 border-amber-400 flex items-center justify-center font-black text-amber-300 text-2xl shadow-xl shadow-amber-500/10">
              1
            </div>
          </div>
        )}

        {/* 3rd Place */}
        {thirdPlace ? (
          <div className="flex-1 flex flex-col items-center">
            <div className="text-3xl mb-1">{thirdPlace.avatar}</div>
            <div className="text-xs font-bold text-slate-200 truncate max-w-[80px]">
              {thirdPlace.name}
            </div>
            <div className="text-xs font-mono font-semibold text-slate-400 mb-1">
              {thirdPlace.score} pts
            </div>
            <div className="w-full h-16 rounded-t-xl bg-slate-800/90 border-t-2 border-amber-700 flex items-center justify-center font-black text-amber-700 text-lg shadow-md">
              3
            </div>
          </div>
        ) : (
          <div className="flex-1" />
        )}
      </div>

      {/* Ranks 4+ */}
      {otherPlaces.length > 0 && (
        <div className="w-full bg-slate-900/80 rounded-2xl p-3 border border-slate-800 mb-6 space-y-2">
          {otherPlaces.map((player) => (
            <div
              key={player.id}
              className="flex items-center justify-between p-2 rounded-xl bg-slate-800/50"
            >
              <div className="flex items-center gap-3">
                <span className="font-bold text-xs text-slate-500 w-4">{player.rank}</span>
                <span className="text-xl">{player.avatar}</span>
                <span className="font-semibold text-sm text-slate-200">{player.name}</span>
              </div>
              <span className="font-mono font-bold text-sm text-purple-400">
                {player.score} pts
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="w-full space-y-3">
        {isHost ? (
          <>
            <button
              onClick={onStartNextGame}
              className="touch-btn w-full bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white text-base shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5 fill-current" />
              Play Next: {selectedGame ? selectedGame.name : 'Minigame'}
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={onReturnToLobby}
                className="touch-btn flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm border border-slate-700 flex items-center justify-center gap-1.5"
              >
                <Home className="w-4 h-4" />
                Lobby
              </button>

              <button
                onClick={onResetScores}
                className="touch-btn px-4 bg-slate-800 hover:bg-slate-700 text-slate-400 text-sm border border-slate-700 flex items-center justify-center gap-1.5"
                title="Reset Session Scores"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            </div>
          </>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
            <p className="text-sm font-semibold text-purple-300 animate-pulse">
              Waiting for host to pick next game...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
