"use strict";

const COLS = 10;
const ROWS = 20;
const CELL = 30;
const STORAGE_KEY = "neon-stack-records-v1";
const SOUND_KEY = "neon-stack-sound-v1";

const COLORS = {
  I: "#52f4ff",
  J: "#4776ff",
  L: "#ff9f43",
  O: "#ffe45e",
  S: "#52ff91",
  T: "#b35cff",
  Z: "#ff3c78",
};

const SHAPES = {
  I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
  J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
  L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
  O: [[1, 1], [1, 1]],
  S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
  T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
  Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
};

const gameCanvas = document.querySelector("#gameCanvas");
const gameCtx = gameCanvas.getContext("2d");
const nextCanvas = document.querySelector("#nextCanvas");
const nextCtx = nextCanvas.getContext("2d");
const holdCanvas = document.querySelector("#holdCanvas");
const holdCtx = holdCanvas.getContext("2d");

const ui = {
  score: document.querySelector("#score"),
  lines: document.querySelector("#lines"),
  level: document.querySelector("#level"),
  bestScore: document.querySelector("#bestScore"),
  progressText: document.querySelector("#levelProgressText"),
  progressBar: document.querySelector("#levelProgressBar"),
  status: document.querySelector("#systemStatus"),
  overlay: document.querySelector("#gameOverlay"),
  overlaySymbol: document.querySelector("#overlaySymbol"),
  overlayEyebrow: document.querySelector("#overlayEyebrow"),
  overlayTitle: document.querySelector("#overlayTitle"),
  overlayMessage: document.querySelector("#overlayMessage"),
  finalStats: document.querySelector("#finalStats"),
  finalScore: document.querySelector("#finalScore"),
  finalLines: document.querySelector("#finalLines"),
  pauseOverlay: document.querySelector("#pauseOverlay"),
  startButton: document.querySelector("#startButton"),
  pauseButton: document.querySelector("#pauseButton"),
  restartButton: document.querySelector("#restartButton"),
  recordList: document.querySelector("#recordList"),
  clearRecordsButton: document.querySelector("#clearRecordsButton"),
  soundButton: document.querySelector("#soundButton"),
  soundIcon: document.querySelector("#soundIcon"),
  toast: document.querySelector("#toast"),
};

let board = createBoard();
let queue = [];
let heldType = null;
let holdLocked = false;
let score = 0;
let totalLines = 0;
let level = 1;
let combo = -1;
let dropCounter = 0;
let lastTime = 0;
let animationId = 0;
let running = false;
let paused = false;
let gameEnded = false;
let toastTimer = 0;
let audioContext = null;
let soundEnabled = localStorage.getItem(SOUND_KEY) !== "off";

const player = {
  type: "T",
  matrix: cloneMatrix(SHAPES.T),
  pos: { x: 3, y: 0 },
};

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function cloneMatrix(matrix) {
  return matrix.map((row) => [...row]);
}

function shuffledBag() {
  const bag = Object.keys(SHAPES);
  for (let i = bag.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

function refillQueue() {
  while (queue.length < 7) queue.push(...shuffledBag());
}

function takeNextType() {
  refillQueue();
  const type = queue.shift();
  refillQueue();
  return type;
}

function setPlayer(type) {
  player.type = type;
  player.matrix = cloneMatrix(SHAPES[type]);
  player.pos.y = type === "I" ? -1 : 0;
  player.pos.x = Math.floor((COLS - player.matrix[0].length) / 2);
}

function spawnPiece(forcedType = null, unlockHold = true) {
  setPlayer(forcedType || takeNextType());
  if (unlockHold) holdLocked = false;
  drawSideCanvases();
  if (collides(board, player)) endGame();
}

function collides(arena, active) {
  const { matrix, pos } = active;
  for (let y = 0; y < matrix.length; y += 1) {
    for (let x = 0; x < matrix[y].length; x += 1) {
      if (!matrix[y][x]) continue;
      const boardY = y + pos.y;
      const boardX = x + pos.x;
      if (boardX < 0 || boardX >= COLS || boardY >= ROWS) return true;
      if (boardY >= 0 && arena[boardY][boardX]) return true;
    }
  }
  return false;
}

function merge() {
  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      const boardY = y + player.pos.y;
      if (value && boardY >= 0) board[boardY][x + player.pos.x] = player.type;
    });
  });
}

