// 시작점: 입력 처리, 적 턴 진행, 저장.
window.DT = window.DT || {};

(function () {
  const app = (DT.app = { state: null, sel: null, mode: null, busy: false, flash: '', pileView: null, pick: null });
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  let flashTimer = null;

  function render() { DT.ui.render(app); }

  function flash(msg) {
    app.flash = msg;
    render();
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { app.flash = ''; render(); }, 1800);
  }

  // 상태가 바뀐 뒤 항상 호출: 화면 전환 → 메타 기록 → 저장 → 그리기 → 연출
  function commit() {
    const s = app.state;
    if (DT.run.resolve(s)) { app.sel = null; app.mode = null; app.pick = null; }
    const events = s.events.splice(0);
    recordMeta(s, events);
    DT.save.saveRun(s);
    render();
    DT.ui.playEvents(app, events);
  }

  function recordMeta(s, events) {
    const relevant = events.filter((e) =>
      (e.type === 'steal' || e.type === 'copy') ? e.by === 'player' : (e.type === 'heist' || e.type === 'victory'));
    const finished = s.screen === 'over' && !s.metaRecorded;
    if (!relevant.length && !finished) return;
    const meta = DT.save.loadMeta();
    relevant.forEach((e) => {
      if (e.type === 'steal') { meta.steals++; meta.codex[e.cardId] = true; }   // 도감
      if (e.type === 'heist') { meta.heists++; meta.codex[e.cardId] = true; }
      if (e.type === 'copy') meta.copies++;
      if (e.type === 'victory') meta.combatsWon++;
    });
    if (finished) {
      s.metaRecorded = true;
      meta.runs++;
      meta.bestFloor = Math.max(meta.bestFloor, s.floor);
    }
    DT.save.saveMeta(meta);
  }

  function newRun(seed) {
    app.state = DT.run.start(seed || DT.rng.randomSeed());
    app.sel = null; app.mode = null; app.busy = false; app.pileView = null; app.pick = null;
    commit();
  }

  async function runEnemyTurn() {
    const s = app.state;
    app.busy = true;
    render();
    await wait(DT.config.ui.enemyTurnStartDelay);
    while (app.state === s && s.phase === 'enemy') {
      if (!DT.combat.enemyAct(s)) break;
      commit();
      await wait(DT.config.ui.enemyActDelay);
    }
    if (app.state !== s) return;      // 도중에 새 게임 시작
    DT.combat.endEnemyTurn(s);
    app.busy = false;
    commit();
  }

  // ── 전투 입력 ──
  const canInteract = () => !app.busy && app.state.screen === 'combat' && app.state.phase === 'player' && !app.state.result;
  const selCard = () => app.sel && app.state.player.hand.find((c) => c.uid === app.sel);
  const deselect = () => { app.sel = null; app.mode = null; };

  function play(uid, tgtId, choice) {
    const r = DT.combat.playCard(app.state, uid, tgtId, choice);
    deselect();
    if (!r.ok) { flash(r.reason); return; }
    commit();
  }

  function tapHand(uid) {
    if (!canInteract()) return;
    if (app.sel === uid) {
      const def = DT.cards.def(selCard().id);
      if (!DT.cards.needsTarget(def)) return play(uid, null, null);
      deselect();
      return render();
    }
    const chk = DT.combat.canPlay(app.state, uid);
    if (!chk.ok) return flash(chk.reason);
    app.sel = uid; app.mode = null;
    render();
  }

  function tapEnemy(id) {
    if (!canInteract() || !app.sel) return;
    const e = DT.state.actor(app.state, id);
    if (!e || e.dead) return;
    const def = DT.cards.def(selCard().id);
    if (!DT.cards.needsTarget(def)) return flash('이 카드는 한 번 더 탭하면 사용됩니다');
    if (DT.cards.choiceOf(def) === 'revealed') {
      const cands = e.hand.filter((c) => c.revealed);
      if (cands.length > 1) { app.mode = { type: 'chooseReveal', target: id }; return render(); }
      return play(app.sel, id, cands[0] ? cands[0].uid : null);
    }
    play(app.sel, id, null);
  }

  function tapReveal(owner, uid) {
    if (!canInteract() || !app.sel) return;
    const def = DT.cards.def(selCard().id);
    if (DT.cards.choiceOf(def) === 'revealed') return play(app.sel, owner, uid);
    tapEnemy(owner);
  }

  function tapPlayer() {
    if (!canInteract() || !app.sel) return;
    const def = DT.cards.def(selCard().id);
    if (!DT.cards.needsTarget(def)) play(app.sel, null, null);
    else flash('대상 적을 탭하세요');
  }

  function endTurn() {
    if (!canInteract()) return;
    deselect();
    DT.combat.endPlayerTurn(app.state);
    commit();
    if (app.state.phase === 'enemy') runEnemyTurn();
  }

  // ── 보상 입력 ──
  function pick(id) {
    app.pick = app.pick === id ? null : id;
    render();
  }

  function afterChoice(ok) {
    if (!ok) return;
    app.pick = null; deselect();
    commit();
  }

  function onAction(act, data) {
    const s = app.state;
    switch (act) {
      case 'hand': return tapHand(data.uid);
      case 'enemy': return tapEnemy(data.id);
      case 'reveal': return tapReveal(data.owner, data.uid);
      case 'player': return tapPlayer();
      case 'end-turn': return endTurn();
      case 'pile': app.pileView = data.pile; return render();
      case 'close-overlay': app.pileView = null; return render();
      case 'pick': return pick(data.id);
      case 'heist-take': return app.pick && afterChoice(DT.run.takeHeist(s, app.pick));
      case 'heist-skip': return afterChoice(DT.run.skipHeist(s));
      case 'reward-take': return app.pick && afterChoice(DT.run.takeReward(s, app.pick));
      case 'reward-skip': return afterChoice(DT.run.skipReward(s));
      case 'retry': return newRun(s.seed);
      case 'new-seed': return newRun();
      case 'menu':
        if (window.confirm('현재 판을 버리고 새 게임을 시작할까요?')) newRun();
        return;
      case 'info': return flash(data.msg);
      case 'status': {
        const d = DT.data.statuses[data.key];
        return d && flash(`${d.icon} ${d.name} ${data.val}: ${d.desc}`);
      }
      default:
        if (app.sel || app.mode) { deselect(); render(); }
    }
  }

  // ── 확대·더블탭 줌 방지 ──
  function blockZoom() {
    ['gesturestart', 'gesturechange', 'gestureend'].forEach((t) =>
      document.addEventListener(t, (e) => e.preventDefault(), { passive: false }));
    document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
    document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
  }

  function boot() {
    blockZoom();
    DT.cards.validate();
    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-act]');
      if (t && t.disabled) return;
      onAction(t ? t.dataset.act : 'bg', t ? t.dataset : {});
    });
    window.addEventListener('resize', () => DT.ui.layoutHand());

    const urlSeed = new URLSearchParams(location.search).get('seed');
    const saved = DT.save.loadRun();
    if (saved && (!urlSeed || urlSeed === String(saved.seed))) {
      app.state = saved;
      commit();
      if (saved.screen === 'combat' && saved.phase === 'enemy') runEnemyTurn();
    } else {
      newRun(urlSeed);
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
