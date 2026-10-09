// 아이템 정의 (목록·설명은 ITEMS.md).
//  kind: 'equip' | 'consumable' | 'loot'
//  grade: 'common' 일반 | 'rare' 희귀 | 'hero' 영웅 | 'legend' 전설
//  slot: 장비 칸 'weapon' | 'armor' | 'accessory'
//  fx: 장비 효과. 키별 처리는 js/items.js 상단 표 참고. 숫자는 장착자 기준으로 합산.
//  use: 소모품 { target: 'ally' | 'enemy' | 'deadAlly' | 'none', where: ['combat', 'map'], effect: {...} }
//  dims: 전리품이 나오는 차원(없으면 어디서나), boss: 보스 전용 전리품
window.DT = window.DT || {};
DT.data = DT.data || {};

DT.data.items = {
  // ── 무기 ──
  rusty_dagger:   { kind: 'equip', slot: 'weapon', grade: 'common', name: '녹슨 단검', icon: '🔪',
                    desc: '공격 피해 +1', fx: { dmgAdd: 1 } },
  pickpocket:     { kind: 'equip', slot: 'weapon', grade: 'common', name: '소매치기 칼', icon: '✂️',
                    desc: '슬쩍할 때 대상에게 피해 3 (도둑)', fx: { onStealDamage: 3 } },
  twin_daggers:   { kind: 'equip', slot: 'weapon', grade: 'rare', name: '쌍단검', icon: '⚔️',
                    desc: '매 턴 첫 공격 카드가 2회 발동', fx: { firstAttackTwice: 1 } },
  venom_blade:    { kind: 'equip', slot: 'weapon', grade: 'rare', name: '독 바른 칼', icon: '🗡️',
                    desc: '공격할 때마다 대상에게 독 1', fx: { poisonOnAttack: 1 } },
  rift_cutter:    { kind: 'equip', slot: 'weapon', grade: 'hero', name: '차원 절단기', icon: '🌀',
                    desc: '다른 차원 출신 적에게 피해 +30%', fx: { foreignDmgMult: 0.3 } },
  shadow_dirk:    { kind: 'equip', slot: 'weapon', grade: 'hero', name: '그림자 비수', icon: '🌑',
                    desc: '적을 처치하면 에너지 +1 (도둑)', fx: { killEnergy: 1 } },
  time_scythe:    { kind: 'equip', slot: 'weapon', grade: 'legend', name: '시간 도둑의 낫', icon: '⏳',
                    desc: '강탈 조건 체력 25% → 40% (도둑)', fx: { heistThreshold: 0.4 } },
  master_key:     { kind: 'equip', slot: 'weapon', grade: 'legend', name: '만능 열쇠검', icon: '🗝️',
                    desc: '슬쩍한 카드 비용 0 (도둑)', fx: { stolenFree: 1 } },

  // ── 방어구 ──
  leather_vest:   { kind: 'equip', slot: 'armor', grade: 'common', name: '가죽 조끼', icon: '🦺',
                    desc: '최대 체력 +8', fx: { maxHp: 8 } },
  ragged_cloak:   { kind: 'equip', slot: 'armor', grade: 'common', name: '누더기 망토', icon: '🧥',
                    desc: '전투 시작 시 방어도 4', fx: { combatBlock: 4 } },
  chainmail:      { kind: 'equip', slot: 'armor', grade: 'rare', name: '사슬 갑옷', icon: '⛓️',
                    desc: '카드로 얻는 방어도 +2', fx: { blockCardBonus: 2 } },
  stealth_cloak:  { kind: 'equip', slot: 'armor', grade: 'rare', name: '은신 망토', icon: '🫥',
                    desc: '첫 턴에는 적이 노리지 않음 (다른 아군이 있을 때)', fx: { stealthFirstTurn: 1 } },
  mirror_armor:   { kind: 'equip', slot: 'armor', grade: 'hero', name: '거울 갑옷', icon: '🪞',
                    desc: '받은 피해의 20%를 공격자에게 반사', fx: { reflect: 0.2 } },
  healing_robe:   { kind: 'equip', slot: 'armor', grade: 'hero', name: '회복 로브', icon: '👘',
                    desc: '아군 턴 종료 시 체력 2 회복', fx: { turnEndHeal: 2 } },
  rift_veil:      { kind: 'equip', slot: 'armor', grade: 'legend', name: '차원 장막', icon: '🌌',
                    desc: '차원 불안정 효과 무시 (G단계부터 적용)', fx: { ignoreInstability: 1 } },
  undying_coat:   { kind: 'equip', slot: 'armor', grade: 'legend', name: '불사의 외투', icon: '🔥',
                    desc: '전투당 1회, 치명 피해를 체력 1로 버팀', fx: { cheatDeath: 1 } },

  // ── 장신구 ──
  lucky_coin:     { kind: 'equip', slot: 'accessory', grade: 'common', name: '행운의 동전', icon: '🪙',
                    desc: '코인 +10% (파티)', fx: { coinMult: 0.1 } },
  swift_boots:    { kind: 'equip', slot: 'accessory', grade: 'common', name: '날쌘 장화', icon: '👢',
                    desc: '첫 턴 드로우 +1 (도둑)', fx: { firstTurnDraw: 1 } },
  wanted_poster:  { kind: 'equip', slot: 'accessory', grade: 'rare', name: '수배 전단', icon: '📜',
                    desc: '수배도가 오를 때마다 골드 +20 (파티)', fx: { wantedGold: 20 } },
  comrade_ring:   { kind: 'equip', slot: 'accessory', grade: 'rare', name: '동료의 반지', icon: '💍',
                    desc: '동료 공격 피해 +2 (파티)', fx: { companionDmg: 2 } },
  guild_badge:    { kind: 'equip', slot: 'accessory', grade: 'hero', name: '도둑 길드 배지', icon: '🎖️',
                    desc: '손패 최대 +2, 드로우 +1 (도둑)', fx: { handMax: 2, drawBonus: 1 } },
  rift_compass:   { kind: 'equip', slot: 'accessory', grade: 'hero', name: '차원 나침반', icon: '🧭',
                    desc: '불안정 한도 +2 (G단계부터 적용)', fx: { instabilityLimit: 2 } },
  double_shadow:  { kind: 'equip', slot: 'accessory', grade: 'legend', name: '이중 그림자', icon: '👥',
                    desc: '복제 카드가 2회 발동 (도둑)', fx: { copyTwice: 1 } },
  greed_necklace: { kind: 'equip', slot: 'accessory', grade: 'legend', name: '탐욕의 목걸이', icon: '📿',
                    desc: '코인·전리품 2배, 착용자가 받는 피해 +25%', fx: { greed: 1, damageTakenMult: 0.25 } },

  // ── 소모품 (전투 중 1회) ──
  potion:         { kind: 'consumable', grade: 'common', name: '회복 물약', icon: '🧪',
                    desc: '아군 1명 체력 15 회복', use: { target: 'ally', where: ['combat', 'map'], effect: { heal: 15 } } },
  big_potion:     { kind: 'consumable', grade: 'rare', name: '대형 회복 물약', icon: '⚗️',
                    desc: '아군 1명 최대 체력의 40% 회복', use: { target: 'ally', where: ['combat', 'map'], effect: { healPct: 0.4 } } },
  smoke_grenade:  { kind: 'consumable', grade: 'common', name: '연막 수류탄', icon: '💣',
                    desc: '적 1명의 이번 턴 행동 취소', use: { target: 'enemy', where: ['combat'], effect: { cancelAction: 1 } } },
  firebomb:       { kind: 'consumable', grade: 'common', name: '화염병', icon: '🔥',
                    desc: '모든 적에게 피해 8', use: { target: 'none', where: ['combat'], effect: { damageAll: 8 } } },
  energy_drink:   { kind: 'consumable', grade: 'rare', name: '에너지 드링크', icon: '🥤',
                    desc: '에너지 +2', use: { target: 'none', where: ['combat'], effect: { energy: 2 } } },
  dexterity:      { kind: 'consumable', grade: 'rare', name: '손재주 비약', icon: '🍯',
                    desc: '이번 턴 슬쩍하기 비용 0', use: { target: 'none', where: ['combat'], effect: { freePilfer: 1 } } },
  stabilizer:     { kind: 'consumable', grade: 'rare', name: '차원 안정제', icon: '💠',
                    desc: '차원 불안정 −2 (G단계부터 사용)', use: { target: 'none', where: ['map'], effect: { instability: -2 }, lockedUntil: 'G' } },
  fake_id:        { kind: 'consumable', grade: 'hero', name: '위조 신분증', icon: '🪪',
                    desc: '수배도 −3', use: { target: 'none', where: ['combat', 'map'], effect: { wanted: -3 } } },
  revive_feather: { kind: 'consumable', grade: 'hero', name: '부활 깃털', icon: '🪶',
                    desc: '쓰러진 동료 1명을 체력 50%로 부활', use: { target: 'deadAlly', where: ['combat', 'map'], effect: { revive: 0.5 } } },
  return_scroll:  { kind: 'consumable', grade: 'legend', name: '귀환 두루마리', icon: '📃',
                    desc: '보스전 외 언제든 손실 없이 도주', use: { target: 'none', where: ['combat', 'map'], effect: { escape: 1 } } },

  // ── 전리품 (로비 상인에게 판매) ──
  coin_pouch:     { kind: 'loot', grade: 'common', name: '동전 주머니', icon: '👛', desc: '상인에게 팔 수 있다' },
  old_map:        { kind: 'loot', grade: 'common', name: '낡은 지도', icon: '🗺️', desc: '상인에게 팔 수 있다' },
  crown_shard:    { kind: 'loot', grade: 'rare', name: '왕관 조각', icon: '💎', desc: '중세 왕국의 보물', dims: ['medieval'] },
  data_chip:      { kind: 'loot', grade: 'rare', name: '데이터 칩', icon: '💾', desc: '사이버 도시의 보물', dims: ['cyber'] },
  abyss_pearl:    { kind: 'loot', grade: 'hero', name: '심해 진주', icon: '🫧', desc: '심해 왕국의 보물', dims: ['abyss'] },
  demon_horn:     { kind: 'loot', grade: 'hero', name: '악마의 뿔', icon: '😈', desc: '지옥의 보물', dims: ['hell'] },
  rift_core:      { kind: 'loot', grade: 'legend', name: '차원 핵', icon: '🔮', desc: '차원 보스가 지닌 핵', boss: ['medieval', 'cyber', 'abyss'] },
  demon_seal:     { kind: 'loot', grade: 'legend', name: '마왕의 인장', icon: '🔱', desc: '마왕의 인장', boss: ['hell'] },
};
