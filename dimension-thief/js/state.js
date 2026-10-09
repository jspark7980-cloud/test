// 게임 상태 생성과 공용 접근자. 상태는 순수 JSON 이라 그대로 저장된다.
window.DT = window.DT || {};

DT.state = {
  VERSION: 7,

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
      screen: 'pickCompanion', // 'pickCompanion' | 'map' | 'combat' | 'heist' | 'reward' | 'hideout' | 'market' | 'event' | 'runEnd'
      floor: 0,          // 맵의 현재 층
      map: null,         // { nodes: {id: node}, floors: [[id]] } — js/map.js
      pos: null,         // 현재 노드 id (출발 전 null)
      gold: 0,           // 판 안의 화폐
      runCoins: 0,       // 이번 판에서 얻은 코인(판 종료 시 비율대로 보존)
      combatKind: null,  // 'normal' | 'elite' | 'boss'
      lastLoot: null,
      market: null, event: null, seenEvents: [], removeCount: 0,
      runEnd: null,
      bag: [], pocket: [], pocketCap: 1, nextItemId: 1,   // 아이템 (js/items.js)
      fallen: [],        // 쓰러져 이탈한 동료(부활 깃털로 되살릴 수 있음)
      turnFlags: {},     // 이번 턴 한정 표시(쌍단검·손재주 비약 등)
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
        equip: { weapon: null, armor: null, accessory: null },
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
