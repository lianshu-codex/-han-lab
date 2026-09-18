(function () {
  "use strict";

  var SIZE = 4;
  var STORAGE_KEY = "neon-triad-state-v1";
  var BEST_KEY = "neon-triad-best-v1";
  var board = [];
  var score = 0;
  var best = Number(localStorage.getItem(BEST_KEY)) || 0;
  var nextValue = randomIncomingValue();
  var gameOver = false;
  var touchStart = null;

  var gridEl = document.getElementById("grid");
  var scoreEl = document.getElementById("score");
  var bestEl = document.getElementById("best-score");
  var nextEl = document.getElementById("next-value");
  var messageEl = document.getElementById("game-message");
  var gameWrap = document.getElementById("game-wrap");

  function emptyBoard() {
    return Array.from({ length: SIZE }, function () {
      return Array.from({ length: SIZE }, function () { return null; });
    });
  }

  function randomIncomingValue() {
    var roll = Math.random();
    return roll < 0.42 ? 1 : roll < 0.84 ? 2 : 3;
  }

  function compatible(a, b) {
    return (a === 1 && b === 2) || (a === 2 && b === 1) || (a >= 3 && a === b);
  }

  function newTile(value) {
    return { value: value, id: Math.random().toString(36).slice(2), merged: false, born: true };
  }

  function createInitialBoard() {
    board = emptyBoard();
    var cells = [];
    for (var y = 0; y < SIZE; y++) {
      for (var x = 0; x < SIZE; x++) cells.push({ x: x, y: y });
    }
    shuffle(cells);
    for (var i = 0; i < 9; i++) {
      var cell = cells[i];
      board[cell.y][cell.x] = newTile(randomIncomingValue());
    }
  }

  function shuffle(items) {
    for (var i = items.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = items[i]; items[i] = items[j]; items[j] = temp;
    }
  }

  function load() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || !saved.board || saved.board.length !== SIZE) return false;
      board = saved.board;
      score = saved.score || 0;
      nextValue = saved.nextValue || randomIncomingValue();
      gameOver = !!saved.gameOver;
      return true;
    } catch (error) {
      return false;
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ board: board, score: score, nextValue: nextValue, gameOver: gameOver }));
    if (score > best) {
      best = score;
      localStorage.setItem(BEST_KEY, String(best));
    }
  }

  function render() {
    gridEl.innerHTML = "";
    for (var y = 0; y < SIZE; y++) {
      for (var x = 0; x < SIZE; x++) {
        var cell = document.createElement("div");
        cell.className = "cell";
        cell.setAttribute("role", "gridcell");
        var tile = board[y][x];
        if (tile) {
          var tileEl = document.createElement("div");
          tileEl.className = "tile v" + tile.value + (tile.merged ? " is-merged" : "");
          tileEl.textContent = tile.value;
          cell.appendChild(tileEl);
          tile.born = false;
          tile.merged = false;
        }
        gridEl.appendChild(cell);
      }
    }
    scoreEl.textContent = score;
    bestEl.textContent = Math.max(best, score);
    nextEl.textContent = nextValue;
    nextEl.className = "next-value v" + nextValue;
    messageEl.hidden = !gameOver;
  }

  function directions(direction) {
    var map = { up: { x: 0, y: -1 }, right: { x: 1, y: 0 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 } };
    return map[direction];
  }

  function orderedCells(vector) {
    var cells = [];
    var xs = [0, 1, 2, 3];
    var ys = [0, 1, 2, 3];
    if (vector.x === 1) xs.reverse();
    if (vector.y === 1) ys.reverse();
    ys.forEach(function (y) { xs.forEach(function (x) { cells.push({ x: x, y: y }); }); });
    return cells;
  }

  function move(direction) {
    if (gameOver) return;
    var vector = directions(direction);
    if (!vector) return;
    var moved = false;
    var cells = orderedCells(vector);

    board.forEach(function (row) { row.forEach(function (tile) { if (tile) tile.merged = false; }); });
    cells.forEach(function (cell) {
      var tile = board[cell.y][cell.x];
      if (!tile) return;
      var nx = cell.x + vector.x;
      var ny = cell.y + vector.y;
      if (nx < 0 || nx >= SIZE || ny < 0 || ny >= SIZE) return;
      var target = board[ny][nx];
      if (!target) {
        board[ny][nx] = tile;
        board[cell.y][cell.x] = null;
        moved = true;
      } else if (!target.merged && compatible(tile.value, target.value)) {
        var value = tile.value < 3 || target.value < 3 ? 3 : tile.value * 2;
        board[ny][nx] = newTile(value);
        board[ny][nx].merged = true;
        board[cell.y][cell.x] = null;
        score += value;
        moved = true;
      }
    });

    if (!moved) return;
    addIncomingTile(direction);
    gameOver = !movesAvailable();
    save();
    render();
  }

  function addIncomingTile(direction) {
    var candidates = [];
    var i;
    if (direction === "left") for (i = 0; i < SIZE; i++) candidates.push({ x: SIZE - 1, y: i });
    if (direction === "right") for (i = 0; i < SIZE; i++) candidates.push({ x: 0, y: i });
    if (direction === "up") for (i = 0; i < SIZE; i++) candidates.push({ x: i, y: SIZE - 1 });
    if (direction === "down") for (i = 0; i < SIZE; i++) candidates.push({ x: i, y: 0 });
    candidates = candidates.filter(function (cell) { return !board[cell.y][cell.x]; });
    if (!candidates.length) {
      for (var y = 0; y < SIZE; y++) for (var x = 0; x < SIZE; x++) if (!board[y][x]) candidates.push({ x: x, y: y });
    }
    if (candidates.length) {
      var cell = candidates[Math.floor(Math.random() * candidates.length)];
      board[cell.y][cell.x] = newTile(nextValue);
      nextValue = randomIncomingValue();
    }
  }

  function movesAvailable() {
    for (var y = 0; y < SIZE; y++) {
      for (var x = 0; x < SIZE; x++) {
        var tile = board[y][x];
        if (!tile) return true;
        var neighbours = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
        for (var i = 0; i < neighbours.length; i++) {
          var nx = neighbours[i][0], ny = neighbours[i][1];
          if (nx >= 0 && nx < SIZE && ny >= 0 && ny < SIZE && board[ny][nx] && compatible(tile.value, board[ny][nx].value)) return true;
        }
      }
    }
    return false;
  }

  function newGame() {
    score = 0;
    nextValue = randomIncomingValue();
    gameOver = false;
    createInitialBoard();
    save();
    render();
  }

  document.addEventListener("keydown", function (event) {
    var key = event.key.toLowerCase();
    var keyMap = { arrowup: "up", w: "up", arrowright: "right", d: "right", arrowdown: "down", s: "down", arrowleft: "left", a: "left" };
    if (keyMap[key]) {
      event.preventDefault();
      move(keyMap[key]);
    }
  });

  gameWrap.addEventListener("pointerdown", function (event) { touchStart = { x: event.clientX, y: event.clientY }; });
  gameWrap.addEventListener("pointerup", function (event) {
    if (!touchStart) return;
    var dx = event.clientX - touchStart.x;
    var dy = event.clientY - touchStart.y;
    touchStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
  });
  gameWrap.addEventListener("pointercancel", function () { touchStart = null; });
  document.getElementById("new-game").addEventListener("click", newGame);
  document.getElementById("retry").addEventListener("click", newGame);

  if (!load()) newGame(); else render();
}());
