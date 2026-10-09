// 동료. 출발 준비에서 보유한 동료 중에서 고른다.
//  grade: 'basic' 기본(처음부터 보유·돌파 없음) | 'common' | 'rare' | 'hero' | 'legend' (뽑기, js/gacha.js)
//  secret: true 면 뽑기에 나오지 않음(숨겨진 해금)
//  unlockCost: 있으면 로비에서 코인으로 해금해야 고를 수 있다(기본 동료).
//  role: 'tank' | 'healer' | 'dealer' | 'support'  → js/ai.js 의 역할별 행동
//  ability: { id, base, per } 고유 능력(js/abilities.js). 수치 = base + per × 돌파 단계
//  sig: 성장(5·15레벨)할 때 덱에 추가되는 대표 카드
//  row: 시작 줄, basicAttack: 지휘 카드(표적 지정·협공)로 공격할 때 피해
//  deck: 전용 덱(5~6장). 매 턴 손패 2장 중 1장을 역할에 맞게 골라 사용
window.DT = window.DT || {};
DT.data = DT.data || {};

DT.data.companions = {
  shieldbearer: {
    name: '방패잡이', icon: '🛡️', role: 'tank', hp: 34, row: 'front', basicAttack: 4, origin: 'thief',
    desc: '위험한 아군이 있으면 도발하거나 막아 준다.', grade: 'basic', sig: 'cp_guard',
    deck: ['cp_guard', 'cp_guard', 'cp_taunt', 'cp_taunt', 'cp_bash', 'cp_bash'],
  },
  herbalist: {
    name: '약초사', icon: '🌿', role: 'healer', hp: 24, row: 'back', basicAttack: 3, origin: 'thief',
    desc: '체력이 절반 이하인 아군을 치료하고, 아니면 힘을 북돋운다.', grade: 'basic', sig: 'cp_mend',
    deck: ['cp_mend', 'cp_mend', 'cp_tonic', 'cp_charm', 'cp_dart'],
  },
  sellsword: {
    name: '용병', icon: '🪓', role: 'dealer', hp: 28, row: 'front', basicAttack: 5, origin: 'thief',
    desc: '처치할 수 있는 적부터 노린다. 강탈 대기 중인 적은 건드리지 않는다.', grade: 'basic', sig: 'cp_lunge',
    deck: ['cp_cleave', 'cp_cleave', 'cp_lunge', 'cp_lunge', 'cp_parry'],
  },
  poacher: {
    name: '밀렵꾼', icon: '🏹', role: 'dealer', hp: 24, row: 'back', basicAttack: 4, origin: 'thief', unlockCost: 120,
    desc: '뒷줄에서 독과 올가미로 적을 약하게 만든다.', grade: 'basic', sig: 'cp_venom',
    deck: ['cp_snare', 'cp_venom', 'cp_venom', 'cp_quickshot', 'cp_quickshot'],
  },
  bard: {
    name: '음유시인', icon: '🪕', role: 'healer', hp: 22, row: 'back', basicAttack: 3, origin: 'thief', unlockCost: 160,
    desc: '노래로 아군을 치료하고 지켜 주며, 적을 조롱해 약화시킨다.', grade: 'basic', sig: 'cp_ballad',
    deck: ['cp_ballad', 'cp_ballad', 'cp_anthem', 'cp_lullaby', 'cp_mock'],
  },

  // ════════ 뽑기 동료 (v4) ════════
  // ── 일반 ──
  apprentice: {
    name: '견습 기사', icon: '🤺', role: 'tank', hp: 32, row: 'front', basicAttack: 4, origin: 'medieval', grade: 'common',
    ability: { id: 'frontGuard', base: 2, per: 1 }, sig: 'kn_shield',
    desc: '앞줄에 있으면 매 턴 방어도를 얻는다.',
    deck: ['cp_guard', 'cp_guard', 'cp_taunt', 'cp_bash', 'cp_bash'],
  },
  priest: {
    name: '마을 사제', icon: '🙏', role: 'healer', hp: 24, row: 'back', basicAttack: 3, origin: 'medieval', grade: 'common',
    ability: { id: 'lowestHeal', base: 2, per: 1 }, sig: 'mk_prayer',
    desc: '매 턴 체력이 가장 낮은 아군을 치료한다.',
    deck: ['cp_mend', 'cp_mend', 'mk_prayer', 'cp_charm', 'cp_dart'],
  },
  scout_drone: {
    name: '정찰 드론', icon: '🛰️', role: 'dealer', hp: 22, row: 'back', basicAttack: 4, origin: 'cyber', grade: 'common',
    ability: { id: 'backline', base: 2, per: 1 }, sig: 'cd_twin',
    desc: '뒷줄 적을 우선 노리고, 뒷줄 적에게 피해가 늘어난다.',
    deck: ['cd_laser', 'cd_laser', 'cd_twin', 'cd_twin', 'cd_scan'],
  },
  jelly_soldier: {
    name: '해파리 병사', icon: '🪼', role: 'dealer', hp: 24, row: 'front', basicAttack: 4, origin: 'abyss', grade: 'common',
    ability: { id: 'poisonTouch', base: 1, per: 0.5 }, sig: 'aj_sting',
    desc: '공격할 때마다 대상에게 독을 건다.',
    deck: ['aj_sting', 'aj_sting', 'cp_cleave', 'cp_cleave', 'aj_drift'],
  },
  // ── 희귀 ──
  paladin: {
    name: '성기사', icon: '🌟', role: 'tank', hp: 40, row: 'front', basicAttack: 5, origin: 'medieval', grade: 'rare',
    ability: { id: 'share', base: 0.25, per: 0.05 }, sig: 'gd_bulwark',
    desc: '다른 아군이 받는 피해 일부를 대신 받는다.',
    deck: ['kn_shield', 'cp_guard', 'cp_taunt', 'kn_smite', 'kn_bash'],
  },
  hacker_ally: {
    name: '해커', icon: '👩‍💻', role: 'support', hp: 24, row: 'back', basicAttack: 4, origin: 'cyber', grade: 'rare',
    ability: { id: 'lockFoe', base: 1, per: 0.34 }, sig: 'ch_backdoor',
    desc: '매 턴 무작위 적의 손패를 잠근다.',
    deck: ['ch_spike', 'ch_spike', 'cy_firewall', 'ch_backdoor', 'ch_boost'],
  },
  mermaid: {
    name: '인어 치유사', icon: '🧜‍♀️', role: 'healer', hp: 26, row: 'back', basicAttack: 3, origin: 'abyss', grade: 'rare',
    ability: { id: 'cleanse', base: 0, per: 1 }, sig: 'as_song',
    desc: '회복시킬 때 대상의 독을 모두 없앤다.',
    deck: ['as_song', 'as_song', 'as_hymn', 'ab_pearl', 'as_charm'],
  },
  imp_assassin: {
    name: '임프 암살자', icon: '👿', role: 'dealer', hp: 24, row: 'back', basicAttack: 5, origin: 'hell', grade: 'rare',
    ability: { id: 'execute', base: 0.5, per: 0.05 }, sig: 'hl_bloodblade',
    desc: '체력이 낮은 적에게 피해 2배.',
    deck: ['hi_bolt', 'hi_bolt', 'cp_lunge', 'cp_lunge', 'hi_offer'],
  },
  // ── 영웅 ──
  mech_giant: {
    name: '기계 거인', icon: '🦾', role: 'tank', hp: 52, row: 'front', basicAttack: 6, origin: 'cyber', grade: 'hero',
    ability: { id: 'keepBlock', base: 0, per: 2 }, sig: 'cm_plate',
    desc: '방어도가 사라지지 않고 다음 턴까지 남는다.',
    deck: ['cm_plate', 'ce_riot', 'ce_riot', 'cp_taunt', 'ce_baton'],
  },
  sea_witch: {
    name: '심해 마녀', icon: '🧙‍♀️', role: 'dealer', hp: 30, row: 'back', basicAttack: 4, origin: 'abyss', grade: 'hero',
    ability: { id: 'doublePoison', base: 2, per: 0.2 }, sig: 'ab_toxin',
    desc: '적에게 거는 독이 2배가 된다.',
    deck: ['aj_sting', 'aj_sting', 'ab_toxin', 'aj_cloud', 'ab_burst'],
  },
  contract_demon: {
    name: '계약 악마', icon: '👺', role: 'dealer', hp: 34, row: 'front', basicAttack: 6, origin: 'hell', grade: 'hero',
    ability: { id: 'bloodPower', base: 0.6, per: 0.1 }, sig: 'hh_frenzy',
    desc: '공격할 때 체력 2를 바치고 훨씬 강하게 친다.',
    deck: ['hl_bloodblade', 'hl_bloodblade', 'hh_frenzy', 'hl_feast', 'hd_guard'],
  },
  // ── 전설 ──
  shadow_thief: {
    name: '그림자 도둑', icon: '🥷', role: 'support', hp: 30, row: 'back', basicAttack: 6, origin: 'thief', grade: 'legend',
    ability: { id: 'autoSteal', base: 1, per: 0.2 }, sig: 'cp_lunge',
    desc: '매 턴 적의 공개 카드 1장을 슬쩍해 도둑 손패에 넣어 준다.',
    deck: ['cp_lunge', 'cp_parry', 'cp_dart', 'cp_quickshot', 'cp_snare'],
  },
  wanderer: {
    name: '차원 방랑자', icon: '🌌', role: 'support', hp: 32, row: 'back', basicAttack: 5, origin: 'thief', grade: 'legend',
    ability: { id: 'ignoreInstability', base: 0, per: 2 }, sig: 'cy_firewall',
    desc: '파티가 차원 불안정의 영향을 받지 않는다.',
    deck: ['cy_firewall', 'ab_pearl', 'cp_charm', 'cp_tonic', 'ab_current'],
  },
  // ── 비밀 (뽑기 불가) ──
  time_thief: {
    name: '시간의 도둑', icon: '⏳', role: 'support', hp: 36, row: 'back', basicAttack: 6, origin: 'thief', grade: 'legend', secret: true,
    ability: { id: 'rewind', base: 1, per: 0 }, sig: 'cp_quickshot',
    desc: '매 턴, 지난 턴에 도둑이 쓴 카드 1장을 손패로 되감아 준다.',
    deck: ['cp_quickshot', 'cp_parry', 'cp_tonic', 'cp_charm', 'cp_lunge'],
  },
};
