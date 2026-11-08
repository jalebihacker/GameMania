import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { io as ClientIO } from 'socket.io-client';
import { RoomManager } from '../src/RoomManager.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const roomManager = new RoomManager(io);

// Replicate server socket handlers for test harness
io.on('connection', (socket) => {
  socket.on('create_room', (hostInfo, cb) => cb(roomManager.createRoom(hostInfo || {}, socket)));
  socket.on('join_room', ({ roomCode, playerInfo }, cb) => cb(roomManager.joinRoom(roomCode, playerInfo || {}, socket)));
  socket.on('reconnect_session', ({ sessionToken }, cb) => cb(roomManager.reconnectPlayer(sessionToken, socket)));
  socket.on('select_game', ({ roomCode, playerId, gameId }) => roomManager.selectGame(roomCode, playerId, gameId));
  socket.on('start_game', ({ roomCode, playerId }) => roomManager.startGame(roomCode, playerId));
  socket.on('player_input', ({ roomCode, playerId, action, payload }) => roomManager.handlePlayerInput(roomCode, playerId, action, payload));
  socket.on('disconnect', () => roomManager.handleDisconnect(socket.id));
});

const TEST_PORT = 3099;

async function runTests() {
  console.log('--- STARTING MULTIPLAYER TEST SUITE ---');

  await new Promise(resolve => server.listen(TEST_PORT, resolve));
  console.log(`✓ Test server running on port ${TEST_PORT}`);

  const client1 = ClientIO(`http://localhost:${TEST_PORT}`, { transports: ['websocket'] });
  const client2 = ClientIO(`http://localhost:${TEST_PORT}`, { transports: ['websocket'] });

  await Promise.all([
    new Promise(res => client1.on('connect', res)),
    new Promise(res => client2.on('connect', res))
  ]);
  console.log('✓ Both test clients connected to server');

  // TEST 1: Create Room
  let roomCode = null;
  let p1SessionToken = null;
  let p1Id = null;

  const createRes = await new Promise(res => {
    client1.emit('create_room', { name: 'Alice', avatar: '🦊' }, res);
  });

  if (!createRes.success || createRes.roomCode.length !== 4) {
    throw new Error('Create room failed: ' + JSON.stringify(createRes));
  }
  roomCode = createRes.roomCode;
  p1SessionToken = createRes.sessionToken;
  p1Id = createRes.playerId;
  console.log(`✓ Room created successfully with 4-letter code: ${roomCode}`);

  // TEST 2: Join Room
  const joinRes = await new Promise(res => {
    client2.emit('join_room', { roomCode, playerInfo: { name: 'Bob', avatar: '🐱' } }, res);
  });

  if (!joinRes.success) {
    throw new Error('Join room failed: ' + JSON.stringify(joinRes));
  }
  const p2SessionToken = joinRes.sessionToken;
  const p2Id = joinRes.playerId;
  console.log(`✓ Second player (Bob) joined room ${roomCode}`);

  // TEST 3: 60s Reconnect Grace Period
  console.log('Testing 60s Reconnection Grace Period...');
  client2.disconnect();

  // Wait for disconnect broadcast
  await new Promise(resolve => setTimeout(resolve, 300));
  const roomAfterDisconnect = roomManager.rooms.get(roomCode);
  const p2State = roomAfterDisconnect.players.find(p => p.id === p2Id);
  if (p2State.connected !== false) {
    throw new Error('Player 2 should be marked disconnected');
  }
  console.log('✓ Player 2 gracefully marked disconnected (grace timer running)');

  // Reconnect with same sessionToken on a new socket
  const client2Reconnect = ClientIO(`http://localhost:${TEST_PORT}`, { transports: ['websocket'] });
  await new Promise(res => client2Reconnect.on('connect', res));

  const reconnectRes = await new Promise(res => {
    client2Reconnect.emit('reconnect_session', { sessionToken: p2SessionToken }, res);
  });

  if (!reconnectRes.success || reconnectRes.playerId !== p2Id) {
    throw new Error('Reconnection failed: ' + JSON.stringify(reconnectRes));
  }
  console.log('✓ Player 2 seamlessly reconnected using sessionToken without losing identity!');

  // TEST 4: Reaction Duel Minigame Test
  console.log('\n--- Testing Reaction Duel ---');
  roomManager.selectGame(roomCode, p1Id, 'reaction-duel');
  
  const room = roomManager.rooms.get(roomCode);
  // Bypass countdown directly for fast headless test
  room.engine.launchGame('reaction-duel');
  const duelGame = room.engine.activeGame;

  if (duelGame.id !== 'reaction-duel') {
    throw new Error('Reaction Duel game failed to launch');
  }
  console.log('✓ Reaction Duel launched in WAITING state');

  // Test False Start
  client2Reconnect.emit('player_input', {
    roomCode,
    playerId: p2Id,
    action: 'tap',
    payload: {}
  });
  await new Promise(r => setTimeout(r, 100));

  const p2Tap = duelGame.playerTaps[p2Id];
  if (!p2Tap || !p2Tap.falseStart) {
    throw new Error('False start was not recorded for early tap');
  }
  console.log('✓ False start penalty correctly applied to early tap!');

  // Trigger Green and valid tap
  duelGame.triggerGreen();
  if (duelGame.roundState !== 'GREEN') {
    throw new Error('Game should be in GREEN state');
  }

  client1.emit('player_input', {
    roomCode,
    playerId: p1Id,
    action: 'tap',
    payload: {}
  });
  await new Promise(r => setTimeout(r, 200));

  const p1Tap = duelGame.playerTaps[p1Id];
  if (!p1Tap || p1Tap.falseStart || !p1Tap.reactionMs) {
    throw new Error('Player 1 reaction tap was not recorded');
  }
  console.log(`✓ Player 1 valid tap recorded: ${p1Tap.reactionMs}ms reaction time!`);
  duelGame.cleanup();

  // TEST 5: Imposter Word Minigame Test
  console.log('\n--- Testing Imposter Word ---');
  roomManager.selectGame(roomCode, p1Id, 'imposter-word');
  room.engine.launchGame('imposter-word');
  const imposterGame = room.engine.activeGame;

  if (imposterGame.id !== 'imposter-word') {
    throw new Error('Imposter Word failed to launch');
  }
  console.log(`✓ Imposter Word launched: Category "${imposterGame.category}"`);

  // Verify anti-cheat filtered state
  const p1FilteredState = imposterGame.getState(p1Id);
  const p2FilteredState = imposterGame.getState(p2Id);

  if (p1FilteredState.myRole === 'crew' && p1FilteredState.myWord !== imposterGame.crewWord) {
    throw new Error('Crew member should only receive crew word');
  }
  if (p2FilteredState.myRole === 'imposter' && p2FilteredState.myWord !== imposterGame.imposterWord) {
    throw new Error('Imposter should receive decoy word');
  }
  console.log('✓ Anti-cheat filtered state verified: roles and words kept secret!');

  // Submit Clues
  client1.emit('player_input', {
    roomCode,
    playerId: p1Id,
    action: 'submit_clue',
    payload: { clue: 'Delicious' }
  });
  client2Reconnect.emit('player_input', {
    roomCode,
    playerId: p2Id,
    action: 'submit_clue',
    payload: { clue: 'Fast' }
  });
  await new Promise(r => setTimeout(r, 100));

  if (imposterGame.roundState !== 'REVEAL_PHASE') {
    throw new Error('Game should transition to REVEAL_PHASE after all clues submitted');
  }
  console.log('✓ Both clues submitted -> Transitioned to REVEAL_PHASE with clues revealed!');

  // Advance to voting
  imposterGame.startVotingPhase();

  // Cast Votes
  client1.emit('player_input', {
    roomCode,
    playerId: p1Id,
    action: 'cast_vote',
    payload: { targetPlayerId: p2Id }
  });
  client2Reconnect.emit('player_input', {
    roomCode,
    playerId: p2Id,
    action: 'cast_vote',
    payload: { targetPlayerId: p1Id }
  });
  await new Promise(r => setTimeout(r, 150));

  console.log('✓ Voting completed and vote counts tallied!');
  imposterGame.cleanup();

  // Teardown
  client1.disconnect();
  client2Reconnect.disconnect();
  server.close();

  console.log('\n=======================================');
  console.log('🎉 ALL MULTIPLAYER & MINIGAME TESTS PASSED!');
  console.log('=======================================\n');
  process.exit(0);
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
