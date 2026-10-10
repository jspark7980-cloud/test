// 시작·탭 전환. 저장이 없으면 첫 몬스터 고르기부터.
var ML = window.ML = window.ML || {};

(function () {
  var ui = ML.ui, screen = document.getElementById('screen'), tabs = document.getElementById('tabs');
  var labOn = /[?&]lab\b/.test(location.search);
  var TABS = [['map', '🗺️ 지도'], ['hub', '🏠 거점'], ['party', '👥 파티'], ['bag', '🎒 가방'], ['dex', '📖 도감']];
  if (labOn) TABS.push(['lab', '🧪 실험실']);
  var current = null;

  tabs.innerHTML = TABS.map(function (t) { return '<button data-tab="' + t[0] + '" class="tab">' + t[1] + '</button>'; }).join('');
  tabs.addEventListener('click', function (e) {
    var b = e.target.closest('[data-tab]');
    if (!b || ML.battleView.isBusy() || !ML.game) return;
    show(b.dataset.tab);
  });
  ui.bindTraitTips(screen);
  ui.bindTraitTips(document.getElementById('modal-root'));

  function show(tab) {
    ML.battleView.stop();
    current = tab;
    [].forEach.call(tabs.children, function (b) { b.classList.toggle('on', b.dataset.tab === tab); });
    screen.scrollTop = 0;
    updateStatus();
    if (tab === 'map') ML.explore.render();
    else if (tab === 'hub') ML.hub.render();
    else if (tab === 'party') ML.hub.renderParty();
    else if (tab === 'bag') ML.hub.renderBag();
    else if (tab === 'dex') ML.dex.render();
    else if (tab === 'lab') ML.lab.show('lab');
  }

  // 상단: 골드·현재 위치
  function updateStatus() {
    var el = document.getElementById('status'), g = ML.game;
    if (!el) return;
    if (!g) { el.innerHTML = ''; return; }
    var reg = ML.regions[g.region];
    el.innerHTML = '💰 ' + g.gold + ' · 📍 ' + (g.at === 'hub' ? '연구소' : reg.places[g.at].name);
  }

  ML.app = {
    show: show,
    refresh: function () { show(current || 'hub'); },
    status: updateStatus,
    // 전투 화면처럼 탭 없이 화면을 쓰는 동안
    battleMode: function () { [].forEach.call(tabs.children, function (b) { b.classList.remove('on'); }); },
  };

  // ── 첫 몬스터 고르기 ──────────────────────────────
  var STARTERS = ['emberrat', 'dropcrab', 'sproutsquirrel', 'zapchick', 'pebblebear', 'shadecat'];
  function starterScreen() {
    tabs.style.visibility = 'hidden';
    screen.innerHTML = '<div class="starter"><h2>연구소에 온 걸 환영해!</h2><p class="muted">함께 여행할 첫 몬스터를 한 마리 골라 줘. (Lv 5, 특성 3개는 무작위)</p>' +
      '<div class="dex-grid">' + STARTERS.map(function (id) {
        var sp = ML.species[id], ab = ML.abilities[sp.ability];
        return '<button class="card" data-st="' + id + '">' + ML.art.svg(id, { size: 130 }) + '<div class="nm">' + sp.name + '</div>' +
          '<div class="sub">' + ui.elChips(sp.els) + '</div><div class="muted small" style="margin-top:4px">' + ab.name + '</div></button>';
      }).join('') + '</div></div>';
    screen.querySelectorAll('[data-st]').forEach(function (c) {
      c.onclick = function () {
        var id = c.dataset.st, sp = ML.species[id];
        var m = ui.modal('<div class="intro">' + ML.art.svg(id, { size: 180 }) + '<h3>' + sp.name + '(으)로 할까?</h3>' +
          '<p class="muted">' + ML.elements.info[sp.els[0]].name + ' 속성. 이기는 속성: ' + ML.elements.info[ML.elements.beats[sp.els[0]]].name + '</p>' +
          '<div class="row" style="justify-content:center"><button class="btn" data-close>다시 고르기</button><button class="btn primary" id="st-ok">결정!</button></div></div>');
        m.querySelector('#st-ok').onclick = function () {
          ui.closeModal();
          ML.state.newGame(id);
          tabs.style.visibility = '';
          ui.toast(sp.name + '과(와) 함께 출발!');
          show('hub');
        };
      };
    });
  }

  if (ML.state.load()) show(labOn && location.hash === '#lab' ? 'lab' : 'map');
  else if (labOn && location.hash === '#lab') { tabs.style.visibility = ''; ML.lab.show('lab'); }
  else starterScreen();
})();
