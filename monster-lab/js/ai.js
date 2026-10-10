// 적 AI: 상성이 유리한 기술 우선, 크게 불리하면 교체
var ML = window.ML = window.ML || {};

ML.ai = {
  // 이번 턴 행동: 크게 불리하면 더 나은 대기 몬스터로 교체, 아니면 기술
  // "크게 불리" = 교환 효율(내가 깎는 상대 체력 비율 ÷ 내가 잃는 체력 비율)이 switchIfBelow 이하
  chooseAction: function (battle, side) {
    var c = ML.config.ai, rng = battle.rng;
    var u = battle.active(side), foe = battle.active(1 - side), bench = battle.bench(side);
    // 트레이너: 체력 30% 이하면 고급 회복약(가진 만큼)
    if (battle.potions[side] > 0 && u.mon.hp / u.stats.hp <= c.potionBelow) return { type: 'item', item: 'superpotion', uid: u.mon.uid };
    if (bench.length) {
      var now = ML.ai.trade(battle, u, foe);
      if (now <= c.switchIfBelow) {
        var best = null, bs = 0;
        bench.forEach(function (i) {
          var r = ML.ai.trade(battle, battle.sides[side].units[i], foe);
          if (r > bs) { bs = r; best = i; }
        });
        if (best !== null && bs >= now * c.switchGain && rng.chance(c.switchChance)) return { type: 'switch', to: best };
      }
    }
    return { type: 'move', move: ML.ai.chooseMove(battle, side) };
  },

  // 쓰러진 뒤 내보낼 몬스터: 지금 상대와 교환 효율이 가장 좋은 쪽(체력 많은 쪽 우대)
  chooseReplacement: function (battle, side) {
    var foe = battle.active(1 - side), units = battle.sides[side].units, best = null, bs = -1;
    battle.bench(side).forEach(function (i) {
      var u = units[i], r = ML.ai.trade(battle, u, foe) * (0.5 + 0.5 * u.mon.hp / u.stats.hp);
      if (r > bs) { bs = r; best = i; }
    });
    return best;
  },

  trade: function (battle, u, foe) {
    var give = ML.ai.bestHit(battle, u, foe) / foe.stats.hp;
    var take = ML.ai.bestHit(battle, foe, u) / u.stats.hp;
    return give / take;
  },

  // 가장 센 공격 기술의 예상 피해(명중률 반영)
  bestHit: function (battle, att, def) {
    var best = 0;
    att.mon.moves.forEach(function (id) {
      var mv = ML.moves[id];
      if (mv.kind !== 'attack' || att.sealed[id]) return;
      best = Math.max(best, battle.calcDamage(att, def, mv, true).dmg * mv.acc / 100);
    });
    return Math.max(1, best);
  },

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
