// 동료 뽑기·보유 목록(로스터)·돌파·경험치. 수치는 config.gacha · config.growth.
// meta.roster = { 동료 종류: { bt: 돌파 단계, lv: 레벨, xp: 경험치 } }   (기본 동료는 항목이 없어도 보유)
// meta.gacha  = { rng, pity: 마지막 전설 이후 뽑은 수, pulls: 누적 }
window.DT = window.DT || {};

(function () {
  const G = (DT.gacha = {});
  const cfg = () => DT.config.gacha;
  const GR = () => DT.config.growth;
  const def = (k) => DT.data.companions[k];

  G.GRADES = ['common', 'rare', 'hero', 'legend'];
  G.gradeName = { basic: '기본', common: '일반', rare: '희귀', hero: '영웅', legend: '전설' };
  G.pool = (grade) => Object.keys(DT.data.companions).filter((k) => def(k).grade === grade && !def(k).secret);

  // ── 보유 ──
  G.owned = (meta, kind) => def(kind).grade === 'basic' || !!(meta.roster && meta.roster[kind]);
  G.entry = function (meta, kind) {
    const e = (meta.roster && meta.roster[kind]) || {};
    return { bt: e.bt || 0, lv: e.lv || 1, xp: e.xp || 0 };
  };
  G.ensure = function (meta, kind) {
    meta.roster = meta.roster || {};
    return (meta.roster[kind] = meta.roster[kind] || { bt: 0, lv: 1, xp: 0 });
  };
  G.unlockSecret = function (meta, kind) {
    if (meta.roster && meta.roster[kind]) return false;
    G.ensure(meta, kind);
    return true;
  };

  // ── 뽑기 ──
  G.state = function (meta) {
    if (!meta.gacha) meta.gacha = { rng: DT.rng.hashSeed('gacha' + Date.now()), pity: 0, pulls: 0 };
    return meta.gacha;
  };
  G.pityLeft = (meta) => cfg().pity - (G.state(meta).pity || 0);

  function rollGrade(meta) {
    const st = G.state(meta);
    st.pity = (st.pity || 0) + 1;
    st.pulls = (st.pulls || 0) + 1;
    let grade = st.pity >= cfg().pity ? 'legend' : DT.map.weighted(st, Object.entries(cfg().rates));
    if (grade === 'legend') st.pity = 0;
    return grade;
  }

  // 결과 하나를 보유 목록에 반영: 새 동료 / 돌파 / 돌파가 다 차면 코인 환급
  function grant(meta, kind) {
    const isNew = !G.owned(meta, kind);
    const e = G.ensure(meta, kind);
    let refund = 0;
    if (!isNew) {
      if (e.bt < cfg().maxBreak) e.bt++;
      else { refund = cfg().refund[def(kind).grade]; meta.coins += refund; }
    }
    return { kind, grade: def(kind).grade, isNew, bt: e.bt, refund };
  }

  G.cost = (n) => (n >= 10 ? cfg().cost10 : cfg().cost1 * n);
  G.canPull = (meta, n) => meta.coins >= G.cost(n);

  // n = 1 또는 10. 결과 배열(실패하면 null)
  G.pull = function (meta, n) {
    if (!G.canPull(meta, n)) return null;
    meta.coins -= G.cost(n);
    const st = G.state(meta);
    const grades = [];
    for (let i = 0; i < n; i++) grades.push(rollGrade(meta));
    // 10회: 희귀 이상이 없으면 마지막 1명을 희귀로
    if (n >= 10) {
      const min = G.GRADES.indexOf(cfg().tenGuarantee);
      if (!grades.some((g) => G.GRADES.indexOf(g) >= min)) grades[grades.length - 1] = cfg().tenGuarantee;
    }
    return grades.map((g) => grant(meta, DT.rng.pick(st, G.pool(g))));
  };

  // ── 능력치 ──
  // 체력 배율: 돌파 +10%/단계, 레벨 +3%/레벨
  G.hpMult = (e) => (1 + cfg().breakStat * e.bt) * (1 + GR().hpPerLevel * (e.lv - 1));
  G.dmgMult = (e) => 1 + cfg().breakStat * e.bt;
  G.abilityValue = function (kind, bt) {
    const a = def(kind).ability;
    return a ? a.base + a.per * (bt || 0) : 0;
  };

  // ── 경험치 ──
  G.xpToNext = (lv) => lv * GR().xpPerLevel;
  // 경험치를 더하고 오른 레벨 목록을 돌려준다
  G.addXp = function (meta, kind, xp) {
    const e = G.ensure(meta, kind);
    const ups = [];
    e.xp += xp;
    while (e.lv < GR().maxLevel && e.xp >= G.xpToNext(e.lv)) {
      e.xp -= G.xpToNext(e.lv);
      e.lv++;
      ups.push(e.lv);
    }
    if (e.lv >= GR().maxLevel) e.xp = 0;
    return ups;
  };

  // 레벨에 따른 덱: 마일스톤마다 대표 카드 추가 / 카드 강화
  G.deckFor = function (kind, lv, baseDeck) {
    const d = def(kind);
    const ids = (baseDeck || d.deck).slice();
    let upgrades = 0;
    for (const [at, m] of Object.entries(GR().milestones)) {
      if (lv < +at) continue;
      if (m.add && d && d.sig) for (let i = 0; i < m.add; i++) ids.push(d.sig);
      if (m.upgrade === 'all') upgrades = Infinity;
      else if (m.upgrade) upgrades += m.upgrade;
    }
    return ids.map((id, i) => ({ id, up: i < upgrades && DT.cards.canUpgrade({ id }) ? 1 : 0 }));
  };
  G.milestoneText = function (lv) {
    const m = GR().milestones[lv];
    if (!m) return '';
    return m.add ? '대표 카드 +1' : m.upgrade === 'all' ? '덱 전체 강화' : `카드 ${m.upgrade}장 강화`;
  };
})();
