# 🎮 PartyPulse - Free Mobile-First Multiplayer Party Game Hub

Play together over the internet with friends — each on their own phone, from their own place!
**No shared TV or host screen required.** Every player sees the full game on their own device.

---

## 📱 Features

- **Mobile-First Experience**: Designed specifically for smartphone screens (360px+), big touch-friendly buttons (50px+), zero pinch/zoom glitches, portrait-locked orientation.
- **No Login / Sign-up**: Pick a name and a fun avatar (🦊 🦁 🐱 🤖 👑 🍕 👾) and jump straight into the party!
- **4-Letter Room Codes & Instant Invite**: One-tap copyable room links and direct **WhatsApp Share** button (`https://api.whatsapp.com/send?text=...`).
- **Resilient Multiplayer (60s Grace Period)**: Disconnects or browser switches don't kick you out; re-enter seamlessly within 60 seconds with your original score and player profile intact. Host migration occurs automatically if the host drops.
- **Zero-Asset Web Audio API**: Crisp retro arcade ticks, countdown beeps, false-start buzzers, vote chimes, and victory fanfares generated via pure browser synthesizer (no MP3 asset downloads, zero network lag, instant offline audio) with a sound mute/unmute toggle.
- **Screen Wake Lock & Haptics**: Automatically prevents phone screens from going to sleep during party rounds (`navigator.wakeLock`) and triggers tactile vibration feedback on touches and wins (`navigator.vibrate`).
- **PWA Ready**: Installable to iOS/Android Home Screen via standalone Web App Manifest and Service Worker.
- **In-Room Quick Reactions**: Floating emoji expressions (😂 🔥 💀 👏 👀 😱 "GG" "Rematch!") floating up the screen in real-time.

---

## 🕹️ Active Minigames

### 1. ⚡ Reaction Duel
- **Round Format**: Best of 5 rapid rounds.
- **Gameplay**: Screen prompts with `WAIT FOR GREEN...`. At a random millisecond (2.5s–5.5s), the screen explodes into vibrant green (`TAP NOW! ⚡`).
- **First to Tap Wins**: Server timestamps measure the exact millisecond of each player's tap (e.g., `189ms`, `242ms`).
- **False Start Penalty**: Tapping early triggers an immediate `FALSE START! 🚫` penalty disqualifying the player for that round.

### 2. 🕵️ Imposter Word (Social Deduction)
- **Role Assignment**: All players receive the exact same secret word (e.g. *Category: Food & Drink* → *Secret Word: Pizza*), except one secret Imposter who receives a subtle decoy word (e.g. *Burger*) or has to blend in.
- **Clue Phase (40s)**: Each player types a single-word clue that signals they know the word without giving the secret away to the imposter.
- **Reveal & Discussion (25s)**: All clues are displayed side-by-side on all phones. Friends discuss on voice calls or in-room: *Wait, why did you say "Bun" when we're eating Pizza?!*
- **Voting Phase (25s)**: Every player casts a secret vote on who they believe is the Imposter.
- **The Reveal & Steal**:
  - If the Imposter is caught: The Imposter gets 12 seconds to guess the crew's word to steal 150 points! If they fail, correct voters earn +100 points.
  - If the Imposter escapes: The Imposter wins +200 bonus points!
- **100+ Word Library**: Built-in curated word pairs across Food, Animals, Pop Culture, Gaming, Objects, Places, Sports, and Science.

---

## 🚀 Quick Start (Local Setup)

### Prerequisites
- Node.js 18+ installed (`node -v`)

### 1. Run with a single command
From the project root:
```bash
npm run install:all
npm run dev
```

This concurrently boots:
- **Backend (Socket.IO & Express)** on `http://localhost:3001`
- **Frontend (Vite + React PWA)** on `http://localhost:5173`

---

## 📱 How to Test Multiplayer on Multiple Phones

### Method A: Same Local Wi-Fi Network (Fastest & No Tools Needed)
1. Ensure your computer and phones are connected to the **same Wi-Fi network**.
2. Find your computer's local LAN IP:
   - **Windows**: Open PowerShell and run `ipconfig` (look for `IPv4 Address`, e.g. `192.168.1.15`).
   - **Mac/Linux**: Run `ifconfig` or `ip a` (e.g. `192.168.1.15`).
