// ============================================
// АТАКА
// Возвращает { killed, shouldMove }
// ============================================

function attackEnemy(enemy) {
  const enemyHp = enemy.hp;

  // ===== БЕЗ ОРУЖИЯ =====
  if (!player.weapon) {
    if (player.hp > enemyHp) {
      log(`Игрок съедает врага (${enemyHp} HP)`);

      playerHitX = player.x;
      playerHitY = player.y;

      playerTakeDamage(enemyHp);
      killEnemy(enemy, false);
      return { killed: true, shouldMove: true }; // Встает на клетку (съел)
    } else {
      log(`Игрок слишком слаб — смерть!`);

      playerHitX = player.x;
      playerHitY = player.y;

      player.hp = 0;
      playerWasHit = true;
      gameOver();
      return { killed: false, shouldMove: false };
    }
  }

  // ===== С ОРУЖИЕМ =====
  const w = player.weapon;

  if (w.type === 'semena') {
    return attackWithSeeds(enemy);
  }

  if (w.type === 'serp') {
    return attackWithSerp(enemy);
  }

  const isTyapka = (w.type === 'tyapka' && isTyapkaTarget(enemy));

  if (isTyapka) {
    const damage = w.hp * 2;
    const hpCost = Math.ceil(enemyHp / 2);

    log(`Тяпка наносит ${damage} урона (двойной!)`);

    if (damage >= enemyHp) {
      log(`Тыква/растение убито!`);
      w.hp -= hpCost;
      if (w.hp <= 0) {
        log(`Тяпка сломана`);
        player.weapon = null;
      }
      killEnemy(enemy, true);
      return { killed: true, shouldMove: false }; // Остается на месте
    } else {
      log(`Враг теряет ${damage} HP, остаётся ${enemyHp - damage}`);
      enemy.hp -= damage;
      w.hp -= hpCost;
      if (w.hp <= 0) {
        log(`Тяпка сломана`);
        player.weapon = null;
      }
      return { killed: false, shouldMove: false };
    }
  }

  // ===== ОБЫЧНОЕ ОРУЖИЕ =====
  let weaponDamage = w.hp;

  if (weaponDamage > enemyHp) {
    log(`Оружие убивает врага (${enemyHp} HP)`);
    w.hp -= enemyHp;
    killEnemy(enemy, true);
    return { killed: true, shouldMove: false }; // Остается на месте
  } else if (weaponDamage === enemyHp) {
    log(`Оружие ломается, но враг убит!`);
    player.weapon = null;
    killEnemy(enemy, true);
    return { killed: true, shouldMove: false }; // Остается на месте
  } else {
    log(`Оружие ломается, враг теряет ${weaponDamage} HP`);
    enemy.hp -= weaponDamage;
    player.weapon = null;
    return { killed: false, shouldMove: false };
  }
}

// ============================================
// СЕМЕНА
// ============================================
function attackWithSeeds(enemy) {
  const w = player.weapon;
  if (!w || w.type !== 'semena') return { killed: false, shouldMove: false };

  log(`🌱 Выстрел семенем! 1 урон.`);
  enemy.hp -= 1;
  w.hp -= 1;

  let killed = false;

  if (enemy.hp <= 0) {
    killEnemy(enemy, true);
    killed = true;
  }

  if (w.hp <= 0) {
    log(`🌱 Семена кончились`);
    player.weapon = null;
  }

  return { killed, shouldMove: false };
}

// ============================================
// СЕРП
// ============================================
function attackWithSerp(enemy) {
  const w = player.weapon;
  if (!w || w.type !== 'serp') return { killed: false, shouldMove: false };

  const dir = lastSerpDirection;
  if (!dir) return { killed: false, shouldMove: false };

  const targets = [];
  const px = player.x;
  const py = player.y;

  let cx = px, cy = py;
  while (true) {
    if (dir === 'left')  cx -= 1;
    if (dir === 'right') cx += 1;
    if (dir === 'up')    cy -= 1;
    if (dir === 'down')  cy += 1;

    if (cx < 0 || cy < 0 || cx >= CONFIG.FIELD_SIZE || cy >= CONFIG.FIELD_SIZE) break;

    const cell = getCell(cx, cy);
    if (cell && cell.entity && cell.entity.kind === 'enemy') {
      targets.push(cell.entity);
    }
  }

  if (targets.length === 0) {
    log(`🌙 Серп летит по пустой линии и возвращается`);
    return { killed: false, shouldMove: false };
  }

  const serpHp = w.hp;
  let broken = false;

  log(`🌙 Серп режет линию! Урон ${serpHp} каждому.`);

  for (const e of targets) {
    if (e.hp >= serpHp) {
      broken = true;
      break;
    }
  }

  for (const e of targets) {
    e.hp -= serpHp;
    log(`${CONFIG.ENEMIES[e.type].name} получает ${serpHp} урона`);
    if (e.hp <= 0) killEnemy(e, true);
  }

  if (broken) {
    log(`🌙 Серп сломан о сильного врага!`);
    player.weapon = null;
  } else {
    log(`🌙 Серп возвращается к игроку`);
  }

  return { killed: true, shouldMove: false };
}

// ============================================
// ТЯПКА ×2
// ============================================
function isTyapkaTarget(enemy) {
  return ['rotten_pumpkin', 'evil_pumpkin', 'big_evil_pumpkin', 'golem', 'sunflower'].includes(enemy.type);
}