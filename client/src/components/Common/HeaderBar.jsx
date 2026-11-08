import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Wifi, WifiOff, LogOut, Copy, Check } from 'lucide-react';
import { isAudioMuted, toggleAudio } from '../../utils/audio';
import { onLatencyChange } from '../../socket';

export default function HeaderBar({ roomCode, onLeaveRoom }) {
  const [muted, setMuted] = useState(isAudioMuted());
  const [copied, setCopied] = useState(false);
  const [latency, setLatency] = useState(0);

  useEffect(() => {
    const unsub = onLatencyChange((lat) => {
      setLatency(lat);
    });
    return unsub;
  }, []);

  const handleMuteToggle = () => {
    const next = toggleAudio();
    setMuted(next);
  };

  const handleCopyCode = async () => {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {}
  };

  const getLatencyColor = () => {
    if (latency <= 0) return 'text-slate-500';
    if (latency < 90) return 'text-emerald-400';
    if (latency < 180) return 'text-amber-400';
    return 'text-rose-400';
  };

  return (
    <header className="w-full max-w-md mx-auto px-4 py-2 flex items-center justify-between text-sm select-none z-30">
      {/* Room code badge */}
      {roomCode ? (
        <button
          onClick={handleCopyCode}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/90 border border-slate-700/80 hover:bg-slate-750 active:scale-95 transition-all"
          title="Tap to copy room code"
        >
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Room:</span>
          <span className="font-extrabold tracking-widest text-purple-400">{roomCode}</span>
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">
            PartyPulse
          </span>
        </div>
      )}

      {/* Right controls: Ping, Sound, Leave */}
      <div className="flex items-center gap-2">
        {/* Latency ping indicator */}
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800/60 border border-slate-800 text-xs font-mono" title={`Ping: ${latency}ms`}>
          <Wifi className={`w-3.5 h-3.5 ${getLatencyColor()}`} />
          <span className={`${getLatencyColor()} text-[11px] font-semibold`}>
            {latency > 0 ? `${latency}ms` : '--'}
          </span>
        </div>

        {/* Audio mute toggle */}
        <button
          onClick={handleMuteToggle}
          className="p-2 rounded-full bg-slate-800/90 border border-slate-700/80 active:scale-90 transition-transform text-slate-300"
          title={muted ? 'Unmute' : 'Mute'}
          aria-label={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-purple-400" />}
        </button>

        {/* Leave Room button (if in room) */}
        {roomCode && (
          <button
            onClick={onLeaveRoom}
            className="p-2 rounded-full bg-slate-800/90 border border-slate-700/80 active:scale-90 transition-transform text-slate-400 hover:text-rose-400"
            title="Leave Room"
            aria-label="Leave Room"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
}
