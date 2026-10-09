// 전투 흐름: 내 턴 → 동료 행동 → 적 행동, 카드 사용, 승패 판정.
window.DT = window.DT || {};

(function () {
  const C = (DT.combat = {});
  const log = (s, m) => DT.state.log(s, m);

  C.living = (state) => state.enemies.filter((e) => !e.dead);
  // 강탈 기준선(시간 도둑의 낫: 도둑의 기준이 올라감)
  C.heistThreshold = (state) => Math.max(DT.config.heist.threshold, state ? DT.items.fx(state.player, 'heistThreshold') : 0);
  C.belowHeistLine = (e, state) => e.hp <= e.maxHp * C.heistThreshold(state);

  // 이번 턴 실제 비용: 만능 열쇠검으로 얻은 카드 0, 손재주 비약이면 슬쩍하기 0
  C.costFor = function (state, card) {
    if (card.free) return 0;
    if (card.id === 'pilfer' && state.turnFlags && state.turnFlags.freePilfer) return 0;
    return DT.cards.costOf(card);
  };

  C.start = function (state, enemyKinds) {
    const p = state.player;
    p.drawPile = DT.rng.shuffle(state, p.masterDeck.map((c) => Object.assign({}, c)));
    p.hand = []; p.discardPile = []; p.exhaustPile = [];
    p.block = 0; p.statuses = {};
    // 장비: 손패 최대·드로우(도둑 길드 배지)
    const P = DT.config.player;
    p.maxHand = P.maxHand + DT.items.fx(p, 'handMax');
    p.drawPerTurn = P.draw + DT.items.fx(p, 'drawBonus');
    DT.party.prepare(state);
    for (const a of DT.party.living(state)) a.cheatedDeath = false;
    state.enemies = [];
    enemyKinds.forEach((k) => state.enemies.push(DT.enemy.create(state, k)));
    state.turn = 0; state.result = null; state.orders = {};
    C.mutate(state);
    state.enemies.forEach((e) => { DT.enemy.refill(state, e); DT.enemy.plan(state, e); });
    log(state, `${state.enemies.map((e) => e.name).join(', ')}이(가) 나타났다!`);
    C.startPlayerTurn(state);
    // 누더기 망토: 전투 시작 방어도 (첫 턴 방어도 초기화 뒤에 준다)
    for (const a of DT.party.living(state)) {
      const b = DT.items.fx(a, 'combatBlock');
      if (b) DT.effects.gainBlock(state, a.id, b);
    }
  };

  // 차원 불안정 변이: 이번 전투 동안 덱의 카드 몇 장이 '차원 잡음' 또는 다른 차원 카드로 바뀐다
  C.mutate = function (state) {
    const info = DT.run.instabilityInfo(state);
    const I = DT.config.instability;
    if (info.level === 'safe' || info.ignored) return;
    const n = info.level === 'critical' ? I.mutateCritical : I.mutateUnstable;
    const pile = state.player.drawPile;
    const foreign = Object.entries(DT.data.cards).filter(([, c]) => c.rarity && c.origin !== state.dimension && !DT.data.dimensions[c.origin].neutral).map(([id]) => id);
    for (let k = 0; k < n && pile.length; k++) {
      const i = DT.rng.int(state, 0, pile.length - 1);
      const old = pile[i];
      const id = DT.rng.next(state) < I.noiseChance || !foreign.length ? 'rift_noise' : DT.rng.pick(state, foreign);
      pile[i] = DT.state.makeCard(state, id, { temp: true, mutated: true });
      log(state, `🌀 차원 불안정! [${DT.cards.nameOf(old)}] → [${DT.cards.def(id).name}] (이번 전투)`);
    }
    DT.state.emit(state, { type: 'passive', target: 'player', text: `🌀 변이 ${n}장` });
  };

  // when: 'turnStart' | 'turnEnd'
  C.tickStatuses = function (state, id, when) {
    const a = DT.state.actor(state, id);
    const defs = DT.data.statuses;
    for (const key of Object.keys(a.statuses)) {
      const d = defs[key];
      const v = a.statuses[key];
      if (!d) continue;
      if (when === 'turnStart' && d.turnStartHitAll && v > 0 && !a.dead) {   // 자동 포탑
        const foes = DT.state.isAlly(id) ? C.living(state).map((e) => e.id) : DT.party.living(state).map((x) => x.id);
        log(state, `${a.name}: ${d.name} 발동`);
        foes.forEach((f) => DT.effects.applyDamage(state, f, d.turnStartHitAll * v, { source: id }));
        if (state.result) return;
      }
      if (when === 'turnStart' && d.turnStartDamage && v > 0 && !a.dead) {
        log(state, `${a.name}: ${d.name} 피해 ${v}`);
        DT.effects.applyDamage(state, id, v, { ignoreBlock: true });
      }
      if (d.decay === when && a.statuses[key] !== undefined) {
        a.statuses[key] = v > 0 ? v - 1 : v;
        if (a.statuses[key] === 0) delete a.statuses[key];
      }
    }
  };

  // 가지고 있는 카드의 지속 효과(예: 왕관). 덱·손패·버린 더미 어디에 있든 발동
  C.runPassives = function (state, id, when) {
    const a = DT.state.actor(state, id);
    if (!a || a.dead) return;
    const owned = [...(a.hand || []), ...(a.drawPile || []), ...(a.discardPile || [])];
    for (const card of owned) {
      const def = DT.cards.def(card.id);
      if (!def.passive || def.passive.on !== when) continue;
      log(state, `${a.name}: [${def.name}]의 힘`);
      DT.effects.resolveEffects(DT.effects.makeCtx(state, id, null, card, null, id), def.passive.effects);
      if (state.result) return;
    }
  };

  // 아군 턴 시작: 아군 전원 방어도 초기화·상태 처리, 도둑 드로우, 동료 행동 계획
  C.startPlayerTurn = function (state) {
    const p = state.player;
    state.turn++;
    state.phase = 'player';
    state.orders = {};
    state.turnFlags = {};
    for (const a of DT.party.living(state)) {
      a.block = 0;                     // 방어도는 내 턴 시작 시 사라짐
      C.tickStatuses(state, a.id, 'turnStart');
      C.runPassives(state, a.id, 'turnStart');
      if (state.result) return;
    }
    // 차원 불안정 폭주: 매 턴 피해
    const inst = DT.run.instabilityInfo(state);
    if (inst.level === 'critical' && !inst.ignored) {
      log(state, `🌀 차원 불안정 폭주: 피해 ${DT.config.instability.critDamage}`);
      DT.effects.applyDamage(state, 'player', DT.config.instability.critDamage, { ignoreBlock: true });
      if (state.result) return;
    }
    p.energy = p.maxEnergy;
    for (const e of C.living(state)) e.heistReady = C.belowHeistLine(e, state);
    DT.deck.draw(state, p, p.drawPerTurn + (state.turn === 1 ? DT.items.fx(p, 'firstTurnDraw') : 0));
    for (const c of DT.party.companions(state)) DT.ai.planCompanion(state, c);
  };

  // allyId: 방어·회복 카드를 줄 아군(생략 시 자신)
  C.canPlay = function (state, uid, allyId) {
    if (state.phase !== 'player' || state.result) return { ok: false, reason: '지금은 카드를 낼 수 없습니다' };
    const p = state.player;
    const card = p.hand.find((c) => c.uid === uid);
    if (!card) return { ok: false, reason: '손패에 없는 카드' };
    const def = DT.cards.def(card.id);
    if (def.unplayable) return { ok: false, reason: '사용할 수 없는 카드' };
    if (C.costFor(state, card) > p.energy) return { ok: false, reason: '에너지가 부족합니다' };
    // 대상이 필요한 카드는 대상 후보 중 하나라도 가능하면 선택 허용
    if (DT.cards.needsTarget(def)) {
      const reasons = C.living(state).map((e) => DT.effects.canUse(state, 'player', e.id, card, null, allyId));
      if (reasons.length && reasons.every(Boolean)) return { ok: false, reason: reasons[0] };
    } else {
      const why = DT.effects.canUse(state, 'player', null, card, null, allyId);
      if (why) return { ok: false, reason: why };
    }
    if (DT.cards.needsCompanion(def) && !DT.party.companions(state).length) return { ok: false, reason: '동료가 없습니다' };
    return { ok: true, card, def };
  };

  C.playCard = function (state, uid, tgtId, choice, allyId) {
    const chk = C.canPlay(state, uid, allyId);
    if (!chk.ok) return chk;
    const { card, def } = chk;
    const p = state.player;
    if (DT.cards.needsTarget(def)) {
      const t = DT.state.actor(state, tgtId);
      if (!t || t.dead || DT.state.isAlly(tgtId)) return { ok: false, reason: '대상 적을 탭하세요' };
    } else {
      tgtId = null;
    }
    if (allyId && (!DT.state.isAlly(allyId) || DT.state.actor(state, allyId).dead)) allyId = null;
    if (DT.cards.needsCompanion(def) && (!allyId || allyId === 'player')) return { ok: false, reason: '동료를 탭하세요' };
    const why = DT.effects.canUse(state, 'player', tgtId, card, choice, allyId);
    if (why) return { ok: false, reason: why };

    p.energy -= C.costFor(state, card);
    DT.deck.removeFromHand(p, uid);
    DT.state.emit(state, { type: 'play', actor: 'player', card: Object.assign({}, card) });
    const toAlly = allyId && allyId !== 'player' ? ` → ${DT.state.actor(state, allyId).name}` : '';
    log(state, `나: [${DT.cards.nameOf(card)}]${toAlly}`);
    DT.effects.resolveCard(state, 'player', tgtId, card, choice, allyId);
    C.maybeTwice(state, 'player', card, tgtId, allyId);
    DT.deck.afterPlay(state, p, card);
    C.checkEnd(state);
    return { ok: true };
  };

  // 쌍단검: 매 턴 첫 공격 카드를 한 번 더
  C.maybeTwice = function (state, id, card, tgtId, allyId) {
    const a = DT.state.actor(state, id);
    state.turnFlags = state.turnFlags || {};
    const key = 'firstAttack:' + id;
    if (state.result || state.turnFlags[key] || !DT.cards.isAttack(DT.cards.def(card.id))) return;
    state.turnFlags[key] = true;
    if (!DT.items.fx(a, 'firstAttackTwice')) return;
    const t = tgtId && DT.state.actor(state, tgtId);
    if (tgtId && (!t || t.dead)) return;
    DT.state.log(state, `${a.name}: 쌍단검! 한 번 더`);
    DT.effects.resolveCard(state, id, tgtId, card, null, allyId);
  };

  // 내 턴 종료 → 동료 행동 단계
  C.endPlayerTurn = function (state) {
    if (state.phase !== 'player' || state.result) return;
    for (const a of DT.party.living(state)) {
      C.tickStatuses(state, a.id, 'turnEnd');
      const h = DT.items.fx(a, 'turnEndHeal');   // 회복 로브
      if (h && !a.dead) DT.effects.heal(state, a.id, h);
    }
    DT.deck.discardHand(state, state.player);
    state.phase = 'ally';
    for (const c of DT.party.companions(state)) c.pending = !!c.intent;
  };

  // 동료 1명 행동. 더 할 게 없으면 false.
  C.allyAct = function (state) {
    if (state.phase !== 'ally' || state.result) return false;
    const c = DT.party.companions(state).find((x) => x.pending);
    if (!c) return false;
    c.pending = false;
    const act = DT.ai.finalizeCompanion(state, c);
    c.intent = null;
    if (!act || C.living(state).length === 0) return true;
    if (act.basic) {
      const t = DT.state.actor(state, act.targetId);
      DT.state.emit(state, { type: 'basic', actor: c.id, target: act.targetId });
      log(state, `${c.name}: 기본 공격 → ${t.name}`);
      DT.effects.dealDamage(state, c.id, act.targetId, c.basicAttack);
    } else {
      const def = DT.cards.def(act.card.id);
      DT.deck.removeFromHand(c, act.card.uid);
      DT.state.emit(state, { type: 'play', actor: c.id, card: Object.assign({}, act.card) });
      const to = act.targetId ? ` → ${DT.state.actor(state, act.targetId).name}`
        : act.allyId && act.allyId !== c.id ? ` → ${DT.state.actor(state, act.allyId).name}` : '';
      log(state, `${c.name}: [${def.name}]${to}`);
      DT.effects.resolveCard(state, c.id, act.targetId, act.card, null, act.allyId);
      C.maybeTwice(state, c.id, act.card, act.targetId, act.allyId);
      DT.deck.afterPlay(state, c, act.card);
    }
    C.checkEnd(state);
    return true;
  };

  // 동료 행동 끝 → 적 행동 단계 시작
  C.beginEnemyPhase = function (state) {
    if (state.phase !== 'ally' || state.result) return;
    state.phase = 'enemy';
    for (const e of C.living(state)) {
      e.block = 0;                     // 적 방어도도 자기 턴 시작 시 사라짐
      C.tickStatuses(state, e.id, 'turnStart');
      C.runPassives(state, e.id, 'turnStart');
      if (state.result) return;
      e.pending = e.dead || e.skipTurn ? 0 : e.intent;   // 연막 수류탄
      e.skipTurn = false;
    }
  };

  // 적 행동 1회. 더 할 게 없으면 false.
  C.enemyAct = function (state) {
    if (state.phase !== 'enemy' || state.result) return false;
    const e = C.living(state).find((x) => x.pending > 0);
    if (!e) return false;
    if (!e.hand.length) { e.pending = 0; return true; }
    DT.enemy.act(state, e);
    C.checkEnd(state);
    return true;
  };

  C.endEnemyTurn = function (state) {
    if (state.phase !== 'enemy' || state.result) return;
    for (const e of C.living(state)) {
      e.pending = 0;
      C.tickStatuses(state, e.id, 'turnEnd');
      DT.enemy.refill(state, e);
      DT.enemy.plan(state, e);         // 다음 턴 행동 수·대상 (동료 AI가 이를 보고 판단)
    }
    C.startPlayerTurn(state);
  };

  C.checkEnd = function (state) {
    if (state.result) return;
    if (state.player.hp <= 0) {
      state.result = 'lose';
    } else if (state.enemies.length && !C.living(state).length) {
      state.result = 'win';
    } else {
      return;
    }
    state.phase = 'over';
    log(state, state.result === 'win' ? '승리!' : '패배...');
  };
})();
