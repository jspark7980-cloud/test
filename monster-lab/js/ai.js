// 적 AI: 상성이 유리한 기술 우선. (2단계: 크게 불리하면 교체)
var ML = window.ML = window.ML || {};

ML.ai = {
  // 기술마다 점수를 매기고 가장 높은 것(동점 근처는 무작위)
  chooseMove: function (battle, side) {
    var u = battle.active(side), foe = battle.active(1 - side), rng = battle.rng;
    var hpPct = u.mon.hp / u.stats.hp, foeHp = foe.mon.hp;
    var scored = u.mon.moves.filter(function (m) { return !u.sealed[m]; }).map(function (id) {
      var mv = ML.moves[id], fx = mv.fx || {}, s = 0;
      if (mv.kind === 'attack') {
        var f = battle.calcDamage(u, foe, mv, true);
        s = f.dmg * (mv.acc / 100);
        if (f.dmg >= foeHp) s *= 1.5;                       // 처치 가능하면 더 선호
        if (f.type > 1.01) s *= 1.15;                       // 유리 상성 우선
      } else {
        var base = battle.calcDamage(u, foe, { power: 60, el: mv.el }, true).dmg;  // 기준: 위력 60 공격
        if (fx.heal) s = (hpPct < 0.5 ? base * 1.6 : hpPct < 0.75 ? base * 0.6 : 0) * Math.pow(ML.config.healDecay, u.healUses);
        else if (fx.status) s = foe.mon.status ? 0 : base * (foe.mon.hp / foe.stats.hp > 0.5 ? 1.2 : 0.5);
        else if (fx.self) {
          var k = Object.keys(fx.self)[0];
          s = u.stages[k] >= 2 || hpPct < 0.5 ? 0 : base * (u.stages[k] >= 1 ? 0.4 : 0.9);
        } else if (fx.foe) s = foe.stages[Object.keys(fx.foe).filter(function (x) { return x !== 'chance'; })[0]] <= -2 ? 0 : base * 0.7;
        else if (fx.seal) s = foe.lastMove && !foe.sealed[foe.lastMove] ? base * 0.9 : 0;
        else if (fx.mimic) {
          var lm = foe.lastMove && ML.moves[foe.lastMove];
          s = lm && lm.kind === 'attack' ? battle.calcDamage(u, foe, lm, true).dmg * 0.95 : 0;
        }
        s *= mv.acc / 100;
      }
      return { id: id, score: s * rng.range(0.9, 1.1) };
    });
    if (!scored.length) return null;
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored[0].id;
  },
};
