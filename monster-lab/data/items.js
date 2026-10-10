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

  fusionstone:  { name: '합성석',      icon: '💠', kind: 'fusion', price: 150, desc: '합성에 1개 쓴다(2지역 합성소에서 사용)' },
};

// 상점 진열 순서(지역 해금에 따라 늘어난다 — 계승 부적 등은 4단계)
ML.shopList = ['ball', 'greatball', 'ball_fire', 'ball_water', 'ball_leaf', 'ball_rock', 'ball_thunder', 'ball_shadow',
  'potion', 'superpotion', 'cure', 'fusionstone'];
