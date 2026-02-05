const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const restartBtn = document.getElementById('restart');

const size = 20;
const tiles = canvas.width / size;
let snake, dir, food, score, speed, loop;

function reset() {
  snake = [{ x: 10, y: 10 }];
  dir = { x: 1, y: 0 };
  food = spawnFood();
  score = 0;
  speed = 120;
  scoreEl.textContent = `Score: ${score}`;
  clearInterval(loop);
  loop = setInterval(tick, speed);
}

function spawnFood() {
  while (true) {
    const f = { x: Math.floor(Math.random() * tiles), y: Math.floor(Math.random() * tiles) };
    if (!snake.some(s => s.x === f.x && s.y === f.y)) return f;
  }
}

function tick() {
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
  if (head.x < 0 || head.y < 0 || head.x >= tiles || head.y >= tiles) return gameOver();
  if (snake.some(s => s.x === head.x && s.y === head.y)) return gameOver();
  snake.unshift(head);
  if (head.x === food.x && head.y === food.y) {
    score += 10;
    scoreEl.textContent = `Score: ${score}`;
    food = spawnFood();
    if (speed > 50) { speed -= 5; clearInterval(loop); loop = setInterval(tick, speed); }
  } else {
    snake.pop();
  }
  draw();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#2bff88';
  snake.forEach(s => ctx.fillRect(s.x * size, s.y * size, size - 1, size - 1));
  ctx.fillStyle = '#ff4d4d';
  ctx.fillRect(food.x * size, food.y * size, size - 1, size - 1);
}

function gameOver() {
  clearInterval(loop);
  ctx.fillStyle = 'rgba(0,0,0,.6)';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = '#fff';
  ctx.font = '20px system-ui';
  ctx.fillText('Game Over', 140, 210);
}

window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if ((k === 'arrowup' || k === 'w') && dir.y !== 1) dir = { x: 0, y: -1 };
  if ((k === 'arrowdown' || k === 's') && dir.y !== -1) dir = { x: 0, y: 1 };
  if ((k === 'arrowleft' || k === 'a') && dir.x !== 1) dir = { x: -1, y: 0 };
  if ((k === 'arrowright' || k === 'd') && dir.x !== -1) dir = { x: 1, y: 0 };
});

restartBtn.addEventListener('click', reset);
reset();
