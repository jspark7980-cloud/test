// 공통 효과 처리. 카드 데이터의 effects 배열을 순서대로 실행한다.
// 새 효과 타입은 DT.effects.register(type, handler) 로 추가.
//
// handler = {
//   defaultTo: 'self' | 'opponent' | 'allOpponents' | 'ally'   // eff.to 생략 시 대상
//   describe(eff, view) → 설명 문자열
//   apply(ctx, eff)                     // ctx: { state, srcId, tgtId, allyId, card, choice, targetsOf(eff) }
//   canUse?(ctx, eff) → 사용 불가 사유 문자열 또는 null
//   choice?: 'revealed'                 // UI에서 추가 선택이 필요한 효과
// }
// 'ally' 대상: 사용자가 지정한 아군(allyId). 지정하지 않으면 자신.
window.DT = window.DT || {};

(function () {
  const S = () => DT.data.statuses;
  const actor = (state, id) => DT.state.actor(state, id);
  const E = (DT.effects = { handlers: {} });

  E.register = (type, handler) => { E.handlers[type] = handler; };

  E.toOf = (eff) => {
    if (eff.type === 'order' && E.orders && E.orders[eff.order]) return E.orders[eff.order].to;
    const h = E.handlers[eff.type];
    return eff.to || (h && h.defaultTo) || 'opponent';
  };

  const sameSide = (a, b) => DT.state.isAlly(a) === DT.state.isAlly(b);

  // 효과 대상 id 목록
  E.targetIds = function (state, srcId, tgtId, to, allyId) {
    if (to === 'self') return [srcId];
    if (to === 'ally') {
      const a = allyId && actor(state, allyId);
      return [a && !a.dead && sameSide(srcId, allyId) ? allyId : srcId];
    }
    if (to === 'allOpponents') {
      return DT.state.isAlly(srcId)
        ? DT.combat.living(state).map((e) => e.id)
        : DT.party.living(state).map((a) => a.id);
    }
    return tgtId ? [tgtId] : [];
  };

  function makeCtx(state, srcId, tgtId, card, choice, allyId) {
    const ctx = { state, srcId, tgtId, card, choice, allyId };
    ctx.targetsOf = (eff) => E.targetIds(state, srcId, tgtId, E.toOf(eff), allyId);
    return ctx;
  }
  E.makeCtx = makeCtx;

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
    for (const eff of DT.cards.effectsOf(card)) {
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
      // 강탈: 내 턴 시작 시 체력이 기준 이하였던 적을 처치 (combat.startPlayerTurn 에서 표시)
      const executed = tgtId !== 'player' && !!tgt.heistReady;
      if (executed) tgt.executed = true;
      DT.state.emit(state, { type: 'death', target: tgtId, executable: executed });
      DT.state.log(state, `${tgt.name} 쓰러짐!${executed ? ' (강탈 가능)' : ''}`);
    }
    DT.combat.checkEnd(state);
    return loss;
  };

  E.dealDamage = function (state, srcId, tgtId, base) {
    // 엄호 명령: 도둑을 노린 공격을 탱커가 대신 받는다
    const cover = state.orders && state.orders.cover;
    if (tgtId === 'player' && cover) {
      const t = actor(state, cover);
      if (t && !t.dead) {
        tgtId = cover;
        DT.state.emit(state, { type: 'cover', target: cover });
      }
    }
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
  E.canUse = function (state, srcId, tgtId, card, choice, allyId) {
    const ctx = makeCtx(state, srcId, tgtId, card, choice, allyId);
    for (const eff of DT.cards.effectsOf(card)) {
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

  E.resolveCard = function (state, srcId, tgtId, card, choice, allyId) {
    E.resolveEffects(makeCtx(state, srcId, tgtId, card, choice, allyId), DT.cards.effectsOf(card));
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
    defaultTo: 'ally',
    describe: (eff) => `방어도 <b>${val(eff)}</b>`,
    apply(ctx, eff) { ctx.targetsOf(eff).forEach((id) => E.gainBlock(ctx.state, id, val(eff))); },
  });

  E.register('heal', {
    defaultTo: 'ally',
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
      if (eff.to === 'ally') return `아군 ${d.name} ${val(eff) > 0 ? '+' : ''}${val(eff)}`;
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
      E.resolveEffects(makeCtx(ctx.state, ctx.srcId, t.id, ctx.card, null, ctx.allyId), def.effects);
    },
  });

  // 지휘(도둑 전용): focus 표적 지정 / assist 협공 / cover 엄호 명령 / retreat 후퇴
  const tankOf = (state) => DT.party.companions(state).find((c) => c.role === 'tank');
  const ORDERS = {
    focus: {
      to: 'opponent',
      text: '이번 턴 동료 전원이 대상 적을 공격',
      check: (ctx) => (DT.party.companions(ctx.state).length ? null : '동료가 없습니다'),
      run(ctx, id) {
        ctx.state.orders.focus = id;
        DT.state.log(ctx.state, `표적 지정: 동료들이 ${actor(ctx.state, id).name}을(를) 노린다.`);
      },
    },
    assist: {
      to: 'opponent',
      text: '동료 1명이 같은 적을 추가 공격',
      check: () => null,
      run(ctx, id) {
        const comps = DT.party.companions(ctx.state);
        const c = comps.find((x) => x.role === 'dealer') || comps[0];
        const t = actor(ctx.state, id);
        if (!c || !t || t.dead) return;
        DT.state.log(ctx.state, `협공! ${c.name}의 추가 공격`);
        DT.state.emit(ctx.state, { type: 'assist', by: c.id, target: id });
        E.dealDamage(ctx.state, c.id, id, c.basicAttack);
      },
    },
    cover: {
      to: 'self',
      text: '이번 턴 탱커가 나 대신 피해를 받음',
      check: (ctx) => (tankOf(ctx.state) ? null : '탱커 동료가 없습니다'),
      run(ctx) {
        const t = tankOf(ctx.state);
        ctx.state.orders.cover = t.id;
        DT.state.log(ctx.state, `엄호 명령: ${t.name}이(가) 도둑을 지킨다.`);
      },
    },
    retreat: {
      to: 'ally',
      text: '동료 1명을 뒷줄로 이동',
      allyChoice: 'companion',
      check(ctx) {
        if (!ctx.allyId) return null;   // 대상 지정 전(카드 선택 단계)
        const a = actor(ctx.state, ctx.allyId);
        if (!a || ctx.allyId === 'player') return '동료를 지정하세요';
        return a.row === 'back' ? '이미 뒷줄에 있습니다' : null;
      },
      run(ctx, id) {
        const a = actor(ctx.state, id);
        if (!a || id === 'player') return;
        a.row = 'back';
        DT.ai.refreshEnemyTargets(ctx.state);
        DT.state.log(ctx.state, `${a.name}이(가) 뒷줄로 물러났다.`);
        DT.state.emit(ctx.state, { type: 'move', target: id });
      },
    },
  };
  E.orders = ORDERS;
  E.register('order', {
    defaultTo: 'opponent',
    describe: (eff) => (ORDERS[eff.order] ? ORDERS[eff.order].text : eff.order),
    canUse(ctx, eff) {
      const o = ORDERS[eff.order];
      if (!o) return null;
      if (eff.order !== 'cover' && eff.order !== 'retreat' && !DT.party.companions(ctx.state).length) return '동료가 없습니다';
      return o.check(ctx);
    },
    apply(ctx, eff) {
      const o = ORDERS[eff.order];
      if (!o) return;
      const ids = E.targetIds(ctx.state, ctx.srcId, ctx.tgtId, o.to, ctx.allyId);
      o.run(ctx, ids[0]);
    },
  });
})();
