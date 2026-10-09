// 유물: 판 동안 유지되는 파티 효과. 목록은 data/relics.js, 수치는 config.relics.
//
// 효과(fx) 키 — 처리 위치
//   firstTurnEnergy 첫 턴 에너지 · everyThirdTurn 3턴마다 에너지·드로우 · energyPerTurn 매 턴 에너지(combat.startPlayerTurn)
//   allyCombatBlock 전투 시작 동료 방어도(combat.start)   firstPilferFree 매 턴 첫 슬쩍 0코스트(combat.costFor)
//   heistThresholdAdd 강탈 기준 +(combat.heistThreshold)  noNoise 변이 시 잡음 없음(combat.mutate)
//   winHeal 승리 회복 · goldMult 전투 골드 배율(run.resolve)  ambushMult 추격대 확률 배율(run.enterNode)
//   instabilityAdd 차원 불안정 +(run.instability)
window.DT = window.DT || {};

(function () {
  const RL = (DT.relics = {});
  const cfg = () => DT.config.relics;

  RL.GRADES = ['common', 'rare', 'legend'];
  RL.gradeName = { common: '일반', rare: '희귀', legend: '전설' };
  RL.def = (id) => {
    const d = DT.data.relics[id];
    if (!d) throw new Error('알 수 없는 유물: ' + id);
    return d;
  };
  RL.owned = (state) => state.relics || (state.relics = []);
  RL.has = (state, id) => RL.owned(state).includes(id);

  // 가진 유물들의 효과 합
  RL.fx = function (state, key) {
    let sum = 0;
    for (const id of (state.relics || [])) {
      const v = RL.def(id).fx[key];
      if (typeof v === 'number') sum += v;
    }
    return sum;
  };

  // 아직 없는 유물 중에서 등급 확률(source: 'elite' | 'event' | 'market')로 1개. 남은 게 없으면 null
  RL.roll = function (state, source, grades) {
    const left = Object.keys(DT.data.relics).filter((id) => !RL.has(state, id) && (!grades || grades.includes(RL.def(id).grade)));
    if (!left.length) return null;
    const w = cfg().grades[source] || cfg().grades.event;
    const pairs = RL.GRADES.filter((g) => left.some((id) => RL.def(id).grade === g)).map((g) => [g, w[g] || 0]).filter(([, v]) => v > 0);
    const grade = pairs.length ? DT.map.weighted(state, pairs) : RL.def(left[0]).grade;
    return DT.rng.pick(state, left.filter((id) => RL.def(id).grade === grade));
  };

  RL.gain = function (state, id) {
    if (!id || RL.has(state, id)) return false;
    RL.owned(state).push(id);
    const d = RL.def(id);
    DT.state.log(state, `🏺 유물 획득: ${d.icon} ${d.name} — ${d.desc}`);
    DT.state.emit(state, { type: 'relic', id });
    return true;
  };

  // 출발 시 '유물 수집가' 후보(일반·희귀에서 n개, 겹치지 않게)
  RL.startOptions = function (state, n) {
    const pool = Object.keys(DT.data.relics).filter((id) => cfg().startGrades.includes(RL.def(id).grade));
    return DT.rng.shuffle(state, pool).slice(0, n);
  };

  RL.price = (id) => cfg().marketPrice[RL.def(id).grade];
})();
