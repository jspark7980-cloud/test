// 전투 진행(DOM 없음 — tools/sim.js에서도 그대로 쓴다)
// 3대3: 한 마리씩 출전, 교체도 1턴. 쓰러지면 다음 몬스터를 고른다(턴 소모 없음).
var ML = window.ML = window.ML || {};

ML.STATUS_NAMES = { burn: '화상', para: '마비', sleep: '수면', poison: '독' };
ML.STAT_NAMES = { atk: '공격', def: '방어', spd: '속도', eva: '회피' };

ML.Battle = function (opts) {
  this.rng = opts.rng;
  this.turnNo = 0;
  this.log = [];
  this.over = false;
  this.winner = null;          // 0 = 내 편, 1 = 상대
  this.field = { rain: 0 };
  var self = this;
  this.sides = [opts.mine, opts.foe].map(function (mons, i) {
    return { idx: i, units: mons.map(function (m) { return self.makeUnit(m, i); }), active: 0 };
  });
  this.appeared = [{}, {}];      // 한 번이라도 나온 몬스터(uid) — 경험치 분배용
  this.defeated = [];            // { side, mon, appeared: [uid…] } 쓰러진 순서
  this.needReplace = [false, false];
  this.sides.forEach(function (s) { self.enter(s.idx, s.active, true); });
};

var B = ML.Battle.prototype;

B.makeUnit = function (mon, side) {
  return {
    mon: mon, side: side, stats: ML.calcStats(mon),
    stages: { atk: 0, def: 0, spd: 0, eva: 0 },
    sealed: {}, lastMove: null, endureUsed: false, reviveUsed: false,
    form: 'day', statusTurns: 0, healUses: 0,
  };
};

B.name = function (u) {
  return (u.side === 0 ? '' : '상대 ') + ML.species[u.mon.species].name;
};
B.say = function (msg, kind) { this.log.push({ msg: ML.josa(msg), kind: kind || '' }); };
B.active = function (side) { var s = this.sides[side]; return s.units[s.active]; };
B.ability = function (u) { var a = ML.abilities[ML.species[u.mon.species].ability]; return a && a.key; };

B.alive = function (side) { return this.sides[side].units.filter(function (u) { return u.mon.hp > 0; }); };
// 교체 가능한 대기 몬스터(살아 있고 지금 나와 있지 않음)의 번호
B.bench = function (side) {
  var s = this.sides[side];
  return s.units.map(function (u, i) { return i; }).filter(function (i) { return i !== s.active && s.units[i].mon.hp > 0; });
};

B.enter = function (side, idx, first) {
  var s = this.sides[side], u = s.units[idx];
  s.active = idx;
  this.appeared[side][u.mon.uid] = true;
  this.log.push({ swap: side, to: idx });
  if (!first) this.say((side === 0 ? '가랏, ' : '상대가 ') + ML.species[u.mon.species].name + (side === 0 ? '!' : '을(를) 내보냈다!'), 'switch');
  this.onEnter(u);
};

// 나가는 몬스터는 능력 단계·봉인이 풀린다(상태 이상은 남는다)
B.leave = function (u) {
  u.stages = { atk: 0, def: 0, spd: 0, eva: 0 };
  u.sealed = {};
  u.lastMove = null;
};

B.doSwitch = function (side, idx) {
  var out = this.active(side);
  this.say((side === 0 ? '돌아와, ' : '상대가 ') + ML.species[out.mon.species].name + (side === 0 ? '!' : '을(를) 불러들였다.'), 'switch');
  this.leave(out);
  this.enter(side, idx);
};

// 쓰러진 뒤 다음 몬스터 내보내기(턴 소모 없음)
B.replace = function (side, idx) {
  if (!this.needReplace[side]) return;
  this.needReplace[side] = false;
  this.enter(side, idx);
};

B.onEnter = function (u) {
  if (this.ability(u) === 'rain') {
    this.field.rain = ML.config.ability.rainTurns;
    this.say('비가 내리기 시작했다!', 'field');
  }
  if (u.mon.status === 'sleep' && !u.statusTurns) u.statusTurns = 1;
};

