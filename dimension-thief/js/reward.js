// 보상 후보 생성: 전투 보상 카드, 강탈 후보 카드.
window.DT = window.DT || {};

DT.reward = {
  // 현재 차원 + 도둑 카드 중 rarity 가 있는 카드에서 가중치로 중복 없이 n장
  // elite: 정예·보스 승리 시 상위 희귀도 가중치
  cardChoices(state, elite, n) {
    const R = DT.config.reward;
    const weights = elite ? R.eliteWeights : R.rarityWeights;
    const count = n || R.cardChoices;
    const pool = Object.entries(DT.data.cards)
      // 차원의 틈(chaos)에서는 모든 차원 카드가 나온다
      .filter(([, c]) => c.rarity && (c.origin === state.dimension || c.origin === 'thief' || DT.data.dimensions[state.dimension].chaos))
      .map(([id, c]) => ({ id, w: weights[c.rarity] || 0 }))
      .filter((x) => x.w > 0);
    const picks = [];
    while (picks.length < count && pool.length) {
      const total = pool.reduce((a, x) => a + x.w, 0);
      let r = DT.rng.next(state) * total;
      let i = 0;
      while (r >= pool[i].w) { r -= pool[i].w; i++; }
      picks.push(pool.splice(i, 1)[0].id);
    }
    return picks;
  },

  // 강탈 후보: 그 적의 덱에 있는 카드 종류 전부
  heistOptions(kind) {
    return [...new Set(DT.data.enemies[kind].deck)].filter((id) => !DT.cards.def(id).unplayable);
  },
};
