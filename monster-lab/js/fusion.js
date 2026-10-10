// 합성소·부화장: 결과 종 결정, 특성 계승·돌연변이, 알, 부화
var ML = window.ML = window.ML || {};

(function () {
  var ui = ML.ui, screen = document.getElementById('screen');
  var C = function () { return ML.config.fusion; };

  // ── 규칙 ──────────────────────────────────────────
  function resultSpecies(a, b) {
    var sa = ML.species[a], sb = ML.species[b];
    if (sa.rarity === 'legend' && sb.rarity === 'legend') return 'primordial';
    for (var i = 0; i < ML.fusionTable.length; i++) {
      var t = ML.fusionTable[i];
      if ((t[0] === a && t[1] === b) || (t[0] === b && t[1] === a)) return t[2];
    }
    if (a === b) return a;
    // 부모 합성 값 평균에 가장 가까운 종(합성 전용·전설·숨겨진 제외, 같으면 값이 낮은 쪽)
    var avg = (sa.fusionValue + sb.fusionValue) / 2, best = null, bd = 1e9;
    Object.keys(ML.species).forEach(function (id) {
      var sp = ML.species[id];
      if (!sp.stage && sp.rarity !== 'rare') return;
      var d = Math.abs(sp.fusionValue - avg);
      if (d < bd || (d === bd && sp.fusionValue < ML.species[best].fusionValue)) { bd = d; best = id; }
    });
    return best;
  }

  function pool(a, b, noBad) {
    var p = [];
    a.traits.concat(b.traits).forEach(function (t) { if (p.indexOf(t) < 0 && !(noBad && ML.traits[t].grade === 'bad')) p.push(t); });
    return p;
  }

  function hatchLevel(a, b) { return Math.max(C().hatchMinLevel, Math.ceil((a.level + b.level) / 4)); }

  function create(a, b, aids) {
    var g = ML.game, c = C();
    var egg = {
      id: 'e' + Date.now().toString(36),
      species: resultSpecies(a.species, b.species),
      level: hatchLevel(a, b),
      pool: pool(a, b, aids.purewater),
      parentTraits: pool(a, b, false),
      ivs: {}, moves: [],
      shinyBoth: a.shiny && b.shiny,
      aids: aids, left: c.hatchBattles,
      parents: [a.species, b.species],
    };
    ['hp', 'atk', 'def', 'spd'].forEach(function (k) { egg.ivs[k] = (a.ivs[k] + b.ivs[k]) / 2; });
    a.moves.concat(b.moves).forEach(function (m) { if (egg.moves.indexOf(m) < 0) egg.moves.push(m); });
    ML.state.takeItem('fusionstone');
    ['charm', 'catalyst', 'purewater'].forEach(function (k) { if (aids[k]) ML.state.takeItem(k); });
    // 부모는 휴식: 파티에 있으면 보관함으로
    [a, b].forEach(function (m) {
      m.rest = c.restBattles;
      var i = g.party.indexOf(m);
      if (i >= 0) { g.party.splice(i, 1); g.box.push(m); }
    });
    g.eggs.push(egg);
    g.stats.fusions = (g.stats.fusions || 0) + 1;
    ML.state.save();
    return egg;
  }

  function hatch(egg) {
    var c = C(), rng = ML.state.rng(), r = ML.config.ivRange;
    var shiny = rng.chance(egg.shinyBoth ? c.shinyBothParents : ML.config.shinyChance);
    var mon = ML.createMonster(egg.species, egg.level, rng, { shiny: shiny, traits: [] });
    ['hp', 'atk', 'def', 'spd'].forEach(function (k) {
      var v = egg.ivs[k] * (1 + rng.range(-c.ivSpread, c.ivSpread));
      mon.ivs[k] = Math.round(Math.max(1 - r, Math.min(1 + r, v)) * 1000) / 1000;
    });
    // 특성: 부모 풀에서 n개 + 나머지는 새 특성 → 항상 3개, 돌연변이면 1개 더
    var table = egg.aids.charm ? c.inheritCharm : c.inherit;
    var n = Math.min(+rng.weighted(table), egg.pool.length, ML.config.traits.slots);
    var p = egg.pool.slice(), traits = [];
    for (var i = 0; i < n; i++) traits.push(p.splice(Math.floor(rng() * p.length), 1)[0]);
    var inherited = traits.length;
    // 새 특성은 부모 특성과 겹치지 않게(계승한 것과 새로 생긴 것이 구분되도록)
    traits = traits.concat(ML.rollTraits(rng, 'low', ML.config.traits.slots - traits.length, traits.concat(egg.parentTraits), egg.aids.purewater));
    var mutated = null;
    if (rng.chance(egg.aids.catalyst ? c.mutationCatalyst : c.mutation)) {
      mutated = ML.rollTraits(rng, 'mutation', 1, traits.concat(egg.parentTraits), egg.aids.purewater)[0] || null;
      if (mutated) traits.push(mutated);
    }
    mon.traits = traits.slice(0, ML.config.traits.maxSlots);
    // 기술 1개 계승(30%)
    var inheritMove = null;
    if (rng.chance(c.moveInherit)) {
      var cand = egg.moves.filter(function (m) { return mon.moves.indexOf(m) < 0; });
      if (cand.length) {
        inheritMove = rng.pick(cand);
        if (mon.moves.length < 4) mon.moves.push(inheritMove);
        else mon.moves[rng.int(0, 3)] = inheritMove;
      }
    }
    mon.hp = ML.calcStats(mon).hp;
    ML.state.saveRng(rng);
    var g = ML.game;
    g.eggs.splice(g.eggs.indexOf(egg), 1);
    var where = ML.state.addMon(mon);
    if (mon.shiny) { g.dex.shiny = g.dex.shiny || {}; g.dex.shiny[mon.species] = true; }
    ML.state.save();
    return { mon: mon, where: where, inherited: inherited, mutated: mutated, inheritMove: inheritMove };
  }

  // 전투가 하나 끝날 때(도망 제외): 휴식·부화 카운트
  function tick() {
    var g = ML.game;
    g.party.concat(g.box).forEach(function (m) { if (m.rest > 0) m.rest--; });
    (g.eggs || []).forEach(function (e) { if (e.left > 0) e.left--; });
  }

  ML.fusion = { resultSpecies: resultSpecies, pool: pool, create: create, hatch: hatch, tick: tick, renderLab: renderLab, renderHatch: renderHatch };

  // ── 합성소 화면 ───────────────────────────────────
  var pick = { a: null, b: null, aids: {} };

  function allMons() { return ML.game.party.concat(ML.game.box); }
  function byUid(uid) { return allMons().filter(function (m) { return m.uid === uid; })[0] || null; }
  function head(title) {
    return '<div class="sub-head"><button class="btn" id="to-hub">← 연구소</button><h2>' + title + '</h2><span class="gold">💰 ' + ML.game.gold + '</span></div>';
  }
  function speciesName(id) {
    var sp = ML.species[id];
    return sp.rarity === 'hidden' && !ML.game.dex.caught[id] ? '???' : sp.name;
  }

  function slot(key) {
    var m = pick[key] && byUid(pick[key]);
    return '<button class="f-slot" data-slot="' + key + '">' + (m ? ML.art.svg(m.species, { size: 110, shiny: m.shiny }) +
      '<b>' + ML.species[m.species].name + '</b><span class="small">Lv ' + m.level + ' · 합성 값 ' + ML.species[m.species].fusionValue + '</span>' + ui.traitChips(m.traits)
      : '<span class="q">＋</span><span class="muted">부모 고르기</span>') + '</button>';
  }

  function renderLab() {
    var g = ML.game, c = C();
    var a = pick.a && byUid(pick.a), b = pick.b && byUid(pick.b);
    if (a && a.rest > 0) { pick.a = null; a = null; }
    if (b && b.rest > 0) { pick.b = null; b = null; }
    var stone = ML.state.item('fusionstone'), full = g.eggs.length >= c.maxEggs;
    var aids = ['charm', 'catalyst', 'purewater'].map(function (k) {
      var it = ML.items[k], have = ML.state.item(k);
      if (!have) pick.aids[k] = false;
      return '<button class="aid' + (pick.aids[k] ? ' on' : '') + '" data-aid="' + k + '"' + (have ? '' : ' disabled') + '>' + it.icon + ' ' + it.name + ' ×' + have + '<br><span class="muted small">' + it.desc + '</span></button>';
    }).join('');
    var prev = '<p class="muted">부모 2마리를 고르면 결과를 미리 볼 수 있다.</p>';
    if (a && b) {
      var res = resultSpecies(a.species, b.species), sp = ML.species[res], pl = pool(a, b, pick.aids.purewater);
      var table = pick.aids.charm ? c.inheritCharm : c.inherit;
      var special = ML.fusionTable.some(function (t) { return t[2] === res; }) || res === 'primordial';
      prev = '<div class="f-result">' + (res === 'primordial' && !g.dex.caught[res] ? '<div class="q big">?</div>' : ML.art.svg(res, { size: 130 })) +
        '<div><div class="small muted">예상 결과' + (special ? ' — ✨특수 조합' : a.species === b.species ? ' — 같은 종' : ' — 합성 값 평균 ' + ((ML.species[a.species].fusionValue + ML.species[b.species].fusionValue) / 2)) + '</div>' +
        '<h3>' + speciesName(res) + '</h3>' + ui.elChips(sp.els) + '<div class="small">부화 Lv ' + hatchLevel(a, b) + ' · 전투 ' + c.hatchBattles + '번 뒤 부화</div></div></div>' +
        '<div class="section-t">계승 가능한 특성 풀 (' + pl.length + '개) — 실제 특성은 부화 때 공개</div>' + (pl.length ? ui.traitChips(pl) : '<p class="muted small">없음</p>') +
        '<div class="small muted" style="margin-top:6px">풀에서 물려받는 개수: ' + Object.keys(table).map(function (k) { return k + '개 ' + table[k] + '%'; }).join(' · ') +
        ' (나머지 칸은 새 특성) · 돌연변이 ' + Math.round((pick.aids.catalyst ? c.mutationCatalyst : c.mutation) * 100) + '% · 기술 1개 계승 ' + Math.round(c.moveInherit * 100) + '%' +
        (pick.aids.purewater ? ' · 나쁜 특성 없음' : '') + '</div>';
    }
    var why = !a || !b ? '부모 2마리를 고르세요' : !stone ? '합성석이 없다(상점에서 150골드)' : full ? '알이 가득 찼다(부화장 ' + c.maxEggs + '칸)' : '';
    screen.innerHTML = head('🧬 합성소') + '<div class="fusion"><div class="f-parents">' + slot('a') + '<span class="plus">＋</span>' + slot('b') + '</div>' +
      '<div class="f-side"><div class="section-t">보조 아이템 (선택)</div><div class="aids">' + aids + '</div>' + prev +
      '<div class="row" style="margin-top:12px;justify-content:space-between"><span class="small">💠 합성석 ' + stone + '개 필요 1 · 부모는 전투 ' + c.restBattles + '번 동안 쉰다</span>' +
      '<button class="btn primary big" id="fuse"' + (why ? ' disabled' : '') + '>🧬 합성하기</button></div>' + (why ? '<p class="hint bad">' + why + '</p>' : '') + '</div></div>';
    ui.$('#to-hub').onclick = function () { ML.hub.render(); };
    screen.querySelectorAll('[data-slot]').forEach(function (s) { s.onclick = function () { choose(s.dataset.slot); }; });
    screen.querySelectorAll('[data-aid]').forEach(function (s) { s.onclick = function () { pick.aids[s.dataset.aid] = !pick.aids[s.dataset.aid]; renderLab(); }; });
    ui.$('#fuse').onclick = function () {
      var aidsUsed = { charm: !!pick.aids.charm, catalyst: !!pick.aids.catalyst, purewater: !!pick.aids.purewater };
      var others = g.party.filter(function (m) { return m !== a && m !== b; });
      if (!others.length && !g.box.some(function (m) { return m !== a && m !== b && !(m.rest > 0); })) { ui.toast('파티에 남을 몬스터가 없다!'); return; }
      var egg = create(a, b, aidsUsed);
      // 파티가 비면 보관함에서 쉬지 않는 몬스터를 데려온다
      if (!g.party.length) { var i = g.box.findIndex(function (m) { return !(m.rest > 0); }); g.party.push(g.box.splice(i, 1)[0]); ML.state.save(); }
      pick = { a: null, b: null, aids: {} };
      ui.modal('<div class="intro"><div class="egg-big">' + eggSvg(egg, 150) + '</div><h3>알이 생겼다!</h3><p class="muted">전투 ' + egg.left + '번 뒤 부화장에서 깨어난다. 부모는 보관함에서 쉬고 있다.</p>' +
        '<div class="row" style="justify-content:center"><button class="btn primary" data-close>좋아!</button></div></div>', function () { renderLab(); });
    };
  }

  function choose(key) {
    var other = pick[key === 'a' ? 'b' : 'a'];
    var list = allMons().filter(function (m) { return m.uid !== other; });
    var m = ui.modal('<h3>부모 고르기</h3><div class="tile-grid">' + list.map(function (mon) {
      var rest = mon.rest > 0;
      return '<button class="mon-tile" data-uid="' + mon.uid + '"' + (rest ? ' disabled' : '') + '>' + ML.art.svg(mon.species, { size: 70, shiny: mon.shiny }) +
        '<b>' + ML.species[mon.species].name + '</b><span class="small">Lv ' + mon.level + ' · 값 ' + ML.species[mon.species].fusionValue + '</span>' +
        (rest ? '<span class="hint bad">휴식 ' + mon.rest + '</span>' : '') + '</button>';
    }).join('') + '</div><div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn" data-close>취소</button></div>');
    m.querySelectorAll('[data-uid]').forEach(function (b) {
      b.onclick = function () { pick[key] = b.dataset.uid; ui.closeModal(); renderLab(); };
    });
  }

  // 알 그림: 결과 종의 첫 속성 색 무늬(종은 숨김)
  function eggSvg(egg, size) {
    var e = ML.elements.info[ML.species[egg.species].els[0]];
    return '<svg viewBox="0 0 100 120" width="' + size + '" height="' + size * 1.2 + '"><ellipse cx="50" cy="66" rx="38" ry="48" fill="#f4ecd8" stroke="#8c7f66" stroke-width="3"/>' +
      '<path d="M18 60 q8 -10 16 0 t16 0 t16 0 t16 0" fill="none" stroke="' + e.main + '" stroke-width="6" stroke-linecap="round"/>' +
      '<circle cx="36" cy="90" r="6" fill="' + e.light + '"/><circle cx="62" cy="38" r="5" fill="' + e.light + '"/></svg>';
  }

  // ── 부화장 화면 ───────────────────────────────────
  function renderHatch() {
    var g = ML.game;
    screen.innerHTML = head('🥚 부화장') + '<p class="muted">알은 전투(야생·트레이너, 도망 제외)가 끝날 때마다 1씩 자란다. 최대 ' + C().maxEggs + '개.</p>' +
      (g.eggs.length ? '<div class="egg-grid">' + g.eggs.map(function (e, i) {
        return '<div class="egg-card' + (e.left ? '' : ' ready') + '">' + eggSvg(e, 90) + '<div class="small">' + (e.left ? '부화까지 전투 ' + e.left + '번' : '곧 깨어날 것 같다!') + '</div>' +
          '<div class="muted small">부모: ' + e.parents.map(function (p) { return ML.species[p].name; }).join(' + ') + '</div>' +
          (e.left ? '' : '<button class="btn primary" data-hatch="' + i + '">🐣 부화시키기</button>') + '</div>';
      }).join('') + '</div>' : '<p>알이 없다. 합성소에서 합성하면 알이 생긴다.</p>');
    ui.$('#to-hub').onclick = function () { ML.hub.render(); };
    screen.querySelectorAll('[data-hatch]').forEach(function (b) {
      b.onclick = function () { hatchScene(g.eggs[+b.dataset.hatch]); };
    });
  }

  function hatchScene(egg) {
    var m = ui.modal('<div class="intro"><div class="egg-big hatching" id="hs">' + eggSvg(egg, 150) + '</div><p id="ht">알이 흔들린다…!</p>' +
      '<div class="row" style="justify-content:center"><button class="btn primary" id="h-ok" disabled>…</button></div></div>', null, true);
    setTimeout(function () {
      var r = hatch(egg), mon = r.mon, sp = ML.species[mon.species];
      var box = m.querySelector('#hs');
      box.classList.remove('hatching'); box.classList.add('hatched');
      box.innerHTML = ML.art.svg(mon.species, { size: 180, shiny: mon.shiny });
      m.querySelector('#ht').innerHTML = ML.josa('<b>' + (mon.shiny ? '✨색다른 ' : '') + sp.name + '이(가) 태어났다!</b> Lv ' + mon.level) +
        '<div style="margin:8px 0">' + ui.traitChips(mon.traits) + '</div><div class="small muted">부모 특성 ' + r.inherited + '개 계승' +
        (r.mutated ? ' · <span class="lvup">돌연변이: ' + ML.traits[r.mutated].name + '</span>' : '') +
        (r.inheritMove ? ' · 기술 계승: ' + ML.moves[r.inheritMove].name : '') + ' · ' + (r.where === 'party' ? '파티로' : '보관함으로') + '</div>';
      var ok = m.querySelector('#h-ok'); ok.disabled = false; ok.textContent = '확인';
      ok.onclick = function () { ui.closeModal(); renderHatch(); };
    }, 1800);
  }
})();
