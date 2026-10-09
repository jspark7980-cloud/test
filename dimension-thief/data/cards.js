// 카드 정의. 새 카드는 여기에 항목만 추가하면 된다.
//
// {
//   name:    표시 이름
//   type:    'attack' | 'skill' | 'power'
//   cost:    에너지 비용
//   origin:  출신 차원 id (data/dimensions.js)
//   effects: [{ type, value, to?, ... }]  — js/effects.js 에 등록된 효과 타입
//            to: 'self' | 'opponent' | 'allOpponents' | 'ally' (생략 시 효과별 기본값)
//            방어도·회복은 기본 'ally': 아군 1명을 탭해 지정, 지정 안 하면 자신
//   rarity:  'common' | 'uncommon' | 'rare' — 있으면 전투 보상 후보.
//            없으면 적 전용 카드(슬쩍·강탈로만 얻음)
//   exhaust: true 면 사용 후 소멸(이번 전투에서 제외)
//   unplayable: true 면 낼 수 없음(가지고 있는 것만으로 효과가 있는 카드 등)
//   passive: { on: 'turnStart', effects: [...] }  — 덱·손패·버린 더미 어디에든 있으면 매 턴 시작 시 발동
//   upgrade: { cost?, effects? } — 은신처 강화 결과. 없으면 config.upgrade 규칙으로 자동 강화
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

  // ── 지휘 카드 (도둑 전용, 동료가 있어야 의미 있음) ──
  cmd_focus:   { name: '표적 지정', type: 'skill',  cost: 0, origin: 'thief', icon: '🎯', rarity: 'uncommon',
                 effects: [{ type: 'order', order: 'focus' }] },
  cmd_pincer:  { name: '협공',     type: 'attack', cost: 1, origin: 'thief', icon: '🤝', rarity: 'common',
                 effects: [{ type: 'damage', value: 5 }, { type: 'order', order: 'assist' }] },
  cmd_cover:   { name: '엄호 명령', type: 'skill',  cost: 1, origin: 'thief', icon: '🫡', rarity: 'uncommon',
                 effects: [{ type: 'order', order: 'cover' }, { type: 'draw', value: 1 }] },
  cmd_retreat: { name: '후퇴',     type: 'skill',  cost: 0, origin: 'thief', icon: '↩️', rarity: 'common',
                 effects: [{ type: 'order', order: 'retreat' }, { type: 'block', value: 5 }] },

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
               effects: [{ type: 'damage', value: 9 }] },
  ar_poison: { name: '독화살',    type: 'attack', cost: 1, origin: 'medieval', icon: '🐍',
               effects: [{ type: 'damage', value: 3 }, { type: 'status', status: 'poison', value: 3 }] },
  ar_aim:    { name: '조준',      type: 'skill',  cost: 1, origin: 'medieval', icon: '🎯',
               effects: [{ type: 'status', status: 'strength', value: 1, to: 'self' }] },
  ar_cover:  { name: '엄폐',      type: 'skill',  cost: 1, origin: 'medieval', icon: '🪵',
               effects: [{ type: 'block', value: 5 }] },

  // ── 적 전용: 수도사 ──
  mk_staff:  { name: '지팡이질', type: 'attack', cost: 1, origin: 'medieval', icon: '🦯',
               effects: [{ type: 'damage', value: 8 }] },
  mk_prayer: { name: '기도',     type: 'skill',  cost: 1, origin: 'medieval', icon: '🙏',
               effects: [{ type: 'heal', value: 4 }, { type: 'block', value: 3 }] },
  mk_curse:  { name: '파문',     type: 'skill',  cost: 1, origin: 'medieval', icon: '🕯️',
               effects: [{ type: 'status', status: 'weak', value: 2 }, { type: 'status', status: 'vulnerable', value: 1 }] },
  mk_bless:  { name: '축복',     type: 'skill',  cost: 1, origin: 'medieval', icon: '✨',
               effects: [{ type: 'status', status: 'strength', value: 2, to: 'ally' }] },

  // ── 적 전용: 종자 ──
  sq_poke:  { name: '서툰 찌르기', type: 'attack', cost: 1, origin: 'medieval', icon: '🥢',
              effects: [{ type: 'damage', value: 7 }] },
  sq_guard: { name: '막기',       type: 'skill',  cost: 1, origin: 'medieval', icon: '🪣',
              effects: [{ type: 'block', value: 5 }] },
  sq_taunt: { name: '조롱',       type: 'skill',  cost: 1, origin: 'medieval', icon: '📣',
              effects: [{ type: 'status', status: 'vulnerable', value: 1 }, { type: 'block', value: 2 }] },

  // ── 동료 전용 (시작 동료) ──
  cp_guard:  { name: '방패 막기',  type: 'skill',  cost: 1, origin: 'thief', icon: '🛡️',
               effects: [{ type: 'block', value: 8 }] },
  cp_taunt:  { name: '도발 외침',  type: 'skill',  cost: 1, origin: 'thief', icon: '📢',
               effects: [{ type: 'status', status: 'taunt', value: 1, to: 'self' }, { type: 'block', value: 6, to: 'self' }] },
  cp_bash:   { name: '방패 치기',  type: 'attack', cost: 1, origin: 'thief', icon: '🔰',
               effects: [{ type: 'damage', value: 6 }] },
  cp_mend:   { name: '약초 치료',  type: 'skill',  cost: 1, origin: 'thief', icon: '🌿',
               effects: [{ type: 'heal', value: 8 }] },
  cp_tonic:  { name: '강장제',     type: 'skill',  cost: 1, origin: 'thief', icon: '🧃',
               effects: [{ type: 'status', status: 'strength', value: 2, to: 'ally' }] },
  cp_charm:  { name: '보호 부적',  type: 'skill',  cost: 1, origin: 'thief', icon: '🧿',
               effects: [{ type: 'block', value: 7 }] },
  cp_dart:   { name: '마비 침',    type: 'attack', cost: 1, origin: 'thief', icon: '📌',
               effects: [{ type: 'damage', value: 5 }, { type: 'status', status: 'weak', value: 1 }] },
  cp_cleave: { name: '베어내기',   type: 'attack', cost: 1, origin: 'thief', icon: '🪓',
               effects: [{ type: 'damage', value: 7 }] },
  cp_lunge:  { name: '급소 찌르기', type: 'attack', cost: 1, origin: 'thief', icon: '🗡️',
               effects: [{ type: 'damage', value: 10 }] },
  cp_parry:  { name: '받아넘기기', type: 'skill',  cost: 1, origin: 'thief', icon: '⚔️',
               effects: [{ type: 'block', value: 5, to: 'self' }, { type: 'damage', value: 3 }] },

  // ── 적 전용: 근위대장 (정예) ──
  gd_sweep:   { name: '휩쓸기',    type: 'attack', cost: 2, origin: 'medieval', icon: '🌀',
                effects: [{ type: 'damage', value: 7, to: 'allOpponents' }] },
  gd_lunge:   { name: '처형 찌르기', type: 'attack', cost: 2, origin: 'medieval', icon: '🗡️',
                effects: [{ type: 'damage', value: 16 }] },
  gd_bulwark: { name: '철벽',      type: 'skill',  cost: 2, origin: 'medieval', icon: '🧱',
                effects: [{ type: 'block', value: 14 }] },
  gd_command: { name: '돌격 명령', type: 'skill',  cost: 1, origin: 'medieval', icon: '📣',
                effects: [{ type: 'status', status: 'strength', value: 2, to: 'ally' }, { type: 'block', value: 5 }] },

  // ── 적 전용: 폭군 왕 (보스) ──
  tk_crown:  { name: '왕관',     type: 'power', cost: 0, origin: 'medieval', icon: '👑', unplayable: true,
               text: '소유 시 매 턴 힘 +1<br><i>슬쩍 가능</i>',
               passive: { on: 'turnStart', effects: [{ type: 'status', status: 'strength', value: 1, to: 'self' }] },
               effects: [] },
  tk_decree: { name: '폭정',     type: 'attack', cost: 2, origin: 'medieval', icon: '⚖️',
               effects: [{ type: 'damage', value: 7, to: 'allOpponents' }] },
  tk_strike: { name: '왕의 일격', type: 'attack', cost: 2, origin: 'medieval', icon: '🔱',
               effects: [{ type: 'damage', value: 13 }] },
  tk_throne: { name: '옥좌의 수호', type: 'skill', cost: 1, origin: 'medieval', icon: '🪑',
               effects: [{ type: 'block', value: 16 }] },
  tk_feast:  { name: '만찬',     type: 'skill',  cost: 1, origin: 'medieval', icon: '🍗',
               effects: [{ type: 'heal', value: 12 }] },
  tk_tax:    { name: '세금 징수', type: 'attack', cost: 1, origin: 'medieval', icon: '💰',
               effects: [{ type: 'damage', value: 6 }, { type: 'status', status: 'weak', value: 2 }] },

  // ── 동료 전용 (해금 동료) ──
  cp_snare:     { name: '올가미',    type: 'attack', cost: 1, origin: 'thief', icon: '🪢',
                  effects: [{ type: 'damage', value: 4 }, { type: 'status', status: 'vulnerable', value: 2 }] },
  cp_venom:     { name: '독침 사격', type: 'attack', cost: 1, origin: 'thief', icon: '🐝',
                  effects: [{ type: 'damage', value: 3 }, { type: 'status', status: 'poison', value: 4 }] },
  cp_quickshot: { name: '속사',      type: 'attack', cost: 1, origin: 'thief', icon: '🏹',
                  effects: [{ type: 'damage', value: 4, times: 2 }] },
  cp_ballad:    { name: '치유의 발라드', type: 'skill', cost: 1, origin: 'thief', icon: '🎶',
                  effects: [{ type: 'heal', value: 6 }, { type: 'block', value: 3 }] },
  cp_anthem:    { name: '행진곡',    type: 'skill',  cost: 1, origin: 'thief', icon: '🥁',
                  effects: [{ type: 'status', status: 'strength', value: 2, to: 'ally' }] },
  cp_lullaby:   { name: '자장가',    type: 'skill',  cost: 1, origin: 'thief', icon: '🌙',
                  effects: [{ type: 'block', value: 8 }] },
  cp_mock:      { name: '조롱의 노래', type: 'attack', cost: 1, origin: 'thief', icon: '🎭',
                  effects: [{ type: 'damage', value: 3 }, { type: 'status', status: 'weak', value: 2 }] },

  // ════════ 2차원: 사이버 도시 (자동 발동·잠금) ════════
  // 보상 카드 8장
  cy_turret:   { name: '자동 포탑',  type: 'skill',  cost: 1, origin: 'cyber', icon: '🛰️', rarity: 'uncommon',
                 text: '포탑 설치: 내 턴 시작마다<br>모든 적에게 피해 2<br><i>소멸</i>',
                 effects: [{ type: 'status', status: 'turret', value: 1, to: 'self' }], exhaust: true },
  cy_firewall: { name: '방화벽',     type: 'skill',  cost: 1, origin: 'cyber', icon: '🧱', rarity: 'common',
                 effects: [{ type: 'block', value: 6 }, { type: 'draw', value: 1 }] },
  cy_shutdown: { name: '강제 종료',  type: 'attack', cost: 1, origin: 'cyber', icon: '⛔', rarity: 'common',
                 effects: [{ type: 'damage', value: 5 }, { type: 'status', status: 'weak', value: 2 }] },
  cy_hack:     { name: '해킹',       type: 'skill',  cost: 1, origin: 'cyber', icon: '💻', rarity: 'common',
                 effects: [{ type: 'lock', value: 2 }, { type: 'draw', value: 1 }] },
  cy_laser:    { name: '레이저 커터', type: 'attack', cost: 1, origin: 'cyber', icon: '🔦', rarity: 'common',
                 effects: [{ type: 'damage', value: 4, times: 2 }] },
  cy_drone:    { name: '지원 드론',  type: 'skill',  cost: 2, origin: 'cyber', icon: '🛸', rarity: 'uncommon',
                 text: '드론 배치: 내 턴 시작마다<br>방어도 4<br><i>소멸</i>',
                 effects: [{ type: 'status', status: 'drone', value: 1, to: 'self' }], exhaust: true },
  cy_overclock: { name: '오버클럭',  type: 'skill',  cost: 0, origin: 'cyber', icon: '⚡', rarity: 'uncommon',
                 effects: [{ type: 'energy', value: 2 }], exhaust: true },
  cy_emp:      { name: 'EMP 폭탄',   type: 'attack', cost: 2, origin: 'cyber', icon: '💥', rarity: 'rare',
                 effects: [{ type: 'damage', value: 7, to: 'allOpponents' }, { type: 'lock', value: 1, to: 'allOpponents' }] },

  // 적 전용: 경비 드론
  cd_laser:  { name: '레이저',    type: 'attack', cost: 1, origin: 'cyber', icon: '🔴', effects: [{ type: 'damage', value: 6 }] },
  cd_twin:   { name: '연사',      type: 'attack', cost: 1, origin: 'cyber', icon: '🔫', effects: [{ type: 'damage', value: 4, times: 2 }] },
  cd_scan:   { name: '표적 스캔', type: 'skill',  cost: 1, origin: 'cyber', icon: '📡',
               effects: [{ type: 'status', status: 'vulnerable', value: 2 }] },
  // 적 전용: 진압 경찰
  ce_baton:    { name: '전기봉',    type: 'attack', cost: 1, origin: 'cyber', icon: '⚡', effects: [{ type: 'damage', value: 7 }] },
  ce_riot:     { name: '진압 방패', type: 'skill',  cost: 1, origin: 'cyber', icon: '🛡️', effects: [{ type: 'block', value: 8 }] },
  ce_lockdown: { name: '봉쇄',      type: 'attack', cost: 1, origin: 'cyber', icon: '🚧',
                 effects: [{ type: 'damage', value: 5 }, { type: 'lock', value: 1 }] },
  // 적 전용: 해커
  ch_spike:    { name: '데이터 스파이크', type: 'attack', cost: 1, origin: 'cyber', icon: '📶', effects: [{ type: 'damage', value: 6 }] },
  ch_patch:    { name: '긴급 패치', type: 'skill',  cost: 1, origin: 'cyber', icon: '🩹', effects: [{ type: 'heal', value: 8 }] },
  ch_backdoor: { name: '백도어',    type: 'skill',  cost: 1, origin: 'cyber', icon: '🚪',
                 effects: [{ type: 'lock', value: 1 }, { type: 'status', status: 'weak', value: 1 }] },
  ch_boost:    { name: '과부하',    type: 'skill',  cost: 1, origin: 'cyber', icon: '🔋',
                 effects: [{ type: 'status', status: 'strength', value: 2, to: 'ally' }] },
  // 적 전용: 전투 메크 (정예)
  cm_missile: { name: '미사일 세례', type: 'attack', cost: 2, origin: 'cyber', icon: '🚀',
                effects: [{ type: 'damage', value: 7, to: 'allOpponents' }] },
  cm_cannon:  { name: '플라스마 포', type: 'attack', cost: 2, origin: 'cyber', icon: '🔆', effects: [{ type: 'damage', value: 18 }] },
  cm_turret:  { name: '포탑 전개',  type: 'skill',  cost: 1, origin: 'cyber', icon: '🛰️',
                effects: [{ type: 'status', status: 'turret', value: 1, to: 'self' }, { type: 'block', value: 6, to: 'self' }] },
  cm_plate:   { name: '장갑판',     type: 'skill',  cost: 2, origin: 'cyber', icon: '🔩', effects: [{ type: 'block', value: 16 }] },
  // 적 전용: 메인프레임 (보스) — 코어를 가진 쪽이 매 턴 상대 손패 1장을 잠근다
  mf_core:    { name: '중앙 코어',  type: 'power', cost: 0, origin: 'cyber', icon: '💾', unplayable: true,
                text: '소유 시 매 턴 상대 손패<br>1장 잠금<br><i>슬쩍 가능</i>',
                passive: { on: 'turnStart', effects: [{ type: 'lock', value: 1, to: 'allOpponents' }] },
                effects: [] },
  mf_purge:   { name: '데이터 삭제', type: 'attack', cost: 2, origin: 'cyber', icon: '🗑️',
                effects: [{ type: 'damage', value: 8, to: 'allOpponents' }] },
  mf_beam:    { name: '처리 광선',  type: 'attack', cost: 2, origin: 'cyber', icon: '🔆', effects: [{ type: 'damage', value: 14 }] },
  mf_wall:    { name: '방화벽 강화', type: 'skill', cost: 1, origin: 'cyber', icon: '🧱', effects: [{ type: 'block', value: 18 }] },
  mf_reboot:  { name: '재부팅',     type: 'skill',  cost: 1, origin: 'cyber', icon: '🔄', effects: [{ type: 'heal', value: 14 }] },
  mf_spam:    { name: '스팸 폭격',  type: 'attack', cost: 1, origin: 'cyber', icon: '📨', effects: [{ type: 'damage', value: 3, times: 3 }] },

  // ════════ 3차원: 심해 왕국 (독·지속 피해) ════════
  ab_harpoon: { name: '작살',       type: 'attack', cost: 1, origin: 'abyss', icon: '🔱', rarity: 'common',
                effects: [{ type: 'damage', value: 7 }, { type: 'status', status: 'poison', value: 2 }] },
  ab_ink:     { name: '먹물 뿌리기', type: 'skill', cost: 1, origin: 'abyss', icon: '🦑', rarity: 'common',
                effects: [{ type: 'status', status: 'weak', value: 1, to: 'allOpponents' }, { type: 'block', value: 4 }] },
  ab_toxin:   { name: '맹독 주입',  type: 'skill',  cost: 1, origin: 'abyss', icon: '🧪', rarity: 'common',
                effects: [{ type: 'status', status: 'poison', value: 6 }] },
  ab_pearl:   { name: '진주 껍질',  type: 'skill',  cost: 1, origin: 'abyss', icon: '🦪', rarity: 'common',
                effects: [{ type: 'block', value: 7 }, { type: 'heal', value: 2 }] },
  ab_tide:    { name: '독 해일',    type: 'attack', cost: 2, origin: 'abyss', icon: '🌊', rarity: 'uncommon',
                effects: [{ type: 'damage', value: 6, to: 'allOpponents' }, { type: 'status', status: 'poison', value: 2, to: 'allOpponents' }] },
  ab_eel:     { name: '전기뱀장어', type: 'attack', cost: 1, origin: 'abyss', icon: '⚡', rarity: 'uncommon',
                effects: [{ type: 'damage', value: 3, times: 3 }] },
  ab_current: { name: '해류',       type: 'skill',  cost: 0, origin: 'abyss', icon: '🌀', rarity: 'uncommon',
                effects: [{ type: 'draw', value: 2 }], exhaust: true },
  ab_burst:   { name: '독 폭발',    type: 'attack', cost: 1, origin: 'abyss', icon: '☣️', rarity: 'rare',
                effects: [{ type: 'detonate', value: 2 }] },

  // 적 전용: 어인 전사
  am_trident: { name: '삼지창',     type: 'attack', cost: 1, origin: 'abyss', icon: '🔱', effects: [{ type: 'damage', value: 9 }] },
  am_scale:   { name: '비늘 방패',  type: 'skill',  cost: 1, origin: 'abyss', icon: '🐚', effects: [{ type: 'block', value: 9 }] },
  am_slam:    { name: '파도 강타',  type: 'attack', cost: 1, origin: 'abyss', icon: '🌊',
                effects: [{ type: 'damage', value: 6 }, { type: 'status', status: 'vulnerable', value: 1 }] },
  // 적 전용: 독해파리
  aj_sting:   { name: '독침',       type: 'attack', cost: 1, origin: 'abyss', icon: '🪼',
                effects: [{ type: 'damage', value: 3 }, { type: 'status', status: 'poison', value: 3 }] },
  aj_cloud:   { name: '독구름',     type: 'skill',  cost: 1, origin: 'abyss', icon: '☁️',
                effects: [{ type: 'status', status: 'poison', value: 2, to: 'allOpponents' }] },
  aj_drift:   { name: '표류',       type: 'skill',  cost: 1, origin: 'abyss', icon: '🫧', effects: [{ type: 'block', value: 6 }] },
  // 적 전용: 세이렌
  as_song:    { name: '치유의 노래', type: 'skill', cost: 1, origin: 'abyss', icon: '🎵', effects: [{ type: 'heal', value: 8 }] },
  as_charm:   { name: '홀림',       type: 'attack', cost: 1, origin: 'abyss', icon: '💫',
                effects: [{ type: 'damage', value: 5 }, { type: 'status', status: 'weak', value: 2 }] },
  as_hymn:    { name: '파도의 축복', type: 'skill', cost: 1, origin: 'abyss', icon: '🐬',
                effects: [{ type: 'status', status: 'strength', value: 2, to: 'ally' }, { type: 'block', value: 3 }] },
  // 적 전용: 심해 아귀 (정예)
  aa_bite:    { name: '아귀 이빨',  type: 'attack', cost: 2, origin: 'abyss', icon: '🦷', effects: [{ type: 'damage', value: 17 }] },
  aa_glow:    { name: '유혹의 빛',  type: 'skill',  cost: 1, origin: 'abyss', icon: '💡',
                effects: [{ type: 'status', status: 'weak', value: 2, to: 'allOpponents' }] },
  aa_devour:  { name: '집어삼키기', type: 'attack', cost: 2, origin: 'abyss', icon: '🐡',
                effects: [{ type: 'damage', value: 11 }, { type: 'heal', value: 6, to: 'self' }] },
  aa_ink:     { name: '심연의 먹물', type: 'skill', cost: 1, origin: 'abyss', icon: '🖤', effects: [{ type: 'block', value: 13 }] },
  aa_spit:    { name: '독 토하기',  type: 'attack', cost: 1, origin: 'abyss', icon: '🤮',
                effects: [{ type: 'damage', value: 4, to: 'allOpponents' }, { type: 'status', status: 'poison', value: 3, to: 'allOpponents' }] },
  // 적 전용: 크라켄 촉수 (보스, 8개)
  kr_slap:    { name: '후려치기',   type: 'attack', cost: 1, origin: 'abyss', icon: '🦑', effects: [{ type: 'damage', value: 7 }] },
  kr_squeeze: { name: '조이기',     type: 'attack', cost: 1, origin: 'abyss', icon: '🪢',
                effects: [{ type: 'damage', value: 3 }, { type: 'status', status: 'poison', value: 2 }] },
  kr_grip:    { name: '휘감기',     type: 'attack', cost: 1, origin: 'abyss', icon: '➰',
                effects: [{ type: 'damage', value: 4 }, { type: 'status', status: 'weak', value: 1 }] },
  kr_coil:    { name: '웅크리기',   type: 'skill',  cost: 1, origin: 'abyss', icon: '🐙', effects: [{ type: 'block', value: 7 }] },

  // ════════ 4차원: 지옥 (체력을 대가로 강한 효과) ════════
  hl_bloodblade: { name: '피의 칼날', type: 'attack', cost: 1, origin: 'hell', icon: '🩸', rarity: 'common',
                   effects: [{ type: 'loseHp', value: 2 }, { type: 'damage', value: 12 }] },
  hl_brimstone:  { name: '유황불',   type: 'attack', cost: 1, origin: 'hell', icon: '🔥', rarity: 'common',
                   effects: [{ type: 'loseHp', value: 2 }, { type: 'damage', value: 6, to: 'allOpponents' }] },
  hl_soulshield: { name: '영혼 방패', type: 'skill', cost: 1, origin: 'hell', icon: '👻', rarity: 'common',
                   effects: [{ type: 'loseHp', value: 2 }, { type: 'block', value: 13 }] },
  hl_sacrifice:  { name: '희생',     type: 'skill',  cost: 0, origin: 'hell', icon: '🗡️', rarity: 'common',
                   effects: [{ type: 'loseHp', value: 3 }, { type: 'draw', value: 2 }] },
  hl_pact:       { name: '악마의 계약', type: 'skill', cost: 0, origin: 'hell', icon: '📜', rarity: 'uncommon',
                   effects: [{ type: 'loseHp', value: 4 }, { type: 'energy', value: 2 }], exhaust: true },
  hl_feast:      { name: '영혼 포식', type: 'attack', cost: 1, origin: 'hell', icon: '💀', rarity: 'uncommon',
                   effects: [{ type: 'damage', value: 8 }, { type: 'heal', value: 4, to: 'self' }] },
  hl_rage:       { name: '지옥의 분노', type: 'skill', cost: 1, origin: 'hell', icon: '😡', rarity: 'uncommon',
                   effects: [{ type: 'loseHp', value: 3 }, { type: 'status', status: 'strength', value: 3, to: 'self' }] },
  hl_hellfire:   { name: '업화',     type: 'attack', cost: 2, origin: 'hell', icon: '☄️', rarity: 'rare',
                   effects: [{ type: 'loseHp', value: 5 }, { type: 'damage', value: 24 }, { type: 'status', status: 'vulnerable', value: 2 }] },

  // 적 전용: 임프
  hi_bolt:     { name: '화염탄',    type: 'attack', cost: 1, origin: 'hell', icon: '🔥', effects: [{ type: 'damage', value: 8 }] },
  hi_rain:     { name: '불비',      type: 'attack', cost: 1, origin: 'hell', icon: '🌋', effects: [{ type: 'damage', value: 4, to: 'allOpponents' }] },
  hi_offer:    { name: '피의 제물', type: 'skill',  cost: 1, origin: 'hell', icon: '🩸',
                 effects: [{ type: 'loseHp', value: 4 }, { type: 'status', status: 'strength', value: 3, to: 'self' }] },
  // 적 전용: 지옥견
  hh_bite:     { name: '물어뜯기',  type: 'attack', cost: 1, origin: 'hell', icon: '🐺', effects: [{ type: 'damage', value: 10 }] },
  hh_howl:     { name: '울부짖기',  type: 'skill',  cost: 1, origin: 'hell', icon: '🌕',
                 effects: [{ type: 'status', status: 'taunt', value: 1, to: 'self' }, { type: 'block', value: 8, to: 'self' }] },
  hh_frenzy:   { name: '피의 광란', type: 'attack', cost: 1, origin: 'hell', icon: '🩸',
                 effects: [{ type: 'loseHp', value: 3 }, { type: 'damage', value: 14 }] },
  // 적 전용: 타락한 사제
  hc_ritual:   { name: '피의 의식', type: 'skill',  cost: 1, origin: 'hell', icon: '🕯️',
                 effects: [{ type: 'loseHp', value: 4 }, { type: 'heal', value: 13 }] },
  hc_curse:    { name: '저주',      type: 'skill',  cost: 1, origin: 'hell', icon: '🪬',
                 effects: [{ type: 'status', status: 'weak', value: 2 }, { type: 'status', status: 'vulnerable', value: 1 }] },
  hc_ward:     { name: '피의 장벽', type: 'skill',  cost: 1, origin: 'hell', icon: '🩸',
                 effects: [{ type: 'loseHp', value: 2 }, { type: 'block', value: 11 }] },
  hc_drain:    { name: '생명 흡수', type: 'attack', cost: 1, origin: 'hell', icon: '🫀',
                 effects: [{ type: 'damage', value: 6 }, { type: 'heal', value: 3, to: 'self' }] },
  // 적 전용: 지옥 기사 (정예)
  hd_blade:    { name: '지옥검',    type: 'attack', cost: 2, origin: 'hell', icon: '🗡️', effects: [{ type: 'damage', value: 19 }] },
  hd_pact:     { name: '피의 서약', type: 'skill',  cost: 1, origin: 'hell', icon: '📜',
                 effects: [{ type: 'loseHp', value: 6 }, { type: 'status', status: 'strength', value: 3, to: 'self' }] },
  hd_sweep:    { name: '화염 베기', type: 'attack', cost: 2, origin: 'hell', icon: '🔥', effects: [{ type: 'damage', value: 9, to: 'allOpponents' }] },
  hd_guard:    { name: '업화의 갑주', type: 'skill', cost: 2, origin: 'hell', icon: '🛡️', effects: [{ type: 'block', value: 17 }] },
  // 적 전용: 마왕 (보스) — 탐욕을 가진 쪽이 매 턴 상대가 훔친 카드를 빼앗아 온다
  dk_greed:    { name: '마왕의 탐욕', type: 'power', cost: 0, origin: 'hell', icon: '💍', unplayable: true,
                 text: '소유 시 매 턴 상대가<br>훔친 카드 1장을 빼앗음<br><i>슬쩍 가능</i>',
                 passive: { on: 'turnStart', effects: [{ type: 'counterSteal', value: 1 }] },
                 effects: [] },
  dk_storm:    { name: '지옥 폭풍', type: 'attack', cost: 2, origin: 'hell', icon: '🌪️', effects: [{ type: 'damage', value: 9, to: 'allOpponents' }] },
  dk_claw:     { name: '마왕의 손톱', type: 'attack', cost: 2, origin: 'hell', icon: '🦅', effects: [{ type: 'damage', value: 18 }] },
  dk_throne:   { name: '암흑 옥좌', type: 'skill',  cost: 1, origin: 'hell', icon: '🪑', effects: [{ type: 'block', value: 20 }] },
  dk_drain:    { name: '영혼 착취', type: 'attack', cost: 2, origin: 'hell', icon: '👻',
                 effects: [{ type: 'damage', value: 11 }, { type: 'heal', value: 10, to: 'self' }] },
  dk_mock:     { name: '비웃음',    type: 'skill',  cost: 1, origin: 'hell', icon: '😏',
                 effects: [{ type: 'status', status: 'weak', value: 2 }, { type: 'status', status: 'vulnerable', value: 2 }] },

  // ── 차원 불안정 변이로 생기는 카드 ──
  rift_noise:  { name: '차원 잡음',  type: 'power', cost: 0, origin: 'thief', icon: '📺', unplayable: true,
                 text: '사용 불가<br><i>불안정 변이 · 이번 전투만</i>', effects: [] },
};
