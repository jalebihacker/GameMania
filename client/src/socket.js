import { io } from 'socket.io-client';

const getServerUrl = () => {
  if (import.meta.env.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL;
  }
  // In local Vite dev (port 5173), server runs on port 3001
  if (window.location.port === '5173') {
    return `${window.location.protocol}//${window.location.hostname}:3001`;
  }
  return window.location.origin;
};

export const socket = io(getServerUrl(), {
  autoConnect: true,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 4000,
  timeout: 10000,
});

// Session token for 60-second grace period reconnection
export function getStoredSession() {
  try {
    const raw = localStorage.getItem('partypulse_session');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function saveSession(session) {
  try {
    localStorage.setItem('partypulse_session', JSON.stringify(session));
  } catch (e) {}
}

export function clearSession() {
  try {
    localStorage.removeItem('partypulse_session');
  } catch (e) {}
}

// Latency tracker
let latency = 0;
let latencyListeners = [];

export function onLatencyChange(fn) {
  latencyListeners.push(fn);
  fn(latency);
  return () => {
    latencyListeners = latencyListeners.filter((l) => l !== fn);
  };
}

setInterval(() => {
  if (socket.connected) {
    const start = Date.now();
    socket.emit('ping_server', start, (clientSentTime) => {
      latency = Math.max(1, Math.round(Date.now() - clientSentTime));
      latencyListeners.forEach((fn) => fn(latency));
    });
  }
}, 4000);
