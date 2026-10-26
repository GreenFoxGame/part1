// ============================================
// ГЛАВНЫЙ ФАЙЛ
// ============================================

let gameState = 'start';
let lastSerpDirection = null;
let playerId = "-";

let pressTimer = null;
let isLongPress = false;

// ============================================
// НАСТРОЙКИ СТАТИСТИКИ
// ============================================
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbynOFQuN-5nErDnrPgd41nOVDA33qLVCTZmwPZ_tdh5wNqNR0DH9LrB7W5vz4lQNPgCzw/exec';

let stats = {};

function loadStats() {
  try {
    const saved = localStorage.getItem('pumpkin_player_stats');
    if (saved) {
      stats = JSON.parse(saved);
    } else {
      stats = {};
    }
  } catch (e) {
    stats = {};
  }
}

function saveStats() {
  try {
    localStorage.setItem('pumpkin_player_stats', JSON.stringify(stats));
  } catch (e) {
    console.warn("Не удалось сохранить статистику", e);
  }
}

function getPlayerRecord(id) {
  if (!stats[id]) {
    stats[id] = { games: 0, maxScore: 0 };
  }
  return stats[id];
}

function updateStats(id, score) {
  const record = getPlayerRecord(id);
  record.games += 1;
  if (score > record.maxScore) {
    record.maxScore = score;
  }
  saveStats();
  return record;
}

loadStats();

// ============================================
// ЗАГЛУШКА ДЛЯ СТАРЫХ ВЫЗОВОВ gameOver()
// ============================================
function gameOver() {
  if (typeof window.showGameOver === 'function') {
    window.showGameOver();
  } else {
    console.error("showGameOver ещё не загружен");
  }
}

// ============================================
// ПОПАП
// ============================================
function showTooltip(title, desc) {
  const tt = document.getElementById('tooltip');
  document.getElementById('tt-title').textContent = title;
  document.getElementById('tt-desc').innerHTML = desc;
  tt.classList.add('active');
}

function hideTooltip() {
  document.getElementById('tooltip').classList.remove('active');
  isLongPress = false;
}

document.getElementById('tt-close-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  hideTooltip();
});

// ============================================
// СТАРТОВЫЙ ЭКРАН
// ============================================
document.getElementById('start-btn').addEventListener('click', () => {
  const input = document.getElementById('player-id-input');
  const val = input.value.trim();

  if (!val) {
    alert("Пожалуйста, введите номер!");
    return;
  }

  playerId = val;
  document.getElementById('start-modal').classList.remove('active');
  gameState = 'playing';

  startGame();
});

// ============================================
// ЭКРАН ПОРАЖЕНИЯ
// ============================================
document.getElementById('restart-btn').addEventListener('click', () => {
  document.getElementById('gameover-modal').classList.remove('active');
  document.getElementById('start-modal').classList.add('active');
  document.getElementById('player-id-input').value = playerId;
  gameState = 'start';
});

// ============================================
// ПОКАЗ ОКНА ПОРАЖЕНИЯ (СНАЧАЛА ОКНО, ПОТОМ ОТПРАВКА)
// ============================================
window.showGameOver = function() {
  gameState = 'gameover';

  const record = updateStats(playerId, player.score);

  document.getElementById('final-player-id').textContent = playerId;
  document.getElementById('final-score').textContent = player.score;
  document.getElementById('final-max-score').textContent = record.maxScore;
  document.getElementById('final-games').textContent = record.games;

  document.getElementById('gameover-modal').classList.add('active');

  sendToGoogleSheets(playerId, player.score, record.games, record.maxScore);
};

// ============================================
// ОТПРАВКА В GOOGLE ТАБЛИЦУ
// ============================================
function sendToGoogleSheets(id, score, games, maxScore) {
  if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('ВСТАВЬ_СЮДА')) {
    console.warn("Google Script URL не настроен. Данные не отправлены.");
    return;
  }

  const formData = new FormData();
  formData.append('playerId', id);
  formData.append('score', score);
  formData.append('games', games);
  formData.append('maxScore', maxScore);

  fetch(GOOGLE_SCRIPT_URL, {
    method: 'POST',
    body: formData
  })
  .then(response => response.json())
  .then(data => {
    console.log('Успешно отправлено в Google Таблицу:', data);
  })
  .catch(error => {
    console.error('Ошибка отправки:', error);
  });
}

