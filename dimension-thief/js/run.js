// 한 판(런) 진행: 전투 → 강탈 → 카드 보상 → 다음 전투.
// 3단계에서 맵이 생기면 nextCombat 을 맵 노드 선택으로 바꾼다.
window.DT = window.DT || {};

DT.run = {
  start(seed) {
    const s = DT.state.createRun(seed);
    DT.run.nextCombat(s);
    return s;
  },

  pickEncounter(state) {
    const list = DT.data.encounters[state.dimension] || [];
    const tier = state.floor <= DT.config.encounters.tier1UntilFloor ? 1 : 2;
    let pool = list.filter((e) => e.tier === tier && e.id !== state.lastEncounter);
    if (!pool.length) pool = list.filter((e) => e.id !== state.lastEncounter);
    if (!pool.length) pool = list;
    return DT.rng.pick(state, pool);
  },

  nextCombat(state) {
    state.floor++;
    const enc = DT.run.pickEncounter(state);
    state.lastEncounter = enc.id;
    state.screen = 'combat';
    state.heist = null;
    state.reward = null;
    DT.state.log(state, `── 전투 ${state.floor} ──`);
    DT.combat.start(state, enc.enemies);
  },

  // 전투가 끝났으면 다음 화면으로. 상태가 바뀌면 true.
  resolve(state) {
    if (state.screen !== 'combat' || !state.result) return false;
    if (state.result === 'lose') {
      state.screen = 'over';
      return true;
    }
    state.stats.kills += state.enemies.length;
    const groups = state.enemies.filter((e) => e.executed).map((e) => ({
      enemyName: e.name, kind: e.kind, options: DT.reward.heistOptions(e.kind),
    }));
    state.heist = groups.length ? { picksLeft: Math.min(DT.config.heist.maxPerCombat, groups.length), groups } : null;
    state.reward = { options: DT.reward.cardChoices(state) };
    state.screen = state.heist ? 'heist' : 'reward';
    DT.state.emit(state, { type: 'victory', floor: state.floor });
    return true;
  },

  // 강탈 가능한 적이 여럿이면 그중 한 적의 카드 1장을 고른다(전투당 maxPerCombat 회)
  takeHeist(state, cardId) {
    const h = state.heist;
    if (state.screen !== 'heist' || !h) return false;
    const gi = h.groups.findIndex((g) => g.options.includes(cardId));
    if (gi < 0) return false;
    const g = h.groups.splice(gi, 1)[0];
    state.player.masterDeck.push(DT.state.makeCard(state, cardId));
    state.wanted++;
    state.stats.heists++;
    DT.state.log(state, `강탈! [${DT.cards.def(cardId).name}]이(가) 덱에 영구히 추가됐다. 수배도 +1`);
    DT.state.emit(state, { type: 'heist', cardId, from: g.kind });
    h.picksLeft--;
    if (h.picksLeft <= 0 || !h.groups.length) { state.heist = null; state.screen = 'reward'; }
    return true;
  },

  skipHeist(state) {
    if (state.screen !== 'heist') return false;
    state.heist = null;
    state.screen = 'reward';
    return true;
  },

  takeReward(state, cardId) {
    if (state.screen !== 'reward' || !state.reward || !state.reward.options.includes(cardId)) return false;
    state.player.masterDeck.push(DT.state.makeCard(state, cardId));
    DT.state.log(state, `[${DT.cards.def(cardId).name}]을(를) 덱에 추가했다.`);
    DT.run.nextCombat(state);
    return true;
  },

  skipReward(state) {
    if (state.screen !== 'reward') return false;
    DT.run.nextCombat(state);
    return true;
  },
};
