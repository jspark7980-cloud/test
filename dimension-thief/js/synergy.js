// 파티 시너지(v4 3단계). 살아 있는 아군(도둑 포함)의 역할·출신으로 판정한다. 수치는 config.synergy.
//  ironwall 철벽(탱커+힐러) · focus 집중포화(딜러 2) · perfect 완벽한 파티(탱커+딜러+힐러/지원) · homeland 고향(같은 차원 출신 동료 2+)
window.DT = window.DT || {};

(function () {
  const S = (DT.synergy = {});
  const cfg = () => DT.config.synergy;

  S.INFO = {
    ironwall: { name: '철벽', icon: '🧱', desc: () => `탱커 + 힐러: 아군이 받는 피해 −${Math.round((1 - cfg().ironwall.takenMult) * 100)}%` },
    focus: { name: '집중포화', icon: '🎯', desc: () => `딜러 2명: 이번 라운드에 다른 아군이 때린 적에게 피해 +${Math.round((cfg().focus.dealtMult - 1) * 100)}%` },
    perfect: { name: '완벽한 파티', icon: '⭐', desc: () => `탱커 + 딜러 + 힐러/지원: 드로우 +${cfg().perfect.draw}` },
    homeland: { name: '고향', icon: '🏠', desc: (o) => `${DT.data.dimensions[o].name} 출신 동료 2명 이상: 이 차원에서 그 동료들 피해 +${Math.round(cfg().homeland.mult * 100)}% · 받는 피해 −${Math.round(cfg().homeland.mult * 100)}%` },
  };

  // 지금 켜진 시너지 [{ id, origin?, active }] — homeland 는 차원이 달라도 표시(active 로 구분)
  S.list = function (state) {
    const living = DT.party.living(state);
    const roles = living.map((a) => (a.id === 'player' ? cfg().thiefRole : a.role));
    const n = (r) => roles.filter((x) => x === r).length;
    const out = [];
    if (n('tank') && n('healer')) out.push({ id: 'ironwall', active: true });
    if (n('dealer') >= 2) out.push({ id: 'focus', active: true });
    if (n('tank') && n('dealer') && (n('healer') || n('support'))) out.push({ id: 'perfect', active: true });
    const origins = {};
    DT.party.companions(state).forEach((c) => {
      const d = DT.data.dimensions[c.origin];
      if (d && !d.neutral) origins[c.origin] = (origins[c.origin] || 0) + 1;
    });
    for (const [o, k] of Object.entries(origins)) if (k >= 2) out.push({ id: 'homeland', origin: o, active: o === state.dimension });
    return out;
  };
  S.has = (state, id) => S.list(state).some((x) => x.id === id && x.active);
  const homeOf = function (state, a) {
    if (!a || a.id === 'player' || !DT.state.isAlly(a.id)) return false;
    return S.list(state).some((x) => x.id === 'homeland' && x.active && a.origin === x.origin);
  };

  // 이번 라운드에 누가 어느 적을 때렸는지(집중포화)
  S.recordHit = function (state, srcId, tgtId) {
    if (!DT.state.isAlly(srcId) || DT.state.isAlly(tgtId)) return;
    state.roundHits = state.roundHits || {};
    const list = state.roundHits[tgtId] = state.roundHits[tgtId] || [];
    if (!list.includes(srcId)) list.push(srcId);
  };

  S.dealtMult = function (state, srcId, tgtId) {
    if (!DT.state.isAlly(srcId) || !tgtId || DT.state.isAlly(tgtId) || state.screen !== 'combat') return 1;
    let m = 1;
    const hits = (state.roundHits && state.roundHits[tgtId]) || [];
    if (hits.some((id) => id !== srcId) && S.has(state, 'focus')) m *= cfg().focus.dealtMult;
    if (homeOf(state, DT.state.actor(state, srcId))) m *= 1 + cfg().homeland.mult;
    return m;
  };
  S.takenMult = function (state, tgtId) {
    if (!tgtId || !DT.state.isAlly(tgtId) || state.screen !== 'combat') return 1;
    let m = 1;
    if (S.has(state, 'ironwall')) m *= cfg().ironwall.takenMult;
    if (homeOf(state, DT.state.actor(state, tgtId))) m *= 1 - cfg().homeland.mult;
    return m;
  };
  S.drawBonus = (state) => (S.has(state, 'perfect') ? cfg().perfect.draw : 0);
})();
