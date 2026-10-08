// 시작점: 입력 처리, 적 턴 진행, 저장.
window.DT = window.DT || {};

(function () {
  const app = (DT.app = { state: null, sel: null, mode: null, busy: false, flash: '', pileView: null });
  const FIRST_ENCOUNTER = ['knight'];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  let flashTimer = null;

  function render() { DT.ui.render(app); }

  function flash(msg) {
    app.flash = msg;
    render();
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { app.flash = ''; render(); }, 1600);
  }

  // 상태가 바뀐 뒤 항상 호출: 메타 기록 → 저장 → 그리기 → 연출
  function commit() {
    const s = app.state;
    const events = s.events.splice(0);
    recordMeta(s, events);
    DT.save.saveRun(s);
    render();
    DT.ui.playEvents(app, events);
  }

  function recordMeta(s, events) {
    const steals = events.filter((e) => e.type === 'steal' && e.by === 'player');
    const finished = s.result && !s.metaRecorded;
    if (!steals.length && !finished) return;
    const meta = DT.save.loadMeta();
    steals.forEach((e) => { meta.steals++; meta.codex[e.cardId] = true; });   // 도감
    if (finished) {
      s.metaRecorded = true;
      if (s.result === 'win') meta.wins++; else meta.losses++;
    }
    DT.save.saveMeta(meta);
  }

  function newRun(seed) {
    const s = DT.state.createRun(seed || DT.rng.randomSeed());
    DT.combat.start(s, FIRST_ENCOUNTER);
    app.state = s;
    app.sel = null; app.mode = null; app.busy = false; app.pileView = null;
    commit();
  }

  async function runEnemyTurn() {
    const s = app.state;
    app.busy = true;
    render();
    await wait(500);
    while (app.state === s && s.phase === 'enemy') {
      if (!DT.combat.enemyAct(s)) break;
      commit();
      await wait(1000);
    }
    if (app.state !== s) return;      // 도중에 새 게임 시작
    DT.combat.endEnemyTurn(s);
    app.busy = false;
    commit();
  }

  // ── 입력 ──
  const canInteract = () => !app.busy && app.state.phase === 'player' && !app.state.result;
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
    const def = DT.cards.def(selCard().id);
    if (!DT.cards.needsTarget(def)) return flash('이 카드는 한 번 더 탭하면 사용됩니다');
    if (DT.cards.choiceOf(def) === 'revealed') {
      const e = DT.state.actor(app.state, id);
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

  function onAction(act, data) {
    switch (act) {
      case 'hand': return tapHand(data.uid);
      case 'enemy': return tapEnemy(data.id);
      case 'reveal': return tapReveal(data.owner, data.uid);
      case 'player': return tapPlayer();
      case 'end-turn': return endTurn();
      case 'pile': app.pileView = data.pile; return render();
      case 'close-overlay': app.pileView = null; return render();
      case 'retry': return newRun(app.state.seed);
      case 'new-seed': return newRun();
      case 'menu':
        if (window.confirm('현재 전투를 버리고 새 게임을 시작할까요?')) newRun();
        return;
      case 'status': {
        const d = DT.data.statuses[data.key];
        return d && flash(`${d.name}: ${d.desc}`);
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
      onAction(t ? t.dataset.act : 'bg', t ? t.dataset : {});
    });
    window.addEventListener('resize', () => DT.ui.layoutHand());

    const urlSeed = new URLSearchParams(location.search).get('seed');
    const saved = DT.save.loadRun();
    if (saved && (!urlSeed || urlSeed === String(saved.seed))) {
      app.state = saved;
      render();
      if (saved.phase === 'enemy') runEnemyTurn();
    } else {
      newRun(urlSeed);
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
