// ============================================
// ВСЕ НАСТРОЙКИ ИГРЫ — МЕНЯЙ ЗДЕСЬ
// ============================================

const CONFIG = {

  FIELD_SIZE: 3,

  PLAYER_START_HP: 10,
  PLAYER_MAX_HP: 10,
  PLAYER_START_X: 1,
  PLAYER_START_Y: 1,

  MAX_ENEMIES_ON_FIELD: 4,
  MAX_WEAPONS_ON_FIELD: 3,

  WEAPON_HP_CALIBRATION: {
    ENEMY_HP_DIVISOR: 40,
    MIN_ENEMY_FACTOR: 0.7,
    MAX_ENEMY_FACTOR: 2.5,
    WEAPON_PENALTY_PER: 0.1,
    MIN_WEAPON_PENALTY: 0.6,
    RANDOM_MIN: 0.85,
    RANDOM_MAX: 1.15
  },

  TORCH_BASE_WEIGHT: 4,
  TORCH_SCARECROW_THRESHOLD: 10,

  GUARANTEED_SPAWN_INTERVAL: 10,
  GUARANTEED_SPAWN_IGNORE_LIMIT: true,

  BASE_WEIGHTS: {
    pumpkin:        20,
    vily:           8,
    kosa:           8,
    tyapka:         5,
    raven:          12,
    rat:            12,
    evil_pumpkin:   5,
    pie:            2,      // базовый вес (умножается на FOOD_MULT_BY_HP)
    cupcake:        3       // базовый вес
  },

  UNLOCK: {
    scarecrow:        10,
    big_evil_pumpkin: 10,
    reaper:           15,
    rotten_pumpkin:   15,
    serp:             15,
    sunflower:        20,
    golem:            25
  },

  UNLOCK_WEIGHTS: {
    scarecrow:        5,
    big_evil_pumpkin: 4,
    reaper:           6,
    rotten_pumpkin:   5,
    serp:             4,
    sunflower:        8,
    golem:            6
  },

  // ============================================
  // ЕДА (ЖЁСТКОЕ ПРАВИЛО: ТОЛЬКО ПРИ НИЗКОМ HP)
  // ============================================
  FOOD_MULT_BY_HP: [
    { hpRatio: 0.6, mult: 0.0, pieMult: 0.0 },   // HP > 60% — ЕДЫ НЕТ ВООБЩЕ
    { hpRatio: 0.4, mult: 0.2, pieMult: 0.1 },   // HP 40–60% — почти нет
    { hpRatio: 0.2, mult: 1.0, pieMult: 0.5 },   // HP 20–40% — нормально
    { hpRatio: 0.0, mult: 2.0, pieMult: 1.0 }    // HP < 20% — часто
  ],

  WEAPON_MULT_BY_ENEMIES: [
    { enemyCount: 0, mult: 0.6 },
    { enemyCount: 2, mult: 1.0 },
    { enemyCount: 4, mult: 1.4 },
    { enemyCount: 99, mult: 2.0 }
  ],

  ENEMY_MULT_BY_RESOURCES: [
    { resourceCount: 0, mult: 1.5 },
    { resourceCount: 2, mult: 1.2 },
    { resourceCount: 4, mult: 1.0 },
    { resourceCount: 6, mult: 0.8 },
    { resourceCount: 99, mult: 0.5 }
  ],

  TYAPKA_BONUS_PER_PUMPKIN_ENEMY: 5,
  TYAPKA_BONUS_MAX: 20,

  ENEMY_GROWTH_PER_TURN: 0.01,
  ENEMY_MAX_MULTIPLIER: 1.5,
  RESOURCE_DECAY_PER_TURN: 0.003,
  RESOURCE_MIN_MULTIPLIER: 0.8,

  PIE_HEAL: 5,
  CUPCAKE_HEAL: 2,

  WEAPONS: {
    vily:    { name: 'Вилы',   hp: 5, icon: '🔱' },
    kosa:    { name: 'Коса',   hp: 6, icon: '🌾' },
    tyapka:  { name: 'Тяпка',  hp: 2, icon: '⛏️' },
    serp:    { name: 'Серп',   hp: 4, icon: '🌙' },
    semena:  { name: 'Семена', hp: 3, icon: '🌱' }
  },

  ENEMIES: {
    raven:            { name: 'Ворон',              icon: '🐦', hpMin: 2,  hpMax: 5,  behavior: 'static',        reward: 'pumpkin' },
    rat:              { name: 'Крыса',              icon: '🐀', hpMin: 2,  hpMax: 5,  behavior: 'static',        reward: 'pumpkin' },
    rotten_pumpkin:   { name: 'Гнилая тыква',       icon: '🎃', hpMin: 4,  hpMax: 4,  behavior: 'timer', timer: 3, reward: 'seeds' },
    reaper:           { name: 'Жнец',               icon: '💀', hpMin: 7,  hpMax: 10, behavior: 'attack_global', reward: 'golden' },
    evil_pumpkin:     { name: 'Злая тыква',         icon: '👹', hpMin: 3,  hpMax: 5,  behavior: 'static',        reward: 'pumpkin' },
    scarecrow:        { name: 'Пугало',             icon: '🧙', hpMin: 7,  hpMax: 10, behavior: 'burn',          reward: 'golden' },
    sunflower:        { name: 'Подсолнух',          icon: '🌻', hpMin: 7,  hpMax: 10, behavior: 'burn',          reward: 'golden' },
    golem:            { name: 'Тыквенный голем',    icon: '🗿', hpMin: 12, hpMax: 20, behavior: 'break',         reward: 'golden' },
    big_evil_pumpkin: { name: 'Большая злая тыква', icon: '🎃', hpMin: 3,  hpMax: 5,  behavior: 'matryoshka',    reward: null }
  },

  TORCH_HP: 5,
  ROTTEN_EXPLOSION_DAMAGE: 3,
  ROTTEN_TIMER: 3,
  SEEDS_FROM_ROTTEN: 3
};

