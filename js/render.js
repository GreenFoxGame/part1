// ============================================
// ОТРИСОВКА — КАРТЫ ЕДУТ ЦЕЛИКОМ + СПАВН С КРАЯ
// ============================================

let fieldInitialized = false;
let cardMap = {};
let clickSlots = [];
let cardWidth = 0;
let cardHeight = 0;
let gapSize = 6;
let paddingSize = 0;

const ICON_PATHS = {
  fox_idle:   'assets/characters/fox_idle.png',
  fox_kosa:   'assets/characters/fox_kosa.png',
  fox_vily:   'assets/characters/fox_vily.png',
  fox_tyapka: 'assets/characters/fox_tapka.png',
  fox_serp:   'assets/characters/fox_serp.png',
  fox_semena: 'assets/characters/fox_semena.png',

  raven:            'assets/characters/voron.png',
  rat:              'assets/characters/krisa.png',
  rotten_pumpkin:   'assets/characters/gnilaya_tikva_1.png',
  reaper:           'assets/characters/zhnets.png',
  evil_pumpkin:     'assets/characters/zlaya_tikva.png',
  scarecrow:        'assets/characters/pugalo.png',
  sunflower:        'assets/characters/podsolnuh.png',
  golem:            'assets/characters/golem.png',
  big_evil_pumpkin: 'assets/characters/bolshaya_zlaya_tikva.png',

  vily:    'assets/characters/vily.png',
  kosa:    'assets/characters/kosa.png',
  tyapka:  'assets/characters/tapka.png',
  serp:    'assets/characters/serp.png',
  semena:  'assets/characters/semena.png',

  pie:     'assets/characters/pirog.png',
  cupcake: 'assets/characters/keks.png',

  torch_up:    'assets/characters/fakel_1.png',
  torch_right: 'assets/characters/fakel_2.png',
  torch_down:  'assets/characters/fakel_3.png',
  torch_left:  'assets/characters/fakel_4.png',
  torch:       'assets/characters/fakel_2.png',

  pumpkin: 'assets/characters/tikovka.png',
  golden:  'assets/characters/zolotaya_tikva.png'
};

function getIconHTML(iconKey, emoji) {
  const path = ICON_PATHS[iconKey];
  if (path) {
    return `<img src="${path}" alt="" class="card-img" onerror="this.style.display='none'">`;
  }
  return emoji;
}

// ============================================
// ГЕОМЕТРИЯ ПОЛЯ (Заполняет всю высоту)
// ============================================
function measureField() {
  const fieldEl = document.getElementById('field');
  const style = getComputedStyle(fieldEl);
  const padding = parseFloat(style.paddingLeft) || 0;

  // Получаем внутренние размеры поля (минус рамки)
  const innerW = fieldEl.clientWidth - padding * 2;
  const innerH = fieldEl.clientHeight - padding * 2;

  const size = CONFIG.FIELD_SIZE;
  const gap = 6;

  // Считаем ширину и высоту карты, чтобы они заполнили ВСЁ поле
  cardWidth = (innerW - gap * (size - 1)) / size;
  cardHeight = (innerH - gap * (size - 1)) / size;

  gapSize = gap;
  paddingSize = padding;
}

function cellToPx(x, y) {
  const left = paddingSize + x * (cardWidth + gapSize);
  const top  = paddingSize + y * (cardHeight + gapSize);
  return { left, top };
}

function initFieldDOM() {
  const field = document.getElementById('field');
  field.innerHTML = '';
  cardMap = {};
  clickSlots = [];

  measureField();

  for (let y = 0; y < CONFIG.FIELD_SIZE; y++) {
    clickSlots[y] = [];
    for (let x = 0; x < CONFIG.FIELD_SIZE; x++) {
      const slot = document.createElement('div');
      slot.className = 'click-slot';
      slot.style.width = cardWidth + 'px';
      slot.style.height = cardHeight + 'px';

      const pos = cellToPx(x, y);
      slot.style.transform = `translate(${pos.left}px, ${pos.top}px)`;
      slot.addEventListener('click', () => onCellClick(x, y));

      field.appendChild(slot);
      clickSlots[y][x] = slot;
    }
  }

  fieldInitialized = true;
}

