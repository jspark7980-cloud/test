// 게임 상태 생성과 공용 접근자. 상태는 순수 JSON 이라 그대로 저장된다.
window.DT = window.DT || {};

DT.state = {
  VERSION: 4,

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
      screen: 'combat',  // 'pickCompanion' | 'combat' | 'heist' | 'reward' | 'over'
      floor: 0,          // 몇 번째 전투인지
      wanted: 0,         // 수배도: 강탈 시 +1
      heist: null,       // 강탈 대기 { picksLeft, groups:[{ enemyName, kind, options:[카드 id] }] }
      reward: null,      // 카드 보상 { options:[카드 id] }
      lastEncounter: null,
      phase: 'player',   // 전투 내: 'player' | 'ally'(동료 행동) | 'enemy' | 'over'
      orders: {},        // 지휘 카드 효과(이번 라운드): { focus: 적 id, cover: 탱커 id }
      starterOptions: null,
      result: null,      // 전투 결과: null | 'win' | 'lose'
      log: [],
      events: [],        // UI 연출용, 화면에 그린 뒤 비운다
      stats: { steals: 0, heists: 0, copies: 0, kills: 0, recruits: 0 },
      player: {
        id: 'player', name: P.name, icon: P.icon, row: 'front', homeRow: 'front',
        hp: C.hp, maxHp: C.hp, block: 0, statuses: {},
        energy: 0, maxEnergy: C.energy, drawPerTurn: C.draw, maxHand: C.maxHand,
        masterDeck: [], drawPile: [], hand: [], discardPile: [], exhaustPile: [],
      },
      allies: [],        // 동료(도둑 제외). 판 동안 유지, 쓰러지면 전투 후 이탈
      nextAllyId: 1,
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
    return state.allies.find((a) => a.id === id) || state.enemies.find((e) => e.id === id) || null;
  },

  // 아군 쪽 id: 도둑('player') 또는 동료('a…')
  isAlly(id) {
    return id === 'player' || /^a\d/.test(id);
  },

  log(state, msg) {
    state.log.push(msg);
    if (state.log.length > 40) state.log.shift();
  },

  emit(state, ev) {
    state.events.push(ev);
  },
};
