// 전투 구성. 맵 노드 종류별(일반·정예·보스).
//  normal: tier 1 은 초반(config.encounters.tier1UntilFloor 층까지), tier 2 는 그 이후
//  적의 진형(앞줄/뒷줄)은 data/enemies.js 의 row.
window.DT = window.DT || {};
DT.data = DT.data || {};

DT.data.encounters = {
  medieval: {
    normal: [
      { id: 'knight_squire', tier: 1, enemies: ['knight', 'squire'] },
      { id: 'two_squires',   tier: 1, enemies: ['squire', 'squire'] },
      { id: 'squire_archer', tier: 1, enemies: ['squire', 'archer'] },
      { id: 'patrol',        tier: 2, enemies: ['squire', 'squire', 'archer'] },
      { id: 'knight_monk',   tier: 2, enemies: ['knight', 'squire', 'monk'] },
      { id: 'archer_line',   tier: 2, enemies: ['knight', 'archer', 'monk'] },
    ],
    elite: [
      { id: 'captain',       enemies: ['captain', 'squire'] },
      { id: 'captain_monk',  enemies: ['captain', 'monk'] },
    ],
    boss: [
      { id: 'tyrant',        enemies: ['squire', 'tyrant', 'archer'] },
    ],
  },
  cyber: {
    normal: [
      { id: 'cy_patrol',   tier: 1, enemies: ['enforcer', 'drone'] },
      { id: 'cy_drones',   tier: 1, enemies: ['drone', 'drone'] },
      { id: 'cy_hackcop',  tier: 1, enemies: ['enforcer', 'hacker'] },
      { id: 'cy_squad',    tier: 2, enemies: ['enforcer', 'drone', 'drone'] },
      { id: 'cy_netcell',  tier: 2, enemies: ['enforcer', 'drone', 'hacker'] },
      { id: 'cy_riot',     tier: 2, enemies: ['enforcer', 'enforcer', 'hacker'] },
    ],
    elite: [
      { id: 'cy_mech',     enemies: ['mech', 'drone'] },
      { id: 'cy_mech_h',   enemies: ['mech', 'hacker'] },
    ],
    boss: [
      { id: 'mainframe',   enemies: ['enforcer', 'mainframe', 'drone'] },
    ],
  },
  abyss: {
    normal: [
      { id: 'ab_scouts',   tier: 1, enemies: ['merfolk', 'jelly'] },
      { id: 'ab_jellies',  tier: 1, enemies: ['jelly', 'jelly'] },
      { id: 'ab_choir',    tier: 1, enemies: ['merfolk', 'siren'] },
      { id: 'ab_school',   tier: 2, enemies: ['merfolk', 'jelly', 'jelly'] },
      { id: 'ab_court',    tier: 2, enemies: ['merfolk', 'jelly', 'siren'] },
      { id: 'ab_guard',    tier: 2, enemies: ['merfolk', 'merfolk', 'siren'] },
    ],
    elite: [
      { id: 'ab_angler',   enemies: ['angler', 'jelly'] },
      { id: 'ab_angler_s', enemies: ['angler', 'siren'] },
    ],
    boss: [
      { id: 'kraken', enemies: ['tentacle', 'tentacle', 'tentacle', 'tentacle', 'tentacle_b', 'tentacle_b', 'tentacle_b', 'tentacle_b'] },
    ],
  },
  hell: {
    normal: [
      { id: 'hl_pack',     tier: 1, enemies: ['hound', 'imp'] },
      { id: 'hl_imps',     tier: 1, enemies: ['imp', 'imp'] },
      { id: 'hl_cult',     tier: 1, enemies: ['hound', 'cultist'] },
      { id: 'hl_hunt',     tier: 2, enemies: ['hound', 'imp', 'imp'] },
      { id: 'hl_rite',     tier: 2, enemies: ['hound', 'imp', 'cultist'] },
      { id: 'hl_gate',     tier: 2, enemies: ['hound', 'hound', 'cultist'] },
    ],
    elite: [
      { id: 'hl_doom',     enemies: ['doomknight', 'imp'] },
      { id: 'hl_doom_c',   enemies: ['doomknight', 'cultist'] },
    ],
    boss: [
      { id: 'demonking',   enemies: ['hound', 'demonking', 'imp'] },
    ],
  },
  // 비밀 차원: 4개 차원의 적이 섞여 나온다. 보스는 내 덱을 복사하는 원조 도둑
  void: {
    normal: [
      { id: 'vd_mix1', tier: 1, enemies: ['knight', 'drone'] },
      { id: 'vd_mix2', tier: 1, enemies: ['merfolk', 'imp'] },
      { id: 'vd_mix3', tier: 1, enemies: ['enforcer', 'jelly'] },
      { id: 'vd_mix4', tier: 2, enemies: ['hound', 'drone', 'siren'] },
      { id: 'vd_mix5', tier: 2, enemies: ['merfolk', 'archer', 'hacker'] },
      { id: 'vd_mix6', tier: 2, enemies: ['enforcer', 'imp', 'cultist'] },
    ],
    elite: [
      { id: 'vd_elite1', enemies: ['doomknight', 'drone'] },
      { id: 'vd_elite2', enemies: ['angler', 'hacker'] },
      { id: 'vd_elite3', enemies: ['mech', 'cultist'] },
    ],
    boss: [
      { id: 'proto', enemies: ['proto_thief'] },
    ],
  },
};
