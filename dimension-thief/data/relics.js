// 유물: 판 동안 파티 전체에 붙는 지속 효과. 판이 끝나면 사라진다(창고로 가지 않음).
//  grade: 'common' 일반 | 'rare' 희귀 | 'legend' 전설
//  fx: 효과 키 → 값. 키별 처리 위치는 js/relics.js 상단 표 참고.
//  얻는 곳: 정예 승리, 이벤트, 암시장, 출발 시 '유물 수집가' 강화(일반·희귀 중에서)
window.DT = window.DT || {};
DT.data = DT.data || {};

DT.data.relics = {
  // ── 일반 ──
  lockpick:     { grade: 'common', name: '자물쇠따개', icon: '🔓',
                  desc: '전투 첫 턴 에너지 +1', fx: { firstTurnEnergy: 1 } },
  bloody_dice:  { grade: 'common', name: '피 묻은 주사위', icon: '🎲',
                  desc: '전투에서 이기면 도둑 체력 4 회복', fx: { winHeal: 4 } },
  gold_tooth:   { grade: 'common', name: '금니', icon: '🦷',
                  desc: '전투 골드 +30%', fx: { goldMult: 0.3 } },
  war_banner:   { grade: 'common', name: '동료의 깃발', icon: '🚩',
                  desc: '전투 시작 시 동료 전원 방어도 5', fx: { allyCombatBlock: 5 } },

  // ── 희귀 ──
  pocket_watch: { grade: 'rare', name: '회중시계', icon: '⌚',
                  desc: '3턴마다(3·6·9…) 에너지 +1, 카드 1장 뽑기', fx: { everyThirdTurn: 1 } },
  alarm_jammer: { grade: 'rare', name: '경보 교란기', icon: '📡',
                  desc: '수배 추격대가 나타날 확률 절반', fx: { ambushMult: 0.5 } },
  royal_signet: { grade: 'rare', name: '왕실 인장', icon: '🔏',
                  desc: '강탈 기준 체력 +10%p (25% → 35%)', fx: { heistThresholdAdd: 0.1 } },
  rift_tuner:   { grade: 'rare', name: '차원 조율기', icon: '🎛️',
                  desc: '변이한 카드가 차원 잡음이 되지 않고 항상 다른 차원 카드가 된다', fx: { noNoise: 1 } },

  // ── 전설 ──
  phantom_mask: { grade: 'legend', name: '대도의 가면', icon: '🎭',
                  desc: '매 턴 첫 슬쩍하기 비용 0', fx: { firstPilferFree: 1 } },
  rift_heart:   { grade: 'legend', name: '차원의 심장', icon: '💗',
                  desc: '매 턴 에너지 +1, 대신 차원 불안정 +2', fx: { energyPerTurn: 1, instabilityAdd: 2 } },
};
