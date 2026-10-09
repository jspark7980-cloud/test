// 전투 흐름: 내 턴 → 동료 행동 → 적 행동, 카드 사용, 승패 판정.
window.DT = window.DT || {};

(function () {
  const C = (DT.combat = {});
  const log = (s, m) => DT.state.log(s, m);

  C.living = (state) => state.enemies.filter((e) => !e.dead);
  C.belowHeistLine = (e) => e.hp <= e.maxHp * DT.config.heist.threshold;

  C.start = function (state, enemyKinds) {
    const p = state.player;
    p.drawPile = DT.rng.shuffle(state, p.masterDeck.map((c) => Object.assign({}, c)));
    p.hand = []; p.discardPile = []; p.exhaustPile = [];
    p.block = 0; p.statuses = {};
    DT.party.prepare(state);
    state.enemies = [];
    enemyKinds.forEach((k) => state.enemies.push(DT.enemy.create(state, k)));
    state.turn = 0; state.result = null; state.orders = {};
    state.enemies.forEach((e) => { DT.enemy.refill(state, e); DT.enemy.plan(state, e); });
    log(state, `${state.enemies.map((e) => e.name).join(', ')}이(가) 나타났다!`);
    C.startPlayerTurn(state);
  };

  // when: 'turnStart' | 'turnEnd'
  C.tickStatuses = function (state, id, when) {
    const a = DT.state.actor(state, id);
    const defs = DT.data.statuses;
    for (const key of Object.keys(a.statuses)) {
      const d = defs[key];
      const v = a.statuses[key];
      if (!d) continue;
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

  // 아군 턴 시작: 아군 전원 방어도 초기화·상태 처리, 도둑 드로우, 동료 행동 계획
  C.startPlayerTurn = function (state) {
    const p = state.player;
    state.turn++;
    state.phase = 'player';
    state.orders = {};
    for (const a of DT.party.living(state)) {
      a.block = 0;                     // 방어도는 내 턴 시작 시 사라짐
      C.tickStatuses(state, a.id, 'turnStart');
      if (state.result) return;
    }
    p.energy = p.maxEnergy;
    for (const e of C.living(state)) e.heistReady = C.belowHeistLine(e);
    DT.deck.draw(state, p, p.drawPerTurn);
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
    if (def.cost > p.energy) return { ok: false, reason: '에너지가 부족합니다' };
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

    p.energy -= def.cost;
    DT.deck.removeFromHand(p, uid);
    DT.state.emit(state, { type: 'play', actor: 'player', card: Object.assign({}, card) });
    const toAlly = allyId && allyId !== 'player' ? ` → ${DT.state.actor(state, allyId).name}` : '';
    log(state, `나: [${def.name}]${toAlly}`);
    DT.effects.resolveCard(state, 'player', tgtId, card, choice, allyId);
    DT.deck.afterPlay(state, p, card);
    C.checkEnd(state);
    return { ok: true };
  };

  // 내 턴 종료 → 동료 행동 단계
  C.endPlayerTurn = function (state) {
    if (state.phase !== 'player' || state.result) return;
    for (const a of DT.party.living(state)) C.tickStatuses(state, a.id, 'turnEnd');
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
      if (state.result) return;
      e.pending = e.dead ? 0 : e.intent;
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
