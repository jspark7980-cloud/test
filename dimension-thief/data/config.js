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
    weights: { combat: 44, event: 18, elite: 10, market: 10, hideout: 13, rift: 6 },
    minFloor: { elite: 4, hideout: 4, market: 3, rift: 5 },
  },

  // 차원 불안정 = 도둑 덱에서 현재 차원과 출신이 다른 카드 수(중립 출신 제외)
  //  safeMax 이하 안전 / unstableMax 이하: 전투 시작마다 mutateUnstable 장 변이 / 그 이상: mutateCritical 장 변이 + 매 턴 critDamage
  //  변이: 이번 전투 동안 그 카드가 noiseChance 확률로 '차원 잡음'(사용 불가), 아니면 다른 차원의 무작위 카드로 바뀜
  instability: { safeMax: 4, unstableMax: 7, mutateUnstable: 1, mutateCritical: 2, critDamage: 1, noiseChance: 0.6 },
  rift: { choices: 3 },                          // 차원 균열: 다음 차원 카드 중 고르는 수
  naturalize: { marketBase: 40, marketStep: 20 }, // 암시장 귀화 가격(골드), 은신처 귀화는 무료(그 은신처의 행동 1회)

  // 수배도: 일반 전투가 수배 추격대(정예)로 바뀔 확률 = 수배도 × perWanted (최대 cap)
  wanted: { ambushPerWanted: 0.04, ambushCap: 0.4, hideoutReduce: 2 },

  // 판 안의 화폐(골드)
  gold: {
    start: 40,
    combat: [12, 18], elite: [30, 40], boss: [60, 80],
    perWanted: 3,                 // 수배도 1당 전투 골드 +3
    dimMult: [1, 1.25, 1.5, 1.75], // 차원(1~4)별 전투 골드 배율
  },

  // 차원 이동(I단계): 보스를 쓰러뜨리면 다음 차원 1층부터. 이동할 때 아군 전원 최대 체력의 travelHeal 회복
  // freeNaturalize: 새 차원에 들어가면 맵에서 쓸 수 있는 무료 귀화 횟수(다음 차원으로 넘어가면 다시 이 값)
  dimension: { travelHeal: 0.3, freeNaturalize: 3 },

  // 판 밖의 화폐(코인): 승리 시 base + 깊이 × perFloor, 정예·보스 배수 (깊이 = 이전 차원 층 수 + 지금 층)
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
    sellPrice: { common: 15, rare: 50, hero: 120, legend: 300, cursed: 100 },
    marketConsumables: 2,
    marketPrice: { common: 30, rare: 55, hero: 90, legend: 150 },
  },

  // 유물(H단계): 정예 승리마다 1개, 이벤트·암시장에서도. 출처별 등급 가중치
  relics: {
    grades: {
      elite:  { common: 55, rare: 38, legend: 7 },
      event:  { common: 45, rare: 42, legend: 13 },
      market: { common: 60, rare: 35, legend: 5 },
    },
    marketChance: 0.6,                                  // 암시장에 유물 1개가 진열될 확률
    marketPrice: { common: 90, rare: 140, legend: 220 }, // 골드
    startGrades: ['common', 'rare'],                    // '유물 수집가' 출발 후보 등급
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
    price: { common: 30, rare: 80, hero: 200, legend: 500, cursed: 250 },
    refreshBase: 20, refreshStep: 10,         // 새로고침: 첫 회 20, 할 때마다 +10 (로비 귀환 시 무료 갱신·초기화)
  },
  stash: { cap: 40 },                         // 창고 칸(넘치면 구매 불가, 판 결과로 들어오는 아이템은 받아 둠)
  merchant: { otherRatio: 0.3 },              // 전리품이 아닌 아이템은 상점가의 30%에 판매
  forge: { max: 3, costMult: [0.5, 1, 1.5], perPlus: 0.5 },   // +1당 수치형 효과 +50%

  // 연출(v4 1단계): 피해 숫자 크기 = min(max, min + 피해 × per), bigHit 이상이면 튀어나옴
  fx: { dmgSizeMin: 24, dmgSizeMax: 76, dmgSizePer: 1.6, bigHit: 20, shakeMax: 14, cardFlyMs: 650, particles: 14, slowmoMs: 450 },

  ui: { enemyTurnStartDelay: 500, enemyActDelay: 1000, allyActDelay: 850, crowdSpeed: 0.55 },

  // 도둑 레벨(J단계): 누적 강탈(영입 포함) 수가 at 이상이면 그 레벨. 레벨마다 슬쩍하기에 extra 효과 누적(로비 '손재주'와 합산)
  thiefLevel: [
    { at: 0,  extra: [], desc: '기본' },
    { at: 5,  extra: [{ type: 'damage', value: 2 }], desc: '슬쩍하기 피해 +2' },
    { at: 15, extra: [{ type: 'block', value: 3 }], desc: '슬쩍하기 방어도 +3' },
    { at: 30, extra: [{ type: 'damage', value: 3 }], desc: '슬쩍하기 피해 +3' },
    { at: 50, extra: [{ type: 'draw', value: 1 }], desc: '슬쩍하기 카드 +1장' },
  ],

  // 승천(J단계): 클리어하면 다음 단계가 열린다. 고른 단계까지의 효과가 모두 쌓인다. 단계마다 코인 +coinBonus
  ascension: {
    coinBonus: 0.1,
    levels: [
      { desc: '정예 노드가 더 자주 나온다', eliteWeight: 6 },
      { desc: '은신처 휴식 회복 30% → 20%', restHeal: -0.1 },
      { desc: '적 체력 +10%', enemyHp: 0.1 },
      { desc: '차원 불안정 한도 −1', instability: -1 },
      { desc: '보스 체력 +15%', bossHp: 0.15 },
      { desc: '적이 힘 1을 갖고 전투 시작', enemyStrength: 1 },
    ],
  },

  // ── v4 2단계: 동료 뽑기 (코인) ──
  gacha: {
    cost1: 100, cost10: 900,
    rates: { common: 60, rare: 30, hero: 8.5, legend: 1.5 },
    pity: 50,                          // 마지막 전설 이후 이 횟수째는 전설 확정
    tenGuarantee: 'rare',              // 10회 뽑기에서 이 등급 이상 1명 보장
    maxBreak: 5,                       // 돌파 최대 단계(중복 1명 = 1단계)
    breakStat: 0.1,                    // 돌파 단계마다 체력·피해 +10%
    refund: { common: 10, rare: 30, hero: 80, legend: 200 },   // 돌파가 다 찬 뒤 중복은 코인으로
  },

  // ── v4 3단계: 동료 성장·시너지 ──
  growth: {
    maxLevel: 20,
    xp: { normal: 10, elite: 25, boss: 60, vault: 25 },   // 전투 승리 시(쓰러진 동료는 절반)
    xpPerLevel: 20,                    // 다음 레벨까지 필요 경험치 = 레벨 × xpPerLevel
    hpPerLevel: 0.03,                  // 레벨마다 체력 +3%
    // 레벨 보상: add = 대표 카드(sig) 1장 추가, upgrade = 덱 카드 n장 강화(all 이면 전부)
    milestones: { 5: { add: 1 }, 10: { upgrade: 2 }, 15: { add: 1 }, 20: { upgrade: 'all' } },
  },
  synergy: {
    ironwall: { takenMult: 0.9 },      // 철벽: 탱커 + 힐러 → 아군 받는 피해 −10%
    focus: { dealtMult: 1.2 },         // 집중포화: 딜러 2명 → 이번 라운드 다른 아군이 때린 적에게 피해 +20%
    perfect: { draw: 1 },              // 완벽한 파티: 탱커 + 딜러 + (힐러 또는 지원) → 드로우 +1
    homeland: { mult: 0.15 },          // 고향: 같은 차원 출신 동료 2명 이상, 그 차원에서 피해 +15% · 받는 피해 −15%
    thiefRole: 'dealer',               // 시너지 판정에서 도둑의 역할
  },

  // ── v4 4단계: 숨겨진 콘텐츠 ──
  vault: {
    minFloor: 4, chance: 0.012,         // 전투·이벤트 노드가 황금 금고로 바뀔 확률
    goldMult: 3, coinMult: 3, equips: 2, relic: 1, cursedChance: 0.35,
  },
  void: { floors: 6, protoHp: 600 },   // 비밀 차원 '차원의 틈'(층 수), 원조 도둑 체력
  cursed: { eliteChance: 0.04 },       // 정예 승리 시 저주 아이템이 추가로 나올 확률

  // 지금까지 만들어진 진행 단계(DESIGN.md 12장). 아직 없는 단계의 로비 강화는 잠긴다.
  builtStages: 'ABCDEFGHIJ',
};
