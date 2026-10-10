// 지역 진행 시뮬레이션: node tools/sim-region.js [판 수] [지역]
// 봇: 첫 몬스터 하나로 시작 → 탐색 → 야생은 싸우거나(체력 50% 아래면) 포획 → 파티 3마리 채움
//     → 체력이 떨어지면 회복소 → 파티 평균 레벨이 기준을 넘으면 트레이너·보스 도전
var ML = require('./sim.js');
var N = +process.argv[2] || 200;
var RG = +process.argv[3] || 1, reg = ML.regions[RG];
var STARTERS = ['emberrat', 'dropcrab', 'sproutsquirrel', 'zapchick', 'pebblebear', 'shadecat'];
var NEED = { kid: 6, warden: 10, boss1: 13, fisher: 17, keeper: 21, boss2: 24, caver: 29, priestess: 32, boss3: 36, templer: 41, hunter: 44, boss4: 47 };
var START_LV = { 2: 14, 3: 25, 4: 36 };   // 봇이 도전하는 파티 평균 레벨

function fight(rng, party, foes, wild, potions) {
  var bt = new ML.Battle({ rng: rng, mine: party, foe: foes, wild: wild, foePotions: potions || 0 });
  var g = 0, balls = 0;
  while (!bt.over && g++ < 300) {
    [0, 1].forEach(function (i) { if (bt.needReplace[i]) bt.replace(i, ML.ai.chooseReplacement(bt, i)); });
    var my = ML.ai.chooseAction(bt, 0);
    if (wild && party.length < 3 && balls < 4) {
      var f = bt.active(1);
      if (f.mon.hp / f.stats.hp < 0.5 || ML.captureChance(f.mon, f.stats.hp, 'ball') > 0.5) { my = { type: 'capture', item: 'ball' }; balls++; }
    }
    bt.turn([my, ML.ai.chooseAction(bt, 1)]);
  }
  var ex = ML.battleExp(bt, 1);
  party.forEach(function (m) { ML.gainExp(m, ex[m.uid] || 0); while (ML.evolveTarget(m)) ML.evolve(m); });
  return bt;
}

var res = [];
for (var run = 0; run < N; run++) {
  var rng = ML.makeRng(1000 + run);
  // 2지역부터: 앞 지역을 끝낸 파티(START_LV 세 마리)로 시작
  var party = RG === 1 ? [ML.createMonster(STARTERS[run % 6], 5, rng)] : [0, 1, 2].map(function (i) { var m = ML.createMonster(STARTERS[(run + i * 2) % 6], START_LV[RG], rng); while (ML.evolveTarget(m)) ML.evolve(m); return m; }), box = [];
  var visited = { gate: true }, searches = {}, beaten = {}, wilds = 0, heals = 0, losses = 0, tFights = 0, done = false;
  var cleared = function (pid) { var p = reg.places[pid]; return p.trainer ? beaten[p.trainer] : (searches[pid] || 0) >= 3; };
  var reach = function (pid) { return pid === 'gate' || reg.edges.some(function (e) { var o = e[0] === pid ? e[1] : e[1] === pid ? e[0] : null; return o && visited[o] && cleared(o); }); };
  for (var step = 0; step < 3000 && !done; step++) {
    var avgLv = party.reduce(function (s, m) { return s + m.level; }, 0) / party.length;
    var hpPct = party.reduce(function (s, m) { return s + m.hp / ML.calcStats(m).hp; }, 0) / party.length;
    if (hpPct < 0.45) { party.forEach(function (m) { m.hp = ML.calcStats(m).hp; m.status = null; }); heals++; continue; }
    // 도전할 트레이너
    var tp = Object.keys(reg.places).filter(function (pid) { var p = reg.places[pid]; return p.trainer && !beaten[p.trainer] && reach(pid); })[0];
    if (tp && avgLv >= NEED[reg.places[tp].trainer]) {
      visited[tp] = true;
      party.forEach(function (m) { m.hp = ML.calcStats(m).hp; m.status = null; }); heals++;   // 도전 전에 회복소
      var tr = ML.trainers[reg.places[tp].trainer];
      var bt = fight(rng, party, tr.team.map(function (t) { return ML.createMonster(t[0], t[1], rng); }), false, tr.potions);
      tFights++;
      if (bt.winner === 0) { beaten[reg.places[tp].trainer] = true; if (tr.boss) done = true; }
      else losses++;
      party.forEach(function (m) { m.hp = ML.calcStats(m).hp; m.status = null; }); heals++;
      continue;
    }
    // 가장 깊은 탐색 장소
    var sp = Object.keys(reg.places).reverse().filter(function (pid) { return reg.places[pid].wild && reach(pid); })[0];
    visited[sp] = true;
    searches[sp] = (searches[sp] || 0) + 1;
    if (!rng.chance(0.75)) continue;
    var p = reg.places[sp], table = {}; p.wild.forEach(function (w, i) { table[i] = w[1]; });
    var w = p.wild[+rng.weighted(table)];
    var bt2 = fight(rng, party, [ML.createMonster(w[0], rng.int(w[2], w[3]), rng)], true);
    wilds++;
    if (bt2.captured) party.push(bt2.captured);
    if (bt2.winner === 1) { losses++; party.forEach(function (m) { m.hp = ML.calcStats(m).hp; m.status = null; }); heals++; }
  }
  res.push({ done: done, wilds: wilds, tFights: tFights, losses: losses, heals: heals, lv: party.map(function (m) { return m.level; }), steps: step });
}
var ok = res.filter(function (r) { return r.done; });
var avg = function (k) { return (ok.reduce(function (s, r) { return s + r[k]; }, 0) / ok.length).toFixed(1); };
console.log('보스 격파 ' + ok.length + '/' + N);
console.log('야생 전투 평균 ' + avg('wilds') + ' · 트레이너/보스 도전 ' + avg('tFights') + ' · 패배 ' + avg('losses') + ' · 회복소 ' + avg('heals') + ' · 탐색 포함 행동 ' + avg('steps'));
var lvs = ok.map(function (r) { return r.lv.reduce(function (a, b) { return a + b; }, 0) / r.lv.length; });
console.log('보스 격파 시 파티 평균 레벨 ' + (lvs.reduce(function (a, b) { return a + b; }, 0) / lvs.length).toFixed(1));
var bossTries = ok.map(function (r) { return r.tFights; });
