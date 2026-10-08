// 화면 그리기와 연출. 입력 처리는 main.js 가 data-act 속성으로 받는다.
window.DT = window.DT || {};

(function () {
  const UI = (DT.ui = {});
  const $ = (sel) => document.querySelector(sel);

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
      o.glow ? 'glow' : '', card.temp ? 'temp' : ''].join(' ');
    return `<div class="${cls}" style="--origin:${dim.color || '#888'}" ${o.attrs || ''}>
      <div class="c-cost">${def.cost}</div>
      <div class="c-name">${def.name}</div>
      <div class="c-art">${def.icon || DT.cards.typeIcon[def.type] || '✦'}</div>
      <div class="c-desc"><div>${DT.cards.describe(card, o.view)}</div></div>
      <div class="c-foot"><span class="c-origin">${dim.name || card.origin}</span>${card.temp ? '<span class="c-tag">슬쩍</span>' : ''}</div>
    </div>`;
  }
  UI.cardHTML = cardHTML;

  // 여러 적일 때 공개 카드를 한 줄 요약으로
  function chipHTML(card, o) {
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

  // ── 영역별 렌더 ──
  function renderTop(app) {
    const s = app.state;
    const dim = DT.data.dimensions[s.dimension];
    const phase = s.screen !== 'combat' ? '' : s.phase === 'enemy' ? '적의 턴' : s.phase === 'player' ? '나의 턴' : '';
    $('#topbar').innerHTML = `
      <div class="tb-left"><span class="dimname">${dim.name}</span>
        <span class="turn">전투 ${s.floor} · 턴 ${s.turn}</span>
        <span class="wanted" data-act="info" data-msg="수배도: 강탈할 때마다 +1. 높을수록 보상과 정예 적이 늘어난다(이후 단계).">🚨 수배도 ${s.wanted}</span></div>
      <div class="tb-mid">${phase}</div>
      <div class="tb-right"><span class="seed">시드 ${s.seed}</span>
        <button class="btn small" data-act="pile" data-pile="masterDeck">내 덱 ${s.player.masterDeck.length}</button>
        <button class="btn small" data-act="menu">새 게임</button></div>`;
  }

  function renderPlayer(app) {
    const s = app.state, p = s.player;
    const sel = selectedCard(app);
    const selfTarget = sel && !DT.cards.needsTarget(DT.cards.def(sel.id));
    $('#player').innerHTML = `
      <div class="actor ${selfTarget ? 'targetable' : ''}" data-act="player" data-actor="player">
        <div class="portrait">${p.icon}${blockHTML(p)}</div>
        <div class="aname">${p.name}</div>
        ${barHTML(p)}
        <div class="sts">${statusesHTML(p)}</div>
      </div>`;
  }

  function renderEnemies(app) {
    const s = app.state;
    const sel = selectedCard(app);
    const selDef = sel && DT.cards.def(sel.id);
    const targeting = selDef && DT.cards.needsTarget(selDef);
    const stealing = selDef && DT.cards.choiceOf(selDef) === 'revealed';
    const compact = s.enemies.length > 1;
    const threshold = DT.data.rewards.heistThreshold;
    const box = $('#enemies');
    box.className = compact ? 'compact n' + s.enemies.length : '';
    box.innerHTML = s.enemies.map((e) => {
      const view = { state: s, srcId: e.id, tgtId: 'player' };
      const handCards = e.dead ? '' : e.hand.map((c) => {
        const o = {
          small: true, view, hidden: !c.revealed,
          glow: stealing && (!app.mode || app.mode.target === e.id),
          attrs: c.revealed ? `data-act="reveal" data-owner="${e.id}" data-uid="${c.uid}"` : '',
        };
        return compact ? chipHTML(c, o) : cardHTML(c, o);
      }).join('');
      const intent = e.dead ? (e.executed ? '💰 강탈 성공' : '쓰러짐') : (s.phase === 'enemy' && e.pending > 0
        ? `행동 중… 남은 ${e.pending}장` : `다음 턴 행동 <b>${e.intent}</b>장`);
      const last = e.lastPlayed ? `직전: ${DT.cards.def(e.lastPlayed).name}` : '직전: 없음';
      const heistable = !e.dead && e.hp <= e.maxHp * threshold;
      // 선택한 카드의 예상 피해
      let preview = '';
      if (sel && !e.dead) {
        const dmg = DT.effects.previewDamage(s, sel, 'player', e.id);
        const hitsThis = targeting || selDef.effects.some((x) => DT.effects.toOf(x) === 'allOpponents');
        if (dmg > 0 && hitsThis) preview = `<div class="dmgpreview">-${dmg}</div>`;
      }
      return `<div class="enemy-wrap ${e.dead ? 'dead' : ''}">
        <div class="ehand">${handCards}</div>
        <div class="intent">${intent}</div>
        <div class="actor enemy ${targeting && !e.dead ? 'targetable' : ''} ${heistable ? 'heistable' : ''}" data-act="enemy" data-id="${e.id}" data-actor="${e.id}">
          ${heistable ? '<div class="heistbadge">💰 강탈 가능</div>' : ''}
          <div class="portrait">${e.icon}${blockHTML(e)}${preview}</div>
          <div class="aname">${e.name}</div>
          ${barHTML(e, threshold)}
          <div class="sts">${statusesHTML(e)}</div>
          <div class="epiles">${last} · 덱 ${e.drawPile.length}</div>
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
      else if (app.busy || s.phase === 'enemy') txt = '적이 행동하는 중…';
      else if (app.mode && app.mode.type === 'chooseReveal') txt = '빼앗을 공개 카드를 탭하세요 (빈 곳 탭: 취소)';
      else if (app.sel) {
        const c = selectedCard(app);
        const def = c && DT.cards.def(c.id);
        if (!def) txt = '';
        else if (DT.cards.choiceOf(def) === 'revealed') txt = `[${def.name}] 적 또는 적의 공개 카드를 탭하세요`;
        else if (DT.cards.needsTarget(def)) txt = `[${def.name}] 대상 적을 탭하세요`;
        else txt = `[${def.name}] 한 번 더 탭하면 사용`;
      } else txt = '카드를 탭해 선택하세요 · 체력 25% 이하에서 처치하면 강탈';
    }
    const h = $('#hint');
    h.textContent = txt;
    h.classList.toggle('warn', !!app.flash);
  }

  function renderLog(s) {
    $('#log').innerHTML = s.log.slice(-5).map((l) => `<div>${l}</div>`).join('');
  }

  // ── 오버레이: 덱 보기 / 강탈 / 카드 보상 / 패배 ──
  function pickRow(ids, app) {
    return `<div class="pickrow">${ids.map((id) => cardHTML(
      { uid: '', id, origin: DT.cards.def(id).origin },
      { selected: app.pick === id, attrs: `data-act="pick" data-id="${id}"` })).join('')}</div>`;
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
    if (s.screen === 'heist') {
      const h = s.heists[0];
      return {
        key: 'heist:' + s.floor + ':' + s.heists.length,
        html: `<div class="panel wide">
          <h1 class="heist">💰 강탈!</h1>
          <p><b>${h.enemyName}</b>을(를) 체력 25% 이하에서 쓰러뜨렸다. 카드 1장을 골라 <b>덱에 영구 추가</b>한다. (수배도 +1)</p>
          ${pickRow(h.options, app)}
          <div class="row">
            <button class="btn big" data-act="heist-skip">포기</button>
            <button class="btn big primary" data-act="heist-take" ${app.pick ? '' : 'disabled'}>가져가기</button>
          </div></div>`,
      };
    }
    if (s.screen === 'reward') {
      return {
        key: 'reward:' + s.floor,
        html: `<div class="panel wide">
          <h1 class="win">전투 ${s.floor} 승리!</h1>
          <p>카드 1장을 골라 덱에 추가하거나 건너뛴다.</p>
          ${pickRow(s.reward.options, app)}
          <div class="row">
            <button class="btn big" data-act="reward-skip">건너뛰기</button>
            <button class="btn big primary" data-act="reward-take" ${app.pick ? '' : 'disabled'}>가져가기</button>
          </div></div>`,
      };
    }
    if (s.screen === 'over') {
      const st = s.stats;
      return {
        key: 'over:' + s.seed,
        html: `<div class="panel">
          <h1 class="lose">패배…</h1>
          <p>전투 ${s.floor}에서 붙잡혔다.</p>
          <p class="stats">처치 ${st.kills} · 슬쩍 ${st.steals} · 강탈 ${st.heists} · 복제 ${st.copies} · 덱 ${s.player.masterDeck.length}장</p>
          <div class="row">
            <button class="btn big" data-act="retry">같은 시드로 다시</button>
            <button class="btn big primary" data-act="new-seed">새 시드로 시작</button>
          </div></div>`,
      };
    }
    return null;
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
      return;
    }
    ov.dataset.key = c.key;
    ov.innerHTML = c.html;
    ov.classList.add('show');
  }

  UI.render = function (app) {
    UI.applyTheme(app.state.dimension);
    renderTop(app);
    renderPlayer(app);
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
      } else if (ev.type === 'play' && ev.actor !== 'player') {
        const a = DT.state.actor(s, ev.actor);
        banner(`<div class="b-who">${a ? a.name : ''}의 행동</div>${cardHTML(ev.card, { view: { state: s, srcId: ev.actor, tgtId: 'player' } })}`, 'enemy');
      } else if (ev.type === 'steal' && ev.by === 'player') {
        banner(`<div class="b-who">슬쩍 성공!</div>${cardHTML(Object.assign(plainCard(ev.cardId), { temp: true }))}`, 'steal');
      } else if (ev.type === 'copy' && ev.by === 'player') {
        banner(`<div class="b-who">복제!</div>${cardHTML(plainCard(ev.cardId))}`, 'steal');
      }
    });
  };
})();
