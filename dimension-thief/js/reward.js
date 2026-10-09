// 보상 후보 생성: 전투 보상 카드, 강탈 후보 카드.
window.DT = window.DT || {};

DT.reward = {
  // 현재 차원 + 도둑 카드 중 rarity 가 있는 카드에서 가중치로 중복 없이 n장
  cardChoices(state) {
    const R = DT.config.reward;
    const pool = Object.entries(DT.data.cards)
      .filter(([, c]) => c.rarity && (c.origin === state.dimension || c.origin === 'thief'))
      .map(([id, c]) => ({ id, w: R.rarityWeights[c.rarity] || 0 }))
      .filter((x) => x.w > 0);
    const picks = [];
    while (picks.length < R.cardChoices && pool.length) {
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
    return [...new Set(DT.data.enemies[kind].deck)];
  },
};
