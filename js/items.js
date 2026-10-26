// ============================================
// ФАКТЕЛ — ЛОВУШКА ПРИ ВХОДЕ
// ============================================

function torchTrapOnEnter(cell) {
  const e = cell.entity;
  if (!e || e.kind !== 'torch') return;

  const dirs = {
    0:   [0, -1],
    90:  [1, 0],
    180: [0, 1],
    270: [-1, 0]
  };
  const [dx, dy] = dirs[e.direction];
  const tx = cell.x + dx;
  const ty = cell.y + dy;

  // 1. Игрок в направлении пламени
  if (player.x === tx && player.y === ty) {
    log(`🔥 Факел обжигает игрока на ${e.hp}!`);
    playerTakeDamage(e.hp);
    animateHitById('player', 'player');
  }

  // 2. Любая карта в направлении пламени
  const target = getCell(tx, ty);
  if (target && target.entity && target.kind !== 'empty') {
    const targetId = target.entity.id;

    // Пульсация для любой карты, кроме игрока
    if (target.entity.kind === 'enemy' || target.entity.kind === 'weapon' || target.entity.kind === 'food' || target.entity.kind === 'torch' || target.entity.kind === 'pumpkin' || target.entity.kind === 'golden') {
      animateHitById(targetId, 'enemy');
    }

    // Враги получают урон
    if (target.entity.kind === 'enemy') {
      if (target.entity.type === 'scarecrow' || target.entity.type === 'sunflower') {
        target.entity.burning = true;
        log(`🔥 ${CONFIG.ENEMIES[target.entity.type].name} загорелся!`);
      }

      target.entity.hp -= e.hp;
      log(`🔥 Факел обжигает ${CONFIG.ENEMIES[target.entity.type].name} на ${e.hp}`);

      if (target.entity.hp <= 0) {
        killEnemy(target.entity, true);
      } else if (target.entity.type === 'scarecrow' || target.entity.type === 'sunflower') {
        if (target.entity.hp < 1) target.entity.hp = 1;
      }
    }
    // Остальные предметы уничтожаются
    else if (target.entity.kind === 'weapon' || target.entity.kind === 'food' || target.entity.kind === 'torch' || target.entity.kind === 'pumpkin' || target.entity.kind === 'golden') {
      log(`🔥 Огонь уничтожил ${target.entity.kind === 'pumpkin' ? 'тыковку' : 'предмет'}!`);
      target.entity = null;
      target.type = 'empty';
    }
  }
}

// ============================================
// ПОВОРОТ ФАКТЕЛА
// ============================================
function itemsTurn() {
  for (let y = 0; y < CONFIG.FIELD_SIZE; y++) {
    for (let x = 0; x < CONFIG.FIELD_SIZE; x++) {
      const cell = FIELD[y][x];
      const e = cell.entity;
      if (!e || e.kind !== 'torch') continue;
      e.direction = (e.direction + 90) % 360;
    }
  }
}