// ============================================
// ФУНКЦИЯ ПОКАЗА ПОПАПА (КРАТКИЕ ОПИСАНИЯ)
// ============================================
function buildAndShowTooltip(x, y) {
  let title = "Пусто";
  let desc = "Здесь ничего нет.";

  if (player.x === x && player.y === y) {
    title = "Лисёнок";
    desc = `Здоровье: ${player.hp}/${CONFIG.PLAYER_MAX_HP}<br>Оружие: ${player.weapon ? CONFIG.WEAPONS[player.weapon.type].name + ' (' + player.weapon.hp + ' HP)' : 'нет'}<br>Тыковок: ${player.score}`;
  } else {
    const cell = getCell(x, y);
    if (cell && cell.entity) {
      const e = cell.entity;

      if (e.kind === 'enemy') {
        const cfg = CONFIG.ENEMIES[e.type];
        title = cfg.name;
        desc = `Здоровье: ${e.hp}<br>`;

        if (e.type === 'raven' || e.type === 'rat') desc += "Просто стоит и ничего не делает.";
        if (e.type === 'rotten_pumpkin') desc += `Взорвётся через ${e.timer} ходов.`;
        if (e.type === 'reaper') desc += "Атакует издалека.";
        if (e.type === 'evil_pumpkin') desc += "Крепкая тыква. Уязвима для тяпки (x2 урон).";
        if (e.type === 'scarecrow' || e.type === 'sunflower') desc += "Можно поджечь факелом. Даёт золотую тыковку.";
        if (e.type === 'golem') desc += "Ломает полезные тыковки рядом. Уязвим для тяпки (x2 урон).";
        if (e.type === 'big_evil_pumpkin') desc += "После смерти превращается в злую тыкву.";

      } else if (e.kind === 'weapon') {
        title = CONFIG.WEAPONS[e.type].name;
        desc = `Прочность: ${e.hp} HP<br>Урон равен текущей прочности.`;
        if (e.type === 'tyapka') desc += "<br>Наносит двойной урон по тыквенным монстрам.";
        if (e.type === 'serp') desc += "<br>Атакует всех врагов на линии.";
        if (e.type === 'semena') desc += "<br>Стреляет по любой клетке. 1 выстрел = 1 урон.";

      } else if (e.kind === 'food') {
        title = e.type === 'pie' ? 'Пирог' : 'Кекс';
        desc = e.type === 'pie' ? "Восстанавливает +5 HP." : "Восстанавливает +2 HP.";

      } else if (e.kind === 'torch') {
        title = "Факел";
        desc = `Прочность: ${e.hp}<br>Крутится каждый ход. Обжигает того, кто окажется в направлении пламени.`;

      } else if (e.kind === 'pumpkin') {
        title = "Тыковка";
        desc = "Даёт +1 к счётчику.";

      } else if (e.kind === 'golden') {
        title = "Золотая тыковка";
        desc = "Даёт +3 к счётчику.";
      }
    }
  }

  showTooltip(title, desc);
  try {
    if (navigator.vibrate) navigator.vibrate(50);
  } catch (err) {}
}

// ============================================
// ПЕРЕХВАТ ДОЛГОГО НАЖАТИЯ
// ============================================
function attachLongPressHandlers() {
  const slots = document.querySelectorAll('.click-slot');

  slots.forEach((slot, index) => {
    const x = index % 3;
    const y = Math.floor(index / 3);

    const onStart = (e) => {
      if (gameState !== 'playing') return;
      const tt = document.getElementById('tooltip');
      if (tt.classList.contains('active')) return;

      isLongPress = false;
      pressTimer = setTimeout(() => {
        isLongPress = true;
        buildAndShowTooltip(x, y);
      }, 500);
    };

    const onEnd = (e) => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }

      const tt = document.getElementById('tooltip');
      if (isLongPress || tt.classList.contains('active')) {
        e.stopPropagation();
        e.preventDefault();
      }
      isLongPress = false;
    };

    const onCancel = () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
      isLongPress = false;
    };

    slot.addEventListener('mousedown', onStart);
    slot.addEventListener('touchstart', onStart, { passive: false });
    slot.addEventListener('mouseup', onEnd);
    slot.addEventListener('touchend', onEnd);
    slot.addEventListener('mouseleave', onCancel);
    slot.addEventListener('touchcancel', onCancel);
  });
}

