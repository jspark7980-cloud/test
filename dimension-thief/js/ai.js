// 행동 결정: 적의 공격 대상, 동료의 역할별 카드·대상 선택.
// 판단은 모두 시드 난수와 현재 상태만 사용한다(같은 시드 = 같은 행동).
window.DT = window.DT || {};

(function () {
  const AI = (DT.ai = {});
  const E = () => DT.effects;
  const actor = (s, id) => DT.state.actor(s, id);
  const def = (card) => DT.cards.def(card.id);
  const P = () => DT.config.party;

  // ── 예상 피해 ──
  // 적 한 명이 이번 라운드에 tgtId 에게 줄 예상 피해(공개 카드는 실제 값, 비공개는 덱 평균) × 행동 수
  AI.enemyExpected = function (s, e, tgtId) {
    const deck = DT.data.enemies[e.kind].deck;
    const dmg = (id) => E().previewDamage(s, { id }, e.id, tgtId);
    const hiddenAvg = deck.reduce((a, id) => a + dmg(id), 0) / deck.length;
    const vals = e.hand.filter((c) => !DT.cards.def(c.id).unplayable).map((c) => (c.revealed ? dmg(c.id) : hiddenAvg));
    if (!vals.length) return 0;
    return (vals.reduce((a, b) => a + b, 0) / vals.length) * e.intent;
  };

  const taunters = (s) => DT.party.living(s).filter((a) => (a.statuses.taunt || 0) > 0);

  // 아군 한 명이 이번 라운드 받을 예상 피해 (도발이 있으면 단일 공격은 모두 도발 대상에게)
  AI.incomingTo = function (s, allyId) {
    const t = taunters(s)[0];
    const cover = s.orders && s.orders.cover && actor(s, s.orders.cover);
    let sum = 0;
    for (const e of DT.combat.living(s)) {
      let tgt = t ? t.id : e.targetId;
      if (tgt === 'player' && cover && !cover.dead) tgt = cover.id;   // 엄호 명령
      if (tgt === allyId) sum += AI.enemyExpected(s, e, allyId);
    }
    return sum;
  };

  const threat = (s, a) => Math.max(0, AI.incomingTo(s, a.id) - a.block);
  const inDanger = (s, a) => {
    const t = threat(s, a);
    return t > 0 && (t >= a.hp * P().dangerRatio || a.hp <= a.maxHp * 0.4);
  };

  // ── 적 ──
  function enemyCandidates(s, e) {
    let living = DT.party.living(s);
    if (s.turn <= 1) {
      const seen = living.filter((a) => !DT.items.fx(a, 'stealthFirstTurn'));
      if (seen.length) living = seen;   // 은신 망토
    }
    const pref = DT.data.enemies[e.kind].targets || 'front';
    const row = living.filter((a) => a.row === pref);
    return row.length ? row : living;
  }

  // 다음 턴 공격 대상을 미리 정해 표시한다
  AI.enemyPlanTarget = function (s, e) {
    const c = enemyCandidates(s, e);
    e.targetId = c.length ? DT.rng.pick(s, c).id : 'player';
  };

  // 진형이 바뀌면(후퇴 등) 노릴 수 없게 된 대상만 다시 고른다
  AI.refreshEnemyTargets = function (s) {
    for (const e of DT.combat.living(s)) {
      if (!enemyCandidates(s, e).some((a) => a.id === e.targetId)) AI.enemyPlanTarget(s, e);
    }
  };

  // 실제로 공격할 때: 도발 > 계획한 대상(살아 있고 노리는 줄에 있으면) > 다시 고르기
  AI.enemyActTarget = function (s, e) {
    const t = taunters(s);
    if (t.length) return t[0].id;
    const c = enemyCandidates(s, e);
    if (c.some((a) => a.id === e.targetId)) return e.targetId;
    AI.enemyPlanTarget(s, e);
    return e.targetId;
  };

  // 적이 쓰는 회복·버프 카드의 아군 대상
  AI.enemyAlly = function (s, e, d) {
    const living = DT.combat.living(s);
    if (d.effects.some((x) => x.type === 'heal')) {
      return living.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0].id;
    }
    if (d.effects.some((x) => x.type === 'status' && x.to === 'ally')) {
      return living.slice().sort((a, b) => AI.enemyExpected(s, b, b.targetId) - AI.enemyExpected(s, a, a.targetId))[0].id;
    }
    return e.id;
  };

  // ── 동료 ──
  // 공격 대상 고르기. 강탈 대기 중(이번 턴에 빈사가 된) 적은 처치하지 않도록 피한다.
  function pickAttackTarget(s, c, card, frontOnly) {
    let enemies = DT.combat.living(s);
    if (frontOnly) {
      const front = enemies.filter((e) => e.row === 'front');
      if (front.length) enemies = front;
    }
    let best = null;
    for (const e of enemies) {
      const dmg = E().previewDamage(s, card, c.id, e.id);
      const kills = dmg >= e.hp + e.block;
      const heistWait = DT.combat.belowHeistLine(e, s) && !e.heistReady;
      let v = Math.min(dmg, e.hp + e.block) + (1 - e.hp / e.maxHp) * 8;
      if (kills) v += heistWait ? -60 : e.heistReady ? 50 : 35;
      if (!best || v > best.value) best = { id: e.id, value: v };
    }
    return best;
  }

  function mostThreatened(s) {
    return DT.party.living(s).map((a) => ({ a, t: threat(s, a) })).sort((x, y) => y.t - x.t)[0];
  }

  const ATTACK_BASE = { tank: 40, healer: 22, dealer: 60 };

  // 카드 한 장의 가치와 대상
  function evalCard(s, c, card) {
    const d = def(card);
    const role = c.role;
    const has = (fn) => d.effects.some(fn);
    const isAttack = DT.cards.isAttack(d);
    const taunt = has((x) => x.type === 'status' && x.status === 'taunt');
    const heal = d.effects.find((x) => x.type === 'heal' && E().toOf(x) === 'ally');
    const block = d.effects.find((x) => x.type === 'block' && E().toOf(x) === 'ally');
    const buff = has((x) => x.type === 'status' && x.to === 'ally');
    const debuffOnly = !isAttack && has((x) => x.type === 'status' && E().toOf(x) === 'opponent');
    let score = 0;
    let targetId = null;
    let allyId = c.id;

    if (isAttack) {
      const t = pickAttackTarget(s, c, card, role === 'tank');
      if (!t) return null;
      targetId = t.id;
      score += ATTACK_BASE[role] + t.value;
    } else if (debuffOnly || DT.cards.needsTarget(d)) {
      const enemies = DT.combat.living(s);
      if (!enemies.length) return null;
      const t = enemies.slice().sort((a, b) => AI.enemyExpected(s, b, b.targetId) - AI.enemyExpected(s, a, a.targetId))[0];
      targetId = t.id;
      score += 25;
    }

    const allies = DT.party.living(s);
    if (taunt) {
      const danger = allies.some((a) => a.id !== c.id && inDanger(s, a));
      const others = allies.filter((a) => a.id !== c.id).reduce((sum, a) => sum + threat(s, a), 0);
      score += danger ? 90 : others > 0 ? 25 : 2;
    }
    if (heal) {
      const low = allies.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      allyId = low.id;
      const ratio = low.hp / low.maxHp;
      score += ratio <= P().healBelow ? 100 + (1 - ratio) * 30 : (low.hp < low.maxHp ? 6 : 0);
    } else if (block) {
      const m = mostThreatened(s);
      if (m) {
        allyId = m.a.id;
        const danger = inDanger(s, m.a);
        score += role === 'tank' && danger ? 80 : Math.min(block.value, m.t) * (role === 'tank' ? 2 : 1.5);
      }
    }
    if (buff) {
      allyId = 'player';
      score += role === 'healer' ? 50 : 20;
    }
    return { uid: card.uid, score, targetId, allyId };
  }

  // 내 턴 시작 시: 손패를 채우고 이번 턴에 쓸 카드와 대상을 정해 표시
  AI.planCompanion = function (s, c) {
    const need = P().companionHand - c.hand.length;
    if (need > 0) DT.deck.draw(s, c, need);
    let best = null;
    for (const card of c.hand) {
      const r = evalCard(s, c, card);
      if (r && (!best || r.score > best.score)) best = r;
    }
    c.intent = best ? { uid: best.uid, targetId: best.targetId, allyId: best.allyId } : null;
  };

  // 동료 행동 직전: 지휘(표적 지정) 반영, 대상이 사라졌으면 다시 고름
  AI.finalizeCompanion = function (s, c) {
    if (!c.intent) return null;
    const card = c.hand.find((x) => x.uid === c.intent.uid);
    if (!card) return null;
    const focus = s.orders.focus && actor(s, s.orders.focus);
    if (focus && !focus.dead) {
      if (DT.cards.isAttack(def(card))) return { card, targetId: focus.id, allyId: c.id };
      return { basic: true, targetId: focus.id };   // 공격 카드가 아니면 기본 공격으로 표적을 친다
    }
    const r = evalCard(s, c, card);
    if (!r) return null;
    return { card, targetId: r.targetId, allyId: r.allyId };
  };
})();
