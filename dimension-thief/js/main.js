// 시작점: 입력 처리, 적 턴 진행, 저장.
window.DT = window.DT || {};

(function () {
  // view: 'lobby' | 'run'
const app = (DT.app = { view: 'lobby', state: null, sel: null, mode: null, busy: false, flash: '', pileView: null, pick: null, picks: [], replaceFor: null, deckPick: null, urlSeed: null });
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  let flashTimer = null;

  function render() { DT.ui.render(app); }

  const runActive = () => !!(app.state && app.state.screen !== 'runEnd');

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
      (e.type === 'steal' || e.type === 'copy') ? e.by === 'player' : ['heist', 'victory', 'recruit', 'runEnd'].includes(e.type));
    if (!relevant.length) return;
    const meta = DT.save.loadMeta();
    relevant.forEach((e) => {
      if (e.type === 'steal') { meta.steals++; meta.codex[e.cardId] = true; }   // 도감
      if (e.type === 'heist') { meta.heists++; meta.codex[e.cardId] = true; }
      if (e.type === 'copy') meta.copies++;
      if (e.type === 'recruit') { meta.heists++; meta.recruits = (meta.recruits || 0) + 1; }
      if (e.type === 'victory') meta.combatsWon++;
      if (e.type === 'runEnd') {
        meta.coins += e.banked;           // 판 종료: 보존된 코인을 영구 저장
        meta.runs++;
        if (e.how === 'clear') meta.clears++;
        meta.bestFloor = Math.max(meta.bestFloor, e.floor);
      }
    });
    DT.save.saveMeta(meta);
  }

  function newRun(seed) {
    app.state = DT.run.start(seed || DT.rng.randomSeed(), DT.save.loadMeta());
    app.view = 'run';
    app.sel = null; app.mode = null; app.busy = false; app.pileView = null; app.pick = null; app.picks = []; app.replaceFor = null; app.deckPick = null;
    commit();
  }

  function toLobby() {
    app.view = 'lobby';
    app.pileView = null; app.deckPick = null;
    render();
  }

  // 로비에서 영구 데이터 변경
  function metaChange(fn) {
    const meta = DT.save.loadMeta();
    if (!fn(meta)) return flash('코인이 부족합니다');
    DT.save.saveMeta(meta);
    render();
  }

  // 턴 종료 후 자동 진행: 동료 행동 → 적 행동 → 다음 내 턴
  async function runAutoPhases() {
    const s = app.state;
    app.busy = true;
    render();
    while (app.state === s && s.phase === 'ally') {
      await wait(DT.config.ui.allyActDelay);
      if (app.state !== s) return;
      if (!DT.combat.allyAct(s)) break;
      commit();
    }
    if (app.state !== s) return;
    if (s.phase === 'ally') { DT.combat.beginEnemyPhase(s); commit(); }
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

  function play(uid, tgtId, choice, allyId) {
    const r = DT.combat.playCard(app.state, uid, tgtId, choice, allyId);
    deselect();
    if (!r.ok) { flash(r.reason); return; }
    commit();
  }

  function tapHand(uid) {
    if (!canInteract()) return;
    if (app.sel === uid) {
      const def = DT.cards.def(selCard().id);
      if (DT.cards.needsTarget(def)) { deselect(); return render(); }
      if (DT.cards.needsCompanion(def)) {
        const comps = DT.party.companions(app.state);
        if (comps.length === 1) return play(uid, null, null, comps[0].id);
        return flash('동료를 탭하세요');
      }
      return play(uid, null, null, 'player');
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

  // 아군(도둑·동료) 탭: 방어·회복 카드를 그 아군에게, 후퇴는 동료에게
  function tapAlly(id) {
    if (!canInteract() || !app.sel) return;
    const def = DT.cards.def(selCard().id);
    if (DT.cards.needsTarget(def)) return flash('대상 적을 탭하세요');
    if (DT.cards.needsCompanion(def)) {
      if (id === 'player') return flash('동료를 탭하세요');
      return play(app.sel, null, null, id);
    }
    if (DT.cards.allyTargetable(def) || id === 'player') return play(app.sel, null, null, id);
    flash('이 카드는 나에게만 쓸 수 있습니다 (카드를 한 번 더 탭)');
  }

  function endTurn() {
    if (!canInteract()) return;
    deselect();
    DT.combat.endPlayerTurn(app.state);
    commit();
    if (app.state.phase === 'ally') runAutoPhases();
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
      case 'ally': return tapAlly(data.id);
      case 'pick-comp': {
        const max = s.companionPicks || 1;
        if (app.picks.includes(data.id)) app.picks = app.picks.filter((k) => k !== data.id);
        else app.picks = (max === 1 ? [] : app.picks.slice(-(max - 1))).concat(data.id);
        return render();
      }
      case 'start-run': {
        if (!app.picks.length) return;
        const ok = DT.run.pickCompanion(s, app.picks);
        app.picks = [];
        return afterChoice(ok);
      }
      // 로비
      case 'lobby': return toLobby();
      case 'go': {
        if (runActive()) { app.view = 'run'; commit(); if (s.screen === 'combat' && (s.phase === 'ally' || s.phase === 'enemy') && !app.busy) runAutoPhases(); return; }
        return newRun(app.urlSeed);
      }
      case 'abandon': {
        if (!runActive()) return;
        const pct = Math.round(DT.config.coins.keep.death * 100);
        if (!window.confirm(`진행 중인 판을 포기할까요? 사망과 같이 이번 판 코인의 ${pct}%만 남습니다.`)) return;
        DT.run.endRun(s, 'death');
        commit();
        return toLobby();
      }
      case 'buy-upgrade': return metaChange((m) => DT.lobby.buy(m, data.id));
      case 'unlock': return metaChange((m) => DT.lobby.unlockCompanion(m, data.id));
      case 'recruit': {
        const r = DT.run.recruit(s, data.kind);
        if (r.needReplace) { app.replaceFor = data.kind; return render(); }
        return afterChoice(r.ok);
      }
      case 'replace': {
        const kind = app.replaceFor;
        app.replaceFor = null;
        return afterChoice(DT.run.recruit(s, kind, data.id).ok);
      }
      case 'cancel-replace': app.replaceFor = null; return render();
      // 맵·노드
      case 'node': return afterChoice(DT.run.enterNode(s, data.id));
      case 'escape': {
        if (!DT.run.canEscape(s)) return flash('보스전에서는 도주할 수 없습니다');
        const pct = Math.round(DT.config.coins.keep[s.screen === 'combat' ? 'combatEscape' : 'mapEscape'] * 100);
        if (!window.confirm(`도주할까요? 이번 판 코인 ${s.runCoins}의 ${pct}%를 가지고 판을 끝냅니다.`)) return;
        app.busy = false;
        return afterChoice(DT.run.escape(s));
      }
      case 'rest': return afterChoice(DT.run.hideoutRest(s));
      case 'laylow': return afterChoice(DT.run.hideoutLayLow(s));
      case 'leave': return afterChoice(DT.run.leave(s));
      case 'buy': {
        if (!DT.run.buyCard(s, +data.i)) return flash('골드가 부족합니다');
        return commit();
      }
      // 덱에서 카드 고르기(강화·제거)
      case 'deck-pick': app.deckPick = { purpose: data.purpose, uid: null }; return render();
      case 'deck-card': if (app.deckPick) app.deckPick.uid = data.uid; return render();
      case 'deck-cancel': app.deckPick = null; return render();
      case 'deck-confirm': {
        const dp = app.deckPick;
        if (!dp || !dp.uid) return;
        app.deckPick = null;
        const ok = dp.purpose === 'upgrade' ? DT.run.upgradeCard(s, dp.uid) : DT.run.removeCard(s, dp.uid);
        if (!ok) return flash(dp.purpose === 'remove' ? '골드가 부족하거나 제거할 수 없습니다' : '강화할 수 없는 카드입니다');
        return afterChoice(true);
      }
      case 'event-opt': {
        if (!DT.run.canChooseEvent(s, +data.i)) return flash('조건이 맞지 않습니다');
        return afterChoice(DT.run.chooseEvent(s, +data.i));
      }
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
      case 'to-lobby': return toLobby();
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

    // 항상 로비에서 시작. 진행 중인 판이 있으면 로비에서 이어하기.
    app.urlSeed = new URLSearchParams(location.search).get('seed');
    const saved = DT.save.loadRun();
    if (saved && saved.screen !== 'runEnd') app.state = saved;
    toLobby();
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
