// 로비 영구 강화. 코인으로 구매, 단계마다 비용 상승. 효과 처리는 js/lobby.js.
//  costs: 단계별 비용(길이 = 최대 단계)
//  levels: 단계별 설명
//  lockedUntil: 해당 기능이 생기는 단계(그 전에는 구매 불가)
window.DT = window.DT || {};
DT.data = DT.data || {};

DT.data.upgrades = {
  maxHp: {
    name: '단련된 몸', icon: '❤️', costs: [50, 100, 200, 350, 550], value: 5,
    levels: ['최대 체력 +5', '+10', '+15', '+20', '+25'],
  },
  startGold: {
    name: '비상금', icon: '💰', costs: [40, 90, 180, 300], value: 25,
    levels: ['시작 골드 +25', '+50', '+75', '+100'],
  },
  pilfer: {
    name: '손재주', icon: '🫳', costs: [80, 200, 400],
    levels: ['슬쩍하기: 대상에게 피해 2', '+ 방어도 3', '+ 카드 1장 뽑기'],
    // 단계마다 슬쩍하기에 더해지는 효과(누적)
    extra: [
      [{ type: 'damage', value: 2 }],
      [{ type: 'block', value: 3 }],
      [{ type: 'draw', value: 1 }],
    ],
  },
  companionSlot: {
    name: '동료 둘과 출발', icon: '👥', costs: [300],
    levels: ['출발할 때 동료 2명을 고른다'],
  },
  safePocket: {
    name: '안전 주머니', icon: '👝', costs: [150, 400], lockedUntil: 'E',
    levels: ['안전 주머니 2칸', '3칸'],
  },
  shopLevel: {
    name: '상점 단골', icon: '🏪', costs: [200, 500], lockedUntil: 'F',
    levels: ['상점 레벨 2', '레벨 3'],
  },
  startRelic: {
    name: '유물 수집가', icon: '🏺', costs: [100, 250, 450], lockedUntil: 'H',
    levels: ['시작 유물 후보 1개', '2개', '3개'],
  },
};
