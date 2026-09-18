function KeyboardInputManager() {
  this.events = {};
  this.godMode = false;
  this.selectedCell = null;
  this.lastGodTouchAt = 0;

  if (window.navigator.msPointerEnabled) {
    //Internet Explorer 10 style
    this.eventTouchstart    = "MSPointerDown";
    this.eventTouchmove     = "MSPointerMove";
    this.eventTouchend      = "MSPointerUp";
  } else {
    this.eventTouchstart    = "touchstart";
    this.eventTouchmove     = "touchmove";
    this.eventTouchend      = "touchend";
  }

  this.listen();
}

KeyboardInputManager.prototype.on = function (event, callback) {
  if (!this.events[event]) {
    this.events[event] = [];
  }
  this.events[event].push(callback);
};

KeyboardInputManager.prototype.emit = function (event, data) {
  var callbacks = this.events[event];
  if (callbacks) {
    callbacks.forEach(function (callback) {
      callback(data);
    });
  }
};

KeyboardInputManager.prototype.listen = function () {
  var self = this;

  var map = {
    38: 0, // Up
    39: 1, // Right
    40: 2, // Down
    37: 3, // Left
    75: 0, // Vim up
    76: 1, // Vim right
    74: 2, // Vim down
    72: 3, // Vim left
    87: 0, // W
    68: 1, // D
    83: 2, // S
    65: 3  // A
  };

  // Respond to direction keys
  document.addEventListener("keydown", function (event) {
    var modifiers = event.altKey || event.ctrlKey || event.metaKey ||
                    event.shiftKey;
    var mapped    = map[event.which];

    if (!modifiers) {
      if (mapped !== undefined) {
        event.preventDefault();
        self.emit("move", mapped);
      }
    }

    // R key restarts the game
    if (!modifiers && event.which === 82) {
      self.restart.call(self, event);
    }
  });

  // Respond to button presses
  this.bindButtonPress(".retry-button", this.restart);
  this.bindButtonPress(".restart-button", this.restart);
  this.bindButtonPress(".keep-playing-button", this.keepPlaying);
  this.bindButtonPress(".cheat-button", this.toggleGodMode);

  var cheatButton = document.querySelector(".cheat-button");
  var cheatStatus = document.querySelector(".cheat-status");

  // Respond to swipe events
  var touchStartClientX, touchStartClientY;
  var gameContainer = document.getElementsByClassName("game-container")[0];

  gameContainer.addEventListener("click", function (event) {
    if (Date.now() - self.lastGodTouchAt < 700) return;
    self.handleGodHandClick(event.target, gameContainer);
  });

  gameContainer.addEventListener(this.eventTouchstart, function (event) {
    if ((!window.navigator.msPointerEnabled && event.touches.length > 1) ||
        event.targetTouches.length > 1) {
      return; // Ignore if touching with more than 1 finger
    }

    if (window.navigator.msPointerEnabled) {
      touchStartClientX = event.pageX;
      touchStartClientY = event.pageY;
    } else {
      touchStartClientX = event.touches[0].clientX;
      touchStartClientY = event.touches[0].clientY;
    }

    event.preventDefault();
  });

  gameContainer.addEventListener(this.eventTouchmove, function (event) {
    event.preventDefault();
  });

  gameContainer.addEventListener(this.eventTouchend, function (event) {
    if ((!window.navigator.msPointerEnabled && event.touches.length > 0) ||
        event.targetTouches.length > 0) {
      return; // Ignore if still touching with one or more fingers
    }

    var touchEndClientX, touchEndClientY;

    if (window.navigator.msPointerEnabled) {
      touchEndClientX = event.pageX;
      touchEndClientY = event.pageY;
    } else {
      touchEndClientX = event.changedTouches[0].clientX;
      touchEndClientY = event.changedTouches[0].clientY;
    }

    var dx = touchEndClientX - touchStartClientX;
    var absDx = Math.abs(dx);

    var dy = touchEndClientY - touchStartClientY;
    var absDy = Math.abs(dy);

    if (Math.max(absDx, absDy) > 10) {
      // (right : left) : (down : up)
      self.emit("move", absDx > absDy ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
    } else {
      self.lastGodTouchAt = Date.now();
      self.handleGodHandClick(event.target, gameContainer);
    }
  });

  this.cheatButton = cheatButton;
  this.cheatStatus = cheatStatus;
};

KeyboardInputManager.prototype.restart = function (event) {
  event.preventDefault();
  this.emit("restart");
};

KeyboardInputManager.prototype.keepPlaying = function (event) {
  event.preventDefault();
  this.emit("keepPlaying");
};

KeyboardInputManager.prototype.toggleGodMode = function (event) {
  event.preventDefault();
  this.godMode = !this.godMode;
  this.selectedCell = null;
  this.clearSelectedTile();

  this.cheatButton.textContent = this.godMode ? "上帝之手：开启" : "上帝之手：关闭";
  var gameContainer = document.querySelector(".game-container");
  if (this.godMode) {
    gameContainer.classList.add("god-mode");
  } else {
    gameContainer.classList.remove("god-mode");
  }
  this.showGodStatus(this.godMode ? "点击方块，再点击空格或相同数字" : "已关闭，恢复普通操作", false);
};

KeyboardInputManager.prototype.handleGodHandClick = function (target, container) {
  if (!this.godMode) return;

  var cell = this.getCellFromElement(target, container);
  if (!cell) return;

  if (!this.selectedCell) {
    if (!this.isTileElement(target, container)) {
      this.showGodStatus("先点击一个数字方块", true);
      return;
    }
    this.selectedCell = cell;
    this.clearSelectedTile();
    this.getTileElement(target, container).classList.add("tile-selected");
    this.showGodStatus("已选中，请点目标格", false);
    return;
  }

  if (this.selectedCell.x === cell.x && this.selectedCell.y === cell.y) {
    this.selectedCell = null;
    this.clearSelectedTile();
    this.showGodStatus("已取消选择", false);
    return;
  }

  var move = { source: this.selectedCell, target: cell };
  this.selectedCell = null;
  this.clearSelectedTile();
  this.emit("manualMove", move);
};

KeyboardInputManager.prototype.getCellFromElement = function (element, container) {
  while (element && element !== container) {
    if (element.getAttribute && element.getAttribute("data-x") !== null) {
      return { x: parseInt(element.getAttribute("data-x"), 10), y: parseInt(element.getAttribute("data-y"), 10) };
    }
    element = element.parentNode;
  }
  return null;
};

KeyboardInputManager.prototype.getTileElement = function (element, container) {
  while (element && element !== container) {
    if ((" " + element.className + " ").indexOf(" tile ") > -1) return element;
    element = element.parentNode;
  }
  return null;
};

KeyboardInputManager.prototype.isTileElement = function (element, container) {
  return !!this.getTileElement(element, container);
};

KeyboardInputManager.prototype.clearSelectedTile = function () {
  var selected = document.querySelector(".tile-selected");
  if (selected) selected.classList.remove("tile-selected");
};

KeyboardInputManager.prototype.showGodStatus = function (message, isError) {
  this.cheatStatus.textContent = message;
  this.cheatStatus.classList.toggle("is-error", isError);
};

KeyboardInputManager.prototype.bindButtonPress = function (selector, fn) {
  var button = document.querySelector(selector);
  button.addEventListener("click", fn.bind(this));
  button.addEventListener(this.eventTouchend, fn.bind(this));
};
