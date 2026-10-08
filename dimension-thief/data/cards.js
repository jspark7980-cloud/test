// 카드 정의. 새 카드는 여기에 항목만 추가하면 된다.
//
// {
//   name:    표시 이름
//   type:    'attack' | 'skill' | 'power'
//   cost:    에너지 비용
//   origin:  출신 차원 id (data/dimensions.js)
//   effects: [{ type, value, to?, ... }]  — js/effects.js 에 등록된 효과 타입
//            to: 'self' | 'opponent' (생략 시 효과별 기본값)
//   exhaust: true 면 사용 후 소멸(이번 전투에서 제외)
//   icon:    카드 그림(이모지, 선택)
//   text:    설명 직접 지정(선택, 생략 시 effects로 자동 생성)
// }
window.DT = window.DT || {};
DT.data = DT.data || {};

DT.data.cards = {
  // ── 도둑 시작 카드 ──
  stab:   { name: '찌르기',   type: 'attack', cost: 1, origin: 'thief', icon: '🗡️',
            effects: [{ type: 'damage', value: 6 }] },
  dodge:  { name: '회피',     type: 'skill',  cost: 1, origin: 'thief', icon: '💨',
            effects: [{ type: 'block', value: 5 }] },
  pilfer: { name: '슬쩍하기', type: 'skill',  cost: 1, origin: 'thief', icon: '🫳',
            effects: [{ type: 'steal' }] },

  // ── 중세 왕국 (방어·회복) ──
  kn_slash:   { name: '베기',       type: 'attack', cost: 1, origin: 'medieval', icon: '⚔️',
                effects: [{ type: 'damage', value: 7 }] },
  kn_shield:  { name: '방패 들기',  type: 'skill',  cost: 1, origin: 'medieval', icon: '🛡️',
                effects: [{ type: 'block', value: 8 }] },
  kn_charge:  { name: '돌진',       type: 'attack', cost: 2, origin: 'medieval', icon: '🐎',
                effects: [{ type: 'damage', value: 6 }, { type: 'status', status: 'vulnerable', value: 2 }] },
  kn_bash:    { name: '방패 강타',  type: 'attack', cost: 1, origin: 'medieval', icon: '🔰',
                effects: [{ type: 'damage', value: 4 }, { type: 'status', status: 'weak', value: 1 }] },
  kn_rally:   { name: '결의의 함성', type: 'skill', cost: 1, origin: 'medieval', icon: '📯',
                effects: [{ type: 'status', status: 'strength', value: 1, to: 'self' }, { type: 'block', value: 4 }] },
  kn_bandage: { name: '붕대 감기',  type: 'skill',  cost: 1, origin: 'medieval', icon: '🩹',
                effects: [{ type: 'heal', value: 5 }], exhaust: true },
  kn_smite:   { name: '내려찍기',   type: 'attack', cost: 2, origin: 'medieval', icon: '🔨',
                effects: [{ type: 'damage', value: 11 }] },
};