// ============================================
// ИГРОВАЯ ЛОГИКА
// ============================================
function onCellClick(x, y) {
  if (gameState !== 'playing') return;
  if (x < 0 || y < 0 || x >= CONFIG.FIELD_SIZE || y >= CONFIG.FIELD_SIZE) return;

  const cell = getCell(x, y);
  if (!cell) return;
  if (x === player.x && y === player.y) return;

  const dx = x - player.x;
  const dy = y - player.y;
  const isAdjacent = (Math.abs(dx) + Math.abs(dy) === 1);
  const targetEntity = cell.entity;

  if (player.weapon && player.weapon.type === 'semena') {
    if (targetEntity && targetEntity.kind === 'enemy' && !isAdjacent) {
      const enemyId = targetEntity.id;
      attackWithSeeds(targetEntity);
      animateHitById(enemyId, 'enemy');
      setTimeout(() => {
        if (gameState !== 'playing') return;
        render();
        setTimeout(() => {
          if (gameState !== 'playing') return;
          endPlayerTurn();
        }, 350);
      }, 300);
      return;
    }
  }

  if (!isAdjacent) return;

  const direction = dx === -1 ? 'left' : dx === 1 ? 'right' : dy === -1 ? 'up' : 'down';
  const oldX = player.x;
  const oldY = player.y;

  if (targetEntity && targetEntity.kind === 'enemy') {
    if (player.weapon && player.weapon.type === 'serp') {
      lastSerpDirection = direction;
      const targetIds = getEnemiesOnLine(direction).map(e => e.id);
      attackWithSerp(targetEntity);
      for (const id of targetIds) animateHitById(id, 'enemy');
      setTimeout(() => {
        if (gameState !== 'playing') return;
        render();
        setTimeout(() => {
          if (gameState !== 'playing') return;
          endPlayerTurn();
        }, 350);
      }, 300);
      return;
    }

    const enemyId = targetEntity.id;
    const result = attackEnemy(targetEntity);
    animateHitById(enemyId, 'enemy');

    if (result.shouldMove === true) {
      player.x = x;
      player.y = y;
      shiftLine(direction, oldX, oldY);
      pickupOnCell(getCell(player.x, player.y));
    }

    setTimeout(() => {
      if (gameState !== 'playing') return;
      render();
      setTimeout(() => {
        if (gameState !== 'playing') return;
        endPlayerTurn();
      }, 350);
    }, 300);
    return;
  }

  if (targetEntity && targetEntity.kind === 'torch') {
    playerHitX = oldX;
    playerHitY = oldY;
    torchTrapOnEnter(cell);
    if (gameState !== 'playing') return;

    cell.entity = null;
    cell.type = 'empty';

    player.x = x;
    player.y = y;
    shiftLine(direction, oldX, oldY);
    render();

    if (gameState !== 'playing') return;

    setTimeout(() => {
      if (gameState !== 'playing') return;
      endPlayerTurn();
    }, 350);
    return;
  }

  if (targetEntity) {
    if (targetEntity.kind === 'empty') {
      cell.entity = null;
      cell.type = 'empty';
    } else {
      pickupEntity(targetEntity);
      cell.entity = null;
      cell.type = 'empty';
    }
    if (gameState !== 'playing') return;
  }

  player.x = x;
  player.y = y;
  shiftLine(direction, oldX, oldY);
  render();

  if (gameState !== 'playing') return;

  setTimeout(() => {
    if (gameState !== 'playing') return;
    endPlayerTurn();
  }, 350);
}

function getEnemiesOnLine(direction) {
  const enemies = [];
  let cx = player.x;
  let cy = player.y;
  while (true) {
    if (direction === 'left') cx -= 1;
    if (direction === 'right') cx += 1;
    if (direction === 'up') cy -= 1;
    if (direction === 'down') cy += 1;
    if (cx < 0 || cy < 0 || cx >= CONFIG.FIELD_SIZE || cy >= CONFIG.FIELD_SIZE) break;
    const cell = getCell(cx, cy);
    if (cell && cell.entity && cell.entity.kind === 'enemy') enemies.push(cell.entity);
  }
  return enemies;
}

function pickupEntity(e) {
  if (!e) return;
  if (e.kind === 'pumpkin') {
    player.score += e.value || 1;
    log(`🎃 Тыковка! +${e.value || 1}. Всего: ${player.score}`);
  } else if (e.kind === 'golden') {
    player.score += e.value || 3;
    log(`🌟 Золотая тыковка! +${e.value || 3}. Всего: ${player.score}`);
  } else if (e.kind === 'weapon') {
    playerPickupWeapon(e);
  } else if (e.kind === 'food') {
    playerHeal(e.heal);
  }
}

function pickupOnCell(cell) {
  if (!cell || !cell.entity) return;
  const e = cell.entity;
  if (e.kind === 'pumpkin' || e.kind === 'golden' || e.kind === 'weapon' || e.kind === 'food') {
    pickupEntity(e);
    cell.entity = null;
    cell.type = 'empty';
  }
}

// ============================================
// СТАРТ ИГРЫ
// ============================================
function startGame() {
  initField();
  initPlayer();
  lastSerpDirection = null;
  document.getElementById('log').innerHTML = '';
  fillAllCells();

  fieldInitialized = false;
  initFieldDOM();
  render();

  setTimeout(attachLongPressHandlers, 100);
}