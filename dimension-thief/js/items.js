// 아이템: 장착, 가방·안전 주머니, 소모품 사용, 드롭, 판 종료 시 분실.
//
// 장비 효과(fx) 키 — 처리 위치
//   maxHp 최대 체력(장착 시)            dmgAdd 공격 피해 +(effects.calcDamage)
//   foreignDmgMult 다른 차원 적 피해 배율 damageTakenMult 받는 피해 배율(calcDamage)
//   companionDmg 동료 공격 피해 +(파티)  poisonOnAttack 공격 시 독(damage 효과)
//   onStealDamage / stolenFree 슬쩍(steal 효과)   copyTwice 복제 2회(copy 효과)
//   blockCardBonus 카드 방어도 +(block 효과)        killEnergy 처치 시 에너지(applyDamage)
//   reflect 피해 반사 · cheatDeath 치명 피해 버팀(applyDamage)
//   heistThreshold 강탈 기준(combat.belowHeistLine)  combatBlock 전투 시작 방어도(combat.start)
//   firstTurnDraw / handMax / drawBonus 도둑 드로우·손패(combat)  turnEndHeal 턴 종료 회복(combat)
//   firstAttackTwice 매 턴 첫 공격 2회(combat)  stealthFirstTurn 첫 턴 대상 제외(ai)
//   coinMult / greed / wantedGold 코인·전리품·골드(run)
//   ignoreInstability / instabilityLimit 차원 불안정(G단계)
window.DT = window.DT || {};

