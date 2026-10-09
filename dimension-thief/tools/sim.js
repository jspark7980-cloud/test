// 밸런스 자동 시뮬레이션 (Node 로 실행, 브라우저 불필요)
//   node dimension-thief/tools/sim.js [판 수=100]
//   node dimension-thief/tools/sim.js 100 solo   ← 동료 없이
//   node dimension-thief/tools/sim.js 100 a6     ← 승천 6단계로 한 판
// 결과: 동료별 × 전투 구성별 승률·평균 턴·남은 체력·강탈률, 연전(체력 유지) 평균 승리 수.
// 도둑 봇: 보이는 공격만큼 막고, 처치 가능한 적 우선, 가장 센 공개 카드를 슬쩍, 빈사 적은 다음 턴에 처치(강탈).
// 동료는 게임 속 AI(js/ai.js)가 그대로 움직인다.
'use strict';
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const N = +process.argv[2] || 100;
const SOLO = process.argv.includes('solo');
// 승천 단계: node tools/sim.js 100 a3
const ASC = +((process.argv.find((a) => /^a\d$/.test(a)) || 'a0').slice(1));

// index.html 의 스크립트 순서대로 로드 (화면·저장·입력 파일 제외)
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const files = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1])
  .filter((f) => !/js\/(ui|main|save)\.js$/.test(f) && !f.startsWith('js/ui/'));
