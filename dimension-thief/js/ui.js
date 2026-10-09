// 화면 그리기와 연출. 입력 처리는 main.js 가 data-act 속성으로 받는다.
window.DT = window.DT || {};

(function () {
  const UI = (DT.ui = {});
  const $ = (sel) => document.querySelector(sel);
  const actor = (s, id) => DT.state.actor(s, id);

  UI.applyTheme = function (dimId) {
    const d = DT.data.dimensions[dimId] || DT.data.dimensions.thief;
    const r = document.documentElement.style;
    r.setProperty('--bg', d.bg);
    r.setProperty('--bg2', d.bg2);
    r.setProperty('--accent', d.color);
  };

  // ── 조각 ──
  function cardHTML(card, o) {
    o = o || {};
    if (o.hidden) {
      return `<div class="card back ${o.small ? 'small' : ''}" ${o.attrs || ''}><div class="back-mark">?</div></div>`;
    }
    const def = DT.cards.def(card.id);
    const dim = DT.data.dimensions[card.origin] || {};
    const cls = ['card', 'type-' + def.type, def.rarity ? 'r-' + def.rarity : '',
      o.small ? 'small' : '', o.selected ? 'selected' : '', o.disabled ? 'disabled' : '',
      o.glow ? 'glow' : '', card.temp ? 'temp' : '', card.up ? 'upgraded' : ''].join(' ');
    return `<div class="${cls}" style="--origin:${dim.color || '#888'}" ${o.attrs || ''}>
      <div class="c-cost">${DT.cards.costOf(card)}</div>
      <div class="c-name">${DT.cards.nameOf(card)}</div>
      <div class="c-art">${def.icon || DT.cards.typeIcon[def.type] || '✦'}</div>
      <div class="c-desc"><div>${DT.cards.describe(card, o.view)}</div></div>
      <div class="c-foot"><span class="c-origin">${dim.name || card.origin}</span>${card.temp ? '<span class="c-tag">슬쩍</span>' : ''}</div>
    </div>`;
  }
  UI.cardHTML = cardHTML;

  // 공개 카드·동료 행동을 한 줄 요약으로
  function chipHTML(card, o) {
    o = o || {};
    if (o.hidden) return '<div class="chip back">? 비공개</div>';
    const def = DT.cards.def(card.id);
    const desc = DT.cards.describe(card, o.view).replace(/<br>/g, ' · ');
    return `<div class="chip type-${def.type} ${o.glow ? 'glow' : ''}" ${o.attrs || ''}>
      <span class="chip-icon">${def.icon || ''}</span><span class="chip-name">${def.name}</span>
      <span class="chip-desc">${desc}</span></div>`;
  }

  function statusesHTML(a) {
    return Object.entries(a.statuses).map(([k, v]) => {
      const d = DT.data.statuses[k] || { name: k, icon: '?', kind: 'debuff' };
      return `<span class="st st-${d.kind}" data-act="status" data-key="${k}" data-val="${v}">${d.icon}<small>${d.name}</small><b>${v}</b></span>`;
    }).join('');
  }

  function barHTML(a, marker) {
    const pct = Math.max(0, (a.hp / a.maxHp) * 100);
    const m = marker ? `<div class="hpmark" style="left:${marker * 100}%"></div>` : '';
    return `<div class="hpbar"><div class="hpfill" style="width:${pct}%"></div>${m}
      <span class="hptext">${a.hp} / ${a.maxHp}</span></div>`;
  }

  function blockHTML(a) {
    return a.block > 0 ? `<div class="blockbadge">🛡<b>${a.block}</b></div>` : '';
  }

  const selectedCard = (app) => app.sel && app.state.player.hand.find((c) => c.uid === app.sel);
  const rowTag = (row) => (row === 'back' ? '<div class="rowtag">뒷줄</div>' : '<div class="rowtag front">앞줄</div>');

  // ── 영역별 렌더 ──
  function renderTop(app) {
    const s = app.state;
    const dim = DT.data.dimensions[s.dimension];
    const phase = s.screen !== 'combat' ? ''
      : { player: '나의 턴', ally: '동료 행동', enemy: '적의 턴' }[s.phase] || '';
    $('#topbar').innerHTML = `
      <div class="tb-left"><span class="dimname">${dim.name}</span>
        <span class="turn">${s.floor}층 · 턴 ${s.turn}</span>
        <span class="wanted" data-act="info" data-msg="수배도: 강탈·영입할 때마다 +1. 높을수록 보상과 정예 적이 늘어난다(이후 단계).">🚨 수배도 ${s.wanted}</span></div>
      <div class="tb-mid">${phase}</div>
      <div class="tb-right">
        <span class="money" data-act="info" data-msg="골드: 이번 판에서만 쓰는 돈(암시장·이벤트). 코인: 판이 끝나면 비율대로 남는 영구 화폐.">💰 ${s.gold} · 🪙 ${s.runCoins}</span>
        <button class="btn small" data-act="pile" data-pile="masterDeck">내 덱 ${s.player.masterDeck.length}</button>
        ${escapeBtn(s)}</div>`;
  }

  function escapeBtn(s) {
    const can = DT.run.canEscape(s);
    return `<button class="btn small escape" data-act="escape" ${can ? '' : 'disabled'}>${can ? '🏃 도주' : '🚫 도주 불가'}</button>`;
  }

  // 아군: 뒷줄 → 앞줄 순서(앞줄이 가운데 쪽)
  function renderAllies(app) {
    const s = app.state;
    const sel = selectedCard(app);
    const def = sel && DT.cards.def(sel.id);
    const enemyTarget = def && DT.cards.needsTarget(def);
    const allyPick = def && !enemyTarget && (DT.cards.allyTargetable(def) || DT.cards.needsCompanion(def));
    const needComp = def && DT.cards.needsCompanion(def);
    const selfOnly = def && !enemyTarget && !allyPick;
    const showThreat = s.screen === 'combat' && s.phase === 'player' && !s.result;
    const allies = DT.party.allies(s);
    const ordered = [...allies.filter((a) => a.row === 'back'), ...allies.filter((a) => a.row !== 'back')];
    $('#allies').innerHTML = ordered.map((a) => {
      const isComp = a.id !== 'player';
      const targetable = !a.dead && ((allyPick && (!needComp || isComp)) || (selfOnly && !isComp));
      const threat = showThreat && !a.dead ? Math.round(Math.max(0, DT.ai.incomingTo(s, a.id) - a.block)) : 0;
      let intent = '';
      if (isComp && !a.dead) {
        if (s.phase === 'ally' && a.pending) intent = '<div class="cintent">행동 준비…</div>';
        else if (a.intent && s.phase === 'player') {
          const card = a.hand.find((c) => c.uid === a.intent.uid);
          const focus = s.orders.focus && actor(s, s.orders.focus);
          const tgt = focus && !focus.dead ? focus : a.intent.targetId ? actor(s, a.intent.targetId)
            : a.intent.allyId && a.intent.allyId !== a.id ? actor(s, a.intent.allyId) : null;
          intent = card ? `<div class="cintent">${focus && !focus.dead && !DT.cards.isAttack(DT.cards.def(card.id)) ? '<span class="chip-name">🎯 표적 기본 공격</span>'
            : chipHTML(card, { view: { state: s, srcId: a.id, tgtId: a.intent.targetId } })}
            ${tgt ? `<div class="cto">→ ${tgt.name}</div>` : ''}</div>` : '';
        }
      }
      return `<div class="unit ally ${a.row === 'back' ? 'back' : ''} ${a.dead ? 'dead' : ''}">
        ${rowTag(a.row)}
        <div class="actor ${targetable ? 'targetable' : ''}" data-act="ally" data-id="${a.id}" data-actor="${a.id}">
          ${threat > 0 ? `<div class="threat">⚠ ${threat}</div>` : ''}
          ${s.orders.cover === a.id ? '<div class="orderbadge">🫡 엄호 중</div>' : ''}
          <div class="portrait">${a.icon}${blockHTML(a)}</div>
          <div class="aname">${a.name}${isComp ? ` <span class="role">${DT.party.roleIcon(a.role)}</span>` : ''}</div>
          ${barHTML(a)}
          <div class="sts">${statusesHTML(a)}</div>
        </div>
        ${a.dead ? '<div class="cintent">쓰러짐</div>' : intent}
      </div>`;
    }).join('');
  }

  // 적: 앞줄 → 뒷줄 순서
  function renderEnemies(app) {
    const s = app.state;
    const sel = selectedCard(app);
    const selDef = sel && DT.cards.def(sel.id);
    const targeting = selDef && DT.cards.needsTarget(selDef);
    const stealing = selDef && DT.cards.choiceOf(selDef) === 'revealed';
    const threshold = DT.config.heist.threshold;
    const taunter = DT.party.living(s).find((a) => (a.statuses.taunt || 0) > 0);
    const ordered = [...s.enemies.filter((e) => e.row !== 'back'), ...s.enemies.filter((e) => e.row === 'back')];
    $('#enemies').innerHTML = ordered.map((e) => {
      const handCards = e.dead ? '' : e.hand.map((c) => chipHTML(c, {
        view: { state: s, srcId: e.id, tgtId: taunter ? taunter.id : e.targetId }, hidden: !c.revealed,
        glow: stealing && (!app.mode || app.mode.target === e.id),
        attrs: c.revealed ? `data-act="reveal" data-owner="${e.id}" data-uid="${c.uid}"` : '',
      })).join('');
      let intent = '';
      if (e.dead) intent = e.executed ? '💰 강탈 성공' : '쓰러짐';
      else if (s.phase === 'enemy' && e.pending > 0) intent = `행동 중… 남은 ${e.pending}장`;
      else {
        const t = taunter || actor(s, e.targetId);
        intent = `행동 <b>${e.intent}</b>장 · 🎯 ${t ? (taunter ? '📢' : '') + t.name : '-'}`;
      }
      const last = e.lastPlayed ? `직전: ${DT.cards.def(e.lastPlayed).name}` : '직전: 없음';
      const heistNow = !e.dead && e.heistReady;
      const heistNext = !e.dead && !e.heistReady && DT.combat.belowHeistLine(e);
      const heistBadge = heistNow ? '<div class="heistbadge">💰 지금 처치하면 강탈</div>'
        : heistNext ? '<div class="heistbadge next">⏳ 다음 턴 강탈 가능</div>' : '';
      let preview = '';
      if (sel && !e.dead) {
        const dmg = DT.effects.previewDamage(s, sel, 'player', e.id);
        const hitsThis = targeting || selDef.effects.some((x) => DT.effects.toOf(x) === 'allOpponents');
        if (dmg > 0 && hitsThis) preview = `<div class="dmgpreview">-${dmg}</div>`;
      }
      const focused = s.orders.focus === e.id ? '<div class="orderbadge">🎯 표적</div>' : '';
      return `<div class="unit enemy-wrap ${e.row === 'back' ? 'back' : ''} ${e.dead ? 'dead' : ''}">
        ${rowTag(e.row)}
        <div class="ehand">${handCards}</div>
        <div class="intent">${intent}</div>
        <div class="actor enemy ${targeting && !e.dead ? 'targetable' : ''} ${heistNow ? 'heistable' : ''}" data-act="enemy" data-id="${e.id}" data-actor="${e.id}">
          ${heistBadge}${focused}
          <div class="portrait">${e.icon}${blockHTML(e)}${preview}</div>
          <div class="aname">${e.name}${e.rank === 'elite' ? '<span class="rankbadge elite">정예</span>' : e.rank === 'boss' ? '<span class="rankbadge boss">보스</span>' : ''}</div>
          ${barHTML(e, threshold)}
          <div class="sts">${statusesHTML(e)}</div>
          <div class="epiles">${last}</div>
        </div>
      </div>`;
    }).join('');
  }

  function renderHand(app) {
    const s = app.state, p = s.player;
    const alive = DT.combat.living(s);
    const view = { state: s, srcId: 'player', tgtId: alive.length === 1 ? alive[0].id : null };
    const canAct = s.screen === 'combat' && s.phase === 'player' && !app.busy && !s.result;
    const hand = $('#hand');
    hand.innerHTML = p.hand.map((c) => cardHTML(c, {
      view,
      selected: app.sel === c.uid,
      disabled: !canAct || !DT.combat.canPlay(s, c.uid).ok,
      attrs: `data-act="hand" data-uid="${c.uid}"`,
    })).join('');
    UI.layoutHand();
  }

  // 카드가 많으면 겹쳐서 한 줄에 맞춘다
  UI.layoutHand = function () {
    const hand = $('#hand');
    const cards = hand.children;
    const n = cards.length;
    if (!n) return;
    const cw = cards[0].offsetWidth;
    const W = hand.clientWidth;
    const gap = 10;
    let g = gap;
    if (n > 1 && n * cw + (n - 1) * gap > W) g = (W - n * cw) / (n - 1);
    hand.style.setProperty('--gap', g + 'px');
  };

  function renderControls(app) {
    const s = app.state, p = s.player;
    const canEnd = s.screen === 'combat' && s.phase === 'player' && !app.busy && !s.result;
    $('#energy').innerHTML = `<div class="orb"><b>${p.energy}</b><small>/${p.maxEnergy}</small></div>`;
    $('#piles').innerHTML = `
      <button class="btn pile" data-act="pile" data-pile="drawPile">덱 <b>${p.drawPile.length}</b></button>
      <button class="btn pile" data-act="pile" data-pile="discardPile">버림 <b>${p.discardPile.length}</b></button>
      ${p.exhaustPile.length ? `<button class="btn pile" data-act="pile" data-pile="exhaustPile">소멸 <b>${p.exhaustPile.length}</b></button>` : ''}`;
    $('#endturn').innerHTML = `<button class="btn big ${canEnd ? 'primary' : ''}" data-act="end-turn" ${canEnd ? '' : 'disabled'}>턴 종료</button>`;
  }

  function renderHint(app) {
    const s = app.state;
    let txt = app.flash || '';
    if (!txt) {
      if (s.result || s.screen !== 'combat') txt = '';
      else if (s.phase === 'ally') txt = '동료가 행동하는 중…';
      else if (app.busy || s.phase === 'enemy') txt = '적이 행동하는 중…';
      else if (app.mode && app.mode.type === 'chooseReveal') txt = '빼앗을 공개 카드를 탭하세요 (빈 곳 탭: 취소)';
      else if (app.sel) {
        const c = selectedCard(app);
        const def = c && DT.cards.def(c.id);
        if (!def) txt = '';
        else if (DT.cards.choiceOf(def) === 'revealed') txt = `[${def.name}] 적 또는 적의 공개 카드를 탭하세요`;
        else if (DT.cards.needsTarget(def)) txt = `[${def.name}] 대상 적을 탭하세요`;
        else if (DT.cards.needsCompanion(def)) txt = `[${def.name}] 동료를 탭하세요`;
        else if (DT.cards.allyTargetable(def)) txt = `[${def.name}] 줄 아군을 탭하세요 · 카드를 한 번 더 탭하면 나에게`;
        else txt = `[${def.name}] 한 번 더 탭하면 사용`;
      } else txt = '카드를 탭해 선택하세요 · ⚠ 숫자는 이번 턴 예상 피해';
    }
    const h = $('#hint');
    h.textContent = txt;
    h.classList.toggle('warn', !!app.flash);
  }

  function renderLog(s) {
    $('#log').innerHTML = s.log.slice(-4).map((l) => `<div>${l}</div>`).join('');
  }

  // ── 오버레이: 동료 선택 / 덱 보기 / 강탈 / 카드 보상 / 패배 ──
  function pickRow(ids, app) {
    return `<div class="pickrow">${ids.map((id) => cardHTML(
      { uid: '', id, origin: DT.cards.def(id).origin },
      { selected: app.pick === id, attrs: `data-act="pick" data-id="${id}"` })).join('')}</div>`;
  }

  function companionCard(kind, d, app, fromEnemy) {
    const deck = fromEnemy ? d.companionDeck : d.deck;
    const counts = {};
    deck.forEach((id) => { counts[id] = (counts[id] || 0) + 1; });
    const selected = fromEnemy ? app.pick === kind : app.picks.includes(kind);
    return `<div class="compcard ${selected ? 'selected' : ''}" data-act="${fromEnemy ? 'pick' : 'pick-comp'}" data-id="${kind}">
      <div class="cc-icon">${d.icon}</div>
      <div class="cc-name">${d.name}</div>
      <div class="cc-role">${DT.party.roleIcon(d.role)} ${DT.party.roleName(d.role)} · 체력 ${d.hp} · ${d.row === 'back' ? '뒷줄' : '앞줄'}</div>
      ${d.desc ? `<div class="cc-desc">${d.desc}</div>` : ''}
      <div class="cc-deck">${Object.entries(counts).map(([id, n]) => `<span>${DT.cards.def(id).icon || ''} ${DT.cards.def(id).name}${n > 1 ? ' ×' + n : ''}</span>`).join('')}</div>
    </div>`;
  }

  function overlayContent(app) {
    const s = app.state;
    if (app.pileView) {
      const p = s.player;
      const names = { drawPile: '뽑을 덱 (순서 비공개)', discardPile: '버린 더미', exhaustPile: '소멸', masterDeck: '내 덱 (영구)' };
      const list = p[app.pileView].slice();
      if (app.pileView !== 'discardPile') list.sort((a, b) => a.id.localeCompare(b.id));
      return {
        key: 'pile:' + app.pileView,
        html: `<div class="panel wide">
          <h2>${names[app.pileView]} · ${list.length}장</h2>
          <div class="pilelist">${list.map((c) => cardHTML(c, { small: true })).join('') || '<p>비어 있음</p>'}</div>
          <button class="btn big" data-act="close-overlay">닫기</button></div>`,
      };
    }
    if (app.view === 'lobby' || !s) return lobbyContent(app);
    if (app.deckPick) return deckPickContent(app);
    if (s.screen === 'map') return mapContent(app);
    if (s.screen === 'hideout') return hideoutContent(app);
    if (s.screen === 'market') return marketContent(app);
    if (s.screen === 'event') return eventContent(app);
    if (s.screen === 'runEnd') return runEndContent(app);
    if (s.screen === 'pickCompanion') {
      const n = s.companionPicks || 1;
      return {
        key: 'start:' + s.seed,
        html: `<div class="panel wide">
          <h1>🦹 함께 갈 동료 ${n > 1 ? `${n}명을` : '를'} 고르세요</h1>
          <p>동료는 AI로 자동 행동합니다. 강탈로 적을 쓰러뜨리면 그 적을 동료로 영입할 수도 있어요. (최대 ${DT.config.party.companionSlots}명)</p>
          <div class="pickrow">${s.starterOptions.map((k) => companionCard(k, DT.data.companions[k], app, false)).join('')}</div>
          <div class="row"><button class="btn big primary" data-act="start-run" ${app.picks.length ? '' : 'disabled'}>${app.picks.length ? `${app.picks.map((k) => DT.data.companions[k].name).join(' · ')}와 출발` : '동료를 탭하세요'}</button></div>
        </div>`,
      };
    }
    if (s.screen === 'heist' && app.replaceFor) {
      const d = DT.data.enemies[app.replaceFor];
      return {
        key: 'replace:' + app.replaceFor,
        html: `<div class="panel">
          <h1 class="heist">🤝 ${d.name} 영입</h1>
          <p>동료 자리가 가득 찼습니다. 내보낼 동료를 고르세요.</p>
          <div class="row">${DT.party.companions(s).map((c) => `<button class="btn big" data-act="replace" data-id="${c.id}">${c.icon} ${c.name}<br><small>${DT.party.roleName(c.role)} · ${c.hp}/${c.maxHp}</small></button>`).join('')}</div>
          <div class="row"><button class="btn big" data-act="cancel-replace">취소</button></div>
        </div>`,
      };
    }
    if (s.screen === 'heist') {
      const h = s.heist;
      const many = h.groups.length > 1;
      return {
        key: 'heist:' + s.floor + ':' + h.groups.length,
        html: `<div class="panel wide">
          <h1 class="heist">💰 강탈!</h1>
          <p>${many ? `빈사 상태의 적 ${h.groups.length}명을 처치했다. <b>그중 한 명</b>에게서` : `<b>${h.groups[0].enemyName}</b>에게서`}
            카드 1장을 빼앗아 <b>덱에 영구 추가</b>하거나, <b>동료로 영입</b>한다. (수배도 +1)</p>
          ${h.groups.map((g) => {
            const d = DT.data.enemies[g.kind];
            const recruit = g.role ? `<button class="btn recruit" data-act="recruit" data-kind="${g.kind}">🤝 ${g.enemyName} 동료로 영입 · ${DT.party.roleIcon(g.role)} ${DT.party.roleName(g.role)} · 체력 ${d.hp}</button>` : '';
            return `<h3 class="grouphead">${g.enemyName}</h3>${pickRow(g.options, app)}${recruit}`;
          }).join('')}
          <div class="row">
            <button class="btn big" data-act="heist-skip">포기</button>
            <button class="btn big primary" data-act="heist-take" ${app.pick ? '' : 'disabled'}>카드 가져가기</button>
          </div></div>`,
      };
    }
    if (s.screen === 'reward') {
      return {
        key: 'reward:' + s.floor + ':' + s.reward.options.join(','),
        html: `<div class="panel wide">
          <h1 class="win">${s.reward.kind === 'event' ? '카드 획득' : s.reward.kind === 'boss' ? '👑 보스 격파!' : `${s.floor}층 승리!`}</h1>
          ${s.reward.kind !== 'event' && s.lastLoot ? `<p class="loot">💰 골드 +${s.lastLoot.gold} · 🪙 코인 +${s.lastLoot.coins}</p>` : ''}
          <p>카드 1장을 골라 덱에 추가하거나 건너뛴다.</p>
          ${pickRow(s.reward.options, app)}
          <div class="row">
            <button class="btn big" data-act="reward-skip">건너뛰기</button>
            <button class="btn big primary" data-act="reward-take" ${app.pick ? '' : 'disabled'}>가져가기</button>
          </div></div>`,
      };
    }
    return null;
  }

  // ── 맵 ──
  function partyStrip(s) {
    return `<div class="partystrip">${DT.party.allies(s).filter((a) => !a.dead).map((a) =>
      `<span class="pm">${a.icon} <b>${a.hp}</b>/${a.maxHp}</span>`).join('')}</div>`;
  }

  function mapContent(app) {
    const s = app.state;
    const m = s.map;
    const F = DT.config.map.floors;
    const L = DT.config.map.lanes;
    const reach = DT.map.reachable(s);
    const pos = (n) => ({
      x: 4 + ((n.floor - 1) / (F - 1)) * 92,
      y: n.type === 'boss' ? 50 : 12 + (n.lane / (L - 1)) * 76,
    });
    let lines = '';
    for (const n of Object.values(m.nodes)) {
      const a = pos(n);
      for (const nid of n.next) {
        const b = pos(m.nodes[nid]);
        const taken = n.visited && m.nodes[nid].visited;
        lines += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="${taken ? 'taken' : ''}" />`;
      }
    }
    const nodes = Object.values(m.nodes).map((n) => {
      const p = pos(n);
      const can = reach.includes(n.id);
      const cls = ['mnode', 't-' + n.type, can ? 'reach' : '', n.visited ? 'visited' : '', s.pos === n.id ? 'here' : ''].join(' ');
      return `<button class="${cls}" style="left:${p.x}%;top:${p.y}%" ${can ? `data-act="node" data-id="${n.id}"` : 'disabled'}
        aria-label="${n.floor}층 ${DT.map.label(n.type)}">${DT.map.icon(n.type)}</button>`;
    }).join('');
    const W = DT.config.wanted;
    const ambush = Math.round(Math.min(W.ambushCap, s.wanted * W.ambushPerWanted) * 100);
    return {
      key: 'map:' + s.pos + ':' + s.gold + ':' + s.wanted + ':' + s.player.masterDeck.length,
      html: `<div class="panel full mapview">
        <div class="maphead">
          <div><span class="dimname">${DT.data.dimensions[s.dimension].name}</span> <span class="turn">${s.floor ? s.floor + '층' : '출발 전'} / ${F}층</span></div>
          ${partyStrip(s)}
          <div class="mh-right">
            <span class="money">💰 ${s.gold} · 🪙 ${s.runCoins}</span>
            <span class="wanted" data-act="info" data-msg="수배도가 높을수록 일반 전투가 수배 추격대(정예)로 바뀔 확률이 오른다. 은신처에서 잠복하면 감소.">🚨 수배도 ${s.wanted}${ambush ? ` · 추격대 ${ambush}%` : ''}</span>
            <button class="btn small" data-act="pile" data-pile="masterDeck">내 덱 ${s.player.masterDeck.length}</button>
            ${escapeBtn(s)}
          </div>
        </div>
        <div class="maparea"><svg viewBox="0 0 100 100" preserveAspectRatio="none">${lines}</svg>${nodes}</div>
        <div class="maplegend">${['combat', 'elite', 'event', 'market', 'hideout', 'boss'].map((t) => `<span>${DT.map.icon(t)} ${DT.map.label(t)}</span>`).join('')}
          <span class="lg-hint">빛나는 칸을 탭해 이동</span></div>
      </div>`,
    };
  }

  // ── 은신처 ──
  function hideoutContent(app) {
    const s = app.state;
    const H = DT.config.hideout;
    const canUp = s.player.masterDeck.some((c) => DT.cards.canUpgrade(c));
    return {
      key: 'hideout:' + s.pos,
      html: `<div class="panel">
        <h1>🏕️ 은신처</h1>
        <p>하나만 고를 수 있다.</p>
        ${partyStrip(s)}
        <div class="choices">
          <button class="btn choice" data-act="rest">🔥 <b>휴식</b><small>아군 전원 최대 체력의 ${Math.round(H.healRatio * 100)}% 회복</small></button>
          <button class="btn choice" data-act="deck-pick" data-purpose="upgrade" ${canUp ? '' : 'disabled'}>⚒️ <b>강화</b><small>카드 1장 강화</small></button>
          <button class="btn choice" data-act="laylow" ${s.wanted ? '' : 'disabled'}>🤫 <b>잠복</b><small>수배도 −${DT.config.wanted.hideoutReduce} (지금 ${s.wanted})</small></button>
        </div></div>`,
    };
  }

  // ── 암시장 ──
  function marketContent(app) {
    const s = app.state;
    const m = s.market;
    const offers = m.cards.map((it, i) => `<div class="offer ${it.sold ? 'sold' : ''}">
      ${cardHTML({ uid: '', id: it.id, origin: DT.cards.def(it.id).origin })}
      <button class="btn price" data-act="buy" data-i="${i}" ${it.sold || s.gold < it.price ? 'disabled' : ''}>${it.sold ? '판매 완료' : `💰 ${it.price}`}</button>
    </div>`).join('');
    return {
      key: 'market:' + s.pos + ':' + s.gold + ':' + m.cards.map((c) => (c.sold ? 1 : 0)).join('') + (m.removed ? 'r' : ''),
      html: `<div class="panel wide">
        <h1>🛒 암시장</h1>
        <p>💰 골드 <b>${s.gold}</b></p>
        <div class="pickrow">${offers}</div>
        <div class="choices">
          <button class="btn choice" data-act="deck-pick" data-purpose="remove" ${m.removed || s.gold < m.removePrice ? 'disabled' : ''}>🗑️ <b>카드 제거</b><small>${m.removed ? '이번 방문에서 사용함' : `💰 ${m.removePrice}`}</small></button>
          <button class="btn choice" disabled>🌀 <b>귀화</b><small>G단계에서 열림</small></button>
        </div>
        <div class="row"><button class="btn big" data-act="leave">떠나기</button></div>
      </div>`,
    };
  }

  // ── 이벤트 ──
  function eventContent(app) {
    const s = app.state;
    const ev = DT.data.events[s.event];
    return {
      key: 'event:' + s.event + ':' + s.pos,
      html: `<div class="panel">
        <div class="ev-icon">${ev.icon}</div>
        <h1>${ev.title}</h1>
        <p class="ev-text">${ev.text}</p>
        <div class="choices col">${ev.options.map((o, i) => `<button class="btn choice" data-act="event-opt" data-i="${i}" ${DT.run.canChooseEvent(s, i) ? '' : 'disabled'}>
          <b>${o.label}</b><small>${o.desc || ''}</small></button>`).join('')}</div>
      </div>`,
    };
  }

  // ── 덱에서 카드 고르기(강화·제거) ──
  function deckPickContent(app) {
    const s = app.state;
    const dp = app.deckPick;
    const up = dp.purpose === 'upgrade';
    const list = s.player.masterDeck.filter((c) => !up || DT.cards.canUpgrade(c)).slice().sort((a, b) => a.id.localeCompare(b.id));
    const sel = dp.uid && s.player.masterDeck.find((c) => c.uid === dp.uid);
    const preview = sel && up ? `<div class="uppreview">${cardHTML(sel)}<span>→</span>${cardHTML(Object.assign({}, sel, { up: 1 }))}</div>` : '';
    return {
      key: 'deckpick:' + dp.purpose + ':' + (dp.uid || ''),
      html: `<div class="panel wide">
        <h2>${up ? '⚒️ 강화할 카드' : `🗑️ 제거할 카드 (💰 ${s.market ? s.market.removePrice : ''})`}</h2>
        ${preview}
        <div class="pilelist">${list.map((c) => cardHTML(c, { small: true, selected: dp.uid === c.uid, attrs: `data-act="deck-card" data-uid="${c.uid}"` })).join('')}</div>
        <div class="row"><button class="btn big" data-act="deck-cancel">취소</button>
          <button class="btn big primary" data-act="deck-confirm" ${dp.uid ? '' : 'disabled'}>${up ? '강화' : '제거'}</button></div>
      </div>`,
    };
  }

  // ── 판 종료 ──
  function runEndContent(app) {
    const s = app.state;
    const r = s.runEnd;
    const meta = DT.save.loadMeta();
    const title = { clear: '<h1 class="win">🏆 차원 클리어!</h1>', death: '<h1 class="lose">💀 붙잡혔다…</h1>',
      mapEscape: '<h1 class="heist">🏃 무사히 도주</h1>', combatEscape: '<h1 class="heist">🏃 전투 중 도주</h1>' }[r.how];
    const st = s.stats;
    return {
      key: 'runEnd:' + s.seed + ':' + r.how,
      html: `<div class="panel">
        ${title}
        <p>${r.floor}층까지 진행</p>
        <div class="coinbox">이번 판 코인 <b>🪙 ${r.runCoins}</b> × ${Math.round(r.keep * 100)}% = <b class="banked">🪙 ${r.banked}</b> 보존</div>
        <p>보유 코인 <b>🪙 ${meta.coins}</b> <small>(로비 강화는 D단계에서 열림)</small></p>
        <p class="stats">처치 ${st.kills} · 슬쩍 ${st.steals} · 강탈 ${st.heists} · 영입 ${st.recruits || 0} · 복제 ${st.copies} · 덱 ${s.player.masterDeck.length}장</p>
        <div class="row">
          <button class="btn big" data-act="retry">같은 시드로 다시</button>
          <button class="btn big primary" data-act="to-lobby">🏠 로비로 귀환</button>
        </div></div>`,
    };
  }

  // ── 로비 ──
  function lobbyContent(app) {
    const meta = DT.save.loadMeta();
    const s = app.state;
    const active = s && s.screen !== 'runEnd';
    const pips = (lv, max) => '●'.repeat(lv) + '○'.repeat(max - lv);
    const ups = Object.entries(DT.data.upgrades).map(([id, u]) => {
      const lv = DT.lobby.level(meta, id);
      const max = u.costs.length;
      const cost = DT.lobby.nextCost(meta, id);
      const locked = DT.lobby.locked(id);
      let btn;
      if (locked) btn = `<button class="btn small" disabled>🔒 ${u.lockedUntil}단계에서 열림</button>`;
      else if (cost === null) btn = '<button class="btn small" disabled>최대</button>';
      else btn = `<button class="btn small ${meta.coins >= cost ? 'primary' : ''}" data-act="buy-upgrade" data-id="${id}" ${meta.coins >= cost ? '' : 'disabled'}>🪙 ${cost}</button>`;
      return `<div class="uptile ${locked ? 'locked' : ''}">
        <div class="ut-head"><span class="ut-icon">${u.icon}</span><b>${u.name}</b><span class="pips">${pips(lv, max)}</span></div>
        <div class="ut-now">${lv ? u.levels[lv - 1] : '없음'}</div>
        <div class="ut-next">${cost !== null && !locked ? `다음: ${u.levels[lv]}` : ''}</div>
        ${btn}
      </div>`;
    }).join('');
    const comps = Object.entries(DT.data.companions).map(([k, d]) => {
      const open = DT.lobby.companionUnlocked(meta, k);
      return `<div class="comptile ${open ? '' : 'locked'}">
        <span class="ct-icon">${d.icon}</span><b>${d.name}</b><small>${DT.party.roleIcon(d.role)} ${DT.party.roleName(d.role)}</small>
        ${open ? '<small class="ok">사용 가능</small>' : `<button class="btn small ${meta.coins >= d.unlockCost ? 'primary' : ''}" data-act="unlock" data-id="${k}" ${meta.coins >= d.unlockCost ? '' : 'disabled'}>🪙 ${d.unlockCost} 해금</button>`}
      </div>`;
    }).join('');
    const facilities = [['🏪', '상점'], ['📦', '창고'], ['🎒', '출발 준비'], ['🧔', '상인'], ['⚒️', '대장간']]
      .map(([i, n]) => `<div class="factile locked"><span>${i}</span><b>${n}</b><small>🔒 F단계</small></div>`).join('');
    return {
      key: 'lobby:' + meta.coins + ':' + JSON.stringify(meta.upgrades) + ':' + (meta.unlocked || []).join(',') + ':' + (active ? s.floor : '-'),
      html: `<div class="panel full lobby">
        <div class="lobbyhead">
          <h1>🦹 차원 도둑 <small>은신처 로비</small></h1>
          <div class="coins">🪙 <b>${meta.coins}</b> 코인</div>
        </div>
        <div class="lobbygrid">
          <section class="lb-left">
            ${active
              ? `<button class="btn big primary go" data-act="go">▶ 이어하기<small>${DT.data.dimensions[s.dimension].name} ${s.floor ? s.floor + '층' : '출발 전'} · 🪙 ${s.runCoins}</small></button>
                 <button class="btn small" data-act="abandon">이 판 포기하기</button>`
              : `<button class="btn big primary go" data-act="go">▶ 출발<small>${app.urlSeed ? `시드 ${app.urlSeed}` : '중세 왕국으로'}</small></button>`}
            <div class="records">
              <h3>기록</h3>
              <div>판 ${meta.runs} · 클리어 ${meta.clears} · 최고 ${meta.bestFloor}층</div>
              <div>승리한 전투 ${meta.combatsWon}</div>
              <div>슬쩍 ${meta.steals} · 강탈 ${meta.heists} · 복제 ${meta.copies}</div>
              <div>도감 ${Object.keys(meta.codex || {}).length}장</div>
            </div>
          </section>
          <section class="lb-right">
            <h3>영구 강화</h3>
            <div class="upgrid">${ups}</div>
            <h3>동료</h3>
            <div class="comprow">${comps}</div>
            <h3>시설</h3>
            <div class="facrow">${facilities}</div>
          </section>
        </div>
      </div>`,
    };
  }

  function renderOverlay(app) {
    const ov = $('#overlay');
    const c = overlayContent(app);
    if (!c) {
      ov.innerHTML = '';
      ov.dataset.key = '';
      ov.classList.remove('show');
      return;
    }
    if (ov.dataset.key === c.key) {
      // 같은 화면이면 선택 표시만 갱신 (등장 애니메이션 재생 방지)
      ov.querySelectorAll('[data-act="pick"]').forEach((el) => el.classList.toggle('selected', el.dataset.id === app.pick));
      ov.querySelectorAll('[data-act="heist-take"],[data-act="reward-take"]').forEach((b) => { b.disabled = !app.pick; });
      ov.querySelectorAll('[data-act="pick-comp"]').forEach((el) => el.classList.toggle('selected', app.picks.includes(el.dataset.id)));
      const go = ov.querySelector('[data-act="start-run"]');
      if (go) {
        go.disabled = !app.picks.length;
        go.textContent = app.picks.length ? `${app.picks.map((k) => DT.data.companions[k].name).join(' · ')}와 출발` : '동료를 탭하세요';
      }
      return;
    }
    ov.dataset.key = c.key;
    ov.innerHTML = c.html;
    ov.classList.add('show');
    // 전투가 막 끝난 화면은 마지막 타격 연출을 본 뒤 등장
    ov.classList.toggle('late', /^(heist|reward|runEnd):/.test(c.key));
  }

  UI.render = function (app) {
    if (app.view === 'lobby' || !app.state) {
      UI.applyTheme('thief');
      renderOverlay(app);
      return;
    }
    UI.applyTheme(app.state.dimension);
    renderTop(app);
    renderAllies(app);
    renderEnemies(app);
    renderHand(app);
    renderControls(app);
    renderHint(app);
    renderLog(app.state);
    renderOverlay(app);
  };

  // ── 연출 ──
  function floatAt(id, text, cls, i) {
    const el = document.querySelector(`[data-actor="${id}"] .portrait`);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const f = document.createElement('div');
    f.className = 'float ' + cls;
    f.textContent = text;
    f.style.left = r.left + r.width / 2 + ((i % 3) - 1) * 26 + 'px';
    f.style.top = r.top + r.height * 0.2 + 'px';
    f.style.animationDelay = (i % 8) * 90 + 'ms';
    $('#fx').appendChild(f);
    setTimeout(() => f.remove(), 1400 + (i % 8) * 90);
  }

  function shake(id) {
    const el = document.querySelector(`[data-actor="${id}"]`);
    if (!el) return;
    el.classList.remove('hit');
    void el.offsetWidth;
    el.classList.add('hit');
  }

  let bannerTimer = null;
  function banner(html, cls) {
    const b = $('#banner');
    b.innerHTML = html;
    b.className = 'show ' + (cls || '');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => { b.className = ''; }, 1100);
  }

  const plainCard = (id) => ({ uid: '', id, origin: DT.cards.def(id).origin });

  UI.playEvents = function (app, events) {
    const s = app.state;
    events.forEach((ev, i) => {
      if (ev.type === 'damage') {
        if (ev.blocked) floatAt(ev.target, `🛡-${ev.blocked}`, 'blocked', i);
        if (ev.amount > 0) { floatAt(ev.target, `-${ev.amount}`, 'dmg', i); shake(ev.target); }
      } else if (ev.type === 'block') {
        floatAt(ev.target, `+${ev.amount}🛡`, 'blk', i);
      } else if (ev.type === 'heal' && ev.amount > 0) {
        floatAt(ev.target, `+${ev.amount}`, 'heal', i);
      } else if (ev.type === 'status') {
        const d = DT.data.statuses[ev.status] || { name: ev.status, icon: '' };
        floatAt(ev.target, `${d.icon}${d.name} ${ev.amount > 0 ? '+' : ''}${ev.amount}`, 'stat', i);
      } else if (ev.type === 'death' && ev.executable) {
        floatAt(ev.target, '💰 강탈!', 'heist', i);
      } else if (ev.type === 'cover') {
        floatAt(ev.target, '🫡 엄호!', 'stat', i);
      } else if (ev.type === 'move') {
        floatAt(ev.target, '↩️ 뒷줄로', 'stat', i);
      } else if (ev.type === 'basic') {
        const a = actor(s, ev.actor);
        banner(`<div class="b-who">${a ? a.name : ''}: 표적 공격!</div>`, 'ally');
      } else if (ev.type === 'play' && ev.actor !== 'player') {
        const a = actor(s, ev.actor);
        const ally = DT.state.isAlly(ev.actor);
        const tgt = ev.target ? actor(s, ev.target) : null;
        banner(`<div class="b-who">${a ? a.name : ''}의 행동${tgt ? ` → ${tgt.name}` : ''}</div>${cardHTML(ev.card, { view: { state: s, srcId: ev.actor, tgtId: ev.target || null } })}`, ally ? 'ally' : 'enemy');
      } else if (ev.type === 'steal' && ev.by === 'player') {
        banner(`<div class="b-who">슬쩍 성공!</div>${cardHTML(Object.assign(plainCard(ev.cardId), { temp: true }))}`, 'steal');
      } else if (ev.type === 'copy' && ev.by === 'player') {
        banner(`<div class="b-who">복제!</div>${cardHTML(plainCard(ev.cardId))}`, 'steal');
      } else if (ev.type === 'passive') {
        floatAt(ev.target, ev.text, 'stat', i);
      } else if (ev.type === 'recruit') {
        const a = actor(s, ev.id);
        banner(`<div class="b-who">🤝 ${a ? a.name : ''} 합류!</div>`, 'steal');
      }
    });
  };
})();
