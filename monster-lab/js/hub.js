// 거점(연구소): 회복소·상점·보관함 + 파티·가방 화면 + 몬스터 상세
var ML = window.ML = window.ML || {};

(function () {
  var ui = ML.ui, screen = document.getElementById('screen');

  ML.hub = { render: render, renderParty: renderParty, renderBag: renderBag, monDetail: monDetail };

  // ── 거점 첫 화면 ──────────────────────────────────
  function render() {
    var g = ML.game;
    if (g.at !== 'hub') {
      screen.innerHTML = '<div class="hub-away"><h2>🏠 연구소</h2><p>지금은 <b>' + ML.regions[g.region].places[g.at].name + '</b>에 있다.</p>' +
        '<p class="muted">회복소·상점·보관함은 연구소에서만 쓸 수 있다.</p><button class="btn primary big" id="back">🏠 연구소로 돌아가기</button></div>';
      ui.$('#back').onclick = function () { g.at = 'hub'; ML.state.save(); ML.app.status(); render(); };
      return;
    }
    var open2 = ML.state.unlocked(2);
    var fac = [
      ['heal', '🏥', '회복소', '파티와 보관함의 몬스터를 모두 무료로 회복'],
      ['shop', '🛒', '상점', '포획구·회복약·합성석'],
      ['box', '📦', '보관함', '파티 ' + g.party.length + ' · 보관 ' + g.box.length + '마리'],
      ['dex', '📖', '도감', '잡은 종 ' + Object.keys(g.dex.caught).length + ' / 본 종 ' + Object.keys(g.dex.seen).length],
      ['fusion', '🧬', '합성소', open2 ? '몬스터 2마리 + 합성석 → 알' : '1지역 보스를 이기면 열린다', !open2],
      ['hatch', '🥚', '부화장', open2 ? '알 ' + g.eggs.length + ' / ' + ML.config.fusion.maxEggs + (g.eggs.some(function (e) { return !e.left; }) ? ' · 부화 준비!' : '') : '1지역 보스를 이기면 열린다', !open2],
    ];
    screen.innerHTML = '<div class="hub"><div class="hub-head"><h2>🏠 연구소</h2><div class="row">' + (g.ended ? '<button class="btn" id="end-again">🏆 엔딩 다시 보기</button>' : '') + '<button class="btn primary big" id="go-map">🗺️ 지도로 나가기</button></div></div>' +
      '<div class="fac-grid">' + fac.map(function (f) {
        return '<button class="fac' + (f[4] ? ' locked' : '') + '" data-fac="' + f[0] + '"><span class="fi">' + (f[4] ? '🔒' : f[1]) + '</span><b>' + f[2] + '</b><span class="muted small">' + f[3] + '</span></button>';
      }).join('') + '</div></div>';
    ui.$('#go-map').onclick = function () { ML.app.show('map'); };
    if (ui.$('#end-again')) ui.$('#end-again').onclick = function () { ML.explore.ending(); };
    screen.querySelectorAll('[data-fac]').forEach(function (b) {
      b.onclick = function () {
        var f = b.dataset.fac;
        if (f === 'heal') heal();
        else if (f === 'shop') renderShop();
        else if (f === 'box') renderBox();
        else if (f === 'dex') ML.app.show('dex');
        else if (!open2) ui.toast('1지역 보스를 이기면 열린다.');
        else if (f === 'fusion') ML.fusion.renderLab();
        else ML.fusion.renderHatch();
      };
    });
  }

  function heal() {
    ML.state.healAll();
    ML.state.save();
    ui.modal('<div class="intro"><div class="t-icon">🏥</div><h3>모두 건강해졌다!</h3><div class="row" style="justify-content:center">' +
      ML.game.party.map(function (m) { return ML.art.svg(m.species, { size: 80, shiny: m.shiny }); }).join('') +
      '</div><div class="row" style="justify-content:center"><button class="btn primary" data-close>고마워요</button></div></div>');
  }

  function backBar(title) {
    return '<div class="sub-head"><button class="btn" id="to-hub">← 연구소</button><h2>' + title + '</h2><span class="gold">💰 ' + ML.game.gold + '</span></div>';
  }

  // ── 상점 ──────────────────────────────────────────
  function renderShop() {
    var g = ML.game;
    screen.innerHTML = backBar('🛒 상점') + '<div class="shop">' + ML.shopList.filter(function (id) { return !ML.items[id].unlock || ML.state.unlocked(ML.items[id].unlock); }).map(function (id) {
      var it = ML.items[id];
      return '<div class="shop-item"><span class="bi">' + it.icon + '</span><div class="si-body"><b>' + it.name + '</b> <span class="muted small">보유 ' + ML.state.item(id) + '</span>' +
        '<div class="muted small">' + it.desc + '</div></div><div class="si-buy"><span class="price">💰 ' + it.price + '</span>' +
        '<button class="btn sm" data-buy="' + id + ':1"' + (g.gold < it.price ? ' disabled' : '') + '>1개</button>' +
        '<button class="btn sm" data-buy="' + id + ':5"' + (g.gold < it.price * 5 ? ' disabled' : '') + '>5개</button></div></div>';
    }).join('') + '</div>';
    ui.$('#to-hub').onclick = render;
    screen.querySelectorAll('[data-buy]').forEach(function (b) {
      b.onclick = function () {
        var p = b.dataset.buy.split(':'), it = ML.items[p[0]], n = +p[1];
        if (g.gold < it.price * n) return;
        g.gold -= it.price * n; ML.state.addItem(p[0], n); ML.state.save(); ML.app.status();
        ui.toast(it.name + ' ' + n + '개를 샀다!');
        var top = screen.scrollTop; renderShop(); screen.scrollTop = top;
      };
    });
  }

  // ── 보관함 ────────────────────────────────────────
  var boxSort = 'got', boxTrait = '', boxNoBad = false;
  function sortedBox() {
    var list = ML.game.box.filter(function (m) {
      if (boxTrait && m.traits.indexOf(boxTrait) < 0) return false;
      if (boxNoBad && m.traits.some(function (t) { return ML.traits[t].grade === 'bad'; })) return false;
      return true;
    });
    var key = {
      got: null,
      el: function (m) { return ML.elements.order.indexOf(ML.species[m.species].els[0]) * 1000 - m.level; },
      sp: function (m) { return Object.keys(ML.species).indexOf(m.species) * 1000 - m.level; },
      lv: function (m) { return -m.level; },
    }[boxSort];
    if (key) list.sort(function (a, b) { return key(a) - key(b); });
    return list;
  }

  function monTile(m, where) {
    var st = ML.calcStats(m);
    return '<button class="mon-tile' + (m.hp <= 0 ? ' down' : '') + '" data-mon="' + m.uid + '" data-where="' + where + '">' +
      ML.art.svg(m.species, { size: 74, shiny: m.shiny }) + '<b>' + (m.shiny ? '✨' : '') + ML.species[m.species].name + '</b><span class="small">Lv ' + m.level + '</span>' +
      '<div class="mini"><i style="width:' + (m.hp / st.hp * 100) + '%"></i></div>' + (m.rest > 0 ? '<span class="hint bad small">휴식 ' + m.rest + '</span>' : '') +
      '<div class="tile-traits">' + m.traits.map(function (t) { var gr = ML.traits[t].grade; return '<i class="tdot ' + gr + '" style="--c:' + (ML.traitGrades[gr].color === 'rainbow' ? '#fff' : ML.traitGrades[gr].color) + '"></i>'; }).join('') + '</div></button>';
  }

  function renderBox() {
    var g = ML.game;
    screen.innerHTML = backBar('📦 보관함') +
      '<div class="section-t">파티 (' + g.party.length + ' / ' + ML.config.partyMax + ') — 몬스터를 누르면 옮기거나 순서를 바꿀 수 있다</div>' +
      '<div class="tile-grid">' + g.party.map(function (m) { return monTile(m, 'party'); }).join('') + '</div>' +
      '<div class="section-t row" style="justify-content:space-between">보관함 (' + g.box.length + '마리)' +
      '<div class="row"><select id="tfilter"><option value="">특성: 전체</option>' + ['legend', 'gold', 'silver', 'bronze', 'bad'].map(function (gr) {
        return '<optgroup label="' + ML.traitGrades[gr].name + '">' + Object.keys(ML.traits).filter(function (t) { return ML.traits[t].grade === gr; }).map(function (t) {
          return '<option value="' + t + '">' + ML.traits[t].name + '</option>';
        }).join('') + '</optgroup>';
      }).join('') + '</select><button class="btn sm' + (boxNoBad ? ' primary' : '') + '" id="nobad">나쁜 특성 없는 것만</button>' +
      '<select id="sort"><option value="got">잡은 순서</option><option value="el">속성</option><option value="sp">종</option><option value="lv">레벨</option></select></div></div>' +
      (function () {
        if (!g.box.length) return '<p class="muted">비어 있다. 파티가 가득 찬 상태에서 잡으면 여기로 온다.</p>';
        var list = sortedBox();
        return list.length ? '<div class="tile-grid">' + list.map(function (m) { return monTile(m, 'box'); }).join('') + '</div>' : '<p class="muted">조건에 맞는 몬스터가 없다.</p>';
      })();
    ui.$('#to-hub').onclick = render;
    ui.$('#sort').value = boxSort;
    ui.$('#sort').onchange = function () { boxSort = this.value; renderBox(); };
    ui.$('#tfilter').value = boxTrait;
    ui.$('#tfilter').onchange = function () { boxTrait = this.value; renderBox(); };
    ui.$('#nobad').onclick = function () { boxNoBad = !boxNoBad; renderBox(); };
    screen.querySelectorAll('[data-mon]').forEach(function (b) {
      b.onclick = function () { boxActions(b.dataset.mon, b.dataset.where); };
    });
  }

  function findMon(uid) {
    var g = ML.game, i = g.party.findIndex(function (m) { return m.uid === uid; });
    if (i >= 0) return { list: g.party, i: i, mon: g.party[i] };
    i = g.box.findIndex(function (m) { return m.uid === uid; });
    return i >= 0 ? { list: g.box, i: i, mon: g.box[i] } : null;
  }

  function boxActions(uid, where) {
    var g = ML.game, f = findMon(uid), acts = [];
    if (where === 'party') {
      if (f.i > 0) acts.push(['lead', '🚩 선두로']);
      if (g.party.length > 1) acts.push(['tobox', '📦 보관함으로']);
    } else {
      acts.push(['toparty', g.party.length < ML.config.partyMax ? '👥 파티에 넣기' : '👥 파티와 바꾸기']);
      acts.push(['release', '🍃 놓아주기']);
    }
    monDetail(f.mon, acts, function (act) {
      if (act === 'lead') { g.party.splice(f.i, 1); g.party.unshift(f.mon); }
      if (act === 'tobox') { g.party.splice(f.i, 1); g.box.push(f.mon); }
      if (act === 'toparty') {
        if (f.mon.rest > 0) { ui.toast('합성 뒤 쉬는 중이다. 전투 ' + f.mon.rest + '번 뒤에 파티에 넣을 수 있다.'); return; }
        if (g.party.length < ML.config.partyMax) { g.box.splice(f.i, 1); g.party.push(f.mon); }
        else return swapPick(f);
      }
      if (act === 'release') {
        var m = ui.modal('<h3>정말 ' + ML.species[f.mon.species].name + '을(를) 놓아줄까?</h3><p class="muted">되돌릴 수 없다.</p>' +
          '<div class="row" style="justify-content:flex-end"><button class="btn" data-close>그만두기</button><button class="btn danger" id="rel-ok">놓아주기</button></div>');
        m.querySelector('#rel-ok').onclick = function () {
          g.box.splice(f.i, 1); ML.state.save(); ui.closeModal(); ui.toast('잘 지내!'); renderBox();
        };
        return;
      }
      ML.state.save(); ui.closeModal(); renderBox();
    });
  }

  // 파티가 가득 찼을 때: 누구와 바꿀지
  function swapPick(f) {
    var g = ML.game;
    var m = ui.modal('<h3>누구와 바꿀까?</h3><div class="tile-grid">' + g.party.map(function (p) { return monTile(p, 'swap'); }).join('') +
      '</div><div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn" data-close>취소</button></div>');
    m.querySelectorAll('[data-mon]').forEach(function (b) {
      b.onclick = function () {
        var pi = g.party.findIndex(function (p) { return p.uid === b.dataset.mon; });
        var out = g.party[pi];
        g.party[pi] = f.mon; g.box[f.i] = out;
        ML.state.save(); ui.closeModal(); renderBox();
      };
    });
  }

  // ── 몬스터 상세 ───────────────────────────────────
  // actions: [[id, 라벨]…] · onAct(id)
  function monDetail(m, actions, onAct) {
    var sp = ML.species[m.species], st = ML.calcStats(m), ab = ML.abilities[sp.ability], need = ML.expToNext(m.level), ev = sp.evolve;
    var h = '<div class="detail"><div>' + ML.art.svg(m.species, { size: 220, shiny: m.shiny }) + '</div><div>' +
      '<h3>' + (m.shiny ? '✨' : '') + sp.name + ' <span class="muted">Lv ' + m.level + '</span></h3><div class="row">' + ui.elChips(sp.els) + '<span class="muted">' + ui.stageLabel(sp) + ' · 합성 값 ' + sp.fusionValue + '</span></div>' +
      '<div class="section-t">체력 ' + m.hp + ' / ' + st.hp + (m.status ? ' · ' + ML.STATUS_NAMES[m.status] : '') + '</div>' +
      '<div class="small muted">공격 ' + st.atk + ' · 방어 ' + st.def + ' · 속도 ' + st.spd + '</div>' +
      '<div class="small muted">경험치 ' + m.exp + ' / ' + need + (ev ? ' · Lv' + ev[1] + '에 ' + ML.species[ev[0]].name + '(으)로 진화' : '') + '</div>' +
      '<div class="section-t">고유 능력 — ' + ab.name + '</div><div class="muted small">' + ab.desc + '</div>' +
      '<div class="section-t">특성</div>' + m.traits.map(function (t) { return '<div class="trait-line">' + ui.traitChip(t) + ' <span class="muted small">' + ML.traits[t].desc + '</span></div>'; }).join('') +
      '<div class="section-t">기술</div><div class="learn">' + m.moves.map(function (id) {
        var mv = ML.moves[id];
        return '<div style="--c:' + ML.elements.info[mv.el].main + '"><b>' + mv.name + '</b><br><span class="muted">' + ML.elements.info[mv.el].icon + ' ' + (mv.kind === 'attack' ? '위력 ' + mv.power : '변화') + ' · 명중 ' + mv.acc + '</span></div>';
      }).join('') + '</div></div></div>' +
      '<div class="row" style="justify-content:flex-end;margin-top:14px">' + (actions || []).map(function (a) { return '<button class="btn" data-act="' + a[0] + '">' + a[1] + '</button>'; }).join('') +
      '<button class="btn primary" data-close>닫기</button></div>';
    var md = ui.modal(h);
    md.querySelectorAll('[data-act]').forEach(function (b) { b.onclick = function () { onAct(b.dataset.act); }; });
  }

  // ── 파티 탭 ───────────────────────────────────────
  function renderParty() {
    var g = ML.game;
    screen.innerHTML = '<div class="sub-head"><h2>👥 파티</h2><span class="muted small">🚩 첫 번째 몬스터가 먼저 나간다. 몬스터를 누르면 자세히 볼 수 있다.</span></div>' +
      '<div class="party-list">' + g.party.map(function (m, i) {
        var st = ML.calcStats(m), sp = ML.species[m.species], need = ML.expToNext(m.level);
        return '<button class="tm pl" data-i="' + i + '">' + ML.art.svg(m.species, { size: 96, shiny: m.shiny }) +
          '<div class="tm-body"><div class="row" style="gap:6px"><b>' + (i === 0 ? '🚩 ' : '') + (m.shiny ? '✨' : '') + sp.name + '</b><span>Lv ' + m.level + '</span>' + ui.elChips(sp.els) +
          (m.status ? '<span class="badge st-' + m.status + '">' + ML.STATUS_NAMES[m.status] + '</span>' : '') + (m.hp <= 0 ? '<span class="hint bad">기절</span>' : '') + '</div>' +
          '<div class="hp"><i class="' + (m.hp / st.hp <= 0.25 ? 'low' : m.hp / st.hp <= 0.5 ? 'mid' : '') + '" style="width:' + (m.hp / st.hp * 100) + '%"></i></div>' +
          '<div class="small muted">체력 ' + m.hp + ' / ' + st.hp + ' · 경험치 ' + m.exp + ' / ' + need + '</div>' +
          '<div class="small">' + m.moves.map(function (x) { return ML.moves[x].name; }).join(', ') + '</div>' + ui.traitChips(m.traits) + '</div></button>';
      }).join('') + '</div>' + (g.box.length ? '<p class="muted small">파티를 바꾸려면 연구소 → 보관함.</p>' : '');
    screen.querySelectorAll('[data-i]').forEach(function (b) {
      b.onclick = function (e) {
        if (e.target.closest('[data-trait]')) return;
        var i = +b.dataset.i, m = g.party[i], acts = i > 0 ? [['lead', '🚩 선두로']] : [];
        monDetail(m, acts, function (act) {
          if (act === 'lead') { g.party.splice(i, 1); g.party.unshift(m); ML.state.save(); ui.closeModal(); renderParty(); }
        });
      };
    });
  }

  // ── 가방 탭 ───────────────────────────────────────
  function renderBag() {
    var g = ML.game, ids = Object.keys(g.items).filter(function (id) { return ML.items[id] && g.items[id] > 0; });
    var kinds = [['heal', '회복'], ['ball', '포획 도구'], ['fusion', '합성']];
    screen.innerHTML = '<div class="sub-head"><h2>🎒 가방</h2><span class="gold">💰 ' + g.gold + '</span></div>' +
      kinds.map(function (k) {
        var list = ids.filter(function (id) { return ML.items[id].kind === k[0]; });
        if (!list.length) return '';
        return '<div class="section-t">' + k[1] + '</div><div class="bag-grid">' + list.map(function (id) {
          var it = ML.items[id];
          return '<button class="bag-item" data-item="' + id + '"><span class="bi">' + it.icon + '</span><div><b>' + it.name + '</b> ×' + g.items[id] +
            '<br><span class="muted small">' + it.desc + (it.kind === 'heal' ? ' · 눌러서 사용' : it.kind === 'ball' ? ' · 야생 전투에서 사용' : '') + '</span></div></button>';
        }).join('') + '</div>';
      }).join('') + (ids.length ? '' : '<p class="muted">가방이 비어 있다. 연구소 상점에서 살 수 있다.</p>');
    screen.querySelectorAll('[data-item]').forEach(function (b) {
      b.onclick = function () { if (ML.items[b.dataset.item].kind === 'heal') useOutside(b.dataset.item); };
    });
  }

  // 전투 밖에서 회복 아이템 쓰기(기절한 몬스터에게는 못 씀)
  function useOutside(id) {
    var g = ML.game, it = ML.items[id];
    var m = ui.modal('<h3>' + it.icon + ' ' + it.name + '을(를) 누구에게?</h3><div class="sw-list">' + g.party.map(function (p, i) {
      var st = ML.calcStats(p);
      return '<button class="sw-item" data-i="' + i + '"' + (p.hp <= 0 ? ' disabled' : '') + '>' + ML.art.svg(p.species, { size: 64, shiny: p.shiny }) +
        '<div><b>' + ML.species[p.species].name + '</b> Lv ' + p.level + '<br><span class="muted">' + p.hp + ' / ' + st.hp + (p.status ? ' · ' + ML.STATUS_NAMES[p.status] : '') + (p.hp <= 0 ? ' · 기절(회복소에서만 회복)' : '') + '</span></div></button>';
    }).join('') + '</div><div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn" data-close>취소</button></div>');
    m.querySelectorAll('[data-i]').forEach(function (b) {
      b.onclick = function () {
        var p = g.party[+b.dataset.i], st = ML.calcStats(p), fx = it.fx, boost = 1 + ML.traitSum(p, 'itemHeal');
        if ((fx.heal || fx.healPct) && p.hp >= st.hp) { ui.toast('체력이 가득하다.'); return; }
        if (fx.cure && !p.status) { ui.toast('상태 이상이 없다.'); return; }
        if (fx.heal || fx.healPct) p.hp = Math.min(st.hp, p.hp + Math.round((fx.heal || st.hp * fx.healPct) * boost));
        if (fx.cure) p.status = null;
        ML.state.takeItem(id); ML.state.save(); ui.closeModal();
        ui.toast(ML.species[p.species].name + '이(가) 회복했다!');
        renderBag();
      };
    });
  }
})();
