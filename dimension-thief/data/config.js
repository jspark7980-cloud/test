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
  },

  encounters: { tier1UntilFloor: 2 },   // 이 전투까지는 tier 1 구성

  ui: { enemyTurnStartDelay: 500, enemyActDelay: 1000, allyActDelay: 850 },
};
