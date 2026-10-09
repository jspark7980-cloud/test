// 밸런스 자동 시뮬레이션 (Node 로 실행, 브라우저 불필요)
//   node dimension-thief/tools/sim.js [판 수=100]
//   node dimension-thief/tools/sim.js 100 solo   ← 동료 없이
// 결과: 동료별 × 전투 구성별 승률·평균 턴·남은 체력·강탈률, 연전(체력 유지) 평균 승리 수.
// 도둑 봇: 보이는 공격만큼 막고, 처치 가능한 적 우선, 가장 센 공개 카드를 슬쩍, 빈사 적은 다음 턴에 처치(강탈).
// 동료는 게임 속 AI(js/ai.js)가 그대로 움직인다.
'use strict';
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const N = +process.argv[2] || 100;
const SOLO = process.argv[3] === 'solo';

// index.html 의 스크립트 순서대로 로드 (화면·저장·입력 파일 제외)
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const files = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1])
  .filter((f) => !/js\/(ui|main|save)\.js$/.test(f) && !f.startsWith('js/ui/'));
const ctx = { console: { log() {}, warn: (...a) => process.stderr.write('[경고] ' + a.join(' ') + '\n') }, Math, Object, JSON, Array, Set };
ctx.window = ctx;
vm.createContext(ctx);
files.forEach((f) => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }));
const DT = ctx.DT;
const E = DT.effects;
DT.cards.validate();

// ── 봇 ──
const cardDmg = (s, srcId, id) => E.previewDamage(s, { id }, srcId, 'player');
const blockOf = (def) => def.effects.filter((x) => x.type === 'block').reduce((a, x) => a + x.value, 0);

// 아군 중 가장 위협받는 대상(방어도 줄 곳)
function threatened(s) {
  return DT.party.living(s).map((a) => ({ a, t: Math.max(0, DT.ai.incomingTo(s, a.id) - a.block) }))
    .sort((x, y) => y.t - x.t)[0];
}

function scorePlay(s, c, def, t, need, alive) {
  const p = s.player;
  let score = 0;
  let choice = null;
  let allyId = null;
  if (blockOf(def) && DT.cards.allyTargetable(def)) {
    const m = threatened(s);
    allyId = m.a.id;
    need = m.t;
  }
  score += Math.min(blockOf(def), need) * 1.3;
  for (const x of def.effects.filter((x) => x.type === 'order')) {
    const comps = DT.party.companions(s);
    if (!comps.length) return null;
    if (x.order === 'focus') score += t && t.hp <= 15 ? 8 : 3;
    if (x.order === 'assist') score += 4;
    if (x.order === 'cover') { const tk = comps.find((k) => k.role === 'tank'); if (!tk) return null; score += Math.min(DT.ai.incomingTo(s, 'player'), tk.hp / 2) * 0.8; }
    if (x.order === 'retreat') {
      const r = comps.filter((k) => k.row === 'front').map((k) => ({ k, t: DT.ai.incomingTo(s, k.id) })).sort((a, b) => b.t - a.t)[0];
      if (!r) return null;
      allyId = r.k.id;
      score += r.t > r.k.hp / 2 ? 10 : 1;
    }
  }
  if (def.effects.some((x) => x.type === 'heal')) score += Math.min(p.maxHp - p.hp, 5) * 0.8;
  const hits = def.effects.some((x) => x.to === 'allOpponents') ? alive : (t ? [t] : []);
  for (const e of hits) {
    const d = E.previewDamage(s, c, 'player', e.id);
    if (!d) continue;
    const ehp = e.hp + e.block;
    const kills = d >= ehp;
    // 빈사로 떨어뜨리는 것은 좋지만, 강탈 준비 안 된 적을 바로 죽이는 것보다 남겨 두는 편을 조금 선호
    score += Math.min(d, ehp) + (kills ? (e.heistReady ? 14 : 6) : 0) + (e.hp <= 12 ? 2 : 0);
  }
  if (def.effects.some((x) => x.type === 'status' && x.to !== 'self')) score += 3;
  if (def.effects.some((x) => x.type === 'status' && x.to === 'self')) score += 4;
  if (def.effects.some((x) => x.type === 'draw' || x.type === 'energy')) score += 4;
  if (def.effects.some((x) => x.type === 'steal')) {
    if (!t) return null;
    const rv = t.hand.filter((x) => x.revealed);
    if (!rv.length) return null;
    rv.sort((a, b) => cardDmg(s, t.id, b.id) - cardDmg(s, t.id, a.id));
    choice = rv[0].uid;
    score += 7 + cardDmg(s, t.id, rv[0].id) * 0.6 * (t.intent / t.hand.length);
  }
  if (def.effects.some((x) => x.type === 'copy') && t && t.lastPlayed) {
    score += E.previewDamage(s, { id: t.lastPlayed }, 'player', t.id) + Math.min(blockOf(DT.cards.def(t.lastPlayed)), need) + 2;
  }
  return { score: score - def.cost * 0.5, choice, allyId };
}