function rotateMatrix(matrix, direction) {
  const rotated = matrix[0].map((_, index) => matrix.map((row) => row[index]));
  if (direction > 0) rotated.forEach((row) => row.reverse());
  else rotated.reverse();
  return rotated;
}

function rotatePlayer(direction = 1) {
  if (!canControl() || player.type === "O") return;
  const previousMatrix = player.matrix;
  const previousX = player.pos.x;
  player.matrix = rotateMatrix(player.matrix, direction);
  const kicks = [0, -1, 1, -2, 2];
  let fitted = false;
  for (const offset of kicks) {
    player.pos.x = previousX + offset;
    if (!collides(board, player)) {
      fitted = true;
      break;
    }
  }
  if (!fitted) {
    player.matrix = previousMatrix;
    player.pos.x = previousX;
    playSound("error");
  } else {
    playSound("rotate");
  }
  draw();
}

function movePlayer(direction) {
  if (!canControl()) return;
  player.pos.x += direction;
  if (collides(board, player)) player.pos.x -= direction;
  else playSound("move");
  draw();
}

function stepDown(manual = false) {
  if (!canControl()) return;
  player.pos.y += 1;
  if (collides(board, player)) {
    player.pos.y -= 1;
    lockPiece();
  } else if (manual) {
    score += 1;
    updateHUD();
  }
  dropCounter = 0;
  draw();
}

function hardDrop() {
  if (!canControl()) return;
  let distance = 0;
  while (!collides(board, player)) {
    player.pos.y += 1;
    distance += 1;
  }
  player.pos.y -= 1;
  distance -= 1;
  score += Math.max(0, distance) * 2;
  playSound("drop");
  lockPiece();
  draw();
}

function holdPiece() {
  if (!canControl() || holdLocked) {
    if (holdLocked) showToast("HOLD MODULE LOCKED");
    return;
  }
  const outgoingType = player.type;
  if (heldType) {
    const incomingType = heldType;
    heldType = outgoingType;
    spawnPiece(incomingType, false);
  } else {
    heldType = outgoingType;
    spawnPiece(null, false);
  }
  holdLocked = true;
  playSound("hold");
  drawSideCanvases();
  draw();
}

function lockPiece() {
  merge();
  const cleared = sweepLines();
  if (cleared === 0) combo = -1;
  updateHUD();
  if (cleared > 0) {
    playSound(cleared === 4 ? "tetris" : "clear");
    showToast(cleared === 4 ? "TETRIS // +DATA BURST" : `${cleared} LINE${cleared > 1 ? "S" : ""} CLEARED`);
  } else {
    playSound("lock");
  }
  spawnPiece();
}

function sweepLines() {
  let cleared = 0;
  for (let y = ROWS - 1; y >= 0; y -= 1) {
    if (board[y].every(Boolean)) {
      board.splice(y, 1);
      board.unshift(Array(COLS).fill(null));
      cleared += 1;
      y += 1;
    }
  }
  if (cleared > 0) {
    combo += 1;
    const linePoints = [0, 100, 300, 500, 800][cleared] * level;
    const comboPoints = Math.max(0, combo) * 50 * level;
    score += linePoints + comboPoints;
    totalLines += cleared;
    level = Math.floor(totalLines / 10) + 1;
  }
  return cleared;
}

function getGhostY() {
  const ghost = {
    matrix: player.matrix,
    pos: { x: player.pos.x, y: player.pos.y },
  };
  while (!collides(board, ghost)) ghost.pos.y += 1;
  return ghost.pos.y - 1;
}

function drawBlock(ctx, x, y, size, color, alpha = 1, ghost = false) {
  ctx.save();
  ctx.globalAlpha = alpha;
  if (ghost) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(x + 3, y + 3, size - 6, size - 6);
    ctx.restore();
    return;
  }

  const gradient = ctx.createLinearGradient(x, y, x + size, y + size);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, shadeColor(color, -38));
  ctx.shadowColor = color;
  ctx.shadowBlur = Math.max(3, size * 0.24);
  ctx.fillStyle = gradient;
  ctx.fillRect(x + 1.5, y + 1.5, size - 3, size - 3);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 4, y + size - 5);
  ctx.lineTo(x + 4, y + 4);
  ctx.lineTo(x + size - 5, y + 4);
  ctx.stroke();
  ctx.fillStyle = "rgba(3,6,18,0.23)";
  ctx.fillRect(x + size * 0.36, y + size * 0.36, size * 0.3, size * 0.3);
  ctx.restore();
}

