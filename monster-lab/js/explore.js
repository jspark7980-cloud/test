// 지도·탐색·조우·트레이너·보스
var ML = window.ML = window.ML || {};

(function () {
  var ui = ML.ui, screen = document.getElementById('screen');

  ML.explore = { render: render, search: search, ending: ending };

  function region() { return ML.regions[ML.game.region]; }

  // ── 지도 그리기 ───────────────────────────────────
  function mapSvg() {
    var g = ML.game, reg = region(), pr = ML.state.prog();
    var o = '<svg class="map-svg" viewBox="0 0 1000 600" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><linearGradient id="mapbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + reg.bg[0] + '"/><stop offset="1" stop-color="' + reg.bg[1] + '"/></linearGradient></defs>' +
      '<rect width="1000" height="600" rx="24" fill="url(#mapbg)"/>';
    // 장식: 풀 무늬
    for (var i = 0; i < 40; i++) {
      var x = (i * 137) % 980 + 10, y = (i * 89) % 540 + 10;
      o += '<path d="M' + x + ' ' + y + ' l4 -10 l4 10" fill="none" stroke="' + reg.color + '" stroke-opacity="0.18" stroke-width="2"/>';
    }
    reg.edges.forEach(function (e) {
      var a = reg.places[e[0]], b = reg.places[e[1]];
      var open = ML.state.reachable(e[0]) && ML.state.reachable(e[1]);
      o += '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '" stroke="' + (open ? '#f4e9c8' : '#5d6578') + '" stroke-width="' + (open ? 8 : 5) + '" stroke-dasharray="' + (open ? '18 12' : '6 12') + '" stroke-linecap="round" opacity="' + (open ? 0.85 : 0.5) + '"/>';
    });
    Object.keys(reg.places).forEach(function (pid) {
      var p = reg.places[pid], reach = ML.state.reachable(pid), here = g.at === pid;
      var cleared = ML.state.placeCleared(pid);
      o += '<g class="node' + (reach ? ' open' : ' locked') + (here ? ' here' : '') + '" data-place="' + pid + '">';
      if (here) o += '<circle cx="' + p.x + '" cy="' + p.y + '" r="54" fill="none" stroke="#ffd76b" stroke-width="5" class="pulse"/>';
      o += '<circle cx="' + p.x + '" cy="' + p.y + '" r="42" fill="' + (reach ? (p.kind === 'boss' ? '#5a2330' : p.kind === 'legend' ? '#3d2a5a' : '#26324a') : '#2a2d36') + '" stroke="' + (reach ? (p.kind === 'boss' ? '#ff6b7a' : p.kind === 'legend' ? '#ffd76b' : '#9cc6ff') : '#4a4f5c') + '" stroke-width="4"/>';
      o += '<text x="' + p.x + '" y="' + (p.y + 14) + '" text-anchor="middle" font-size="38">' + (reach ? p.icon : '🔒') + '</text>';
      o += '<text x="' + p.x + '" y="' + (p.y + 70) + '" text-anchor="middle" font-size="22" font-weight="800" fill="' + (reach ? '#eef1f7' : '#7a8296') + '" stroke="#0b0e16" stroke-width="5" paint-order="stroke">' + (reach ? p.name : '???') + '</text>';
      if (reach && cleared && p.kind !== 'boss') o += '<circle cx="' + (p.x + 32) + '" cy="' + (p.y - 32) + '" r="13" fill="#4cd38a"/><text x="' + (p.x + 32) + '" y="' + (p.y - 26) + '" text-anchor="middle" font-size="16" font-weight="900" fill="#0b1020">✓</text>';
      if (p.kind === 'boss' && pr.beaten[p.trainer]) o += '<text x="' + (p.x + 32) + '" y="' + (p.y - 24) + '" text-anchor="middle" font-size="26">🏅</text>';
      o += '</g>';
    });
    return o + '</svg>';
  }

  function wildList(p) {
    var dex = ML.game.dex, list = p.wild.map(function (w) { return w[0]; });
    var h = list.map(function (id) {
      return '<div class="wl' + (dex.seen[id] ? '' : ' unseen') + '">' + (dex.seen[id] ? ML.art.svg(id, { size: 48 }) + '<span>' + ML.species[id].name + (dex.caught[id] ? ' ●' : '') + '</span>' : '<b>?</b><span>???</span>') + '</div>';
    }).join('');
    if (p.rare) h += '<div class="wl rare' + (dex.seen[p.rare[0]] ? '' : ' unseen') + '">' + (dex.seen[p.rare[0]] ? ML.art.svg(p.rare[0], { size: 48 }) + '<span>' + ML.species[p.rare[0]].name + ' (희귀)</span>' : '<b>✨</b><span>가끔 반짝이는 무언가</span>') + '</div>';
    return '<div class="wild-list">' + h + '</div>';
  }

  function render() {
    var g = ML.game, reg = region(), pr = ML.state.prog(), panel;
    if (g.at === 'hub') {
      panel = '<h3>🏠 연구소</h3><p class="muted">' + reg.desc + '</p><p>지도에서 갈 곳을 누르면 바로 이동한다.</p>' +
        '<button class="btn primary big" data-go="' + reg.start + '">' + reg.places[reg.start].icon + ' ' + reg.places[reg.start].name + '(으)로 출발</button>';
    } else {
      var p = reg.places[g.at], n = pr.searches[g.at] || 0, tr = p.trainer && ML.trainers[p.trainer];
      var need = ML.config.clearSearches;
      panel = '<h3>' + p.icon + ' ' + p.name + '</h3><p class="muted">' + p.desc + '</p>';
      if (p.wild) {
        panel += '<div class="small">탐색 ' + n + '회' + (!p.trainer && !ML.state.placeCleared(g.at) ? ' — ' + need + '회 탐색하면 다음 길이 열린다' : '') + '</div>' + wildList(p);
      }
      if (tr) {
        var beaten = pr.beaten[p.trainer];
        panel += '<div class="trainer-box">' + tr.icon + ' <b>' + tr.name + '</b>' + (tr.boss ? ' <span class="boss-tag">지역 보스</span>' : '') +
          (beaten ? ' <span class="hint good">이김</span>' : '<div class="muted small">' + (tr.boss ? '이기면 지역 정복' : '이기면 다음 길이 열린다') + ' · 상대 ' + tr.team.length + '마리 (Lv ' + tr.team.map(function (t) { return t[1]; }).join('·') + ')</div>') + '</div>';
      }
      if (p.legend) {
        var lg = ML.species[p.legend[0]];
        var got = +pr.legendCaught || 0;      // 예전 저장(true)도 1마리로 센다
        panel += '<div class="trainer-box legend-box">' + (ML.game.dex.seen[p.legend[0]] ? ML.art.svg(p.legend[0], { size: 90 }) + '<b>' + lg.name + '</b> Lv ' + p.legend[1] : '<b>???</b> 무언가 엄청난 기운이 느껴진다…') +
          '<div class="muted small">' + (got ? '지금까지 ' + got + '마리 잡았다. 다가가면 또 만날 수 있다(특성·개체값은 매번 다르다).' : '쓰러뜨리거나 도망쳐도 다시 도전할 수 있다. 잡은 뒤에도 또 만날 수 있다.') + '</div></div>';
      }
      panel += '<div class="act-col">';
      if (p.legend) panel += '<button class="btn big danger" id="legend">✨ 다가가기</button>';
      if (p.wild) panel += '<button class="btn primary big" id="search">🔍 탐색</button>';
      if (tr && !pr.beaten[p.trainer]) panel += '<button class="btn big' + (tr.boss ? ' danger' : '') + '" id="fight">' + (tr.boss ? '👑 보스 도전' : '⚔️ 트레이너와 승부') + '</button>';
      panel += '<button class="btn" id="home">🏠 연구소로 돌아가기</button></div>';
    }
    var alive = g.party.filter(function (m) { return m.hp > 0; }).length;
    var partyBar = '<div class="party-bar">' + g.party.map(function (m) {
      var st = ML.calcStats(m);
      return '<div class="pb' + (m.hp <= 0 ? ' down' : '') + '">' + ML.art.svg(m.species, { size: 44, shiny: m.shiny }) + '<div><b>Lv' + m.level + '</b><div class="mini"><i style="width:' + (m.hp / st.hp * 100) + '%"></i></div></div></div>';
    }).join('') + (alive ? '' : '<span class="hint bad">전원 기절 — 연구소 회복소로!</span>') + '</div>';
    var regTabs = Object.keys(ML.regions).map(function (r) {
      var R = ML.regions[r], open = ML.state.unlocked(+r);
      return '<button class="reg-tab' + (+r === g.region ? ' on' : '') + '" data-region="' + r + '"' + (open ? '' : ' disabled') + '>' + (open ? '' : '🔒 ') + r + '. ' + R.name + (ML.game.prog[r] && ML.game.prog[r].cleared ? ' 🏅' : '') + '</button>';
    }).join('');
    screen.innerHTML = '<div class="explore"><div class="map-wrap"><div class="reg-tabs">' + regTabs + '</div><div class="map-box"><div class="map-title">' + reg.name + (pr.cleared ? ' 🏅' : '') + '</div>' + mapSvg() + '</div>' + partyBar + '</div><div class="place-panel">' + ML.josa(panel) + '</div></div>';
    screen.querySelectorAll('[data-region]').forEach(function (b) {
      b.onclick = function () {
        var r = +b.dataset.region;
        if (r === g.region) return;
        g.region = r; g.at = 'hub'; ML.state.save(); ML.app.status(); render();
        ui.toast(ML.regions[r].name + '(으)로 가는 길. 연구소에서 출발한다.');
      };
    });

    screen.querySelectorAll('[data-place]').forEach(function (n) { n.onclick = function () { travel(n.dataset.place); }; });
    screen.querySelectorAll('[data-go]').forEach(function (b) { b.onclick = function () { travel(b.dataset.go); }; });
    if (ui.$('#search')) ui.$('#search').onclick = search;
    if (ui.$('#legend')) ui.$('#legend').onclick = meetLegend;
    if (ui.$('#fight')) ui.$('#fight').onclick = function () { fightTrainer(region().places[ML.game.at].trainer); };
    if (ui.$('#home')) ui.$('#home').onclick = function () { ML.game.at = 'hub'; ML.state.save(); ML.app.show('hub'); };
  }

  function travel(pid) {
    var g = ML.game;
    if (g.at === pid) return;
    if (!ML.state.reachable(pid)) { ui.toast('아직 갈 수 없다. 이웃한 장소를 먼저 지나가자.'); return; }
    g.at = pid;
    ML.state.prog().visited[pid] = true;
    ML.state.save();
    ML.app.status();
    render();
  }

  function needAlive() {
    if (ML.state.partyAlive()) return true;
    ui.toast('싸울 수 있는 몬스터가 없다! 연구소 회복소로 가자.');
    return false;
  }

  // ── 탐색 ──────────────────────────────────────────
  function search() {
    if (!needAlive()) return;
    var g = ML.game, c = ML.config.search, p = region().places[g.at], pr = ML.state.prog();
    var rng = ML.state.rng();
    pr.searches[g.at] = (pr.searches[g.at] || 0) + 1;
    var justCleared = !p.trainer && pr.searches[g.at] === ML.config.clearSearches;
    var what = rng.weighted({ wild: c.wild, item: c.item, nothing: c.nothing });
    if (what === 'wild') {
      var pick, lv;
      if (p.rare && rng.chance(c.rareChance)) { pick = p.rare[0]; lv = rng.int(p.rare[1], p.rare[2]); }
      else {
        var table = {}; p.wild.forEach(function (w, i) { table[i] = w[1]; });
        var w = p.wild[+rng.weighted(table)]; pick = w[0]; lv = rng.int(w[2], w[3]);
      }
      var mon = ML.createMonster(pick, lv, rng, { shiny: rng.chance(ML.config.shinyChance), traitTable: g.region >= 3 ? 'high' : 'low' });
      ML.state.markSeen(pick);
      ML.state.saveRng(rng);
      if (mon.shiny) ui.toast('✨ 반짝반짝…! 색다른 개체다!');
      ML.state.save();
      if (justCleared) ui.toast('다음 길이 열렸다!');
      startBattle([mon], { kind: 'wild', rng: rng });
      return;
    }
    if (what === 'item') {
      var f = {}; c.finds.forEach(function (x) { f[x[0]] = x[1]; });
      var got = rng.weighted(f);
      if (got === 'gold') { var n = rng.int(c.goldMin, c.goldMax); g.gold += n; ui.toast('풀숲에서 ' + n + '골드를 주웠다!'); }
      else { ML.state.addItem(got); ui.toast('풀숲에서 ' + ML.items[got].name + '을(를) 주웠다!'); }
    } else ui.toast('아무것도 없었다…' + (justCleared ? ' 그래도 다음 길이 열렸다!' : ''));
    if (what !== 'nothing' && justCleared) setTimeout(function () { ui.toast('다음 길이 열렸다!'); }, 1900);
    ML.state.saveRng(rng);
    ML.state.save();
    ML.app.status();
    render();
  }

  // ── 전설 조우 ─────────────────────────────────────
  function meetLegend() {
    if (!needAlive()) return;
    var p = region().places[ML.game.at], rng = ML.state.rng();
    var mon = ML.createMonster(p.legend[0], p.legend[1], rng, { shiny: rng.chance(ML.config.shinyChance), traitTable: 'high' });
    ML.state.markSeen(mon.species);
    ML.state.saveRng(rng);
    ML.state.save();
    startBattle([mon], { kind: 'wild', rng: rng, legend: true });
  }

  // ── 트레이너·보스 ─────────────────────────────────
  function fightTrainer(tid) {
    if (!needAlive()) return;
    var tr = ML.trainers[tid], rng = ML.state.rng(), g = ML.game;
    var foes = tr.team.map(function (t) { return ML.createMonster(t[0], t[1], rng, { traitTable: g.region >= 3 ? 'high' : 'low' }); });
    // "특성 보유 몬스터"를 쓰는 보스: 몬스터마다 금 이상 특성을 1개 보장
    if (tr.goodTraits) foes.forEach(function (m) {
      if (m.traits.some(function (t) { var gr = ML.traits[t].grade; return gr === 'gold' || gr === 'legend'; })) return;
      var golds = Object.keys(ML.traits).filter(function (t) { return ML.traits[t].grade === 'gold' && m.traits.indexOf(t) < 0; });
      m.traits[0] = rng.pick(golds);
    });
    foes.forEach(function (m) { ML.state.markSeen(m.species); });
    ML.state.saveRng(rng);
    startBattle(foes, { kind: 'trainer', trainer: tr, tid: tid, rng: rng });
  }

  // ── 전투 시작·끝 ──────────────────────────────────
  function startBattle(foes, o) {
    var g = ML.game;
    var alive = g.party.map(function (m, i) { return i; }).filter(function (i) { return g.party[i].hp > 0; });
    if (alive.length <= 1) return go(alive[0]);
    // 먼저 내보낼 몬스터 고르기(상대 선봉과의 상성 힌트)
    var foe = foes[0], fsp = ML.species[foe.species], t = o.trainer;
    var head = t ? '<div class="intro"><div class="t-icon">' + t.icon + '</div><h3>' + t.name + (t.boss ? ' <span class="boss-tag">지역 보스</span>' : '') + '</h3><p>“' + t.line + '”</p></div>'
      : '<h3>야생 ' + (foe.shiny ? '✨색다른 ' : '') + fsp.name + '이(가) 나타났다!</h3>';
    var list = alive.map(function (i) {
      var m = g.party[i], st = ML.calcStats(m), best = 0, worst = 0;
      m.moves.forEach(function (id) { var mv = ML.moves[id]; if (mv.kind === 'attack') best = Math.max(best, ML.typeMultiplier(mv.el, fsp.els)); });
      foe.moves.forEach(function (id) { var mv = ML.moves[id]; if (mv.kind === 'attack') worst = Math.max(worst, ML.typeMultiplier(mv.el, ML.species[m.species].els)); });
      var hint = (best > 1.01 ? '<span class="hint good">공격 유리</span> ' : best < 0.99 ? '<span class="hint bad">공격 불리</span> ' : '') +
        (worst > 1.01 ? '<span class="hint bad">약점 노출</span>' : worst < 0.99 ? '<span class="hint good">방어 유리</span>' : '');
      return '<button class="sw-item" data-lead="' + i + '">' + ML.art.svg(m.species, { size: 70, shiny: m.shiny }) +
        '<div><b>' + ML.species[m.species].name + '</b> Lv ' + m.level + '<br><span class="muted">' + m.hp + ' / ' + st.hp + (m.status ? ' · ' + ML.STATUS_NAMES[m.status] : '') + '</span><br>' + hint + '</div></button>';
    }).join('');
    var md = ui.modal(head + '<div class="lead-foe">' + ML.art.svg(foe.species, { size: 90, shiny: foe.shiny, flip: true }) + '<div><span class="muted small">' + (t ? '상대 선봉' : '상대') + '</span><br><b>' + fsp.name + '</b> Lv ' + foe.level + ' ' + ui.elChips(fsp.els) +
      (t ? '<div class="muted small">상대 ' + foes.length + '마리 · ' + foes.map(function (f) { return 'Lv ' + f.level; }).join(' / ') + '</div>' : '') + '</div></div>' +
      '<div class="section-t">먼저 내보낼 몬스터</div><div class="sw-list">' + list + '</div>', null, true);
    md.querySelectorAll('[data-lead]').forEach(function (b) { b.onclick = function () { ui.closeModal(); go(+b.dataset.lead); }; });

    function go(lead) {
      ML.app.battleMode();
      g.stats.battles++;
      ML.battleView.start(g.party, foes, {
        rng: o.rng, kind: o.kind, trainer: o.trainer, bag: true, lead: lead, skipIntro: alive.length > 1,
      onSave: function () { ML.state.saveRng(o.rng); ML.state.save(); ML.app.status(); },
      reward: function (r) { return reward(r, foes, o); },
      onFinish: function (r) { finish(r, o); },
      });
    }
  }

  // 결과 창에 보일 보상(여기서 실제로 지급)
  function reward(r, foes, o) {
    var g = ML.game, c = ML.config, h = '';
    if (r.captured) {
      var where = ML.state.addMon(r.captured);
      if (r.captured.shiny) g.dex.shiny = Object.assign(g.dex.shiny || {}, (function (o) { o[r.captured.species] = true; return o; })({}));
      g.stats.caught++;
      if (o.legend) { var pg = ML.state.prog(); pg.legendCaught = (+pg.legendCaught || 0) + 1; h += '<p class="lvup">✨ 전설의 몬스터를 손에 넣었다! (' + pg.legendCaught + '마리째)</p>'; }
      h += '<p>' + ML.species[r.captured.species].name + '은(는) ' + (where === 'party' ? '파티에 들어갔다!' : '파티가 가득 차서 보관함으로 보냈다.') + '</p>';
    }
    if (r.winner === 0 && !r.captured) {
      g.stats.wins++;
      var gold = o.trainer ? o.trainer.gold : foes[0].level * c.wildGold;
      g.gold += gold;
      h += '<p>💰 ' + gold + '골드를 얻었다!</p>';
      if (o.trainer) {
        var pr = ML.state.prog();
        pr.beaten[o.tid] = true;
        if (o.trainer.boss) pr.cleared = true;
      }
    }
    if (r.winner === 1) {
      var lost = Math.floor(g.gold * c.loseGoldPct);
      g.gold -= lost;
      h += '<p class="hint bad">눈앞이 캄캄해졌다… 💰 ' + lost + '골드를 잃고 연구소로 돌아간다.</p>';
    }
    return h;
  }

  function finish(r, o) {
    var g = ML.game;
    if (!r.escaped) ML.fusion.tick();      // 휴식·알 카운트(도망친 전투는 세지 않음)
    if (r.winner === 1) { ML.state.healAll(); g.at = 'hub'; }
    ML.state.save();
    if (r.winner === 0 && o.trainer && o.trainer.boss && !ML.regions[g.region + 1]) {
      g.ended = true; ML.state.save();
      return ending();
    }
    if (r.winner === 0 && o.trainer && o.trainer.boss) {
      var next = ML.regions[g.region + 1];
      var m = ui.modal('<div class="intro"><div class="t-icon">🏅</div><h3>' + region().name + ' 정복!</h3><p>' + o.trainer.name + '을(를) 이겼다.</p>' +
        '<p class="muted">' + (next ? (next.locked ? '다음 지역인 ' + next.name + '은(는) ' + next.locked + '.' : '지도에서 다음 지역 「' + next.name + '」에 갈 수 있다!' + (g.region === 1 ? ' 연구소에 합성소·부화장이 열렸다.' : '')) : '') + '</p>' +
        '<div class="row" style="justify-content:center"><button class="btn primary" data-close>좋아!</button></div></div>', function () { ML.app.show('map'); }, true);
      return;
    }
    ML.app.show(r.winner === 1 ? 'hub' : 'map');
  }
  // ── 엔딩: 4지역 보스를 이긴 뒤 ────────────────────
  function ending() {
    var g = ML.game, ids = Object.keys(ML.species);
    var caught = ids.filter(function (id) { return g.dex.caught[id]; }).length;
    var mons = g.party.concat(g.box), top = mons.reduce(function (a, m) { return m.level > a.level ? m : a; }, mons[0]);
    var mins = Math.round((g.playMs || 0) / 60000);
    ML.app.battleMode();
    screen.innerHTML = '<div class="ending"><div class="end-sky">' + g.party.map(function (m) { return ML.art.svg(m.species, { size: 170, shiny: m.shiny }); }).join('') + '</div>' +
      '<h1>🏆 네 지역을 모두 정복했다!</h1><p class="muted">햇살 들판에서 시작한 여행이 잿빛 화산령 정상에서 끝났다. 연구소의 기록이 한 권 완성되었다.</p>' +
      '<div class="end-stats">' + [
        ['잡은 종', caught + ' / ' + ids.length], ['만난 종', Object.keys(g.dex.seen).length], ['합성', (g.stats.fusions || 0) + '번'],
        ['전투', g.stats.battles + '번'], ['포획', g.stats.caught + '마리'], ['최고 레벨', top ? ML.species[top.species].name + ' Lv ' + top.level : '-'],
        ['색다른 개체', Object.keys(g.dex.shiny || {}).length + '종'], ['플레이 시간', mins >= 60 ? Math.floor(mins / 60) + '시간 ' + (mins % 60) + '분' : mins + '분'],
      ].map(function (r) { return '<div><span class="muted small">' + r[0] + '</span><b>' + r[1] + '</b></div>'; }).join('') + '</div>' +
      '<p class="muted">아직 끝이 아니다. 각 지역 보스 옆의 전설 장소, 그리고 전설 두 마리를 합성하면 태어난다는 숨겨진 몬스터가 기다린다.</p>' +
      '<button class="btn primary big" id="end-go">계속 여행하기</button></div>';
    ui.$('#end-go').onclick = function () { ML.app.show('map'); };
  }
})();
