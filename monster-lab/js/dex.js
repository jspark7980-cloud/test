// 도감: 본 종은 그림자와 이름, 잡은 종은 전부 공개. 숨겨진 몬스터는 잡기 전까지 ???.
var ML = window.ML = window.ML || {};

(function () {
  var ui = ML.ui, screen = document.getElementById('screen');

  ML.dex = { render: render };

  function render() {
    var dex = ML.game.dex, ids = Object.keys(ML.species);
    var caught = ids.filter(function (id) { return dex.caught[id]; }).length, seen = ids.filter(function (id) { return dex.seen[id]; }).length;
    var shinies = Object.keys(dex.shiny || {}).length;
    var h = '<div class="dex-head"><h2>📖 도감</h2><span class="muted">잡은 종 <b>' + caught + '</b> · 본 종 <b>' + seen + '</b> · 전체 ' + ids.length + (shinies ? ' · ✨색다른 개체 ' + shinies : '') + '</span></div><div class="dex-grid">';
    ids.forEach(function (id, n) {
      var sp = ML.species[id], no = ('00' + (n + 1)).slice(-3);
      if (dex.caught[id]) {
        h += '<button class="card" data-sp="' + id + '"><div class="dex-no">No.' + no + '</div>' + ML.art.svg(id, { size: 100 }) +
          '<div class="nm">' + (dex.shiny && dex.shiny[id] ? '✨' : '') + sp.name + '</div><div class="sub">' + ui.elChips(sp.els) + '</div></button>';
      } else if (dex.seen[id] && sp.rarity !== 'hidden') {
        h += '<button class="card seen" data-seen="' + id + '"><div class="dex-no">No.' + no + '</div><div class="silhouette">' + ML.art.svg(id, { size: 100 }) + '</div>' +
          '<div class="nm">' + sp.name + '</div><div class="sub muted">본 적 있음</div></button>';
      } else {
        h += '<div class="card unknown"><div class="dex-no">No.' + no + '</div><div class="q">?</div><div class="nm">???</div></div>';
      }
    });
    screen.innerHTML = h + '</div>';
    screen.querySelectorAll('[data-sp]').forEach(function (c) { c.onclick = function () { ML.lab.openDetail(c.dataset.sp); }; });
    screen.querySelectorAll('[data-seen]').forEach(function (c) {
      c.onclick = function () {
        var sp = ML.species[c.dataset.seen];
        ui.modal('<div class="intro"><div class="silhouette">' + ML.art.svg(c.dataset.seen, { size: 160 }) + '</div><h3>' + sp.name + '</h3>' +
          '<div class="row" style="justify-content:center">' + ui.elChips(sp.els) + '</div><p class="muted">아직 잡지 못했다. 잡으면 자세한 정보가 기록된다.</p>' +
          '<div class="row" style="justify-content:center"><button class="btn primary" data-close>닫기</button></div></div>');
      };
    });
  }
})();
