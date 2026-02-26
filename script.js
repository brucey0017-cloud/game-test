const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const restartBtn = document.getElementById('restart');
const pauseBtn = document.getElementById('pause');
const mobileControls = document.querySelector('.mobile-controls');

const CELL = 16;
const MIN_TILES = 18;
const MAX_TILES = 34;

let tiles = 20;
let snake;
let dir;
let nextDir;
let food;
let score;
let best;
let speedMs;
let accMs;
let lastTs;
let state; // 'ready' | 'running' | 'paused' | 'gameover'

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function loadBest() {
  const v = Number(localStorage.getItem('snake_best') ?? '0');
  return Number.isFinite(v) ? v : 0;
}

function saveBest(v) {
  localStorage.setItem('snake_best', String(v));
}

function resizeCanvas() {
  const cssPx = Math.floor(Math.min(560, Math.max(320, window.innerWidth * 0.94)));
  const nextTiles = clamp(Math.floor(cssPx / CELL), MIN_TILES, MAX_TILES);
  tiles = nextTiles;
  canvas.width = tiles * CELL;
  canvas.height = tiles * CELL;
}

function setDir(d) {
  // prevent 180-degree reversals
  if (!d) return;
  if (state !== 'running' && state !== 'paused' && state !== 'ready') return;
  if (d.x === -dir.x && d.y === -dir.y) return;
  nextDir = d;
  if (state === 'ready') start();
}

function reset() {
  resizeCanvas();

  snake = [
    { x: Math.floor(tiles / 2), y: Math.floor(tiles / 2) },
    { x: Math.floor(tiles / 2) - 1, y: Math.floor(tiles / 2) },
    { x: Math.floor(tiles / 2) - 2, y: Math.floor(tiles / 2) },
  ];

  dir = { x: 1, y: 0 };
  nextDir = dir;
  food = spawnFood();
  score = 0;
  speedMs = 170;
  accMs = 0;
  lastTs = undefined;
  state = 'ready';

  scoreEl.textContent = `Score: ${score}`;
  best = loadBest();
  bestEl.textContent = `Best: ${best}`;
  pauseBtn.textContent = 'Pause';

  draw();
  drawOverlay('Tap / Click to Start');

  requestAnimationFrame(loop);
}

function start() {
  if (state === 'running') return;
  if (state === 'gameover') return reset();
  state = 'running';
  pauseBtn.textContent = 'Pause';
}

function togglePause() {
  if (state === 'ready') return start();
  if (state === 'running') {
    state = 'paused';
    pauseBtn.textContent = 'Resume';
    draw();
    drawOverlay('Paused');
    return;
  }
  if (state === 'paused') {
    state = 'running';
    pauseBtn.textContent = 'Pause';
    return;
  }
}

function spawnFood() {
  // avoid the outer border a bit so it feels fair
  while (true) {
    const f = {
      x: Math.floor(Math.random() * tiles),
      y: Math.floor(Math.random() * tiles),
    };
    if (!snake.some((s) => s.x === f.x && s.y === f.y)) return f;
  }
}

function tick() {
  dir = nextDir;
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  // wrap-around to feel nicer on small screens
  head.x = (head.x + tiles) % tiles;
  head.y = (head.y + tiles) % tiles;

  if (snake.some((s) => s.x === head.x && s.y === head.y)) return gameOver();

  snake.unshift(head);

  const ate = head.x === food.x && head.y === food.y;
  if (ate) {
    score += 10;
    scoreEl.textContent = `Score: ${score}`;

    // gentler speed curve: starts slower and scales gradually
    if (score % 50 === 0) speedMs = Math.max(90, speedMs - 6);

    food = spawnFood();
  } else {
    snake.pop();
  }

  draw();
}

