// 특성. effect 키는 js/battle.js·js/stats.js에서 읽는다.
var ML = window.ML = window.ML || {};

ML.traitGrades = {
  legend: { name: '전설', color: 'rainbow' },
  gold:   { name: '금',   color: '#f5c542' },
  silver: { name: '은',   color: '#c9d1dc' },
  bronze: { name: '동',   color: '#c9844a' },
  bad:    { name: '나쁨', color: '#ff4b58' },
};

ML.traits = {
  bloodline:  { name: '전설의 혈통', grade: 'legend', desc: '공격·방어 +20%',               fx: { atk: 0.2, def: 0.2 } },
  timesense:  { name: '시간 감각',   grade: 'legend', desc: '항상 선공',                     fx: { firstStrike: true } },
  phoenix:    { name: '불사조의 심장', grade: 'legend', desc: '전투당 1회 치명적인 피해를 체력 1로 버팀', fx: { endure: true } },

  fury:       { name: '맹공',       grade: 'gold',   desc: '공격 +15%',                     fx: { atk: 0.15 } },
  ironwall:   { name: '철벽',       grade: 'gold',   desc: '방어 +15%',                     fx: { def: 0.15 } },
  swift:      { name: '신속',       grade: 'gold',   desc: '속도 +15%',                     fx: { spd: 0.15 } },
  vampire:    { name: '흡혈',       grade: 'gold',   desc: '준 피해의 10% 회복',            fx: { lifesteal: 0.1 } },
  breaker:    { name: '상성 파괴자', grade: 'gold',  desc: '불리 상성 감소 무시(공격할 때)', fx: { ignoreResist: true } },

  grit:       { name: '투지',       grade: 'silver', desc: '체력 30% 이하일 때 공격 +20%',  fx: { lowHpAtk: { below: 0.3, bonus: 0.2 } } },
  immune:     { name: '면역',       grade: 'silver', desc: '상태 이상에 걸릴 확률 -50%',     fx: { statusResist: 0.5 } },
  lucky:      { name: '행운아',     grade: 'silver', desc: '치명타 +10%',                   fx: { crit: 0.1 } },
  regen:      { name: '재생',       grade: 'silver', desc: '매 턴 체력 3% 회복',            fx: { regen: 0.03 } },
  attune:     { name: '속성 강화',   grade: 'silver', desc: '같은 속성 기술 +10%',           fx: { stabBonus: true } },

  muscle:     { name: '근력',       grade: 'bronze', desc: '공격 +5%',                      fx: { atk: 0.05 } },
  sturdy:     { name: '단단함',     grade: 'bronze', desc: '방어 +5%',                      fx: { def: 0.05 } },
  nimble:     { name: '날렵함',     grade: 'bronze', desc: '속도 +5%',                      fx: { spd: 0.05 } },
  glutton:    { name: '대식가',     grade: 'bronze', desc: '회복 아이템 효과 +20%',          fx: { itemHeal: 0.2 } },
  diligent:   { name: '부지런함',   grade: 'bronze', desc: '경험치 +10%',                   fx: { exp: 0.1 } },

  coward:     { name: '겁쟁이',     grade: 'bad',    desc: '체력 50% 이하일 때 공격 -20%',  fx: { lowHpAtk: { below: 0.5, bonus: -0.2 } } },
  lazy:       { name: '게으름',     grade: 'bad',    desc: '10% 확률로 행동하지 않음',       fx: { idleChance: 0.1 } },
  frail:      { name: '허약',       grade: 'bad',    desc: '방어 -10%',                     fx: { def: -0.1 } },
  unlucky:    { name: '불운',       grade: 'bad',    desc: '상대의 치명타 확률 +10%',        fx: { critTaken: 0.1 } },
};
