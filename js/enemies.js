// ============================================
// ХОД ВРАГОВ
// ============================================

function enemiesTurn() {
  for (let y = 0; y < CONFIG.FIELD_SIZE; y++) {
    for (let x = 0; x < CONFIG.FIELD_SIZE; x++) {
      const cell = FIELD[y][x];
      const e = cell.entity;
      if (!e || e.kind !== 'enemy') continue;

      switch (e.behavior) {

        case 'static':
          break;

        case 'attack_global':
          if (player.hp > 1) {
            playerTakeDamage(1);
            log(`💀 Жнец атакует!`);
          } else {
            log(`💀 Жнец игнорирует игрока (1 HP)`);
          }
          break;

        case 'timer':
          e.timer--;
          log(`Гнилая тыква: ${e.timer} ходов до взрыва`);
          if (e.timer <= 0) explodeRotten(cell);
          break;

        case 'burn':
          if (e.burning && e.hp > 1) {
            e.hp -= 1;
            log(`${CONFIG.ENEMIES[e.type].name} горит: ${e.hp} HP`);
            if (e.hp <= 1) {
              e.hp = 1;
              e.burning = false;
              log(`${CONFIG.ENEMIES[e.type].name} догорел, осталось 1 HP`);
            }
          }
          break;

        case 'break':
          breakPumpkinsAround(cell);
          break;

        case 'matryoshka':
          break;
      }
    }
  }
}

// ============================================
// ВЗРЫВ ГНИЛОЙ ТЫКВЫ (БЬЁТ ВСЁ ВОКРУГ)
// ============================================
function explodeRotten(cell) {
  log(`💥 Гнилая тыква взорвалась!`);

  const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];

  for (const [dx, dy] of dirs) {
    const nx = cell.x + dx;
    const ny = cell.y + dy;
    const n = getCell(nx, ny);
    if (!n) continue;

    // 1. Наносим урон ЛЮБОЙ карте (враг, оружие, еда, тыковка, факел)
    if (n.entity && n.kind !== 'empty') {
      const targetId = n.entity.id;

      // Пульсация для любой карты, кроме игрока
      if (n.entity.kind === 'enemy' || n.entity.kind === 'weapon' || n.entity.kind === 'food' || n.entity.kind === 'torch' || n.entity.kind === 'pumpkin' || n.entity.kind === 'golden') {
        animateHitById(targetId, 'enemy');
      }

      // Врагам снимаем HP
      if (n.entity.kind === 'enemy') {
        n.entity.hp -= CONFIG.ROTTEN_EXPLOSION_DAMAGE;
        log(`${CONFIG.ENEMIES[n.entity.type].name} получает ${CONFIG.ROTTEN_EXPLOSION_DAMAGE} урона`);
        if (n.entity.hp <= 0) killEnemy(n.entity, true);
      }
      // Остальным предметам просто ломаем (или удаляем, так как у них нет HP)
      else if (n.entity.kind === 'weapon' || n.entity.kind === 'food' || n.entity.kind === 'torch' || n.entity.kind === 'pumpkin' || n.entity.kind === 'golden') {
        log(`${n.entity.kind === 'pumpkin' ? 'Тыковка' : 'Предмет'} уничтожен взрывом!`);
        n.entity = null;
        n.type = 'empty';
      }
    }

    // 2. Если там стоит игрок — он тоже получает урон
    if (player.x === nx && player.y === ny) {
      playerTakeDamage(CONFIG.ROTTEN_EXPLOSION_DAMAGE);
    }
  }

  // На месте тыквы появляются семена
  skipNextSpawnAnimation = true;
  cell.entity = {
    id: newEntityId(),
    kind: 'weapon',
    type: 'semena',
    hp: CONFIG.SEEDS_FROM_ROTTEN,
    maxHp: CONFIG.SEEDS_FROM_ROTTEN
  };
  cell.type = 'weapon';
  log(`🌱 Выпали семена (${CONFIG.SEEDS_FROM_ROTTEN} выстрелов)`);
}

// ============================================
// ГОЛЕМ ЛОМАЕТ ТЫКОВКИ
// ============================================
function breakPumpkinsAround(cell) {
  const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  for (const [dx, dy] of dirs) {
    const n = getCell(cell.x + dx, cell.y + dy);
    if (n && n.type === 'pumpkin') {
      log(`🗿 Голем разбил тыковку`);
      n.entity = createEmptyCard();
      n.type = 'empty';
    }
  }
}

// ============================================
// УБИТЬ ВРАГА
// ============================================
function killEnemy(enemy, killedByWeapon) {
  for (let y = 0; y < CONFIG.FIELD_SIZE; y++) {
    for (let x = 0; x < CONFIG.FIELD_SIZE; x++) {
      if (FIELD[y][x].entity !== enemy) continue;

      const cell = FIELD[y][x];
      const cfg = CONFIG.ENEMIES[enemy.type];

      if (enemy.type === 'big_evil_pumpkin') {
        const newHp = randomHp(
          CONFIG.ENEMIES.evil_pumpkin.hpMin,
          CONFIG.ENEMIES.evil_pumpkin.hpMax
        );
        log(`Большая злая тыква превращается в злую! (${newHp} HP)`);

        skipNextSpawnAnimation = true;

        cell.entity = {
          id: newEntityId(),
          kind: 'enemy',
          type: 'evil_pumpkin',
          hp: newHp,
          maxHp: newHp,
          behavior: 'static'
        };
        cell.type = 'enemy';
        return;
      }

      let reward = null;

      if (killedByWeapon && cfg.reward) {
        if (cfg.reward === 'pumpkin') {
          reward = { id: newEntityId(), kind: 'pumpkin', value: 1 };
        } else if (cfg.reward === 'golden') {
          reward = { id: newEntityId(), kind: 'golden', value: 3 };
        } else if (cfg.reward === 'seeds') {
          reward = {
            id: newEntityId(),
            kind: 'weapon', type: 'semena',
            hp: CONFIG.SEEDS_FROM_ROTTEN,
            maxHp: CONFIG.SEEDS_FROM_ROTTEN
          };
        }
      }

      if (reward) {
        skipNextSpawnAnimation = true;

        cell.entity = reward;
        cell.type = reward.kind === 'pumpkin' ? 'pumpkin'
                  : reward.kind === 'golden' ? 'golden'
                  : reward.kind === 'weapon' ? 'weapon'
                  : 'item';
      } else {
        cell.entity = null;
        cell.type = 'empty';
      }
      return;
    }
  }
}