const ctx = { console: { log() {}, warn: (...a) => process.stderr.write('[경고] ' + a.join(' ') + '\n') }, Math, Object, JSON, Array, Set };
ctx.window = ctx;
vm.createContext(ctx);
files.forEach((f) => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }));
const DT = ctx.DT;
// 모듈 객체에 같은 이름의 함수가 두 번 정의되면 앞의 것이 조용히 사라진다 → 검사
for (const f of files.filter((x) => x.startsWith('js/'))) {
  const src = fs.readFileSync(path.join(root, f), 'utf8');
  const names = [...src.matchAll(/^  ([A-Za-z_]\w*)\s*\(/gm)].map((m) => m[1]).filter((n) => !['if', 'for', 'while', 'switch', 'return'].includes(n));
  const dup = names.filter((n, i) => names.indexOf(n) !== i);
  if (dup.length) process.stderr.write(`[경고] ${f}: 같은 이름의 함수가 두 번 정의됨 → ${[...new Set(dup)].join(', ')}\n`);
}
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
  const lock = def.effects.find((x) => x.type === 'lock');
  if (lock) score += (lock.to === 'allOpponents' ? alive.length : t ? 1 : 0) * lock.value * 2;
  const det = def.effects.find((x) => x.type === 'detonate');
  if (det && t) score += Math.min((t.statuses.poison || 0) * det.value, t.hp);
  const lose = def.effects.find((x) => x.type === 'loseHp');
  if (lose) { if (s.player.hp <= lose.value + 8) return null; score -= lose.value * 0.6; }
  if (def.effects.some((x) => x.type === 'steal')) {
    if (!t) return null;
    const rv = t.hand.filter((x) => x.revealed);
    if (!rv.length) return null;
    // 지속 효과 카드(왕관 등)는 최우선, 그다음 피해 큰 카드
    const val = (c) => (DT.cards.def(c.id).passive ? 100 : cardDmg(s, t.id, c.id));
    rv.sort((a, b) => val(b) - val(a));
    choice = rv[0].uid;
    score += 7 + (DT.cards.def(rv[0].id).passive ? 20 : cardDmg(s, t.id, rv[0].id) * 0.6 * (t.intent / t.hand.length));
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
// 시작 덱으로 비교할 수 있는 1차원만 (2~4차원은 아래 한 판 시뮬레이션에서 차원별로 집계)
for (const comp of comps) for (const [dim, kinds] of Object.entries(DT.data.encounters).filter(([d]) => d === 'medieval')) {
  for (const enc of Object.entries(kinds).flatMap(([k, l]) => l.map((e) => Object.assign({ kind: k }, e)))) {
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
    rows.push({ comp: comp ? DT.data.companions[comp].name : '없음', dim, enc: enc.id, tier: enc.tier || enc.kind, wins, turns, hpLeft, heists, steals, compDeaths });
  }
}

// ── 2) 1차원 한 판: 맵을 따라 보스까지 ──
// 길 고르기: 체력이 낮으면 은신처, 체력이 넉넉하면 정예도 감수. 은신처는 체력 70% 미만이면 휴식, 아니면 강화.
function thiefRatio(s) { return s.player.hp / s.player.maxHp; }
function choosePath(s, R) {
  const opts = DT.map.reachable(s).map((id) => s.map.nodes[id]);
  const score = (n) => {
    const hp = thiefRatio(s);
    if (n.type === 'hideout') return hp < 0.6 ? 10 : 2;
    if (n.type === 'elite') return hp > 0.75 ? 4 : -5;
    if (n.type === 'market') return s.gold >= 70 ? 3 : 0;
    if (n.type === 'event') return 2;
    return 1;
  };
  return opts.map((n) => ({ n, v: score(n) + R() })).sort((a, b) => b.v - a.v)[0].n.id;
}
const DIMS = ['medieval', 'cyber', 'abyss', 'hell'];
const instIn = {};
const voidStats = { reach: 0, win: 0, fights: [] };
let vaults = 0;
const reach = { medieval: 0, cyber: 0, abyss: 0, hell: 0 }, cleared = { medieval: 0, cyber: 0, abyss: 0, hell: 0 };
const runs = { clear: 0, death: 0, deathFloors: [], turns: 0, fights: 0, coins: 0, wanted: 0, compsAtEnd: 0, kept: 0, lost: 0 };
for (let i = 0; i < N; i++) {
  let rs = (i * 2654435761) >>> 0;
  const R = () => { rs = (rs + 0x6D2B79F5) >>> 0; let t = rs; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const s = DT.run.start('SIMRUN-' + i);
  s.ascension = ASC;
  if (SOLO) { s.starterOptions = ['shieldbearer']; }
  let guard = 0;
  reach.medieval++;
  while (s.screen !== 'runEnd' && guard++ < 2000) {
    if (s.screen === 'pickCompanion') {
      DT.run.pickCompanion(s, s.starterOptions[i % s.starterOptions.length]);
      if (SOLO) s.allies = [];
    } else if (s.screen === 'map') {
      // 장비는 빈 칸에 장착(도둑 먼저), 체력이 낮으면 회복 물약
      for (const it of s.bag.slice()) {
        const d = DT.items.def(it.id);
        if (d.kind === 'equip') {
          const who = DT.party.living(s).find((a) => !a.equip[d.slot]);
          if (who) DT.items.equip(s, it.uid, who.id);
        } else if (d.kind === 'consumable' && /potion/.test(it.id) && s.player.hp < s.player.maxHp * 0.5) {
          DT.items.use(s, it.uid, 'player');
        }
      }
      while (s.freeNaturalize > 0 && DT.run.naturalizable(s).length) DT.run.freeNaturalize(s, DT.run.naturalizable(s)[0].uid);
      DT.run.enterNode(s, choosePath(s, R));
    }
    else if (s.screen === 'combat') {
      const proto = s.dimension === 'void' && s.combatKind === 'boss';
      const hp0 = s.player.hp;
      const t = fight(s);
      runs.turns += t; runs.fights++;
      if (proto) voidStats.fights.push(`${s.result === 'win' ? '승' : '패'} ${t}턴 체력 ${hp0}→${s.player.hp}`);
      DT.run.resolve(s);
    }
    else if (s.screen === 'heist') {
      const g = s.heist.groups.find((x) => x.role);
      if (!SOLO && g && DT.party.slotsFree(s) > 0) DT.run.recruit(s, g.kind);
      else {
        const opts = s.heist.groups.flatMap((x) => x.options);
        opts.sort((a, b) => E.previewDamage(s, { id: b }, 'player', null) - E.previewDamage(s, { id: a }, 'player', null));
        DT.run.takeHeist(s, opts[0]);
      }
    } else if (s.screen === 'reward') DT.run.takeReward(s, s.reward.options[0]);
    else if (s.screen === 'rift') {
      // 불안정이 안전 범위면 가져오고, 아니면 건너뜀
      const inf = DT.run.instabilityInfo(s);
      if (inf.value < inf.safeMax) DT.run.takeRift(s, s.rift.options[0]); else DT.run.skipRift(s);
    } else if (s.screen === 'hideout') {
      const inf = DT.run.instabilityInfo(s);
      if (inf.level !== 'safe' && DT.run.naturalizable(s).length) { DT.run.hideoutNaturalize(s, DT.run.naturalizable(s)[0].uid); s.events.length = 0; continue; }
      const low = DT.party.living(s).some((a) => a.hp / a.maxHp < 0.7);
      const up = s.player.masterDeck.find((c) => DT.cards.canUpgrade(c) && c.id !== 'dodge');
      if (low || !up) DT.run.hideoutRest(s); else DT.run.upgradeCard(s, up.uid);
    } else if (s.screen === 'market') {
      DT.run.buyRelic(s);
      s.market.cards.forEach((c, k) => { if (DT.cards.def(c.id).rarity !== 'common') DT.run.buyCard(s, k); });
      DT.run.leave(s);
    } else if (s.screen === 'event') {
      const k = DT.data.events[s.event].options.findIndex((o, idx) => DT.run.canChooseEvent(s, idx));
      DT.run.chooseEvent(s, k);
    } else if (s.screen === 'eventResult') DT.run.closeEvent(s);
    else if (s.screen === 'pickRelic') DT.run.pickRelic(s, s.relicChoices[0]);
    else if (s.screen === 'voidGate') { cleared.hell++; voidStats.reach++; DT.run.nextDimension(s); }
    else if (s.screen === 'dimClear') { cleared[s.dimension]++; DT.run.nextDimension(s); reach[s.dimension]++; instIn[s.dimension] = (instIn[s.dimension] || 0) + DT.run.instability(s); }
    s.events.length = 0;
  }
  if (s.runEnd.how === 'clear') { runs.clear++; if (s.dimension === 'void') voidStats.win++; else cleared.hell++; }
  else { runs.death++; runs.deathFloors.push(s.runEnd.depth); }
  vaults += Object.values(s.map ? s.map.nodes : {}).filter((n) => n.type === 'vault' && n.visited).length;
  runs.coins += s.runEnd.banked;
  runs.wanted += s.wanted;
  runs.compsAtEnd += s.allies.length;
  runs.kept += s.runEnd.items.kept.length;
  runs.lost += s.runEnd.items.lost.length;
  runs.relics = (runs.relics || 0) + (s.relics || []).length;
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
const df = {};
runs.deathFloors.forEach((f) => { df[f] = (df[f] || 0) + 1; });
console.log(`\n한 판 ${N}회${ASC ? ` · 승천 ${ASC}` : ''}: 1차원 → 4차원 (맵·은신처·암시장·이벤트 포함, 시작 동료 순환${SOLO ? ', 동료 없음' : ''})`);
console.log('  차원별: ' + DIMS.map((d) => `${DT.data.dimensions[d].name} 도달 ${reach[d]} → 정복 ${cleared[d]} (${pct(cleared[d], reach[d])})`).join(' · '));
console.log('  차원 진입 시 평균 불안정: ' + DIMS.slice(1).map((d) => `${DT.data.dimensions[d].name} ${avg(instIn[d] || 0, reach[d])}`).join(' · '));
const bossD = {}; runs.deathFloors.forEach((f) => { const k = Math.floor((f - 1) / 12) + (f % 12 === 0 ? '보스' : '맵'); bossD[k] = (bossD[k] || 0) + 1; });
console.log('  사망: ' + Object.entries(bossD).map(([k, n]) => `${+k[0] + 1}차원 ${k.slice(1)} ${n}`).join(' · '));
console.log(`  차원의 틈: 도달 ${voidStats.reach} → 원조 도둑 처치 ${voidStats.win} · 방문한 황금 금고(마지막 차원 맵 기준) ${vaults}`);
if (voidStats.fights.length) console.log('  원조 도둑전: ' + voidStats.fights.join(' / '));
console.log(`  전체 클리어 ${pct(runs.clear, N)} · 전투당 평균 ${avg(runs.turns, runs.fights)}턴 · 보존 코인 평균 ${avg(runs.coins, N)} · 끝날 때 수배도 평균 ${avg(runs.wanted, N)} · 남은 동료 평균 ${avg(runs.compsAtEnd, N)}`);
console.log(`  판당 아이템: 창고로 ${avg(runs.kept, N)}개, 분실 ${avg(runs.lost, N)}개`);
console.log(`  판당 유물: ${avg(runs.relics || 0, N)}개`);
console.log('  사망 위치:', Object.entries(df).map(([f, n]) => `${DT.run.depthLabel(+f)}×${n}`).join(' ') || '없음');
