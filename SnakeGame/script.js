(() => {
  "use strict";

  const STORAGE_KEY = "snake";
  const THEME_KEY = "theme";
  const GRID_SIZE = 24;
  const MAX_HISTORY = 20;
  const SNAKE_COLORS = ["#39ff14", "#00d9ff", "#b56bff"];
  const FOOD_COLORS = ["#ff4545", "#ff9f1c", "#ffe347", "#4287ff", "#ff69b4", "#f5f5f5"];
  const SPEEDS = { easy: 175, normal: 135, hard: 100 };
  const DEFAULTS = {
    best: 0, history: [], gamesPlayed: 0, totalScore: 0,
    achievements: { score100: false, survive60: false, personalBest: false },
    settings: { difficulty: "normal", snakeColor: SNAKE_COLORS[0], foodColor: FOOD_COLORS[0], sound: true }
  };

  const $ = id => document.getElementById(id);
  const canvas = $("game-canvas");
  const ctx = canvas.getContext("2d");
  const overlay = $("game-overlay");
  const toast = $("toast");
  let data = loadData();
  let snake = [];
  let food = null;
  let direction = { x: 1, y: 0 };
  let nextDirection = { x: 1, y: 0 };
  let score = 0;
  let elapsed = 0;
  let startedAt = 0;
  let elapsedBeforePause = 0;
  let lastStep = 0;
  let rafId = 0;
  let running = false;
  let paused = false;
  let gameOver = false;
  let foodEaten = 0;
  let bonusUntil = 0;
  let speedBoostUntil = 0;
  let toastTimer = 0;
  let audioContext = null;
  let pointerStart = null;

  function loadData() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!parsed || typeof parsed !== "object") return structuredCloneSafe(DEFAULTS);
      return {
        ...structuredCloneSafe(DEFAULTS), ...parsed,
        achievements: { ...DEFAULTS.achievements, ...(parsed.achievements || {}) },
        settings: { ...DEFAULTS.settings, ...(parsed.settings || {}) },
        history: Array.isArray(parsed.history) ? parsed.history.slice(0, MAX_HISTORY) : []
      };
    } catch (_) { return structuredCloneSafe(DEFAULTS); }
  }
  function structuredCloneSafe(value) { return JSON.parse(JSON.stringify(value)); }
  function saveData() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (_) { showToast("Storage is unavailable; progress may not persist."); }
  }

  function applyTheme(theme) {
    const normalized = theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = normalized;
    const dark = normalized === "dark";
    const themeIcon = $("theme-icon");
    const themeLabel = $("theme-label");
    const themeToggle = $("theme-toggle");
    if (themeIcon) themeIcon.textContent = dark ? "☀" : "☾";
    if (themeLabel) themeLabel.textContent = dark ? "Light mode" : "Dark mode";
    if (themeToggle) {
      themeToggle.setAttribute("aria-pressed", String(dark));
      themeToggle.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    }
    try { localStorage.setItem(THEME_KEY, normalized); } catch (_) {}
    drawBoard();
  }

  function applySettingsToControls() {
    $("difficulty-select").value = data.settings.difficulty;
    $("snake-color-select").value = data.settings.snakeColor;
    $("food-color-select").value = data.settings.foodColor;
    updateSoundButton();
  }
  function updateSoundButton() {
    $("sound-toggle").setAttribute("aria-pressed", String(data.settings.sound));
    $("sound-label").textContent = data.settings.sound ? "On" : "Off";
  }

  function spawnFood() {
    const occupied = new Set(snake.map(part => `${part.x},${part.y}`));
    let point;
    do {
      point = { x: Math.floor(Math.random() * GRID_SIZE), y: Math.floor(Math.random() * GRID_SIZE) };
    } while (occupied.has(`${point.x},${point.y}`));
    const roll = Math.random();
    const type = roll < 0.12 ? "bonus" : roll < 0.25 ? "speed" : "regular";
    food = { ...point, type, expiresAt: type === "regular" ? 0 : performance.now() + (type === "bonus" ? 6500 : 7000) };
  }

  function resetRound() {
    const mid = Math.floor(GRID_SIZE / 2);
    snake = [{ x: mid, y: mid }, { x: mid - 1, y: mid }, { x: mid - 2, y: mid }];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    score = 0;
    elapsed = 0;
    elapsedBeforePause = 0;
    foodEaten = 0;
    bonusUntil = 0;
    speedBoostUntil = 0;
    spawnFood();
    updateStats();
    drawBoard();
  }

  function startGame() {
    if (running && paused) { resumeGame(); return; }
    if (running) return;
    resetRound();
    running = true; paused = false; gameOver = false;
    startedAt = performance.now();
    lastStep = startedAt;
    overlay.classList.add("is-hidden");
    $("game-status").textContent = "Playing";
    $("start-btn").textContent = "▶ Playing";
    $("pause-btn").disabled = false;
    $("pause-btn").textContent = "Ⅱ Pause";
    $("main-action").textContent = "▶ Play game";
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
  }

  function pauseGame() {
    if (!running || paused) return;
    elapsedBeforePause = getElapsed();
    paused = true;
    cancelAnimationFrame(rafId);
    showOverlay("Ⅱ", "Game paused", "Take a breather. Your current score is safe.", "▶ Resume game");
    $("game-status").textContent = "Paused";
    $("pause-btn").textContent = "▶ Resume";
    $("start-btn").textContent = "▶ Resume game";
  }
  function resumeGame() {
    if (!running || !paused) return;
    paused = false;
    startedAt = performance.now() - elapsedBeforePause * 1000;
    lastStep = performance.now();
    overlay.classList.add("is-hidden");
    $("game-status").textContent = "Playing";
    $("pause-btn").textContent = "Ⅱ Pause";
    $("start-btn").textContent = "▶ Playing";
    rafId = requestAnimationFrame(loop);
  }
  function restartGame() {
    cancelAnimationFrame(rafId);
    running = false; paused = false; gameOver = false;
    resetRound();
    showOverlay("🐍", "Ready when you are", "Collect food, grow longer, and avoid the walls and your tail.", "▶ Play game");
    $("game-status").textContent = "Ready to play";
    $("start-btn").textContent = "▶ Start game";
    $("pause-btn").disabled = true;
    $("pause-btn").textContent = "Ⅱ Pause";
  }

  function loop(now) {
    if (!running || paused || gameOver) return;
    elapsed = getElapsed();
    checkTimedAchievements();
    if (food && food.type !== "regular" && now >= food.expiresAt) spawnFood();
    const base = SPEEDS[data.settings.difficulty] || SPEEDS.normal;
    const level = Math.floor(score / 50) + 1;
    const levelSpeed = Math.max(55, base - (level - 1) * 7);
    const stepMs = now < speedBoostUntil ? Math.max(45, levelSpeed * 0.68) : levelSpeed;
    if (now - lastStep >= stepMs) {
      step(now);
      lastStep = now;
    }
    updateStats();
    drawBoard();
    rafId = requestAnimationFrame(loop);
  }

  function step(now) {
    direction = nextDirection;
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
    const hitWall = head.x < 0 || head.y < 0 || head.x >= GRID_SIZE || head.y >= GRID_SIZE;
    const eating = food && head.x === food.x && head.y === food.y;
    const body = eating ? snake : snake.slice(0, -1);
    const hitSelf = body.some(part => part.x === head.x && part.y === head.y);
    if (hitWall || hitSelf) { endGame(); return; }

    snake.unshift(head);
    if (eating) {
      const eaten = food;
      score += eaten.type === "bonus" ? 30 : eaten.type === "speed" ? 20 : 10;
      foodEaten += 1;
      if (eaten.type === "speed") speedBoostUntil = now + 4500;
      if (eaten.type === "bonus") bonusUntil = now + 800;
      playSound("eat");
      showToast(eaten.type === "bonus" ? "+30 bonus!" : eaten.type === "speed" ? "+20 speed food!" : "+10 points");
      checkScoreAchievements();
      spawnFood();
    } else {
      snake.pop();
    }
  }

  function setDirection(name) {
    if (!running) { startGame(); }
    if (paused || gameOver) return;
    const map = {
      up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
      left: { x: -1, y: 0 }, right: { x: 1, y: 0 }
    };
    const proposed = map[name];
    if (!proposed || (proposed.x === -direction.x && proposed.y === -direction.y)) return;
    nextDirection = proposed;
  }

  function endGame() {
    running = false; paused = false; gameOver = true;
    elapsed = getElapsed();
    cancelAnimationFrame(rafId);
    const previousBest = data.best;
    const newBest = score > previousBest;
    data.gamesPlayed += 1;
    data.totalScore += score;
    data.history.unshift({ score, date: new Date().toISOString(), result: "Lost" });
    data.history = data.history.slice(0, MAX_HISTORY);
    if (newBest) data.best = score;
    if (elapsed >= 60) unlock("survive60", "Survivor achievement unlocked!");
    if (score >= 100) unlock("score100", "Century Club achievement unlocked!");
    if (newBest && score > 0) unlock("personalBest", "New personal best!");
    saveData();
    renderProgress();
    playSound("lost");
    showOverlay("💥", newBest && score > 0 ? "New personal best!" : "Game over", `You scored ${score} point${score === 1 ? "" : "s"} in ${formatTime(elapsed)}. Give it another try!`, "↻ Play again");
    $("game-status").textContent = "Game over";
    $("start-btn").textContent = "↻ Play again";
    $("pause-btn").disabled = true;
    $("pause-btn").textContent = "Ⅱ Pause";
  }

  function checkScoreAchievements() {
    if (score >= 100) unlock("score100", "Century Club achievement unlocked!");
    if (score > data.best) unlock("personalBest", "You're beating your personal best!");
  }
  function checkTimedAchievements() {
    if (getElapsed() >= 60) unlock("survive60", "Survivor achievement unlocked!");
  }
  function unlock(key, message) {
    if (data.achievements[key]) return;
    data.achievements[key] = true;
    saveData();
    renderAchievements();
    showToast(message);
  }

  function getElapsed() {
    if (paused) return elapsedBeforePause;
    if (!running && gameOver) return elapsed;
    if (!running) return elapsed;
    return Math.max(0, (performance.now() - startedAt) / 1000);
  }
  function formatTime(seconds) {
    const total = Math.max(0, Math.floor(seconds));
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }
  function updateStats() {
    $("score-value").textContent = String(score);
    $("best-value").textContent = String(Math.max(data.best, score));
    $("time-value").textContent = formatTime(getElapsed());
    $("level-value").textContent = String(Math.floor(score / 50) + 1);
  }

  function drawBoard() {
    if (!ctx) return;
    const size = canvas.width;
    const cell = size / GRID_SIZE;
    const dark = document.documentElement.dataset.theme === "dark";
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = dark ? "#111923" : "#14202a";
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = "rgba(200, 220, 230, .075)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      const p = i * cell;
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(size, p); ctx.stroke();
    }

    if (food) {
      const foodColor = data.settings.foodColor || FOOD_COLORS[0];
      const radius = cell * (food.type === "bonus" ? .37 : .31);
      ctx.save();
      ctx.shadowBlur = food.type === "bonus" ? 22 : 13;
      ctx.shadowColor = food.type === "speed" ? "#00d9ff" : foodColor;
      ctx.fillStyle = food.type === "speed" ? "#00d9ff" : food.type === "bonus" ? "#ffbf47" : foodColor;
      ctx.beginPath();
      ctx.arc(food.x * cell + cell / 2, food.y * cell + cell / 2, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      if (food.type !== "regular") {
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${cell * .55}px system-ui`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(food.type === "bonus" ? "★" : "↯", food.x * cell + cell / 2, food.y * cell + cell / 2);
      }
    }

    snake.forEach((part, index) => {
      const inset = index === 0 ? 1.3 : 2;
      const x = part.x * cell + inset, y = part.y * cell + inset;
      const side = cell - inset * 2;
      ctx.fillStyle = data.settings.snakeColor || SNAKE_COLORS[0];
      ctx.globalAlpha = index === 0 ? 1 : Math.max(.62, 1 - index / (snake.length * 2.5));
      roundRect(ctx, x, y, side, side, cell * .22);
      ctx.fill();
      if (index === 0) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#102018";
        const eye = Math.max(2.2, cell * .11);
        const cx = x + side / 2, cy = y + side / 2;
        let eyes;
        if (direction.x !== 0) eyes = [{ x: cx + direction.x * cell * .12, y: cy - cell * .16 }, { x: cx + direction.x * cell * .12, y: cy + cell * .16 }];
        else eyes = [{ x: cx - cell * .16, y: cy + direction.y * cell * .12 }, { x: cx + cell * .16, y: cy + direction.y * cell * .12 }];
        eyes.forEach(e => { ctx.beginPath(); ctx.arc(e.x, e.y, eye, 0, Math.PI * 2); ctx.fill(); });
      }
    });
    ctx.globalAlpha = 1;
  }

  function roundRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }

  function showOverlay(icon, title, copy, action) {
    $("overlay-icon").textContent = icon;
    $("overlay-title").textContent = title;
    $("overlay-copy").textContent = copy;
    $("main-action").textContent = action;
    overlay.classList.remove("is-hidden");
  }
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
  }

  function playSound(kind) {
    if (!data.settings.sound) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      audioContext ||= new AudioCtx();
      if (audioContext.state === "suspended") audioContext.resume();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.connect(gain); gain.connect(audioContext.destination);
      const now = audioContext.currentTime;
      oscillator.type = kind === "lost" ? "sawtooth" : "sine";
      oscillator.frequency.setValueAtTime(kind === "lost" ? 260 : 620, now);
      oscillator.frequency.exponentialRampToValueAtTime(kind === "lost" ? 75 : 920, now + (kind === "lost" ? .38 : .09));
      gain.gain.setValueAtTime(.0001, now);
      gain.gain.exponentialRampToValueAtTime(kind === "lost" ? .12 : .07, now + .015);
      gain.gain.exponentialRampToValueAtTime(.0001, now + (kind === "lost" ? .42 : .12));
      oscillator.start(now); oscillator.stop(now + (kind === "lost" ? .44 : .14));
    } catch (_) { /* Audio is optional and may be blocked by the browser. */ }
  }

  function renderProgress() {
    $("best-value").textContent = String(data.best);
    $("games-value").textContent = String(data.gamesPlayed);
    $("average-value").textContent = String(data.gamesPlayed ? Math.round(data.totalScore / data.gamesPlayed) : 0);
    const list = $("history-list");
    list.replaceChildren();
    if (!data.history.length) {
      const empty = document.createElement("li");
      empty.className = "empty-list";
      empty.textContent = "Your completed games will appear here.";
      list.appendChild(empty);
    } else {
      data.history.forEach(item => {
        const li = document.createElement("li"); li.className = "history-item";
        const left = document.createElement("div");
        const scoreEl = document.createElement("span"); scoreEl.className = "history-score"; scoreEl.textContent = `${item.score} pts`;
        const date = document.createElement("small"); date.className = "history-meta";
        const parsed = new Date(item.date);
        date.textContent = Number.isNaN(parsed.getTime()) ? "Previous game" : parsed.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
        left.append(scoreEl, date);
        const result = document.createElement("span"); result.className = "history-result"; result.textContent = item.result || "Finished";
        li.append(left, result); list.appendChild(li);
      });
    }
    renderAchievements();
  }
  function renderAchievements() {
    const mapping = [
      ["score100", "achievement-100"], ["survive60", "achievement-time"], ["personalBest", "achievement-best"]
    ];
    mapping.forEach(([key, id]) => {
      const item = $(id);
      const unlocked = Boolean(data.achievements[key]);
      item.classList.toggle("unlocked", unlocked);
      item.querySelector(".achievement-state").textContent = unlocked ? "✓" : "🔒";
      item.querySelector(".achievement-state").setAttribute("aria-label", unlocked ? "Unlocked" : "Locked");
    });
  }

  const themeToggle = $("theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const current = document.documentElement.dataset.theme || "light";
      applyTheme(current === "dark" ? "light" : "dark");
    });
  }
  $("main-action").addEventListener("click", () => {
    if (running && paused) resumeGame();
    else if (!running) startGame();
  });
  $("start-btn").addEventListener("click", () => {
    if (running && paused) resumeGame();
    else if (!running) startGame();
  });
  $("pause-btn").addEventListener("click", () => paused ? resumeGame() : pauseGame());
  $("restart-btn").addEventListener("click", restartGame);
  $("sound-toggle").addEventListener("click", () => {
    data.settings.sound = !data.settings.sound;
    saveData(); updateSoundButton();
    if (data.settings.sound) playSound("eat");
  });
  $("difficulty-select").addEventListener("change", event => {
    data.settings.difficulty = event.target.value; saveData();
    showToast("Difficulty saved.");
  });
  $("snake-color-select").addEventListener("change", event => {
    data.settings.snakeColor = SNAKE_COLORS.includes(event.target.value) ? event.target.value : SNAKE_COLORS[0];
    saveData(); drawBoard();
  });
  $("food-color-select").addEventListener("change", event => {
    data.settings.foodColor = FOOD_COLORS.includes(event.target.value) ? event.target.value : FOOD_COLORS[0];
    saveData(); drawBoard();
  });
  $("clear-history-btn").addEventListener("click", () => {
    if (!data.history.length) { showToast("There is no history to clear."); return; }
    if (!window.confirm("Clear recent game history? Your highest score and achievements will be kept.")) return;
    data.history = []; data.gamesPlayed = 0; data.totalScore = 0;
    saveData(); renderProgress(); showToast("Game history cleared.");
  });
  document.querySelectorAll("[data-direction]").forEach(button => {
    button.addEventListener("click", () => setDirection(button.dataset.direction));
  });
  document.addEventListener("keydown", event => {
    const key = event.key.toLowerCase();
    const directions = { arrowup: "up", w: "up", arrowdown: "down", s: "down", arrowleft: "left", a: "left", arrowright: "right", d: "right" };
    if (directions[key]) {
      event.preventDefault();
      setDirection(directions[key]);
    } else if (event.code === "Space" && !event.repeat) {
      event.preventDefault();
      if (running) paused ? resumeGame() : pauseGame();
      else startGame();
    }
  });
  canvas.addEventListener("pointerdown", event => {
    pointerStart = { x: event.clientX, y: event.clientY };
  });
  canvas.addEventListener("pointerup", event => {
    if (!pointerStart) return;
    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;
    pointerStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    setDirection(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && running && !paused) pauseGame();
  });
  window.addEventListener("resize", () => drawBoard());

  const currentYear = $("current-year");
  if (currentYear) currentYear.textContent = String(new Date().getFullYear());
  applySettingsToControls();
  renderProgress();
  resetRound();
  try {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === "dark" || savedTheme === "light") applyTheme(savedTheme);
    else applyTheme(document.documentElement.dataset.theme || "light");
  } catch (_) { applyTheme(document.documentElement.dataset.theme || "light"); }
})();