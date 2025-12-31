const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
let gameInterval = null;
let gameStarted = false;
const gridSize = 20;
const tileCount = canvas.width / gridSize;

let snake = [{ x: 10, y: 10 }];
let direction = { x: 1, y: 0 };
let food = spawnFood();
let score = 0;
let gameOver = false;

document.addEventListener("keydown", e => {
    switch (e.key) {
        case "w":
        if (direction.y === 0) direction = { x: 0, y: -1 };
        break;
        case "s":
        if (direction.y === 0) direction = { x: 0, y: 1 };
        break;
        case "a":
        if (direction.x === 0) direction = { x: -1, y: 0 };
        break;
        case "d":
        if (direction.x === 0) direction = { x: 1, y: 0 };
        break;
    }
    });
    document.getElementById("startBtn").onclick = () => {
    resetGame();
    startGame();
};

function startGame() {
    if (gameStarted) return;
    gameStarted = true;
    gameInterval = setInterval(update, 100);
}

function resetGame() {
    clearInterval(gameInterval);
    gameStarted = false;
    gameOver = false;
    score = 0;
    snake = [{ x: 10, y: 10 }];
    direction = { x: 1, y: 0 };
    food = spawnFood();
    document.getElementById("score").textContent = score;
    draw();
}
function spawnFood() {
    return {
        x: Math.floor(Math.random() * tileCount),
        y: Math.floor(Math.random() * tileCount)
    };
}

function update() {
    if (gameOver) return;

    let head = {
        x: snake[0].x + direction.x,
        y: snake[0].y + direction.y
    };

    // Wrap around edges
    head.x = (head.x + tileCount) % tileCount;
    head.y = (head.y + tileCount) % tileCount;

    // Self collision
    for (let part of snake) {
        if (head.x === part.x && head.y === part.y) {
        endGame();
        return;
        }
    }

    snake.unshift(head);

    // Eat food
    if (head.x === food.x && head.y === food.y) {
        score++;
        document.getElementById("score").textContent = score;
        food = spawnFood();
    } else {
        snake.pop();
    }

    draw();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Food
    ctx.fillStyle = "red";
    ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize, gridSize);

    // Snake
    ctx.fillStyle = "green";
    for (let part of snake) {
        ctx.fillRect(
        part.x * gridSize,
        part.y * gridSize,
        gridSize,
        gridSize
        );
    }
}

function endGame() {
    gameOver = true;
    alert("Game Over! Score: " + score);
}