// 기술 교습소 [제안]: 골드를 내고 기술을 가르친다.
// 배울 수 있는 기술 = 몬스터 속성의 기술(근원 속성은 모든 속성) + 교습 전용 최강기 + 자기 종 배움표에서 지금 레벨까지의 기술(떠올리기)
// 다른 종의 고유기(전설·근원)는 그 종만 배운다.
var ML = window.ML = window.ML || {};

(function () {
  var ui = ML.ui, screen = document.getElementById('screen');
  var pick = null;   // 고른 몬스터 uid

  function own(m) { return ML.learnsetOf(m.species).filter(function (e) { return e[0] <= m.level; }).map(function (e) { return e[1]; }); }
  function isSig(id) { var mv = ML.moves[id]; return mv.el === 'origin' || /고유기/.test(mv.desc || ''); }
  function price(m, id) {
    var c = ML.config.tutor, mv = ML.moves[id];
    if (own(m).indexOf(id) >= 0) return c.relearn;
    if (mv.tutor === 'only') return c.only;
    return mv.kind === 'attack' ? mv.power * mv.power * c.attackMul : c.support;
  }
  function teachable(m) {
    var els = ML.species[m.species].els, all = els.indexOf('origin') >= 0, mine = own(m);
    return Object.keys(ML.moves).filter(function (id) {
      var mv = ML.moves[id];
      if (mine.indexOf(id) >= 0) return true;
      if (isSig(id)) return false;
      return all || els.indexOf(mv.el) >= 0;
    }).sort(function (a, b) {
      var A = ML.moves[a], B = ML.moves[b];
      return ML.elements.order.indexOf(A.el) - ML.elements.order.indexOf(B.el) || (A.kind === B.kind ? 0 : A.kind === 'attack' ? -1 : 1) || (A.power || 0) - (B.power || 0);
    });
  }
  function findMon(uid) { var g = ML.game; return g.party.concat(g.box).filter(function (m) { return m.uid === uid; })[0]; }

  function render() {
    var g = ML.game, m = pick && findMon(pick);
    var h = '<div class="sub-head"><button class="btn" id="to-hub">← 연구소</button><h2>🎓 기술 교습소</h2><span class="gold">💰 ' + g.gold + '</span></div>' +
      '<p class="muted small">골드를 내고 기술을 가르친다. 몬스터 속성의 기술(근원 속성은 모든 속성)과 <b>교습 전용 최강기(위력 140)</b>를 배울 수 있고, 자기 종이 배우는 기술은 싸게 다시 떠올린다. 다른 종의 고유기는 배울 수 없다.</p>' +
      '<div class="section-t">누구에게 가르칠까?</div><div class="tile-grid">' + g.party.concat(g.box).map(function (p) {
        return '<button class="mon-tile' + (p.uid === pick ? ' on' : '') + '" data-mon="' + p.uid + '" style="' + (p.uid === pick ? 'outline:3px solid var(--accent, #7ab8ff)' : '') + '">' + ML.art.svg(p.species, { size: 64, shiny: p.shiny }) + '<b>' + ML.species[p.species].name + '</b><span class="small">Lv ' + p.level + '</span></button>';
      }).join('') + '</div>';
    if (m) {
      var list = teachable(m);
      h += '<div class="section-t">' + ML.species[m.species].name + '의 기술: ' + m.moves.map(function (x) { return ML.moves[x].name; }).join(', ') + '</div><div class="learn tutor-list">' + list.map(function (id) {
        var mv = ML.moves[id], known = m.moves.indexOf(id) >= 0, p = price(m, id), info = ML.elements.info[mv.el];
        return '<button class="tutor-mv" data-mv="' + id + '" style="--c:' + info.main + '"' + (known || g.gold < p ? ' disabled' : '') + '><b>' + mv.name + '</b>' + (mv.tutor === 'only' ? ' <span class="boss-tag">최강기</span>' : '') +
          '<br><span class="muted small">' + info.icon + ' ' + (mv.kind === 'attack' ? '위력 ' + mv.power : '변화') + ' · 명중 ' + mv.acc + (mv.desc && mv.tutor !== 'only' ? ' · ' + mv.desc : '') + '</span>' +
          '<br><span class="gold small">' + (known ? '이미 안다' : '💰 ' + p.toLocaleString()) + '</span></button>';
      }).join('') + '</div>';
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