3. On your phone's browser (Safari or Chrome), open:
   ```
   http://<YOUR_LOCAL_IP>:5173
   ```
   *(Example: `http://192.168.1.15:5173`)*
4. Player 1 taps **Create Room** on phone 1.
5. Player 2 opens the link or enters the 4-letter room code on phone 2.
6. Play together in real time!

---

### Method B: Testing Over the Internet via Free Tunnel (ngrok / localtunnel)
If your friends are in different locations and you want to test before cloud deployment:

Using [localtunnel](https://github.com/localtunnel/localtunnel) (100% free, no account needed):
```bash
# In a new terminal window:
npx localtunnel --port 5173
```
Share the generated `https://xxxx.loca.lt` URL with your friends!

---

## 🌐 100% Free Deployment Guide

You can host this entire game for \$0 forever using free tier services.

### Option 1: Decoupled Deploy (Vercel/Netlify for Frontend + Render for Backend)

#### Part 1: Deploy Backend to [Render.com](https://render.com) (Free Web Service)
1. Push your repository to GitHub.
2. Sign in to Render and click **New +** → **Web Service**.
3. Select your GitHub repository.
4. Set the following options:
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
5. Click **Create Web Service**. Render gives you a free HTTPS URL (e.g. `https://partypulse-api.onrender.com`).

#### Part 2: Deploy Frontend to [Vercel](https://vercel.com) or [Netlify](https://netlify.com)
1. In Vercel or Netlify, click **Add New Project** and connect your GitHub repo.
2. Set configuration:
   - **Root Directory**: `client`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add Environment Variable:
   - **Name**: `VITE_SERVER_URL`
   - **Value**: `https://partypulse-api.onrender.com` *(your Render backend URL)*
4. Click **Deploy**. Your party game is now live on the internet with HTTPS!

---

### Option 2: All-in-One Single Container (Render / Railway / Fly.io)
The server in `server/src/index.js` automatically serves the compiled `client/dist` static assets and handles Socket.IO on the same port!

1. Build the frontend:
   ```bash
   npm run build
   ```
2. In Render / Railway, set:
   - **Build Command**: `npm run install:all && npm run build`
   - **Start Command**: `npm run start`

---

## 🛠️ How to Add Your Own Minigames (Modular System)

Every minigame extends the `BaseMinigame` class located at `server/src/minigames/BaseMinigame.js`.

### 1. The Standard Minigame Lifecycle Interface
```javascript
export class BaseMinigame {
  constructor(room, io) {
    this.room = room;     // Room state & player list
    this.io = io;         // Socket.IO emitter
    this.isGameOver = false;
    this.scores = {};     // { [playerId]: pointsWonThisGame }
  }

  // 1. Initialize round & timers
  init(settings = {}) {}

  // 2. Handle touches or inputs from any player
  onPlayerInput(playerId, action, payload = {}) {}

  // 3. (Optional) Clock tick for time-based games
  onTick(deltaTime, elapsedMs) {}

  // 4. Return sanitized state for specific player (prevents cheating)
  getState(forPlayerId) {
    return {};
  }

  // 5. Return round scores awarded to each player
  getScores() {
    return this.scores;
  }

  // 6. Return true when round/game finishes
  isFinished() {
    return this.isGameOver;
  }

  // 7. Clear timers and listeners
  cleanup() {}
}
```

### 2. Registering in `RoomManager.js`
In `server/src/RoomManager.js`, add your game to `minigamesList`:
```javascript
{ id: 'math-blitz', name: 'Math Blitz', desc: 'Solve rapid math equations faster than everyone else!' }
```

### 3. Launching in `MinigameEngine.js`
In `server/src/MinigameEngine.js`:
```javascript
if (gameId === 'math-blitz') {
  this.activeGame = new MathBlitz(this.room, this.io);
}
```

### 4. Creating the React View in `client/src/components/Minigames/`
Create `MathBlitzView.jsx` that receives `{ gameState, onPlayerInput }`, wire it in `client/src/App.jsx`, and you're good to go!

---

## 🧪 Testing

Run the automated test suite covering room lifecycle, 60s reconnection, false start penalization, and imposter deduction:
```bash
npm test
```

---

## 📜 License
MIT - 100% Free & Open Source.
