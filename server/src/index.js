import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { RoomManager } from './RoomManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Optional static build serving for single-container free deployments
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
}

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 15000,
  pingInterval: 10000
});

const roomManager = new RoomManager(io);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    activeRooms: roomManager.rooms.size,
    timestamp: Date.now()
  });
});

io.on('connection', (socket) => {
  // Latency ping
  socket.on('ping_server', (clientSentTime, ack) => {
    if (typeof ack === 'function') {
      ack(clientSentTime);
    }
  });

  // Create Room
  socket.on('create_room', (hostInfo, callback) => {
    const result = roomManager.createRoom(hostInfo || {}, socket);
    if (typeof callback === 'function') callback(result);
  });

  // Join Room
  socket.on('join_room', ({ roomCode, playerInfo }, callback) => {
    const result = roomManager.joinRoom(roomCode, playerInfo || {}, socket);
    if (typeof callback === 'function') callback(result);
  });

  // Reconnect with 60-second grace session
  socket.on('reconnect_session', ({ sessionToken }, callback) => {
    const result = roomManager.reconnectPlayer(sessionToken, socket);
    if (typeof callback === 'function') callback(result);
  });

  // Ready status toggle
  socket.on('toggle_ready', ({ roomCode, playerId }) => {
    roomManager.toggleReady(roomCode, playerId);
  });

  // Host selects game
  socket.on('select_game', ({ roomCode, playerId, gameId }) => {
    roomManager.selectGame(roomCode, playerId, gameId);
  });

  // Host starts game
  socket.on('start_game', ({ roomCode, playerId }) => {
    roomManager.startGame(roomCode, playerId);
  });

  // Player action in active game
  socket.on('player_input', ({ roomCode, playerId, action, payload }) => {
    roomManager.handlePlayerInput(roomCode, playerId, action, payload);
  });

  // Floating quick-chat reaction
  socket.on('send_reaction', ({ roomCode, playerId, content }) => {
    roomManager.sendReaction(roomCode, playerId, content);
  });

  // Kick player
  socket.on('kick_player', ({ roomCode, playerId, targetPlayerId }) => {
    roomManager.kickPlayer(roomCode, playerId, targetPlayerId);
  });

  // Return to lobby from leaderboard
  socket.on('return_to_lobby', ({ roomCode, playerId }) => {
    roomManager.returnToLobby(roomCode, playerId);
  });

  // Reset session scores
  socket.on('reset_scores', ({ roomCode, playerId }) => {
    roomManager.resetSessionScores(roomCode, playerId);
  });

  // Leave room
  socket.on('leave_room', ({ roomCode, playerId }) => {
    roomManager.permanentlyRemovePlayer(roomCode, playerId);
    socket.leave(roomCode);
  });

  // Disconnect
  socket.on('disconnect', () => {
    roomManager.handleDisconnect(socket.id);
  });
});

// SPA fallback for production serving
if (fs.existsSync(clientDistPath)) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`PartyPulse Server running on http://0.0.0.0:${PORT}`);
});
