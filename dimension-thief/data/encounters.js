// 전투 구성. tier 1 은 초반(전투 1~2), tier 2 는 그 이후.
// 맵(3단계)이 생기기 전까지는 전투가 끝나면 다음 전투를 무작위로 고른다.
window.DT = window.DT || {};
DT.data = DT.data || {};

DT.data.encounters = {
  medieval: [
    { id: 'lone_knight',   tier: 1, enemies: ['knight'] },
    { id: 'two_squires',   tier: 1, enemies: ['squire', 'squire'] },
    { id: 'squire_archer', tier: 1, enemies: ['squire', 'archer'] },
    { id: 'patrol',        tier: 2, enemies: ['squire', 'archer', 'squire'] },
    { id: 'knight_monk',   tier: 2, enemies: ['knight', 'monk'] },
    { id: 'archer_line',   tier: 2, enemies: ['archer', 'monk', 'archer'] },
  ],
};