// ── 수치 계산 ──────────────────────────────────────────
B.stageMul = function (n) {
  var k = ML.config.stagePerStep;
  return n >= 0 ? 1 + k * n : 1 / (1 + k * -n);
};

B.effSpeed = function (u) {
  var c = ML.config, v = u.stats.spd * this.stageMul(u.stages.spd);
  if (u.mon.status === 'para') v *= c.status.para.spdMul;
  if (this.ability(u) === 'dayNight' && u.form === 'night') v *= 1 + c.ability.nightSpdBonus;
  return v;
};

B.evasion = function (u) {
  var c = ML.config, e = u.stages.eva * c.evasionPerStep;
  if (this.ability(u) === 'evasion') e += c.ability.baseEvasion;
  return Math.max(0, Math.min(0.5, e));
};

B.calcDamage = function (att, def, move, forecast) {
  var c = ML.config, d = c.damage, rng = this.rng;
  var atk = att.stats.atk * this.stageMul(att.stages.atk);
  var dfn = def.stats.def * this.stageMul(def.stages.def);
  var dmg = move.power * (atk / dfn) * (d.lvBase + att.mon.level * d.lvScale) * d.scale;

  var defEls = ML.species[def.mon.species].els;
  var attEls = ML.species[att.mon.species].els;
  var type = ML.typeMultiplier(move.el, defEls);
  if (type < 1 && ML.hasTraitFx(att.mon, 'ignoreResist')) {
    // 상성 파괴자: 불리 배율만 지운다(두 속성이면 유리 배율은 남긴다)
    type = 1;
    defEls.forEach(function (e) { if (ML.elements.beats[move.el] === e) type *= c.typeAdvantage; });
  }
  dmg *= type;
  if (attEls.indexOf(move.el) >= 0) dmg *= c.stab + (ML.hasTraitFx(att.mon, 'stabBonus') ? c.traitStabBonus : 0);

  // 공격 보정
  var atkMod = 1;
  if (att.mon.status === 'burn') atkMod *= c.status.burn.atkMul;
  (att.mon.traits || []).forEach(function (t) {
    var l = ML.traits[t].fx.lowHpAtk;
    if (l && att.mon.hp / att.stats.hp <= l.below) atkMod *= 1 + l.bonus;
  });
  if (this.sideHasTeamBuff(att.side)) atkMod *= 1 + c.ability.teamAtkBuff;
  if (this.field.rain > 0 && (move.el === 'water' || move.el === 'thunder')) atkMod *= 1 + c.ability.rainBonus;
  if (this.ability(att) === 'dayNight') {
    if (att.form === 'day' && move.el === 'fire') atkMod *= 1 + c.ability.dayNightBonus;
    if (att.form === 'night' && move.el === 'shadow') atkMod *= 1 + c.ability.dayNightBonus;
  }
  dmg *= atkMod;
  if (this.ability(def) === 'damageReduce') dmg *= 1 - c.ability.damageReduce;

  if (forecast) return { dmg: dmg, type: type };

  var crit = false;
  var cp = c.critChance + ML.traitSum(att.mon, 'crit') + ML.traitSum(def.mon, 'critTaken') + ((move.fx && move.fx.crit) || 0);
  if (this.ability(att) === 'critUp') cp += c.ability.critBonus;
  if (rng.chance(cp)) { crit = true; dmg *= c.critMultiplier; }
  dmg *= rng.range(d.randMin, d.randMax);
  return { dmg: Math.max(d.minDamage, Math.round(dmg)), type: type, crit: crit };
};

B.sideHasTeamBuff = function (side) {
  // 촛불요정: 쓰러지지 않았으면 대기 중이어도 우리 편 전원 공격 +10%
  var self = this;
  return this.sides[side].units.some(function (u) { return u.mon.hp > 0 && self.ability(u) === 'teamAtk'; });
};

