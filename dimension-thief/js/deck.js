// 덱 → 손패 → 버린 더미 흐름. 플레이어·적 모두 같은 함수를 쓴다.
window.DT = window.DT || {};

DT.deck = {
  reshuffle(state, actor) {
    actor.drawPile = DT.rng.shuffle(state, actor.discardPile.splice(0));
    if (actor.id === 'player') DT.state.log(state, '버린 더미를 섞어 덱으로 만들었다.');
  },

  // n장 뽑기. 손패가 가득 차면 뽑은 카드는 버린 더미로.
  draw(state, actor, n) {
    const max = actor.maxHand || 10;
    let drawn = 0;
    for (let i = 0; i < n; i++) {
      if (!actor.drawPile.length) {
        if (!actor.discardPile.length) break;
        DT.deck.reshuffle(state, actor);
      }
      const card = actor.drawPile.pop();
      if (actor.hand.length >= max) {
        actor.discardPile.push(card);
        if (actor.id === 'player') DT.state.log(state, `손패가 가득 차 ${DT.cards.def(card.id).name}을(를) 버렸다.`);
      } else {
        actor.hand.push(card);
        drawn++;
      }
    }
    if (drawn && actor.id === 'player') DT.state.emit(state, { type: 'draw', n: drawn });   // 뽑기 효과음
    return drawn;
  },

  discardHand(state, actor) {
    actor.discardPile.push(...actor.hand.splice(0));
  },

  // 사용한 카드 처리
  afterPlay(state, actor, card) {
    const def = DT.cards.def(card.id);
    delete card.revealed;
    (def.exhaust ? actor.exhaustPile : actor.discardPile).push(card);
  },

  removeFromHand(actor, uid) {
    const i = actor.hand.findIndex((c) => c.uid === uid);
    return i >= 0 ? actor.hand.splice(i, 1)[0] : null;
  },
};
