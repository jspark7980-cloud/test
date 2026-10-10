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

// 확대 막기(더블탭 줌은 CSS touch-action: manipulation으로 막는다)
document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
document.addEventListener('dblclick', function (e) { e.preventDefault(); }, { passive: false });