// ── 턴 진행 ───────────────────────────────────────────
// actions[i] = { type: 'move', move: 'ember' } 또는 { type: 'switch', to: 1 }
B.turn = function (actions) {
  if (this.over || this.needReplace[0] || this.needReplace[1]) return;
  this.turnNo++;
  var self = this, rng = this.rng;
  // 1) 교체 먼저(빠른 쪽부터)
  var sides = [0, 1].sort(function (a, b) { return self.effSpeed(self.active(b)) - self.effSpeed(self.active(a)); });
  sides.forEach(function (i) {
    var a = actions[i];
    if (a && a.type === 'switch' && self.bench(i).indexOf(a.to) >= 0) self.doSwitch(i, a.to);
  });
  // 2) 기술: 시간 감각 → 속도 순, 같으면 무작위
  var order = [0, 1].filter(function (i) { return !actions[i] || actions[i].type !== 'switch'; })
    .map(function (i) { return { u: self.active(i), r: rng() }; });
  order.sort(function (a, b) {
    var fa = ML.hasTraitFx(a.u.mon, 'firstStrike') ? 1 : 0, fb = ML.hasTraitFx(b.u.mon, 'firstStrike') ? 1 : 0;
    if (fa !== fb) return fb - fa;
    var sa = self.effSpeed(a.u), sb = self.effSpeed(b.u);
    if (sa !== sb) return sb - sa;
    return a.r - b.r;
  });
  for (var i = 0; i < order.length && !this.over; i++) {
    var u = order[i].u;
    if (u.mon.hp <= 0 || u !== this.active(u.side)) continue;
    var foe = this.active(1 - u.side);
    if (foe.mon.hp <= 0) { this.say(this.name(u) + '은(는) 공격할 상대가 없다.', ''); continue; }
    this.act(u, foe, actions[u.side]);
    this.checkFaint();
  }
  if (!this.over) this.endOfTurn();
  this.checkFaint();
};

B.act = function (u, foe, action) {
  var c = ML.config, rng = this.rng, nm = this.name(u);
  // 행동 불가 판정
  if (u.mon.status === 'sleep') {
    u.statusTurns--;
    if (u.statusTurns <= 0) { u.mon.status = null; this.say(nm + '이(가) 잠에서 깼다!', 'status'); }
    else { this.say(nm + '은(는) 쿨쿨 자고 있다.', 'status'); return; }
  }
  if (u.mon.status === 'para' && rng.chance(c.status.para.skipChance)) {
    this.say(nm + '은(는) 몸이 저려 움직이지 못했다!', 'status'); return;
  }
  var idle = ML.traitSum(u.mon, 'idleChance');
  if (idle > 0 && rng.chance(idle)) { this.say(nm + '은(는) 게으름을 피웠다…', 'trait'); return; }

  var moveId = action && action.move;
  if (!moveId || u.sealed[moveId]) { this.say(nm + '은(는) 아무것도 하지 못했다.', ''); return; }
  this.useMove(u, foe, moveId);
};