function shadeColor(hex, amount) {
  const number = Number.parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (number >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((number >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (number & 0xff) + amount));
  return `rgb(${r}, ${g}, ${b})`;
}

function drawMatrix(ctx, matrix, offset, type, size = CELL, alpha = 1, ghost = false) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) drawBlock(ctx, (x + offset.x) * size, (y + offset.y) * size, size, COLORS[type], alpha, ghost);
    });
  });
}

function drawBoardBackground() {
  gameCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
  const gradient = gameCtx.createLinearGradient(0, 0, 0, gameCanvas.height);
  gradient.addColorStop(0, "#070b1d");
  gradient.addColorStop(1, "#03050e");
  gameCtx.fillStyle = gradient;
  gameCtx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
  gameCtx.strokeStyle = "rgba(82, 244, 255, 0.055)";
  gameCtx.lineWidth = 1;
  for (let x = 0; x <= COLS; x += 1) {
    gameCtx.beginPath();
    gameCtx.moveTo(x * CELL + 0.5, 0);
    gameCtx.lineTo(x * CELL + 0.5, ROWS * CELL);
    gameCtx.stroke();
  }
  for (let y = 0; y <= ROWS; y += 1) {
    gameCtx.beginPath();
    gameCtx.moveTo(0, y * CELL + 0.5);
    gameCtx.lineTo(COLS * CELL, y * CELL + 0.5);
    gameCtx.stroke();
  }
}

function draw() {
  drawBoardBackground();
  board.forEach((row, y) => {
    row.forEach((type, x) => {
      if (type) drawBlock(gameCtx, x * CELL, y * CELL, CELL, COLORS[type]);
    });
  });
  if (running && player.matrix) {
    drawMatrix(gameCtx, player.matrix, { x: player.pos.x, y: getGhostY() }, player.type, CELL, 0.38, true);
    drawMatrix(gameCtx, player.matrix, player.pos, player.type);
  }
}

function getOccupiedBounds(matrix) {
  const cells = [];
  matrix.forEach((row, y) => row.forEach((value, x) => value && cells.push({ x, y })));
  return {
    minX: Math.min(...cells.map((cell) => cell.x)),
    maxX: Math.max(...cells.map((cell) => cell.x)),
    minY: Math.min(...cells.map((cell) => cell.y)),
    maxY: Math.max(...cells.map((cell) => cell.y)),
  };
}

function drawMiniPiece(ctx, type, centerY, size = 20) {
  const matrix = SHAPES[type];
  const bounds = getOccupiedBounds(matrix);
  const width = (bounds.maxX - bounds.minX + 1) * size;
  const height = (bounds.maxY - bounds.minY + 1) * size;
  const offset = {
    x: (ctx.canvas.width - width) / (2 * size) - bounds.minX,
    y: (centerY - height / 2) / size - bounds.minY,
  };
  drawMatrix(ctx, matrix, offset, type, size);
}

function drawSideCanvases() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  holdCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
  nextCtx.strokeStyle = "rgba(82, 244, 255, 0.09)";
  nextCtx.setLineDash([3, 5]);
  for (const y of [81, 162]) {
    nextCtx.beginPath();
    nextCtx.moveTo(12, y);
    nextCtx.lineTo(120, y);
    nextCtx.stroke();
  }
  queue.slice(0, 3).forEach((type, index) => drawMiniPiece(nextCtx, type, 40 + index * 81, 17));
  if (heldType) drawMiniPiece(holdCtx, heldType, 50, 19);
  else {
    holdCtx.fillStyle = "rgba(120, 130, 159, 0.35)";
    holdCtx.font = "9px Consolas";
    holdCtx.textAlign = "center";
    holdCtx.fillText("NO DATA", holdCanvas.width / 2, 54);
  }
}

