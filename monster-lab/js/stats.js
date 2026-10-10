// 개체 생성·능력치·특성 뽑기
var ML = window.ML = window.ML || {};

ML.learnsetOf = function (speciesId) {
  var l = ML.species[speciesId].learn;
  return typeof l === 'string' ? ML.learnsets[l] : l;
};

// 그 레벨까지 배운 기술 중 마지막 4개
ML.movesAtLevel = function (speciesId, level) {
  var list = [];
  ML.learnsetOf(speciesId).forEach(function (e) {
    if (e[0] <= level && list.indexOf(e[1]) < 0) list.push(e[1]);
  });
  return list.slice(-4);
};

// 특성 뽑기: 칸마다 등급표에서 등급 → 그 등급에서 균등. 같은 특성은 다시 뽑는다.
ML.rollTraits = function (rng, tableKey, count, have, noBad) {
  var table = Object.assign({}, ML.config.traits.gradeTables[tableKey]);
  if (noBad) delete table.bad;
  var out = [], owned = (have || []).slice();
  for (var i = 0; i < count; i++) {
    for (var tries = 0; tries < 50; tries++) {
      var grade = rng.weighted(table);
      var pool = Object.keys(ML.traits).filter(function (t) {
        return ML.traits[t].grade === grade && owned.indexOf(t) < 0;
      });
      if (!pool.length) continue;
      var t = rng.pick(pool);
      out.push(t); owned.push(t);
      break;
    }
  }
  return out;
};

var monUid = 0;
ML.createMonster = function (speciesId, level, rng, opts) {
  opts = opts || {};
  var r = ML.config.ivRange;
  var iv = function () { return Math.round(rng.range(1 - r, 1 + r) * 1000) / 1000; };
  var mon = {
    uid: 'm' + Date.now().toString(36) + (monUid++).toString(36),
    species: speciesId,
    level: level,
    exp: 0,
    ivs: { hp: iv(), atk: iv(), def: iv(), spd: iv() },
    traits: opts.traits || ML.rollTraits(rng, opts.traitTable || 'low', ML.config.traits.slots),
    moves: ML.movesAtLevel(speciesId, level),
    shiny: !!opts.shiny,
    status: null,
  };
  mon.hp = ML.calcStats(mon).hp;
  return mon;
};

// 특성의 단순 % 효과(공격·방어·속도)를 합산
ML.traitSum = function (mon, key) {
  var sum = 0;
  (mon.traits || []).forEach(function (t) {
    var fx = ML.traits[t] && ML.traits[t].fx;
    if (fx && typeof fx[key] === 'number') sum += fx[key];
  });
  return sum;
};
ML.hasTraitFx = function (mon, key) {
  return (mon.traits || []).some(function (t) { return ML.traits[t] && ML.traits[t].fx[key] !== undefined; });
};
ML.traitFx = function (mon, key) {
  for (var i = 0; i < (mon.traits || []).length; i++) {
    var fx = ML.traits[mon.traits[i]] && ML.traits[mon.traits[i]].fx;
    if (fx && fx[key] !== undefined) return fx[key];
  }
  return undefined;
};

// 능력치 = 종족값 × (1 + 레벨 × k) × 개체값 × (1 + 특성%). 체력은 + 레벨 × 2
ML.calcStats = function (mon) {
  var c = ML.config, sp = ML.species[mon.species], lv = mon.level;
  var mul = 1 + lv * c.statPerLevel, out = {};
  ['hp', 'atk', 'def', 'spd'].forEach(function (k) {
    var v = sp.stats[k] * mul * mon.ivs[k];
    if (k === 'hp') v += lv * c.hpPerLevel;
    else v *= 1 + ML.traitSum(mon, k);
    out[k] = Math.max(1, Math.round(v));
  });
  return out;
};

// 진화할 종(없으면 null)
ML.evolveTarget = function (mon) {
  var ev = ML.species[mon.species].evolve;
  return ev && mon.level >= ev[1] ? ev[0] : null;
};

// ── 경험치·레벨업·진화 ─────────────────────────────
ML.expToNext = function (level) { var e = ML.config.exp; return e.nextBase + level * e.nextPerLevel; };

ML.expYield = function (mon) {
  var sp = ML.species[mon.species], base = ML.config.exp.base;
  return mon.level * (sp.stage ? base[sp.stage] : base[sp.rarity] || base[3]);
};

