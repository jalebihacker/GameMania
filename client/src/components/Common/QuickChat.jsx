import React, { useState, useEffect } from 'react';
import { MessageSquare, Smile, X } from 'lucide-react';
import { playTapSound } from '../../utils/audio';
import { vibrateLight } from '../../utils/haptics';

const QUICK_EMOJIS = ['😂', '🔥', '💀', '👏', '👀', '😱', 'GG!', 'Rematch!'];

export default function QuickChat({ onSendReaction, reactions = [] }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSend = (item) => {
    playTapSound();
    vibrateLight();
    onSendReaction(item);
  };

  return (
    <>
      {/* Floating Reactions on Screen */}
      <div className="fixed inset-x-0 bottom-24 pointer-events-none z-40 overflow-hidden flex flex-col items-center gap-2">
        {reactions.map((r) => (
          <div
            key={r.id}
            className="animate-float-up flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-purple-500/40 shadow-lg text-sm text-white"
          >
            <span className="text-lg">{r.avatar}</span>
            <span className="text-xs text-slate-300 font-semibold">{r.playerName}:</span>
            <span className="text-base font-bold text-amber-300">{r.content}</span>
          </div>
        ))}
      </div>

      {/* Floating Quick Action Button & Tray */}
      <div className="fixed bottom-3 right-3 z-40">
        {isOpen && (
          <div className="mb-2 p-2 rounded-2xl bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-md flex flex-wrap gap-1.5 max-w-[280px]">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSend(emoji)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-90 transition-transform text-sm font-bold border border-slate-700/60"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => {
            playTapSound();
            setIsOpen(!isOpen);
          }}
          className="w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-500 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-purple-600/30 transition-transform border border-purple-400/40"
          title="Quick Reactions"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Smile className="w-5 h-5" />}
        </button>
      </div>
    </>
  );
}
