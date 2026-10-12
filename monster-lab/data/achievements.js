// 업적 [제안]: 목표·보상 전부 제안값. need(g) → [지금 값, 목표]. reward: { gold, items: {id: 개수} }
var ML = window.ML = window.ML || {};

(function () {
  function mons(g) { return g.party.concat(g.box); }
  function topLv(g) { return mons(g).reduce(function (a, m) { return Math.max(a, m.level); }, 0); }
  function caught(g) { return Object.keys(g.dex.caught || {}).filter(function (id) { return ML.species[id]; }).length; }
  function has(g, ids) { return ids.filter(function (id) { return g.dex.caught[id]; }).length; }
  function cleared(g, r) { return g.prog[r] && g.prog[r].cleared ? 1 : 0; }
  function st(g, k) { return (g.stats && g.stats[k]) || 0; }
  function maxBoost(g) { return mons(g).reduce(function (a, m) { var b = m.boost || {}; return Math.max(a, b.hp || 0, b.atk || 0, b.def || 0, b.spd || 0); }, 0); }
  var ALL = function () { return Object.keys(ML.species).length; };

  ML.achievements = [
    // 도감
    { id: 'dex10',  icon: '📖', name: '초보 연구원',   desc: '몬스터 10종 잡기',      need: function (g) { return [caught(g), 10]; },     reward: { gold: 5000, items: { greatball: 10 } } },
    { id: 'dex25',  icon: '📚', name: '숙련 연구원',   desc: '몬스터 25종 잡기',      need: function (g) { return [caught(g), 25]; },     reward: { gold: 30000, items: { ivpill: 3 } } },
    { id: 'dex40',  icon: '🔬', name: '수석 연구원',   desc: '몬스터 40종 잡기',      need: function (g) { return [caught(g), 40]; },     reward: { gold: 150000, items: { traitcharm: 5 } } },
    { id: 'dexAll', icon: '🏛️', name: '도감 완성',     desc: '모든 종 잡기(신화 포함)', need: function (g) { return [caught(g), ALL()]; },  reward: { gold: 3000000, items: { boost2_atk: 1, boost2_def: 1, boost2_spd: 1, boost2_hp: 1 } } },
    { id: 'shiny1', icon: '✨', name: '반짝이는 발견', desc: '색다른 개체 1종 잡기',  need: function (g) { return [Object.keys(g.dex.shiny || {}).length, 1]; }, reward: { gold: 20000 } },
    { id: 'shiny5', icon: '🌟', name: '색다른 수집가', desc: '색다른 개체 5종 잡기',  need: function (g) { return [Object.keys(g.dex.shiny || {}).length, 5]; }, reward: { gold: 300000, items: { boost_spd: 1 } } },
    // 전설·신화
    { id: 'legend3', icon: '🐉', name: '전설의 증인',  desc: '전설 3종(일식룡·폭풍고래·세계수거인) 모두 잡기', need: function (g) { return [has(g, ['eclipsedragon', 'stormwhale', 'worldtree']), 3]; }, reward: { gold: 100000, items: { traitcharm: 3 } } },
    { id: 'terradon', icon: '🌋', name: '대지의 왕',    desc: '테라돈 잡기',           need: function (g) { return [has(g, ['terradon']), 1]; },     reward: { gold: 150000, items: { traitcharm: 3 } } },
    { id: 'origin',  icon: '✴️', name: '근원에 닿다',  desc: '태초수 잡기',           need: function (g) { return [has(g, ['primordial']), 1]; },   reward: { gold: 200000, items: { boost_atk: 1 } } },
    { id: 'mythic',  icon: '♾️', name: '무한을 손에',  desc: '신화 무한신룡 잡기',    need: function (g) { return [has(g, ['infinidragon']), 1]; }, reward: { gold: 5000000, items: { boost2_atk: 2 } } },
    // 지역
    { id: 'reg1', icon: '🏅', name: '첫 배지',         desc: '1지역 정복',            need: function (g) { return [cleared(g, 1), 1]; }, reward: { gold: 2000, items: { greatball: 5 } } },
    { id: 'reg4', icon: '🌋', name: '화산을 넘어',     desc: '4지역 정복',            need: function (g) { return [cleared(g, 4), 1]; }, reward: { gold: 30000 } },
    { id: 'reg7', icon: '🏆', name: '일곱 지역의 주인', desc: '7지역 정복(엔딩)',      need: function (g) { return [cleared(g, 7), 1]; }, reward: { gold: 300000, items: { boost_hp: 1 } } },
    // 레벨
    { id: 'lv50',  icon: '⬆️', name: '한계 돌파',       desc: '레벨 50 몬스터 키우기',  need: function (g) { return [topLv(g), 50]; },  reward: { gold: 10000 } },
    { id: 'lv100', icon: '💯', name: '백 레벨',         desc: '레벨 100 몬스터 키우기', need: function (g) { return [topLv(g), 100]; }, reward: { gold: 50000 } },
    { id: 'lv300', icon: '🚀', name: '삼백 레벨',       desc: '레벨 300 몬스터 키우기', need: function (g) { return [topLv(g), 300]; }, reward: { gold: 500000 } },
    { id: 'lv500', icon: '🌌', name: '오백 레벨',       desc: '레벨 500 몬스터 키우기', need: function (g) { return [topLv(g), 500]; }, reward: { gold: 2000000, items: { boost_def: 2 } } },
    // 전투·육성
    { id: 'battle100',  icon: '⚔️', name: '백전노장',   desc: '전투 100번',            need: function (g) { return [st(g, 'battles'), 100]; },  reward: { gold: 15000 } },
    { id: 'battle1000', icon: '🛡️', name: '천전불패',   desc: '전투 1000번',           need: function (g) { return [st(g, 'battles'), 1000]; }, reward: { gold: 300000 } },
    { id: 'catch100',   icon: '🔴', name: '포획 달인',  desc: '몬스터 100마리 잡기',   need: function (g) { return [st(g, 'caught'), 100]; },   reward: { gold: 30000, items: { greatball: 30 } } },
    { id: 'fusion10',   icon: '🧬', name: '합성 연구가', desc: '합성 10번',            need: function (g) { return [st(g, 'fusions'), 10]; },   reward: { gold: 30000, items: { catalyst: 3, charm: 3 } } },
    { id: 'mega10',     icon: '💎', name: '메가 마스터', desc: '메가진화 10번',        need: function (g) { return [st(g, 'megas'), 10]; },     reward: { gold: 100000 } },
    { id: 'tutor10',    icon: '🎓', name: '열혈 교사',  desc: '기술 교습소에서 10번 가르치기', need: function (g) { return [st(g, 'tutored'), 10]; }, reward: { gold: 100000 } },
    { id: 'boostMax',   icon: '💪', name: '한계의 끝',  desc: '능력치 하나를 +200%까지 강화', need: function (g) { return [Math.round(maxBoost(g) * 100), 200]; }, reward: { gold: 10000000 } },
    // 대련·무한 모드
    { id: 'spar10',  icon: '🥊', name: '10연승',        desc: '대련장 10연승',          need: function (g) { return [(g.spar && g.spar.best) || 0, 10]; },     reward: { gold: 50000, items: { lifeorb: 1 } } },
    { id: 'end10',   icon: '♾️', name: '무한의 입구',   desc: '무한 모드 10웨이브',     need: function (g) { return [(g.endless && g.endless.best) || 0, 10]; }, reward: { gold: 50000 } },
    { id: 'end30',   icon: '🌀', name: '무한의 중턱',   desc: '무한 모드 30웨이브',     need: function (g) { return [(g.endless && g.endless.best) || 0, 30]; }, reward: { gold: 300000, items: { boost_atk: 1 } } },
    { id: 'end84',   icon: '🌠', name: '신화의 문턱',   desc: '무한 모드 84웨이브(Lv 500)', need: function (g) { return [(g.endless && g.endless.best) || 0, 84]; }, reward: { gold: 3000000 } },
    { id: 'end150',  icon: '🕳️', name: '끝없는 심연',   desc: '무한 모드 150웨이브',    need: function (g) { return [(g.endless && g.endless.best) || 0, 150]; }, reward: { gold: 20000000, items: { boost2_hp: 3 } } },
  ];
})();
