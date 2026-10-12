// 기술. kind: 'attack'(피해) / 'support'(변화)
// fx: status{type,chance} · self{stat:n} · foe{stat:n, chance} · heal(최대 체력 비율) · drain(준 피해 비율)
//     crit(추가 치명 확률) · seal(상대 마지막 기술 봉인) · mimic(상대 마지막 기술 따라 쓰기)
var ML = window.ML = window.ML || {};

ML.moves = {
  // 불꽃
  ember:       { name: '불똥 튀기기', el: 'fire', kind: 'attack', power: 40, acc: 100 },
  flameclaw:   { name: '불꽃 할퀴기', el: 'fire', kind: 'attack', power: 60, acc: 95, fx: { status: { type: 'burn', chance: 0.1 } } },
  flamerush:   { name: '화염 돌진',   el: 'fire', kind: 'attack', power: 80, acc: 90 },
  eruption:    { name: '용암 분출',   el: 'fire', kind: 'attack', power: 110, acc: 80 },
  warcry:      { name: '열기 함성',   el: 'fire', kind: 'support', acc: 100, fx: { self: { atk: 1 } } },
  willfire:    { name: '도깨비불',    el: 'fire', kind: 'support', acc: 85, fx: { status: { type: 'burn', chance: 1 } } },
  magmashell:  { name: '마그마 갑옷', el: 'fire', kind: 'support', acc: 100, fx: { self: { def: 2 } } },

  // 물결
  splash:      { name: '물보라',      el: 'water', kind: 'attack', power: 40, acc: 100 },
  bubbleclaw:  { name: '거품 집게',   el: 'water', kind: 'attack', power: 60, acc: 95, fx: { foe: { spd: -1, chance: 0.2 } } },
  toxicmud:    { name: '독 진흙',     el: 'water', kind: 'attack', power: 45, acc: 100, fx: { status: { type: 'poison', chance: 0.4 } } },
  surf:        { name: '파도 타기',   el: 'water', kind: 'attack', power: 80, acc: 90 },
  tidal:       { name: '해일 내려치기', el: 'water', kind: 'attack', power: 110, acc: 80 },
  shell:       { name: '단단한 껍질', el: 'water', kind: 'support', acc: 100, fx: { self: { def: 2 } } },
  spring:      { name: '맑은 샘물',   el: 'water', kind: 'support', acc: 100, fx: { heal: 0.5 } },
  mist:        { name: '물안개',      el: 'water', kind: 'support', acc: 100, fx: { self: { eva: 1 } } },

  // 잎새
  leaf:        { name: '나뭇잎 던지기', el: 'leaf', kind: 'attack', power: 40, acc: 100 },
  vine:        { name: '덩굴 채찍',   el: 'leaf', kind: 'attack', power: 60, acc: 95 },
  drain:       { name: '생명 흡수',   el: 'leaf', kind: 'attack', power: 55, acc: 100, fx: { drain: 0.5 } },
  petalstorm:  { name: '꽃잎 폭풍',   el: 'leaf', kind: 'attack', power: 85, acc: 90 },
  treefall:    { name: '거목 내려찍기', el: 'leaf', kind: 'attack', power: 110, acc: 80 },
  spore:       { name: '포자 가루',   el: 'leaf', kind: 'support', acc: 75, fx: { status: { type: 'sleep', chance: 1 } } },
  photosyn:    { name: '광합성',      el: 'leaf', kind: 'support', acc: 100, fx: { heal: 0.5 } },

  // 번개
  peck:        { name: '찌릿 쪼기',   el: 'thunder', kind: 'attack', power: 40, acc: 100 },
  shocktail:   { name: '전기 꼬리',   el: 'thunder', kind: 'attack', power: 60, acc: 95, fx: { status: { type: 'para', chance: 0.1 } } },
  boltdash:    { name: '번개 돌진',   el: 'thunder', kind: 'attack', power: 85, acc: 90 },
  thunderfall: { name: '천둥 낙뢰',   el: 'thunder', kind: 'attack', power: 110, acc: 75, fx: { status: { type: 'para', chance: 0.2 } } },
  netshock:    { name: '전기망',      el: 'thunder', kind: 'support', acc: 80, fx: { status: { type: 'para', chance: 1 } } },
  charge:      { name: '고속 충전',   el: 'thunder', kind: 'support', acc: 100, fx: { self: { spd: 2 } } },

  // 바위
  pebble:      { name: '자갈 던지기', el: 'rock', kind: 'attack', power: 40, acc: 100 },
  headbutt:    { name: '바위 박치기', el: 'rock', kind: 'attack', power: 65, acc: 90 },
  gembeam:     { name: '보석 광선',   el: 'rock', kind: 'attack', power: 70, acc: 95, fx: { foe: { def: -1, chance: 0.2 } } },
  landslide:   { name: '산사태',      el: 'rock', kind: 'attack', power: 90, acc: 85 },
  quake:       { name: '대지 흔들기', el: 'rock', kind: 'attack', power: 110, acc: 80 },
  crystalshell:{ name: '수정 껍질',   el: 'rock', kind: 'support', acc: 100, fx: { self: { def: 2 } } },

  // 그림자
  shadowclaw:  { name: '그림자 할퀴기', el: 'shadow', kind: 'attack', power: 40, acc: 100, fx: { crit: 0.15 } },
  nightfang:   { name: '밤의 송곳니', el: 'shadow', kind: 'attack', power: 65, acc: 95, fx: { crit: 0.15 } },
  darkwave:    { name: '어둠 파동',   el: 'shadow', kind: 'attack', power: 85, acc: 90 },
  eclipse:     { name: '월식 일격',   el: 'shadow', kind: 'attack', power: 110, acc: 80 },
  glare:       { name: '위협 눈빛',   el: 'shadow', kind: 'support', acc: 100, fx: { foe: { atk: -1, chance: 1 } } },
  fogcurse:    { name: '안개 저주',   el: 'shadow', kind: 'support', acc: 90, fx: { seal: true } },
  mimic:       { name: '거울 흉내',   el: 'shadow', kind: 'support', acc: 100, fx: { mimic: true } },

  // 교습소 전용 최강기 [제안]: 기술 교습소에서만 배운다(tutor: 'only')
  sunburst:    { name: '태양 붕괴',   desc: '교습 최강기', tutor: 'only', el: 'fire',    kind: 'attack', power: 140, acc: 85, fx: { status: { type: 'burn', chance: 0.2 } } },
  abyssal:     { name: '심해 대해일', desc: '교습 최강기', tutor: 'only', el: 'water',   kind: 'attack', power: 140, acc: 85, fx: { foe: { spd: -1, chance: 0.3 } } },
  gaiabloom:   { name: '대지의 개화', desc: '교습 최강기', tutor: 'only', el: 'leaf',    kind: 'attack', power: 140, acc: 85, fx: { drain: 0.25 } },
  judgebolt:   { name: '심판의 뇌격', desc: '교습 최강기', tutor: 'only', el: 'thunder', kind: 'attack', power: 140, acc: 85, fx: { status: { type: 'para', chance: 0.2 } } },
  tectonic:    { name: '대륙 붕괴',   desc: '교습 최강기', tutor: 'only', el: 'rock',    kind: 'attack', power: 140, acc: 85, fx: { foe: { def: -1, chance: 0.3 } } },
  voidrift:    { name: '공허의 균열', desc: '교습 최강기', tutor: 'only', el: 'shadow',  kind: 'attack', power: 140, acc: 85, fx: { crit: 0.2 } },

  // 교습소 궁극기 [제안]: 기술 교습소에서만, 200만 골드(근원은 500만). tutor: 'ultimate'
  ult_fire:    { name: '종말의 업화',   desc: '교습 궁극기', tutor: 'ultimate', el: 'fire',    kind: 'attack', power: 180, acc: 90, fx: { status: { type: 'burn', chance: 0.3 } } },
  ult_water:   { name: '창세의 대홍수', desc: '교습 궁극기', tutor: 'ultimate', el: 'water',   kind: 'attack', power: 180, acc: 90, fx: { foe: { spd: -1, chance: 0.5 } } },
  ult_leaf:    { name: '천년 숲의 분노', desc: '교습 궁극기', tutor: 'ultimate', el: 'leaf',   kind: 'attack', power: 180, acc: 90, fx: { drain: 0.3 } },
  ult_thunder: { name: '뇌신의 천벌',   desc: '교습 궁극기', tutor: 'ultimate', el: 'thunder', kind: 'attack', power: 180, acc: 90, fx: { status: { type: 'para', chance: 0.3 } } },
  ult_rock:    { name: '행성 낙하',     desc: '교습 궁극기', tutor: 'ultimate', el: 'rock',    kind: 'attack', power: 180, acc: 90, fx: { foe: { def: -1, chance: 0.5 } } },
  ult_shadow:  { name: '영원한 밤',     desc: '교습 궁극기', tutor: 'ultimate', el: 'shadow',  kind: 'attack', power: 180, acc: 90, fx: { crit: 0.3 } },
  ult_origin:  { name: '근원 회귀',     desc: '교습 궁극기', tutor: 'ultimate', el: 'origin',  kind: 'attack', power: 200, acc: 100 },

  // 근원(숨겨진 몬스터)
  originbeam:  { name: '근원의 빛',   el: 'origin', kind: 'attack', power: 100, acc: 100 },
  genesis:     { name: '태초의 일격', desc: '고유기', el: 'origin', kind: 'attack', power: 130, acc: 95 },
  infinity:    { name: '무한 붕괴',   desc: '신화 고유기', el: 'origin', kind: 'attack', power: 140, acc: 100 },   // [제안]
  // 전설 고유기 [제안]
  eclipsefire: { name: '일식 겁화', desc: '고유기 · 밤의 모습이면 그림자 속성',   el: 'fire', kind: 'attack', power: 120, acc: 90, fx: { formEl: { night: 'shadow' } } },
  stormsurge:  { name: '폭풍 해일포', desc: '고유기 · 비를 내리고 공격', el: 'water', kind: 'attack', power: 120, acc: 85, fx: { rain: true } },
  terraburst:  { name: '대지 분화',   desc: '고유기 · 가뭄이면 위력 1.5배', el: 'rock', kind: 'attack', power: 120, acc: 90, fx: { sunPower: 1.5, status: { type: 'burn', chance: 0.2 } } },
  worldroot:   { name: '세계수의 뿌리', desc: '고유기 · 준 피해의 30% 흡수', el: 'leaf', kind: 'attack', power: 120, acc: 90, fx: { drain: 0.3 } },
};
