// 적: 자기 덱과 손패를 가지고, 손패 일부를 공개하며, 매 턴 1~2장 사용.
window.DT = window.DT || {};

DT.enemy = {
  create(state, kind) {
    const d = DT.data.enemies[kind];
    if (!d) throw new Error('알 수 없는 적: ' + kind);
    const e = {
      id: 'e' + (state.enemies.length + 1), kind,
      name: d.name, icon: d.icon, origin: d.origin,
      hp: d.hp, maxHp: d.hp, block: 0, statuses: {},
      handSize: d.handSize, reveal: d.reveal, actions: d.actions.slice(),
      drawPile: d.deck.map((id) => DT.state.makeCard(state, id)),
      hand: [], discardPile: [], exhaustPile: [],
      intent: 0, pending: 0, lastPlayed: null, dead: false,
    };
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

  // 다음 턴에 쓸 장수 결정(플레이어에게 표시)
  plan(state, e) {
    e.intent = Math.min(DT.rng.int(state, e.actions[0], e.actions[1]), e.hand.length);
  },

  // 사용할 카드 고르기. 1단계는 손패에서 무작위.
  choose(state, e) {
    return DT.rng.pick(state, e.hand);
  },

  act(state, e) {
    const card = DT.enemy.choose(state, e);
    e.pending--;
    if (!card) return;
    DT.deck.removeFromHand(e, card.uid);
    DT.state.emit(state, { type: 'play', actor: e.id, card: Object.assign({}, card) });
    DT.state.log(state, `${e.name}: [${DT.cards.def(card.id).name}]`);
    DT.effects.resolveCard(state, e.id, 'player', card, null);
    DT.deck.afterPlay(state, e, card);
    e.lastPlayed = card.id;   // 복제(3단계 이후)용
  },
};
