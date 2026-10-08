// 전투 보상 규칙.
//  cardChoices: 보여줄 카드 수
//  rarityWeights: 희귀도별 등장 가중치
//  heistThreshold: 이 비율 이하 체력에서 처치하면 강탈
window.DT = window.DT || {};
DT.data = DT.data || {};

DT.data.rewards = {
  cardChoices: 3,
  rarityWeights: { common: 60, uncommon: 30, rare: 10 },
  heistThreshold: 0.25,
};