function getOrCreateCard(id) {
  if (cardMap[id]) return cardMap[id];

  const field = document.getElementById('field');
  const card = document.createElement('div');
  card.className = 'card empty';
  card.style.width = cardWidth + 'px';
  card.style.height = cardHeight + 'px';
  card.dataset.entityId = id;

  field.appendChild(card);
  cardMap[id] = { el: card, x: -1, y: -1, isNew: true };
  return cardMap[id];
}

function removeCard(id) {
  if (!cardMap[id]) return;
  cardMap[id].el.remove();
  delete cardMap[id];
}

function render() {
  if (!fieldInitialized) initFieldDOM();

  measureField();

  for (let y = 0; y < CONFIG.FIELD_SIZE; y++) {
    for (let x = 0; x < CONFIG.FIELD_SIZE; x++) {
      const slot = clickSlots[y][x];
      slot.style.width = cardWidth + 'px';
      slot.style.height = cardHeight + 'px';
      const pos = cellToPx(x, y);
      slot.style.transform = `translate(${pos.left}px, ${pos.top}px)`;
    }
  }

  const activeIds = new Set();
  activeIds.add('player');
  for (let y = 0; y < CONFIG.FIELD_SIZE; y++) {
    for (let x = 0; x < CONFIG.FIELD_SIZE; x++) {
      const e = FIELD[y][x].entity;
      if (e && e.id) activeIds.add(e.id);
    }
  }

  for (const id of Object.keys(cardMap)) {
    if (!activeIds.has(id)) {
      removeCard(id);
    }
  }

  {
    const card = getOrCreateCard('player');
    card.el.style.width = cardWidth + 'px';
    card.el.style.height = cardHeight + 'px';
    updateCardContent(card.el, 'player', null);
    positionCard(card, player.x, player.y);
  }

  let skipAnimConsumed = false;

  for (let y = 0; y < CONFIG.FIELD_SIZE; y++) {
    for (let x = 0; x < CONFIG.FIELD_SIZE; x++) {
      const e = FIELD[y][x].entity;
      if (!e || !e.id) continue;

      const isNewCard = !cardMap[e.id];
      const card = getOrCreateCard(e.id);

      card.el.style.width = cardWidth + 'px';
      card.el.style.height = cardHeight + 'px';
      updateCardContent(card.el, e.kind, e);

      if (isNewCard) {
        card.x = x;
        card.y = y;
        card.isNew = false;

        if (skipNextSpawnAnimation && !skipAnimConsumed) {
          skipAnimConsumed = true;
          skipNextSpawnAnimation = false;

          const pos = cellToPx(x, y);
          card.el.style.transition = 'none';
          card.el.style.transform = `translate(${pos.left}px, ${pos.top}px)`;
        } else {
          animateSpawn(card.el, x, y);
        }
      } else {
        positionCard(card, x, y);
      }
    }
  }

  updateHUD();
}

function positionCard(cardEntry, x, y) {
  const pos = cellToPx(x, y);
  const card = cardEntry.el;

  if (cardEntry.x === x && cardEntry.y === y) return;

  const wasFirst = (cardEntry.x === -1);
  const oldRect = card.getBoundingClientRect();
  card.style.transform = `translate(${pos.left}px, ${pos.top}px)`;

  cardEntry.x = x;
  cardEntry.y = y;

  if (wasFirst) return;

  const newRect = card.getBoundingClientRect();
  const dx = oldRect.left - newRect.left;
  const dy = oldRect.top - newRect.top;

  if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

  card.style.transition = 'none';
  card.style.transform = `translate(${pos.left + dx}px, ${pos.top + dy}px)`;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      card.style.transition = 'transform 0.3s ease-out';
      card.style.transform = `translate(${pos.left}px, ${pos.top}px)`;
      setTimeout(() => { card.style.transition = ''; }, 310);
    });
  });
}

