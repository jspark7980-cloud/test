// 카드 정의 조회와 설명 생성.
window.DT = window.DT || {};

DT.cards = {
  typeIcon: { attack: '⚔️', skill: '🛡️', power: '✨' },

  def(id) {
    const d = DT.data.cards[id];
    if (!d) throw new Error('알 수 없는 카드: ' + id);
    return d;
  },

  // ── 강화 ──
  // 카드 인스턴스(card.up = 강화됨)에 맞는 효과·비용·이름
  // card.extra: 로비 강화 등으로 이 카드에만 붙은 추가 효과(뒤에 이어서 실행)
  effectsOf(card) {
    const def = DT.cards.def(card.id);
    let list = def.effects;
    if (card.up) {
      if (def.upgrade && def.upgrade.effects) list = def.upgrade.effects;
      else {
        const U = DT.config.upgrade;
        list = def.effects.map((e) => (typeof e.value === 'number' && U[e.type] ? Object.assign({}, e, { value: e.value + U[e.type] }) : e));
      }
    }
    return card.extra ? list.concat(card.extra) : list;
  },
  costOf(card) {
    const def = DT.cards.def(card.id);
    return card.up && def.upgrade && typeof def.upgrade.cost === 'number' ? def.upgrade.cost : def.cost;
  },
  nameOf(card) {
    return DT.cards.def(card.id).name + (card.up ? '+' : '');
  },
  canUpgrade(card) {
    const def = DT.cards.def(card.id);
    if (card.up || card.temp || def.unplayable) return false;
    if (def.upgrade) return true;
    const U = DT.config.upgrade;
    return def.effects.some((e) => typeof e.value === 'number' && U[e.type]);
  },

  handlerOf(eff) {
    return DT.effects.handlers[eff.type];
  },

  // 효과 중 하나라도 상대를 향하면 적을 탭해서 사용
  needsTarget(def) {
    return def.effects.some((e) => DT.effects.toOf(e) === 'opponent');
  },

  // 방어도·회복 등 아군 1명을 지정할 수 있는 카드 (지정 안 하면 자신)
  allyTargetable(def) {
    return def.effects.some((e) => DT.effects.toOf(e) === 'ally');
  },

  // 동료를 반드시 지정해야 하는 카드 (예: 후퇴)
  needsCompanion(def) {
    return def.effects.some((e) => e.type === 'order' && DT.effects.orders[e.order] && DT.effects.orders[e.order].allyChoice === 'companion');
  },

  isAttack(def) {
    return def.effects.some((e) => e.type === 'damage' && DT.effects.toOf(e) !== 'self');
  },

  // 추가 선택이 필요한 효과(예: 슬쩍 → 공개 카드 선택)
  choiceOf(def) {
    for (const e of def.effects) {
      const h = DT.cards.handlerOf(e);
      if (h && h.choice) return h.choice;
    }
    return null;
  },

  // view: { state, srcId, tgtId } 를 주면 힘·약화·취약을 반영한 수치로 표시
  describe(card, view) {
    const def = DT.cards.def(card.id);
    if (def.text) return def.text;
    const lines = DT.cards.effectsOf(card).map((e) => {
      const h = DT.cards.handlerOf(e);
      return h ? h.describe(e, view) : '(?' + e.type + ')';
    });
    if (def.exhaust) lines.push('<i>소멸</i>');
    return lines.join('<br>');
  },

  // 데이터 검사: 없는 효과 타입·카드 id 를 콘솔에 경고
  validate() {
    const D = DT.data;
    for (const [id, c] of Object.entries(D.cards)) {
      if (!D.dimensions[c.origin]) console.warn('[카드]', id, '출신 차원 없음:', c.origin);
      (c.effects || []).forEach((e) => {
        if (!DT.effects.handlers[e.type]) console.warn('[카드]', id, '알 수 없는 효과:', e.type);
        if (e.type === 'status' && !D.statuses[e.status]) console.warn('[카드]', id, '알 수 없는 상태:', e.status);
        if (e.to && !['self', 'opponent', 'allOpponents', 'ally'].includes(e.to)) console.warn('[카드]', id, '알 수 없는 대상:', e.to);
        if (e.type === 'order' && !DT.effects.orders[e.order]) console.warn('[카드]', id, '알 수 없는 지휘:', e.order);
      });
    }
    for (const [dim, kinds] of Object.entries(D.encounters)) {
      for (const list of Object.values(kinds)) {
        list.forEach((enc) => enc.enemies.forEach((k) => { if (!D.enemies[k]) console.warn('[전투]', dim, enc.id, '없는 적:', k); }));
      }
    }
    for (const [id, en] of Object.entries(D.enemies)) {
      (en.startHand || []).forEach((cid) => { if (!D.cards[cid]) console.warn('[적]', id, '시작 손패에 없는 카드:', cid); });
    }
    for (const [id, ev] of Object.entries(D.events || {})) {
      ev.options.forEach((o) => (o.effects || []).forEach((e) => {
        if (DT.run && !DT.run.EVENT_EFFECTS[e.type]) console.warn('[이벤트]', id, '알 수 없는 효과:', e.type);
      }));
    }
    for (const [id, en] of Object.entries(D.enemies)) {
      en.deck.forEach((cid) => { if (!D.cards[cid]) console.warn('[적]', id, '덱에 없는 카드:', cid); });
      (en.companionDeck || []).forEach((cid) => { if (!D.cards[cid]) console.warn('[적]', id, '동료 덱에 없는 카드:', cid); });
    }
    for (const [id, c] of Object.entries(D.companions || {})) {
      c.deck.forEach((cid) => { if (!D.cards[cid]) console.warn('[동료]', id, '덱에 없는 카드:', cid); });
    }
  },
};
