// 상태 효과 정의. 피해 보정·감소 시점을 데이터로 지정한다.
//  decay: 'turnEnd' | 'turnStart' | null  (해당 시점에 1 감소)
//  turnStartDamage: 턴 시작 시 수치만큼 방어도 무시 피해
//  damageDealtAdd: 수치 × 값 만큼 공격 피해 가산
//  damageDealtMult / damageTakenMult: 수치가 1 이상이면 배율 적용
window.DT = window.DT || {};
DT.data = DT.data || {};

DT.data.statuses = {
  vulnerable: { name: '취약', icon: '💔', kind: 'debuff', decay: 'turnEnd', damageTakenMult: 1.5,
                desc: '받는 피해 +50%. 자기 턴 종료 시 1 감소.' },
  weak:       { name: '약화', icon: '🥀', kind: 'debuff', decay: 'turnEnd', damageDealtMult: 0.75,
                desc: '주는 피해 -25%. 자기 턴 종료 시 1 감소.' },
  strength:   { name: '힘',   icon: '💪', kind: 'buff',   decay: null, damageDealtAdd: 1,
                desc: '공격 피해 + 수치.' },
  taunt:      { name: '도발', icon: '📢', kind: 'buff', decay: 'turnEnd', taunt: true,
                desc: '적의 단일 대상 공격을 이 캐릭터가 받는다. 자기 턴 종료 시 1 감소.' },
  turret:     { name: '포탑', icon: '🛰️', kind: 'buff', decay: null, turnStartHitAll: 2,
                desc: '자기 턴 시작 시 수치마다 모든 적에게 피해 2.' },
  poison:     { name: '독',   icon: '☠️', kind: 'debuff', decay: 'turnStart', turnStartDamage: true,
                desc: '자기 턴 시작 시 수치만큼 피해(방어도 무시) 후 1 감소.' },
};
