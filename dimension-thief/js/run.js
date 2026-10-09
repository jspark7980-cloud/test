// 한 판(런) 진행
//  동료 선택 → 맵 → 노드(전투·정예·보스·은신처·암시장·이벤트) → … → 보스 → 판 종료
//  전투 승리: 골드·코인 → 강탈(카드 또는 동료 영입) → 카드 보상 → 맵
//  판 종료(도주·사망·클리어) 시 이번 판 코인을 비율대로 보존한다.
window.DT = window.DT || {};

(function () {
  const R = (DT.run = {});
  const log = (s, m) => DT.state.log(s, m);
  const cfg = () => DT.config;

  // meta: 로비 영구 데이터(강화·해금). 없으면 강화 없이 시작
  R.start = function (seed, meta) {
    const s = DT.state.createRun(seed);
    s.screen = 'pickCompanion';
    DT.lobby.applyToRun(s, meta || { coins: 0, upgrades: {}, unlocked: [] });
    return s;
  };

  // kinds: 고른 동료 id (문자열 하나 또는 배열, 최대 companionPicks 명)
  R.pickCompanion = function (state, kinds) {
    kinds = [].concat(kinds);
    const ok = state.screen === 'pickCompanion' && kinds.length >= 1 && kinds.length <= state.companionPicks
      && new Set(kinds).size === kinds.length && kinds.every((k) => state.starterOptions.includes(k));
    if (!ok) return false;
    kinds.forEach((k) => DT.party.add(state, k, false));
    state.starterOptions = null;
    state.gold = cfg().gold.start + (state.goldBonus || 0);
    state.map = DT.map.generate(state);
    state.pos = null;
    state.screen = 'map';
    log(state, `── ${DT.data.dimensions[state.dimension].name} ──`);
    return true;
  };

  // ── 맵 ──
  R.enterNode = function (state, nodeId) {
    if (state.screen !== 'map' || !DT.map.reachable(state).includes(nodeId)) return false;
    const n = state.map.nodes[nodeId];
    state.pos = nodeId;
    state.floor = n.floor;
    n.visited = true;
    switch (n.type) {
      case 'combat': {
        const W = cfg().wanted;
        const ambush = DT.rng.next(state) < Math.min(W.ambushCap, state.wanted * W.ambushPerWanted);
        if (ambush) log(state, '🚨 수배 추격대가 나타났다! (정예 전투)');
        R.startCombat(state, ambush ? 'elite' : 'normal');
        break;
      }
      case 'elite': R.startCombat(state, 'elite'); break;
      case 'boss': R.startCombat(state, 'boss'); break;
      case 'hideout': state.screen = 'hideout'; break;
      case 'market': R.openMarket(state); break;
      case 'event': R.openEvent(state); break;
      default: state.screen = 'map';
    }
    return true;
  };

  R.pickEncounter = function (state, kind) {
    const E = DT.data.encounters[state.dimension];
    let list = E[kind] || E.normal;
    if (kind === 'normal') {
      const tier = state.floor <= cfg().encounters.tier1UntilFloor ? 1 : 2;
      const t = list.filter((e) => e.tier === tier && e.id !== state.lastEncounter);
      if (t.length) list = t;
    }
    const pool = list.filter((e) => e.id !== state.lastEncounter);
    return DT.rng.pick(state, pool.length ? pool : list);
  };

  R.startCombat = function (state, kind) {
    const enc = R.pickEncounter(state, kind);
    state.lastEncounter = enc.id;
    state.combatKind = kind;
    state.screen = 'combat';
    state.heist = null;
    state.reward = null;
    log(state, `── ${state.floor}층 ${DT.map.label(kind === 'normal' ? 'combat' : kind)} ──`);
    DT.combat.start(state, enc.enemies);
  };

  // 전투가 끝났으면 다음 화면으로. 상태가 바뀌면 true.
  R.resolve = function (state) {
    if (state.screen !== 'combat' || !state.result) return false;
    if (state.result === 'lose') {
      R.endRun(state, 'death');
      return true;
    }
    state.stats.kills += state.enemies.length;
    DT.party.removeFallen(state);

    // 골드·코인
    const kind = state.combatKind || 'normal';
    const G = cfg().gold;
    const range = G[kind === 'normal' ? 'combat' : kind];
    const gold = DT.rng.int(state, range[0], range[1]) + state.wanted * G.perWanted;
    const C = cfg().coins;
    const mult = kind === 'boss' ? C.bossMult : kind === 'elite' ? C.eliteMult : 1;
    const coins = Math.round((C.base + state.floor * C.perFloor) * mult);
    state.gold += gold;
    state.runCoins += coins;
    state.lastLoot = { gold, coins };

    const seen = new Set();
    const groups = state.enemies.filter((e) => e.executed && !seen.has(e.kind) && seen.add(e.kind)).map((e) => ({
      enemyName: e.name, kind: e.kind, options: DT.reward.heistOptions(e.kind),
      role: DT.data.enemies[e.kind].role || null,
    }));
    state.heist = groups.length ? { picksLeft: Math.min(cfg().heist.maxPerCombat, groups.length), groups } : null;
    state.reward = { options: DT.reward.cardChoices(state, kind !== 'normal'), kind };
    state.screen = state.heist ? 'heist' : 'reward';
    DT.state.emit(state, { type: 'victory', floor: state.floor, kind });
    return true;
  };

  // ── 강탈 ──
  // 강탈 가능한 적이 여럿이면 그중 한 적의 카드 1장을 고른다(전투당 maxPerCombat 회)
  R.takeHeist = function (state, cardId) {
    const h = state.heist;
    if (state.screen !== 'heist' || !h) return false;
    const gi = h.groups.findIndex((g) => g.options.includes(cardId));
    if (gi < 0) return false;
    const g = h.groups.splice(gi, 1)[0];
    state.player.masterDeck.push(DT.state.makeCard(state, cardId));
    state.wanted++;
    state.stats.heists++;
    log(state, `강탈! [${DT.cards.def(cardId).name}]이(가) 덱에 영구히 추가됐다. 수배도 +1`);
    DT.state.emit(state, { type: 'heist', cardId, from: g.kind });
    h.picksLeft--;
    if (h.picksLeft <= 0 || !h.groups.length) { state.heist = null; state.screen = 'reward'; }
    return true;
  };

  // 강탈한 적을 동료로 영입(역할 계승). 슬롯이 가득 차면 replaceId(내보낼 동료)가 필요하다.
  R.recruit = function (state, kind, replaceId) {
    const h = state.heist;
    if (state.screen !== 'heist' || !h) return { ok: false };
    const gi = h.groups.findIndex((g) => g.kind === kind && g.role);
    if (gi < 0) return { ok: false };
    if (DT.party.slotsFree(state) <= 0 && !replaceId) return { ok: false, needReplace: true };
    const c = DT.party.add(state, kind, true, replaceId);
    if (!c) return { ok: false, needReplace: true };
    h.groups.splice(gi, 1);
    state.wanted++;
    state.stats.heists++;
    state.stats.recruits = (state.stats.recruits || 0) + 1;
    DT.state.emit(state, { type: 'recruit', kind, id: c.id });
    h.picksLeft--;
    if (h.picksLeft <= 0 || !h.groups.length) { state.heist = null; state.screen = 'reward'; }
    return { ok: true };
  };

  R.skipHeist = function (state) {
    if (state.screen !== 'heist') return false;
    state.heist = null;
    state.screen = 'reward';
    return true;
  };

  // ── 카드 보상 ──
  function afterReward(state) {
    const fromBoss = state.reward && state.reward.kind === 'boss';
    state.reward = null;
    if (fromBoss) R.endRun(state, 'clear');
    else state.screen = 'map';
  }

  R.takeReward = function (state, cardId) {
    if (state.screen !== 'reward' || !state.reward || !state.reward.options.includes(cardId)) return false;
    state.player.masterDeck.push(DT.state.makeCard(state, cardId));
    log(state, `[${DT.cards.def(cardId).name}]을(를) 덱에 추가했다.`);
    afterReward(state);
    return true;
  };

  R.skipReward = function (state) {
    if (state.screen !== 'reward') return false;
    afterReward(state);
    return true;
  };

  // ── 은신처: 회복 / 강화 / 잠복(수배도 감소) 중 하나 ──
  R.hideoutRest = function (state) {
    if (state.screen !== 'hideout') return false;
    for (const a of DT.party.living(state)) {
      const amount = Math.round(a.maxHp * cfg().hideout.healRatio);
      a.hp = Math.min(a.maxHp, a.hp + amount);
    }
    log(state, '은신처에서 쉬었다. 아군 전원 체력 회복.');
    state.screen = 'map';
    return true;
  };

  R.upgradeCard = function (state, uid) {
    if (state.screen !== 'hideout') return false;
    const card = state.player.masterDeck.find((c) => c.uid === uid);
    if (!card || !DT.cards.canUpgrade(card)) return false;
    card.up = 1;
    log(state, `[${DT.cards.nameOf(card)}] 강화!`);
    state.screen = 'map';
    return true;
  };

  R.hideoutLayLow = function (state) {
    if (state.screen !== 'hideout') return false;
    const before = state.wanted;
    state.wanted = Math.max(0, state.wanted - cfg().wanted.hideoutReduce);
    log(state, `몸을 숨겼다. 수배도 ${before} → ${state.wanted}`);
    state.screen = 'map';
    return true;
  };

  // ── 암시장: 카드 구매, 카드 제거 (귀화는 G단계) ──
  R.openMarket = function (state) {
    const M = cfg().market;
    const pool = DT.reward.cardChoices(state, false, M.cards);
    state.market = {
      cards: pool.map((id) => ({ id, price: M.price[DT.cards.def(id).rarity] || 60, sold: false })),
      removePrice: M.removeBase + state.removeCount * M.removeStep,
      removed: false,
    };
    state.screen = 'market';
  };

  R.buyCard = function (state, i) {
    const m = state.market;
    const item = m && m.cards[i];
    if (state.screen !== 'market' || !item || item.sold || state.gold < item.price) return false;
    state.gold -= item.price;
    item.sold = true;
    state.player.masterDeck.push(DT.state.makeCard(state, item.id));
    log(state, `암시장에서 [${DT.cards.def(item.id).name}] 구입 (−${item.price} 골드)`);
    return true;
  };

  R.removeCard = function (state, uid) {
    const m = state.market;
    if (state.screen !== 'market' || !m || m.removed || state.gold < m.removePrice) return false;
    const i = state.player.masterDeck.findIndex((c) => c.uid === uid);
    if (i < 0 || state.player.masterDeck.length <= 5) return false;
    const card = state.player.masterDeck.splice(i, 1)[0];
    state.gold -= m.removePrice;
    m.removed = true;
    state.removeCount++;
    log(state, `[${DT.cards.nameOf(card)}]을(를) 덱에서 제거 (−${m.removePrice} 골드)`);
    return true;
  };

  R.leave = function (state) {
    if (!['market', 'hideout'].includes(state.screen)) return false;
    state.market = null;
    state.screen = 'map';
    return true;
  };

  // ── 이벤트 ──
  R.openEvent = function (state) {
    const all = Object.entries(DT.data.events).filter(([, e]) => !e.dimensions || e.dimensions.includes(state.dimension));
    let pool = all.filter(([k]) => !state.seenEvents.includes(k));
    if (!pool.length) pool = all;
    const [key] = DT.rng.pick(state, pool);
    state.seenEvents.push(key);
    state.event = key;
    state.screen = 'event';
  };

  R.canChooseEvent = function (state, i) {
    const ev = DT.data.events[state.event];
    const opt = ev && ev.options[i];
    if (!opt) return false;
    if (opt.requires && opt.requires.gold && state.gold < opt.requires.gold) return false;
    return true;
  };

  const EVENT_EFFECTS = {
    gold(state, e) { state.gold = Math.max(0, state.gold + e.value); },
    wanted(state, e) { state.wanted = Math.max(0, state.wanted + e.value); },
    heal(state, e) { DT.party.living(state).forEach((a) => { a.hp = Math.min(a.maxHp, a.hp + e.value); }); },
    hurt(state, e) { state.player.hp = Math.max(1, state.player.hp - e.value); },
    companionHurt(state, e) { DT.party.companions(state).forEach((a) => { a.hp = Math.max(1, a.hp - e.value); }); },
    upgrade(state) {
      const list = state.player.masterDeck.filter((c) => DT.cards.canUpgrade(c));
      const c = DT.rng.pick(state, list);
      if (c) { c.up = 1; log(state, `[${DT.cards.nameOf(c)}] 강화!`); }
    },
    card(state, e) {
      state.reward = { options: DT.reward.cardChoices(state, e.rarity === 'elite'), kind: 'event' };
    },
  };

  R.chooseEvent = function (state, i) {
    if (state.screen !== 'event' || !R.canChooseEvent(state, i)) return false;
    const ev = DT.data.events[state.event];
    const opt = ev.options[i];
    log(state, `${ev.title}: ${opt.label}`);
    state.reward = null;
    (opt.effects || []).forEach((e) => EVENT_EFFECTS[e.type] && EVENT_EFFECTS[e.type](state, e));
    state.event = null;
    state.screen = state.reward ? 'reward' : 'map';
    return true;
  };
  R.EVENT_EFFECTS = EVENT_EFFECTS;

  // ── 도주·판 종료 ──
  R.canEscape = function (state) {
    if (['pickCompanion', 'runEnd'].includes(state.screen)) return false;
    return !(state.screen === 'combat' && state.combatKind === 'boss');
  };

  R.escape = function (state) {
    if (!R.canEscape(state)) return false;
    R.endRun(state, state.screen === 'combat' ? 'combatEscape' : 'mapEscape');
    return true;
  };

  // how: 'mapEscape' | 'combatEscape' | 'death' | 'clear'
  R.endRun = function (state, how) {
    const keep = cfg().coins.keep[how];
    const banked = Math.floor(state.runCoins * keep);
    state.runEnd = { how, runCoins: state.runCoins, banked, keep, floor: state.floor };
    state.screen = 'runEnd';
    state.phase = 'over';
    const words = { mapEscape: '맵에서 도주', combatEscape: '전투 중 도주', death: '사망', clear: '차원 클리어' };
    log(state, `판 종료: ${words[how]} · 코인 ${banked} 보존`);
    DT.state.emit(state, { type: 'runEnd', how, banked, floor: state.floor });
  };
})();
