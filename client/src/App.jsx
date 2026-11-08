import React, { useState, useEffect, useCallback } from 'react';
import {
  socket,
  getStoredSession,
  saveSession,
  clearSession
} from './socket';
import { requestWakeLock, releaseWakeLock } from './utils/wakeLock';
import HeaderBar from './components/Common/HeaderBar';
import QuickChat from './components/Common/QuickChat';
import CountdownOverlay from './components/Common/CountdownOverlay';
import Leaderboard from './components/Common/Leaderboard';
import HomeJoin from './components/Lobby/HomeJoin';
import RoomLobby from './components/Lobby/RoomLobby';
import ReactionDuelView from './components/Minigames/ReactionDuelView';
import ImposterWordView from './components/Minigames/ImposterWordView';

export default function App() {
  const [roomState, setRoomState] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [countdownData, setCountdownData] = useState(null);
  const [reactions, setReactions] = useState([]);
  const [errorToast, setErrorToast] = useState('');
  const [initialRoomCode, setInitialRoomCode] = useState('');

  // Extract ?room=XXXX from URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setInitialRoomCode(roomParam.toUpperCase());
    }
  }, []);

  // Attempt auto-reconnection on mount with 60s grace token
  useEffect(() => {
    const saved = getStoredSession();
    if (saved && saved.sessionToken) {
      socket.emit('reconnect_session', { sessionToken: saved.sessionToken }, (res) => {
        if (res && res.success) {
          setRoomState(res.roomState);
          requestWakeLock();
        } else {
          clearSession();
        }
      });
    }
  }, []);

  // Socket event listeners
  useEffect(() => {
    const handleRoomUpdate = (state) => {
      setRoomState(state);
      if (state && (state.status === 'LOBBY' || state.status === 'FINAL_LEADERBOARD')) {
        setGameState(null);
      }
      if (state) {
        requestWakeLock();
      }
    };

    const handleGameStateUpdate = (gState) => {
      setGameState(gState);
    };

    const handleCountdownStart = (data) => {
      setGameState(null);
      setCountdownData(data);
    };

    const handleNewReaction = (reaction) => {
      setReactions((prev) => [...prev.slice(-6), reaction]);
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== reaction.id));
      }, 3500);
    };

    const handleToastError = (msg) => {
      setErrorToast(msg);
      setTimeout(() => setErrorToast(''), 4000);
    };

    const handleKicked = () => {
      clearSession();
      setRoomState(null);
      setGameState(null);
      releaseWakeLock();
      setErrorToast('You were removed from the room by the host.');
      setTimeout(() => setErrorToast(''), 4000);
    };

    socket.on('room_state_update', handleRoomUpdate);
    socket.on('game_state_update', handleGameStateUpdate);
    socket.on('countdown_start', handleCountdownStart);
    socket.on('new_reaction', handleNewReaction);
    socket.on('toast_error', handleToastError);
    socket.on('kicked_from_room', handleKicked);

    return () => {
      socket.off('room_state_update', handleRoomUpdate);
      socket.off('game_state_update', handleGameStateUpdate);
      socket.off('countdown_start', handleCountdownStart);
      socket.off('new_reaction', handleNewReaction);
      socket.off('toast_error', handleToastError);
      socket.off('kicked_from_room', handleKicked);
    };
  }, []);

  // User Actions
  const handleCreateRoom = (hostInfo) => {
    socket.emit('create_room', hostInfo, (res) => {
      if (res && res.success) {
        saveSession({ sessionToken: res.sessionToken, roomCode: res.roomCode, playerId: res.playerId });
        setRoomState(res.roomState);
        requestWakeLock();
        // Update URL cleanly
        window.history.replaceState(null, '', `?room=${res.roomCode}`);
      } else {
        setErrorToast(res?.error || 'Failed to create room.');
      }
    });
  };

  const handleJoinRoom = (roomCode, playerInfo) => {
    socket.emit('join_room', { roomCode, playerInfo }, (res) => {
      if (res && res.success) {
        saveSession({ sessionToken: res.sessionToken, roomCode: res.roomCode, playerId: res.playerId });
        setRoomState(res.roomState);
        requestWakeLock();
        window.history.replaceState(null, '', `?room=${res.roomCode}`);
      } else {
        setErrorToast(res?.error || 'Failed to join room.');
      }
    });
  };

  const handleLeaveRoom = () => {
    if (roomState) {
      const myPlayer = roomState.players.find((p) => p.isMe);
      if (myPlayer) {
        socket.emit('leave_room', { roomCode: roomState.code, playerId: myPlayer.id });
      }
    }
    clearSession();
    setRoomState(null);
    setGameState(null);
    releaseWakeLock();
    window.history.replaceState(null, '', window.location.pathname);
  };

  const handleToggleReady = () => {
    if (!roomState) return;
    const myPlayer = roomState.players.find((p) => p.isMe);
    if (myPlayer) {
      socket.emit('toggle_ready', { roomCode: roomState.code, playerId: myPlayer.id });
    }
  };

  const handleSelectGame = (gameId) => {
    if (!roomState) return;
    const myPlayer = roomState.players.find((p) => p.isMe);
    if (myPlayer) {
      socket.emit('select_game', { roomCode: roomState.code, playerId: myPlayer.id, gameId });
    }
  };

  const handleStartGame = () => {
    if (!roomState) return;
    const myPlayer = roomState.players.find((p) => p.isMe);
    if (myPlayer) {
      socket.emit('start_game', { roomCode: roomState.code, playerId: myPlayer.id });
    }
  };

  const handleKickPlayer = (targetPlayerId) => {
    if (!roomState) return;
    const myPlayer = roomState.players.find((p) => p.isMe);
    if (myPlayer) {
      socket.emit('kick_player', {
        roomCode: roomState.code,
        playerId: myPlayer.id,
        targetPlayerId
      });
    }
  };

  const handlePlayerInput = (action, payload) => {
    if (!roomState) return;
    const myPlayer = roomState.players.find((p) => p.isMe);
    if (myPlayer) {
      socket.emit('player_input', {
        roomCode: roomState.code,
        playerId: myPlayer.id,
        action,
        payload
      });
    }
  };

  const handleSendReaction = (content) => {
    if (!roomState) return;
    const myPlayer = roomState.players.find((p) => p.isMe);
    if (myPlayer) {
      socket.emit('send_reaction', {
        roomCode: roomState.code,
        playerId: myPlayer.id,
        content
      });
    }
  };

  const handleReturnToLobby = () => {
    if (!roomState) return;
    const myPlayer = roomState.players.find((p) => p.isMe);
    if (myPlayer) {
      socket.emit('return_to_lobby', { roomCode: roomState.code, playerId: myPlayer.id });
    }
  };

  const handleResetScores = () => {
    if (!roomState) return;
    const myPlayer = roomState.players.find((p) => p.isMe);
    if (myPlayer) {
      socket.emit('reset_scores', { roomCode: roomState.code, playerId: myPlayer.id });
    }
  };

  // Determine current active view
  const renderView = () => {
    if (!roomState) {
      return (
        <HomeJoin
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          error={errorToast}
          initialRoomCode={initialRoomCode}
        />
      );
    }

    if (roomState.status === 'LOBBY' || roomState.status === 'COUNTDOWN') {
      return (
        <RoomLobby
          roomState={roomState}
          onStartGame={handleStartGame}
          onToggleReady={handleToggleReady}
          onSelectGame={handleSelectGame}
          onKickPlayer={handleKickPlayer}
        />
      );
    }

    if (roomState.status === 'IN_GAME') {
      if (roomState.selectedGameId === 'reaction-duel') {
        if (!gameState) {
          return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
              <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-bold text-emerald-400 animate-pulse">Entering Reaction Duel...</p>
            </div>
          );
        }
        return (
          <ReactionDuelView
            gameState={gameState}
            onPlayerInput={handlePlayerInput}
          />
        );
      }
      if (roomState.selectedGameId === 'imposter-word') {
        if (!gameState) {
          return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
              <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-bold text-pink-400 animate-pulse">Entering Imposter Word...</p>
            </div>
          );
        }
        return (
          <ImposterWordView
            gameState={gameState}
            onPlayerInput={handlePlayerInput}
            roomPlayers={roomState.players}
            isHost={roomState.isHost}
          />
        );
      }
    }

    if (roomState.status === 'FINAL_LEADERBOARD') {
      return (
        <Leaderboard
          leaderboard={roomState.leaderboard}
          isHost={roomState.isHost}
          onStartNextGame={handleStartGame}
          onReturnToLobby={handleReturnToLobby}
          onResetScores={handleResetScores}
          selectedGameId={roomState.selectedGameId}
          minigamesList={roomState.minigamesList}
        />
      );
    }

    // Default fallback while transitioning
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-950 text-white relative">
      {/* Toast Alert */}
      {errorToast && !roomState && null /* Handled inside HomeJoin */}
      {errorToast && roomState && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-rose-600/90 text-white text-xs font-bold shadow-xl backdrop-blur-md animate-bounce">
          {errorToast}
        </div>
      )}

      {/* Synchronized 3-2-1 Countdown Overlay */}
      {countdownData && (
        <CountdownOverlay
          countdownData={countdownData}
          onComplete={() => setCountdownData(null)}
        />
      )}

      {/* Top Header */}
      <HeaderBar
        roomCode={roomState ? roomState.code : null}
        onLeaveRoom={handleLeaveRoom}
      />

      {/* Main View Area */}
      <main className="flex-1 flex flex-col justify-center w-full">
        {renderView()}
      </main>

      {/* Quick Chat & Floating Reactions Tray (visible in rooms) */}
      {roomState && (
        <QuickChat
          onSendReaction={handleSendReaction}
          reactions={reactions}
        />
      )}
    </div>
  );
}
