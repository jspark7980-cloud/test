// 공통 효과 처리. 카드 데이터의 effects 배열을 순서대로 실행한다.
// 새 효과 타입은 DT.effects.register(type, handler) 로 추가.
//
// handler = {
//   defaultTo: 'self' | 'opponent'      // eff.to 생략 시 대상
//   describe(eff, view) → 설명 문자열
//   apply(ctx, eff)                     // ctx: { state, srcId, tgtId, card, choice, targetOf(eff) }
//   canUse?(ctx, eff) → 사용 불가 사유 문자열 또는 null
//   choice?: 'revealed'                 // UI에서 추가 선택이 필요한 효과
// }
window.DT = window.DT || {};

(function () {
  const S = () => DT.data.statuses;
  const actor = (state, id) => DT.state.actor(state, id);
  const E = (DT.effects = { handlers: {} });

  E.register = (type, handler) => { E.handlers[type] = handler; };

  function makeCtx(state, srcId, tgtId, card, choice) {
    const ctx = { state, srcId, tgtId, card, choice };
    ctx.targetOf = (eff) => {
      const h = E.handlers[eff.type];
      const to = eff.to || (h && h.defaultTo) || 'opponent';
      return to === 'self' ? srcId : tgtId;
    };
    return ctx;
  }

  // ── 수치 계산 ──
  E.calcDamage = function (state, srcId, tgtId, base) {
    const src = actor(state, srcId);
    const tgt = tgtId ? actor(state, tgtId) : null;
    let dmg = base;
    const defs = S();
    if (src) {
      for (const [k, v] of Object.entries(src.statuses)) {
        const d = defs[k];
        if (d && d.damageDealtAdd) dmg += d.damageDealtAdd * v;
      }
      for (const [k, v] of Object.entries(src.statuses)) {
        const d = defs[k];
        if (d && d.damageDealtMult && v > 0) dmg *= d.damageDealtMult;
      }
    }
    if (tgt) {
      for (const [k, v] of Object.entries(tgt.statuses)) {
        const d = defs[k];
        if (d && d.damageTakenMult && v > 0) dmg *= d.damageTakenMult;
      }
    }
    return Math.max(0, Math.floor(dmg));
  };

  // ── 기본 동작 (다른 모듈에서도 사용) ──
  E.applyDamage = function (state, tgtId, amount, opts) {
    opts = opts || {};
    const tgt = actor(state, tgtId);
    if (!tgt || tgt.dead || tgt.hp <= 0) return 0;
    const blocked = opts.ignoreBlock ? 0 : Math.min(tgt.block, amount);
    tgt.block -= blocked;
    const loss = amount - blocked;
    const hpBefore = tgt.hp;
    tgt.hp = Math.max(0, tgt.hp - loss);
    DT.state.emit(state, { type: 'damage', target: tgtId, amount: loss, blocked });
    if (tgt.hp <= 0) {
      tgt.dead = true;
      // 강탈 판정용: 체력 25% 이하에서 처치했는지
      DT.state.emit(state, { type: 'death', target: tgtId, executable: hpBefore <= tgt.maxHp * 0.25 });
      DT.state.log(state, `${tgt.name} 쓰러짐!`);
    }
    DT.combat.checkEnd(state);
    return loss;
  };

  E.dealDamage = function (state, srcId, tgtId, base) {
    return E.applyDamage(state, tgtId, E.calcDamage(state, srcId, tgtId, base), { source: srcId });
  };

  E.gainBlock = function (state, id, n) {
    const a = actor(state, id);
    a.block += n;
    DT.state.emit(state, { type: 'block', target: id, amount: n });
  };

  E.heal = function (state, id, n) {
    const a = actor(state, id);
    const before = a.hp;
    a.hp = Math.min(a.maxHp, a.hp + n);
    DT.state.emit(state, { type: 'heal', target: id, amount: a.hp - before });
  };

  E.applyStatus = function (state, id, status, n) {
    const a = actor(state, id);
    if (!a || a.dead) return;
    const v = (a.statuses[status] || 0) + n;
    if (v === 0) delete a.statuses[status];
    else a.statuses[status] = v;
    DT.state.emit(state, { type: 'status', target: id, status, amount: n });
  };

  // ── 카드 실행 ──
  E.canUse = function (state, srcId, tgtId, card, choice) {
    const ctx = makeCtx(state, srcId, tgtId, card, choice);
    for (const eff of DT.cards.def(card.id).effects) {
      const h = E.handlers[eff.type];
      const why = h && h.canUse ? h.canUse(ctx, eff) : null;
      if (why) return why;
    }
    return null;
  };

  E.resolveCard = function (state, srcId, tgtId, card, choice) {
    const ctx = makeCtx(state, srcId, tgtId, card, choice);
    for (const eff of DT.cards.def(card.id).effects) {
      if (state.result) break;
      const src = actor(state, srcId);
      if (!src || src.dead) break;
      const h = E.handlers[eff.type];
      if (!h) { console.warn('알 수 없는 효과', eff.type); continue; }
      h.apply(ctx, eff);
    }
  };

  // ── 효과 타입들 ──
  const val = (eff) => eff.value || 0;

  E.register('damage', {
    defaultTo: 'opponent',
    describe(eff, view) {
      let v = val(eff);
      if (view) v = E.calcDamage(view.state, view.srcId, view.tgtId, v);
      const cls = v > val(eff) ? 'up' : v < val(eff) ? 'down' : '';
      const times = eff.times > 1 ? ` ×${eff.times}` : '';
      return `피해 <b class="${cls}">${v}</b>${times}`;
    },
    apply(ctx, eff) {
      const tgt = ctx.targetOf(eff);
      for (let i = 0; i < (eff.times || 1); i++) {
        const t = actor(ctx.state, tgt);
        if (!t || t.dead || ctx.state.result) break;
        E.dealDamage(ctx.state, ctx.srcId, tgt, val(eff));
      }
    },
  });

  E.register('block', {
    defaultTo: 'self',
    describe: (eff) => `방어도 <b>${val(eff)}</b>`,
    apply(ctx, eff) { E.gainBlock(ctx.state, ctx.targetOf(eff), val(eff)); },
  });

  E.register('heal', {
    defaultTo: 'self',
    describe: (eff) => `체력 <b>${val(eff)}</b> 회복`,
    apply(ctx, eff) { E.heal(ctx.state, ctx.targetOf(eff), val(eff)); },
  });

  E.register('loseHp', {
    defaultTo: 'self',
    describe: (eff) => `체력 <b>${val(eff)}</b> 잃음`,
    apply(ctx, eff) { E.applyDamage(ctx.state, ctx.targetOf(eff), val(eff), { ignoreBlock: true }); },
  });

  E.register('status', {
    defaultTo: 'opponent',
    describe(eff) {
      const d = S()[eff.status] || { name: eff.status };
      const self = eff.to === 'self';
      const sign = val(eff) > 0 && self ? '+' : '';
      return self ? `${d.name} ${sign}${val(eff)}` : `${d.name} ${val(eff)} 부여`;
    },
    apply(ctx, eff) { E.applyStatus(ctx.state, ctx.targetOf(eff), eff.status, val(eff)); },
  });

  E.register('draw', {
    defaultTo: 'self',
    describe: (eff) => `카드 ${val(eff)}장 뽑기`,
    apply(ctx, eff) { DT.deck.draw(ctx.state, actor(ctx.state, ctx.targetOf(eff)), val(eff)); },
  });

  E.register('energy', {
    defaultTo: 'self',
    describe: (eff) => `에너지 +${val(eff)}`,
    apply(ctx, eff) {
      const a = actor(ctx.state, ctx.targetOf(eff));
      if (typeof a.energy === 'number') a.energy += val(eff);
    },
  });

  // 슬쩍: 상대 손패(적이면 공개된 카드만)에서 1장을 빼앗아 이번 전투 동안 내 손패로
  function stealCandidates(state, victimId) {
    const v = actor(state, victimId);
    if (!v) return [];
    return victimId === 'player' ? v.hand : v.hand.filter((c) => c.revealed);
  }
  E.register('steal', {
    defaultTo: 'opponent',
    choice: 'revealed',
    describe: () => '적의 공개 카드 1장을 빼앗아 손패로 <i>(이번 전투)</i>',
    canUse(ctx, eff) {
      if (!ctx.tgtId) return null;
      return stealCandidates(ctx.state, ctx.targetOf(eff)).length ? null : '빼앗을 공개 카드가 없습니다';
    },
    apply(ctx, eff) {
      const state = ctx.state;
      const victimId = ctx.targetOf(eff);
      const cands = stealCandidates(state, victimId);
      if (!cands.length) return;
      const picked = cands.find((c) => c.uid === ctx.choice) || DT.rng.pick(state, cands);
      const victim = actor(state, victimId);
      const thief = actor(state, ctx.srcId);
      DT.deck.removeFromHand(victim, picked.uid);
      delete picked.revealed;
      picked.temp = true;               // 전투 종료 시 사라짐
      picked.stolenFrom = victimId;
      if (thief.hand.length < (thief.maxHand || 10)) thief.hand.push(picked);
      else thief.discardPile.push(picked);
      if (ctx.srcId === 'player') state.stats.steals++;
      DT.state.log(state, `${thief.name}이(가) ${victim.name}의 [${DT.cards.def(picked.id).name}]을(를) 슬쩍했다!`);
      DT.state.emit(state, { type: 'steal', by: ctx.srcId, from: victimId, cardId: picked.id });
    },
  });
})();