function gameOver() {
  state = 'gameover';

  if (score > best) {
    best = score;
    bestEl.textContent = `Best: ${best}`;
    saveBest(best);
  }

  draw();
  drawOverlay('Game Over\nTap to Restart');
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // subtle grid
  ctx.fillStyle = '#151821';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(255,255,255,.04)';
  ctx.lineWidth = 1;

  for (let i = 0; i <= tiles; i++) {
    const p = i * CELL + 0.5;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(canvas.width, p);
    ctx.stroke();
  }

  // snake
  snake.forEach((s, idx) => {
    const x = s.x * CELL;
    const y = s.y * CELL;
    const r = idx === 0 ? 6 : 5;

    ctx.fillStyle = idx === 0 ? '#42ff9b' : '#2bff88';
    roundRect(ctx, x + 1, y + 1, CELL - 2, CELL - 2, r);
    ctx.fill();

    if (idx === 0) {
      // eyes
      ctx.fillStyle = 'rgba(0,0,0,.55)';
      const ex = x + CELL / 2 + dir.x * 4;
      const ey = y + CELL / 2 + dir.y * 4;
      ctx.beginPath();
      ctx.arc(ex - dir.y * 3, ey - dir.x * 3, 2, 0, Math.PI * 2);
      ctx.arc(ex + dir.y * 3, ey + dir.x * 3, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // food
  const fx = food.x * CELL + CELL / 2;
  const fy = food.y * CELL + CELL / 2;
  ctx.fillStyle = '#ff4d4d';
  ctx.beginPath();
  ctx.arc(fx, fy, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.25)';
  ctx.beginPath();
  ctx.arc(fx - 2, fy - 3, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawOverlay(text) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.55)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const lines = text.split('\n');
  ctx.font = '600 20px system-ui';
  const cy = canvas.height / 2;
  lines.forEach((line, i) => {
    ctx.fillText(line, canvas.width / 2, cy + (i - (lines.length - 1) / 2) * 26);
  });

  ctx.restore();
}

function loop(ts) {
  if (lastTs == null) lastTs = ts;
  const dt = ts - lastTs;
  lastTs = ts;

  if (state === 'running') {
    accMs += dt;

    // catch up with a cap to avoid spiral
    let steps = 0;
    while (accMs >= speedMs && steps < 5) {
      accMs -= speedMs;
      tick();
      steps++;
      if (state !== 'running') break;
    }
  }

  requestAnimationFrame(loop);
}

function roundRect(c, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + rr, y);
  c.arcTo(x + w, y, x + w, y + h, rr);
  c.arcTo(x + w, y + h, x, y + h, rr);
  c.arcTo(x, y + h, x, y, rr);
  c.arcTo(x, y, x + w, y, rr);
  c.closePath();
}

// Keyboard
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();

  if (k === ' ' || k === 'p') {
    e.preventDefault();
    togglePause();
    return;
  }

  if (k === 'r') {
    reset();
    return;
  }

  if (k === 'arrowup' || k === 'w') return setDir({ x: 0, y: -1 });
  if (k === 'arrowdown' || k === 's') return setDir({ x: 0, y: 1 });
  if (k === 'arrowleft' || k === 'a') return setDir({ x: -1, y: 0 });
  if (k === 'arrowright' || k === 'd') return setDir({ x: 1, y: 0 });
});

// Mouse / touch to start
canvas.addEventListener('pointerdown', () => {
  if (state === 'ready') return start();
  if (state === 'gameover') return reset();
});

// Buttons
restartBtn.addEventListener('click', reset);
pauseBtn.addEventListener('click', togglePause);

// Mobile buttons + swipe
function setupMobileControls() {
  if (!mobileControls) return;

  mobileControls.querySelectorAll('button[data-dir]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const d = btn.getAttribute('data-dir');
      if (d === 'up') setDir({ x: 0, y: -1 });
      if (d === 'down') setDir({ x: 0, y: 1 });
      if (d === 'left') setDir({ x: -1, y: 0 });
      if (d === 'right') setDir({ x: 1, y: 0 });
    });
  });

  let sx = null;
  let sy = null;

  canvas.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    sx = t.clientX;
    sy = t.clientY;
  }, { passive: true });

  canvas.addEventListener('touchmove', (e) => {
    if (sx == null || sy == null) return;
    const t = e.touches[0];
    const dx = t.clientX - sx;
    const dy = t.clientY - sy;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (Math.max(absX, absY) < 14) return;

    if (absX > absY) {
      setDir(dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 });
    } else {
      setDir(dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 });
    }

    sx = null;
    sy = null;
  }, { passive: true });
}

window.addEventListener('resize', () => {
  const prevTiles = tiles;
  resizeCanvas();
  if (tiles !== prevTiles && snake) {
    // re-center snake within bounds after resize
    snake = snake.map((s) => ({ x: s.x % tiles, y: s.y % tiles }));
    food = { x: food.x % tiles, y: food.y % tiles };
    draw();
    if (state === 'ready') drawOverlay('Tap / Click to Start');
    if (state === 'paused') drawOverlay('Paused');
    if (state === 'gameover') drawOverlay('Game Over\nTap to Restart');
  }
});

setupMobileControls();
reset();
