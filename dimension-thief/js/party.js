// 파티: 도둑 + 동료. 동료 생성·전투 준비·이탈, 진형(앞줄/뒷줄).
window.DT = window.DT || {};

DT.party = {
  // 도둑 포함 아군 전체 / 살아 있는 아군 / 살아 있는 동료
  allies(state) { return [state.player, ...state.allies]; },
  living(state) { return DT.party.allies(state).filter((a) => !a.dead); },
  companions(state) { return state.allies.filter((a) => !a.dead); },

  slotsFree(state) { return DT.config.party.companionSlots - state.allies.length; },

  // src: data/companions.js 항목 또는 강탈한 적(data/enemies.js 항목)
  make(state, kind, fromEnemy) {
    const d = fromEnemy ? DT.data.enemies[kind] : DT.data.companions[kind];
    // 보유 동료: 돌파·레벨 반영(출발 시 state.roster 에 복사됨). 강탈 영입은 이번 판 한정·성장 없음
    const e = fromEnemy ? { bt: 0, lv: 1 } : DT.gacha.entry({ roster: state.roster || {} }, kind);
    const deck = fromEnemy ? d.companionDeck.map((id) => ({ id, up: 0 })) : DT.gacha.deckFor(kind, e.lv);
    const hp = Math.round(d.hp * DT.gacha.hpMult(e));
    const c = {
      id: 'a' + state.nextAllyId++, kind, fromEnemy: !!fromEnemy,
      name: d.name, icon: d.icon, role: d.role, origin: d.origin,
      hp, maxHp: hp, block: 0, statuses: {},
      bt: e.bt, lv: e.lv, dmgMult: DT.gacha.dmgMult(e), grade: d.grade || null,
      ability: d.ability ? { id: d.ability.id, value: DT.gacha.abilityValue(kind, e.bt) } : null,
      row: d.row || 'front', homeRow: d.row || 'front', basicAttack: d.basicAttack || 4,
      masterDeck: deck.map((x) => DT.state.makeCard(state, x.id, x.up ? { up: 1 } : null)),
      drawPile: [], hand: [], discardPile: [], exhaustPile: [], maxHand: 10,
      intent: null, dead: false,
      equip: { weapon: null, armor: null, accessory: null },
    };
    return c;
  },

  add(state, kind, fromEnemy, replaceId) {
    if (replaceId) {
      const i = state.allies.findIndex((a) => a.id === replaceId);
      if (i >= 0) {
        DT.state.log(state, `${state.allies[i].name}이(가) 파티를 떠났다.`);
        DT.items.returnEquipment(state, state.allies[i]);
        state.allies.splice(i, 1);
      }
    }
    if (DT.party.slotsFree(state) <= 0) return null;
    const c = DT.party.make(state, kind, fromEnemy);
    state.allies.push(c);
    DT.state.log(state, `${c.name}이(가) 동료가 됐다! (${DT.party.roleName(c.role)})`);
    return c;
  },

  // 전투 시작 시: 방어도·상태 초기화, 원래 줄로, 덱 섞기
  prepare(state) {
    const p = state.player;
    p.row = p.homeRow;
    p.dead = false;
    for (const c of state.allies) {
      c.block = 0; c.statuses = {}; c.row = c.homeRow; c.intent = null;
      c.drawPile = DT.rng.shuffle(state, c.masterDeck.map((x) => Object.assign({}, x)));
      c.hand = []; c.discardPile = []; c.exhaustPile = [];
    }
  },

  // 전투 후: 쓰러진 동료는 이번 판 동안 이탈
  removeFallen(state) {
    const fallen = state.allies.filter((a) => a.dead);
    fallen.forEach((a) => DT.state.log(state, `${a.name}이(가) 쓰러져 파티에서 이탈했다.`));
    state.allies = state.allies.filter((a) => !a.dead);
    state.fallen = (state.fallen || []).concat(fallen);   // 장비는 몸에 남는다(부활 깃털로 복귀 가능)
    return fallen;
  },

  roleName(role) {
    return { tank: '탱커', healer: '힐러', dealer: '딜러', support: '지원' }[role] || role;
  },
  roleIcon(role) {
    return { tank: '🛡', healer: '✚', dealer: '⚔', support: '✦' }[role] || '';
  },
};
