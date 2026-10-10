// 모든 수치는 여기에 모은다. (DESIGN.md의 숫자는 초기값)
var ML = window.ML = window.ML || {};

ML.config = {
  version: 1,
  saveKey: 'monster-lab-v1',

  // 속성 상성
  typeAdvantage: 1.5,
  typeDisadvantage: 0.67,
  stab: 1.2,               // 자기 속성 기술
  traitStabBonus: 0.1,     // 특성 "속성 강화"

  // 능력치
  maxLevel: 100,            // (요청으로 50 → 100)
  statPerLevel: 0.06,      // 능력치 = 종족값 × (1 + 레벨 × 0.06) × 개체값
  hpPerLevel: 3,           // 체력만 + 레벨 × 3
  ivRange: 0.1,            // 개체값 0.9 ~ 1.1

  // 피해 = 위력 × (공격/방어) × (lvBase + 레벨 × lvScale) × dmgScale × 배율들
  damage: { lvBase: 0.7, lvScale: 0.025, scale: 0.42, randMin: 0.9, randMax: 1.1, minDamage: 1 },
  critChance: 0.05,
  critMultiplier: 1.5,

  // 회복 기술: 같은 전투에서 쓸 때마다 회복량 × 0.7 (회복 기술끼리 끝없이 버티지 않게)
  healDecay: 0.7,

  // 능력 단계(-3 ~ +3), 단계당 배율
  stageMax: 3,
  stagePerStep: 0.25,      // 공격·방어·속도: 1 + 0.25 × 단계 (음수면 1 / (1 + 0.25 × |단계|))
  evasionPerStep: 0.1,     // 회피 단계당 10%p

  // 상태 이상
  status: {
    burn:   { turns: 4, dotPct: 0.06, atkMul: 0.75 },
    para:   { turns: 4, skipChance: 0.25, spdMul: 0.5 },
    sleep:  { minTurns: 1, maxTurns: 3, wakeOnHit: 0.3 },
    poison: { turns: 5, dotPct: 0.08 },
  },

  // 고유 능력(성향)
  ability: {
    counterPct: 0.2,        // 반격: 받은 피해의 20%
    contactParaChance: 0.2, // 접촉 반격: 상대 마비 20%
    damageReduce: 0.15,     // 피해 흡수: 받는 피해 -15%
    critBonus: 0.1,         // 치명타 성향
    teamAtkBuff: 0.1,       // 촛불요정: 아군 공격 +10%
    baseEvasion: 0.1,       // 해무가오리 기본 회피
    dayNightBonus: 0.3,     // 일식룡
    nightSpdBonus: 0.2,
    rainTurns: 5,           // 폭풍고래
    rainBonus: 0.3,
    reviveHpPct: 0.4,       // 세계수거인
    sealTurns: 2,           // 기술 봉인
    // 합성 전용종
    steamBurn: 0.2, thunderCritPara: 0.5, mossRegen: 0.04, phantomEvasion: 0.15, sporeSleep: 0.2,
  },

  // 특성
  traits: {
    slots: 3,             // 태어날 때 항상 3개
    maxSlots: 4,          // 4번째 칸은 합성 돌연변이로만
    // 등급 가중치(%) — 칸마다 따로 뽑는다
    gradeTables: {
      low:      { bronze: 60, bad: 22, silver: 14, gold: 3.5, legend: 0.5 }, // 1·2지역, 첫 몬스터, 합성 빈 칸
      high:     { bronze: 50, bad: 20, silver: 21, gold: 7.5, legend: 1.5 }, // 3·4지역
      mutation: { bronze: 40, bad: 20, silver: 25, gold: 12,  legend: 3 },
      legendary: { bronze: 15, bad: 0, silver: 40, gold: 35, legend: 10 },   // 전설 조우: 나쁜 특성 없음, 금 이상 1개 보장
    },
  },

  // 적 AI
  // 교환 효율 = (내 최고 공격이 깎는 상대 체력 비율) ÷ (상대 최고 공격이 깎는 내 체력 비율)
  // 효율이 switchIfBelow 이하면 "크게 불리" → 효율이 switchGain배 이상인 대기 몬스터가 있으면 switchChance 확률로 교체
  ai: { switchIfBelow: 0.8, switchGain: 2, switchChance: 0.8, potionBelow: 0.3 },

  // 경험치: 쓰러뜨린 몬스터 레벨 × 종별 기본값.
  // shareAll: true면 파티 전원이 전부 받는다(나누지 않음). false면 그 전투에 나온 몬스터끼리 나눈다.
  exp: {
    shareAll: true,
    rate: 0.5,                         // 받는 경험치 배율(전원 지급이라 절반)
    base: { 1: 6, 2: 9, 3: 12, rare: 12, fusion: 14, legend: 20, hidden: 20 },
    nextBase: 12, nextPerLevel: 6,     // 다음 레벨 필요 = 12 + 레벨 × 6
  },

  // 포획: 확률 = 종 기본율 × (1 + 2 × (1 − 남은 체력 비율)) × 상태 배율 × 도구 배율, 최대 95%
  capture: {
    base: { 1: 0.40, 2: 0.25, 3: 0.12, rare: 0.10, fusion: 0.08, legend: 0.04, hidden: 0.02 },
    lowHpBonus: 2,
    status: { sleep: 2.0, para: 1.5, burn: 1.3, poison: 1.3 },
    specialSame: 2.5, specialOther: 0.5,
    max: 0.95,
  },
  shinyChance: 1 / 150,

  // 도망: 확률 = base × 내 속도 ÷ 상대 속도 (min~max)
  run: { base: 0.7, min: 0.3, max: 0.95 },

  // 탐색 한 번: 야생 조우 / 물건 발견 / 아무것도 없음 (가중치)
  search: { wild: 75, item: 15, nothing: 10, rareChance: 0.05,
            finds: [['potion', 40], ['ball', 40], ['gold', 20]], goldMin: 20, goldMax: 50 },
  clearSearches: 3,        // 장소에서 탐색 3회(또는 트레이너 승리)하면 이웃 장소가 열린다

  // 골드
  startGold: 300,
  startItems: { ball: 5, potion: 3 },
  wildGold: 2,             // 야생 승리: 레벨 × 2
  loseGoldPct: 0.2,        // 전멸 시 잃는 골드
  partyMax: 3,

  // 합성: 부모 2마리 + 합성석. 부모는 전투 3회 휴식, 알은 전투 5회 뒤 부화
  fusion: {
    restBattles: 3, hatchBattles: 5, maxEggs: 3,
    moveInherit: 0.3, ivSpread: 0.05,
    mutation: 0.05, mutationCatalyst: 0.15,
    // 부모 특성 풀에서 물려받는 개수(나머지 칸은 새 특성)
    inherit:      { 0: 25, 1: 40, 2: 25, 3: 10 },
    inheritCharm: { 0: 5, 1: 30, 2: 40, 3: 25 },
    shinyBothParents: 0.25,
    hatchMinLevel: 5,
  },

  // 대련장: 보상 = 상대 레벨 × 3마리 × goldPerLv × 연승 배율(이길 때마다 +20%, 최대 +100%)
  spar: {
    streakStep: 0.2, streakMax: 1.0,
    tiers: [
      { name: '가벼운 대련', icon: '🙂', lvOffset: -3, goldPerLv: 4,  traits: 'low',  potions: 0, desc: '내 파티 평균보다 3레벨 낮다' },
      { name: '정식 대련',   icon: '😤', lvOffset: 0,  goldPerLv: 7,  traits: 'low',  potions: 1, desc: '내 파티 평균 레벨, 회복약 1개' },
      { name: '강적 대련',   icon: '😈', lvOffset: 3,  goldPerLv: 11, traits: 'high', potions: 1, desc: '3레벨 높고 좋은 특성이 잘 붙는다' },
      { name: '지옥 대련',   icon: '💀', lvOffset: 6,  goldPerLv: 16, traits: 'high', potions: 2, desc: '6레벨 높고 회복약 2개' },
    ],
  },

  // 시험 전투
  test: { defaultLevel: 10, expBoost: 10 },
};