B.useMove = function (u, foe, moveId, mimicked) {
  var c = ML.config, rng = this.rng, nm = this.name(u), move = ML.moves[moveId];
  this.say(nm + '의 ' + move.name + '!', 'move');
  if (!mimicked) u.lastMove = moveId;

  if (move.fx && move.fx.mimic) {
    var copy = foe.lastMove;
    if (!copy || ML.moves[copy].fx && ML.moves[copy].fx.mimic) { this.say('하지만 따라 할 기술이 없다!', ''); return; }
    return this.useMove(u, foe, copy, true);
  }

  var targetsFoe = move.kind === 'attack' || (move.fx && (move.fx.status || move.fx.foe || move.fx.seal));
  if (targetsFoe) {
    var hit = (move.acc / 100) * (1 - this.evasion(foe));
    if (!rng.chance(hit)) { this.say('하지만 빗나갔다!', 'miss'); return; }
  }

  if (move.kind === 'attack') {
    var r = this.calcDamage(u, foe, move);
    if (r.crit) this.say('급소에 맞았다!', 'crit');
    var dealt = this.applyDamage(foe, r.dmg, { from: u, type: r.type });
    if (r.type > 1.01) this.say('효과가 굉장했다!', 'eff-good');
    else if (r.type < 0.99) this.say('효과가 별로인 듯하다…', 'eff-bad');
    // 흡혈·흡수
    var heal = 0;
    var ls = ML.traitSum(u.mon, 'lifesteal');
    if (ls) heal += dealt * ls;
    if (move.fx && move.fx.drain) heal += dealt * move.fx.drain;
    if (heal > 0 && u.mon.hp > 0) this.heal(u, Math.max(1, Math.round(heal)), '체력을 흡수했다');
    // 반격·접촉 반격
    if (foe.mon.hp > 0 && dealt > 0) {
      var ab = this.ability(foe);
      if (ab === 'counter' && u.mon.hp > 0) {
        var back = Math.max(1, Math.round(dealt * c.ability.counterPct));
        this.say(this.name(foe) + '의 반격!', 'ability');
        this.applyDamage(u, back, {});
      }
      if (ab === 'contactPara' && u.mon.hp > 0 && rng.chance(c.ability.contactParaChance)) {
        this.say(this.name(foe) + '의 몸에서 전기가 튀었다!', 'ability');
        this.inflict(u, 'para', 1);
      }
    }
  }

  var fx = move.fx || {};
  if (fx.status && foe.mon.hp > 0) {
    var ok = this.inflict(foe, fx.status.type, fx.status.chance);
    if (!ok && move.kind === 'support') this.say('하지만 효과가 없었다.', '');
  }
  if (fx.self) for (var k in fx.self) this.changeStage(u, k, fx.self[k]);
  if (fx.foe && foe.mon.hp > 0 && rng.chance(fx.foe.chance)) {
    for (var k2 in fx.foe) if (k2 !== 'chance') this.changeStage(foe, k2, fx.foe[k2]);
  }
  if (fx.heal) {
    if (u.mon.hp >= u.stats.hp) this.say('하지만 체력이 가득하다.', '');
    else {
      this.heal(u, Math.round(u.stats.hp * fx.heal * Math.pow(c.healDecay, u.healUses)), '체력을 회복했다');
      u.healUses++;
    }
  }
  if (fx.seal) {
    if (!foe.lastMove || foe.sealed[foe.lastMove]) this.say('하지만 효과가 없었다.', '');
    else {
      foe.sealed[foe.lastMove] = c.ability.sealTurns;
      this.say(this.name(foe) + '의 ' + ML.moves[foe.lastMove].name + '이(가) 봉인되었다!', 'status');
    }
  }
};

B.applyDamage = function (u, dmg, info) {
  var c = ML.config, before = u.mon.hp;
  u.mon.hp = Math.max(0, u.mon.hp - dmg);
  // 불사조의 심장
  if (u.mon.hp <= 0 && before > 1 && !u.endureUsed && ML.hasTraitFx(u.mon, 'endure')) {
    u.endureUsed = true; u.mon.hp = 1;
    this.say(this.name(u) + '은(는) 불사조의 심장으로 버텼다!', 'trait');
  }
  this.log.push({ hit: u.side, uid: u.mon.uid, dmg: before - u.mon.hp, eff: info && info.type });
  // 맞으면 깰 수 있음
  if (u.mon.hp > 0 && u.mon.status === 'sleep' && info && info.from && this.rng.chance(c.status.sleep.wakeOnHit)) {
    u.mon.status = null; this.say(this.name(u) + '이(가) 맞고 깨어났다!', 'status');
  }
  return before - u.mon.hp;
};

B.heal = function (u, amt, msg) {
  var before = u.mon.hp;
  u.mon.hp = Math.min(u.stats.hp, u.mon.hp + amt);
  if (u.mon.hp > before) {
    this.log.push({ heal: u.side, uid: u.mon.uid, amt: u.mon.hp - before });
    if (msg) this.say(this.name(u) + '은(는) ' + msg + '.', 'heal');
  }
};

