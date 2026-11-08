import React, { useState, useEffect } from 'react';
import AvatarPicker, { AVATARS } from './AvatarPicker';
import { playTapSound, playSuccessSound } from '../../utils/audio';
import { vibrateLight } from '../../utils/haptics';
import { Sparkles, Users, ArrowRight } from 'lucide-react';

export default function HomeJoin({ onCreateRoom, onJoinRoom, error, initialRoomCode = '' }) {
  const [name, setName] = useState(() => localStorage.getItem('partypulse_name') || '');
  const [avatar, setAvatar] = useState(() => {
    return localStorage.getItem('partypulse_avatar') || AVATARS[Math.floor(Math.random() * AVATARS.length)];
  });
  const [joinCode, setJoinCode] = useState(initialRoomCode);
  const [activeTab, setActiveTab] = useState(initialRoomCode ? 'join' : 'create');

  useEffect(() => {
    if (initialRoomCode) {
      setJoinCode(initialRoomCode.toUpperCase());
      setActiveTab('join');
    }
  }, [initialRoomCode]);

  const handleNameChange = (val) => {
    setName(val);
    localStorage.setItem('partypulse_name', val);
  };

  const handleAvatarSelect = (val) => {
    setAvatar(val);
    localStorage.setItem('partypulse_avatar', val);
  };

  const handleCreate = (e) => {
    e.preventDefault();
    const finalName = name.trim() || 'Player';
    playTapSound();
    vibrateLight();
    onCreateRoom({ name: finalName, avatar });
  };

  const handleJoin = (e) => {
    e.preventDefault();
    const finalName = name.trim() || 'Player';
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    playTapSound();
    vibrateLight();
    onJoinRoom(code, { name: finalName, avatar });
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-4 flex flex-col items-center">
      {/* Brand Hero */}
      <div className="text-center my-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Mobile Multiplayer Party</span>
        </div>
        <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
          PartyPulse
        </h1>
        <p className="text-slate-400 text-xs mt-1">
          Play together with friends on your phones — no TV needed!
        </p>
      </div>

      {/* Error alert if any */}
      {error && (
        <div className="w-full mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center font-medium animate-pulse">
          {error}
        </div>
      )}

      {/* Profile Card */}
      <div className="w-full bg-slate-900/90 rounded-3xl p-5 border border-slate-800 shadow-xl mb-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
            Your Nickname
          </label>
          <input
            type="text"
            maxLength={14}
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Enter your name..."
            className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-semibold text-base focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>

        <AvatarPicker selectedAvatar={avatar} onSelect={handleAvatarSelect} />
      </div>

      {/* Tabs: Create or Join */}
      <div className="w-full flex rounded-2xl bg-slate-900/80 p-1 border border-slate-800 mb-4">
        <button
          type="button"
          onClick={() => setActiveTab('create')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'create'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Create Room
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('join')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'join'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Join with Code
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'create' ? (
        <form onSubmit={handleCreate} className="w-full">
          <button
            type="submit"
            className="touch-btn w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white text-base shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            Create Party Room
          </button>
        </form>
      ) : (
        <form onSubmit={handleJoin} className="w-full space-y-3">
          <input
            type="text"
            maxLength={4}
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="4-LETTER CODE"
            className="w-full px-4 py-3 text-center tracking-[0.3em] font-mono font-black text-2xl rounded-xl bg-slate-900 border border-slate-700 text-purple-300 placeholder:text-slate-600 placeholder:tracking-normal placeholder:font-sans placeholder:text-sm focus:outline-none focus:border-purple-500 uppercase"
          />
          <button
            type="submit"
            disabled={!joinCode.trim()}
            className="touch-btn w-full bg-gradient-to-r from-purple-600 to-indigo-600 disabled:opacity-50 text-white text-base shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2"
          >
            <Users className="w-5 h-5" />
            Join Party
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </form>
      )}
    </div>
  );
}