function getDropInterval() {
  return Math.max(85, 850 - (level - 1) * 65);
}

function update(time = 0) {
  const deltaTime = time - lastTime;
  lastTime = time;
  if (running && !paused) {
    dropCounter += deltaTime;
    if (dropCounter > getDropInterval()) stepDown(false);
  }
  draw();
  animationId = requestAnimationFrame(update);
}

function startGame() {
  board = createBoard();
  queue = [];
  heldType = null;
  holdLocked = false;
  score = 0;
  totalLines = 0;
  level = 1;
  combo = -1;
  dropCounter = 0;
  gameEnded = false;
  paused = false;
  running = true;
  refillQueue();
  spawnPiece();
  ui.overlay.hidden = true;
  ui.pauseOverlay.hidden = true;
  ui.pauseButton.disabled = false;
  ui.pauseButton.textContent = "Ⅱ 暂停";
  ui.status.textContent = "SYSTEM ONLINE";
  updateHUD();
  playSound("start");
  showToast("NEURAL LINK ESTABLISHED");
}

function endGame() {
  if (gameEnded) return;
  running = false;
  gameEnded = true;
  ui.pauseButton.disabled = true;
  ui.status.textContent = "STACK OVERFLOW";
  ui.overlaySymbol.textContent = "×";
  ui.overlayEyebrow.textContent = "CONNECTION TERMINATED";
  ui.overlayTitle.textContent = "数据栈已溢出";
  ui.overlayMessage.innerHTML = "本轮运行结束，战绩已写入本地终端。";
  ui.finalScore.textContent = score.toLocaleString("zh-CN");
  ui.finalLines.textContent = String(totalLines);
  ui.finalStats.hidden = false;
  ui.startButton.querySelector("span").textContent = "再次接入";
  ui.overlay.hidden = false;
  saveRecord();
  updateRecords();
  playSound("gameover");
}

function togglePause() {
  if (!running || gameEnded) return;
  paused = !paused;
  ui.pauseOverlay.hidden = !paused;
  ui.pauseButton.textContent = paused ? "▶ 继续" : "Ⅱ 暂停";
  ui.status.textContent = paused ? "SYSTEM PAUSED" : "SYSTEM ONLINE";
  if (!paused) lastTime = performance.now();
  playSound(paused ? "pause" : "start");
}

function canControl() {
  return running && !paused && !gameEnded;
}

function updateHUD() {
  const best = Math.max(score, getRecords()[0]?.score || 0);
  ui.score.textContent = String(score).padStart(6, "0");
  ui.lines.textContent = String(totalLines).padStart(2, "0");
  ui.level.textContent = String(level).padStart(2, "0");
  ui.bestScore.textContent = String(best).padStart(6, "0");
  const levelLines = totalLines % 10;
  ui.progressText.textContent = `${levelLines} / 10`;
  ui.progressBar.style.width = `${levelLines * 10}%`;
}

function getRecords() {
  try {
    const records = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(records) ? records : [];
  } catch {
    return [];
  }
}

function saveRecord() {
  if (score <= 0) return;
  const records = getRecords();
  records.push({ score, lines: totalLines, level, date: new Date().toISOString() });
  records.sort((a, b) => b.score - a.score || b.lines - a.lines);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, 5)));
}

function updateRecords() {
  const records = getRecords();
  ui.recordList.replaceChildren();
  if (records.length === 0) {
    const empty = document.createElement("li");
    empty.className = "record-empty";
    empty.textContent = "等待首条战绩写入...";
    ui.recordList.append(empty);
  } else {
    records.forEach((record) => {
      const item = document.createElement("li");
      const scoreElement = document.createElement("strong");
      const metaElement = document.createElement("small");
      scoreElement.textContent = String(record.score).padStart(6, "0");
      const date = new Date(record.date);
      const dateText = Number.isNaN(date.getTime())
        ? "LOCAL"
        : date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
      metaElement.textContent = `L${record.level} · ${dateText}`;
      item.append(scoreElement, metaElement);
      ui.recordList.append(item);
    });
  }
  updateHUD();
}

