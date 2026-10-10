// 게임 상태(파티·보관함·가방·골드·도감·지도 진행)와 자동 저장
var ML = window.ML = window.ML || {};

ML.game = null;

ML.state = {
  // 새 게임: 첫 몬스터를 고른 뒤 호출
  newGame: function (starterId) {
    var c = ML.config, seed = ML.randomSeed();
    var g = {
      v: 1, seed: seed, rng: seed, created: Date.now(), playMs: 0,
      gold: c.startGold, items: Object.assign({}, c.startItems),
      party: [], box: [], eggs: [],
      dex: { seen: {}, caught: {} },
      region: 1, at: 'hub',                    // 'hub' 또는 장소 id
      prog: { 1: { visited: {}, searches: {}, beaten: {}, cleared: false } },
      stats: { battles: 0, caught: 0, wins: 0 },
    };
    ML.game = g;
    var rng = ML.state.rng();
    var mon = ML.createMonster(starterId, 5, rng);
    ML.state.saveRng(rng);
    ML.state.addMon(mon);
    ML.state.save();
    return g;
  },

  load: function () {
    var saved = ML.save.load();
    var g = saved && saved.game;
    if (!g || !g.party || !g.party.length) return null;
    // 데이터에서 사라진 종·기술은 걸러 낸다
    var ok = function (m) { return m && ML.species[m.species]; };
    g.party = g.party.filter(ok); g.box = g.box.filter(ok);
    g.eggs = (g.eggs || []).filter(function (e) { return ML.species[e.species]; });
    g.party.concat(g.box).forEach(function (m) { m.moves = m.moves.filter(function (x) { return ML.moves[x]; }); });
    ML.game = g;
    return g;
  },

  save: function () {
    // 플레이 시간: 저장 사이 간격을 더한다(5분 넘게 비면 자리를 비운 것으로 보고 5분만)
    var now = Date.now(), last = ML.state._last || now;
    ML.game.playMs = (ML.game.playMs || 0) + Math.min(now - last, 5 * 60000);
    ML.state._last = now;
    var saved = ML.save.load() || {};
    saved.game = ML.game;
    ML.save.write(saved);
  },

  // 시드 난수: 쓸 때마다 이어서 쓰고, 상태를 저장한다
  rng: function () { return ML.makeRng(ML.game.rng); },
  saveRng: function (rng) { ML.game.rng = rng.state(); },

  // 파티가 차면 보관함으로
  addMon: function (mon) {
    var g = ML.game;
    ML.state.markCaught(mon.species);
    if (g.party.length < ML.config.partyMax) { g.party.push(mon); return 'party'; }
    g.box.push(mon); return 'box';
  },

  markSeen: function (id) { ML.game.dex.seen[id] = true; },
  markCaught: function (id) { ML.game.dex.seen[id] = true; ML.game.dex.caught[id] = true; },

  item: function (id) { return ML.game.items[id] || 0; },
  addItem: function (id, n) { ML.game.items[id] = (ML.game.items[id] || 0) + (n || 1); },
  takeItem: function (id) {
    if (!ML.game.items[id]) return false;
    if (--ML.game.items[id] <= 0) delete ML.game.items[id];
    return true;
  },

  healAll: function () {
    ML.game.party.concat(ML.game.box).forEach(function (m) { m.hp = ML.calcStats(m).hp; m.status = null; });
  },
  partyAlive: function () { return ML.game.party.some(function (m) { return m.hp > 0; }); },

  // 지역이 열렸나: 앞 지역 보스를 이겼으면
  unlocked: function (r) {
    var reg = ML.regions[r];
    if (!reg || reg.locked) return false;
    return !reg.need || !!(ML.game.prog[reg.need] && ML.game.prog[reg.need].cleared);
  },

  // ── 지도 진행 ────────────────────────────────────
  prog: function (r) {
    var g = ML.game; r = r || g.region;
    if (!g.prog[r]) g.prog[r] = { visited: {}, searches: {}, beaten: {}, cleared: false };
    return g.prog[r];
  },
  // 장소를 "통과"했는가: 트레이너가 있으면 이겨야 하고, 없으면 탐색 3회
  placeCleared: function (pid) {
    var reg = ML.regions[ML.game.region], p = reg.places[pid], pr = ML.state.prog();
    if (p.kind === 'legend') return true;
    if (p.trainer) return !!pr.beaten[p.trainer];
    return (pr.searches[pid] || 0) >= ML.config.clearSearches;
  },
  neighbors: function (pid) {
    return ML.regions[ML.game.region].edges.filter(function (e) { return e[0] === pid || e[1] === pid; })
      .map(function (e) { return e[0] === pid ? e[1] : e[0]; });
  },
  // 갈 수 있는 장소: 출입구, 이미 가 본 곳, 통과한 장소의 이웃
  reachable: function (pid) {
    var reg = ML.regions[ML.game.region], pr = ML.state.prog();
    if (pid === reg.start || pr.visited[pid]) return true;
    return ML.state.neighbors(pid).some(function (n) { return pr.visited[n] && ML.state.placeCleared(n); });
  },
};