// ============================================
// ВЗВЕШЕННЫЙ РАНДОМ
// ============================================
function weightedRandom(weights) {
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  if (entries.length === 0) return null;
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = Math.random() * total;
  for (const [key, w] of entries) {
    r -= w;
    if (r <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

function randomHp(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getWeaponHp(type) {
  const base = CONFIG.WEAPONS[type].hp;
  const cal = CONFIG.WEAPON_HP_CALIBRATION;

  let totalEnemyHp = 0;
  for (let y = 0; y < CONFIG.FIELD_SIZE; y++)
    for (let x = 0; x < CONFIG.FIELD_SIZE; x++) {
      const e = FIELD[y][x].entity;
      if (e && e.kind === 'enemy') totalEnemyHp += e.hp;
    }

  let enemyFactor = 1 + (totalEnemyHp / cal.ENEMY_HP_DIVISOR);
  enemyFactor = Math.max(cal.MIN_ENEMY_FACTOR, Math.min(cal.MAX_ENEMY_FACTOR, enemyFactor));

  const weaponCount = countWeapons();
  let weaponPenalty = 1 - (weaponCount * cal.WEAPON_PENALTY_PER);
  weaponPenalty = Math.max(cal.MIN_WEAPON_PENALTY, weaponPenalty);

  const randomFactor = cal.RANDOM_MIN + Math.random() * (cal.RANDOM_MAX - cal.RANDOM_MIN);

  let finalHp = base * enemyFactor * weaponPenalty * randomFactor;
  if (isNaN(finalHp) || finalHp === undefined) finalHp = base;

  return Math.max(1, Math.round(finalHp));
}

function countEnemies() {
  let n = 0;
  for (let y = 0; y < CONFIG.FIELD_SIZE; y++)
    for (let x = 0; x < CONFIG.FIELD_SIZE; x++) {
      const e = FIELD[y][x].entity;
      if (e && e.kind === 'enemy') n++;
    }
  return n;
}

function countWeapons() {
  let n = 0;
  for (let y = 0; y < CONFIG.FIELD_SIZE; y++)
    for (let x = 0; x < CONFIG.FIELD_SIZE; x++) {
      const e = FIELD[y][x].entity;
      if (e && e.kind === 'weapon') n++;
    }
  return n;
}

function countResources() {
  let n = 0;
  for (let y = 0; y < CONFIG.FIELD_SIZE; y++)
    for (let x = 0; x < CONFIG.FIELD_SIZE; x++) {
      const e = FIELD[y][x].entity;
      if (e && (e.kind === 'weapon' || e.kind === 'food' || e.kind === 'torch')) n++;
    }
  return n;
}

function countPumpkinEnemies() {
  let n = 0;
  for (let y = 0; y < CONFIG.FIELD_SIZE; y++)
    for (let x = 0; x < CONFIG.FIELD_SIZE; x++) {
      const e = FIELD[y][x].entity;
      if (e && e.kind === 'enemy' &&
          ['evil_pumpkin', 'big_evil_pumpkin', 'rotten_pumpkin', 'golem', 'sunflower'].includes(e.type)) {
        n++;
      }
    }
  return n;
}

function getMultiplier(table, value) {
  for (const row of table) {
    const threshold = row.hpRatio ?? row.enemyCount ?? row.resourceCount;
    if (value <= threshold) return row.mult;
  }
  return table[table.length - 1].mult;
}

function getSpawnWeights() {
  const base = { ...CONFIG.BASE_WEIGHTS };
  const score = (typeof player !== 'undefined' && player) ? player.score : 0;
  const turn = (typeof gameTurn !== 'undefined') ? gameTurn : 0;

  const enemyKeys = ['raven', 'rat', 'rotten_pumpkin', 'reaper',
                     'evil_pumpkin', 'scarecrow', 'golem', 'big_evil_pumpkin', 'sunflower'];
  const weaponKeys = ['vily', 'kosa', 'tyapka', 'serp'];
  // ЕДА УБРАНА ИЗ РЕСУРСОВ (время её не трогает)
  const resourceKeys = ['pumpkin', 'vily', 'kosa', 'tyapka', 'serp'];

  for (const [key, threshold] of Object.entries(CONFIG.UNLOCK)) {
    if (score >= threshold) {
      base[key] = CONFIG.UNLOCK_WEIGHTS[key] || 0;
    }
  }

  if (score >= CONFIG.TORCH_SCARECROW_THRESHOLD) {
    base.torch = CONFIG.TORCH_BASE_WEIGHT;
  }

  // ЖЁСТКОЕ ПРАВИЛО: еда зависит ТОЛЬКО от HP
  const hpRatio = (typeof player !== 'undefined' && player) ? player.hp / CONFIG.PLAYER_MAX_HP : 1;
  for (const row of CONFIG.FOOD_MULT_BY_HP) {
    if (hpRatio <= row.hpRatio) {
      if (base.pie !== undefined) base.pie *= row.pieMult;
      if (base.cupcake !== undefined) base.cupcake *= row.mult;
      break;
    }
  }

  const enemyCount = countEnemies();
  const weaponMult = getMultiplier(CONFIG.WEAPON_MULT_BY_ENEMIES, enemyCount);
  for (const w of weaponKeys) {
    if (base[w] !== undefined) base[w] *= weaponMult;
  }

  const resourceCount = countResources();
  const enemyMult = getMultiplier(CONFIG.ENEMY_MULT_BY_RESOURCES, resourceCount);
  for (const key of enemyKeys) {
    if (base[key] !== undefined) base[key] *= enemyMult;
  }

  const pumpkinEnemies = countPumpkinEnemies();
  if (pumpkinEnemies > 0 && base.tyapka !== undefined) {
    const bonus = Math.min(
      pumpkinEnemies * CONFIG.TYAPKA_BONUS_PER_PUMPKIN_ENEMY,
      CONFIG.TYAPKA_BONUS_MAX
    );
    base.tyapka += bonus;
  }

  const timeEnemyMult = Math.min(
    1 + turn * CONFIG.ENEMY_GROWTH_PER_TURN,
    CONFIG.ENEMY_MAX_MULTIPLIER
  );
  const timeResourceMult = Math.max(
    1 - turn * CONFIG.RESOURCE_DECAY_PER_TURN,
    CONFIG.RESOURCE_MIN_MULTIPLIER
  );

  for (const key of enemyKeys) {
    if (base[key] !== undefined) base[key] *= timeEnemyMult;
  }
  for (const key of resourceKeys) {
    if (base[key] !== undefined) base[key] *= timeResourceMult;
  }
  if (base.torch !== undefined) base.torch *= timeResourceMult;

  // Обнуляем только слабых врагов при переполнении поля.
  if (enemyCount >= CONFIG.MAX_ENEMIES_ON_FIELD) {
    for (const key of enemyKeys) {
      if (base[key] !== undefined && !['golem', 'sunflower', 'reaper'].includes(key)) {
        base[key] = 0;
      }
    }
  }

  const weaponCount = countWeapons();
  if (weaponCount >= CONFIG.MAX_WEAPONS_ON_FIELD) {
    for (const key of weaponKeys) {
      if (base[key] !== undefined) base[key] = 0;
    }
  }

  const total = Object.values(base).reduce((s, w) => s + (w > 0 ? w : 0), 0);
  if (total === 0) base.pumpkin = 1;

  return base;
}