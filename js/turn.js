// ============================================
// КОНЕЦ ХОДА ИГРОКА
// ============================================

function endPlayerTurn() {
  gameTurn++;

  enemiesTurn();
  if (gameState !== 'playing') return;

  itemsTurn();

  // Вместо спавна на случайной клетке — ставим флаг
  // Следующий createRandomEntity() (на краю при сдвиге) создаст гаранта
  if (gameTurn % CONFIG.GUARANTEED_SPAWN_INTERVAL === 0) {
    forceGuaranteedNextSpawn = true;
  }

  render();

  if (playerWasHit) {
    playerWasHit = false;
    const hx = (playerHitX !== null) ? playerHitX : player.x;
    const hy = (playerHitY !== null) ? playerHitY : player.y;
    playerHitX = null;
    playerHitY = null;
    animateHitById('player', 'player');
  }
}