// 대련장: 연구소에서 반복할 수 있는 돈벌이 3대3. 지면 골드를 잃지 않고 연승 보너스만 끊긴다.
var ML = window.ML = window.ML || {};

(function () {
  var ui = ML.ui, screen = document.getElementById('screen');
  var C = function () { return ML.config.spar; };
  var NAMES = ['수련생 다온', '격투가 한결', '연구원 보람', '떠돌이 고수 이랑', '대련 사범 무진', '쌍둥이 가람', '용병 서리', '은퇴한 챔피언 백야'];
  var ICONS = ['🥋', '🧑‍🎓', '🧑‍🔬', '🧙', '🥷', '👯', '🗡️', '🏆'];

  function st() { var g = ML.game; g.spar = g.spar || { streak: 0, best: 0, wins: 0, earned: 0 }; return g.spar; }
  function avgLv() { var p = ML.game.party; return Math.round(p.reduce(function (s, m) { return s + m.level; }, 0) / p.length); }
  function streakMul() { return 1 + Math.min(C().streakMax, st().streak * C().streakStep); }

  // 레벨에 맞는 종 후보: 진화 레벨을 지난 단계만
  function pool(lv) {
    return Object.keys(ML.species).filter(function (id) {
      var sp = ML.species[id];
      if (sp.rarity === 'rare') return lv >= 12;
      if (sp.rarity === 'fusion') return lv >= 40;
      if (!sp.stage) return false;
      var prev = Object.keys(ML.species).filter(function (k) { return ML.species[k].evolve && ML.species[k].evolve[0] === id; })[0];
      var minLv = prev ? ML.species[prev].evolve[1] : 1;
      var next = sp.evolve ? sp.evolve[1] : 99;
      return lv >= minLv && lv < next + 4;
    });
  }

  function tierInfo(t) {
    var lv = Math.max(3, Math.min(ML.config.maxLevel, avgLv() + t.lvOffset));
    return { lv: lv, gold: Math.round(lv * 3 * t.goldPerLv * streakMul()) };
  }

  function render() {
    var s = st(), g = ML.game;
    screen.innerHTML = '<div class="sub-head"><button class="btn" id="to-hub">← 연구소</button><h2>🥊 대련장</h2><span class="gold">💰 ' + g.gold + '</span></div>' +
      '<div class="spar-head"><div>🔥 연승 <b>' + s.streak + '</b> (보상 ×' + streakMul().toFixed(1) + ')</div><div>최고 연승 <b>' + s.best + '</b></div><div>대련 승리 <b>' + s.wins + '</b></div><div>대련으로 번 골드 <b>' + s.earned + '</b></div></div>' +
      '<p class="muted small">상대 3마리와 3대3. 시작 전과 끝난 뒤 파티를 무료로 회복한다. 지면 골드는 잃지 않지만 연승이 끊긴다. 이길 때마다 보상이 +' + Math.round(C().streakStep * 100) + '%씩 늘어난다(최대 +' + Math.round(C().streakMax * 100) + '%).</p>' +
      '<div class="spar-grid">' + C().tiers.map(function (t, i) {
        var inf = tierInfo(t);
        return '<button class="spar-card" data-tier="' + i + '"><span class="fi">' + t.icon + '</span><b>' + t.name + '</b><span>상대 Lv ' + inf.lv + ' × 3</span>' +
          '<span class="gold">💰 ' + inf.gold + '</span><span class="muted small">' + t.desc + '</span></button>';
      }).join('') + '</div>';
    ui.$('#to-hub').onclick = function () { ML.hub.render(); };
    screen.querySelectorAll('[data-tier]').forEach(function (b) { b.onclick = function () { start(+b.dataset.tier); }; });
  }

  function start(i) {
    var t = C().tiers[i], inf = tierInfo(t), rng = ML.state.rng(), cand = pool(inf.lv);
    var k = rng.int(0, NAMES.length - 1);
    var foes = [0, 1, 2].map(function () {
      var m = ML.createMonster(rng.pick(cand), Math.max(1, inf.lv + rng.int(-1, 1)), rng, { traitTable: t.traits });
      ML.state.markSeen(m.species);
      return m;
    });
    ML.state.saveRng(rng);
    ML.state.healAll();
    var trainer = { name: NAMES[k], icon: ICONS[k], line: '대련이다! 봐주지 않을 거야. (' + t.name + ')', lose: '좋은 대련이었어!', potions: t.potions };
    ML.explore.startBattle(foes, { kind: 'trainer', trainer: trainer, rng: rng, spar: { tier: i, gold: inf.gold } });
  }

  ML.spar = {
    render: render,
    reward: function (r, o) {
      var g = ML.game, s = st(), h = '';
      if (r.winner === 0) {
        g.gold += o.spar.gold; s.wins++; s.earned += o.spar.gold; s.streak++; s.best = Math.max(s.best, s.streak);
        g.stats.wins++;
        h = '<p>💰 ' + o.spar.gold + '골드를 얻었다! 🔥 ' + s.streak + '연승 — 다음 보상 ×' + streakMul().toFixed(1) + '</p>';
      } else {
        h = '<p class="hint bad">대련에서 졌다. 골드는 잃지 않았다. 연승이 끊겼다(' + s.streak + '연승).</p>';
        s.streak = 0;
      }
      return h;
    },
    finish: function () { ML.state.healAll(); ML.game.at = 'hub'; ML.state.save(); ML.app.show('hub'); render(); },
  };
})();
