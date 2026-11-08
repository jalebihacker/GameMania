import React from 'react';
import { playTapSound } from '../../utils/audio';
import { vibrateLight } from '../../utils/haptics';

export const AVATARS = [
  '🦊', '🐱', '🐶', '🐼', '🦁', '🐸',
  '🦄', '🐙', '🦖', '🤖', '👾', '👻',
  '👑', '🔥', '⚡', '⭐', '🍕', '🌮',
  '🎮', '🚀', '🥑', '🍩', '🎯', '💎'
];

export default function AvatarPicker({ selectedAvatar, onSelect }) {
  return (
    <div className="w-full">
      <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider text-center">
        Choose Your Avatar
      </label>
      <div className="grid grid-cols-6 gap-2 p-3 bg-slate-900/80 rounded-2xl border border-slate-800 max-h-48 overflow-y-auto">
        {AVATARS.map((emoji) => {
          const isSelected = selectedAvatar === emoji;
          return (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                playTapSound();
                vibrateLight();
                onSelect(emoji);
              }}
              className={`h-12 w-12 rounded-xl flex items-center justify-center text-2xl transition-all ${
                isSelected
                  ? 'bg-purple-600/40 border-2 border-purple-400 scale-105 shadow-md shadow-purple-500/30'
                  : 'bg-slate-800/60 border border-slate-700/50 hover:bg-slate-750 active:scale-95'
              }`}
            >
              {emoji}
            </button>
          );
        })}
      </div>
    </div>
  );
}
