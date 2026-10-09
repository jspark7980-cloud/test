// 게임 전체 수치. 밸런스 조정은 여기와 카드·적 데이터에서만 한다.
window.DT = window.DT || {};

DT.config = {
  player: { hp: 60, energy: 3, draw: 5, maxHand: 10 },

  // 파티: 동료 슬롯(파티 최대 = 도둑 + 슬롯), 동료 손패(매 턴 이 중 1장 사용)
  party: { companionSlots: 2, companionHand: 2, dangerRatio: 0.5, healBelow: 0.5 },

  // 강탈: 내 턴 시작 시 체력이 threshold 이하였던 적을 그 턴에 처치하면 강탈 가능.
  // 체력이 기준 아래로 떨어진 턴에 바로 처치하면 강탈되지 않는다(한 턴 버티는 선택).
  heist: { threshold: 0.25, maxPerCombat: 1 },

  reward: {
    cardChoices: 3,
    rarityWeights: { common: 60, uncommon: 30, rare: 10 },
    eliteWeights: { common: 30, uncommon: 45, rare: 25 },   // 정예·보스 승리 시
  },

  encounters: { tier1UntilFloor: 3 },   // 이 층까지는 tier 1 구성

  // 맵: 차원마다 floors 층, 층당 노드 2~4개. 마지막 층은 보스, 그 앞 층은 은신처.
  map: {
    floors: 12, lanes: 4, paths: 4,
    // 2층 ~ (보스-2)층 노드 종류 가중치. 정예·은신처는 minFloor 이상에서만.
    weights: { combat: 46, event: 20, elite: 10, market: 10, hideout: 14 },
    minFloor: { elite: 4, hideout: 4, market: 3 },
  },

  // 수배도: 일반 전투가 수배 추격대(정예)로 바뀔 확률 = 수배도 × perWanted (최대 cap)
  wanted: { ambushPerWanted: 0.04, ambushCap: 0.4, hideoutReduce: 2 },

  // 판 안의 화폐(골드)
  gold: {
    start: 40,
    combat: [12, 18], elite: [30, 40], boss: [60, 80],
    perWanted: 3,                 // 수배도 1당 전투 골드 +3
  },

  // 판 밖의 화폐(코인): 승리 시 base + 층 × perFloor, 정예·보스 배수
  coins: {
    base: 8, perFloor: 2, eliteMult: 2, bossMult: 5,
    // 판 종료 방식별 보존 비율 (scroll: 귀환 두루마리)
    keep: { mapEscape: 1, combatEscape: 0.7, death: 0.3, clear: 1, scroll: 1 },
  },

  // 은신처
  hideout: { healRatio: 0.3 },

  // 암시장
  market: {
    cards: 3,
    price: { common: 45, uncommon: 70, rare: 110 },
    removeBase: 60, removeStep: 25,
  },

  // 카드 강화(은신처): 숫자 효과에 더하는 값. 카드에 upgrade 가 정의돼 있으면 그쪽 우선.
  upgrade: { damage: 3, block: 3, heal: 3, status: 1, draw: 1, energy: 0, loseHp: 0 },

  // 아이템
  items: {
    bag: 8,                  // 가방 칸
    pocketBase: 1,           // 안전 주머니 기본 칸(로비 강화로 +1씩)
    // 전투 후 드롭: 일반 전투는 chance 확률로 소모품/전리품 1개, 정예는 장비 1 + 추가, 보스는 장비 1 + 전리품 1
    drop: {
      normal: { chance: 0.25, kinds: { consumable: 60, loot: 40 } },
      elite:  { equip: 1, extraChance: 0.4, kinds: { consumable: 70, loot: 30 } },
      boss:   { equip: 1, loot: 1 },
    },
    // 등급 확률(가중치). deepFloor 층부터 deepShift 만큼 위 등급으로 이동
    grades: {
      normal: { common: 70, rare: 24, hero: 5, legend: 1 },
      elite:  { common: 40, rare: 38, hero: 18, legend: 4 },
      boss:   { common: 15, rare: 40, hero: 33, legend: 12 },
    },
    deepFloor: 7, deepShift: { common: -15, rare: 7, hero: 6, legend: 2 },
    // 판매가(코인, F단계 상인) / 암시장 소모품 가격(골드)
    sellPrice: { common: 15, rare: 50, hero: 120, legend: 300 },
    marketConsumables: 2,
    marketPrice: { common: 30, rare: 55, hero: 90, legend: 150 },
  },

  // 로비 시설 (코인)
  shop: {
    slots: [5, 6, 7],                         // 상점 레벨 1~3 진열 칸
    weights: [                                // 레벨별 등급 확률(일반/희귀/영웅/전설)
      { common: 60, rare: 28, hero: 10, legend: 2 },
      { common: 55, rare: 30, hero: 12, legend: 3 },
      { common: 48, rare: 32, hero: 16, legend: 4 },
    ],
    kinds: { equip: 65, consumable: 35 },
    price: { common: 30, rare: 80, hero: 200, legend: 500 },
    refreshBase: 20, refreshStep: 10,         // 새로고침: 첫 회 20, 할 때마다 +10 (로비 귀환 시 무료 갱신·초기화)
  },
  stash: { cap: 40 },                         // 창고 칸(넘치면 구매 불가, 판 결과로 들어오는 아이템은 받아 둠)
  merchant: { otherRatio: 0.3 },              // 전리품이 아닌 아이템은 상점가의 30%에 판매
  forge: { max: 3, costMult: [0.5, 1, 1.5], perPlus: 0.5 },   // +1당 수치형 효과 +50%

  ui: { enemyTurnStartDelay: 500, enemyActDelay: 1000, allyActDelay: 850 },

  // 지금까지 만들어진 진행 단계(DESIGN.md 12장). 아직 없는 단계의 로비 강화는 잠긴다.
  builtStages: 'ABCDEF',
};
