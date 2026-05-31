import { PoseEngine } from "./pose";
import { GAMES } from "./games/index";
import type { GameMeta } from "./games/index";
import type { Game } from "./engine";

// ── DOM scaffolding ───────────────────────────────────────
const app = document.getElementById("app")!;
app.innerHTML = `
  <!-- Loading -->
  <div id="loading" class="hidden">
    <div class="spinner"></div>
    <p id="loading-msg">Initialising camera &amp; pose model…</p>
  </div>

  <!-- Lobby -->
  <div id="lobby">
    <div class="lobby-header">
      <h1>🎮 WBA99 Rehab Games</h1>
      <p>8 pose-controlled real-time games · gamified rehabilitation</p>
    </div>
    <div class="grid" id="game-grid"></div>
    <div class="camera-notice">
      <span class="icon">📷</span>
      <div>
        <strong>Camera access required</strong>
        <p>Allow camera permission when prompted. Best played in good lighting with full body visible.</p>
      </div>
    </div>
  </div>

  <!-- Game view -->
  <div id="game-view" class="hidden">
    <canvas id="game-canvas"></canvas>
    <div class="game-bar">
      <button class="back-btn" id="back-btn">← Back</button>
      <span id="game-title" style="font-size:0.9rem;font-weight:700;color:#f1f5f9"></span>
    </div>
  </div>

  <!-- Score overlay -->
  <div id="score-overlay" class="hidden">
    <div class="score-card">
      <div class="score-emoji" id="score-emoji">🏆</div>
      <h2 id="score-game-name">Game Over</h2>
      <div class="final" id="score-value">0</div>
      <div class="btns">
        <button class="btn-play"  id="btn-replay">Play Again</button>
        <button class="btn-lobby" id="btn-lobby">Lobby</button>
      </div>
    </div>
  </div>
`;

// ── Elements ──────────────────────────────────────────────
const lobbyEl    = document.getElementById("lobby")!;
const loadingEl  = document.getElementById("loading")!;
const loadingMsg = document.getElementById("loading-msg")!;
const gameViewEl = document.getElementById("game-view")!;
const canvas     = document.getElementById("game-canvas") as HTMLCanvasElement;
const gameTitle  = document.getElementById("game-title")!;
const backBtn    = document.getElementById("back-btn")!;
const scoreOverlay   = document.getElementById("score-overlay")!;
const scoreEmoji     = document.getElementById("score-emoji")!;
const scoreGameName  = document.getElementById("score-game-name")!;
const scoreValue     = document.getElementById("score-value")!;
const btnReplay      = document.getElementById("btn-replay")!;
const btnLobby       = document.getElementById("btn-lobby")!;

// ── State ─────────────────────────────────────────────────
const pose = new PoseEngine();
let poseReady = false;
let activeGame: Game | null = null;
let activeMeta: GameMeta | null = null;

// ── Build lobby grid ──────────────────────────────────────
const grid = document.getElementById("game-grid")!;
for (const g of GAMES) {
  const card = document.createElement("div");
  card.className = "game-card";
  card.innerHTML = `
    <div class="emoji">${g.emoji}</div>
    <h3>${g.name}${g.isNew ? ' <span class="badge-new">NEW</span>' : ""}</h3>
    <p class="desc">${g.desc}</p>
    <p class="target">${g.target}</p>
  `;
  card.addEventListener("click", () => launchGame(g));
  grid.appendChild(card);
}

// ── Pose init (lazy on first game launch) ─────────────────
async function ensurePose() {
  if (poseReady) return;
  loadingEl.classList.remove("hidden");
  lobbyEl.classList.add("hidden");
  loadingMsg.textContent = "Requesting camera access…";
  await pose.init();
  loadingMsg.textContent = "Loading pose detection model…";
  // model loads inside init; we just wait for ready flag
  poseReady = true;
  loadingEl.classList.add("hidden");
}

// ── Launch a game ─────────────────────────────────────────
async function launchGame(meta: GameMeta) {
  await ensurePose();

  lobbyEl.classList.add("hidden");
  scoreOverlay.classList.add("hidden");
  gameViewEl.classList.remove("hidden");

  // Size canvas to window
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  gameTitle.textContent = `${meta.emoji} ${meta.name}`;
  activeMeta = meta;

  if (activeGame) activeGame.stop();
  activeGame = meta.create(canvas, pose);
  activeGame.start((score) => showScore(meta, score));
}

// ── Score screen ──────────────────────────────────────────
function showScore(meta: GameMeta, score: number) {
  scoreEmoji.textContent   = meta.emoji;
  scoreGameName.textContent = meta.name;
  scoreValue.textContent   = String(score);
  scoreOverlay.classList.remove("hidden");
}

// ── Controls ──────────────────────────────────────────────
backBtn.addEventListener("click", () => {
  activeGame?.stop();
  activeGame = null;
  gameViewEl.classList.add("hidden");
  scoreOverlay.classList.add("hidden");
  lobbyEl.classList.remove("hidden");
});

btnReplay.addEventListener("click", () => {
  if (!activeMeta) return;
  scoreOverlay.classList.add("hidden");
  launchGame(activeMeta);
});

btnLobby.addEventListener("click", () => {
  activeGame?.stop();
  activeGame = null;
  gameViewEl.classList.add("hidden");
  scoreOverlay.classList.add("hidden");
  lobbyEl.classList.remove("hidden");
});

// Resize canvas when window changes
window.addEventListener("resize", () => {
  if (activeGame && !gameViewEl.classList.contains("hidden")) {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
});
