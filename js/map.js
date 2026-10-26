// ============================================
// ПОЛЕ 3×3
// ============================================

let FIELD = [];
let gameTurn = 0;
let nextEntityId = 1;
let lastShiftDirection = null;

let guaranteedQueue = [];
let forceGuaranteedNextSpawn = false;
let skipNextSpawnAnimation = false;

function newEntityId() {
  return 'e_' + (nextEntityId++);
}

function initField() {
  FIELD = [];
  gameTurn = 0;
  nextEntityId = 1;
  lastShiftDirection = null;
  guaranteedQueue = [];
  forceGuaranteedNextSpawn = false;
  skipNextSpawnAnimation = false;
  for (let y = 0; y < CONFIG.FIELD_SIZE; y++) {
    FIELD[y] = [];
    for (let x = 0; x < CONFIG.FIELD_SIZE; x++) {
      FIELD[y][x] = { x, y, entity: null, type: 'empty' };
    }
  }
}

function getCell(x, y) {
  if (x < 0 || y < 0 || x >= CONFIG.FIELD_SIZE || y >= CONFIG.FIELD_SIZE) return null;
  return FIELD[y][x];
}

// ============================================
// БЕЗОПАСНЫЙ РАНДОМ
// ============================================
function safeRandomHp(min, max) {
  if (min === undefined || max === undefined) return 1;
  if (isNaN(min) || isNaN(max)) return 1;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ============================================
// СОЗДАТЬ СЛУЧАЙНУЮ СУЩНОСТЬ (ГАРАНТ УВАЖАЕТ ЛИМИТ)
// ============================================
function createRandomEntity() {
  const weights = getSpawnWeights();
  const type = weightedRandom(weights);

  if (!type) return createEntityByType('pumpkin');

  const isEnemy = CONFIG.ENEMIES[type] !== undefined;
  const currentEnemies = countEnemies();

  if (isEnemy && forceGuaranteedNextSpawn) {
    forceGuaranteedNextSpawn = false;

    // Если врагов уже максимум — не спавним гаранта, вместо него даём тыковку
    if (currentEnemies >= CONFIG.MAX_ENEMIES_ON_FIELD) {
      return createEntityByType('pumpkin');
    }

    const guaranteedType = getGuaranteedEnemyType();
    if (guaranteedType) {
      log(`⚠️ Гарантированный спавн: ${CONFIG.ENEMIES[guaranteedType].name}`);
      return createEntityByType(guaranteedType);
    }
  }

  return createEntityByType(type);
}

// ============================================
// СОЗДАТЬ СУЩНОСТЬ ПО ТИПУ (СТРОГИЙ ЛИМИТ)
// ============================================
function createEntityByType(type) {
  if (!type) type = 'pumpkin';

  // Оружие
  if (CONFIG.WEAPONS && CONFIG.WEAPONS[type]) {
    let hp = getWeaponHp(type);
    if (isNaN(hp) || !hp) hp = CONFIG.WEAPONS[type].hp;
    return {
      id: newEntityId(),
      kind: 'weapon', type,
      hp: hp,
      maxHp: hp
    };
  }

  // Враги
  if (CONFIG.ENEMIES && CONFIG.ENEMIES[type]) {
    const e = CONFIG.ENEMIES[type];
    const hp = safeRandomHp(e.hpMin, e.hpMax);

    // СТРОГИЙ ЛИМИТ: если врагов уже 4 — вообще не спавним врага
    const currentEnemies = countEnemies();
    if (currentEnemies >= CONFIG.MAX_ENEMIES_ON_FIELD) {
      return {
        id: newEntityId(),
        kind: 'pumpkin',
        value: 1
      };
    }

    return {
      id: newEntityId(),
      kind: 'enemy', type,
      hp: hp, maxHp: hp,
      behavior: e.behavior || 'static',
      timer: e.timer || 0,
      burning: false
    };
  }

  // ЕДА
  if (type === 'pie' || type === 'cupcake') {
    return {
      id: newEntityId(),
      kind: 'food', type,
      heal: type === 'pie' ? CONFIG.PIE_HEAL : CONFIG.CUPCAKE_HEAL
    };
  }

  // Факел
  if (type === 'torch') {
    return {
      id: newEntityId(),
      kind: 'torch',
      hp: CONFIG.TORCH_HP,
      maxHp: CONFIG.TORCH_HP,
      direction: 0
    };
  }

  // Тыковка
  return {
    id: newEntityId(),
    kind: 'pumpkin',
    value: 1
  };
}

// ============================================
// СОЗДАТЬ ПУСТУЮ КАРТУ
// ============================================
function createEmptyCard() {
  return {
    id: newEntityId(),
    kind: 'empty'
  };
}

// ============================================
// ДОСТУПНЫЕ ВРАГИ
// ============================================
function getAvailableEnemyTypes() {
  const score = player ? player.score : 0;
  const available = ['raven', 'rat', 'evil_pumpkin'];

  for (const [key, threshold] of Object.entries(CONFIG.UNLOCK)) {
    if (score >= threshold && CONFIG.ENEMIES[key]) {
      available.push(key);
    }
  }

  return available;
}

// ============================================
// ГАРАНТИРОВАННЫЙ СПАВН
// ============================================
function getGuaranteedEnemyType() {
  const available = getAvailableEnemyTypes();
  if (available.length === 0) return 'raven';

  guaranteedQueue = guaranteedQueue.filter(t => available.includes(t));

  for (const type of available) {
    if (!guaranteedQueue.includes(type)) {
      guaranteedQueue.push(type);
    }
  }

  if (guaranteedQueue.length === 0) {
    guaranteedQueue = [...available];
  }

  return guaranteedQueue.shift();
}

// ============================================
// ЗАПОЛНИТЬ ВСЕ КЛЕТКИ
// ============================================
function fillAllCells() {
  for (let y = 0; y < CONFIG.FIELD_SIZE; y++) {
    for (let x = 0; x < CONFIG.FIELD_SIZE; x++) {
      const cell = FIELD[y][x];
      if (player && player.x === x && player.y === y) continue;
      if (cell.entity) continue;
      cell.entity = createRandomEntity();
      if (cell.entity) cell.type = cell.entity.kind;
    }
  }
}

// ============================================
// СДВИГ
// ============================================
function shiftLine(direction, oldX, oldY) {
  lastShiftDirection = direction;

  if (direction === 'right') {
    const y = oldY;
    for (let x = oldX; x > 0; x--) {
      FIELD[y][x].entity = FIELD[y][x - 1].entity;
      FIELD[y][x].type = FIELD[y][x - 1].type;
    }
    FIELD[y][0].entity = createRandomEntity();
    FIELD[y][0].type = FIELD[y][0].entity ? FIELD[y][0].entity.kind : 'empty';

  } else if (direction === 'left') {
    const y = oldY;
    for (let x = oldX; x < CONFIG.FIELD_SIZE - 1; x++) {
      FIELD[y][x].entity = FIELD[y][x + 1].entity;
      FIELD[y][x].type = FIELD[y][x + 1].type;
    }
    FIELD[y][CONFIG.FIELD_SIZE - 1].entity = createRandomEntity();
    FIELD[y][CONFIG.FIELD_SIZE - 1].type =
      FIELD[y][CONFIG.FIELD_SIZE - 1].entity ? FIELD[y][CONFIG.FIELD_SIZE - 1].entity.kind : 'empty';

  } else if (direction === 'up') {
    const x = oldX;
    for (let y = oldY; y < CONFIG.FIELD_SIZE - 1; y++) {
      FIELD[y][x].entity = FIELD[y + 1][x].entity;
      FIELD[y][x].type = FIELD[y + 1][x].type;
    }
    FIELD[CONFIG.FIELD_SIZE - 1][x].entity = createRandomEntity();
    FIELD[CONFIG.FIELD_SIZE - 1][x].type =
      FIELD[CONFIG.FIELD_SIZE - 1][x].entity ? FIELD[CONFIG.FIELD_SIZE - 1][x].entity.kind : 'empty';

  } else if (direction === 'down') {
    const x = oldX;
    for (let y = oldY; y > 0; y--) {
      FIELD[y][x].entity = FIELD[y - 1][x].entity;
      FIELD[y][x].type = FIELD[y - 1][x].type;
    }
    FIELD[0][x].entity = createRandomEntity();
    FIELD[0][x].type = FIELD[0][x].entity ? FIELD[0][x].entity.kind : 'empty';
  }
}