// 아이템. 가격은 골드. kind: ball(포획 도구) / heal(회복) / fusion(합성용) / held(지닌 물건)
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
  // 능력 강화제(요청, 10만 골드): 몬스터 1마리의 능력치 하나를 영구히 +5%. 한 능력치당 최대 +50%(10번) [제안]
  boost_hp:     { name: '체력의 정수', icon: '❤️', kind: 'boost', price: 100000, stat: 'hp',  desc: '몬스터 1마리의 체력 +5% (영구, 능력치당 최대 +50%)' },
  boost_atk:    { name: '공격의 정수', icon: '⚔️', kind: 'boost', price: 100000, stat: 'atk', desc: '몬스터 1마리의 공격 +5% (영구, 능력치당 최대 +50%)' },
  boost_def:    { name: '방어의 정수', icon: '🛡️', kind: 'boost', price: 100000, stat: 'def', desc: '몬스터 1마리의 방어 +5% (영구, 능력치당 최대 +50%)' },
  boost_spd:    { name: '속도의 정수', icon: '💨', kind: 'boost', price: 100000, stat: 'spd', desc: '몬스터 1마리의 속도 +5% (영구, 능력치당 최대 +50%)' },
  // 상급 강화제(요청, 100만 골드): 그 능력치 강화가 +50%를 채운 뒤에만 쓸 수 있다. 한 번에 +4%, 최종 +200%까지
  boost2_hp:    { name: '체력의 진수', icon: '💖', kind: 'boost', tier: 2, price: 1000000, stat: 'hp',  desc: '체력 강화 +50%를 채운 몬스터의 체력 +4% (영구, 최종 +200%)' },
  boost2_atk:   { name: '공격의 진수', icon: '🗡️', kind: 'boost', tier: 2, price: 1000000, stat: 'atk', desc: '공격 강화 +50%를 채운 몬스터의 공격 +4% (영구, 최종 +200%)' },
  boost2_def:   { name: '방어의 진수', icon: '🏰', kind: 'boost', tier: 2, price: 1000000, stat: 'def', desc: '방어 강화 +50%를 채운 몬스터의 방어 +4% (영구, 최종 +200%)' },
  boost2_spd:   { name: '속도의 진수', icon: '🌪️', kind: 'boost', tier: 2, price: 1000000, stat: 'spd', desc: '속도 강화 +50%를 채운 몬스터의 속도 +4% (영구, 최종 +200%)' },
  fusionstone:  { name: '합성석',      icon: '💠', kind: 'fusion', price: 150, desc: '합성에 1개 쓴다' },
  charm:        { name: '계승 부적',   icon: '🧿', kind: 'fusion', price: 200, unlock: 2, desc: '합성: 부모 특성을 더 많이 물려받는다' },
  catalyst:     { name: '돌연변이 촉매', icon: '🧫', kind: 'fusion', price: 250, unlock: 2, desc: '합성: 돌연변이 5% → 15%' },
  purewater:    { name: '정화수',      icon: '💧', kind: 'fusion', price: 200, unlock: 2, desc: '합성: 나쁜 특성이 나오지 않는다' },

  // 지닌 물건(장비) [제안]: 몬스터 1마리가 1개 장착. fx는 battle.js·stats.js가 읽는다. shop: false면 대련장 보상으로만
  orb_fire:     { name: '불꽃 구슬',   icon: '🔥', kind: 'held', price: 500, unlock: 2, fx: { elBoost: 'fire' },    desc: '불꽃 기술 피해 +20%' },
  orb_water:    { name: '물결 구슬',   icon: '🌊', kind: 'held', price: 500, unlock: 2, fx: { elBoost: 'water' },   desc: '물결 기술 피해 +20%' },
  orb_leaf:     { name: '잎새 구슬',   icon: '🍃', kind: 'held', price: 500, unlock: 2, fx: { elBoost: 'leaf' },    desc: '잎새 기술 피해 +20%' },
  orb_thunder:  { name: '번개 구슬',   icon: '⚡', kind: 'held', price: 500, unlock: 2, fx: { elBoost: 'thunder' }, desc: '번개 기술 피해 +20%' },
  orb_rock:     { name: '바위 구슬',   icon: '🪨', kind: 'held', price: 500, unlock: 2, fx: { elBoost: 'rock' },    desc: '바위 기술 피해 +20%' },
  orb_shadow:   { name: '그림자 구슬', icon: '🌑', kind: 'held', price: 500, unlock: 2, fx: { elBoost: 'shadow' },  desc: '그림자 기술 피해 +20%' },
  powerband:    { name: '힘의 머리띠', icon: '🎗️', kind: 'held', price: 600, unlock: 2, fx: { atk: 0.12 },  desc: '공격 +12%' },
  hardshell:    { name: '단단한 껍질', icon: '🐚', kind: 'held', price: 600, unlock: 2, fx: { def: 0.12 },  desc: '방어 +12%' },
  swiftfeather: { name: '신속의 깃털', icon: '🪶', kind: 'held', price: 600, unlock: 2, fx: { spd: 0.12 },  desc: '속도 +12%' },
  sharpclaw:    { name: '날카로운 발톱', icon: '🦴', kind: 'held', price: 600, unlock: 2, fx: { crit: 0.1 }, desc: '치명타 확률 +10%' },
  berry:        { name: '먹다 남은 열매', icon: '🍇', kind: 'held', price: 800, unlock: 2, fx: { regen: 0.05 }, desc: '매 턴 끝에 체력 5% 회복' },
  purebell:     { name: '정화 방울',   icon: '🔔', kind: 'held', price: 500, unlock: 2, fx: { statusResist: 0.5 }, desc: '상태 이상에 걸릴 확률 -50%' },
  luckycoin:    { name: '행운 동전',   icon: '🪙', kind: 'held', price: 800, unlock: 2, fx: { goldUp: 0.5 }, desc: '파티에 있으면 전투 골드 +50% (여러 개는 겹치지 않음)' },
  learnkit:     { name: '학습 장치',   icon: '📘', kind: 'held', price: 800, unlock: 2, fx: { exp: 0.3 },   desc: '받는 경험치 +30%' },
  lifeorb:      { name: '생명의 구슬', icon: '💗', kind: 'held', price: 0, shop: false, fx: { dmgUp: 0.3, recoil: 0.05 }, desc: '주는 피해 +30%, 공격할 때마다 최대 체력 5% 잃음 (대련장 보상)' },
  focussash:    { name: '버팀 머리띠', icon: '🥋', kind: 'held', price: 0, shop: false, fx: { sash: true }, desc: '체력이 가득할 때 쓰러질 공격을 받으면 체력 1로 버틴다(전투당 1회) (대련장 보상)' },
  kingcrown:    { name: '왕의 왕관',   icon: '👑', kind: 'held', price: 0, shop: false, fx: { atk: 0.1, def: 0.1, spd: 0.1 }, desc: '공격·방어·속도 +10% (대련장 보상)' },

  // 원시회귀 구슬 [제안]: 무한 모드 웨이브 클리어 시 아주 낮은 확률(config.endless.primalChance)
  orb_primordial:   { name: '태초의 구슬', icon: '🔴', kind: 'held', price: 0, shop: false, fx: { primalOrb: 'primordial' },   desc: '태초수 전용. 가방에 있거나 지니고 있으면 전투에 나오자마자 원시회귀한다(무한 모드 희귀 보상)' },
  orb_infinidragon: { name: '무한의 구슬', icon: '🔵', kind: 'held', price: 0, shop: false, fx: { primalOrb: 'infinidragon' }, desc: '무한신룡 전용. 가방에 있거나 지니고 있으면 전투에 나오자마자 원시회귀한다(무한 모드 희귀 보상)' },
  // 메가 결정 [제안]: 그 종이 지니면 전투에서 메가진화. 3단계용은 5지역부터 상점, 전설용은 5~7지역 전설 장소에서 처음 이기거나 잡으면 얻는다
  mega_furnacerat: { name: '용광서 메가 결정', icon: '💎', kind: 'held', price: 2500, unlock: 5, fx: { megaStone: 'furnacerat' }, desc: '용광서 전용. 가방에 있거나 지니고 있으면 전투에서 한 번 메가진화할 수 있다(장착하지 않아도 됨)' },
  mega_tidalshell: { name: '해일갑각 메가 결정', icon: '💎', kind: 'held', price: 2500, unlock: 5, fx: { megaStone: 'tidalshell' }, desc: '해일갑각 전용. 가방에 있거나 지니고 있으면 전투에서 한 번 메가진화할 수 있다(장착하지 않아도 됨)' },
  mega_eldwarden: { name: '고목수호 메가 결정', icon: '💎', kind: 'held', price: 2500, unlock: 5, fx: { megaStone: 'eldwarden' }, desc: '고목수호 전용. 가방에 있거나 지니고 있으면 전투에서 한 번 메가진화할 수 있다(장착하지 않아도 됨)' },
  mega_stormphoenix: { name: '천둥봉황 메가 결정', icon: '💎', kind: 'held', price: 2500, unlock: 5, fx: { megaStone: 'stormphoenix' }, desc: '천둥봉황 전용. 가방에 있거나 지니고 있으면 전투에서 한 번 메가진화할 수 있다(장착하지 않아도 됨)' },
  mega_ridgebear: { name: '산맥곰 메가 결정', icon: '💎', kind: 'held', price: 2500, unlock: 5, fx: { megaStone: 'ridgebear' }, desc: '산맥곰 전용. 가방에 있거나 지니고 있으면 전투에서 한 번 메가진화할 수 있다(장착하지 않아도 됨)' },
  mega_eclipsecat: { name: '월식묘 메가 결정', icon: '💎', kind: 'held', price: 2500, unlock: 5, fx: { megaStone: 'eclipsecat' }, desc: '월식묘 전용. 가방에 있거나 지니고 있으면 전투에서 한 번 메가진화할 수 있다(장착하지 않아도 됨)' },
  mega_eclipsedragon: { name: '일식룡 메가 결정', icon: '💎', kind: 'held', price: 0, shop: false, fx: { megaStone: 'eclipsedragon' }, desc: '일식룡 전용. 가방에 있거나 지니고 있으면 전투에서 한 번 메가진화할 수 있다(장착하지 않아도 됨) (전설 장소 보상)' },
  mega_stormwhale: { name: '폭풍고래 메가 결정', icon: '💎', kind: 'held', price: 0, shop: false, fx: { megaStone: 'stormwhale' }, desc: '폭풍고래 전용. 가방에 있거나 지니고 있으면 전투에서 한 번 메가진화할 수 있다(장착하지 않아도 됨) (전설 장소 보상)' },
  mega_worldtree: { name: '세계수거인 메가 결정', icon: '💎', kind: 'held', price: 0, shop: false, fx: { megaStone: 'worldtree' }, desc: '세계수거인 전용. 가방에 있거나 지니고 있으면 전투에서 한 번 메가진화할 수 있다(장착하지 않아도 됨) (전설 장소 보상)' },
};

// 상점 진열 순서. unlock: 그 지역이 열려야 판다(보조 아이템은 2지역부터)
ML.shopList = ['ball', 'greatball', 'ball_fire', 'ball_water', 'ball_leaf', 'ball_rock', 'ball_thunder', 'ball_shadow',
  'potion', 'superpotion', 'cure', 'ivpill', 'traitcharm', 'boost_hp', 'boost_atk', 'boost_def', 'boost_spd', 'boost2_hp', 'boost2_atk', 'boost2_def', 'boost2_spd', 'fusionstone', 'charm', 'catalyst', 'purewater',
  'orb_fire', 'orb_water', 'orb_leaf', 'orb_thunder', 'orb_rock', 'orb_shadow', 'powerband', 'hardshell', 'swiftfeather', 'sharpclaw', 'berry', 'purebell', 'luckycoin', 'learnkit',
  'mega_furnacerat', 'mega_tidalshell', 'mega_eldwarden', 'mega_stormphoenix', 'mega_ridgebear', 'mega_eclipsecat'];
