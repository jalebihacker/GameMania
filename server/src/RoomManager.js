import crypto from 'crypto';
import { MinigameEngine } from './MinigameEngine.js';

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid easily confused chars O/0, I/1
const RECONNECT_GRACE_PERIOD_MS = 60000; // 60 seconds

export class RoomManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map(); // roomCode -> room object
    this.playerSessions = new Map(); // sessionToken -> { roomCode, playerId }
    this.socketToSession = new Map(); // socketId -> sessionToken
  }

  generateRoomCode() {
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
    }
    // Guarantee uniqueness
    return this.rooms.has(code) ? this.generateRoomCode() : code;
  }

  createRoom(hostInfo, socket) {
    const roomCode = this.generateRoomCode();
    const playerId = 'p_' + crypto.randomBytes(4).toString('hex');
    const sessionToken = crypto.randomBytes(16).toString('hex');

    const hostPlayer = {
      id: playerId,
      sessionToken,
      name: (hostInfo.name || 'Host').trim().slice(0, 16),
      avatar: hostInfo.avatar || '👑',
      isHost: true,
      isReady: true,
      score: 0,
      socketId: socket.id,
      connected: true,
      disconnectedAt: null,
      disconnectTimeout: null
    };

    const room = {
      code: roomCode,
      players: [hostPlayer],
      hostId: playerId,
      status: 'LOBBY', // 'LOBBY', 'COUNTDOWN', 'IN_GAME', 'FINAL_LEADERBOARD'
      selectedGameId: 'reaction-duel',
      minigamesList: [
        { id: 'reaction-duel', name: 'Reaction Duel', desc: 'Tap first when screen turns green! False starts penalized.' },
        { id: 'imposter-word', name: 'Imposter Word', desc: 'One secret imposter, single-word clues, find the fake!' }
      ],
      createdAt: Date.now(),
      engine: null
    };

    room.engine = new MinigameEngine(
      room,
      this.io,
      (finishedRoom, results) => {
        this.handleGameFinished(finishedRoom, results);
      },
      (code) => {
        this.broadcastRoomUpdate(code);
      }
    );

    this.rooms.set(roomCode, room);
    this.playerSessions.set(sessionToken, { roomCode, playerId });
    this.socketToSession.set(socket.id, sessionToken);

    socket.join(roomCode);

    return {
      success: true,
      roomCode,
      playerId,
      sessionToken,
      roomState: this.getRoomState(roomCode, playerId)
    };
  }

  joinRoom(roomCode, playerInfo, socket) {
    const code = (roomCode || '').toUpperCase().trim();
    const room = this.rooms.get(code);

    if (!room) {
      return { success: false, error: 'Room not found. Check code or create a new room.' };
    }

    if (room.players.length >= 8) {
      return { success: false, error: 'Room is full (max 8 players).' };
    }

    if (room.status !== 'LOBBY' && room.status !== 'FINAL_LEADERBOARD') {
      return { success: false, error: 'A minigame is currently in progress. Please wait for next round.' };
    }

    const playerId = 'p_' + crypto.randomBytes(4).toString('hex');
    const sessionToken = crypto.randomBytes(16).toString('hex');

    const newPlayer = {
      id: playerId,
      sessionToken,
      name: (playerInfo.name || `Player ${room.players.length + 1}`).trim().slice(0, 16),
      avatar: playerInfo.avatar || '🎮',
      isHost: false,
      isReady: false,
      score: 0,
      socketId: socket.id,
      connected: true,
      disconnectedAt: null,
      disconnectTimeout: null
    };

    room.players.push(newPlayer);
    this.playerSessions.set(sessionToken, { roomCode: code, playerId });
    this.socketToSession.set(socket.id, sessionToken);

    socket.join(code);
    this.broadcastRoomUpdate(code);

    return {
      success: true,
      roomCode: code,
      playerId,
      sessionToken,
      roomState: this.getRoomState(code, playerId)
    };
  }

  reconnectPlayer(sessionToken, socket) {
    const session = this.playerSessions.get(sessionToken);
    if (!session) {
      return { success: false, error: 'Session expired' };
    }

    const room = this.rooms.get(session.roomCode);
    if (!room) {
      this.playerSessions.delete(sessionToken);
      return { success: false, error: 'Room no longer exists' };
    }

    const player = room.players.find(p => p.id === session.playerId);
    if (!player) {
      this.playerSessions.delete(sessionToken);
      return { success: false, error: 'Player was removed' };
    }

    // Cancel 60-second cleanup timer
    if (player.disconnectTimeout) {
      clearTimeout(player.disconnectTimeout);
      player.disconnectTimeout = null;
    }

    player.socketId = socket.id;
    player.connected = true;
    player.disconnectedAt = null;

    this.socketToSession.set(socket.id, sessionToken);
    socket.join(room.code);

    this.broadcastRoomUpdate(room.code);

    // If game is actively running, also send game state update
    if (room.engine && room.engine.activeGame) {
      socket.emit('game_state_update', room.engine.activeGame.getState(player.id));
    }

    return {
      success: true,
      roomCode: room.code,
      playerId: player.id,
      sessionToken,
      roomState: this.getRoomState(room.code, player.id)
    };
  }

  handleDisconnect(socketId) {
    const sessionToken = this.socketToSession.get(socketId);
    if (!sessionToken) return;

    this.socketToSession.delete(socketId);
    const session = this.playerSessions.get(sessionToken);
    if (!session) return;

    const room = this.rooms.get(session.roomCode);
    if (!room) return;

    const player = room.players.find(p => p.id === session.playerId);
    if (!player) return;

    player.connected = false;
    player.disconnectedAt = Date.now();

    // Start 60-second grace period timer
    player.disconnectTimeout = setTimeout(() => {
      this.permanentlyRemovePlayer(room.code, player.id);
    }, RECONNECT_GRACE_PERIOD_MS);

    // If disconnected player was host, transfer host to next active player immediately
    if (player.isHost) {
      this.transferHost(room);
    }

    this.broadcastRoomUpdate(room.code);
  }

  transferHost(room) {
    const nextHost = room.players.find(p => p.connected && !p.isHost);
    if (nextHost) {
      room.players.forEach(p => (p.isHost = false));
      nextHost.isHost = true;
      room.hostId = nextHost.id;
    }
  }

  permanentlyRemovePlayer(roomCode, playerId) {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    const playerIndex = room.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return;

    const [removedPlayer] = room.players.splice(playerIndex, 1);
    this.playerSessions.delete(removedPlayer.sessionToken);

    // If room is now empty, tear down room
    if (room.players.length === 0) {
      if (room.engine) room.engine.cleanup();
      this.rooms.delete(roomCode);
      return;
    }

    if (removedPlayer.isHost) {
      this.transferHost(room);
    }

    this.broadcastRoomUpdate(roomCode);
  }

  kickPlayer(roomCode, hostPlayerId, targetPlayerId) {
    const room = this.rooms.get(roomCode);
    if (!room) return false;

    if (room.hostId !== hostPlayerId) return false;
    if (hostPlayerId === targetPlayerId) return false;

    const targetPlayer = room.players.find(p => p.id === targetPlayerId);
    if (targetPlayer) {
      const socket = this.io.sockets.sockets.get(targetPlayer.socketId);
      if (socket) {
        socket.emit('kicked_from_room');
        socket.leave(roomCode);
      }
      this.permanentlyRemovePlayer(roomCode, targetPlayerId);
      return true;
    }
    return false;
  }

  toggleReady(roomCode, playerId) {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    const player = room.players.find(p => p.id === playerId);
    if (player) {
      player.isReady = !player.isReady;
      this.broadcastRoomUpdate(roomCode);
    }
  }

  selectGame(roomCode, hostPlayerId, gameId) {
    const room = this.rooms.get(roomCode);
    if (!room || room.hostId !== hostPlayerId) return false;

    room.selectedGameId = gameId;
    this.broadcastRoomUpdate(roomCode);
    return true;
  }

  startGame(roomCode, hostPlayerId) {
    const room = this.rooms.get(roomCode);
    if (!room || room.hostId !== hostPlayerId) return false;
    if (room.status === 'IN_GAME' || room.status === 'COUNTDOWN') return false;

    const activePlayers = room.players.filter(p => p.connected);
    if (activePlayers.length < 2) {
      const hostSocket = this.io.sockets.sockets.get(room.players.find(p => p.id === hostPlayerId)?.socketId);
      if (hostSocket) {
        hostSocket.emit('toast_error', 'Need at least 2 connected players to start!');
      }
      return false;
    }

    room.engine.startCountdown(room.selectedGameId);
    this.broadcastRoomUpdate(roomCode);
    return true;
  }

  handlePlayerInput(roomCode, playerId, action, payload) {
    const room = this.rooms.get(roomCode);
    if (room && room.engine) {
      room.engine.handlePlayerInput(playerId, action, payload);
    }
  }

  sendReaction(roomCode, playerId, emojiOrText) {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    const player = room.players.find(p => p.id === playerId);
    if (!player) return;

    this.io.to(roomCode).emit('new_reaction', {
      id: crypto.randomBytes(6).toString('hex'),
      playerId: player.id,
      playerName: player.name,
      avatar: player.avatar,
      content: emojiOrText,
      timestamp: Date.now()
    });
  }

  handleGameFinished(room, results) {
    this.io.to(room.code).emit('game_finished', {
      gameId: results.gameId,
      roundScores: results.roundScores,
      leaderboard: this.getSessionLeaderboard(room)
    });
    this.broadcastRoomUpdate(room.code);
  }

  returnToLobby(roomCode, hostPlayerId) {
    const room = this.rooms.get(roomCode);
    if (!room || room.hostId !== hostPlayerId) return;

    if (room.engine) {
      room.engine.cleanup();
    }
    room.status = 'LOBBY';
    room.players.forEach(p => {
      p.isReady = false;
    });

    this.broadcastRoomUpdate(roomCode);
  }

  resetSessionScores(roomCode, hostPlayerId) {
    const room = this.rooms.get(roomCode);
    if (!room || room.hostId !== hostPlayerId) return;

    room.players.forEach(p => {
      p.score = 0;
    });

    this.broadcastRoomUpdate(roomCode);
  }

  getSessionLeaderboard(room) {
    return [...room.players]
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .map((p, idx) => ({
        rank: idx + 1,
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        score: p.score || 0,
        connected: p.connected
      }));
  }

  getRoomState(roomCode, forPlayerId) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    const me = room.players.find(p => p.id === forPlayerId);

    return {
      code: room.code,
      status: room.status,
      hostId: room.hostId,
      isHost: me ? me.isHost : false,
      selectedGameId: room.selectedGameId,
      minigamesList: room.minigamesList,
      players: room.players.map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        isHost: p.isHost,
        isReady: p.isReady,
        score: p.score || 0,
        connected: p.connected,
        isMe: p.id === forPlayerId
      })),
      leaderboard: this.getSessionLeaderboard(room)
    };
  }

  broadcastRoomUpdate(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    room.players.forEach(p => {
      if (p.socketId) {
        this.io.to(p.socketId).emit('room_state_update', this.getRoomState(roomCode, p.id));
      }
    });
  }
}
