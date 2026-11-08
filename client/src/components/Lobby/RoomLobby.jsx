import React, { useState } from 'react';
import { Crown, Play, CheckCircle2, Circle, UserX, Share2, MessageCircle, Copy, Check, Zap, Eye } from 'lucide-react';
import { playTapSound, playSuccessSound } from '../../utils/audio';
import { vibrateLight } from '../../utils/haptics';

export default function RoomLobby({
  roomState,
  onStartGame,
  onToggleReady,
  onSelectGame,
  onKickPlayer
}) {
  const [copied, setCopied] = useState(false);
  const { code, isHost, players = [], selectedGameId, minigamesList = [] } = roomState;

  const me = players.find((p) => p.isMe);
  const shareUrl = `${window.location.origin}/?room=${code}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      playSuccessSound();
      vibrateLight();
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {}
  };

  const handleShareWhatsApp = () => {
    const text = `Join our party game on PartyPulse! 🎉\nRoom Code: *${code}*\nTap to join: ${shareUrl}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const activePlayers = players.filter((p) => p.connected);
  const canStart = activePlayers.length >= 2;

  return (
    <div className="w-full max-w-md mx-auto px-4 py-3 flex flex-col items-center select-none pb-20">
      {/* Room Code Card */}
      <div className="w-full bg-gradient-to-b from-slate-900 to-slate-950 rounded-3xl p-5 border border-purple-500/30 shadow-2xl text-center mb-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <p className="text-xs uppercase font-extrabold tracking-widest text-slate-400 mb-1">
          Room Code
        </p>
        <div className="text-5xl font-black tracking-[0.25em] text-white font-mono my-2 text-purple-300 drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]">
          {code}
        </div>

        {/* Share buttons */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={handleShareWhatsApp}
            className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-600/20"
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp
          </button>

          <button
            onClick={handleCopyLink}
            className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>

      {/* Connected Players (2-8) */}
      <div className="w-full bg-slate-900/80 rounded-2xl p-4 border border-slate-800 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Players ({players.length}/8)
          </h3>
          <span className="text-[11px] font-semibold text-purple-400">
            {activePlayers.length < 2 ? 'Need 2+ to start' : 'Ready to play!'}
          </span>
        </div>

        <div className="space-y-2">
          {players.map((p) => (
            <div
              key={p.id}
              className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                p.isMe
                  ? 'bg-purple-950/40 border-purple-500/40'
                  : 'bg-slate-800/60 border-slate-700/40'
              } ${!p.connected ? 'opacity-40' : ''}`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{p.avatar}</span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-white">
                      {p.name} {p.isMe && '(You)'}
                    </span>
                    {p.isHost && <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                  </div>
                  {!p.connected && (
                    <span className="text-[10px] text-rose-400 font-medium">Reconnecting...</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Ready Status */}
                {p.isReady ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Ready
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                    <Circle className="w-3 h-3 text-slate-500" />
                    Waiting
                  </span>
                )}

                {/* Host kick button */}
                {isHost && !p.isMe && (
                  <button
                    onClick={() => onKickPlayer(p.id)}
                    className="p-1 rounded-lg text-slate-500 hover:text-rose-400 active:scale-90"
                    title="Kick player"
                  >
                    <UserX className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Minigame Selection (Host picks, everyone sees) */}
      <div className="w-full bg-slate-900/80 rounded-2xl p-4 border border-slate-800 mb-5">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
          {isHost ? 'Select Minigame' : 'Game Mode'}
        </h3>

        <div className="grid grid-cols-2 gap-2.5">
          {minigamesList.map((game) => {
            const isSelected = selectedGameId === game.id;
            return (
              <button
                key={game.id}
                type="button"
                disabled={!isHost}
                onClick={() => {
                  if (isHost) {
                    playTapSound();
                    vibrateLight();
                    onSelectGame(game.id);
                  }
                }}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-purple-900/40 border-purple-400 shadow-md shadow-purple-500/20'
                    : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800'
                } ${!isHost ? 'cursor-default' : 'active:scale-95'}`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  {game.id === 'reaction-duel' ? (
                    <Zap className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Eye className="w-4 h-4 text-pink-400" />
                  )}
                  <span className="font-black text-xs text-white leading-tight">
                    {game.name}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                  {game.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Start / Ready Actions */}
      <div className="w-full space-y-2">
        {isHost ? (
          <button
            onClick={() => {
              playTapSound();
              onStartGame();
            }}
            disabled={!canStart}
            className={`touch-btn w-full text-base shadow-xl flex items-center justify-center gap-2 ${
              canStart
                ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white shadow-purple-600/30'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            <Play className="w-5 h-5 fill-current" />
            {canStart ? 'Start Game' : 'Waiting for Players (2 min)'}
          </button>
        ) : (
          <button
            onClick={() => {
              playTapSound();
              vibrateLight();
              onToggleReady();
            }}
            className={`touch-btn w-full text-base shadow-lg transition-all ${
              me?.isReady
                ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                : 'bg-purple-600 text-white shadow-purple-600/30'
            }`}
          >
            {me?.isReady ? '✓ You Are Ready!' : 'Tap When Ready'}
          </button>
        )}
      </div>
    </div>
  );
}
