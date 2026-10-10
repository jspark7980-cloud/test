// 화면 공통: 모달·토스트·칩
var ML = window.ML = window.ML || {};

ML.ui = {
  $: function (sel, root) { return (root || document).querySelector(sel); },
  esc: function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); },

  elChips: function (els) {
    return els.map(function (e) {
      var i = ML.elements.info[e];
      return '<span class="el-chip" style="background:' + i.main + '">' + i.icon + ' ' + i.name + '</span>';
    }).join(' ');
  },

  traitChip: function (id) {
    var t = ML.traits[id], g = ML.traitGrades[t.grade];
    return '<span class="trait ' + t.grade + '" style="--c:' + (g.color === 'rainbow' ? '#fff' : g.color) + '" data-trait="' + id + '">' + t.name + '</span>';
  },
  traitChips: function (ids) { return '<div class="traits">' + ids.map(ML.ui.traitChip).join('') + '</div>'; },

  stageLabel: function (sp) {
    if (sp.stage) return sp.stage + '단계';
    return { rare: '희귀', fusion: '합성 전용', legend: '전설', hidden: '숨겨진' }[sp.rarity] || '';
  },

  // locked = true면 바깥을 눌러도 닫히지 않는다(반드시 골라야 하는 창)
  modal: function (html, onClose, locked) {
    var root = document.getElementById('modal-root');
    root.innerHTML = '<div class="modal-bg"><div class="modal">' + ML.josa(html) + '</div></div>';
    var bg = root.firstChild;
    bg.addEventListener('click', function (e) {
      if ((e.target === bg && !locked) || e.target.closest('[data-close]')) { ML.ui.closeModal(); if (onClose) onClose(); }
    });
    return bg.firstChild;
  },
  closeModal: function () { document.getElementById('modal-root').innerHTML = ''; },

  toast: function (msg) {
    var t = document.getElementById('toast');
    t.textContent = ML.josa(msg); t.classList.add('on');
    clearTimeout(ML.ui._tt);
    ML.ui._tt = setTimeout(function () { t.classList.remove('on'); }, 1800);
  },

  // 속성 상성 설명 창: 순환 그림 + 표 + 규칙
  typeChart: function () {
    var E = ML.elements, order = E.order, pos = {}, cx = 170, cy = 160, r = 118;
    order.forEach(function (e, i) {
      var a = -Math.PI / 2 + i * Math.PI * 2 / order.length;
      pos[e] = [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    });
    var svg = '<svg viewBox="0 0 340 320" width="340" height="320"><defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="#4cd38a"/></marker></defs>';
    order.forEach(function (e) {
      var to = E.beats[e], a = pos[e], b = pos[to], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.sqrt(dx * dx + dy * dy);
      var k = 34 / d;
      svg += '<line x1="' + (a[0] + dx * k) + '" y1="' + (a[1] + dy * k) + '" x2="' + (b[0] - dx * k) + '" y2="' + (b[1] - dy * k) + '" stroke="#4cd38a" stroke-width="3" marker-end="url(#arr)"/>';
    });
    order.forEach(function (e) {
      var i = E.info[e], p = pos[e];
      svg += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="30" fill="' + i.main + '" stroke="#0b1020" stroke-width="3"/>' +
        '<text x="' + p[0] + '" y="' + (p[1] - 2) + '" text-anchor="middle" font-size="20">' + i.icon + '</text>' +
        '<text x="' + p[0] + '" y="' + (p[1] + 18) + '" text-anchor="middle" font-size="13" font-weight="800" fill="#0b1020">' + i.name + '</text>';
    });
    svg += '<text x="170" y="165" text-anchor="middle" font-size="13" fill="#8e97ad">화살표 = 이긴다</text></svg>';
    var weakTo = function (e) { return order.filter(function (x) { return E.beats[x] === e; })[0]; };
    var chip = function (e) { return '<span class="el-chip" style="background:' + E.info[e].main + '">' + E.info[e].icon + ' ' + E.info[e].name + '</span>'; };
    var c = ML.config;
    var html = '<h3>🔄 속성 상성</h3><div class="types"><div>' + svg + '</div><div><table><tr><th>속성</th><th>이긴다 (×' + c.typeAdvantage + ')</th><th>진다 (×' + c.typeDisadvantage + ')</th></tr>' +
      order.map(function (e) { return '<tr><td>' + chip(e) + '</td><td>' + chip(E.beats[e]) + '</td><td>' + chip(weakTo(e)) + '</td></tr>'; }).join('') + '</table>' +
      '<ul><li>내 기술 속성이 상대 속성을 <b>이기면 피해 ×' + c.typeAdvantage + '</b>, 상대에게 <b>지면 ×' + c.typeDisadvantage + '</b>, 나머지는 ×1.</li>' +
      '<li>몬스터와 같은 속성의 기술은 피해 <b>×' + c.stab + '</b>(특성 「속성 강화」면 +' + Math.round(c.traitStabBonus * 100) + '%).</li>' +
      '<li>속성이 둘인 몬스터(합성 전용종·전설)는 두 배율을 곱한다. 예) 물결 기술 → 불꽃+그림자: ×1.5 × ×0.67 ≈ ×1.0</li>' +
      '<li>「근원」 속성(숨겨진 몬스터)은 상성이 없다. 주고받는 피해 모두 ×1.</li>' +
      '<li>전투 중 기술 버튼에 지금 상대에 대한 배율이 표시된다.</li></ul></div></div>' +
      '<div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn primary" data-close>닫기</button></div>';
    ML.ui.modal(html);
  },

  // 특성 칩을 탭하면 설명
  bindTraitTips: function (root) {
    root.addEventListener('click', function (e) {
      var c = e.target.closest('[data-trait]');
      if (!c) return;
      var t = ML.traits[c.dataset.trait];
      ML.ui.toast('[' + ML.traitGrades[t.grade].name + '] ' + t.name + ' — ' + t.desc);
    });
  },
};

// 속성 칩(어디서든)이나 위쪽 🔄 버튼을 누르면 상성 창
document.addEventListener('click', function (e) {
  // 버튼 안의 속성 칩(도감 카드 등)은 그 버튼의 동작을 따른다
  if (e.target.closest('#types-btn') || (e.target.closest('.el-chip') && !e.target.closest('.modal, button'))) ML.ui.typeChart();
});

// 확대 막기(더블탭 줌은 CSS touch-action: manipulation으로 막는다)
document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
document.addEventListener('dblclick', function (e) { e.preventDefault(); }, { passive: false });
