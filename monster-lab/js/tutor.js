// 기술 교습소 [제안]: 골드를 내고 기술을 가르친다.
// 배울 수 있는 기술 = 몬스터 속성과 같은 속성의 기술만(요청). 교습 전용 최강기·궁극기 포함, 자기 종 배움표의 기술은 싸게 떠올리기.
// 다른 종의 고유기는 못 배운다. 근원 속성(태초수·무한신룡)은 근원 기술만.
// 목록은 공격 기술 / 유틸(변화) 기술로 나눠 보여 준다.
var ML = window.ML = window.ML || {};

(function () {
  var ui = ML.ui, screen = document.getElementById('screen');
  var pick = null;   // 고른 몬스터 uid

  function own(m) { return ML.learnsetOf(m.species).filter(function (e) { return e[0] <= m.level; }).map(function (e) { return e[1]; }); }
  function isSig(id) { var mv = ML.moves[id]; return !mv.tutor && (mv.el === 'origin' || /고유기/.test(mv.desc || '')); }
  function price(m, id) {
    var c = ML.config.tutor, mv = ML.moves[id];
    if (own(m).indexOf(id) >= 0) return c.relearn;
    if (mv.tutor === 'ultimate') return mv.el === 'origin' ? c.ultimateOrigin : c.ultimate;
    if (mv.tutor === 'only') return c.only;
    return mv.kind === 'attack' ? mv.power * mv.power * c.attackMul : c.support;
  }
  function teachable(m) {
    var els = ML.species[m.species].els, mine = own(m);
    return Object.keys(ML.moves).filter(function (id) {
      var mv = ML.moves[id];
      if (els.indexOf(mv.el) < 0) return false;          // 속성이 다르면 못 배운다
      if (mine.indexOf(id) >= 0) return true;
      return !isSig(id);
    }).sort(function (a, b) {
      var A = ML.moves[a], B = ML.moves[b];
      return (A.power || 0) - (B.power || 0) || els.indexOf(A.el) - els.indexOf(B.el);
    });
  }
  // 유틸 기술 효과를 짧게
  function fxText(mv) {
    var fx = mv.fx || {}, t = [], S = { atk: '공격', def: '방어', spd: '속도', eva: '회피' };
    if (fx.status) t.push(ML.STATUS_NAMES[fx.status.type] + (fx.status.chance < 1 ? ' ' + Math.round(fx.status.chance * 100) + '%' : ''));
    for (var k in fx.self || {}) t.push('내 ' + S[k] + ' +' + fx.self[k]);
    for (var k2 in fx.foe || {}) if (k2 !== 'chance') t.push('상대 ' + S[k2] + ' ' + fx.foe[k2]);
    if (fx.heal) t.push('체력 ' + Math.round(fx.heal * 100) + '% 회복');
    if (fx.seal) t.push('상대 기술 봉인');
    if (fx.mimic) t.push('상대 기술 따라 하기');
    return t.join(', ');
  }
  function findMon(uid) { var g = ML.game; return g.party.concat(g.box).filter(function (m) { return m.uid === uid; })[0]; }

  function render() {
    var g = ML.game, m = pick && findMon(pick);
    var h = '<div class="sub-head"><button class="btn" id="to-hub">← 연구소</button><h2>🎓 기술 교습소</h2><span class="gold">💰 ' + g.gold + '</span></div>' +
      '<p class="muted small">골드를 내고 기술을 가르친다. <b>몬스터와 같은 속성의 기술만</b> 배울 수 있다. 교습 전용 <b>최강기(위력 140, 30만)</b>와 <b>궁극기(위력 180, 200만 · 근원은 위력 200, 500만)</b>도 있다. 자기 종이 배우는 기술은 싸게 다시 떠올린다. 다른 종의 고유기는 배울 수 없다.</p>' +
      '<div class="section-t">누구에게 가르칠까?</div><div class="tile-grid">' + g.party.concat(g.box).map(function (p) {
        return '<button class="mon-tile' + (p.uid === pick ? ' on' : '') + '" data-mon="' + p.uid + '" style="' + (p.uid === pick ? 'outline:3px solid var(--accent, #7ab8ff)' : '') + '">' + ML.art.svg(p.species, { size: 64, shiny: p.shiny }) + '<b>' + ML.species[p.species].name + '</b><span class="small">Lv ' + p.level + '</span></button>';
      }).join('') + '</div>';
    if (m) {
      var list = teachable(m);
      var card = function (id) {
        var mv = ML.moves[id], known = m.moves.indexOf(id) >= 0, p = price(m, id), info = ML.elements.info[mv.el];
        return '<button class="tutor-mv" data-mv="' + id + '" style="--c:' + info.main + '"' + (known || g.gold < p ? ' disabled' : '') + '><b>' + mv.name + '</b>' + (mv.tutor === 'ultimate' ? ' <span class="boss-tag" style="background:linear-gradient(90deg,#ff7ad9,#7ae8ff);color:#10131c">궁극기</span>' : mv.tutor === 'only' ? ' <span class="boss-tag">최강기</span>' : '') +
          '<br><span class="muted small">' + info.icon + ' ' + (mv.kind === 'attack' ? '위력 ' + mv.power : '변화') + ' · 명중 ' + mv.acc + (mv.desc && !mv.tutor ? ' · ' + mv.desc : '') + (mv.kind !== 'attack' ? ' · ' + fxText(mv) : '') + '</span>' +
          '<br><span class="gold small">' + (known ? '이미 안다' : '💰 ' + p.toLocaleString()) + '</span></button>';
      };
      var atk = list.filter(function (id) { return ML.moves[id].kind === 'attack'; }), util = list.filter(function (id) { return ML.moves[id].kind !== 'attack'; });
      h += '<div class="section-t">' + ML.species[m.species].name + '(' + ML.species[m.species].els.map(function (e) { return ML.elements.info[e].icon + ML.elements.info[e].name; }).join('·') + ')의 기술: ' + m.moves.map(function (x) { return ML.moves[x].name; }).join(', ') + '</div>' +
        '<div class="section-t">⚔️ 공격 기술 (' + atk.length + ')</div><div class="learn tutor-list">' + atk.map(card).join('') + '</div>' +
        '<div class="section-t">🛠️ 유틸 기술 (' + util.length + ')</div>' + (util.length ? '<div class="learn tutor-list">' + util.map(card).join('') + '</div>' : '<p class="muted small">이 속성으로 배울 수 있는 유틸 기술이 없다.</p>');
    }
    screen.innerHTML = h;
    ui.$('#to-hub').onclick = function () { pick = null; ML.hub.render(); };
    screen.querySelectorAll('[data-mon]').forEach(function (b) { b.onclick = function () { pick = b.dataset.mon; render(); }; });
    screen.querySelectorAll('[data-mv]').forEach(function (b) { b.onclick = function () { teach(m, b.dataset.mv); }; });
  }

  function teach(m, id) {
    var g = ML.game, p = price(m, id), mv = ML.moves[id];
    if (g.gold < p) { ui.toast('골드가 부족하다.'); return; }
    var pay = function (slot) {
      g.gold -= p;
      var old = slot == null ? null : m.moves[slot];
      if (slot == null) m.moves.push(id); else m.moves[slot] = id;
      g.stats.tutored = (g.stats.tutored || 0) + 1;
      ML.state.save(); ML.app.status(); ui.closeModal();
      ui.toast(ML.species[m.species].name + '이(가) ' + mv.name + '을(를) 배웠다!' + (old ? ' (' + ML.moves[old].name + ' 잊음)' : ''));
      var top = screen.scrollTop; render(); screen.scrollTop = top;
    };
    if (m.moves.length < 4) {
      var c1 = ui.modal('<h3>' + mv.name + '을(를) 가르칠까?</h3><p>💰 ' + p.toLocaleString() + '골드</p><div class="row" style="justify-content:flex-end"><button class="btn" data-close>그만두기</button><button class="btn primary" id="tt-ok">가르치기</button></div>');
      c1.querySelector('#tt-ok').onclick = function () { pay(null); };
      return;
    }
    var md = ui.modal('<h3>' + mv.name + '(💰 ' + p.toLocaleString() + ') — 어떤 기술을 잊을까?</h3><div class="learn">' + m.moves.map(function (x, i) {
      var o = ML.moves[x];
      return '<button class="tutor-mv" data-slot="' + i + '" style="--c:' + ML.elements.info[o.el].main + '"><b>' + o.name + '</b><br><span class="muted small">' + ML.elements.info[o.el].icon + ' ' + (o.kind === 'attack' ? '위력 ' + o.power : '변화') + '</span></button>';
    }).join('') + '</div><div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn" data-close>그만두기</button></div>');
    md.querySelectorAll('[data-slot]').forEach(function (b) { b.onclick = function () { pay(+b.dataset.slot); }; });
  }

  ML.tutor = { render: function () { pick = null; render(); }, teachable: teachable, price: price };
})();
