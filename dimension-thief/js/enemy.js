// 적: 자기 덱과 손패를 가지고, 손패 일부를 공개하며, 매 턴 1~2장 사용.
// 누구를 노릴지는 js/ai.js 가 정한다(진형·도발).
window.DT = window.DT || {};

DT.enemy = {
  create(state, kind) {
    const d = DT.data.enemies[kind];
    if (!d) throw new Error('알 수 없는 적: ' + kind);
    // 승천: 적 체력·보스 체력·시작 힘
    const hp = Math.round(d.hp * (1 + DT.run.asc(state, 'enemyHp') + (d.rank === 'boss' ? DT.run.asc(state, 'bossHp') : 0)));
    const str = DT.run.asc(state, 'enemyStrength');
    const e = {
      id: 'e' + (state.enemies.length + 1), kind,
      name: d.name, icon: d.icon, origin: d.origin, row: d.row || 'front',
      hp, maxHp: hp, block: 0, statuses: str ? { strength: str } : {},
      handSize: d.handSize, reveal: d.reveal, actions: d.actions.slice(),
      drawPile: d.deck.map((id) => DT.state.makeCard(state, id)),
      hand: [], discardPile: [], exhaustPile: [],
      intent: 0, pending: 0, targetId: null, lastPlayed: null, dead: false, rank: d.rank || 'normal',
    };
    // 시작 손패(예: 왕관): 항상 공개, 적은 사용하지 않음
    (d.startHand || []).forEach((id) => e.hand.push(DT.state.makeCard(state, id, { revealed: true })));
    e.maxHand = Math.max(10, d.handSize);
    DT.rng.shuffle(state, e.drawPile);
    return e;
  },

  // 손패를 handSize까지 채우고, 공개 장수를 맞춘다
  refill(state, e) {
    const need = e.handSize - e.hand.length;
    if (need > 0) DT.deck.draw(state, e, need);
    let shown = e.hand.filter((c) => c.revealed).length;
    const hidden = e.hand.filter((c) => !c.revealed);
    DT.rng.shuffle(state, hidden);
    while (shown < e.reveal && hidden.length) {
      hidden.pop().revealed = true;
      shown++;
    }
  },

  // 다음 턴에 쓸 장수와 노릴 대상 결정(플레이어에게 표시)
  plan(state, e) {
    const playable = e.hand.filter((c) => !DT.cards.def(c.id).unplayable).length;
    e.intent = Math.min(DT.rng.int(state, e.actions[0], e.actions[1]), playable);
    DT.ai.enemyPlanTarget(state, e);
  },

  // 사용할 카드 고르기: 낼 수 있는(잠기지 않은) 손패에서 무작위
  choose(state, e) {
    return DT.rng.pick(state, e.hand.filter((c) => !c.locked && !DT.cards.def(c.id).unplayable));
  },

  act(state, e) {
    const card = DT.enemy.choose(state, e);
    e.pending--;
    if (!card) { DT.state.log(state, `${e.name}: 쓸 수 있는 카드가 없다 (🔒)`); return; }
    const def = DT.cards.def(card.id);
    const tgt = DT.ai.enemyActTarget(state, e);
    const ally = DT.ai.enemyAlly(state, e, def);
    DT.deck.removeFromHand(e, card.uid);
    DT.state.emit(state, { type: 'play', actor: e.id, card: Object.assign({}, card), target: DT.cards.isAttack(def) ? tgt : null });
    const tgtName = DT.cards.isAttack(def) ? ` → ${DT.state.actor(state, tgt).name}` : '';
    DT.state.log(state, `${e.name}: [${def.name}]${tgtName}`);
    DT.effects.resolveCard(state, e.id, tgt, card, null, ally);
    DT.deck.afterPlay(state, e, card);
    e.lastPlayed = card.id;
  },
};
