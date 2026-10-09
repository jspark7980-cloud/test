// 게임 상태 생성과 공용 접근자. 상태는 순수 JSON 이라 그대로 저장된다.
window.DT = window.DT || {};

DT.state = {
  VERSION: 3,

  createRun(seed) {
    const P = DT.data.player;
    const C = DT.config.player;
    const s = {
      version: DT.state.VERSION,
      seed,
      rng: DT.rng.hashSeed(String(seed)),
      nextUid: 1,
      dimension: 'medieval',
      turn: 0,
      screen: 'combat',  // 'combat' | 'heist' | 'reward' | 'over'
      floor: 0,          // 몇 번째 전투인지
      wanted: 0,         // 수배도: 강탈 시 +1
      heist: null,       // 강탈 대기 { picksLeft, groups:[{ enemyName, kind, options:[카드 id] }] }
      reward: null,      // 카드 보상 { options:[카드 id] }
      lastEncounter: null,
      phase: 'player',   // 전투 내: 'player' | 'enemy' | 'over'
      result: null,      // 전투 결과: null | 'win' | 'lose'
      log: [],
      events: [],        // UI 연출용, 화면에 그린 뒤 비운다
      stats: { steals: 0, heists: 0, copies: 0, kills: 0 },
      player: {
        id: 'player', name: P.name, icon: P.icon,
        hp: C.hp, maxHp: C.hp, block: 0, statuses: {},
        energy: 0, maxEnergy: C.energy, drawPerTurn: C.draw, maxHand: C.maxHand,
        masterDeck: [], drawPile: [], hand: [], discardPile: [], exhaustPile: [],
      },
      enemies: [],
    };
    P.starterDeck.forEach((id) => s.player.masterDeck.push(DT.state.makeCard(s, id)));
    return s;
  },

  // 카드 인스턴스: 정의(id) + 개별 속성(출신 등). 귀화는 origin 만 바꾸면 된다.
  makeCard(state, id, extra) {
    const def = DT.cards.def(id);
    return Object.assign({ uid: 'c' + state.nextUid++, id, origin: def.origin }, extra || {});
  },

  actor(state, id) {
    if (id === 'player') return state.player;
    return state.enemies.find((e) => e.id === id) || null;
  },

  log(state, msg) {
    state.log.push(msg);
    if (state.log.length > 40) state.log.shift();
  },

  emit(state, ev) {
    state.events.push(ev);
  },
};
