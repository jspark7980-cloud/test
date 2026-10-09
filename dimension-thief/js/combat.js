// 전투 흐름: 턴 시작/종료, 카드 사용, 적 턴, 승패 판정.
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
    state.enemies = [];
    enemyKinds.forEach((k) => state.enemies.push(DT.enemy.create(state, k)));
    state.turn = 0; state.result = null;
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

  C.startPlayerTurn = function (state) {
    const p = state.player;
    state.turn++;
    state.phase = 'player';
    p.block = 0;                       // 방어도는 내 턴 시작 시 사라짐
    C.tickStatuses(state, 'player', 'turnStart');
    if (state.result) return;
    p.energy = p.maxEnergy;
    for (const e of C.living(state)) e.heistReady = C.belowHeistLine(e);
    DT.deck.draw(state, p, p.drawPerTurn);
  };

  C.canPlay = function (state, uid) {
    if (state.phase !== 'player' || state.result) return { ok: false, reason: '지금은 카드를 낼 수 없습니다' };
    const p = state.player;
    const card = p.hand.find((c) => c.uid === uid);
    if (!card) return { ok: false, reason: '손패에 없는 카드' };
    const def = DT.cards.def(card.id);
    if (def.unplayable) return { ok: false, reason: '사용할 수 없는 카드' };
    if (def.cost > p.energy) return { ok: false, reason: '에너지가 부족합니다' };
    // 대상이 필요한 카드는 대상 후보 중 하나라도 가능하면 선택 허용
    if (DT.cards.needsTarget(def)) {
      const reasons = C.living(state).map((e) => DT.effects.canUse(state, 'player', e.id, card));
      if (reasons.length && reasons.every(Boolean)) return { ok: false, reason: reasons[0] };
    } else {
      const why = DT.effects.canUse(state, 'player', null, card);
      if (why) return { ok: false, reason: why };
    }
    return { ok: true, card, def };
  };

  C.playCard = function (state, uid, tgtId, choice) {
    const chk = C.canPlay(state, uid);
    if (!chk.ok) return chk;
    const { card, def } = chk;
    const p = state.player;
    if (DT.cards.needsTarget(def)) {
      const t = DT.state.actor(state, tgtId);
      if (!t || t.dead || tgtId === 'player') return { ok: false, reason: '대상 적을 탭하세요' };
    } else {
      tgtId = null;
    }
    const why = DT.effects.canUse(state, 'player', tgtId, card, choice);
    if (why) return { ok: false, reason: why };

    p.energy -= def.cost;
    DT.deck.removeFromHand(p, uid);
    DT.state.emit(state, { type: 'play', actor: 'player', card: Object.assign({}, card) });
    log(state, `나: [${def.name}]`);
    DT.effects.resolveCard(state, 'player', tgtId, card, choice);
    DT.deck.afterPlay(state, p, card);
    C.checkEnd(state);
    return { ok: true };
  };

  // 플레이어 턴 종료 → 적 턴 시작 처리까지
  C.endPlayerTurn = function (state) {
    if (state.phase !== 'player' || state.result) return;
    const p = state.player;
    C.tickStatuses(state, 'player', 'turnEnd');
    DT.deck.discardHand(state, p);
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
      DT.enemy.plan(state, e);
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
