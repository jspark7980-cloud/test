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
};