B.inflict = function (u, type, chance) {
  var c = ML.config, rng = this.rng;
  if (u.mon.status || u.mon.hp <= 0) return false;
  var p = chance * (1 - ML.traitSum(u.mon, 'statusResist'));
  if (!rng.chance(p)) return false;
  u.mon.status = type;
  if (type === 'sleep') u.statusTurns = rng.int(c.status.sleep.minTurns, c.status.sleep.maxTurns);
  else u.statusTurns = c.status[type].turns;
  var verb = { burn: '화상을 입었다', para: '마비되었다', sleep: '잠들었다', poison: '독에 걸렸다' }[type];
  this.say(this.name(u) + '은(는) ' + verb + '!', 'status');
  return true;
};

B.changeStage = function (u, stat, n) {
  var max = ML.config.stageMax, before = u.stages[stat];
  u.stages[stat] = Math.max(-max, Math.min(max, before + n));
  var d = u.stages[stat] - before, nm = this.name(u) + '의 ' + ML.STAT_NAMES[stat];
  if (d === 0) this.say(nm + '은(는) 더 이상 변하지 않는다.', '');
  else this.say(nm + (d > 0 ? (d > 1 ? '이(가) 크게 올랐다!' : '이(가) 올랐다!') : (d < -1 ? '이(가) 크게 떨어졌다!' : '이(가) 떨어졌다!')), d > 0 ? 'buff' : 'debuff');
};

B.endOfTurn = function () {
  var c = ML.config, self = this;
  [0, 1].forEach(function (i) {
    var u = self.active(i);
    if (u.mon.hp <= 0) return;
    var st = u.mon.status;
    if (st === 'burn' || st === 'poison') {
      var dmg = Math.max(1, Math.round(u.stats.hp * c.status[st].dotPct));
      self.say(self.name(u) + '은(는) ' + (st === 'burn' ? '화상' : '독') + ' 피해를 입었다.', 'dot');
      self.applyDamage(u, dmg, {});
    }
    if (st && st !== 'sleep' && u.mon.hp > 0) {
      u.statusTurns--;
      if (u.statusTurns <= 0) { u.mon.status = null; self.say(self.name(u) + '의 ' + ML.STATUS_NAMES[st] + '이(가) 나았다.', 'status'); }
    }
    var rg = ML.traitSum(u.mon, 'regen');
    if (rg && u.mon.hp > 0) self.heal(u, Math.max(1, Math.round(u.stats.hp * rg)), '재생으로 회복했다');
    for (var m in u.sealed) { if (--u.sealed[m] <= 0) delete u.sealed[m]; }
    if (self.ability(u) === 'dayNight' && u.mon.hp > 0) {
      u.form = u.form === 'day' ? 'night' : 'day';
      self.say(self.name(u) + '이(가) ' + (u.form === 'day' ? '낮' : '밤') + '의 모습으로 바뀌었다!', 'ability');
    }
  });
  if (this.field.rain > 0 && --this.field.rain === 0) this.say('비가 그쳤다.', 'field');
};

B.checkFaint = function () {
  var c = ML.config, self = this;
  [0, 1].forEach(function (i) {
    var u = self.active(i);
    if (u.mon.hp > 0 || u.fainted || self.over) return;
    if (self.ability(u) === 'revive' && !u.reviveUsed) {
      u.reviveUsed = true;
      u.mon.hp = Math.round(u.stats.hp * c.ability.reviveHpPct);
      u.mon.status = null;
      self.log.push({ heal: u.side, uid: u.mon.uid, amt: u.mon.hp });
      self.say(self.name(u) + '이(가) 다시 일어섰다!', 'ability');
      return;
    }
    u.fainted = true;
    u.mon.status = null;
    self.say(self.name(u) + '은(는) 쓰러졌다!', 'faint');
    self.log.push({ faint: i, uid: u.mon.uid });
    self.defeated.push({ side: i, mon: u.mon, appeared: Object.keys(self.appeared[1 - i]) });
  });
  if (this.over) return;
  var out = [0, 1].map(function (i) { return self.alive(i).length === 0; });
  if (out[0] || out[1]) {
    this.over = true;
    this.winner = out[0] ? 1 : 0;      // 동시에 전멸하면 내 패배 [제안]
    return;
  }
  [0, 1].forEach(function (i) { if (self.active(i).mon.hp <= 0) self.needReplace[i] = true; });
};