// 경험치를 더하고 레벨업을 처리. 결과: { gain, from, to, learned: [자동으로 배운 기술], pending: [교체를 골라야 할 기술] }
ML.gainExp = function (mon, amount) {
  var c = ML.config, res = { gain: amount, from: mon.level, to: mon.level, learned: [], pending: [] };
  if (mon.level >= c.maxLevel) return res;
  mon.exp += amount;
  while (mon.level < c.maxLevel && mon.exp >= ML.expToNext(mon.level)) {
    mon.exp -= ML.expToNext(mon.level);
    var before = ML.calcStats(mon).hp;
    mon.level++;
    if (mon.hp > 0) mon.hp = Math.max(1, mon.hp + ML.calcStats(mon).hp - before);   // 쓰러진 몬스터는 그대로
    ML.newMovesAt(mon.species, mon.level).forEach(function (m) {
      if (mon.moves.indexOf(m) >= 0) return;
      if (mon.moves.length < 4) { mon.moves.push(m); res.learned.push(m); }
      else res.pending.push(m);
    });
  }
  if (mon.level >= c.maxLevel) mon.exp = 0;
  res.to = mon.level;
  return res;
};

ML.newMovesAt = function (speciesId, level) {
  return ML.learnsetOf(speciesId).filter(function (e) { return e[0] === level; }).map(function (e) { return e[1]; });
};

// 진화: 종을 바꾸고 늘어난 최대 체력만큼 현재 체력도 늘린다
ML.evolve = function (mon) {
  var to = ML.evolveTarget(mon);
  if (!to) return null;
  var before = ML.calcStats(mon).hp;
  mon.species = to;
  if (mon.hp > 0) mon.hp = Math.max(1, mon.hp + ML.calcStats(mon).hp - before);
  return to;
};

// 전투가 끝난 뒤 내 편(side 0)이 받을 경험치: { uid: 양 }
// config.exp.shareAll이면 파티 전원(안 나온 몬스터·쓰러진 몬스터 포함)이 쓰러뜨린 몬스터의 경험치를 나누지 않고 전부 받는다.
ML.battleExp = function (battle, boost) {
  var out = {}, all = ML.config.exp.shareAll;
  var mine = battle.sides[0].units.map(function (u) { return u.mon.uid; });
  battle.defeated.forEach(function (d) {
    if (d.side !== 1) return;
    var who = all ? mine : d.appeared;
    if (!who.length) return;
    var share = ML.expYield(d.mon) * (ML.config.exp.rate || 1) / (all ? 1 : who.length);
    who.forEach(function (uid) { out[uid] = (out[uid] || 0) + share; });
  });
  battle.sides[0].units.forEach(function (u) {
    if (out[u.mon.uid]) out[u.mon.uid] = Math.max(1, Math.round(out[u.mon.uid] * (1 + ML.traitSum(u.mon, 'exp')) * (boost || 1)));
  });
  return out;
};

// 개체값을 최대치 대비 %로: 0.9(최저) → 0%, 1.1(최고) → 100%
ML.ivPct = function (v) {
  var r = ML.config.ivRange;
  return Math.round(Math.max(0, Math.min(1, (v - (1 - r)) / (2 * r))) * 100);
};
ML.ivTotalPct = function (mon) {
  var k = ['hp', 'atk', 'def', 'spd'];
  return Math.round(k.reduce(function (s, x) { return s + ML.ivPct(mon.ivs[x]); }, 0) / k.length);
};
ML.ivGrade = function (p) { return p >= 90 ? ['최고', 'iv-s'] : p >= 70 ? ['좋음', 'iv-a'] : p >= 40 ? ['보통', 'iv-b'] : ['낮음', 'iv-c']; };

// 이 개체와 같은 종·레벨·특성일 때 능력치가 가질 수 있는 범위(개체값 최저~최고)
ML.statRange = function (mon) {
  var r = ML.config.ivRange, lo = {}, hi = {};
  ['hp', 'atk', 'def', 'spd'].forEach(function (k) { lo[k] = 1 - r; hi[k] = 1 + r; });
  return {
    min: ML.calcStats(Object.assign({}, mon, { ivs: lo })),
    max: ML.calcStats(Object.assign({}, mon, { ivs: hi })),
    now: ML.calcStats(mon),
  };
};
