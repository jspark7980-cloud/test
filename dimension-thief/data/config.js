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
    // 판 종료 방식별 보존 비율
    keep: { mapEscape: 1, combatEscape: 0.7, death: 0.3, clear: 1 },
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

  ui: { enemyTurnStartDelay: 500, enemyActDelay: 1000, allyActDelay: 850 },
};
