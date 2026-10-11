// 무한 모드 [제안]: 끝없이 이어지는 3대3 웨이브. 체력은 웨이브 사이에 조금만 회복된다.
// 골드는 모아 두었다가 그만두면 전부, 지면 절반만 받는다. 10웨이브마다 보스(메가진화) + 지닌 물건.
var ML = window.ML = window.ML || {};

(function () {
  var ui = ML.ui, screen = document.getElementById('screen');
  var C = function () { return ML.config.endless; };
  var NAMES = ['무한의 도전자', '끝없는 방랑자', '탑의 수호자', '심연의 그림자', '시간의 여행자', '별빛 사냥꾼'];
  var ICONS = ['♾️', '🌀', '🗼', '👤', '⏳', '🌠'];
  var STONES = ['furnacerat', 'tidalshell', 'eldwarden', 'stormphoenix', 'ridgebear', 'eclipsecat'];

  function st() { var g = ML.game; g.endless = g.endless || { best: 0, earned: 0, runs: 0, run: null }; return g.endless; }
  function avgLv() { var p = ML.game.party; return Math.round(p.reduce(function (s, m) { return s + m.level; }, 0) / p.length); }
  function waveLv(run, w) { return Math.max(3, avgLv() + C().startOffset + Math.floor(w * C().lvPerWave)); }
  function waveGold(lv) { return Math.round(lv * 3 * C().goldPerLv * ML.state.goldMul()); }
  function isBoss(w) { return w % C().bossEvery === 0; }

  function render() {
    var s = st(), g = ML.game, run = s.run;
    screen.innerHTML = '<div class="sub-head"><button class="btn" id="to-hub">← 연구소</button><h2>♾️ 무한 모드</h2><span class="gold">💰 ' + g.gold + '</span></div>' +
      '<div class="spar-head"><div>🏆 최고 기록 <b>' + s.best + '웨이브</b></div><div>도전 <b>' + s.runs + '번</b></div><div>무한 모드로 번 골드 <b>' + s.earned + '</b></div></div>' +
      '<p class="muted small">상대 3마리와 3대3을 끝없이 이어 간다. 상대 레벨은 내 파티 평균에 맞춰지고, 웨이브가 쌓일수록 내 파티보다 점점 높아진다(약 3웨이브마다 +1, 레벨 제한 없음). ' +
      '웨이브 사이에 살아 있는 몬스터는 체력을 ' + (C().healBetween >= 1 ? '모두' : Math.round(C().healBetween * 100) + '%') + ' 회복하지만, <b>기절한 몬스터는 ' + C().fullHealEvery + '웨이브마다만</b> 다시 일어난다. 가방의 회복약은 쓸 수 있다. ' +
      '골드는 모아 두었다가 <b>그만두면 전부</b>, <b>지면 ' + Math.round(C().loseKeep * 100) + '%</b>만 받는다. ' + C().bossEvery + '웨이브마다 메가진화하는 보스가 나오고, 이기면 지닌 물건을 준다. 경험치는 보통 전투처럼 받는다.</p>' +
      (run ? '<div class="trainer-box"><b>진행 중인 도전</b> — ' + run.wave + '웨이브까지 깸 · 모은 골드 💰 ' + run.pot + '<div class="row" style="margin-top:8px"><button class="btn primary big" id="next">▶ ' + (run.wave + 1) + '웨이브 (Lv ' + waveLv(run, run.wave + 1) + ')</button><button class="btn" id="quit">🏳️ 그만두고 보상 받기</button></div></div>'
        : '<div class="row"><button class="btn primary big" id="start">♾️ 도전 시작 (상대 Lv ' + Math.max(3, avgLv() + C().startOffset) + '부터)</button></div><p class="muted small">시작할 때 파티를 무료로 완전 회복한다. 파티 평균 레벨 기준으로 상대 레벨이 정해진다.</p>');
    ui.$('#to-hub').onclick = function () { ML.hub.render(); };
    if (ui.$('#start')) ui.$('#start').onclick = startRun;
    if (ui.$('#next')) ui.$('#next').onclick = nextWave;
    if (ui.$('#quit')) ui.$('#quit').onclick = function () { endRun(false); };
  }

  function startRun() {
    var s = st();
    ML.state.healAll();
    s.run = { wave: 0, pot: 0, base: avgLv() };
    s.runs++;
    ML.state.save();
    nextWave();
  }

  function nextWave() {
    var s = st(), run = s.run, w = run.wave + 1, lv = waveLv(run, w), boss = isBoss(w);
    if (!ML.state.partyAlive()) { ui.toast('싸울 수 있는 몬스터가 없다!'); return; }
    var rng = ML.state.rng(), cand = ML.spar.pool(lv), table = w >= 5 ? 'high' : 'low';
    var picks = [0, 1, 2].map(function () { return rng.pick(cand); });
    if (boss) {
      // 보스: 3단계 하나가 메가진화, 나머지는 지닌 물건. 30웨이브부터 전설 1마리
      picks[2] = rng.pick(STONES);
      if (w >= C().legendFrom) picks[1] = rng.pick(['eclipsedragon', 'stormwhale', 'worldtree']);
    }
    var helds = Object.keys(ML.items).filter(function (id) { var it = ML.items[id]; return it.kind === 'held' && !it.fx.megaStone; });
    var foes = picks.map(function (sp, i) {
      var m = ML.createMonster(sp, Math.max(1, lv + (boss && i === 2 ? 2 : rng.int(-1, 1))), rng, { traitTable: boss ? 'legendary' : table });
      if (boss) m.held = i === 2 ? 'mega_' + sp : rng.pick(helds);
      else if (w >= 15 && rng.chance(0.3)) m.held = rng.pick(helds);
      ML.state.markSeen(m.species);
      return m;
    });
    ML.state.saveRng(rng);
    var k = (w + run.base) % NAMES.length;
    var trainer = { name: NAMES[k] + ' (' + w + '웨이브)', icon: boss ? '👑' : ICONS[k],
      line: boss ? w + '웨이브 보스다. 메가진화를 각오해라!' : '무한 모드 ' + w + '웨이브!', lose: '다음 웨이브로 가라…', potions: boss ? 2 : w >= 10 ? 1 : 0 };
    ML.explore.startBattle(foes, { kind: 'trainer', trainer: trainer, rng: rng, endless: { wave: w, gold: waveGold(lv), boss: boss } });
  }

  // 그만두거나 졌을 때 정산
  function endRun(lost) {
    var s = st(), run = s.run, g = ML.game;
    if (!run) return;
    var got = lost ? Math.floor(run.pot * C().loseKeep) : run.pot;
    g.gold += got; s.earned += got; s.run = null;
    ML.state.healAll(); ML.state.save(); ML.app.status();
    ui.modal('<div class="intro"><div class="t-icon">' + (lost ? '💫' : '🏳️') + '</div><h3>무한 모드 ' + (lost ? '패배' : '종료') + '</h3>' +
      '<p>' + run.wave + '웨이브까지 깼다. (최고 기록 ' + s.best + '웨이브)</p><p>💰 ' + got + '골드를 받았다' + (lost ? ' (모은 ' + run.pot + '골드의 ' + Math.round(C().loseKeep * 100) + '%)' : '') + '.</p>' +
      '<div class="row" style="justify-content:center"><button class="btn primary" data-close>확인</button></div></div>', function () { render(); }, true);
    render();
  }

  ML.endless = {
    render: render,
    reward: function (r, o) {
      var s = st(), run = s.run, e = o.endless, h = '';
      if (!run) return h;
      if (r.winner !== 0) return '<p class="hint bad">' + e.wave + '웨이브에서 쓰러졌다…</p>';
      run.wave = e.wave; run.pot += e.gold; s.best = Math.max(s.best, run.wave);
      ML.game.stats.wins++;
      h += '<p>✅ ' + e.wave + '웨이브 클리어! 모은 골드 +' + e.gold + ' → 💰 ' + run.pot + '</p>';
      if (e.boss) {
        var hc = ML.config.held, rng = ML.state.rng(), id;
        if (e.wave >= 20 && rng.chance(C().megaStoneChance)) id = 'mega_' + rng.pick(STONES.concat(['eclipsedragon', 'stormwhale', 'worldtree']));
        else {
          var tot = hc.dropTable.reduce(function (a, d) { return a + d[1]; }, 0), x = rng.range(0, tot); id = hc.dropTable[0][0];
          for (var i = 0; i < hc.dropTable.length; i++) { x -= hc.dropTable[i][1]; if (x < 0) { id = hc.dropTable[i][0]; break; } }
        }
        ML.state.saveRng(rng); ML.state.addItem(id);
        h += '<p class="lvup">🎁 보스 보상: ' + ML.items[id].icon + ' ' + ML.items[id].name + '!</p>';
      }
      return h;
    },
    finish: function (r) {
      var s = st(), run = s.run, g = ML.game;
      g.at = 'hub';
      if (!run) { ML.app.show('hub'); render(); return; }
      if (r.winner !== 0) { ML.app.show('hub'); return endRun(true); }
      // 웨이브 사이 회복
      var full = run.wave % C().fullHealEvery === 0;
      g.party.forEach(function (m) {
        var mx = ML.calcStats(m).hp;
        if (full) { m.hp = mx; m.status = null; }
        else if (m.hp > 0) m.hp = Math.min(mx, m.hp + Math.round(mx * C().healBetween));
      });
      ML.state.save(); ML.app.show('hub'); render();
      var next = run.wave + 1;
      ui.modal('<div class="intro"><div class="t-icon">♾️</div><h3>' + run.wave + '웨이브 클리어!</h3>' +
        '<p>' + (full ? '💖 기절한 몬스터까지 파티 전원을 회복했다!' : '💚 살아 있는 몬스터가 체력을 ' + (C().healBetween >= 1 ? '모두' : Math.round(C().healBetween * 100) + '%') + ' 회복했다. 기절한 몬스터는 ' + (C().fullHealEvery - run.wave % C().fullHealEvery) + '웨이브 뒤에 일어난다.') + '</p>' +
        '<p>모은 골드 💰 ' + run.pot + ' · 다음: ' + next + '웨이브 Lv ' + waveLv(run, next) + (isBoss(next) ? ' <b>👑 보스</b>' : '') + '</p>' +
        '<div class="row" style="justify-content:center"><button class="btn" id="e-quit">🏳️ 그만두고 받기</button><button class="btn primary" id="e-next">▶ 계속</button></div></div>', null, true);
      ui.$('#e-next').onclick = function () { ui.closeModal(); nextWave(); };
      ui.$('#e-quit').onclick = function () { ui.closeModal(); endRun(false); };
    },
  };
})();
