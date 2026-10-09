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
  // loadout: 출발 준비 결과(DT.lobby.takeLoadout). 있으면 동료·장비·가방을 채우고 바로 맵으로
  R.start = function (seed, meta, loadout) {
    const s = DT.state.createRun(seed);
    s.screen = 'pickCompanion';
    DT.lobby.applyToRun(s, meta || { coins: 0, upgrades: {}, unlocked: [] });
    if (loadout && loadout.picks.length) {
      R.pickCompanion(s, loadout.picks);
      const byKind = {};
      s.allies.forEach((a) => { byKind[a.kind] = a; });
      for (const [who, slots] of Object.entries(loadout.equip)) {
        const a = who === 'player' ? s.player : byKind[who];
        for (const it of Object.values(slots)) {
          const item = Object.assign(DT.items.make(s, it.id), { plus: it.plus || 0 });
          if (!a || !DT.items.equipDirect(a, item)) DT.items.addToBag(s, item);
        }
      }
      loadout.bag.forEach((it) => DT.items.addToBag(s, Object.assign(DT.items.make(s, it.id), { plus: it.plus || 0 })));
    }
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
    // 유물 수집가: 후보 중 1개를 골라 출발
    if (state.relicPicks > 0) {
      state.relicChoices = DT.relics.startOptions(state, state.relicPicks);
      state.screen = 'pickRelic';
    }
    return true;
  };

  R.pickRelic = function (state, id) {
    if (state.screen !== 'pickRelic' || !state.relicChoices.includes(id)) return false;
    DT.relics.gain(state, id);
    state.relicChoices = null;
    state.screen = 'map';
    return true;
  };

  // ── 차원·깊이 ──
  R.dimOrder = (state) => DT.data.dimensions[state.dimension].order || 1;
  // 깊이: 1차원 1층 = 1, 2차원 1층 = 13 …
  R.depth = (state) => (R.dimOrder(state) - 1) * cfg().map.floors + (state.floor || 0);
  R.depthLabel = function (depth) {
    const F = cfg().map.floors;
    if (!depth) return '-';
    const order = Math.min(4, Math.floor((depth - 1) / F) + 1);
    const dim = Object.values(DT.data.dimensions).find((d) => d.order === order);
    return `${dim ? dim.name : order + '차원'} ${depth - (order - 1) * F}층`;
  };

  // 보스 격파 → 다음 차원
  R.nextDimension = function (state) {
    if (state.screen !== 'dimClear') return false;
    const next = DT.data.dimensions[state.dimension].next;
    state.dimension = next;
    state.instabilityMod = 0;          // 차원 안정제는 그 차원 동안만
    state.floor = 0;
    state.pos = null;
    state.lastEncounter = null;
    state.map = DT.map.generate(state);
    state.freeNaturalize = cfg().dimension.freeNaturalize;
    for (const a of DT.party.living(state)) a.hp = Math.min(a.maxHp, a.hp + Math.round(a.maxHp * cfg().dimension.travelHeal));
    state.screen = 'map';
    log(state, `── ${DT.data.dimensions[next].name} ──`);
    DT.state.emit(state, { type: 'dimension', dimension: next });
    return true;
  };

  // ── 차원 불안정 ──
  // 도둑 덱(영구)에서 현재 차원과 출신이 다른 카드 수(중립 출신 제외) + 안정제 보정
  R.instability = function (state) {
    const dims = DT.data.dimensions;
    const n = state.player.masterDeck.filter((c) => c.origin !== state.dimension && !(dims[c.origin] && dims[c.origin].neutral)).length;
    return Math.max(0, n + (state.instabilityMod || 0) + DT.relics.fx(state, 'instabilityAdd'));
  };
  // { value, level: 'safe' | 'unstable' | 'critical', safeMax, unstableMax, ignored }
  R.instabilityInfo = function (state) {
    const I = cfg().instability;
    const extra = DT.items.partyFx(state, 'instabilityLimit');   // 차원 나침반: 한도 +2
    const safeMax = I.safeMax + extra;
    const unstableMax = I.unstableMax + extra;
    const value = R.instability(state);
    const level = value <= safeMax ? 'safe' : value <= unstableMax ? 'unstable' : 'critical';
    return { value, level, safeMax, unstableMax, ignored: !!DT.items.fx(state.player, 'ignoreInstability') };
  };

  // 귀화: 카드 출신을 현재 차원으로
  R.naturalizable = (state) => state.player.masterDeck.filter((c) => c.origin !== state.dimension
    && !(DT.data.dimensions[c.origin] && DT.data.dimensions[c.origin].neutral));
  R.naturalize = function (state, uid) {
    const c = state.player.masterDeck.find((x) => x.uid === uid);
    if (!c || !R.naturalizable(state).includes(c)) return false;
    const from = DT.data.dimensions[c.origin].name;
    c.origin = state.dimension;
    log(state, `[${DT.cards.nameOf(c)}] 귀화: ${from} → ${DT.data.dimensions[state.dimension].name}`);
    return true;
  };

  // 차원 이동 직후 받은 무료 귀화(맵에서 언제든)
  R.freeNaturalize = function (state, uid) {
    if (state.screen !== 'map' || !(state.freeNaturalize > 0) || !R.naturalize(state, uid)) return false;
    state.freeNaturalize--;
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
        const chance = Math.min(W.ambushCap, state.wanted * W.ambushPerWanted) * (1 - DT.relics.fx(state, 'ambushMult'));   // 경보 교란기
        const ambush = DT.rng.next(state) < chance;
        if (ambush) log(state, '🚨 수배 추격대가 나타났다! (정예 전투)');
        R.startCombat(state, ambush ? 'elite' : 'normal');
        break;
      }
      case 'elite': R.startCombat(state, 'elite'); break;
      case 'boss': R.startCombat(state, 'boss'); break;
      case 'hideout': state.screen = 'hideout'; break;
      case 'market': R.openMarket(state); break;
      case 'event': R.openEvent(state); break;
      case 'rift': R.openRift(state); break;
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
    const gold = Math.round((DT.rng.int(state, range[0], range[1]) + state.wanted * G.perWanted)
      * (1 + DT.relics.fx(state, 'goldMult')) * (G.dimMult[R.dimOrder(state) - 1] || 1));
    const C = cfg().coins;
    const mult = kind === 'boss' ? C.bossMult : kind === 'elite' ? C.eliteMult : 1;
    const itemMult = (1 + DT.items.partyFx(state, 'coinMult')) * (DT.items.partyFx(state, 'greed') ? 2 : 1);
    const coins = Math.round((C.base + R.depth(state) * C.perFloor) * mult * itemMult);
    state.gold += gold;
    state.runCoins += coins;
    const drops = DT.items.dropsFor(state, kind);
    // 유물: 정예(수배 추격대 포함) 승리마다 1개 / 피 묻은 주사위 회복
    const relic = kind === 'elite' ? DT.relics.roll(state, 'elite') : null;
    if (relic) DT.relics.gain(state, relic);
    const wh = DT.relics.fx(state, 'winHeal');
    if (wh && state.player.hp > 0) DT.effects.heal(state, 'player', wh);
    state.lastLoot = { gold, coins, items: drops.got, lostItems: drops.lost, relic };

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

  // 수배도 상승(수배 전단: 오를 때마다 골드)
  R.raiseWanted = function (state, n) {
    state.wanted += n;
    const g = DT.items.partyFx(state, 'wantedGold');
    if (g) { state.gold += g * n; log(state, `수배 전단: 골드 +${g * n}`); }
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
    R.raiseWanted(state, 1);
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
    R.raiseWanted(state, 1);
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
  // 보스 보상 뒤: 다음 차원이 있으면 차원 이동 화면, 마지막(지옥)이면 클리어
  function afterReward(state) {
    const fromBoss = state.reward && state.reward.kind === 'boss';
    state.reward = null;
    if (!fromBoss) state.screen = 'map';
    else if (DT.data.dimensions[state.dimension].next) state.screen = 'dimClear';
    else R.endRun(state, 'clear');
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
      items: DT.items.marketStock(state),
      relic: null,
    };
    if (DT.rng.next(state) < cfg().relics.marketChance) {
      const id = DT.relics.roll(state, 'market');
      if (id) state.market.relic = { id, price: DT.relics.price(id), sold: false };
    }
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

  R.buyItem = function (state, i) {
    const m = state.market;
    const e = m && m.items && m.items[i];
    if (state.screen !== 'market' || !e || e.sold || state.gold < e.price) return '골드가 부족합니다';
    if (DT.items.bagFree(state) <= 0) return '가방이 가득 찼습니다';
    state.gold -= e.price;
    e.sold = true;
    DT.items.addToBag(state, e.item);
    log(state, `암시장에서 ${DT.items.def(e.item.id).name} 구입 (−${e.price} 골드)`);
    return null;
  };

  R.buyRelic = function (state) {
    const e = state.market && state.market.relic;
    if (state.screen !== 'market' || !e || e.sold || state.gold < e.price) return false;
    state.gold -= e.price;
    e.sold = true;
    DT.relics.gain(state, e.id);
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

  R.hideoutNaturalize = function (state, uid) {
    if (state.screen !== 'hideout' || !R.naturalize(state, uid)) return false;
    state.screen = 'map';
    return true;
  };

  R.naturalizePrice = (state) => cfg().naturalize.marketBase + cfg().naturalize.marketStep * (state.naturalizeCount || 0);
  R.marketNaturalize = function (state, uid) {
    const m = state.market;
    if (state.screen !== 'market' || !m || m.naturalized || state.gold < R.naturalizePrice(state)) return false;
    const price = R.naturalizePrice(state);
    if (!R.naturalize(state, uid)) return false;
    state.gold -= price;
    state.naturalizeCount = (state.naturalizeCount || 0) + 1;
    m.naturalized = true;
    return true;
  };

  R.leave = function (state) {
    if (!['market', 'hideout'].includes(state.screen)) return false;
    state.market = null;
    state.screen = 'map';
    return true;
  };

  // ── 차원 균열: 다음 차원 카드 1장(불안정 +1) ──
  R.openRift = function (state) {
    const next = DT.data.dimensions[state.dimension].next;
    const pool = Object.entries(DT.data.cards).filter(([, c]) => c.rarity && c.origin === next).map(([id]) => id);
    DT.rng.shuffle(state, pool);
    state.rift = { dimension: next, options: pool.slice(0, cfg().rift.choices) };
    state.screen = 'rift';
  };
  R.takeRift = function (state, cardId) {
    if (state.screen !== 'rift' || !state.rift.options.includes(cardId)) return false;
    state.player.masterDeck.push(DT.state.makeCard(state, cardId));
    log(state, `🌀 차원 균열에서 [${DT.cards.def(cardId).name}]을(를) 가져왔다. 차원 불안정 ${R.instability(state)}`);
    state.rift = null;
    state.screen = 'map';
    return true;
  };
  R.skipRift = function (state) {
    if (state.screen !== 'rift') return false;
    state.rift = null;
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
    if (opt.requires && opt.requires.wanted && state.wanted < opt.requires.wanted) return false;
    return true;
  };

  // 각 효과는 결과 화면에 보여 줄 문장을 out 에 넣는다
  const EVENT_EFFECTS = {
    gold(state, e, out) {
      const before = state.gold;
      state.gold = Math.max(0, state.gold + e.value);
      out.push(`💰 골드 ${state.gold - before >= 0 ? '+' : ''}${state.gold - before}`);
    },
    goldPerWanted(state, e, out) {
      const g = state.wanted * e.value;
      state.gold += g;
      out.push(`💰 골드 +${g} (수배도 ${state.wanted} × ${e.value})`);
    },
    wanted(state, e, out) {
      const before = state.wanted;
      if (e.value > 0) R.raiseWanted(state, e.value); else state.wanted = Math.max(0, state.wanted + e.value);
      out.push(`🚨 수배도 ${before} → ${state.wanted}`);
    },
    heal(state, e, out) { DT.party.living(state).forEach((a) => { a.hp = Math.min(a.maxHp, a.hp + e.value); }); out.push(`💚 아군 전원 체력 +${e.value}`); },
    hurt(state, e, out) { state.player.hp = Math.max(1, state.player.hp - e.value); out.push(`💔 도둑 체력 −${e.value}`); },
    companionHurt(state, e, out) {
      if (!DT.party.companions(state).length) return;
      DT.party.companions(state).forEach((a) => { a.hp = Math.max(1, a.hp - e.value); });
      out.push(`💔 동료 전원 체력 −${e.value}`);
    },
    maxHp(state, e, out) { state.player.maxHp += e.value; state.player.hp += e.value; out.push(`❤️ 도둑 최대 체력 +${e.value}`); },
    upgrade(state, e, out) {
      const list = state.player.masterDeck.filter((c) => DT.cards.canUpgrade(c));
      const c = DT.rng.pick(state, list);
      if (c) { c.up = 1; log(state, `[${DT.cards.nameOf(c)}] 강화!`); out.push(`⚒️ [${DT.cards.nameOf(c)}] 강화`); }
    },
    card(state, e, out) {
      state.reward = { options: DT.reward.cardChoices(state, e.rarity === 'elite'), kind: 'event' };
      out.push('🃏 카드 1장을 고른다');
    },
    // 유물 1개(grades 로 등급 제한 가능). 남은 유물이 없으면 대신 골드
    relic(state, e, out) {
      const id = DT.relics.roll(state, 'event', e.grades);
      if (id) { DT.relics.gain(state, id); const d = DT.relics.def(id); out.push(`🏺 유물 ${d.icon} ${d.name} — ${d.desc}`); }
      else EVENT_EFFECTS.gold(state, { value: 50 }, out);
    },
    // 확률: p 로 win, 아니면 lose 효과 목록
    chance(state, e, out) {
      const ok = DT.rng.next(state) < e.p;
      out.push(ok ? `✨ ${e.winText || '성공!'}` : `💨 ${e.loseText || '실패…'}`);
      (ok ? e.win : e.lose || []).forEach((x) => EVENT_EFFECTS[x.type](state, x, out));
    },
  };

  R.chooseEvent = function (state, i) {
    if (state.screen !== 'event' || !R.canChooseEvent(state, i)) return false;
    const ev = DT.data.events[state.event];
    const opt = ev.options[i];
    log(state, `${ev.title}: ${opt.label}`);
    state.reward = null;
    const out = [];
    (opt.effects || []).forEach((e) => EVENT_EFFECTS[e.type] && EVENT_EFFECTS[e.type](state, e, out));
    // 결과 화면 → (카드 보상) → 맵
    state.eventOutcome = { event: state.event, label: opt.label, notes: out.length ? out : ['아무 일도 없었다'] };
    state.event = null;
    state.screen = 'eventResult';
    return true;
  };

  R.closeEvent = function (state) {
    if (state.screen !== 'eventResult') return false;
    state.eventOutcome = null;
    state.screen = state.reward ? 'reward' : 'map';
    return true;
  };
  R.EVENT_EFFECTS = EVENT_EFFECTS;

  // ── 도주·판 종료 ──
  R.canEscape = function (state) {
    if (['pickCompanion', 'pickRelic', 'runEnd'].includes(state.screen)) return false;
    return !(state.screen === 'combat' && state.combatKind === 'boss');
  };

  R.escape = function (state) {
    if (!R.canEscape(state)) return false;
    R.endRun(state, state.screen === 'combat' ? 'combatEscape' : 'mapEscape');
    return true;
  };

  // how: 'mapEscape' | 'combatEscape' | 'death' | 'clear' | 'scroll'(귀환 두루마리)
  R.endRun = function (state, how) {
    const keep = cfg().coins.keep[how];
    const banked = Math.floor(state.runCoins * keep);
    const items = DT.items.settle(state, how);
    state.runEnd = { how, runCoins: state.runCoins, banked, keep, floor: state.floor, depth: R.depth(state), dimension: state.dimension, items };
    state.screen = 'runEnd';
    state.phase = 'over';
    const words = { mapEscape: '맵에서 도주', combatEscape: '전투 중 도주', death: '사망', clear: '차원 클리어', scroll: '귀환 두루마리' };
    log(state, `판 종료: ${words[how]} · 코인 ${banked} 보존 · 아이템 ${items.kept.length}개 보존, ${items.lost.length}개 분실`);
    DT.state.emit(state, { type: 'runEnd', how, banked, floor: R.depth(state), keptItems: items.kept });
  };
})();