function animateSpawn(cardEl, x, y) {
  const pos = cellToPx(x, y);
  const dir = lastShiftDirection;

  let startLeft = pos.left;
  let startTop = pos.top;

  if (dir === 'right') {
    startLeft = -cardWidth - gapSize;
  } else if (dir === 'left') {
    startLeft = paddingSize * 2 + cardWidth * CONFIG.FIELD_SIZE + gapSize * CONFIG.FIELD_SIZE;
  } else if (dir === 'down') {
    startTop = -cardHeight - gapSize;
  } else if (dir === 'up') {
    startTop = paddingSize * 2 + cardHeight * CONFIG.FIELD_SIZE + gapSize * CONFIG.FIELD_SIZE;
  } else {
    cardEl.style.transition = 'none';
    cardEl.style.transform = `translate(${pos.left}px, ${pos.top}px)`;
    return;
  }

  cardEl.style.transition = 'none';
  cardEl.style.transform = `translate(${startLeft}px, ${startTop}px)`;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      cardEl.style.transition = 'transform 0.3s ease-out';
      cardEl.style.transform = `translate(${pos.left}px, ${pos.top}px)`;
      setTimeout(() => { cardEl.style.transition = ''; }, 310);
    });
  });
}

function updateCardContent(cardEl, kind, entity) {
  const keepPulse = cardEl.classList.contains('pulse');
  const keepPulsePlayer = cardEl.classList.contains('pulse-player');

  cardEl.className = 'card';
  if (keepPulse) cardEl.classList.add('pulse');
  if (keepPulsePlayer) cardEl.classList.add('pulse-player');

  if (kind === 'player') {
    cardEl.classList.add('player');

    let foxKey = 'fox_idle';
    if (player.weapon) {
      if (player.weapon.type === 'kosa')        foxKey = 'fox_kosa';
      else if (player.weapon.type === 'vily')   foxKey = 'fox_vily';
      else if (player.weapon.type === 'tyapka') foxKey = 'fox_tyapka';
      else if (player.weapon.type === 'serp')   foxKey = 'fox_serp';
      else if (player.weapon.type === 'semena') foxKey = 'fox_semena';
    }

    cardEl.innerHTML = `
      <div class="hp hp-player">${player.hp}</div>
      ${player.weapon ? `<div class="hp hp-weapon">${player.weapon.hp}</div>` : ''}
      <div class="icon">${getIconHTML(foxKey, '🦊')}</div>
      <div class="name">Лисёнок</div>
    `;
    return;
  }

  if (!entity) {
    cardEl.classList.add('empty');
    cardEl.innerHTML = '';
    return;
  }

  if (entity.kind === 'empty') {
    cardEl.classList.add('empty');
    cardEl.innerHTML = '';
  }
  else if (entity.kind === 'enemy') {
    cardEl.classList.add('enemy');
    const cfg = CONFIG.ENEMIES[entity.type];

    let iconKey = entity.type;
    if (entity.type === 'rotten_pumpkin') {
      if (entity.timer === 3) iconKey = 'rotten_pumpkin';
      if (entity.timer === 2) iconKey = 'rotten_pumpkin_2';
      if (entity.timer === 1) iconKey = 'rotten_pumpkin_3';
      ICON_PATHS['rotten_pumpkin']   = 'assets/characters/gnilaya_tikva_1.png';
      ICON_PATHS['rotten_pumpkin_2'] = 'assets/characters/gnilaya_tikva_2.png';
      ICON_PATHS['rotten_pumpkin_3'] = 'assets/characters/gnilaya_tikva_3.png';
    }

    cardEl.innerHTML = `
      <div class="hp">${entity.hp}</div>
      <div class="icon">${getIconHTML(iconKey, cfg.icon)}</div>
      <div class="name">${cfg.name}</div>
    `;
  }
  else if (entity.kind === 'weapon') {
    cardEl.classList.add('weapon');
    const cfg = CONFIG.WEAPONS[entity.type];
    cardEl.innerHTML = `
      <div class="hp">${entity.hp}</div>
      <div class="icon">${getIconHTML(entity.type, cfg.icon)}</div>
      <div class="name">${cfg.name}</div>
    `;
  }
  else if (entity.kind === 'food') {
    cardEl.classList.add('item');
    cardEl.innerHTML = `
      <div class="icon">${getIconHTML(entity.type, entity.type === 'pie' ? '🥧' : '🧁')}</div>
      <div class="name">${entity.type === 'pie' ? 'Пирог' : 'Кекс'}</div>
    `;
  }
  else if (entity.kind === 'torch') {
    cardEl.classList.add('torch');

    let torchKey = 'torch_right';
    if (entity.direction === 0)   torchKey = 'torch_up';
    if (entity.direction === 90)  torchKey = 'torch_right';
    if (entity.direction === 180) torchKey = 'torch_down';
    if (entity.direction === 270) torchKey = 'torch_left';

    cardEl.innerHTML = `
      <div class="hp">${entity.hp}</div>
      <div class="icon">${getIconHTML(torchKey, '🕯️')}</div>
      <div class="name">Факел</div>
    `;
  }
  else if (entity.kind === 'pumpkin') {
    cardEl.classList.add('pumpkin');
    cardEl.innerHTML = `
      <div class="icon">${getIconHTML('pumpkin', '🎃')}</div>
      <div class="name">Тыковка</div>
    `;
  } else if (entity.kind === 'golden') {
    cardEl.classList.add('golden');
    cardEl.innerHTML = `
      <div class="icon">${getIconHTML('golden', '🌟')}</div>
      <div class="name">Золотая</div>
    `;
  }
}

