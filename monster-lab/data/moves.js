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

  // 근원(숨겨진 몬스터)
  originbeam:  { name: '근원의 빛',   el: 'origin', kind: 'attack', power: 100, acc: 100 },
};
