// 시작·화면 전환. 1단계: 도감 미리보기 + 1대1 시험 전투
var ML = window.ML = window.ML || {};

(function () {
  var ui = ML.ui, screen = document.getElementById('screen');
  var saved = ML.save.load() || {};
  var setup = Object.assign({
    mine: 'emberrat', mineLv: ML.config.test.defaultLevel, mineShiny: false,
    foe: 'sproutsquirrel', foeLv: ML.config.test.defaultLevel, foeShiny: false,
    seed: ML.randomSeed(),
  }, saved.test || {});
  var current = 'dex', battleView = null;

  function persist() { saved.test = setup; ML.save.write(saved); }

  // ── 탭 ────────────────────────────────────────────
  var tabs = document.getElementById('tabs');
  tabs.addEventListener('click', function (e) {
    var b = e.target.closest('[data-tab]');
    if (!b || battleView && battleView.busy) return;
    show(b.dataset.tab);
  });
  function show(tab) {
    current = tab; battleView = null;
    saved.tab = tab; ML.save.write(saved);
    [].forEach.call(tabs.children, function (b) { b.classList.toggle('on', b.dataset.tab === tab); });
    screen.scrollTop = 0;
    if (tab === 'dex') renderDex(); else renderSetup();
  }
  ui.bindTraitTips(screen);
  ui.bindTraitTips(document.getElementById('modal-root'));

  // ── 도감 ──────────────────────────────────────────
  var dexShiny = false;
  function groups() {
    var ids = Object.keys(ML.species), g = [];
    ML.elements.order.forEach(function (e) {
      g.push({ t: ML.elements.info[e].icon + ' ' + ML.elements.info[e].name, ids: ids.filter(function (id) { var s = ML.species[id]; return s.els[0] === e && (s.stage || s.rarity === 'rare'); }) });
    });
    g.push({ t: '🧬 합성 전용종', ids: ids.filter(function (id) { return ML.species[id].rarity === 'fusion'; }) });
    g.push({ t: '🌈 전설', ids: ids.filter(function (id) { return ML.species[id].rarity === 'legend'; }) });
    g.push({ t: '❔ 숨겨진 몬스터 (개발 미리보기 — 게임에서는 ???)', ids: ids.filter(function (id) { return ML.species[id].rarity === 'hidden'; }) });
    return g;
  }

  function renderDex() {
    var h = '<div class="dex-head"><h2>도감 미리보기 · ' + Object.keys(ML.species).length + '종</h2>' +
      '<button class="btn" id="dex-shiny">' + (dexShiny ? '✨ 색다른 개체 보는 중' : '✨ 색다른 개체로 보기') + '</button></div>';
    groups().forEach(function (gr) {
      h += '<div class="dex-group">' + gr.t + '</div><div class="dex-grid">';
      gr.ids.forEach(function (id) {
        var sp = ML.species[id];
        h += '<button class="card" data-sp="' + id + '">' + ML.art.svg(id, { size: 110, shiny: dexShiny }) +
          '<div class="nm">' + sp.name + '</div><div class="sub">' + ui.elChips(sp.els) + '<span>' + ui.stageLabel(sp) + '</span></div></button>';
      });
      h += '</div>';
    });
    screen.innerHTML = h;
    ui.$('#dex-shiny').onclick = function () { dexShiny = !dexShiny; renderDex(); };
    screen.querySelectorAll('[data-sp]').forEach(function (c) { c.onclick = function () { openDetail(c.dataset.sp); }; });
  }

  function chainOf(id) {
    // 이 종이 속한 진화 계열
    var first = id, changed = true;
    while (changed) {
      changed = false;
      for (var k in ML.species) if (ML.species[k].evolve && ML.species[k].evolve[0] === first) { first = k; changed = true; }
    }
    var chain = [first];
    while (ML.species[chain[chain.length - 1]].evolve) chain.push(ML.species[chain[chain.length - 1]].evolve[0]);
    return chain;
  }

  function openDetail(id, shiny) {
    var sp = ML.species[id], ab = ML.abilities[sp.ability], rng = ML.makeRng(ML.randomSeed());
    var sample = ML.createMonster(id, 20, rng, { shiny: shiny });
    var chain = chainOf(id), maxStat = 200;
    var h = '<div class="detail"><div>' + ML.art.svg(id, { size: 230, shiny: shiny }) +
      '<div class="evo">' + chain.map(function (c, i) {
        var e = ML.species[c].evolve, lv = i > 0 ? ML.species[chain[i - 1]].evolve[1] : null;
        return (i ? '<span class="muted">→ Lv' + lv + '</span>' : '') + '<div class="step' + (c === id ? ' on' : '') + '" data-go="' + c + '">' + ML.art.svg(c, { size: 56, shiny: shiny }) + ML.species[c].name + '</div>';
      }).join('') + '</div></div><div>' +
      '<h3>' + sp.name + '</h3><div class="row">' + ui.elChips(sp.els) + '<span class="muted">' + ui.stageLabel(sp) + ' · 합성 값 ' + sp.fusionValue + '</span></div>' +
      '<div class="section-t">고유 능력 — ' + ab.name + '</div><div class="muted">' + ab.desc + '</div>' +
      '<div class="section-t">종족값 (합계 ' + (sp.stats.hp + sp.stats.atk + sp.stats.def + sp.stats.spd) + ')</div>' +
      [['hp', '체력'], ['atk', '공격'], ['def', '방어'], ['spd', '속도']].map(function (s) {
        return '<div class="stat"><span>' + s[1] + '</span><div class="bar"><i style="width:' + Math.min(100, sp.stats[s[0]] / maxStat * 100) + '%"></i></div><b>' + sp.stats[s[0]] + '</b></div>';
      }).join('') +
      '<div class="section-t">예시 개체 (Lv20, 무작위 특성 3개) <button class="btn" style="min-height:36px;font-size:14px;padding:0 12px" id="reroll">다시 뽑기</button></div>' +
      ui.traitChips(sample.traits) +
      '<div class="section-t">배우는 기술</div><div class="learn">' + ML.learnsetOf(id).map(function (l) {
        var m = ML.moves[l[1]];
        return '<div style="--c:' + ML.elements.info[m.el].main + '">Lv' + l[0] + ' <b>' + m.name + '</b><br><span class="muted">' +
          (m.kind === 'attack' ? '위력 ' + m.power : '변화') + ' · 명중 ' + m.acc + '</span></div>';
      }).join('') + '</div></div></div>' +
      '<div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn" id="d-shiny">' + (shiny ? '기본 색' : '✨ 색다른 개체') + '</button><button class="btn primary" data-close>닫기</button></div>';
    var m = ui.modal(h);
    m.querySelector('#reroll').onclick = function () { openDetail(id, shiny); };
    m.querySelector('#d-shiny').onclick = function () { openDetail(id, !shiny); };
    m.querySelectorAll('[data-go]').forEach(function (s) { s.onclick = function () { openDetail(s.dataset.go, shiny); }; });
  }

  // ── 시험 전투 설정 ────────────────────────────────
  function speciesOptions(sel) {
    return groups().map(function (gr) {
      return '<optgroup label="' + gr.t + '">' + gr.ids.map(function (id) {
        return '<option value="' + id + '"' + (id === sel ? ' selected' : '') + '>' + ML.species[id].name + ' (' + ui.stageLabel(ML.species[id]) + ')</option>';
      }).join('') + '</optgroup>';
    }).join('');
  }

  // 같은 시드면 같은 개체(특성·개체값)가 나온다
  function buildMons() {
    var rng = ML.makeRng(setup.seed);
    var mine = ML.createMonster(setup.mine, setup.mineLv, rng, { shiny: setup.mineShiny });
    var foe = ML.createMonster(setup.foe, setup.foeLv, rng, { shiny: setup.foeShiny });
    return { mine: mine, foe: foe, rng: rng };
  }

  function pickPanel(side, label) {
    var id = setup[side], lv = setup[side + 'Lv'], shiny = setup[side + 'Shiny'];
    return '<div class="pick"><h3>' + label + '</h3>' + ML.art.svg(id, { size: 170, shiny: shiny, flip: side === 'foe' }) +
      '<select data-sel="' + side + '">' + speciesOptions(id) + '</select>' +
      '<div class="stepper"><button data-lv="' + side + ':-5">−5</button><button data-lv="' + side + ':-1">−</button><b>Lv ' + lv + '</b><button data-lv="' + side + ':1">+</button><button data-lv="' + side + ':5">+5</button></div>' +
      '<div class="row" style="justify-content:center"><button class="btn" data-rand="' + side + '">🎲 무작위</button><button class="btn" data-shiny="' + side + '">' + (shiny ? '✨ 색다른 개체' : '기본 색') + '</button></div>' +
      '<div id="prev-' + side + '" style="margin-top:10px"></div></div>';
  }

  function renderSetup() {
    screen.innerHTML = '<div class="setup">' + pickPanel('mine', '내 몬스터') + pickPanel('foe', '상대 몬스터 (적 AI)') +
      '<div class="setup-foot"><span class="muted">시드</span><input id="seed" inputmode="numeric" value="' + setup.seed + '">' +
      '<button class="btn" id="new-seed">🎲 새 시드</button><button class="btn primary" id="go">⚔️ 전투 시작</button></div></div>';
    var mons = buildMons();
    ['mine', 'foe'].forEach(function (side) {
      var m = mons[side], st = ML.calcStats(m);
      ui.$('#prev-' + side).innerHTML = ui.traitChips(m.traits) +
        '<div class="muted" style="margin-top:6px;font-size:14px">체력 ' + st.hp + ' · 공격 ' + st.atk + ' · 방어 ' + st.def + ' · 속도 ' + st.spd + '</div>' +
        '<div class="muted" style="font-size:13px">기술: ' + m.moves.map(function (x) { return ML.moves[x].name; }).join(', ') + '</div>';
    });
    screen.querySelectorAll('[data-sel]').forEach(function (s) { s.onchange = function () { setup[s.dataset.sel] = s.value; persist(); renderSetup(); }; });
    screen.querySelectorAll('[data-lv]').forEach(function (b) {
      b.onclick = function () {
        var p = b.dataset.lv.split(':'), k = p[0] + 'Lv';
        setup[k] = Math.max(1, Math.min(ML.config.maxLevel, setup[k] + +p[1])); persist(); renderSetup();
      };
    });
    screen.querySelectorAll('[data-rand]').forEach(function (b) {
      b.onclick = function () {
        var ids = Object.keys(ML.species);
        setup[b.dataset.rand] = ids[Math.floor(Math.random() * ids.length)]; persist(); renderSetup();
      };
    });
    screen.querySelectorAll('[data-shiny]').forEach(function (b) { b.onclick = function () { var k = b.dataset.shiny + 'Shiny'; setup[k] = !setup[k]; persist(); renderSetup(); }; });
    ui.$('#seed').onchange = function () { setup.seed = parseInt(this.value, 10) || ML.hashSeed(this.value); persist(); renderSetup(); };
    ui.$('#new-seed').onclick = function () { setup.seed = ML.randomSeed(); persist(); renderSetup(); };
    ui.$('#go').onclick = startBattle;
  }

  // ── 전투 ──────────────────────────────────────────
  function startBattle() {
    var mons = buildMons();
    var battle = new ML.Battle({ rng: mons.rng, mine: [mons.mine], foe: [mons.foe] });
    battleView = { battle: battle, shown: 0, busy: false, hp: [mons.mine.hp, mons.foe.hp] };
    renderBattle();
    flushLog(true);
  }

  function infoBox(u, hp) {
    var sp = ML.species[u.mon.species], pct = Math.max(0, hp / u.stats.hp * 100);
    var cls = pct <= 25 ? 'low' : pct <= 50 ? 'mid' : '';
    var badges = '';
    if (u.mon.status) badges += '<span class="badge st-' + u.mon.status + '">' + ML.STATUS_NAMES[u.mon.status] + '</span>';
    for (var k in u.stages) if (u.stages[k]) badges += '<span class="badge ' + (u.stages[k] > 0 ? 'up' : 'down') + '">' + ML.STAT_NAMES[k] + ' ' + (u.stages[k] > 0 ? '+' : '') + u.stages[k] + '</span>';
    for (var m in u.sealed) badges += '<span class="badge down">봉인: ' + ML.moves[m].name + ' ' + u.sealed[m] + '</span>';
    if (ML.abilities[sp.ability].key === 'dayNight') badges += '<span class="badge">' + (u.form === 'day' ? '☀️ 낮' : '🌙 밤') + '</span>';
    return '<div class="info"><div class="top"><span class="nm">' + (u.mon.shiny ? '✨' : '') + sp.name + '</span><span>Lv ' + u.mon.level + '</span></div>' +
      '<div class="row" style="gap:6px;margin-top:2px">' + ui.elChips(sp.els) + '</div>' +
      '<div class="hp"><i class="' + cls + '" style="width:' + pct + '%"></i></div>' +
      '<div class="hpnum"><span>' + ML.abilities[sp.ability].name + '</span><span>' + hp + ' / ' + u.stats.hp + '</span></div>' +
      '<div class="badges">' + badges + '</div>' + ui.traitChips(u.mon.traits) + '</div>';
  }

  function renderBattle() {
    var v = battleView, b = v.battle, me = b.active(0), foe = b.active(1);
    var foeEls = ML.species[foe.mon.species].els;
    var moves = me.mon.moves.map(function (id) {
      var mv = ML.moves[id], t = ML.typeMultiplier(mv.el, foeEls), hint = '';
      if (mv.kind === 'attack') hint = t > 1.01 ? '<span class="hint good">효과 굉장 ×' + t.toFixed(2) + '</span>' : t < 0.99 ? '<span class="hint bad">효과 별로 ×' + t.toFixed(2) + '</span>' : '';
      var dis = v.busy || b.over || me.sealed[id];
      return '<button class="move" style="--c:' + ML.elements.info[mv.el].main + '" data-move="' + id + '"' + (dis ? ' disabled' : '') + '><b>' + mv.name + '</b>' +
        '<small>' + ML.elements.info[mv.el].icon + ' ' + (mv.kind === 'attack' ? '위력 ' + mv.power : '변화') + ' · 명중 ' + mv.acc + (me.sealed[id] ? ' · 봉인됨' : '') + '</small>' + hint + '</button>';
    }).join('');
    var allSealed = me.mon.moves.every(function (id) { return me.sealed[id]; });
    if (allSealed && !b.over) moves += '<button class="move" data-move="">기다리기</button>';
    screen.innerHTML = '<div class="battle"><div class="field' + (b.field.rain ? ' rain' : '') + '">' +
      (b.field.rain ? '<div class="weather">🌧️ 비 ' + b.field.rain + '턴</div>' : '') +
      '<div class="side">' + infoBox(me, v.hp[0]) + '<div class="sprite" id="sp0">' + ML.art.svg(me.mon.species, { size: 210, shiny: me.mon.shiny }) + '</div></div>' +
      '<div class="side">' + infoBox(foe, v.hp[1]) + '<div class="sprite" id="sp1">' + ML.art.svg(foe.mon.species, { size: 210, shiny: foe.mon.shiny, flip: true }) + '</div></div>' +
      '</div><div class="controls"><div class="moves">' + moves + '</div><div class="log" id="log"></div></div>' +
      '<div class="row" style="justify-content:space-between"><span class="muted">턴 ' + b.turnNo + ' · 시드 ' + setup.seed + '</span><button class="btn" id="quit">설정으로</button></div></div>';
    var log = ui.$('#log');
    b.log.slice(0, v.shown).forEach(function (e) { if (e.msg) appendLog(log, e); });
    log.scrollTop = log.scrollHeight;
    if (b.turnNo === 0 || !b.log.length) log.innerHTML = log.innerHTML || '<p class="muted">기술을 골라 주세요.</p>';
    screen.querySelectorAll('[data-move]').forEach(function (btn) { btn.onclick = function () { playerMove(btn.dataset.move || null); }; });
    ui.$('#quit').onclick = function () { if (!v.busy) show('test'); };
    if (b.over && v.shown >= b.log.length) showResult();
  }

  function appendLog(log, e) {
    var p = document.createElement('p');
    p.className = 'k-' + (e.kind || '');
    p.textContent = e.msg;
    log.appendChild(p);
  }

  function playerMove(moveId) {
    var v = battleView, b = v.battle;
    if (v.busy || b.over) return;
    var foeMove = ML.ai.chooseMove(b, 1);
    b.turn([{ type: 'move', move: moveId }, { type: 'move', move: foeMove }]);
    flushLog();
  }

  // 로그를 한 줄씩 보여 주며 체력바·흔들림·숫자를 연출
  function flushLog(instant) {
    var v = battleView, b = v.battle;
    v.busy = true;
    screen.querySelectorAll('.move').forEach(function (x) { x.disabled = true; });
    var step = function () {
      if (battleView !== v) return;
      if (v.shown >= b.log.length) {
        v.busy = false;
        v.hp = [b.active(0).mon.hp, b.active(1).mon.hp];
        renderBattle();
        return;
      }
      var e = b.log[v.shown++], delay = instant ? 0 : 420;
      var log = ui.$('#log');
      if (e.msg) { if (log.querySelector('.muted')) log.innerHTML = ''; appendLog(log, e); log.scrollTop = log.scrollHeight; }
      if (e.hit !== undefined) {
        v.hp[e.hit] = Math.max(0, v.hp[e.hit] - e.dmg);
        updateHp(e.hit);
        var sp = ui.$('#sp' + e.hit);
        if (sp && e.dmg > 0) {
          sp.classList.remove('shake'); void sp.offsetWidth; sp.classList.add('shake');
          floatText(sp, '-' + e.dmg, e.eff > 1.01 ? 'good' : e.eff < 0.99 ? 'weak' : 'dmg');
        }
        delay = instant ? 0 : 260;
      }
      if (e.heal !== undefined) {
        v.hp[e.heal] = Math.min(b.active(e.heal).stats.hp, v.hp[e.heal] + e.amt);
        updateHp(e.heal);
        var sh = ui.$('#sp' + e.heal);
        if (sh) floatText(sh, '+' + e.amt, 'heal');
        delay = instant ? 0 : 260;
      }
      if (e.kind === 'faint') { var sf = ui.$('#sp' + (e.msg.indexOf('상대 ') === 0 ? 1 : 0)); if (sf) sf.classList.add('faint'); }
      setTimeout(step, delay);
    };
    step();
  }

  function updateHp(side) {
    var u = battleView.battle.active(side), hp = battleView.hp[side];
    var box = screen.querySelectorAll('.info')[side];
    if (!box) return;
    var pct = Math.max(0, hp / u.stats.hp * 100), bar = box.querySelector('.hp > i');
    bar.style.width = pct + '%';
    bar.className = pct <= 25 ? 'low' : pct <= 50 ? 'mid' : '';
    box.querySelector('.hpnum span:last-child').textContent = hp + ' / ' + u.stats.hp;
  }

  function floatText(el, text, cls) {
    var f = document.createElement('div');
    f.className = 'float ' + cls; f.textContent = text;
    el.appendChild(f);
    setTimeout(function () { f.remove(); }, 900);
  }

  function showResult() {
    var b = battleView.battle, win = b.winner === 0;
    var m = ui.modal('<h3>' + (win ? '🏆 승리!' : '💥 패배…') + '</h3><p class="muted">' + b.turnNo + '턴 · 시드 ' + setup.seed + '</p>' +
      '<div class="row" style="justify-content:flex-end"><button class="btn" id="r-setup">설정으로</button>' +
      '<button class="btn" id="r-same">같은 시드로 다시</button><button class="btn primary" id="r-next">새 시드로 다시</button></div>');
    m.querySelector('#r-setup').onclick = function () { ui.closeModal(); show('test'); };
    m.querySelector('#r-same').onclick = function () { ui.closeModal(); startBattle(); };
    m.querySelector('#r-next').onclick = function () { ui.closeModal(); setup.seed = ML.randomSeed(); persist(); startBattle(); };
  }

  show(saved.tab === 'test' ? 'test' : 'dex');
})();
