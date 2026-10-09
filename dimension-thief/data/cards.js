// 카드 정의. 새 카드는 여기에 항목만 추가하면 된다.
//
// {
//   name:    표시 이름
//   type:    'attack' | 'skill' | 'power'
//   cost:    에너지 비용
//   origin:  출신 차원 id (data/dimensions.js)
//   effects: [{ type, value, to?, ... }]  — js/effects.js 에 등록된 효과 타입
//            to: 'self' | 'opponent' | 'allOpponents' (생략 시 효과별 기본값)
//   rarity:  'common' | 'uncommon' | 'rare' — 있으면 전투 보상 후보.
//            없으면 적 전용 카드(슬쩍·강탈로만 얻음)
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

  // ── 도둑 보상 카드 ──
  copycat:      { name: '복제',       type: 'skill',  cost: 1, origin: 'thief', icon: '🪞', rarity: 'common',
                  effects: [{ type: 'copy' }] },
  poison_blade: { name: '독 바른 단검', type: 'attack', cost: 1, origin: 'thief', icon: '🧪', rarity: 'common',
                  effects: [{ type: 'damage', value: 3 }, { type: 'status', status: 'poison', value: 4 }] },
  expose:       { name: '약점 노출',  type: 'skill',  cost: 1, origin: 'thief', icon: '🔍', rarity: 'common',
                  effects: [{ type: 'status', status: 'vulnerable', value: 2 }, { type: 'draw', value: 1 }] },
  smoke_bomb:   { name: '연막탄',     type: 'skill',  cost: 1, origin: 'thief', icon: '🌫️', rarity: 'common',
                  effects: [{ type: 'status', status: 'weak', value: 1, to: 'allOpponents' }, { type: 'block', value: 4 }] },
  twin_strike:  { name: '연속 찌르기', type: 'attack', cost: 1, origin: 'thief', icon: '⚡', rarity: 'common',
                  effects: [{ type: 'damage', value: 4, times: 2 }] },
  fan_of_knives:{ name: '칼날 부채',  type: 'attack', cost: 1, origin: 'thief', icon: '🪭', rarity: 'uncommon',
                  effects: [{ type: 'damage', value: 5, to: 'allOpponents' }] },
  warm_up:      { name: '몸풀기',     type: 'skill',  cost: 1, origin: 'thief', icon: '💪', rarity: 'uncommon',
                  effects: [{ type: 'status', status: 'strength', value: 2, to: 'self' }], exhaust: true },
  adrenaline:   { name: '아드레날린', type: 'skill',  cost: 0, origin: 'thief', icon: '💉', rarity: 'rare',
                  effects: [{ type: 'energy', value: 1 }, { type: 'draw', value: 2 }], exhaust: true },

  // ── 중세 왕국 보상 카드 (방어·회복) ──
  md_shield_wall: { name: '방패벽',   type: 'skill',  cost: 2, origin: 'medieval', icon: '🏰', rarity: 'uncommon',
                    effects: [{ type: 'block', value: 13 }] },
  md_holy_water:  { name: '성수',     type: 'skill',  cost: 1, origin: 'medieval', icon: '⛲', rarity: 'common',
                    effects: [{ type: 'heal', value: 4 }, { type: 'block', value: 3 }], exhaust: true },
  md_lance:       { name: '창 돌격',  type: 'attack', cost: 2, origin: 'medieval', icon: '🏇', rarity: 'uncommon',
                    effects: [{ type: 'damage', value: 10 }, { type: 'status', status: 'vulnerable', value: 1 }] },
  md_oath:        { name: '기사의 맹세', type: 'skill', cost: 1, origin: 'medieval', icon: '📜', rarity: 'rare',
                    effects: [{ type: 'status', status: 'strength', value: 1, to: 'self' }, { type: 'block', value: 7 }] },

  // ── 적 전용: 중세 기사 ──
  kn_slash:   { name: '베기',       type: 'attack', cost: 1, origin: 'medieval', icon: '⚔️',
                effects: [{ type: 'damage', value: 10 }] },
  kn_shield:  { name: '방패 들기',  type: 'skill',  cost: 1, origin: 'medieval', icon: '🛡️',
                effects: [{ type: 'block', value: 8 }] },
  kn_charge:  { name: '돌진',       type: 'attack', cost: 2, origin: 'medieval', icon: '🐎',
                effects: [{ type: 'damage', value: 8 }, { type: 'status', status: 'vulnerable', value: 2 }] },
  kn_bash:    { name: '방패 강타',  type: 'attack', cost: 1, origin: 'medieval', icon: '🔰',
                effects: [{ type: 'damage', value: 6 }, { type: 'status', status: 'weak', value: 1 }] },
  kn_rally:   { name: '결의의 함성', type: 'skill', cost: 1, origin: 'medieval', icon: '📯',
                effects: [{ type: 'status', status: 'strength', value: 1, to: 'self' }, { type: 'block', value: 4 }] },
  kn_bandage: { name: '붕대 감기',  type: 'skill',  cost: 1, origin: 'medieval', icon: '🩹',
                effects: [{ type: 'heal', value: 4 }], exhaust: true },
  kn_smite:   { name: '내려찍기',   type: 'attack', cost: 2, origin: 'medieval', icon: '🔨',
                effects: [{ type: 'damage', value: 15 }] },

  // ── 적 전용: 석궁병 ──
  ar_bolt:   { name: '석궁 사격', type: 'attack', cost: 1, origin: 'medieval', icon: '🏹',
               effects: [{ type: 'damage', value: 8 }] },
  ar_poison: { name: '독화살',    type: 'attack', cost: 1, origin: 'medieval', icon: '🐍',
               effects: [{ type: 'damage', value: 3 }, { type: 'status', status: 'poison', value: 3 }] },
  ar_aim:    { name: '조준',      type: 'skill',  cost: 1, origin: 'medieval', icon: '🎯',
               effects: [{ type: 'status', status: 'strength', value: 1, to: 'self' }] },
  ar_cover:  { name: '엄폐',      type: 'skill',  cost: 1, origin: 'medieval', icon: '🪵',
               effects: [{ type: 'block', value: 5 }] },

  // ── 적 전용: 수도사 ──
  mk_staff:  { name: '지팡이질', type: 'attack', cost: 1, origin: 'medieval', icon: '🦯',
               effects: [{ type: 'damage', value: 7 }] },
  mk_prayer: { name: '기도',     type: 'skill',  cost: 1, origin: 'medieval', icon: '🙏',
               effects: [{ type: 'heal', value: 4 }, { type: 'block', value: 3 }] },
  mk_curse:  { name: '파문',     type: 'skill',  cost: 1, origin: 'medieval', icon: '🕯️',
               effects: [{ type: 'status', status: 'weak', value: 2 }, { type: 'status', status: 'vulnerable', value: 1 }] },
  mk_bless:  { name: '축복',     type: 'skill',  cost: 1, origin: 'medieval', icon: '✨',
               effects: [{ type: 'status', status: 'strength', value: 2, to: 'self' }] },

  // ── 적 전용: 종자 ──
  sq_poke:  { name: '서툰 찌르기', type: 'attack', cost: 1, origin: 'medieval', icon: '🥢',
              effects: [{ type: 'damage', value: 6 }] },
  sq_guard: { name: '막기',       type: 'skill',  cost: 1, origin: 'medieval', icon: '🪣',
              effects: [{ type: 'block', value: 5 }] },
  sq_taunt: { name: '도발',       type: 'skill',  cost: 1, origin: 'medieval', icon: '📣',
              effects: [{ type: 'status', status: 'vulnerable', value: 1 }, { type: 'block', value: 2 }] },
};
