// 밸런스 시뮬레이션: node tools/sim.js [판 수] [레벨]
// 같은 레벨 1대1, 양쪽 모두 적 AI로 싸운다.
var fs = require('fs'), path = require('path'), vm = require('vm');
var root = path.join(__dirname, '..');
var ctx = { console: console, Math: Math, Date: Date, JSON: JSON, Object: Object };
ctx.window = ctx;
vm.createContext(ctx);
['data/config.js', 'data/elements.js', 'data/moves.js', 'data/traits.js', 'data/monsters.js',
 'js/rng.js', 'js/stats.js', 'js/battle.js', 'js/ai.js'].forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
});
var ML = ctx.ML;
module.exports = ML;
if (require.main !== module) return;

var N = +process.argv[2] || 2000, LV = +process.argv[3] || 0;
var rng = ML.makeRng(12345);
var ids = Object.keys(ML.species).filter(function (id) { var s = ML.species[id]; return s.stage === 1 || s.stage === 2 || s.stage === 3; });

// 단계에 맞는 레벨 (LV를 주면 그 레벨로 고정)
function levelFor(id) {
  if (LV) return LV;
  var st = ML.species[id].stage;
  return st === 1 ? rng.int(5, 15) : st === 2 ? rng.int(18, 30) : rng.int(34, 45);
}

function fight(a, b) {
  var b1 = new ML.Battle({ rng: rng, mine: [a], foe: [b] });
  var guard = 0;
  while (!b1.over && guard++ < 100) {
    b1.turn([{ type: 'move', move: ML.ai.chooseMove(b1, 0) }, { type: 'move', move: ML.ai.chooseMove(b1, 1) }]);
  }
  return { turns: b1.turnNo, winner: b1.winner, left: b1.winner == null ? 0 : b1.active(b1.winner).mon.hp / b1.active(b1.winner).stats.hp };
}

function run(label, pickA, pickB) {
  var turns = [], left = 0, wins = 0, draws = 0;
  for (var i = 0; i < N; i++) {
    var A = pickA(), Bm = pickB();
    var lv = levelFor(A);
    var r = fight(ML.createMonster(A, lv, rng), ML.createMonster(Bm, lv, rng));
    turns.push(r.turns); left += r.left;
    if (r.winner === 0) wins++; if (r.winner == null) draws++;
  }
  turns.sort(function (x, y) { return x - y; });
  var avg = turns.reduce(function (s, x) { return s + x; }, 0) / N;
  console.log(label.padEnd(26) + ' 평균 턴 ' + avg.toFixed(2) + ' (중앙 ' + turns[N >> 1] + ', 10%~90% ' + turns[Math.floor(N * 0.1)] + '~' + turns[Math.floor(N * 0.9)] + ')' +
    '  선택측 승률 ' + (wins / N * 100).toFixed(1) + '%  이긴 쪽 남은 체력 ' + (left / N * 100).toFixed(0) + '%' + (draws ? '  무승부 ' + draws : ''));
}

function sameStage(st) { var l = ids.filter(function (id) { return ML.species[id].stage === st; }); return function () { return rng.pick(l); }; }
console.log('시뮬레이션 ' + N + '판씩' + (LV ? ', 레벨 ' + LV : ''));
[1, 2, 3].forEach(function (st) { run(st + '단계 vs ' + st + '단계(무작위)', sameStage(st), sameStage(st)); });

// 상성 유리 매치업: A가 B를 이기는 속성
var byEl = {}; ids.forEach(function (id) { var e = ML.species[id].els[0], s = ML.species[id].stage; (byEl[e + s] = byEl[e + s] || []).push(id); });
ML.elements.order.forEach(function (e) {
  var foe = ML.elements.beats[e];
  run(ML.elements.info[e].name + ' → ' + ML.elements.info[foe].name + '(2단계)', function () { return rng.pick(byEl[e + 2]); }, function () { return rng.pick(byEl[foe + 2]); });
});

// 종별 승률(같은 단계 무작위 상대)
console.log('\n종별 승률 (같은 단계 상대, 종당 400판)');
var rows = [];
ids.forEach(function (id) {
  var st = ML.species[id].stage, foes = ids.filter(function (x) { return ML.species[x].stage === st; }), w = 0, t = 0;
  for (var i = 0; i < 400; i++) {
    var lv = levelFor(id), r = fight(ML.createMonster(id, lv, rng), ML.createMonster(rng.pick(foes), lv, rng));
    if (r.winner === 0) w++; t += r.turns;
  }
  rows.push([ML.species[id].name, st, (w / 4).toFixed(0) + '%', (t / 400).toFixed(1)]);
});
rows.sort(function (a, b) { return a[1] - b[1] || parseInt(b[2]) - parseInt(a[2]); });
rows.forEach(function (r) { console.log('  ' + r[1] + '단계 ' + r[0].padEnd(8) + ' 승률 ' + r[2].padStart(4) + '  평균 ' + r[3] + '턴'); });
