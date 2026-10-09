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
      o.glow ? 'glow' : '', card.temp ? 'temp' : '', card.up ? 'upgraded' : '', card.locked ? 'locked' : ''].join(' ');
    return `<div class="${cls}" style="--origin:${dim.color || '#888'}" ${o.attrs || ''}>
      <div class="c-cost ${o.cost !== undefined && o.cost < DT.cards.costOf(card) ? 'cheap' : ''}">${o.cost !== undefined ? o.cost : DT.cards.costOf(card)}</div>
      <div class="c-name">${DT.cards.nameOf(card)}</div>
      <div class="c-art">${def.icon || DT.cards.typeIcon[def.type] || '✦'}</div>
      <div class="c-desc"><div>${DT.cards.describe(card, o.view)}</div></div>
      <div class="c-foot"><span class="c-origin">${dim.name || card.origin}</span>${card.temp ? '<span class="c-tag">슬쩍</span>' : ''}</div>
      ${card.locked ? '<div class="c-lock">🔒</div>' : ''}
    </div>`;
  }
  UI.cardHTML = cardHTML;

  // 공개 카드·동료 행동을 한 줄 요약으로
  function chipHTML(card, o) {
    o = o || {};
    if (o.hidden) return '<div class="chip back">? 비공개</div>';
    const def = DT.cards.def(card.id);
    const desc = DT.cards.describe(card, o.view).replace(/<br>/g, ' · ');
    return `<div class="chip type-${def.type} ${o.glow ? 'glow' : ''} ${card.locked ? 'locked' : ''}" ${o.attrs || ''}>
      <span class="chip-icon">${card.locked ? '🔒' : def.icon || ''}</span><span class="chip-name">${def.name}</span>
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
        ${s.ascension ? `<span class="ascbadge" data-act="info" data-msg="승천 ${s.ascension}: ${DT.config.ascension.levels.slice(0, s.ascension).map((l) => l.desc).join(' · ')}">🔥A${s.ascension}</span>` : ''}
        <span class="wanted" data-act="info" data-msg="수배도: 강탈·영입할 때마다 +1. 높을수록 전투 골드가 늘고, 일반 전투가 수배 추격대(정예)로 바뀔 확률이 오른다. 은신처 잠복으로 −2.">🚨 수배도 ${s.wanted}</span>
        ${instBadge(s)}${relicBar(s)}</div>
      <div class="tb-mid">${phase}</div>
      <div class="tb-right">
        <span class="money" data-act="info" data-msg="골드: 이번 판에서만 쓰는 돈(암시장·이벤트). 코인: 판이 끝나면 비율대로 남는 영구 화폐.">💰 ${s.gold} · 🪙 ${s.runCoins}</span>
        <button class="btn small" data-act="pile" data-pile="masterDeck">내 덱 ${s.player.masterDeck.length}</button>
        <button class="btn small" data-act="bag">🎒 ${s.bag.length}/${DT.items.bagCap(s)}</button>
        <button class="btn small gear" data-act="settings-open" aria-label="설정">⚙️</button>
        ${escapeBtn(s)}</div>`;
  }

  function instBadge(s) {
    if (!s.map) return '';
    const inf = DT.run.instabilityInfo(s);
    const label = { safe: '안전', unstable: '불안정', critical: '폭주' }[inf.level];
    const msg = `차원 불안정 ${inf.value}: 현재 차원과 출신이 다른 카드 수. ${inf.safeMax} 이하 안전, ${inf.unstableMax} 이하 전투마다 1장 변이, 그 이상 2장 변이 + 매 턴 피해 1.${inf.ignored ? ' (차원 장막으로 무시 중)' : ''} 은신처·암시장에서 귀화하면 줄어든다.`;
    return `<span class="instbadge lv-${inf.level}" data-act="info" data-msg="${msg}">🌀 ${inf.value} ${label}${inf.ignored ? ' 🛡' : ''}</span>`;
  }

  // 가진 유물 아이콘(탭하면 설명)
  function relicBar(s) {
    const list = s.relics || [];
    if (!list.length) return '';
    return `<span class="relicbar">${list.map((id) => {
      const d = DT.relics.def(id);
      return `<span class="relic g-${d.grade}" data-act="info" data-msg="${d.icon} ${d.name} (${DT.relics.gradeName[d.grade]} 유물): ${d.desc}">${d.icon}</span>`;
    }).join('')}</span>`;
  }
  function relicTile(id, attrs, sel) {
    const d = DT.relics.def(id);
    return `<div class="rtile g-${d.grade} ${sel ? 'sel' : ''}" ${attrs || ''}><span class="ri">${d.icon}</span>
      <b>${d.name}</b><small class="g-${d.grade}">${DT.relics.gradeName[d.grade]} 유물</small><span class="rd">${d.desc}</span></div>`;
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
          ${isComp && !a.fromEnemy && (a.lv > 1 || a.bt) ? `<div class="lvtag">Lv.${a.lv}${a.bt ? ' ' + '★'.repeat(a.bt) : ''}</div>` : ''}
          ${equipIcons(a)}
          ${barHTML(a)}
          <div class="sts">${statusesHTML(a)}</div>
        </div>
        ${a.dead ? '<div class="cintent">쓰러짐</div>' : intent}
      </div>`;
    }).join('');
  }

  // 활성 시너지(탭하면 설명)
  function renderSynergy(app) {
    const el = $('#synergy');
    if (!el) return;
    const s = app.state;
    const list = s.screen === 'combat' ? DT.synergy.list(s) : [];
    el.innerHTML = list.map((x) => {
      const I = DT.synergy.INFO[x.id];
      return `<span class="syn ${x.active ? 'on' : 'off'}" data-act="info" data-msg="${I.icon} ${I.name}${x.active ? '' : ' (다른 차원이라 꺼짐)'}: ${I.desc(x.origin)}">${I.icon} ${I.name}${x.origin ? ' · ' + DT.data.dimensions[x.origin].name : ''}</span>`;
    }).join('');
  }

  // 적: 앞줄 → 뒷줄 순서
  function renderEnemies(app) {
    const s = app.state;
    const sel = selectedCard(app);
    const selDef = sel && DT.cards.def(sel.id);
    const targeting = selDef && DT.cards.needsTarget(selDef);
    const stealing = selDef && DT.cards.choiceOf(selDef) === 'revealed';
    const threshold = DT.combat.heistThreshold(s);
    const taunter = DT.party.living(s).find((a) => (a.statuses.taunt || 0) > 0);
    const ordered = [...s.enemies.filter((e) => e.row !== 'back'), ...s.enemies.filter((e) => e.row === 'back')];
    $('#enemies').classList.toggle('crowd', s.enemies.length > 4);   // 크라켄 촉수 8개: 두 줄 격자
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
      const heistNext = !e.dead && !e.heistReady && DT.combat.belowHeistLine(e, s);
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
      view, cost: DT.combat.costFor(s, c),
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
      ${d.ability ? `<div class="cc-desc">✨ ${DT.abilities.describe({ id: d.ability.id, value: DT.gacha.abilityValue(kind, 0) })}</div>` : d.desc ? `<div class="cc-desc">${d.desc}</div>` : ''}
      <div class="cc-deck">${Object.entries(counts).map(([id, n]) => `<span>${DT.cards.def(id).icon || ''} ${DT.cards.def(id).name}${n > 1 ? ' ×' + n : ''}</span>`).join('')}</div>
    </div>`;
  }

  function overlayContent(app) {
    const s = app.state;
    if (app.settingsOpen) {
      const S = DT.settings;
      const row = (key, label, sub) => `<div class="toggle"><div><b>${label}</b><br><small class="muted">${sub}</small></div>
        <button class="btn ${S[key] !== false ? 'primary' : ''}" data-act="setting" data-key="${key}">${S[key] !== false ? '켜짐' : '꺼짐'}</button></div>`;
      return {
        key: 'settings:' + JSON.stringify(S),
        html: `<div class="panel settings">
          <h1>⚙️ 설정</h1>
          ${row('sound', '🔊 효과음', '타격·방어·훔치기·코인·뽑기 소리')}
          ${row('shake', '📳 화면 흔들림', '피격 시 화면·캐릭터 흔들림 (붉은 깜빡임은 유지)')}
          <div class="row"><button class="btn big" data-act="settings-close">닫기</button></div>
        </div>`,
      };
    }
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
    if (app.bagView) return bagContent(app);
    if (app.deckPick) return deckPickContent(app);
    if (s.screen === 'map') return mapContent(app);
    if (s.screen === 'hideout') return hideoutContent(app);
    if (s.screen === 'rift') return riftContent(app);
    if (s.screen === 'market') return marketContent(app);
    if (s.screen === 'event') return eventContent(app);
    if (s.screen === 'eventResult') return eventResultContent(app);
    if (s.screen === 'voidGate') {
      return {
        key: 'voidGate:' + s.seed,
        html: `<div class="panel voidgate">
          <h1 class="win">🕳️ 차원의 틈이 열렸다</h1>
          <p>마왕이 쓰러지자 네 차원의 카드가 공명한다. 틈 너머에 <b>누군가</b>가 기다리고 있다.</p>
          <ul class="ev-notes">
            <li>🌀 ${DT.config.void.floors}층짜리 비밀 차원. 네 차원의 적이 뒤섞여 나오고, 차원 불안정이 없다</li>
            <li>⚠️ 지금 귀환하면 그대로 클리어(코인 100%). 들어가서 쓰러지면 사망 규칙</li>
          </ul>
          <div class="row"><button class="btn big" data-act="void-skip">🏠 귀환(클리어)</button>
            <button class="btn big primary" data-act="next-dim">🕳️ 틈으로 들어간다</button></div>
        </div>`,
      };
    }
    if (s.screen === 'dimClear') {
      const dim = DT.data.dimensions[s.dimension];
      const next = DT.data.dimensions[dim.next];
      const nextInst = s.player.masterDeck.filter((c) => c.origin !== dim.next && !(DT.data.dimensions[c.origin] && DT.data.dimensions[c.origin].neutral)).length;
      return {
        key: 'dimClear:' + s.dimension,
        html: `<div class="panel">
          <h1 class="win">🌀 ${dim.name} 정복!</h1>
          <p>차원의 문이 열렸다. 다음은 <b style="color:${next.color}">${next.name}</b> (${next.order}/4차원).</p>
          <ul class="ev-notes">
            <li>💚 이동하면서 아군 전원 최대 체력의 ${Math.round(DT.config.dimension.travelHeal * 100)}% 회복</li>
            <li>🌀 ${dim.name} 카드는 이제 <b>다른 차원 카드</b> → 차원 불안정 ${DT.run.instability(s)} → <b>${nextInst}</b>${s.instabilityMod ? ' (안정제 효과는 끝남)' : ''}<br>
              <small>도착하면 맵에서 <b>무료 귀화 ${DT.config.dimension.freeNaturalize}회</b>를 쓸 수 있다</small></li>
            <li>🪙 이번 판 코인 ${s.runCoins} — 지금 도주하면 100% 보존</li>
          </ul>
          <div class="row"><button class="btn big primary" data-act="next-dim">${next.name}(으)로</button></div>
        </div>`,
      };
    }
    if (s.screen === 'pickRelic') {
      return {
        key: 'pickRelic:' + s.seed + ':' + (app.pick || ''),
        html: `<div class="panel wide">
          <h1>🏺 시작 유물</h1>
          <p>${s.relicChoices.length > 1 ? `후보 ${s.relicChoices.length}개 중 하나를 골라 출발한다.` : '유물 수집가: 이 유물을 들고 출발한다.'} 유물은 이번 판 동안 유지된다.</p>
          <div class="pickrow">${s.relicChoices.map((id) => relicTile(id, `data-act="relic-sel" data-id="${id}"`, app.pick === id || s.relicChoices.length === 1)).join('')}</div>
          <div class="row"><button class="btn big primary" data-act="pick-relic" ${app.pick || s.relicChoices.length === 1 ? '' : 'disabled'}>가지고 출발</button></div>
        </div>`,
      };
    }
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
          ${s.reward.kind !== 'event' && s.lastLoot ? `<p class="loot">💰 골드 +${s.lastLoot.gold} · 🪙 코인 +${s.lastLoot.coins}</p>
            ${(s.lastLoot.items || []).length ? `<div class="lootitems">🎒 획득 ${s.lastLoot.items.map((it) => itemTile(it, { compact: true })).join('')}</div>` : ''}
            ${(s.lastLoot.lostItems || []).length ? `<p class="warnline">가방이 가득 차서 두고 온 아이템: ${s.lastLoot.lostItems.map((it) => DT.items.def(it.id).name).join(', ')}</p>` : ''}
            ${s.lastLoot.relic ? `<div class="lootrelic">🏺 유물 획득 ${relicTile(s.lastLoot.relic)}</div>` : ''}
            ${(s.lastLoot.xp || []).length ? `<p class="xpline">✨ 경험치 ${s.lastLoot.xp.map((g) => `${DT.data.companions[g.kind].icon} +${g.xp}`).join(' · ')}</p>` : ''}` : ''}
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

  // ── 아이템 ──
  function itemTile(it, o) {
    o = o || {};
    const d = DT.items.def(it.id);
    const sub = d.kind === 'equip' ? DT.items.slotName[d.slot] : d.kind === 'consumable' ? '소모품' : '전리품';
    if (o.compact) return `<span class="ichip g-${d.grade} ${o.lost ? 'lost' : ''}" title="${d.name}: ${d.desc}">${d.icon} ${d.name}${it.plus ? ' +' + it.plus : ''}</span>`;
    return `<div class="itile g-${d.grade} ${o.sel ? 'sel' : ''}" ${o.attrs || ''}>
      <span class="ii">${d.icon}</span><span class="in">${d.name}${it.plus ? ' +' + it.plus : ''}</span>
      <span class="ig">${DT.items.gradeName[d.grade]} · ${sub}</span></div>`;
  }
  UI.itemTile = itemTile;

  function equipIcons(a) {
    if (!a.equip) return '';
    const icons = DT.items.SLOTS.map((k) => a.equip[k]).filter(Boolean).map((it) => DT.items.def(it.id).icon);
    return icons.length ? `<div class="eqicons">${icons.join('')}</div>` : '';
  }

  function bagContent(app) {
    const s = app.state;
    const inCombat = s.screen === 'combat';
    const sel = app.bagSel && [...s.bag, ...s.pocket].find((it) => it.uid === app.bagSel);
    const inPocket = sel && s.pocket.some((it) => it.uid === sel.uid);
    const allies = DT.party.living(s);
    const slots = allies.map((a) => `<div class="eqrow">
      <div class="eqwho">${a.icon} <b>${a.name}</b> <small>${a.hp}/${a.maxHp}</small></div>
      ${DT.items.SLOTS.map((k) => {
        const it = a.equip && a.equip[k];
        return it ? `<div class="eqslot filled" ${inCombat ? '' : `data-act="unequip" data-id="${a.id}" data-slot="${k}"`}>${itemTile(it, { compact: true })}</div>`
          : `<div class="eqslot">${DT.items.slotName[k]}</div>`;
      }).join('')}
    </div>`).join('');
    const grid = (list, cap) => {
      let h = list.map((it) => itemTile(it, { sel: app.bagSel === it.uid, attrs: `data-act="bag-sel" data-uid="${it.uid}"` })).join('');
      for (let k = list.length; k < cap; k++) h += '<div class="itile empty"></div>';
      return h;
    };
    let actions = '<p class="muted">아이템을 탭하세요</p>';
    if (sel) {
      const d = DT.items.def(sel.id);
      const btns = [];
      if (d.kind === 'equip' && !inCombat) {
        allies.forEach((a) => btns.push(`<button class="btn small primary" data-act="equip" data-uid="${sel.uid}" data-to="${a.id}">${a.icon} ${a.name}에게 장착</button>`));
      }
      if (d.kind === 'consumable') {
        const why = DT.items.canUse(s, sel.uid);
        if (why) btns.push(`<button class="btn small" disabled>${why}</button>`);
        else if (d.use.target === 'none') btns.push(`<button class="btn small primary" data-act="use-item" data-uid="${sel.uid}">사용</button>`);
        else DT.items.targets(s, sel.uid).forEach((t) => btns.push(`<button class="btn small primary" data-act="use-item" data-uid="${sel.uid}" data-to="${t.id}">${t.icon} ${t.name}에게 사용</button>`));
      }
      if (!inCombat) {
        btns.push(inPocket ? `<button class="btn small" data-act="unpocket" data-uid="${sel.uid}">가방으로</button>`
          : `<button class="btn small" data-act="pocket" data-uid="${sel.uid}">👝 안전 주머니로</button>`);
        btns.push(`<button class="btn small danger" data-act="discard" data-uid="${sel.uid}">버리기</button>`);
      }
      actions = `<div class="seldesc"><b>${d.icon} ${d.name}</b> <span class="g-${d.grade}">${DT.items.gradeName[d.grade]}</span> — ${d.desc}</div>
        <div class="selbtns">${btns.join('')}</div>`;
    }
    return {
      key: 'bag:' + app.bagRev,
      html: `<div class="panel full bagview">
        <div class="maphead"><h2>🎒 가방 ${inCombat ? '<small>(전투 중: 소모품만 사용 가능)</small>' : ''}</h2>
          <button class="btn big" data-act="bag-close">닫기</button></div>
        <div class="baggrid">
          <section><h3>장비 ${inCombat ? '' : '<small>장착한 칸을 탭하면 가방으로</small>'}</h3>${slots}</section>
          <section>
            <h3>가방 ${s.bag.length}/${DT.items.bagCap(s)}</h3><div class="itemgrid">${grid(s.bag, DT.items.bagCap(s))}</div>
            <h3>👝 안전 주머니 ${s.pocket.length}/${DT.items.pocketCap(s)} <small>죽어도 남는다</small></h3><div class="itemgrid">${grid(s.pocket, DT.items.pocketCap(s))}</div>
            <div class="bagactions">${actions}</div>
          </section>
        </div>
      </div>`,
    };
  }

  // ── 맵 ──
  function partyStrip(s) {
    return `<div class="partystrip">${DT.party.allies(s).filter((a) => !a.dead).map((a) =>
      `<span class="pm">${a.icon} <b>${a.hp}</b>/${a.maxHp}</span>`).join('')}</div>`;
  }

  function mapContent(app) {
    const s = app.state;
    const m = s.map;
    const F = DT.map.floorsOf(s);
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
    const ambush = Math.round(Math.min(W.ambushCap, s.wanted * W.ambushPerWanted) * (1 - DT.relics.fx(s, 'ambushMult')) * 100);
    return {
      key: 'map:' + s.pos + ':' + s.gold + ':' + s.wanted + ':' + s.player.masterDeck.length + ':' + (s.relics || []).join(',') + ':' + DT.run.instability(s) + ':' + (s.freeNaturalize || 0),
      html: `<div class="panel full mapview">
        <div class="maphead">
          <div><span class="dimname">${DT.data.dimensions[s.dimension].name}</span> <span class="turn">${s.floor ? s.floor + '층' : '출발 전'} / ${F}층</span>${relicBar(s)}</div>
          ${partyStrip(s)}
          <div class="mh-right">
            <span class="money">💰 ${s.gold} · 🪙 ${s.runCoins}</span>
            <span class="wanted" data-act="info" data-msg="수배도가 높을수록 전투 골드가 늘고, 일반 전투가 수배 추격대(정예)로 바뀔 확률이 오른다. 은신처에서 잠복하면 감소.">🚨 수배도 ${s.wanted}${ambush ? ` · 추격대 ${ambush}%` : ''}</span>
            ${instBadge(s)}
            ${s.freeNaturalize > 0 && DT.run.naturalizable(s).length ? `<button class="btn small primary" data-act="deck-pick" data-purpose="naturalize-free">🌀 무료 귀화 ${s.freeNaturalize}</button>` : ''}
            <button class="btn small" data-act="pile" data-pile="masterDeck">내 덱 ${s.player.masterDeck.length}</button>
            <button class="btn small" data-act="bag">🎒 가방 ${s.bag.length}/${DT.items.bagCap(s)}</button>
            ${escapeBtn(s)}
          </div>
        </div>
        <div class="maparea"><svg viewBox="0 0 100 100" preserveAspectRatio="none">${lines}</svg>${nodes}</div>
        <div class="maplegend">${['combat', 'elite', 'event', 'market', 'hideout', 'rift', 'boss'].concat(Object.values(m.nodes).some((n) => n.type === 'vault') ? ['vault'] : []).map((t) => `<span>${DT.map.icon(t)} ${DT.map.label(t)}</span>`).join('')}
          <span class="lg-hint">빛나는 칸을 탭해 이동</span></div>
      </div>`,
    };
  }

  // ── 차원 균열 ──
  function riftContent(app) {
    const s = app.state;
    const dim = DT.data.dimensions[s.rift.dimension];
    const inf = DT.run.instabilityInfo(s);
    return {
      key: 'rift:' + s.pos,
      html: `<div class="panel wide rift">
        <h1>🌀 차원 균열</h1>
        <p>균열 너머로 <b style="color:${dim.color}">${dim.name}</b>의 카드가 보인다. 하나를 가져오면 <b>차원 불안정 +1</b> (지금 ${inf.value}, 안전 ${inf.safeMax}까지)</p>
        ${pickRow(s.rift.options, app)}
        <div class="row">
          <button class="btn big" data-act="rift-skip">그냥 떠난다</button>
          <button class="btn big primary" data-act="rift-take" ${app.pick ? '' : 'disabled'}>가져가기</button>
        </div></div>`,
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
          <button class="btn choice" data-act="deck-pick" data-purpose="naturalize" ${DT.run.naturalizable(s).length ? '' : 'disabled'}>🌀 <b>귀화</b><small>카드 1장 출신을 ${DT.data.dimensions[s.dimension].name}로 (불안정 ${DT.run.instability(s)})</small></button>
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
      key: 'market:' + s.pos + ':' + s.gold + ':' + m.cards.map((c) => (c.sold ? 1 : 0)).join('') + (m.items || []).map((c) => (c.sold ? 1 : 0)).join('') + (m.relic && m.relic.sold ? 'R' : '') + (m.removed ? 'r' : '') + (m.naturalized ? 'n' : ''),
      html: `<div class="panel wide">
        <h1>🛒 암시장</h1>
        <p>💰 골드 <b>${s.gold}</b></p>
        <div class="pickrow">${offers}</div>
        ${(m.items || []).length || m.relic ? `<div class="itemoffers">${m.items.map((e, i) => `<div class="offer ${e.sold ? 'sold' : ''}">${itemTile(e.item)}
          <button class="btn price" data-act="buy-item" data-i="${i}" ${e.sold || s.gold < e.price ? 'disabled' : ''}>${e.sold ? '판매 완료' : `💰 ${e.price}`}</button></div>`).join('')}
          ${m.relic ? `<div class="offer ${m.relic.sold ? 'sold' : ''}">${relicTile(m.relic.id)}
            <button class="btn price" data-act="buy-relic" ${m.relic.sold || s.gold < m.relic.price ? 'disabled' : ''}>${m.relic.sold ? '판매 완료' : `💰 ${m.relic.price}`}</button></div>` : ''}</div>` : ''}
        <div class="choices">
          <button class="btn choice" data-act="deck-pick" data-purpose="remove" ${m.removed || s.gold < m.removePrice ? 'disabled' : ''}>🗑️ <b>카드 제거</b><small>${m.removed ? '이번 방문에서 사용함' : `💰 ${m.removePrice}`}</small></button>
          <button class="btn choice" data-act="deck-pick" data-purpose="naturalize-market" ${m.naturalized || s.gold < DT.run.naturalizePrice(s) || !DT.run.naturalizable(s).length ? 'disabled' : ''}>🌀 <b>귀화</b><small>${m.naturalized ? '이번 방문에서 사용함' : `💰 ${DT.run.naturalizePrice(s)} · 불안정 ${DT.run.instability(s)}`}</small></button>
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

  function eventResultContent(app) {
    const s = app.state;
    const o = s.eventOutcome;
    const ev = DT.data.events[o.event];
    return {
      key: 'eventResult:' + o.event + ':' + s.pos,
      html: `<div class="panel">
        <div class="ev-icon">${ev.icon}</div>
        <h1>${ev.title}</h1>
        <p class="ev-text">▶ ${o.label}</p>
        <ul class="ev-notes">${o.notes.map((n) => `<li>${n}</li>`).join('')}</ul>
        <div class="row"><button class="btn big primary" data-act="event-close">${s.reward ? '카드 고르기' : '계속'}</button></div>
      </div>`,
    };
  }

  // ── 덱에서 카드 고르기(강화·제거) ──
  function deckPickContent(app) {
    const s = app.state;
    const dp = app.deckPick;
    const up = dp.purpose === 'upgrade';
    const nat = dp.purpose === 'naturalize' || dp.purpose === 'naturalize-market' || dp.purpose === 'naturalize-free';
    const allowed = nat ? DT.run.naturalizable(s) : null;
    const list = s.player.masterDeck.filter((c) => (up ? DT.cards.canUpgrade(c) : nat ? allowed.includes(c) : true)).slice().sort((a, b) => a.id.localeCompare(b.id));
    const sel = dp.uid && s.player.masterDeck.find((c) => c.uid === dp.uid);
    const preview = sel && up ? `<div class="uppreview">${cardHTML(sel)}<span>→</span>${cardHTML(Object.assign({}, sel, { up: 1 }))}</div>` : '';
    return {
      key: 'deckpick:' + dp.purpose + ':' + (dp.uid || ''),
      html: `<div class="panel wide">
        <h2>${up ? '⚒️ 강화할 카드' : nat ? `🌀 귀화할 카드 — 출신을 ${DT.data.dimensions[s.dimension].name}로${dp.purpose === 'naturalize-market' ? ` (💰 ${DT.run.naturalizePrice(s)})` : dp.purpose === 'naturalize-free' ? ` (무료 ${s.freeNaturalize}회 남음)` : ''}` : `🗑️ 제거할 카드 (💰 ${s.market ? s.market.removePrice : ''})`}</h2>
        ${preview}
        <div class="pilelist">${list.map((c) => cardHTML(c, { small: true, selected: dp.uid === c.uid, attrs: `data-act="deck-card" data-uid="${c.uid}"` })).join('')}</div>
        <div class="row"><button class="btn big" data-act="deck-cancel">취소</button>
          <button class="btn big primary" data-act="deck-confirm" ${dp.uid ? '' : 'disabled'}>${up ? '강화' : nat ? '귀화' : '제거'}</button></div>
      </div>`,
    };
  }

  // ── 판 종료 ──
  function runEndContent(app) {
    const s = app.state;
    const r = s.runEnd;
    const meta = DT.save.loadMeta();
    const title = { clear: '<h1 class="win">🏆 모든 차원을 털었다!</h1>', death: '<h1 class="lose">💀 붙잡혔다…</h1>',
      scroll: '<h1 class="heist">📃 귀환 두루마리로 귀환</h1>',
      mapEscape: '<h1 class="heist">🏃 무사히 도주</h1>', combatEscape: '<h1 class="heist">🏃 전투 중 도주</h1>' }[r.how];
    const st = s.stats;
    return {
      key: 'runEnd:' + s.seed + ':' + r.how + ':' + (r.ascUnlocked || 0),
      html: `<div class="panel">
        ${title}
        <p>${DT.run.depthLabel(r.depth || r.floor)}까지 진행 · 시드 <b>${s.seed}</b>${s.ascension ? ` · 🔥 승천 ${s.ascension}` : ''}</p>
        ${r.ascUnlocked ? `<p class="heist">🔥 승천 ${r.ascUnlocked}단계가 열렸다! 출발 준비에서 고를 수 있다</p>` : ''}
        <div class="coinbox">이번 판 코인 <b>🪙 ${r.runCoins}</b> × ${Math.round(r.keep * 100)}% = <b class="banked">🪙 ${r.banked}</b> 보존</div>
        <p>보유 코인 <b>🪙 ${meta.coins}</b></p>
        ${r.items ? `<div class="enditems">
          ${r.items.kept.length ? `<div>📦 창고로 <b>${r.items.kept.length}</b>개 ${r.items.kept.map((it) => itemTile(it, { compact: true })).join('')}</div>` : '<div>📦 남은 아이템 없음</div>'}
          ${r.items.lost.length ? `<div class="warnline">❌ 잃어버림 ${r.items.lost.length}개 ${r.items.lost.map((it) => itemTile(it, { compact: true, lost: true })).join('')}</div>` : ''}
        </div>` : ''}
        <p class="stats">처치 ${st.kills} · 슬쩍 ${st.steals} · 강탈 ${st.heists} · 영입 ${st.recruits || 0} · 복제 ${st.copies} · 덱 ${s.player.masterDeck.length}장</p>
        <div class="row">
          <button class="btn big" data-act="retry">같은 시드로 다시</button>
          <button class="btn big primary" data-act="to-lobby">🏠 로비로 귀환</button>
        </div></div>`,
    };
  }

  // ── 로비 ──
  const TABS = [['main', '🏠 로비'], ['shop', '🏪 상점'], ['stash', '📦 창고'], ['merchant', '🧔 상인'], ['forge', '⚒️ 대장간'], ['gacha', '🎰 뽑기'], ['roster', '👥 동료'], ['codex', '📖 도감']];

  function lobbyContent(app) {
    const meta = DT.save.loadMeta();
    const tab = app.lobbyTab || 'main';
    const body = { main: lobbyMain, shop: lobbyShop, stash: lobbyStash, merchant: lobbyMerchant, forge: lobbyForge, prep: lobbyPrep, codex: lobbyCodex, gacha: lobbyGacha, roster: lobbyRoster }[tab](app, meta);
    const key = 'lobby:' + tab + ':' + JSON.stringify([meta.coins, meta.upgrades, meta.unlocked, meta.stash, meta.shop && meta.shop.slots, app.lsel, app.prep, app.prepSeed, app.urlSeed, meta.roster, meta.lastParty, app.gachaRev, app.rosterSel]) + ':' + (app.state ? app.state.floor : '-');
    return {
      key,
      html: `<div class="panel full lobby">
        <div class="lobbyhead">
          <h1>🦹 차원 도둑 <small>은신처 로비</small></h1>
          <div class="coins">🪙 <b>${meta.coins}</b> 코인 <button class="btn small gear" data-act="settings-open" aria-label="설정">⚙️</button></div>
        </div>
        <div class="ltabs">${TABS.map(([k, n]) => `<button class="btn small ${tab === k ? 'primary' : ''}" data-act="ltab" data-tab="${k}">${n}</button>`).join('')}
          ${tab === 'prep' ? '<button class="btn small primary">🎒 출발 준비</button>' : ''}</div>
        ${body}
      </div>`,
    };
  }

  function lobbyMain(app, meta) {
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
    return `<div class="lobbygrid">
      <section class="lb-left">
        ${active
          ? `<button class="btn big primary go" data-act="go">▶ 이어하기<small>${DT.data.dimensions[s.dimension].name} ${s.floor ? s.floor + '층' : '출발 전'} · 🪙 ${s.runCoins}</small></button>
             <button class="btn small" data-act="abandon">이 판 포기하기</button>`
          : `<button class="btn big primary go" data-act="go">▶ 출발 준비<small>${app.urlSeed ? `시드 ${app.urlSeed}` : '동료·장비·가방을 챙겨 중세 왕국으로'}</small></button>`}
        ${thiefLevelBox(meta)}
        <div class="records">
          <h3>기록</h3>
          <div>판 ${meta.runs} · 클리어 ${meta.clears} · 최고 ${DT.run.depthLabel(meta.bestFloor)}</div>
          <div>승리한 전투 ${meta.combatsWon}</div>
          <div>슬쩍 ${meta.steals} · 강탈 ${meta.heists} · 복제 ${meta.copies}</div>
          <div>📖 도감 ${DT.lobby.codexAll().filter((id) => DT.lobby.codexHas(meta, id)).length}/${DT.lobby.codexAll().length} · 🔥 승천 ${DT.lobby.ascensionMax(meta)}단계까지 열림</div>
          <div>📦 창고 ${meta.stash.length}/${DT.lobby.stashCap()}</div>
        </div>
      </section>
      <section class="lb-right">
        <h3>영구 강화</h3>
        <div class="upgrid">${ups}</div>
        <h3>동료</h3>
        <div class="comprow">${comps}</div>
      </section>
    </div>`;
  }

  function thiefLevelBox(meta) {
    const t = DT.lobby.thiefLevel(meta);
    const T = DT.config.thiefLevel;
    const prev = T[t.level - 1].at;
    const pct = t.next === null ? 100 : Math.round(((t.heists - prev) / (t.next - prev)) * 100);
    const extra = DT.lobby.pilferExtra(meta).map((e) => DT.effects.handlers[e.type].describe(e)).join(', ');
    return `<div class="records thieflv">
      <h3>🦹 도둑 레벨 ${t.level}<small> / ${t.max}</small></h3>
      <div class="lvbar"><div style="width:${pct}%"></div></div>
      <div>누적 강탈 ${t.heists}${t.next !== null ? ` · 다음 레벨 ${t.next}: ${t.nextDesc}` : ' · 최고 레벨'}</div>
      <div class="muted">슬쩍하기 추가 효과: ${extra || '없음'} <small>(손재주 강화 포함)</small></div>
    </div>`;
  }

  // ── 뽑기 ──
  const stars = (bt) => (bt ? '★'.repeat(bt) + '☆'.repeat(DT.config.gacha.maxBreak - bt) : '');
  function lobbyGacha(app, meta) {
    const C = DT.config.gacha;
    const left = DT.gacha.pityLeft(meta);
    const res = app.gachaResult || [];
    const best = res.reduce((m, r) => Math.max(m, DT.gacha.GRADES.indexOf(r.grade)), -1);
    const tiles = res.map((r, i) => {
      const d = DT.data.companions[r.kind];
      return `<div class="gtile g-${r.grade}" style="animation-delay:${i * 0.12 + (best >= 3 ? 0.5 : 0)}s">
        <span class="gi">${d.icon}</span><b>${d.name}</b>
        <small class="g-${r.grade}">${DT.gacha.gradeName[r.grade]} · ${DT.party.roleName(d.role)}</small>
        <span class="gnew">${r.isNew ? 'NEW!' : r.refund ? `최대 돌파 → 🪙 +${r.refund}` : `돌파 ${stars(r.bt)}`}</span></div>`;
    }).join('');
    return `<div class="facility gacha ${best >= 3 ? 'has-legend' : ''}">
      <div class="gachahead">
        <div class="rates">확률 ${Object.entries(C.rates).map(([g, v]) => `<span class="g-${g}">${DT.gacha.gradeName[g]} ${v}%</span>`).join(' · ')}</div>
        <div class="pity">⭐ 전설 확정까지 <b>${left}</b>회 <small>(${C.pity}회 천장)</small></div>
      </div>
      <div class="gachabtns">
        <button class="btn big ${meta.coins >= C.cost1 ? 'primary' : ''}" data-act="gacha-pull" data-n="1" ${meta.coins >= C.cost1 ? '' : 'disabled'}>1회 뽑기<small>🪙 ${C.cost1}</small></button>
        <button class="btn big ${meta.coins >= C.cost10 ? 'primary' : ''}" data-act="gacha-pull" data-n="10" ${meta.coins >= C.cost10 ? '' : 'disabled'}>10회 뽑기<small>🪙 ${C.cost10} · ${DT.gacha.gradeName[C.tenGuarantee]} 이상 1명 보장</small></button>
      </div>
      <div class="gresults" data-rev="${app.gachaRev || 0}">${tiles || '<p class="muted">동료를 뽑아 보세요. 같은 동료가 또 나오면 돌파(최대 5단계, 단계마다 능력치 +10%·고유 능력 강화).</p>'}</div>
    </div>`;
  }

  // ── 동료 목록 ──
  function lobbyRoster(app, meta) {
    const order = ['legend', 'hero', 'rare', 'common', 'basic'];
    const kinds = Object.keys(DT.data.companions).sort((a, b) => order.indexOf(DT.data.companions[a].grade || 'basic') - order.indexOf(DT.data.companions[b].grade || 'basic'));
    const party = (meta.lastParty || []);
    const max = DT.lobby.companionPicks(meta);
    const tiles = kinds.map((k) => {
      const d = DT.data.companions[k];
      const grade = d.grade || 'basic';
      const owned = DT.lobby.starterOptions(meta).includes(k);
      if (!owned) {
        const hidden = d.secret;
        return `<div class="rtile2 locked g-${grade === 'basic' ? 'common' : grade}"><span class="ri">${hidden ? '❔' : d.icon}</span>
          <b>${hidden ? '???' : d.name}</b><small>${hidden ? '숨겨진 동료' : `${DT.gacha.gradeName[grade]} · ${DT.party.roleName(d.role)}`}</small>
          <small class="muted">${hidden ? '???' : grade === 'basic' ? '로비에서 코인으로 해금' : '뽑기로 얻기'}</small></div>`;
      }
      const e = DT.gacha.entry(meta, k);
      const inParty = party.includes(k);
      const ab = d.ability ? DT.abilities.describe({ id: d.ability.id, value: DT.gacha.abilityValue(k, e.bt) }) : d.desc;
      const next = e.lv < DT.config.growth.maxLevel ? `${e.xp}/${DT.gacha.xpToNext(e.lv)}` : 'MAX';
      const dimName = DT.data.dimensions[d.origin] ? DT.data.dimensions[d.origin].name : '';
      return `<div class="rtile2 g-${grade === 'basic' ? 'common' : grade} ${inParty ? 'inparty' : ''}">
        <span class="ri">${d.icon}</span><b>${d.name}</b>
        <small><span class="g-${grade === 'basic' ? 'common' : grade}">${DT.gacha.gradeName[grade]}</span> · ${DT.party.roleIcon(d.role)} ${DT.party.roleName(d.role)} · ${dimName}</small>
        <div class="lvline">Lv.${e.lv} <span class="xpbar"><span style="width:${e.lv >= DT.config.growth.maxLevel ? 100 : Math.round(e.xp / DT.gacha.xpToNext(e.lv) * 100)}%"></span></span> <small>${next}</small></div>
        ${grade !== 'basic' ? `<div class="stars">${stars(e.bt) || '☆☆☆☆☆'}</div>` : ''}
        <div class="abil">${ab}</div>
        <small class="muted">체력 ${Math.round(d.hp * DT.gacha.hpMult(e))}${e.bt ? ` · 피해 +${Math.round(e.bt * DT.config.gacha.breakStat * 100)}%` : ''}</small>
        <button class="btn small ${inParty ? 'primary' : ''}" data-act="roster-party" data-id="${k}">${inParty ? '✔ 파티' : '파티에 넣기'}</button>
      </div>`;
    }).join('');
    return `<div class="facility roster">
      <p>파티 ${party.filter((k) => DT.lobby.starterOptions(meta).includes(k)).length}/${max} — 여기서 고른 파티가 출발 준비에 그대로 들어간다. 레벨 5·10·15·20마다 덱이 강해진다(${[5, 10, 15, 20].map((l) => `${l}: ${DT.gacha.milestoneText(l)}`).join(' · ')}).</p>
      <div class="rostergrid">${tiles}</div>
    </div>`;
  }

  function lobbyCodex(app, meta) {
    const all = DT.lobby.codexAll();
    const dims = ['medieval', 'cyber', 'abyss', 'hell'];
    const groups = dims.map((d) => {
      const list = all.filter((id) => DT.cards.def(id).origin === d);
      const got = list.filter((id) => DT.lobby.codexHas(meta, id));
      const dim = DT.data.dimensions[d];
      return `<h3 style="color:${dim.color}">${dim.name} <small>${got.length}/${list.length}</small></h3>
        <div class="codexgrid">${list.map((id) => DT.lobby.codexHas(meta, id)
          ? cardHTML({ uid: '', id, origin: d }, { small: true })
          : `<div class="card small back codex-unknown"><div class="back-mark">?</div></div>`).join('')}</div>`;
    }).join('');
    const sec = Object.entries(DT.data.secrets).map(([id, d]) => {
      const found = meta.secrets && meta.secrets[id];
      return `<div class="secret ${found ? 'found' : ''}"><span class="si">${found ? d.icon : '❔'}</span>
        <div><b>${found ? d.name : '???'}</b><small>${found ? d.hint : '???'}</small></div></div>`;
    }).join('');
    const nFound = Object.keys(DT.data.secrets).filter((id) => meta.secrets && meta.secrets[id]).length;
    return `<div class="facility codex">
      <h3>🔒 비밀 <small>${nFound}/${Object.keys(DT.data.secrets).length} — 발견하면 조건이 공개된다</small></h3>
      <div class="secretgrid">${sec}</div>
      <p>적에게서 <b>슬쩍하거나 강탈한</b> 카드가 기록된다. 출발 준비에서 기록된 카드 1장을 골라 들고 시작할 수 있다(사용 불가 카드 제외).</p>
      ${groups}
    </div>`;
  }

  function lobbyShop(app, meta) {
    const shop = meta.shop || { slots: [] };
    const lv = DT.lobby.shopLevel(meta);
    const cost = DT.lobby.refreshCost(meta);
    const full = DT.lobby.stashFull(meta);
    const tiles = shop.slots.map((sl, i) => `<div class="shopslot ${sl.sold ? 'sold' : ''} ${sl.pinned ? 'pinned' : ''}">
      ${itemTile({ id: sl.id })}
      <div class="sl-desc">${DT.items.def(sl.id).desc}</div>
      <button class="btn small ${!sl.sold && meta.coins >= sl.price && !full ? 'primary' : ''}" data-act="shop-buy" data-i="${i}" ${sl.sold || meta.coins < sl.price || full ? 'disabled' : ''}>${sl.sold ? '판매 완료' : `🪙 ${sl.price}`}</button>
      ${sl.sold ? '' : `<button class="btn small pin" data-act="shop-pin" data-i="${i}">${sl.pinned ? '📌 고정됨' : '📍 고정'}</button>`}
    </div>`).join('');
    return `<div class="facility">
      <p>상점 레벨 <b>${lv}</b> · 진열 ${shop.slots.length}칸 · 산 아이템은 창고로 (${meta.stash.length}/${DT.lobby.stashCap()})
        ${full ? '<span class="warnline"> · 창고가 가득 찼습니다</span>' : ''}</p>
      <div class="shopgrid">${tiles}</div>
      <div class="row"><button class="btn big" data-act="shop-refresh" ${meta.coins < cost ? 'disabled' : ''}>🔄 새로고침 🪙 ${cost}</button></div>
      <p class="muted">고정한 칸은 새로고침해도 남습니다. 판을 마치고 돌아오면 무료로 새 진열, 새로고침 비용도 처음으로.</p>
    </div>`;
  }

  // 창고 아이템 목록(선택 가능). filter: 표시할 아이템 조건
  function stashGrid(app, meta, filter) {
    const list = meta.stash.filter(filter || (() => true)).slice().sort((a, b) =>
      DT.items.GRADES.indexOf(DT.items.def(b.id).grade) - DT.items.GRADES.indexOf(DT.items.def(a.id).grade) || a.id.localeCompare(b.id));
    if (!list.length) return '<p class="muted">비어 있음</p>';
    return `<div class="itemgrid">${list.map((it) => itemTile(it, { sel: app.lsel === it.uid, attrs: `data-act="lsel" data-uid="${it.uid}"` })).join('')}</div>`;
  }

  function selectedStash(app, meta) {
    return app.lsel && meta.stash.find((x) => x.uid === app.lsel);
  }

  function itemDetail(it) {
    const d = DT.items.def(it.id);
    const note = DT.items.forgeNote(it);
    return `<div class="seldesc"><b>${d.icon} ${d.name}${it.plus ? ' +' + it.plus : ''}</b> <span class="g-${d.grade}">${DT.items.gradeName[d.grade]}</span> — ${d.desc}${note ? `<br><small>강화: ${note}</small>` : ''}</div>`;
  }

  function lobbyStash(app, meta) {
    const sel = selectedStash(app, meta);
    return `<div class="facility">
      <p>📦 창고 ${meta.stash.length}/${DT.lobby.stashCap()} · 출발 준비에서 장착하거나 가방에 넣어 가져갈 수 있습니다.</p>
      ${stashGrid(app, meta)}
      <div class="bagactions">${sel ? itemDetail(sel) + `<div class="selbtns">
        <button class="btn small" data-act="ltab" data-tab="merchant">🧔 상인에게 팔기</button>
        ${DT.items.forgeable(sel.id) ? '<button class="btn small" data-act="ltab" data-tab="forge">⚒️ 대장간에서 강화</button>' : ''}</div>` : '<p class="muted">아이템을 탭하면 설명이 나옵니다</p>'}</div>
    </div>`;
  }

  function lobbyMerchant(app, meta) {
    const sel = selectedStash(app, meta);
    return `<div class="facility">
      <p>🧔 "전리품은 제값에, 나머지는 상점가의 30%에 사 주지." <span class="muted">(전리품 일반 15 · 희귀 50 · 영웅 120 · 전설 300)</span></p>
      ${stashGrid(app, meta)}
      <div class="bagactions">${sel ? itemDetail(sel) + `<div class="selbtns">
        <button class="btn small primary" data-act="sell" data-uid="${sel.uid}">🪙 ${DT.lobby.sellPrice(sel)}에 팔기</button></div>` : '<p class="muted">팔 아이템을 탭하세요</p>'}</div>
    </div>`;
  }

  function lobbyForge(app, meta) {
    const sel = selectedStash(app, meta);
    let act = '<p class="muted">강화할 장비를 탭하세요</p>';
    if (sel) {
      const cost = DT.lobby.forgeCost(sel);
      const next = cost !== null ? DT.items.forgeNote(sel, (sel.plus || 0) + 1) : '';
      act = itemDetail(sel) + `<div class="selbtns">${cost === null ? '<button class="btn small" disabled>최대 강화</button>'
        : `<button class="btn small ${meta.coins >= cost ? 'primary' : ''}" data-act="forge" data-uid="${sel.uid}" ${meta.coins >= cost ? '' : 'disabled'}>⚒️ +${(sel.plus || 0) + 1} 강화 🪙 ${cost}</button>
           <small class="muted">${next}</small>`}</div>`;
    }
    return `<div class="facility">
      <p>⚒️ 수치가 있는 장비만 강화할 수 있습니다. +1마다 수치형 효과 +50%, 최대 +3.</p>
      ${stashGrid(app, meta, (it) => DT.items.forgeable(it.id))}
      <div class="bagactions">${act}</div>
    </div>`;
  }

  function lobbyPrep(app, meta) {
    const p = app.prep;
    const max = DT.lobby.companionPicks(meta);
    const comps = DT.lobby.starterOptions(meta).map((k) => {
      const d = DT.data.companions[k];
      const e = DT.gacha.entry(meta, k);
      const g = d.grade && d.grade !== 'basic' ? d.grade : 'common';
      return `<div class="comptile g-${g} ${d.grade && d.grade !== 'basic' ? 'graded' : ''} ${p.picks.includes(k) ? 'picked' : ''}" data-act="prep-comp" data-id="${k}">
        <span class="ct-icon">${d.icon}</span><b>${d.name}</b><small>${DT.party.roleIcon(d.role)} ${DT.party.roleName(d.role)} · 체력 ${Math.round(d.hp * DT.gacha.hpMult(e))}</small>
        <small class="lvtag">Lv.${e.lv}${e.bt ? ' ' + '★'.repeat(e.bt) : ''}</small></div>`;
    }).join('');
    // 지금 파티(도둑 + 고른 동료)가 낀 장비만 '사용 중'. 빠진 동료의 편성은 기억만 하고 다른 데 끼울 수 있다
    const activeEquip = Object.entries(p.equip).filter(([w]) => w === 'player' || p.picks.includes(w)).map(([, sl]) => sl);
    const used = new Set([...activeEquip.flatMap((sl) => Object.values(sl)), ...p.bag]);
    const byUid = (uid) => meta.stash.find((x) => x.uid === uid);
    const who = [['player', '🦹 차원 도둑'], ...p.picks.map((k) => [k, `${DT.data.companions[k].icon} ${DT.data.companions[k].name}`])];
    const eqRows = who.map(([w, name]) => `<div class="eqrow">
      <div class="eqwho"><b>${name}</b></div>
      ${DT.items.SLOTS.map((slot) => {
        const uid = p.equip[w] && p.equip[w][slot];
        const it = uid && byUid(uid);
        const on = p.slot && p.slot.who === w && p.slot.slot === slot;
        return `<div class="eqslot ${it ? 'filled' : ''} ${on ? 'on' : ''}" data-act="prep-slot" data-who="${w}" data-slot="${slot}">${it ? itemTile(it, { compact: true }) : DT.items.slotName[slot]}</div>`;
      }).join('')}
    </div>`).join('');
    let chooser = '';
    if (p.slot) {
      const cands = meta.stash.filter((it) => DT.items.def(it.id).kind === 'equip' && DT.items.def(it.id).slot === p.slot.slot
        && (!used.has(it.uid) || (p.equip[p.slot.who] || {})[p.slot.slot] === it.uid));
      chooser = `<div class="bagactions"><b>${DT.items.slotName[p.slot.slot]} 고르기</b>
        <div class="itemgrid">${cands.map((it) => itemTile(it, { attrs: `data-act="prep-put" data-uid="${it.uid}"` })).join('') || '<p class="muted">창고에 맞는 장비가 없습니다</p>'}</div>
        <div class="selbtns"><button class="btn small" data-act="prep-clear" data-who="${p.slot.who}" data-slot="${p.slot.slot}">비우기</button>
        <button class="btn small" data-act="prep-slot-close">닫기</button></div></div>`;
    }
    const bagCands = meta.stash.filter((it) => !activeEquip.some((sl) => Object.values(sl).includes(it.uid)));
    return `<div class="prepgrid">
      <section>
        <h3>동료 ${p.picks.length}/${max} <small>탭해서 고르기</small></h3>
        <div class="comprow">${comps}</div>
        <h3>장비 <small>칸을 탭해 창고에서 장착 · 편성은 저장되고, 판에서 살아 돌아온 장비는 다시 그 캐릭터에게</small></h3>
        ${eqRows}
        ${chooser}
      </section>
      <section>
        <h3>가방에 챙기기 ${p.bag.length}/${DT.config.items.bag} <small>소모품 등. 사망하면 가방·장비는 잃습니다</small></h3>
        <div class="itemgrid">${bagCands.map((it) => itemTile(it, { sel: p.bag.includes(it.uid), attrs: `data-act="prep-bag" data-uid="${it.uid}"` })).join('') || '<p class="muted">창고가 비어 있습니다</p>'}</div>
        ${prepExtras(app, meta)}
        <div class="row"><button class="btn big primary go" data-act="prep-go" ${p.picks.length ? '' : 'disabled'}>▶ 출발${app.prepSeed || app.urlSeed ? ` <small>시드 ${app.prepSeed || app.urlSeed}</small>` : ''}</button></div>
      </section>
    </div>`;
  }


  // 출발 준비: 도감 카드 · 승천 · 시드
  function prepExtras(app, meta) {
    const p = app.prep;
    const carry = DT.lobby.codexCarry(meta);
    const sel = p.codexCard && DT.cards.def(p.codexCard);
    const codex = `<h3>📖 도감 카드 <small>훔친 적 있는 카드 1장을 덱에 넣고 출발</small></h3>
      <div class="selbtns"><button class="btn small ${sel ? 'primary' : ''}" data-act="prep-codex-open" ${carry.length ? '' : 'disabled'}>
        ${sel ? `${sel.icon || ''} ${sel.name}` : carry.length ? `고르기 (${carry.length}장)` : '아직 훔친 카드가 없습니다'}</button>
        ${sel ? `<button class="btn small" data-act="prep-codex" data-id="${p.codexCard}">빼기</button>` : ''}</div>
      ${p.codexOpen ? `<div class="codexpick">${carry.map((id) => cardHTML({ uid: '', id, origin: DT.cards.def(id).origin },
        { small: true, selected: p.codexCard === id, attrs: `data-act="prep-codex" data-id="${id}"` })).join('')}</div>` : ''}`;
    const max = DT.lobby.ascensionMax(meta);
    const A = DT.config.ascension;
    const asc = max ? `<h3>🔥 승천 <small>단계마다 코인 +${Math.round(A.coinBonus * 100)}% · 효과는 누적</small></h3>
      <div class="selbtns">${Array.from({ length: max + 1 }, (_, i) => `<button class="btn small ${p.ascension === i ? 'primary' : ''}" data-act="prep-asc" data-lv="${i}">${i ? 'A' + i : '없음'}</button>`).join('')}</div>
      ${p.ascension ? `<div class="muted ascdesc">${A.levels.slice(0, p.ascension).map((l, i) => `A${i + 1} ${l.desc}`).join(' · ')}</div>` : ''}`
      : `<h3>🔥 승천 <small>지옥까지 클리어하면 열린다</small></h3>`;
    const seed = app.prepSeed || app.urlSeed;
    const seedBox = `<h3>🎲 시드 <small>같은 시드 + 같은 준비 = 같은 판</small></h3>
      <div class="seedrow"><input id="seedinput" type="text" inputmode="latin" autocomplete="off" autocapitalize="characters" maxlength="16"
        placeholder="비우면 무작위" value="${seed || ''}">
        <button class="btn small primary" data-act="seed-set">적용</button>
        ${seed ? '<button class="btn small" data-act="seed-clear">무작위로</button>' : ''}</div>`;
    return `<div class="prepextra">${codex}${asc}${seedBox}</div>`;
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
      ov.querySelectorAll('[data-act="heist-take"],[data-act="reward-take"],[data-act="rift-take"]').forEach((b) => { b.disabled = !app.pick; });
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
    renderSynergy(app);
    renderEnemies(app);
    renderHand(app);
    renderControls(app);
    renderHint(app);
    renderLog(app.state);
    renderOverlay(app);
  };

  // ── 연출 (js/fx.js · js/sound.js) ──
  const floatAt = (id, text, cls, i) => DT.fx.float(id, text, cls, (i % 8) * 90);

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
    const FX = DT.fx, SND = DT.sound, C = DT.config.fx;
    let drew = false;
    events.forEach((ev, i) => {
      const d = (i % 8) * 90;          // 같은 묶음의 연출은 조금씩 늦게
      if (ev.type === 'damage') {
        if (ev.blocked) { floatAt(ev.target, `🛡-${ev.blocked}`, 'blocked', i); SND.play('block', 0, d / 1000); }
        if (ev.amount > 0) {
          const t = actor(s, ev.target);
          const power = Math.min(1, ev.amount / Math.max(1, t ? t.maxHp * 0.4 : 20));
          FX.float(ev.target, `-${ev.amount}`, 'dmg', d, FX.dmgSize(ev.amount), ev.amount >= C.bigHit);
          FX.shakeActor(ev.target, d);
          SND.play('hit', power, d / 1000);
          if (ev.target === 'player') { FX.shakeScreen(power, d); FX.flash(power, d); }
          else if (DT.state.isAlly(ev.target)) FX.flash(power * 0.4, d);
        }
      } else if (ev.type === 'block') {
        floatAt(ev.target, `+${ev.amount}🛡`, 'blk', i);
        SND.play('block', 0, d / 1000);
      } else if (ev.type === 'heal' && ev.amount > 0) {
        FX.float(ev.target, `+${ev.amount}`, 'heal', d, Math.round(FX.dmgSize(ev.amount) * 0.85));
        SND.play('heal', 0, d / 1000);
      } else if (ev.type === 'death') {
        FX.kill(ev.target, DT.state.isAlly(ev.target) ? '#ff5d6c' : ev.executable ? '#ffd166' : '#d6a4ff', d);
        SND.play('kill', 0, d / 1000);
        if (ev.executable) floatAt(ev.target, '💰 강탈!', 'heist', i);
      } else if (ev.type === 'draw') {
        if (!drew) SND.play('draw', 0, d / 1000);
        drew = true;
      } else if (ev.type === 'victory' || ev.type === 'coin') {
        SND.play('coin', 0, 0.3);
      } else if (ev.type === 'heist') {
        SND.play('steal');
        FX.cardFly(cardHTML(plainCard(ev.cardId)), { x: innerWidth / 2, y: innerHeight / 2 }, FX.posOf('[data-pile="masterDeck"]'), 0);
      } else if (ev.type === 'status') {
        const d = DT.data.statuses[ev.status] || { name: ev.status, icon: '' };
        floatAt(ev.target, `${d.icon}${d.name} ${ev.amount > 0 ? '+' : ''}${ev.amount}`, 'stat', i);
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
      } else if (ev.type === 'steal' && DT.state.isAlly(ev.by)) {
        // 카드가 적에게서 내 손패로 날아온다
        SND.play('steal', 0, d / 1000);
        FX.cardFly(cardHTML(Object.assign(plainCard(ev.cardId), { temp: true })), FX.posOf(ev.from), FX.posOf('#hand'), d);
        if (ev.by === 'player') banner(`<div class="b-who">슬쩍 성공!</div>${cardHTML(Object.assign(plainCard(ev.cardId), { temp: true }))}`, 'steal');
      } else if (ev.type === 'steal') {
        // 적이 내 카드를 빼앗아 간다(마왕)
        SND.play('steal', 0, d / 1000);
        FX.cardFly(cardHTML(plainCard(ev.cardId)), FX.posOf('#hand'), FX.posOf(ev.by), d);
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
