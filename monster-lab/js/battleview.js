// 전투 화면: 3대3, 기술·교체, 쓰러진 뒤 고르기, 결과(경험치·기술 배우기·진화)
var ML = window.ML = window.ML || {};

(function () {
  var ui = ML.ui, screen = document.getElementById('screen');
  var V = null;   // 지금 전투 화면 상태

  ML.battleView = {
    isBusy: function () { return !!(V && V.busy); },
    stop: function () { V = null; },

    // team: 내 몬스터 3마리(그대로 고쳐 씀) · foes: 상대 · opts: { rng, expBoost, onExit(), onRematch(), onSave() }
    start: function (team, foes, opts) {
      var battle = new ML.Battle({ rng: opts.rng, mine: team, foe: foes });
      V = { battle: battle, opts: opts, shown: 0, busy: false, disp: { hp: {}, active: [0, 0] } };
      battle.sides.forEach(function (s) { s.units.forEach(function (u) { V.disp.hp[u.mon.uid] = u.mon.hp; }); });
      render();
      play(true);
    },
  };

  // ── 그리기 ────────────────────────────────────────
  function unitAt(side) { return V.battle.sides[side].units[V.disp.active[side]]; }

  function benchRow(side) {
    var s = V.battle.sides[side];
    return '<div class="bench">' + s.units.map(function (u, i) {
      var hp = V.disp.hp[u.mon.uid], pct = Math.max(0, hp / u.stats.hp * 100);
      return '<div class="b-slot' + (i === V.disp.active[side] ? ' on' : '') + (hp <= 0 ? ' down' : '') + '">' +
        ML.art.svg(u.mon.species, { size: 40, shiny: u.mon.shiny, flip: side === 1 }) +
        '<div class="mini"><i style="width:' + pct + '%"></i></div></div>';
    }).join('') + '</div>';
  }

  function infoBox(u) {
    var sp = ML.species[u.mon.species], hp = V.disp.hp[u.mon.uid], pct = Math.max(0, hp / u.stats.hp * 100);
    var cls = pct <= 25 ? 'low' : pct <= 50 ? 'mid' : '';
    var badges = '';
    if (u.mon.status && hp > 0) badges += '<span class="badge st-' + u.mon.status + '">' + ML.STATUS_NAMES[u.mon.status] + '</span>';
    for (var k in u.stages) if (u.stages[k]) badges += '<span class="badge ' + (u.stages[k] > 0 ? 'up' : 'down') + '">' + ML.STAT_NAMES[k] + ' ' + (u.stages[k] > 0 ? '+' : '') + u.stages[k] + '</span>';
    for (var m in u.sealed) badges += '<span class="badge down">봉인: ' + ML.moves[m].name + ' ' + u.sealed[m] + '</span>';
    if (ML.abilities[sp.ability].key === 'dayNight') badges += '<span class="badge">' + (u.form === 'day' ? '☀️ 낮' : '🌙 밤') + '</span>';
    return '<div class="info" data-uid="' + u.mon.uid + '"><div class="top"><span class="nm">' + (u.mon.shiny ? '✨' : '') + sp.name + '</span><span>Lv ' + u.mon.level + '</span></div>' +
      '<div class="row" style="gap:6px;margin-top:2px">' + ui.elChips(sp.els) + '</div>' +
      '<div class="hp"><i class="' + cls + '" style="width:' + pct + '%"></i></div>' +
      '<div class="hpnum"><span>' + ML.abilities[sp.ability].name + '</span><span>' + hp + ' / ' + u.stats.hp + '</span></div>' +
      '<div class="badges">' + badges + '</div>' + ui.traitChips(u.mon.traits) + '</div>';
  }

  function render() {
    var b = V.battle, me = unitAt(0), foe = unitAt(1);
    var foeEls = ML.species[foe.mon.species].els;
    var canAct = !V.busy && !b.over && !b.needReplace[0] && !b.needReplace[1];
    var moves = me.mon.moves.map(function (id) {
      var mv = ML.moves[id], t = ML.typeMultiplier(mv.el, foeEls), hint = '';
      if (mv.kind === 'attack') hint = t > 1.01 ? '<span class="hint good">효과 굉장 ×' + t.toFixed(2) + '</span>' : t < 0.99 ? '<span class="hint bad">효과 별로 ×' + t.toFixed(2) + '</span>' : '';
      return '<button class="move" style="--c:' + ML.elements.info[mv.el].main + '" data-move="' + id + '"' + (!canAct || me.sealed[id] ? ' disabled' : '') + '><b>' + mv.name + '</b>' +
        '<small>' + ML.elements.info[mv.el].icon + ' ' + (mv.kind === 'attack' ? '위력 ' + mv.power : '변화') + ' · 명중 ' + mv.acc + (me.sealed[id] ? ' · 봉인됨' : '') + '</small>' + hint + '</button>';
    }).join('');
    if (me.mon.moves.every(function (id) { return me.sealed[id]; })) moves += '<button class="move" data-move=""' + (canAct ? '' : ' disabled') + '>기다리기</button>';
    var canSwitch = canAct && b.bench(0).length > 0;
    screen.innerHTML = '<div class="battle"><div class="field' + (b.field.rain ? ' rain' : '') + '">' +
      (b.field.rain ? '<div class="weather">🌧️ 비 ' + b.field.rain + '턴</div>' : '') +
      '<div class="side">' + benchRow(0) + infoBox(me) + '<div class="sprite" id="sp0">' + ML.art.svg(me.mon.species, { size: 200, shiny: me.mon.shiny }) + '</div></div>' +
      '<div class="side">' + benchRow(1) + infoBox(foe) + '<div class="sprite" id="sp1">' + ML.art.svg(foe.mon.species, { size: 200, shiny: foe.mon.shiny, flip: true }) + '</div></div>' +
      '</div><div class="controls"><div class="moves">' + moves + '</div><div class="log" id="log"></div></div>' +
      '<div class="row" style="justify-content:space-between"><span class="muted">턴 ' + b.turnNo + '</span>' +
      '<div class="row"><button class="btn" id="sw"' + (canSwitch ? '' : ' disabled') + '>🔄 교체</button><button class="btn" id="quit">그만두기</button></div></div></div>';
    var log = ui.$('#log');
    b.log.slice(0, V.shown).forEach(function (e) { if (e.msg) appendLog(log, e); });
    if (!log.children.length) log.innerHTML = '<p class="muted">기술을 고르거나 교체하세요. 교체도 1턴을 씁니다.</p>';
    log.scrollTop = log.scrollHeight;
    screen.querySelectorAll('[data-move]').forEach(function (btn) {
      btn.onclick = function () { act({ type: 'move', move: btn.dataset.move || null }); };
    });
    ui.$('#sw').onclick = function () { pickSwitch(false); };
    ui.$('#quit').onclick = function () { if (!V.busy) { V = null; ML.app.show('test'); } };
  }

  function appendLog(log, e) {
    var p = document.createElement('p');
    p.className = 'k-' + (e.kind || '');
    p.textContent = e.msg;
    log.appendChild(p);
  }

  // ── 진행 ──────────────────────────────────────────
  function act(action) {
    var b = V.battle;
    if (V.busy || b.over) return;
    b.turn([action, ML.ai.chooseAction(b, 1)]);
    afterTurn();
  }

  function afterTurn() {
    var b = V.battle;
    if (!b.over && b.needReplace[1]) b.replace(1, ML.ai.chooseReplacement(b, 1));
    play(false);
  }

  // 교체 고르기. forced = 쓰러져서 반드시 골라야 함
  function pickSwitch(forced) {
    var b = V.battle, foe = b.active(1);
    var list = b.bench(0).map(function (i) {
      var u = b.sides[0].units[i], best = 0, worst = 0;
      u.mon.moves.forEach(function (id) { var mv = ML.moves[id]; if (mv.kind === 'attack') best = Math.max(best, ML.typeMultiplier(mv.el, ML.species[foe.mon.species].els)); });
      foe.mon.moves.forEach(function (id) { var mv = ML.moves[id]; if (mv.kind === 'attack') worst = Math.max(worst, ML.typeMultiplier(mv.el, ML.species[u.mon.species].els)); });
      var hint = (best > 1.01 ? '<span class="hint good">공격 유리</span> ' : best < 0.99 ? '<span class="hint bad">공격 불리</span> ' : '') +
        (worst > 1.01 ? '<span class="hint bad">약점 노출</span>' : worst < 0.99 ? '<span class="hint good">방어 유리</span>' : '');
      return '<button class="sw-item" data-to="' + i + '">' + ML.art.svg(u.mon.species, { size: 70, shiny: u.mon.shiny }) +
        '<div><b>' + ML.species[u.mon.species].name + '</b> Lv ' + u.mon.level + '<br><span class="muted">' + u.mon.hp + ' / ' + u.stats.hp +
        (u.mon.status ? ' · ' + ML.STATUS_NAMES[u.mon.status] : '') + '</span><br>' + hint + '</div></button>';
    }).join('');
    var m = ui.modal('<h3>' + (forced ? '다음 몬스터를 고르세요' : '누구로 교체할까요? (1턴 사용)') + '</h3><div class="sw-list">' + list + '</div>' +
      (forced ? '' : '<div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn" data-close>취소</button></div>'),
      null, forced);
    m.querySelectorAll('[data-to]').forEach(function (btn) {
      btn.onclick = function () {
        ui.closeModal();
        var to = +btn.dataset.to;
        if (forced) { b.replace(0, to); play(false); }
        else act({ type: 'switch', to: to });
      };
    });
  }

  // 로그를 한 줄씩 보여 주며 체력바·흔들림·숫자·교체를 연출
  function play(instant) {
    var v = V, b = v.battle;
    v.busy = true;
    screen.querySelectorAll('.move, #sw').forEach(function (x) { x.disabled = true; });
    var step = function () {
      if (V !== v) return;
      if (v.shown >= b.log.length) {
        v.busy = false;
        render();
        if (b.over) setTimeout(function () { if (V === v) showResult(); }, 400);
        else if (b.needReplace[0]) pickSwitch(true);
        return;
      }
      var e = b.log[v.shown++];
      var delay = instant ? 0 : 420, log = ui.$('#log');
      if (e.msg && log) { if (log.querySelector('.muted')) log.innerHTML = ''; appendLog(log, e); log.scrollTop = log.scrollHeight; }
      if (e.swap !== undefined) { v.disp.active[e.swap] = e.to; if (!instant) { render(); delay = 380; } }
      if (e.hit !== undefined) {
        v.disp.hp[e.uid] = Math.max(0, v.disp.hp[e.uid] - e.dmg);
        updateHp(e.uid);
        var sp = ui.$('#sp' + e.hit);
        if (sp && e.dmg > 0 && !instant) {
          sp.classList.remove('shake'); void sp.offsetWidth; sp.classList.add('shake');
          floatText(sp, '-' + e.dmg, e.eff > 1.01 ? 'good' : e.eff < 0.99 ? 'weak' : 'dmg');
        }
        delay = instant ? 0 : 260;
      }
      if (e.heal !== undefined) {
        var hu = findUnit(e.uid);
        v.disp.hp[e.uid] = Math.min(hu.stats.hp, v.disp.hp[e.uid] + e.amt);
        updateHp(e.uid);
        var sh = ui.$('#sp' + e.heal);
        if (sh && !instant) floatText(sh, '+' + e.amt, 'heal');
        delay = instant ? 0 : 260;
      }
      if (e.faint !== undefined) { var sf = ui.$('#sp' + e.faint); if (sf) sf.classList.add('faint'); delay = instant ? 0 : 650; }
      setTimeout(step, delay);
    };
    step();
  }

  function findUnit(uid) {
    var f = null;
    V.battle.sides.forEach(function (s) { s.units.forEach(function (u) { if (u.mon.uid === uid) f = u; }); });
    return f;
  }

  function updateHp(uid) {
    var box = screen.querySelector('.info[data-uid="' + uid + '"]'), u = findUnit(uid), hp = V.disp.hp[uid];
    if (!box || !u) return;
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

  // ── 결과: 경험치 → 기술 배우기 → 진화 ──────────────
  function showResult() {
    var b = V.battle, win = b.winner === 0, opts = V.opts;
    var exp = ML.battleExp(b, opts.expBoost ? ML.config.test.expBoost : 1);
    var rows = [], queue = [];
    b.sides[0].units.forEach(function (u) {
      var mon = u.mon, gain = exp[mon.uid] || 0, res = ML.gainExp(mon, gain);
      rows.push({ mon: mon, res: res });
      res.pending.forEach(function (mv) { queue.push({ type: 'learn', mon: mon, move: mv }); });
      if (ML.evolveTarget(mon)) queue.push({ type: 'evolve', mon: mon });
    });
    opts.onSave();
    var html = '<h3>' + (win ? '🏆 승리!' : '💥 패배…') + '</h3><p class="muted">' + b.turnNo + '턴' + (opts.expBoost ? ' · 경험치 ×' + ML.config.test.expBoost + ' (시험용)' : '') + '</p>' +
      '<div class="exp-list">' + rows.map(function (r) {
        var m = r.mon, need = ML.expToNext(m.level);
        return '<div class="exp-row">' + ML.art.svg(m.species, { size: 64, shiny: m.shiny }) + '<div style="flex:1"><b>' + ML.species[m.species].name + '</b> ' +
          (r.res.to > r.res.from ? '<span class="lvup">Lv ' + r.res.from + ' → ' + r.res.to + ' ▲</span>' : 'Lv ' + m.level) +
          '<span class="muted"> · 경험치 +' + r.res.gain + '</span>' +
          (r.res.learned.length ? '<div class="muted">새 기술: ' + r.res.learned.map(function (x) { return ML.moves[x].name; }).join(', ') + '</div>' : '') +
          '<div class="bar" style="margin-top:4px"><i style="width:' + (m.level >= ML.config.maxLevel ? 100 : m.exp / need * 100) + '%"></i></div></div></div>';
      }).join('') + '</div>' +
      '<div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn primary" id="r-next">계속</button></div>';
    var md = ui.modal(html, null, true);
    md.querySelector('#r-next').onclick = function () { ui.closeModal(); runQueue(queue); };
  }

  function runQueue(queue) {
    var opts = V.opts;
    if (!queue.length) {
      opts.onSave();
      var m = ui.modal('<h3>전투 끝</h3><div class="row" style="justify-content:flex-end"><button class="btn" id="e-setup">팀 편성으로</button><button class="btn primary" id="e-again">같은 상대와 다시</button></div>', null, true);
      m.querySelector('#e-setup').onclick = function () { ui.closeModal(); V = null; opts.onExit(); };
      m.querySelector('#e-again').onclick = function () { ui.closeModal(); V = null; opts.onRematch(); };
      return;
    }
    var job = queue.shift(), next = function () { ui.closeModal(); runQueue(queue); };
    if (job.type === 'learn') learnPrompt(job.mon, job.move, next);
    else evolveScene(job.mon, next);
  }

  function learnPrompt(mon, moveId, done) {
    var nm = ML.species[mon.species].name, mv = ML.moves[moveId];
    var card = function (id, extra) {
      var m = ML.moves[id];
      return '<div class="lm" style="--c:' + ML.elements.info[m.el].main + '"><b>' + m.name + '</b><br><span class="muted">' + ML.elements.info[m.el].icon + ' ' +
        (m.kind === 'attack' ? '위력 ' + m.power : '변화') + ' · 명중 ' + m.acc + '</span>' + (extra || '') + '</div>';
    };
    var m = ui.modal('<h3>' + nm + '이(가) 새 기술을 배우려 한다!</h3>' + card(moveId, ' <span class="lvup">NEW</span>') +
      '<p>기술은 4개까지입니다. 잊을 기술을 고르세요.</p><div class="lm-grid">' +
      mon.moves.map(function (id, i) { return '<button class="lm-btn" data-forget="' + i + '">' + card(id) + '<span class="muted">이 기술을 잊기</span></button>'; }).join('') +
      '</div><div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn" id="skip">' + mv.name + '을(를) 배우지 않기</button></div>', null, true);
    m.querySelectorAll('[data-forget]').forEach(function (btn) {
      btn.onclick = function () {
        var old = mon.moves[+btn.dataset.forget];
        mon.moves[+btn.dataset.forget] = moveId;
        ui.toast(ML.moves[old].name + '을(를) 잊고 ' + mv.name + '을(를) 배웠다!');
        done();
      };
    });
    m.querySelector('#skip').onclick = done;
  }

  function evolveScene(mon, done) {
    var from = mon.species, to = ML.evolve(mon);
    if (!to) return done();
    var m = ui.modal('<div class="evo-scene"><p id="evo-t">어라…? ' + ML.species[from].name + '의 모습이…!</p>' +
      '<div class="evo-stage" id="evo-s">' + ML.art.svg(from, { size: 220, shiny: mon.shiny }) + '</div>' +
      '<div class="row" style="justify-content:center"><button class="btn primary" id="evo-ok" disabled>…</button></div></div>', null, true);
    var stage = m.querySelector('#evo-s');
    stage.classList.add('evolving');
    setTimeout(function () {
      stage.classList.remove('evolving'); stage.classList.add('evolved');
      stage.innerHTML = ML.art.svg(to, { size: 220, shiny: mon.shiny });
      m.querySelector('#evo-t').innerHTML = ML.josa('<b>' + ML.species[from].name + '은(는) ' + ML.species[to].name + '(으)로 진화했다!</b>');
      var ok = m.querySelector('#evo-ok'); ok.disabled = false; ok.textContent = '확인';
      ok.onclick = done;
      V.opts.onSave();
    }, 2200);
  }
})();
