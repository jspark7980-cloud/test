// 로비: 영구 강화 구매, 동료 해금, 새 판에 강화 적용.
// 영구 데이터는 save.js 의 meta(코인·강화 단계·해금 동료)에 있다.
window.DT = window.DT || {};

DT.lobby = {
  level(meta, id) {
    return (meta.upgrades && meta.upgrades[id]) || 0;
  },

  // 아직 만들어지지 않은 단계의 기능에 딸린 강화는 잠금
  locked(id) {
    const u = DT.data.upgrades[id];
    return !!(u.lockedUntil && !DT.config.builtStages.includes(u.lockedUntil));
  },

  nextCost(meta, id) {
    const u = DT.data.upgrades[id];
    const lv = DT.lobby.level(meta, id);
    return lv < u.costs.length ? u.costs[lv] : null;
  },

  canBuy(meta, id) {
    const cost = DT.lobby.nextCost(meta, id);
    return cost !== null && !DT.lobby.locked(id) && meta.coins >= cost;
  },

  buy(meta, id) {
    if (!DT.lobby.canBuy(meta, id)) return false;
    meta.coins -= DT.lobby.nextCost(meta, id);
    meta.upgrades = meta.upgrades || {};
    meta.upgrades[id] = DT.lobby.level(meta, id) + 1;
    return true;
  },

  // ── 동료 해금 ──
  companionUnlocked(meta, kind) {
    const d = DT.data.companions[kind];
    return !d.unlockCost || (meta.unlocked || []).includes(kind);
  },

  unlockCompanion(meta, kind) {
    const d = DT.data.companions[kind];
    if (!d || DT.lobby.companionUnlocked(meta, kind) || meta.coins < d.unlockCost) return false;
    meta.coins -= d.unlockCost;
    meta.unlocked = (meta.unlocked || []).concat(kind);
    return true;
  },

  starterOptions(meta) {
    return Object.keys(DT.data.companions).filter((k) => DT.lobby.companionUnlocked(meta, k));
  },

  companionPicks(meta) {
    return Math.min(DT.config.party.companionSlots, 1 + DT.lobby.level(meta, 'companionSlot'));
  },

  // 새 판에 영구 강화 적용
  applyToRun(state, meta) {
    const L = (id) => DT.lobby.level(meta, id);
    const U = DT.data.upgrades;
    const hp = L('maxHp') * U.maxHp.value;
    state.player.maxHp += hp;
    state.player.hp += hp;
    state.goldBonus = L('startGold') * U.startGold.value;
    const extra = U.pilfer.extra.slice(0, L('pilfer')).flat();
    if (extra.length) state.player.masterDeck.forEach((c) => { if (c.id === 'pilfer') c.extra = extra; });
    state.pocketCap = DT.config.items.pocketBase + L('safePocket');
    state.starterOptions = DT.lobby.starterOptions(meta);
    state.companionPicks = DT.lobby.companionPicks(meta);
  },
};