function botTurn(s) {
  for (let guard = 0; guard < 15 && s.phase === 'player' && !s.result; guard++) {
    const alive = DT.combat.living(s);
    const need = Math.max(0, DT.ai.incomingTo(s, 'player') - s.player.block);
    let best = null;
    for (const c of s.player.hand) {
      if (!DT.combat.canPlay(s, c.uid).ok) continue;
      const def = DT.cards.def(c.id);
      for (const t of DT.cards.needsTarget(def) ? alive : [null]) {
        const r = scorePlay(s, c, def, t, need, alive);
        if (r && (!best || r.score > best.score)) best = { c, t, choice: r.choice, allyId: r.allyId, score: r.score };
      }
    }
    if (!best || best.score <= 0) return;
    const res = DT.combat.playCard(s, best.c.uid, best.t ? best.t.id : null, best.choice, best.allyId);
    if (!res.ok) return;
    s.events.length = 0;
  }
}

function fight(s) {
  let turns = 0;
  while (!s.result && turns < 60) {
    turns++;
    botTurn(s);
    if (s.result) break;
    DT.combat.endPlayerTurn(s);
    while (DT.combat.allyAct(s)) { /* 동료 행동 */ }
    DT.combat.beginEnemyPhase(s);
    while (DT.combat.enemyAct(s)) { /* 적 행동 */ }
    DT.combat.endEnemyTurn(s);
    s.events.length = 0;
  }
  return turns;
}

// ── 1) 동료별 × 전투 구성별: 시작 덱·최대 체력으로 N번씩 ──
const comps = SOLO ? [null] : Object.keys(DT.data.companions);
const rows = [];
for (const comp of comps) for (const [dim, list] of Object.entries(DT.data.encounters)) {
  for (const enc of list) {
    let wins = 0, turns = 0, hpLeft = 0, heists = 0, steals = 0, compDeaths = 0;
    for (let i = 0; i < N; i++) {
      const s = DT.state.createRun(`SIM-${enc.id}-${i}`);
      if (comp) DT.party.add(s, comp, false);
      DT.combat.start(s, enc.enemies);
      const t = fight(s);
      steals += s.stats.steals;
      compDeaths += s.allies.filter((a) => a.dead).length;
      if (s.result !== 'win') continue;
      wins++; turns += t; hpLeft += s.player.hp;
      heists += s.enemies.some((e) => e.executed) ? 1 : 0;
    }
    rows.push({ comp: comp ? DT.data.companions[comp].name : '없음', dim, enc: enc.id, tier: enc.tier, wins, turns, hpLeft, heists, steals, compDeaths });
  }
}

// ── 2) 연전: 체력 유지, 강탈은 피해 큰 카드, 보상은 첫 카드 ──
const fightsWon = [];
for (let i = 0; i < N; i++) {
  const s = DT.run.start('SIMRUN-' + i);
  if (SOLO) { s.starterOptions = null; DT.run.nextCombat(s); }
  while (s.screen !== 'over' && s.floor <= 12) {
    if (s.screen === 'pickCompanion') DT.run.pickCompanion(s, s.starterOptions[i % s.starterOptions.length]);
    else if (s.screen === 'combat') { fight(s); DT.run.resolve(s); }
    else if (s.screen === 'heist') {
      const g = s.heist.groups.find((x) => x.role);
      if (!SOLO && g && DT.party.slotsFree(s) > 0) DT.run.recruit(s, g.kind);
      else {
        const opts = s.heist.groups.flatMap((x) => x.options);
        opts.sort((a, b) => E.previewDamage(s, { id: b }, 'player', null) - E.previewDamage(s, { id: a }, 'player', null));
        DT.run.takeHeist(s, opts[0]);
      }
    } else if (s.screen === 'reward') DT.run.takeReward(s, s.reward.options[0]);
    s.events.length = 0;
  }
  fightsWon.push(s.screen === 'over' ? s.floor - 1 : 12);
}

// ── 출력 ──
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0) + '%';
const avg = (a, b) => (b ? (a / b).toFixed(1) : '-');
console.log(`전투 구성별 ${N}판 (시작 덱, 도둑 체력 ${DT.config.player.hp})`);
let lastComp = null;
for (const r of rows) {
  if (r.comp !== lastComp) {
    lastComp = r.comp;
    console.log(`\n[동료: ${r.comp}]`);
    console.log('구성              tier  승률   평균턴  도둑체력  강탈률  슬쩍/전투  동료사망');
  }
  console.log(`${r.enc.padEnd(16)}  ${r.tier}    ${pct(r.wins, N).padStart(4)}   ${avg(r.turns, r.wins).padStart(5)}   ${avg(r.hpLeft, r.wins).padStart(6)}   ${pct(r.heists, r.wins).padStart(5)}   ${avg(r.steals, N).padStart(6)}    ${pct(r.compDeaths, N)}`);
}
fightsWon.sort((a, b) => a - b);
console.log(`\n연전(체력 회복 없음) ${N}판: 평균 승리 ${avg(fightsWon.reduce((a, b) => a + b, 0), N)}회, 중앙값 ${fightsWon[N >> 1]}회`);
