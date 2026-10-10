// 실험실(개발·밸런스 확인용): 모든 종 도감 미리보기 + 3대3 시험 전투(팀 편성, 레벨업·진화 확인용)
var ML = window.ML = window.ML || {};

(function () {
  var ui = ML.ui, screen = document.getElementById('screen');
  var saved = ML.save.load() || {};
  var T = ML.config.test.defaultLevel;
  var setup = Object.assign({
    foes: [{ sp: 'sproutsquirrel', lv: T }, { sp: 'zapchick', lv: T }, { sp: 'shadecat', lv: T }],
    seed: ML.randomSeed(), expBoost: false,
  }, saved.setup || {});
  var team = loadTeam();

  // 내 팀은 전투 뒤 레벨·기술·진화가 그대로 저장된다
  function loadTeam() {
    var t = (saved.team || []).filter(function (m) { return m && ML.species[m.species] && m.ivs; });
    if (t.length === 3) return t;
    var rng = ML.makeRng(ML.randomSeed());
    return ['emberrat', 'dropcrab', 'sproutsquirrel'].map(function (id) { return ML.createMonster(id, T, rng); });
  }
  function persist() { var cur = ML.save.load() || {}; cur.setup = setup; cur.team = team; ML.save.write(cur); }

  // 실험실 탭: 도감 미리보기(모든 종) / 팀 시험 전투. 주소에 ?lab 을 붙이면 보인다.
  function show(tab) { if (tab === 'dexall') renderDex(); else renderSetup(); }
  ML.lab = { show: show, openDetail: function (id, shiny) { openDetail(id, shiny); }, groups: function () { return groups(); } };

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
    var h = '<div class="row" style="margin-bottom:10px"><button class="btn" id="to-lab">⚔️ 시험 전투로</button></div><div class="dex-head"><h2>도감 미리보기 · ' + Object.keys(ML.species).length + '종</h2>' +
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
    ui.$('#to-lab').onclick = renderSetup;
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

  // ── 시험 전투: 팀 편성 ────────────────────────────
  function speciesOptions(sel) {
    return groups().map(function (gr) {
      return '<optgroup label="' + gr.t + '">' + gr.ids.map(function (id) {
        return '<option value="' + id + '"' + (id === sel ? ' selected' : '') + '>' + ML.species[id].name + ' (' + ui.stageLabel(ML.species[id]) + ')</option>';
      }).join('') + '</optgroup>';
    }).join('');
  }
  function moveNames(m) { return m.moves.map(function (x) { return ML.moves[x].name; }).join(', '); }

  function myCard(m, i) {
    var st = ML.calcStats(m), need = ML.expToNext(m.level), ev = ML.species[m.species].evolve;
    return '<div class="tm">' + ML.art.svg(m.species, { size: 92, shiny: m.shiny }) +
      '<div class="tm-body"><div class="row" style="gap:6px"><b>' + (i === 0 ? '🚩 ' : '') + ML.species[m.species].name + '</b><span>Lv ' + m.level + '</span>' + ui.elChips(ML.species[m.species].els) + '</div>' +
      '<div class="bar" title="경험치"><i style="width:' + (m.level >= ML.config.maxLevel ? 100 : m.exp / need * 100) + '%"></i></div>' +
      '<div class="muted small">경험치 ' + m.exp + ' / ' + need + (ev ? ML.josa(' · Lv' + ev[1] + '에 ' + ML.species[ev[0]].name + '(으)로 진화') : '') + '</div>' +
      '<div class="muted small">체력 ' + st.hp + ' · 공격 ' + st.atk + ' · 방어 ' + st.def + ' · 속도 ' + st.spd + '</div>' +
      '<div class="small">' + moveNames(m) + '</div>' + ui.traitChips(m.traits) + '</div>' +
      '<div class="tm-btns"><button class="btn sm" data-change="' + i + '">바꾸기</button>' + (i ? '<button class="btn sm" data-lead="' + i + '">선두로</button>' : '') + '</div></div>';
  }

  function foeRow(f, i) {
    return '<div class="tm">' + ML.art.svg(f.sp, { size: 70, flip: true }) +
      '<div class="tm-body"><select data-foe="' + i + '">' + speciesOptions(f.sp) + '</select>' +
      '<div class="stepper sm"><button data-flv="' + i + ':-5">−5</button><button data-flv="' + i + ':-1">−</button><b>Lv ' + f.lv + '</b><button data-flv="' + i + ':1">+</button><button data-flv="' + i + ':5">+5</button></div></div></div>';
  }

  function renderSetup() {
    screen.innerHTML = '<div class="row" style="margin-bottom:10px"><button class="btn" id="to-dexall">📖 모든 종 미리보기</button><span class="muted small">실험실 — 본 게임 저장과 따로 저장됩니다.</span></div><div class="setup">' +
      '<div class="pick"><h3>내 팀 <span class="muted small">— 전투 뒤 레벨·기술·진화가 저장됩니다. 🚩가 먼저 나갑니다.</span></h3>' + team.map(myCard).join('') + '</div>' +
      '<div class="pick"><h3>상대 팀 (적 AI)</h3>' + setup.foes.map(foeRow).join('') +
      '<div class="row" style="justify-content:center;margin-top:8px"><button class="btn" id="f-rand">🎲 무작위 팀</button><button class="btn" id="f-match">내 팀 레벨에 맞추기</button></div></div>' +
      '<div class="setup-foot"><span class="muted">시드</span><input id="seed" inputmode="numeric" value="' + setup.seed + '">' +
      '<button class="btn" id="new-seed">🎲 새 시드</button>' +
      '<button class="btn' + (setup.expBoost ? ' primary' : '') + '" id="boost">경험치 ×' + ML.config.test.expBoost + (setup.expBoost ? ' 켜짐' : ' 꺼짐') + ' (시험용)</button>' +
      '<button class="btn primary" id="go">⚔️ 전투 시작</button></div></div>';
    screen.querySelectorAll('[data-change]').forEach(function (b) { b.onclick = function () { changeMon(+b.dataset.change); }; });
    screen.querySelectorAll('[data-lead]').forEach(function (b) {
      b.onclick = function () { var i = +b.dataset.lead, m = team.splice(i, 1)[0]; team.unshift(m); persist(); renderSetup(); };
    });
    screen.querySelectorAll('[data-foe]').forEach(function (s) { s.onchange = function () { setup.foes[+s.dataset.foe].sp = s.value; persist(); renderSetup(); }; });
    screen.querySelectorAll('[data-flv]').forEach(function (b) {
      b.onclick = function () {
        var p = b.dataset.flv.split(':'), f = setup.foes[+p[0]];
        f.lv = Math.max(1, Math.min(ML.config.maxLevel, f.lv + +p[1])); persist(); renderSetup();
      };
    });
    ui.$('#f-rand').onclick = function () {
      var ids = Object.keys(ML.species).filter(function (id) { return ML.species[id].rarity !== 'hidden'; });
      setup.foes.forEach(function (f) { f.sp = ids[Math.floor(Math.random() * ids.length)]; }); persist(); renderSetup();
    };
    ui.$('#f-match').onclick = function () { setup.foes.forEach(function (f, i) { f.lv = team[i].level; }); persist(); renderSetup(); };
    ui.$('#seed').onchange = function () { setup.seed = parseInt(this.value, 10) || ML.hashSeed(this.value); persist(); renderSetup(); };
    ui.$('#new-seed').onclick = function () { setup.seed = ML.randomSeed(); persist(); renderSetup(); };
    ui.$('#boost').onclick = function () { setup.expBoost = !setup.expBoost; persist(); renderSetup(); };
    ui.$('#go').onclick = startBattle;
    ui.$('#to-dexall').onclick = renderDex;
  }

  function changeMon(i) {
    var cur = team[i], pick = { sp: cur.species, lv: cur.level };
    var draw = function () {
      var m = ui.modal('<h3>' + (i + 1) + '번 자리 몬스터 바꾸기</h3><div class="pick" style="border:0;padding:0">' +
        ML.art.svg(pick.sp, { size: 150 }) + '<select id="c-sp">' + speciesOptions(pick.sp) + '</select>' +
        '<div class="stepper"><button data-c="-5">−5</button><button data-c="-1">−</button><b>Lv ' + pick.lv + '</b><button data-c="1">+</button><button data-c="5">+5</button></div>' +
        '<p class="muted small">새로 만들면 개체값·특성 3개를 다시 뽑고 경험치는 0부터입니다.</p></div>' +
        '<div class="row" style="justify-content:flex-end"><button class="btn" data-close>취소</button><button class="btn primary" id="c-ok">새로 만들기</button></div>');
      m.querySelector('#c-sp').onchange = function () { pick.sp = this.value; draw(); };
      m.querySelectorAll('[data-c]').forEach(function (b) { b.onclick = function () { pick.lv = Math.max(1, Math.min(ML.config.maxLevel, pick.lv + +b.dataset.c)); draw(); }; });
      m.querySelector('#c-ok').onclick = function () {
        team[i] = ML.createMonster(pick.sp, pick.lv, ML.makeRng(ML.randomSeed()));
        ui.closeModal(); persist(); renderSetup();
      };
    };
    draw();
  }

  // ── 전투 시작 ─────────────────────────────────────
  function startBattle() {
    var rng = ML.makeRng(setup.seed);
    team.forEach(function (m) { m.hp = ML.calcStats(m).hp; m.status = null; });   // 시험 전투: 시작 전 전원 회복
    var foes = setup.foes.map(function (f) { return ML.createMonster(f.sp, f.lv, rng); });
    ML.battleView.start(team, foes, {
      rng: rng, expBoost: setup.expBoost, kind: 'test',
      onSave: persist,
      onExit: function () { show('lab'); },
      onRematch: startBattle,
    });
  }

})();
