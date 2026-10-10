// 아이템. 가격은 골드. kind: ball(포획 도구) / heal(회복) / fusion(합성용 — 4단계부터 사용)
var ML = window.ML = window.ML || {};

ML.items = {
  ball:         { name: '일반 포획구', icon: '⚪', kind: 'ball', price: 20, rate: 1.0, desc: '포획 배율 ×1.0' },
  greatball:    { name: '고급 포획구', icon: '🔵', kind: 'ball', price: 60, rate: 1.6, desc: '포획 배율 ×1.6' },
  ball_fire:    { name: '특수 포획구(불꽃)',   icon: '🔴', kind: 'ball', price: 80, el: 'fire',    desc: '불꽃 속성 ×2.5, 다른 속성 ×0.5' },
  ball_water:   { name: '특수 포획구(물결)',   icon: '🔷', kind: 'ball', price: 80, el: 'water',   desc: '물결 속성 ×2.5, 다른 속성 ×0.5' },
  ball_leaf:    { name: '특수 포획구(잎새)',   icon: '🟢', kind: 'ball', price: 80, el: 'leaf',    desc: '잎새 속성 ×2.5, 다른 속성 ×0.5' },
  ball_rock:    { name: '특수 포획구(바위)',   icon: '🟤', kind: 'ball', price: 80, el: 'rock',    desc: '바위 속성 ×2.5, 다른 속성 ×0.5' },
  ball_thunder: { name: '특수 포획구(번개)',   icon: '🟡', kind: 'ball', price: 80, el: 'thunder', desc: '번개 속성 ×2.5, 다른 속성 ×0.5' },
  ball_shadow:  { name: '특수 포획구(그림자)', icon: '🟣', kind: 'ball', price: 80, el: 'shadow',  desc: '그림자 속성 ×2.5, 다른 속성 ×0.5' },

  potion:       { name: '회복약',      icon: '🧃', kind: 'heal', price: 30, fx: { heal: 40 },     desc: '체력 40 회복' },
  superpotion:  { name: '고급 회복약', icon: '🧪', kind: 'heal', price: 90, fx: { healPct: 0.5 }, desc: '체력 50% 회복' },
  cure:         { name: '만능 해독제', icon: '💊', kind: 'heal', price: 25, fx: { cure: true },   desc: '상태 이상 해제' },

  ivpill:       { name: '개체 재추첨약', icon: '🎲', kind: 'iv', price: 300, desc: '몬스터 1마리의 개체값 4개를 새로 뽑는다. 결과를 보고 새 값과 원래 값 중 고를 수 있다' },
  traitcharm:   { name: '특성 재추첨 부적', icon: '🔮', kind: 'trait', price: 400, desc: '몬스터의 특성 1개를 골라 새로 뽑는다. 원래 특성과 새 특성 중 고를 수 있다' },
  fusionstone:  { name: '합성석',      icon: '💠', kind: 'fusion', price: 150, desc: '합성에 1개 쓴다' },
  charm:        { name: '계승 부적',   icon: '🧿', kind: 'fusion', price: 200, unlock: 2, desc: '합성: 부모 특성을 더 많이 물려받는다' },
  catalyst:     { name: '돌연변이 촉매', icon: '🧫', kind: 'fusion', price: 250, unlock: 2, desc: '합성: 돌연변이 5% → 15%' },
  purewater:    { name: '정화수',      icon: '💧', kind: 'fusion', price: 200, unlock: 2, desc: '합성: 나쁜 특성이 나오지 않는다' },
};

// 상점 진열 순서. unlock: 그 지역이 열려야 판다(보조 아이템은 2지역부터)
ML.shopList = ['ball', 'greatball', 'ball_fire', 'ball_water', 'ball_leaf', 'ball_rock', 'ball_thunder', 'ball_shadow',
  'potion', 'superpotion', 'cure', 'ivpill', 'traitcharm', 'fusionstone', 'charm', 'catalyst', 'purewater'];
