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
  maxLevel: 50,
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

  // 진화 레벨
  evolveLevels: { three: [16, 32], two: [22] },

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
    },
  },

  // 1단계 시험 전투
  test: { defaultLevel: 10 },
};
