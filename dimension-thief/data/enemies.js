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

  // ════════ 2차원: 사이버 도시 ════════
  enforcer: {
    name: '진압 경찰', icon: '👮', origin: 'cyber', hp: 36,
    handSize: 3, reveal: 2, actions: [1, 2],
    row: 'front', targets: 'front', role: 'tank', basicAttack: 6,
    companionDeck: ['ce_riot', 'ce_riot', 'cp_taunt', 'ce_baton', 'ce_lockdown'],
    deck: ['ce_baton', 'ce_baton', 'ce_riot', 'ce_riot', 'ce_riot', 'ce_lockdown', 'ce_lockdown'],
  },
  drone: {
    name: '경비 드론', icon: '🛸', origin: 'cyber', hp: 23,
    handSize: 3, reveal: 2, actions: [1, 1],
    row: 'back', targets: 'back', role: 'dealer', basicAttack: 6,
    companionDeck: ['cd_laser', 'cd_laser', 'cd_twin', 'cd_scan'],
    deck: ['cd_laser', 'cd_laser', 'cd_laser', 'cd_twin', 'cd_twin', 'cd_scan', 'cd_scan'],
  },
  hacker: {
    name: '해커', icon: '💻', origin: 'cyber', hp: 22,
    handSize: 3, reveal: 2, actions: [1, 1],
    row: 'back', targets: 'front', role: 'healer', basicAttack: 4,
    companionDeck: ['ch_patch', 'ch_patch', 'ch_boost', 'ch_spike', 'ch_backdoor'],
    deck: ['ch_spike', 'ch_spike', 'ch_patch', 'ch_patch', 'ch_backdoor', 'ch_backdoor', 'ch_boost'],
  },
  mech: {
    name: '전투 메크', icon: '🤖', origin: 'cyber', hp: 88, rank: 'elite',
    handSize: 3, reveal: 2, actions: [1, 2],
    row: 'front', targets: 'front', role: 'tank', basicAttack: 8,
    companionDeck: ['cm_plate', 'cp_taunt', 'cm_cannon', 'cm_missile', 'ce_riot'],
    deck: ['cm_missile', 'cm_missile', 'cm_cannon', 'cm_cannon', 'cm_turret', 'cm_plate', 'cm_plate'],
  },
  // 중앙 코어를 들고 있는 동안 매 턴 도둑 손패 1장을 잠근다. 슬쩍으로 빼앗으면 반대로 적 손패를 잠근다.
  mainframe: {
    name: '메인프레임', icon: '🖥️', origin: 'cyber', hp: 130, rank: 'boss',
    handSize: 4, reveal: 3, actions: [1, 2], startHand: ['mf_core'],
    row: 'back', targets: 'front',
    deck: ['mf_purge', 'mf_purge', 'mf_beam', 'mf_beam', 'mf_wall', 'mf_reboot', 'mf_spam', 'mf_spam'],
  },

  // ════════ 3차원: 심해 왕국 ════════
  merfolk: {
    name: '어인 전사', icon: '🐟', origin: 'abyss', hp: 46,
    handSize: 3, reveal: 2, actions: [1, 2],
    row: 'front', targets: 'front', role: 'tank', basicAttack: 7,
    companionDeck: ['am_scale', 'am_scale', 'cp_taunt', 'am_trident', 'am_slam'],
    deck: ['am_trident', 'am_trident', 'am_trident', 'am_scale', 'am_scale', 'am_slam', 'am_slam'],
  },
  jelly: {
    name: '독해파리', icon: '🪼', origin: 'abyss', hp: 34,
    handSize: 3, reveal: 2, actions: [1, 1],
    row: 'back', targets: 'back', role: 'dealer', basicAttack: 6,
    companionDeck: ['aj_sting', 'aj_sting', 'aj_cloud', 'aj_drift'],
    deck: ['aj_sting', 'aj_sting', 'aj_sting', 'aj_cloud', 'aj_cloud', 'aj_drift', 'aj_drift'],
  },
  siren: {
    name: '세이렌', icon: '🧜', origin: 'abyss', hp: 34,
    handSize: 3, reveal: 2, actions: [1, 1],
    row: 'back', targets: 'front', role: 'healer', basicAttack: 5,
    companionDeck: ['as_song', 'as_song', 'as_hymn', 'as_charm'],
    deck: ['as_song', 'as_song', 'as_charm', 'as_charm', 'as_charm', 'as_hymn', 'as_hymn'],
  },
  angler: {
    name: '심해 아귀', icon: '🐡', origin: 'abyss', hp: 104, rank: 'elite',
    handSize: 3, reveal: 2, actions: [1, 2],
    row: 'front', targets: 'front', role: 'dealer', basicAttack: 9,
    companionDeck: ['aa_bite', 'aa_devour', 'aa_ink', 'aa_glow'],
    deck: ['aa_bite', 'aa_bite', 'aa_glow', 'aa_devour', 'aa_devour', 'aa_ink', 'aa_ink', 'aa_spit'],
  },
  // 크라켄: 촉수 8개(앞줄 4 · 뒷줄 4)가 각자 체력과 카드를 가진다. 모두 쓰러뜨리면 승리.
  tentacle: {
    name: '크라켄 촉수', icon: '🦑', origin: 'abyss', hp: 28, rank: 'boss',
    handSize: 2, reveal: 1, actions: [1, 1],
    row: 'front', targets: 'front',
    deck: ['kr_slap', 'kr_slap', 'kr_squeeze', 'kr_squeeze', 'kr_grip', 'kr_coil'],
  },
  tentacle_b: {
    name: '크라켄 촉수', icon: '🐙', origin: 'abyss', hp: 28, rank: 'boss',
    handSize: 2, reveal: 1, actions: [1, 1],
    row: 'back', targets: 'back',
    deck: ['kr_slap', 'kr_squeeze', 'kr_squeeze', 'kr_grip', 'kr_grip', 'kr_coil'],
  },

  // ════════ 4차원: 지옥 ════════
  hound: {
    name: '지옥견', icon: '🐺', origin: 'hell', hp: 50,
    handSize: 3, reveal: 2, actions: [1, 2],
    row: 'front', targets: 'front', role: 'tank', basicAttack: 8,
    companionDeck: ['hh_howl', 'hh_howl', 'hh_bite', 'hh_bite', 'hh_frenzy'],
    deck: ['hh_bite', 'hh_bite', 'hh_bite', 'hh_howl', 'hh_howl', 'hh_frenzy', 'hh_frenzy'],
  },
  imp: {
    name: '임프', icon: '😈', origin: 'hell', hp: 32,
    handSize: 3, reveal: 2, actions: [1, 1],
    row: 'back', targets: 'back', role: 'dealer', basicAttack: 7,
    companionDeck: ['hi_bolt', 'hi_bolt', 'hi_rain', 'hi_offer'],
    deck: ['hi_bolt', 'hi_bolt', 'hi_bolt', 'hi_rain', 'hi_rain', 'hi_offer', 'hi_offer'],
  },
  cultist: {
    name: '타락한 사제', icon: '🕯️', origin: 'hell', hp: 34,
    handSize: 3, reveal: 2, actions: [1, 1],
    row: 'back', targets: 'front', role: 'healer', basicAttack: 5,
    companionDeck: ['hc_ritual', 'hc_ritual', 'hc_ward', 'hc_curse', 'hc_drain'],
    deck: ['hc_ritual', 'hc_ritual', 'hc_curse', 'hc_curse', 'hc_ward', 'hc_drain', 'hc_drain'],
  },
  doomknight: {
    name: '지옥 기사', icon: '👹', origin: 'hell', hp: 120, rank: 'elite',
    handSize: 3, reveal: 2, actions: [1, 2],
    row: 'front', targets: 'front', role: 'tank', basicAttack: 10,
    companionDeck: ['hd_guard', 'cp_taunt', 'hd_blade', 'hd_sweep', 'hh_howl'],
    deck: ['hd_blade', 'hd_blade', 'hd_pact', 'hd_sweep', 'hd_sweep', 'hd_guard', 'hd_guard'],
  },
  // 마왕의 탐욕을 들고 있는 동안 매 턴 도둑이 훔친 카드(다른 차원 출신·슬쩍한 카드)를 1장씩 빼앗아 간다.
  demonking: {
    name: '마왕', icon: '👿', origin: 'hell', hp: 180, rank: 'boss',
    handSize: 4, reveal: 3, actions: [1, 2], startHand: ['dk_greed'],
    row: 'back', targets: 'front',
    deck: ['dk_storm', 'dk_storm', 'dk_claw', 'dk_claw', 'dk_throne', 'dk_drain', 'dk_mock'],
  },

  // ════════ 비밀 차원: 차원의 틈 ════════
  // 원조 도둑: 전투 시작 때 도둑의 덱을 그대로 복사해 쓴다(mirrorDeck). 체력은 config.void.protoHp.
  //  deck 은 강탈 후보·예상 피해 계산용 기본값
  proto_thief: {
    name: '원조 도둑', icon: '🎭', origin: 'void', hp: 600, rank: 'boss', mirrorDeck: true,
    handSize: 5, reveal: 2, actions: [2, 3],
    row: 'front', targets: 'front',
    deck: ['pilfer', 'stab', 'stab', 'dodge', 'dodge'],
  },
};