(function () {
  const I = (DT.items = {});
  const cfg = () => DT.config.items;
  const log = (s, m) => DT.state.log(s, m);
  const SLOTS = ['weapon', 'armor', 'accessory'];
  I.SLOTS = SLOTS;
  I.slotName = { weapon: '무기', armor: '방어구', accessory: '장신구' };
  I.gradeName = { common: '일반', rare: '희귀', hero: '영웅', legend: '전설' };
  I.GRADES = ['common', 'rare', 'hero', 'legend'];

  I.def = (id) => {
    const d = DT.data.items[id];
    if (!d) throw new Error('알 수 없는 아이템: ' + id);
    return d;
  };
  I.make = (state, id) => ({ uid: 'i' + state.nextItemId++, id });

  // ── 장비 효과 ──
  // 대장간 강화(+1~+3)는 수치형 효과만 키운다: 값 × (1 + 0.5 × 강화)
  const SCALABLE = ['maxHp', 'dmgAdd', 'onStealDamage', 'poisonOnAttack', 'foreignDmgMult', 'combatBlock',
    'blockCardBonus', 'reflect', 'turnEndHeal', 'coinMult', 'wantedGold', 'companionDmg'];
  I.forgeable = (id) => {
    const fx = I.def(id).fx || {};
    return I.def(id).kind === 'equip' && Object.keys(fx).some((k) => SCALABLE.includes(k));
  };
  I.itemFx = function (it, key) {
    const v = I.def(it.id).fx && I.def(it.id).fx[key];
    if (typeof v !== 'number') return 0;
    if (!it.plus || !SCALABLE.includes(key)) return v;
    const scaled = v * (1 + DT.config.forge.perPlus * it.plus);
    return Number.isInteger(v) ? Math.round(scaled) : Math.round(scaled * 100) / 100;
  };
  const FX_NAME = { maxHp: '최대 체력', dmgAdd: '공격 피해', onStealDamage: '슬쩍 피해', poisonOnAttack: '독',
    foreignDmgMult: '차원 피해', combatBlock: '시작 방어도', blockCardBonus: '카드 방어도', reflect: '반사',
    turnEndHeal: '턴 회복', coinMult: '코인', wantedGold: '수배 골드', companionDmg: '동료 피해' };
  const fmt = (v) => (Number.isInteger(v) ? '+' + v : '+' + Math.round(v * 100) + '%');
  // 강화(+n) 적용 수치 설명(예: "공격 피해 +1 → +2"). plus 를 주면 그 단계 기준
  I.forgeNote = function (it, plus) {
    const p = plus === undefined ? it.plus : plus;
    if (!p) return '';
    const fx = I.def(it.id).fx || {};
    const at = { id: it.id, plus: p };
    return Object.keys(fx).filter((k) => SCALABLE.includes(k))
      .map((k) => `${FX_NAME[k]} ${fmt(fx[k])}→${fmt(I.itemFx(at, k))}`).join(', ');
  };

  I.equipOf = (actor) => actor.equip || (actor.equip = { weapon: null, armor: null, accessory: null });
  I.fx = function (actor, key) {
    if (!actor || !actor.equip) return 0;
    let sum = 0;
    for (const it of Object.values(actor.equip)) if (it) sum += I.itemFx(it, key);
    return sum;
  };
  // 파티 단위 효과: 여러 명이 장착해도 가장 큰 값 하나만
  I.partyFx = function (state, key) {
    return Math.max(0, ...DT.party.living(state).map((a) => I.fx(a, key)));
  };

  // ── 가방·주머니 ──
  I.pocketCap = (state) => state.pocketCap || cfg().pocketBase;
  I.bagFree = (state) => cfg().bag - state.bag.length;

  I.addToBag = function (state, item) {
    if (I.bagFree(state) <= 0) return false;
    state.bag.push(item);
    return true;
  };

  const findIn = (list, uid) => list.findIndex((x) => x.uid === uid);

  function applyMaxHp(actor, item, sign) {
    const v = I.itemFx(item, 'maxHp');
    if (!v) return;
    actor.maxHp += sign * v;
    actor.hp = sign > 0 ? actor.hp + v : Math.max(1, Math.min(actor.hp, actor.maxHp));
  }

  // 가방의 장비를 아군에게 장착(같은 칸의 장비는 가방으로)
  I.equip = function (state, uid, actorId) {
    if (state.screen === 'combat') return '전투 중에는 장비를 바꿀 수 없습니다';
    const i = findIn(state.bag, uid);
    const a = DT.state.actor(state, actorId);
    if (i < 0 || !a || a.dead) return '장착할 수 없습니다';
    const d = I.def(state.bag[i].id);
    if (d.kind !== 'equip') return '장비가 아닙니다';
    const eq = I.equipOf(a);
    const item = state.bag.splice(i, 1)[0];
    const old = eq[d.slot];
    if (old) { applyMaxHp(a, old, -1); state.bag.push(old); }
    eq[d.slot] = item;
    applyMaxHp(a, item, 1);
    log(state, `${a.name}: ${d.name} 장착`);
    return null;
  };

  // 출발 준비: 가방을 거치지 않고 바로 장착
  I.equipDirect = function (actor, item) {
    const d = I.def(item.id);
    if (d.kind !== 'equip') return false;
    const eq = I.equipOf(actor);
    if (eq[d.slot]) return false;
    eq[d.slot] = item;
    applyMaxHp(actor, item, 1);
    return true;
  };

  I.unequip = function (state, actorId, slot) {
    if (state.screen === 'combat') return '전투 중에는 장비를 바꿀 수 없습니다';
    const a = DT.state.actor(state, actorId);
    const it = a && a.equip && a.equip[slot];
    if (!it) return '빈 칸입니다';
    if (I.bagFree(state) <= 0) return '가방이 가득 찼습니다';
    applyMaxHp(a, it, -1);
    a.equip[slot] = null;
    state.bag.push(it);
    return null;
  };

  I.toPocket = function (state, uid) {
    const i = findIn(state.bag, uid);
    if (i < 0) return '가방에 없습니다';
    if (state.pocket.length >= I.pocketCap(state)) return '안전 주머니가 가득 찼습니다';
    state.pocket.push(state.bag.splice(i, 1)[0]);
    return null;
  };

  I.fromPocket = function (state, uid) {
    const i = findIn(state.pocket, uid);
    if (i < 0) return '주머니에 없습니다';
    if (I.bagFree(state) <= 0) return '가방이 가득 찼습니다';
    state.bag.push(state.pocket.splice(i, 1)[0]);
    return null;
  };

  I.discard = function (state, uid) {
    for (const list of [state.bag, state.pocket]) {
      const i = findIn(list, uid);
      if (i >= 0) { const it = list.splice(i, 1)[0]; log(state, `${I.def(it.id).name}을(를) 버렸다.`); return null; }
    }
    return '아이템이 없습니다';
  };

  // 떠나는 동료의 장비는 가방으로(자리가 없으면 잃는다)
  I.returnEquipment = function (state, actor) {
    const lost = [];
    for (const slot of SLOTS) {
      const it = actor.equip && actor.equip[slot];
      if (!it) continue;
      actor.equip[slot] = null;
      if (!I.addToBag(state, it)) lost.push(it);
    }
    lost.forEach((it) => log(state, `가방이 가득 차 ${I.def(it.id).name}을(를) 잃었다.`));
  };

  // ── 소모품 ──
  const findItem = (state, uid) => {
    for (const list of [state.bag, state.pocket]) {
      const i = findIn(list, uid);
      if (i >= 0) return { list, i, item: list[i] };
    }
    return null;
  };

  // 사용할 수 있는 대상 목록(UI용)
  I.targets = function (state, uid) {
    const f = findItem(state, uid);
    if (!f) return [];
    const u = I.def(f.item.id).use;
    const inCombat = state.screen === 'combat';
    if (u.target === 'ally') return DT.party.living(state);
    if (u.target === 'enemy') return inCombat ? DT.combat.living(state) : [];
    if (u.target === 'deadAlly') return inCombat ? state.allies.filter((a) => a.dead) : (state.fallen || []);
    return [];
  };

  I.canUse = function (state, uid) {
    const f = findItem(state, uid);
    if (!f) return '아이템이 없습니다';
    const d = I.def(f.item.id);
    if (d.kind !== 'consumable') return '사용할 수 없는 아이템';
    const u = d.use;
    if (u.lockedUntil && !DT.config.builtStages.includes(u.lockedUntil)) return `${u.lockedUntil}단계부터 사용할 수 있습니다`;
    const inCombat = state.screen === 'combat';
    if (!u.where.includes(inCombat ? 'combat' : 'map')) return inCombat ? '맵에서만 쓸 수 있습니다' : '전투 중에만 쓸 수 있습니다';
    if (inCombat && (state.phase !== 'player' || state.result)) return '내 턴에만 쓸 수 있습니다';
    if (u.effect.escape && !DT.run.canEscape(state)) return '보스전에서는 쓸 수 없습니다';
    if (u.target !== 'none' && !I.targets(state, uid).length) return '대상이 없습니다';
    if (u.effect.revive && !inCombat && DT.party.slotsFree(state) <= 0) return '동료 자리가 없습니다';
    return null;
  };

  const USE = {
    heal(state, v, t) { DT.effects.heal(state, t.id, v); },
    healPct(state, v, t) { DT.effects.heal(state, t.id, Math.round(t.maxHp * v)); },
    cancelAction(state, v, t) { t.skipTurn = true; log(state, `${t.name}이(가) 연기에 휩싸였다! 이번 턴 행동 불가`); },
    damageAll(state, v) { DT.combat.living(state).forEach((e) => DT.effects.applyDamage(state, e.id, v)); },
    energy(state, v) { state.player.energy += v; },
    freePilfer(state) { state.turnFlags.freePilfer = true; },
    wanted(state, v) { state.wanted = Math.max(0, state.wanted + v); },
    instability(state, v) { state.instabilityMod = (state.instabilityMod || 0) + v; },
    revive(state, v, t) {
      if (state.screen === 'combat') { t.dead = false; t.hp = Math.max(1, Math.round(t.maxHp * v)); t.statuses = {}; return; }
      state.fallen = state.fallen.filter((a) => a.id !== t.id);
      t.dead = false; t.hp = Math.max(1, Math.round(t.maxHp * v));
      state.allies.push(t);
    },
    escape(state) { DT.run.endRun(state, 'scroll'); },
  };

  I.use = function (state, uid, targetId) {
    const why = I.canUse(state, uid);
    if (why) return why;
    const f = findItem(state, uid);
    const d = I.def(f.item.id);
    const u = d.use;
    let t = null;
    if (u.target !== 'none') {
      t = I.targets(state, uid).find((x) => x.id === targetId);
      if (!t) return '대상을 고르세요';
    }
    f.list.splice(f.i, 1);
    log(state, `🎒 ${d.name} 사용${t ? ` → ${t.name}` : ''}`);
    DT.state.emit(state, { type: 'item', id: f.item.id, target: t ? t.id : null });
    for (const [k, v] of Object.entries(u.effect)) if (USE[k]) USE[k](state, v, t);
    if (state.screen === 'combat') DT.combat.checkEnd(state);
    return null;
  };

  // ── 드롭 ──
  function gradeWeights(state, source) {
    const base = Object.assign({}, cfg().grades[source] || cfg().grades.normal);
    if (state.floor >= cfg().deepFloor) {
      for (const [g, d] of Object.entries(cfg().deepShift)) base[g] = Math.max(0, base[g] + d);
    }
    return Object.entries(base);
  }

  function pool(state, kind, grade, source) {
    return Object.entries(DT.data.items).filter(([, d]) => {
      if (d.kind !== kind || d.grade !== grade) return false;
      // 아직 없는 단계의 기능에 쓰는 소모품은 나오지 않음(예: 차원 안정제는 G단계부터)
      if (d.use && d.use.lockedUntil && !DT.config.builtStages.includes(d.use.lockedUntil)) return false;
      if (kind !== 'loot') return true;
      if (d.boss) return source === 'boss' && d.boss.includes(state.dimension);
      return !d.dims || d.dims.includes(state.dimension);
    }).map(([id]) => id);
  }

  // 상점용: 종류·등급에 맞는 아이템 id 목록(전리품 제외, 아직 못 쓰는 소모품 제외)
  I.shopPool = function (kind, grade) {
    return Object.entries(DT.data.items).filter(([, d]) => d.kind === kind && d.grade === grade
      && !(d.use && d.use.lockedUntil && !DT.config.builtStages.includes(d.use.lockedUntil))).map(([id]) => id);
  };

  // 등급을 굴리고, 그 등급에 없으면 한 단계씩 낮춰 찾는다
  I.roll = function (state, kind, source) {
    let gi = I.GRADES.indexOf(DT.map.weighted(state, gradeWeights(state, source)));
    for (; gi >= 0; gi--) {
      const p = pool(state, kind, I.GRADES[gi], source);
      if (p.length) return I.make(state, DT.rng.pick(state, p));
    }
    for (const g of I.GRADES) {
      const p = pool(state, kind, g, source);
      if (p.length) return I.make(state, DT.rng.pick(state, p));
    }
    return null;
  };

  I.rollBossLoot = function (state) {
    const p = Object.entries(DT.data.items).filter(([, d]) => d.boss && d.boss.includes(state.dimension)).map(([id]) => id);
    return p.length ? I.make(state, DT.rng.pick(state, p)) : I.roll(state, 'loot', 'boss');
  };

  // 전투 승리 드롭. { got: [아이템], lost: [가방이 가득 차 못 챙긴 아이템] }
  I.dropsFor = function (state, combatKind) {
    const D = cfg().drop;
    const items = [];
    if (combatKind === 'boss') {
      items.push(I.roll(state, 'equip', 'boss'), I.rollBossLoot(state));
    } else if (combatKind === 'elite') {
      items.push(I.roll(state, 'equip', 'elite'));
      if (DT.rng.next(state) < D.elite.extraChance) items.push(I.roll(state, DT.map.weighted(state, Object.entries(D.elite.kinds)), 'elite'));
    } else if (DT.rng.next(state) < D.normal.chance) {
      items.push(I.roll(state, DT.map.weighted(state, Object.entries(D.normal.kinds)), 'normal'));
    }
    // 탐욕의 목걸이: 전리품 2배
    if (I.partyFx(state, 'greed')) {
      items.filter((it) => it && I.def(it.id).kind === 'loot').forEach((it) => items.push(I.make(state, it.id)));
    }
    const got = [], lost = [];
    for (const it of items.filter(Boolean)) (I.addToBag(state, it) ? got : lost).push(it);
    got.forEach((it) => log(state, `🎒 ${I.def(it.id).name} 획득`));
    lost.forEach((it) => log(state, `가방이 가득 차 ${I.def(it.id).name}을(를) 두고 왔다.`));
    return { got, lost };
  };

  // 암시장 소모품 진열
  I.marketStock = function (state) {
    const out = [];
    for (let k = 0; k < cfg().marketConsumables; k++) {
      const it = I.roll(state, 'consumable', 'normal');
      if (it) out.push({ item: it, price: cfg().marketPrice[I.def(it.id).grade], sold: false });
    }
    return out;
  };

  // ── 판 종료: 분실 규칙 ──
  // how: mapEscape·scroll·clear → 전부 보존 / combatEscape → 가방에서 무작위 1개 분실 / death → 가방·장착 장비 분실(주머니만 보존)
  I.settle = function (state, how) {
    const equipped = [];
    for (const a of [state.player, ...state.allies, ...(state.fallen || [])]) {
      for (const slot of SLOTS) if (a.equip && a.equip[slot]) equipped.push(a.equip[slot]);
    }
    let kept = [], lost = [];
    if (how === 'death') {
      kept = state.pocket.slice();
      lost = state.bag.concat(equipped);
    } else if (how === 'combatEscape') {
      const bag = state.bag.slice();
      if (bag.length) lost.push(bag.splice(DT.rng.int(state, 0, bag.length - 1), 1)[0]);
      kept = bag.concat(equipped, state.pocket);
    } else {
      kept = state.bag.concat(equipped, state.pocket);
    }
    return { kept: kept.map((it) => ({ uid: it.uid, id: it.id, plus: it.plus || 0 })), lost: lost.map((it) => ({ uid: it.uid, id: it.id })) };
  };
})();
