// 카드 정의 조회와 설명 생성.
window.DT = window.DT || {};

DT.cards = {
  typeIcon: { attack: '⚔️', skill: '🛡️', power: '✨' },

  def(id) {
    const d = DT.data.cards[id];
    if (!d) throw new Error('알 수 없는 카드: ' + id);
    return d;
  },

  handlerOf(eff) {
    return DT.effects.handlers[eff.type];
  },

  // 효과 중 하나라도 상대를 향하면 적을 탭해서 사용
  needsTarget(def) {
    return def.effects.some((e) => {
      const h = DT.cards.handlerOf(e);
      return (e.to || (h && h.defaultTo)) === 'opponent';
    });
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
    const lines = def.effects.map((e) => {
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
      });
    }
    for (const [id, en] of Object.entries(D.enemies)) {
      en.deck.forEach((cid) => { if (!D.cards[cid]) console.warn('[적]', id, '덱에 없는 카드:', cid); });
    }
  },
};
