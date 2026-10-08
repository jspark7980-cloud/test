// 공통 효과 처리. 카드 데이터의 effects 배열을 순서대로 실행한다.
// 새 효과 타입은 DT.effects.register(type, handler) 로 추가.
//
// handler = {
//   defaultTo: 'self' | 'opponent' | 'allOpponents'   // eff.to 생략 시 대상
//   describe(eff, view) → 설명 문자열
//   apply(ctx, eff)                     // ctx: { state, srcId, tgtId, card, choice, targetsOf(eff) }
//   canUse?(ctx, eff) → 사용 불가 사유 문자열 또는 null
//   choice?: 'revealed'                 // UI에서 추가 선택이 필요한 효과
// }
window.DT = window.DT || {};

(function () {
  const S = () => DT.data.statuses;
  const actor = (state, id) => DT.state.actor(state, id);
  const E = (DT.effects = { handlers: {} });

  E.register = (type, handler) => { E.handlers[type] = handler; };

  E.toOf = (eff) => {
    const h = E.handlers[eff.type];
    return eff.to || (h && h.defaultTo) || 'opponent';
  };

  // 효과 대상 id 목록
  E.targetIds = function (state, srcId, tgtId, to) {
    if (to === 'self') return [srcId];
    if (to === 'allOpponents') {
      return srcId === 'player' ? DT.combat.living(state).map((e) => e.id) : ['player'];
    }
    return tgtId ? [tgtId] : [];
  };

  function makeCtx(state, srcId, tgtId, card, choice) {
    const ctx = { state, srcId, tgtId, card, choice };
    ctx.targetsOf = (eff) => E.targetIds(state, srcId, tgtId, E.toOf(eff));
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

  // 카드가 특정 대상에게 줄 예상 피해(방어도 무시 전). 대상이 아니면 0.
  E.previewDamage = function (state, card, srcId, tgtId) {
    let total = 0;
    for (const eff of DT.cards.def(card.id).effects) {
      if (eff.type !== 'damage') continue;
      const to = E.toOf(eff);
      if (to === 'self') continue;
      total += E.calcDamage(state, srcId, tgtId, eff.value || 0) * (eff.times || 1);
    }
    return total;
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
      // 강탈: 체력 25% 이하인 적을 처치
      const executed = tgtId !== 'player' && hpBefore <= tgt.maxHp * DT.data.rewards.heistThreshold;
      if (executed) tgt.executed = true;
      DT.state.emit(state, { type: 'death', target: tgtId, executable: executed });
      DT.state.log(state, `${tgt.name} 쓰러짐!${executed ? ' (강탈 가능)' : ''}`);
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

  E.resolveEffects = function (ctx, effects) {
    for (const eff of effects) {
      if (ctx.state.result) break;
      const src = actor(ctx.state, ctx.srcId);
      if (!src || src.dead) break;
      const h = E.handlers[eff.type];
      if (!h) { console.warn('알 수 없는 효과', eff.type); continue; }
      h.apply(ctx, eff);
    }
  };

  E.resolveCard = function (state, srcId, tgtId, card, choice) {
    E.resolveEffects(makeCtx(state, srcId, tgtId, card, choice), DT.cards.def(card.id).effects);
  };

  // ── 효과 타입들 ──
  const val = (eff) => eff.value || 0;
  const allTag = (eff) => (eff.to === 'allOpponents' ? '모든 적에게 ' : '');
  const living = (state, id) => { const a = actor(state, id); return a && !a.dead; };

  E.register('damage', {
    defaultTo: 'opponent',
    describe(eff, view) {
      let v = val(eff);
      if (view) v = E.calcDamage(view.state, view.srcId, eff.to === 'allOpponents' ? null : view.tgtId, v);
      const cls = v > val(eff) ? 'up' : v < val(eff) ? 'down' : '';
      const times = eff.times > 1 ? ` ×${eff.times}` : '';
      return `${allTag(eff)}피해 <b class="${cls}">${v}</b>${times}`;
    },
    apply(ctx, eff) {
      for (const id of ctx.targetsOf(eff)) {
        for (let i = 0; i < (eff.times || 1); i++) {
          if (!living(ctx.state, id) || ctx.state.result) break;
          E.dealDamage(ctx.state, ctx.srcId, id, val(eff));
        }
      }
    },
  });

  E.register('block', {
    defaultTo: 'self',
    describe: (eff) => `방어도 <b>${val(eff)}</b>`,
    apply(ctx, eff) { ctx.targetsOf(eff).forEach((id) => E.gainBlock(ctx.state, id, val(eff))); },
  });

  E.register('heal', {
    defaultTo: 'self',
    describe: (eff) => `체력 <b>${val(eff)}</b> 회복`,
    apply(ctx, eff) { ctx.targetsOf(eff).forEach((id) => E.heal(ctx.state, id, val(eff))); },
  });

  E.register('loseHp', {
    defaultTo: 'self',
    describe: (eff) => `체력 <b>${val(eff)}</b> 잃음`,
    apply(ctx, eff) {
      ctx.targetsOf(eff).forEach((id) => E.applyDamage(ctx.state, id, val(eff), { ignoreBlock: true }));
    },
  });

  E.register('status', {
    defaultTo: 'opponent',
    describe(eff) {
      const d = S()[eff.status] || { name: eff.status };
      if (eff.to === 'self') return `${d.name} ${val(eff) > 0 ? '+' : ''}${val(eff)}`;
      return `${allTag(eff)}${d.name} ${val(eff)} 부여`;
    },
    apply(ctx, eff) { ctx.targetsOf(eff).forEach((id) => E.applyStatus(ctx.state, id, eff.status, val(eff))); },
  });

  E.register('draw', {
    defaultTo: 'self',
    describe: (eff) => `카드 ${val(eff)}장 뽑기`,
    apply(ctx, eff) { ctx.targetsOf(eff).forEach((id) => DT.deck.draw(ctx.state, actor(ctx.state, id), val(eff))); },
  });

  E.register('energy', {
    defaultTo: 'self',
    describe: (eff) => `에너지 +${val(eff)}`,
    apply(ctx, eff) {
      ctx.targetsOf(eff).forEach((id) => {
        const a = actor(ctx.state, id);
        if (typeof a.energy === 'number') a.energy += val(eff);
      });
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
      return stealCandidates(ctx.state, ctx.targetsOf(eff)[0]).length ? null : '빼앗을 공개 카드가 없습니다';
    },
    apply(ctx, eff) {
      const state = ctx.state;
      const victimId = ctx.targetsOf(eff)[0];
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

  // 복제: 대상이 직전에 쓴 카드를 한 번 따라 쓴다 (복제 카드 자체는 복제 불가)
  const copyable = (id) => id && !DT.cards.def(id).effects.some((e) => e.type === 'copy');
  E.register('copy', {
    defaultTo: 'opponent',
    describe(eff, view) {
      let txt = '대상 적이 직전에 쓴 카드를 따라 씀';
      const t = view && view.tgtId && actor(view.state, view.tgtId);
      if (t && t.lastPlayed) txt += `<br><i>→ ${DT.cards.def(t.lastPlayed).name}</i>`;
      return txt;
    },
    canUse(ctx, eff) {
      if (!ctx.tgtId) return null;
      const t = actor(ctx.state, ctx.targetsOf(eff)[0]);
      if (!t || !t.lastPlayed) return '이 적은 아직 카드를 쓰지 않았습니다';
      return copyable(t.lastPlayed) ? null : '복제할 수 없는 카드입니다';
    },
    apply(ctx, eff) {
      const t = actor(ctx.state, ctx.targetsOf(eff)[0]);
      if (!t || !copyable(t.lastPlayed)) return;
      const def = DT.cards.def(t.lastPlayed);
      const src = actor(ctx.state, ctx.srcId);
      DT.state.log(ctx.state, `${src.name}이(가) ${t.name}의 [${def.name}]을(를) 복제했다!`);
      if (ctx.srcId === 'player') ctx.state.stats.copies++;
      DT.state.emit(ctx.state, { type: 'copy', by: ctx.srcId, from: t.id, cardId: t.lastPlayed });
      E.resolveEffects(makeCtx(ctx.state, ctx.srcId, t.id, ctx.card, null), def.effects);
    },
  });
})();
