// 업적 화면: 진행도·보상 받기. 받은 업적은 g.ach[id] = true. 칭호(업적 이름)를 골라 위쪽에 표시할 수 있다.
var ML = window.ML = window.ML || {};

(function () {
  var ui = ML.ui, screen = document.getElementById('screen');

  function state(a) {
    var g = ML.game, n = a.need(g), cur = Math.min(n[0], n[1]);
    return { cur: cur, goal: n[1], done: n[0] >= n[1], claimed: !!(g.ach && g.ach[a.id]) };
  }
  function rewardText(r) {
    var t = [];
    if (r.gold) t.push('💰 ' + r.gold.toLocaleString());
    for (var id in r.items || {}) t.push(ML.items[id].icon + ' ' + ML.items[id].name + ' ×' + r.items[id]);
    return t.join(' · ');
  }
  function pending() { return ML.game ? ML.achievements.filter(function (a) { var s = state(a); return s.done && !s.claimed; }).length : 0; }

  function claim(a) {
    var g = ML.game, s = state(a);
    if (!s.done || s.claimed) return;
    g.ach = g.ach || {}; g.ach[a.id] = true;
    g.gold += a.reward.gold || 0;
    for (var id in a.reward.items || {}) ML.state.addItem(id, a.reward.items[id]);
    ML.state.save(); ML.app.status();
    ui.toast('🏅 「' + a.name + '」 보상: ' + rewardText(a.reward));
  }

  function render() {
    var g = ML.game, list = ML.achievements, done = list.filter(function (a) { return state(a).claimed; }).length;
    var titles = list.filter(function (a) { return state(a).claimed; });
    screen.innerHTML = '<div class="sub-head"><button class="btn" id="to-hub">← 연구소</button><h2>🏅 업적</h2><span class="muted">' + done + ' / ' + list.length + '</span>' +
      (pending() ? '<button class="btn primary" id="claim-all">🎁 모두 받기 (' + pending() + ')</button>' : '') + '</div>' +
      '<div class="row" style="margin-bottom:10px"><span class="muted small">칭호</span><select id="title"><option value="">(없음)</option>' + titles.map(function (a) {
        return '<option value="' + a.id + '"' + (g.title === a.id ? ' selected' : '') + '>' + a.icon + ' ' + a.name + '</option>';
      }).join('') + '</select><span class="muted small">받은 업적의 이름을 칭호로 달 수 있다.</span></div>' +
      '<div class="ach-list">' + list.map(function (a) {
        var s = state(a), pct = Math.round(s.cur / s.goal * 100);
        return '<div class="ach' + (s.claimed ? ' claimed' : s.done ? ' done' : '') + '"><span class="ai">' + a.icon + '</span><div class="ab"><b>' + a.name + '</b> <span class="muted small">' + a.desc + '</span>' +
          '<div class="bar" style="margin:4px 0"><i style="width:' + pct + '%"></i></div><span class="small">' + s.cur.toLocaleString() + ' / ' + s.goal.toLocaleString() + ' · ' + rewardText(a.reward) + '</span></div>' +
          (s.claimed ? '<span class="hint good">받음</span>' : s.done ? '<button class="btn primary" data-claim="' + a.id + '">받기</button>' : '') + '</div>';
      }).join('') + '</div>';
    ui.$('#to-hub').onclick = function () { ML.hub.render(); };
    if (ui.$('#claim-all')) ui.$('#claim-all').onclick = function () { list.forEach(function (a) { claim(a); }); render(); };
    ui.$('#title').onchange = function () { g.title = this.value || null; ML.state.save(); ML.app.status(); };
    screen.querySelectorAll('[data-claim]').forEach(function (b) {
      b.onclick = function () { claim(list.filter(function (a) { return a.id === b.dataset.claim; })[0]); var top = screen.scrollTop; render(); screen.scrollTop = top; };
    });
  }

  ML.achieve = { render: render, pending: pending };
})();
