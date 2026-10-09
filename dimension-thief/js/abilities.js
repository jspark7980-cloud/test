// 동료 고유 능력(v4 2단계). 동료의 ability = { id, value } (value = base + per × 돌파, js/gacha.js).
// 처리 위치: 라운드 시작(combat.startPlayerTurn) · 피해 계산(effects.calcDamage) · 피해 분담(effects.dealDamage)
//           회복(heal 효과) · 독 부여(status 효과·damage 효과) · 동료 공격 뒤(combat.allyAct) · 불안정(run.instabilityInfo)
window.DT = window.DT || {};

(function () {
  const A = (DT.abilities = {});
  const log = (s, m) => DT.state.log(s, m);
  const actor = (s, id) => DT.state.actor(s, id);

  A.NAMES = {
    frontGuard: (v) => `앞줄이면 매 턴 방어도 ${Math.round(v)}`,
    lowestHeal: (v) => `매 턴 체력 비율이 가장 낮은 아군 체력 ${Math.round(v)} 회복`,
    backline: (v) => `뒷줄 적을 우선 노림, 뒷줄 적에게 피해 +${Math.round(v)}`,
    poisonTouch: (v) => `공격할 때마다 독 ${Math.floor(v)}`,
    share: (v) => `다른 아군이 받는 공격 피해의 ${Math.round(v * 100)}%를 대신 받음`,
    lockFoe: (v) => `매 턴 무작위 적 손패 ${Math.floor(v)}장 잠금`,
    cleanse: (v) => `회복할 때 대상의 독 제거${v ? `, 회복 +${Math.round(v)}` : ''}`,
    execute: (v) => `체력 ${Math.round(v * 100)}% 이하인 적에게 피해 2배`,
    keepBlock: (v) => `방어도가 다음 턴까지 유지${v ? `, 매 턴 방어도 +${Math.round(v)}` : ''}`,
    doublePoison: (v) => `거는 독 ×${Math.round(v * 10) / 10}`,
    bloodPower: (v) => `공격할 때 체력 2를 바치고 피해 +${Math.round(v * 100)}%`,
    autoSteal: (v) => `매 턴 적 공개 카드 ${Math.floor(v)}장을 슬쩍해 도둑 손패로`,
    ignoreInstability: (v) => `파티가 차원 불안정을 무시${v ? `, 전투 시작 시 아군 방어도 +${Math.round(v)}` : ''}`,
    rewind: () => '매 턴, 지난 턴에 도둑이 쓴 마지막 카드를 손패로 되감음',
  };
  A.describe = (ab) => (ab && A.NAMES[ab.id] ? A.NAMES[ab.id](ab.value) : '');

  const has = (a, id) => a && !a.dead && a.ability && a.ability.id === id;
  const val = (a) => (a.ability ? a.ability.value : 0);
  A.with = (state, id) => (state.allies || []).filter((c) => has(c, id));

  // ── 피해 계산 ──
  A.dmgAdd = function (state, src, tgt) {
    if (has(src, 'backline') && tgt && tgt.row === 'back') return Math.round(val(src));
    return 0;
  };
  A.dmgMult = function (state, src, tgt) {
    let m = src.dmgMult || 1;                                  // 돌파
    if (has(src, 'execute') && tgt && tgt.hp <= tgt.maxHp * val(src)) m *= 2;
    if (has(src, 'bloodPower')) m *= 1 + val(src);
    return m;
  };

  // 성기사: 다른 아군을 노린 공격 피해 일부를 대신 받는다. 남은 피해를 돌려준다
  A.share = function (state, tgtId, dmg) {
    if (!DT.state.isAlly(tgtId) || dmg <= 0) return dmg;
    const pal = A.with(state, 'share').find((c) => c.id !== tgtId);
    if (!pal) return dmg;
    const part = Math.floor(dmg * val(pal));
    if (part <= 0) return dmg;
    DT.state.emit(state, { type: 'passive', target: pal.id, text: `🌟 분담 ${part}` });
    DT.effects.applyDamage(state, pal.id, part, {});
    return dmg - part;
  };

  // 해파리 병사: 공격 시 독
  A.poisonOnHit = (state, src) => (has(src, 'poisonTouch') ? Math.floor(val(src)) : 0);
  // 심해 마녀: 거는 독 배율
  A.poisonMult = (state, src) => (has(src, 'doublePoison') ? val(src) : 1);

  // 인어 치유사: 회복 대상의 독 제거 + 추가 회복
  A.onHeal = function (state, srcId, tgtId) {
    const src = actor(state, srcId);
    if (!has(src, 'cleanse')) return;
    const t = actor(state, tgtId);
    if (t && t.statuses.poison) {
      delete t.statuses.poison;
      DT.state.emit(state, { type: 'passive', target: tgtId, text: '💧 해독' });
    }
    if (val(src) > 0 && t && !t.dead) {
      const before = t.hp;
      t.hp = Math.min(t.maxHp, t.hp + Math.round(val(src)));
      if (t.hp > before) DT.state.emit(state, { type: 'heal', target: tgtId, amount: t.hp - before });
    }
  };

  A.keepsBlock = (a) => has(a, 'keepBlock');

  // 계약 악마: 공격 카드를 쓴 뒤 체력 2
  A.afterAttack = function (state, c) {
    if (!has(c, 'bloodPower') || c.hp <= 1) return;
    c.hp = Math.max(1, c.hp - 2);
    DT.state.emit(state, { type: 'damage', target: c.id, amount: 2, blocked: 0 });
  };

  A.ignoresInstability = (state) => A.with(state, 'ignoreInstability').length > 0;

  // 전투 시작: 차원 방랑자 돌파 보너스
  A.combatStart = function (state) {
    for (const c of A.with(state, 'ignoreInstability')) {
      if (val(c) > 0) DT.party.living(state).forEach((a) => DT.effects.gainBlock(state, a.id, Math.round(val(c))));
    }
  };

  // 라운드(내 턴) 시작: 드로우 뒤
  A.roundStart = function (state) {
    const p = state.player;
    for (const c of DT.party.companions(state)) {
      if (state.result) return;
      const id = c.ability && c.ability.id;
      const v = val(c);
      if (id === 'frontGuard' && c.row === 'front') DT.effects.gainBlock(state, c.id, Math.round(v));
      else if (id === 'keepBlock' && v > 0) DT.effects.gainBlock(state, c.id, Math.round(v));
      else if (id === 'lowestHeal') {
        const low = DT.party.living(state).filter((a) => a.hp < a.maxHp).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
        if (low) DT.effects.heal(state, low.id, Math.round(v));
      } else if (id === 'lockFoe') {
        const foes = DT.combat.living(state).filter((e) => e.hand.some((x) => !x.locked && !DT.cards.def(x.id).unplayable));
        const e = DT.rng.pick(state, foes);
        if (e) DT.combat.lockHand(state, e, Math.floor(v));
      } else if (id === 'autoSteal') {
        for (let k = 0; k < Math.floor(v) && p.hand.length < (p.maxHand || 10); k++) {
          const foes = DT.combat.living(state).filter((e) => e.hand.some((x) => x.revealed));
          const e = DT.rng.pick(state, foes);
          if (!e) break;
          const card = DT.rng.pick(state, e.hand.filter((x) => x.revealed));
          DT.deck.removeFromHand(e, card.uid);
          delete card.revealed; delete card.locked;
          card.temp = true;
          p.hand.push(card);
          log(state, `${c.name}: ${e.name}의 [${DT.cards.def(card.id).name}]을(를) 슬쩍해 건넸다!`);
          DT.state.emit(state, { type: 'steal', by: c.id, from: e.id, cardId: card.id });
        }
      } else if (id === 'rewind' && state.turn > 1) {
        const last = (state.prevPlayed || []).slice().reverse().map((uid) => p.discardPile.find((x) => x.uid === uid)).find(Boolean);
        if (last && p.hand.length < (p.maxHand || 10)) {
          p.discardPile.splice(p.discardPile.indexOf(last), 1);
          p.hand.push(last);
          log(state, `${c.name}: [${DT.cards.nameOf(last)}]을(를) 되감았다`);
          DT.state.emit(state, { type: 'passive', target: 'player', text: `⏳ ${DT.cards.nameOf(last)}` });
        }
      }
    }
  };
})();
