// 적 정의. deck 은 data/cards.js 의 카드 id 목록.
//  handSize: 손패 수, reveal: 플레이어에게 공개되는 장수, actions: [최소, 최대] 턴당 사용 장수
//  row: 'front' | 'back' 진형, targets: 'front'(기본) | 'back' 공격할 줄
//  role·companionDeck·basicAttack: 강탈로 동료 영입 시 사용 (role 이 없으면 영입 불가)
//  rank: 'elite' | 'boss' (생략 시 일반)
//  startHand: 전투 시작 시 손패에 들고 있는 카드(항상 공개, 사용하지 않음). 예: 폭군 왕의 왕관
window.DT = window.DT || {};
DT.data = DT.data || {};

DT.data.enemies = {
  knight: {
    name: '중세 기사', icon: '🛡️', origin: 'medieval', hp: 36,
    handSize: 3, reveal: 2, actions: [1, 2],
    row: 'front', targets: 'front', role: 'tank', basicAttack: 5,
    companionDeck: ['kn_shield', 'kn_shield', 'cp_taunt', 'kn_slash', 'kn_bash', 'kn_rally'],
    deck: ['kn_slash', 'kn_slash', 'kn_shield', 'kn_shield', 'kn_charge',
           'kn_bash', 'kn_rally', 'kn_bandage', 'kn_smite'],
  },
  archer: {
    name: '석궁병', icon: '🏹', origin: 'medieval', hp: 22,
    handSize: 3, reveal: 2, actions: [1, 1],
    row: 'back', targets: 'back', role: 'dealer', basicAttack: 5,
    companionDeck: ['ar_bolt', 'ar_bolt', 'ar_poison', 'ar_poison', 'ar_aim'],
    deck: ['ar_bolt', 'ar_bolt', 'ar_bolt', 'ar_poison', 'ar_poison', 'ar_aim', 'ar_cover', 'ar_cover'],
  },
  monk: {
    name: '수도사', icon: '📿', origin: 'medieval', hp: 18,
    handSize: 3, reveal: 2, actions: [1, 1],
    row: 'back', targets: 'front', role: 'healer', basicAttack: 3,
    companionDeck: ['mk_prayer', 'mk_prayer', 'mk_bless', 'mk_staff', 'mk_curse'],
    deck: ['mk_staff', 'mk_staff', 'mk_staff', 'mk_prayer', 'mk_prayer', 'mk_curse', 'mk_curse', 'mk_bless'],
  },
  squire: {
    name: '종자', icon: '🪖', origin: 'medieval', hp: 20,
    handSize: 3, reveal: 2, actions: [1, 1],
    row: 'front', targets: 'front', role: 'tank', basicAttack: 4,
    companionDeck: ['sq_guard', 'sq_guard', 'cp_taunt', 'sq_poke', 'sq_poke'],
    deck: ['sq_poke', 'sq_poke', 'sq_poke', 'sq_guard', 'sq_guard', 'sq_taunt'],
  },

  // ── 정예 ──
  captain: {
    name: '근위대장', icon: '⚜️', origin: 'medieval', hp: 64, rank: 'elite',
    handSize: 3, reveal: 2, actions: [1, 2],
    row: 'front', targets: 'front', role: 'tank', basicAttack: 6,
    companionDeck: ['gd_bulwark', 'cp_taunt', 'gd_lunge', 'gd_sweep', 'kn_shield'],
    deck: ['gd_sweep', 'gd_sweep', 'gd_lunge', 'gd_lunge', 'gd_bulwark', 'gd_bulwark', 'gd_command'],
  },

  // ── 보스 ──
  // 왕관을 들고 있는 동안 매 턴 힘 +1. 슬쩍하기로 왕관을 빼앗으면 그 효과가 도둑에게 온다.
  tyrant: {
    name: '폭군 왕', icon: '🤴', origin: 'medieval', hp: 105, rank: 'boss',
    handSize: 4, reveal: 3, actions: [1, 2], startHand: ['tk_crown'],
    row: 'back', targets: 'front',
    deck: ['tk_decree', 'tk_decree', 'tk_strike', 'tk_strike', 'tk_throne', 'tk_feast', 'tk_tax'],
  },
};
