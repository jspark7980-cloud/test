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

  // ── 창고 ──
  stashCap() { return DT.config.stash.cap; },
  stashFull(meta) { return (meta.stash || []).length >= DT.config.stash.cap; },
  // 창고에 넣기(창고 고유 id 부여)
  stashAdd(meta, item) {
    meta.nextStashId = (meta.nextStashId || 1);
    const it = { uid: 's' + meta.nextStashId++, id: item.id, plus: item.plus || 0 };
    meta.stash = (meta.stash || []).concat(it);
    return it;
  },
  stashTake(meta, uid) {
    const i = (meta.stash || []).findIndex((x) => x.uid === uid);
    return i >= 0 ? meta.stash.splice(i, 1)[0] : null;
  },

  // ── 상점 ──
  shopLevel(meta) { return 1 + DT.lobby.level(meta, 'shopLevel'); },
  shopSlots(meta) { return DT.config.shop.slots[DT.lobby.shopLevel(meta) - 1]; },
  refreshCost(meta) {
    const S = DT.config.shop;
    return S.refreshBase + S.refreshStep * ((meta.shop && meta.shop.refreshes) || 0);
  },

  // 상점 상태가 없거나 로비 귀환으로 갱신 표시가 있으면 무료로 새로 진열
  ensureShop(meta) {
    if (!meta.shop) meta.shop = { rng: DT.rng.hashSeed('shop' + Date.now()), slots: [], refreshes: 0, stale: true };
    if (meta.shop.stale || meta.shop.slots.length !== DT.lobby.shopSlots(meta)) {
      DT.lobby.restock(meta);
      meta.shop.stale = false;
      meta.shop.refreshes = 0;
    }
    return meta.shop;
  },

  // 고정한 칸은 남기고 나머지를 다시 진열
  restock(meta) {
    const S = DT.config.shop;
    const shop = meta.shop;
    const n = DT.lobby.shopSlots(meta);
    const weights = Object.entries(S.weights[DT.lobby.shopLevel(meta) - 1]);
    const slots = [];
    for (let i = 0; i < n; i++) {
      const old = shop.slots[i];
      if (old && old.pinned && !old.sold) { slots.push(old); continue; }
      const kind = DT.map.weighted(shop, Object.entries(S.kinds));
      let gi = DT.items.GRADES.indexOf(DT.map.weighted(shop, weights));
      let pool = [];
      for (; gi >= 0 && !pool.length; gi--) pool = DT.items.shopPool(kind, DT.items.GRADES[gi]);
      // 같은 진열 안에서는 가능하면 겹치지 않게
      const fresh = pool.filter((x) => !slots.some((sl) => sl.id === x));
      const id = DT.rng.pick(shop, fresh.length ? fresh : pool);
      slots.push({ id, price: S.price[DT.items.def(id).grade], pinned: false, sold: false });
    }
    shop.slots = slots;
  },

  refreshShop(meta) {
    DT.lobby.ensureShop(meta);
    const cost = DT.lobby.refreshCost(meta);
    if (meta.coins < cost) return false;
    meta.coins -= cost;
    meta.shop.refreshes++;
    DT.lobby.restock(meta);
    return true;
  },

  togglePin(meta, i) {
    const slot = DT.lobby.ensureShop(meta).slots[i];
    if (!slot || slot.sold) return false;
    slot.pinned = !slot.pinned;
    return true;
  },

  buy(meta, i) {
    const slot = DT.lobby.ensureShop(meta).slots[i];
    if (!slot || slot.sold || meta.coins < slot.price || DT.lobby.stashFull(meta)) return false;
    meta.coins -= slot.price;
    slot.sold = true;
    slot.pinned = false;
    DT.lobby.stashAdd(meta, { id: slot.id });
    return true;
  },

  // 판이 끝나 로비로 돌아오면 상점 무료 갱신·새로고침 비용 초기화
  markShopStale(meta) {
    if (meta.shop) meta.shop.stale = true;
  },

  // ── 상인: 판매 ──
  sellPrice(it) {
    const d = DT.items.def(it.id);
    if (d.kind === 'loot') return DT.config.items.sellPrice[d.grade];
    const base = DT.config.shop.price[d.grade] * DT.config.merchant.otherRatio;
    return Math.round(base * (1 + (it.plus || 0) * 0.5));
  },
  sell(meta, uid) {
    const it = DT.lobby.stashTake(meta, uid);
    if (!it) return false;
    meta.coins += DT.lobby.sellPrice(it);
    return true;
  },

  // ── 대장간: 장비 강화 +1~+3 ──
  forgeCost(it) {
    const F = DT.config.forge;
    if ((it.plus || 0) >= F.max) return null;
    return Math.round(DT.config.shop.price[DT.items.def(it.id).grade] * F.costMult[it.plus || 0]);
  },
  forge(meta, uid) {
    const it = (meta.stash || []).find((x) => x.uid === uid);
    if (!it || !DT.items.forgeable(it.id)) return false;
    const cost = DT.lobby.forgeCost(it);
    if (cost === null || meta.coins < cost) return false;
    meta.coins -= cost;
    it.plus = (it.plus || 0) + 1;
    return true;
  },

  // ── 출발 준비 ──
  // prep: { picks: [동료 종류], equip: { 'player' | 동료 종류: { 칸: 창고 uid } }, bag: [창고 uid] }
  // 창고에서 꺼내 판에 가져갈 아이템 묶음을 만든다(창고에서 빠짐)
  takeLoadout(meta, prep) {
    const out = { picks: prep.picks.slice(), equip: {}, bag: [] };
    for (const [who, slots] of Object.entries(prep.equip || {})) {
      if (who !== 'player' && !prep.picks.includes(who)) continue;
      for (const [slot, uid] of Object.entries(slots)) {
        if (!uid) continue;
        const it = DT.lobby.stashTake(meta, uid);
        if (it && DT.items.def(it.id).slot === slot) (out.equip[who] = out.equip[who] || {})[slot] = it;
        else if (it) meta.stash.push(it);
      }
    }
    for (const uid of (prep.bag || []).slice(0, DT.config.items.bag)) {
      const it = DT.lobby.stashTake(meta, uid);
      if (it) out.bag.push(it);
    }
    return out;
  },
};