function clearRecords() {
  if (getRecords().length === 0) return;
  if (!window.confirm("确定清除全部本地战绩吗？此操作无法撤销。")) return;
  localStorage.removeItem(STORAGE_KEY);
  updateRecords();
  showToast("LOCAL RECORDS PURGED");
  playSound("error");
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  ui.toast.textContent = message;
  ui.toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => ui.toast.classList.remove("is-visible"), 1500);
}

function ensureAudio() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioContext = new AudioContextClass();
  }
  if (audioContext?.state === "suspended") audioContext.resume();
}

function playTone(frequency, duration, type = "square", volume = 0.035, delay = 0) {
  if (!soundEnabled) return;
  ensureAudio();
  if (!audioContext) return;
  const start = audioContext.currentTime + delay;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(start);
  oscillator.stop(start + duration);
}

function playSound(name) {
  const sounds = {
    move: () => playTone(145, 0.035, "square", 0.018),
    rotate: () => playTone(260, 0.055, "triangle", 0.026),
    lock: () => playTone(95, 0.06, "square", 0.028),
    drop: () => { playTone(180, 0.05, "sawtooth", 0.025); playTone(75, 0.1, "square", 0.03, 0.045); },
    hold: () => { playTone(220, 0.06, "triangle", 0.03); playTone(330, 0.07, "triangle", 0.026, 0.05); },
    clear: () => [330, 440, 660].forEach((note, index) => playTone(note, 0.12, "triangle", 0.035, index * 0.06)),
    tetris: () => [330, 440, 550, 880].forEach((note, index) => playTone(note, 0.16, "sawtooth", 0.038, index * 0.075)),
    start: () => [180, 270, 405].forEach((note, index) => playTone(note, 0.11, "triangle", 0.03, index * 0.07)),
    pause: () => playTone(160, 0.14, "sine", 0.028),
    error: () => playTone(105, 0.1, "sawtooth", 0.025),
    gameover: () => [260, 195, 130].forEach((note, index) => playTone(note, 0.22, "sawtooth", 0.03, index * 0.13)),
  };
  sounds[name]?.();
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  localStorage.setItem(SOUND_KEY, soundEnabled ? "on" : "off");
  updateSoundUI();
  if (soundEnabled) playSound("start");
}

function updateSoundUI() {
  ui.soundButton.setAttribute("aria-pressed", String(soundEnabled));
  ui.soundButton.querySelector("small").textContent = soundEnabled ? "SFX ON" : "SFX OFF";
  ui.soundIcon.textContent = soundEnabled ? "◖))" : "◖×";
}

function runAction(action) {
  const actions = {
    left: () => movePlayer(-1),
    right: () => movePlayer(1),
    rotate: () => rotatePlayer(1),
    down: () => stepDown(true),
    drop: hardDrop,
    hold: holdPiece,
  };
  actions[action]?.();
}

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  const controlledKeys = ["arrowleft", "arrowright", "arrowup", "arrowdown", " ", "a", "d", "w", "s", "c", "p", "escape", "enter"];
  if (controlledKeys.includes(key)) event.preventDefault();

  if (key === "enter" && (!running || gameEnded)) return startGame();
  if (key === "p" || key === "escape") return togglePause();
  if (!canControl()) return;
  if (key === "arrowleft" || key === "a") movePlayer(-1);
  else if (key === "arrowright" || key === "d") movePlayer(1);
  else if (key === "arrowdown" || key === "s") stepDown(true);
  else if (key === "arrowup" || key === "w") rotatePlayer(1);
  else if (key === " ") hardDrop();
  else if (key === "c") holdPiece();
});

document.querySelectorAll("[data-action]").forEach((button) => {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    runAction(button.dataset.action);
  });
});

ui.startButton.addEventListener("click", startGame);
ui.pauseButton.addEventListener("click", togglePause);
ui.restartButton.addEventListener("click", startGame);
ui.clearRecordsButton.addEventListener("click", clearRecords);
ui.soundButton.addEventListener("click", toggleSound);
document.addEventListener("visibilitychange", () => {
  if (document.hidden && running && !paused) togglePause();
});

function initialize() {
  refillQueue();
  drawSideCanvases();
  updateRecords();
  updateSoundUI();
  draw();
  cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(update);
}

initialize();
