// 메가진화 [제안]: 그 종 전용 메가 결정을 지닌 몬스터가 전투당 1번(편마다 1마리) 변신한다. 전투가 끝나면 돌아온다.
// bonus: 종족값에 더하는 값(체력은 그대로) · fx: 메가 능력(원래 고유 능력에 더해진다)
//   elBoost {속성: 배율} · dmgReduce 받는 피해 감소 · regen 매 턴 회복 · firstStrike 항상 선공 · crit 치명타 + · burnOnHit 공격이 맞으면 화상 확률 · rainForever 비가 그치지 않음
var ML = window.ML = window.ML || {};

ML.megas = {
  furnacerat:   { name: '메가 용광서',   bonus: { atk: 25, def: 20, spd: 20 }, ability: '작열',       desc: '불꽃 기술 +20%, 공격이 맞으면 20% 확률로 화상', fx: { elBoost: { fire: 0.2 }, burnOnHit: 0.2 } },
  tidalshell:   { name: '메가 해일갑각', bonus: { atk: 20, def: 30, spd: 10 }, ability: '거대 껍데기', desc: '받는 피해 -15%', fx: { dmgReduce: 0.15 } },
  eldwarden:    { name: '메가 고목수호', bonus: { atk: 20, def: 25, spd: 20 }, ability: '대지의 숨결', desc: '매 턴 끝에 체력 6% 회복', fx: { regen: 0.06 } },
  stormphoenix: { name: '메가 천둥봉황', bonus: { atk: 25, def: 10, spd: 25 }, ability: '뇌속',       desc: '항상 먼저 움직인다', fx: { firstStrike: true } },
  ridgebear:    { name: '메가 산맥곰',   bonus: { atk: 30, def: 25, spd: 5 }, ability: '산사태',     desc: '바위 기술 +20%, 받는 피해 -10%', fx: { elBoost: { rock: 0.2 }, dmgReduce: 0.1 } },
  eclipsecat:   { name: '메가 월식묘',   bonus: { atk: 25, def: 10, spd: 25 }, ability: '그림자 송곳니', desc: '치명타 확률 +15%', fx: { crit: 0.15 } },
  eclipsedragon: { name: '메가 일식룡',  bonus: { atk: 25, def: 10, spd: 10 }, ability: '개기일식',   desc: '낮·밤과 상관없이 불꽃·그림자 기술 +20%', fx: { elBoost: { fire: 0.2, shadow: 0.2 } } },
  stormwhale:   { name: '메가 폭풍고래', bonus: { atk: 20, def: 20, spd: 10 }, ability: '끝없는 폭풍', desc: '변신하면 비가 내리고, 비가 그치지 않는다', fx: { rainForever: true } },
  worldtree:    { name: '메가 세계수거인', bonus: { atk: 20, def: 25, spd: 5 }, ability: '세계수의 축복', desc: '매 턴 끝에 체력 5% 회복, 받는 피해 -10%', fx: { regen: 0.05, dmgReduce: 0.1 } },
};