function updateHUD() {
  document.getElementById('score').textContent = `🎃 ${player.score}`;
}

function animateHitById(id, type) {
  const entry = cardMap[id];
  if (!entry) return;

  const className = type === 'player' ? 'pulse-player' : 'pulse';
  entry.el.classList.add(className);

  setTimeout(() => {
    entry.el.classList.remove(className);
  }, 500);
}

function animateHit(x, y, type) {
  if (type === 'player') {
    animateHitById('player', 'player');
  } else {
    const cell = getCell(x, y);
    if (cell && cell.entity && cell.entity.id) {
      animateHitById(cell.entity.id, 'enemy');
    }
  }
}

function log(msg) {
  const logEl = document.getElementById('log');
  if (!logEl) return; // Если лога нет на странице — тихо игнорируем
  const line = document.createElement('div');
  line.textContent = msg;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
  while (logEl.children.length > 30) {
    logEl.removeChild(logEl.firstChild);
  }
}

function handleResize() {
  if (!fieldInitialized) return;

  measureField();

  for (let y = 0; y < CONFIG.FIELD_SIZE; y++) {
    for (let x = 0; x < CONFIG.FIELD_SIZE; x++) {
      const slot = clickSlots[y][x];
      slot.style.width = cardWidth + 'px';
      slot.style.height = cardHeight + 'px';
      const pos = cellToPx(x, y);
      slot.style.transform = `translate(${pos.left}px, ${pos.top}px)`;
    }
  }

  for (const id in cardMap) {
    cardMap[id].x = -1;
    cardMap[id].y = -1;
  }

  render();
}

window.addEventListener('resize', handleResize);
window.addEventListener('orientationchange', () => {
  setTimeout(handleResize, 150);
});

// ============================================
// ОБРАБОТЧИКИ ДЛЯ ПОПАПА (ДОЛГОЕ НАЖАТИЕ)
// ============================================
let popupPressTimer = null;
let isPopupLongPress = false;

function setupPopupEvents(slot, x, y) {
  // Нажатие
  const onStart = (e) => {
    const tt = document.getElementById('tooltip');
    if (tt.classList.contains('active')) return;
    if (e.type === 'touchstart') e.preventDefault();

    isPopupLongPress = false;
    popupPressTimer = setTimeout(() => {
      isPopupLongPress = true;
      if (window.showTooltipForCell) window.showTooltipForCell(x, y);
    }, 500);
  };

  // Отпускание
  const onEnd = (e) => {
    if (popupPressTimer) clearTimeout(popupPressTimer);
    const tt = document.getElementById('tooltip');

    // Если это был короткий клик — вызываем игровую логику
    if (!isPopupLongPress && !tt.classList.contains('active')) {
      onCellClick(x, y);
    }
    isPopupLongPress = false;
  };

  // Отмена (палец ушел в сторону)
  const onCancel = () => {
    if (popupPressTimer) clearTimeout(popupPressTimer);
    isPopupLongPress = false;
  };

  slot.addEventListener('mousedown', onStart);
  slot.addEventListener('touchstart', onStart, { passive: false });
  slot.addEventListener('mouseup', onEnd);
  slot.addEventListener('touchend', onEnd);
  slot.addEventListener('mouseleave', onCancel);
  slot.addEventListener('touchcancel', onCancel);
}