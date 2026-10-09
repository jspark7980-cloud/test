// 갈림길 맵 생성. 왼쪽(1층) → 오른쪽(보스), 줄(lane)은 위아래.
// 경로 여러 개를 1층에서 보스 전 층까지 그려 합치고, 선이 엇갈리지 않게 한다.
window.DT = window.DT || {};

DT.map = {
  generate(state) {
    const M = DT.config.map;
    const F = M.floors;
    const L = M.lanes;
    const nodes = {};
    const floors = Array.from({ length: F }, () => []);
    const id = (f, lane) => `f${f}l${lane}`;
    const get = (f, lane) => {
      const k = id(f, lane);
      if (!nodes[k]) {
        nodes[k] = { id: k, floor: f + 1, lane, type: null, next: [], prev: [], visited: false };
        floors[f].push(k);
      }
      return nodes[k];
    };
    const crosses = (f, a, b) => floors[f].some((k) => nodes[k].next.some((n) => {
      const c = nodes[k].lane, d = nodes[n].lane;
      return (a < c && b > d) || (a > c && b < d);
    }));

    // 경로 그리기 (보스 전 층까지)
    const starts = DT.rng.shuffle(state, [...Array(L).keys()]);
    for (let p = 0; p < M.paths; p++) {
      let lane = p < L ? starts[p] : DT.rng.int(state, 0, L - 1);
      for (let f = 0; f < F - 2; f++) {
        const cur = get(f, lane);
        const want = Math.max(0, Math.min(L - 1, lane + DT.rng.int(state, -1, 1)));
        const options = [want, lane, lane - 1, lane + 1].filter((x) => x >= 0 && x < L);
        const nl = options.find((x) => !crosses(f, lane, x)) ?? lane;
        const nxt = get(f + 1, nl);
        if (!cur.next.includes(nxt.id)) { cur.next.push(nxt.id); nxt.prev.push(cur.id); }
        lane = nl;
      }
    }
    // 보스: 마지막 층 가운데 하나, 보스 전 층 전부와 연결
    const boss = get(F - 1, Math.floor((L - 1) / 2));
    for (const k of floors[F - 2]) { nodes[k].next.push(boss.id); boss.prev.push(k); }
    floors.forEach((list) => list.sort((a, b) => nodes[a].lane - nodes[b].lane));

    // 노드 종류
    const special = ['elite', 'market', 'hideout'];
    for (let f = 0; f < F; f++) {
      for (const k of floors[f]) {
        const n = nodes[k];
        if (f === 0) n.type = 'combat';
        else if (f === F - 1) n.type = 'boss';
        else if (f === F - 2) n.type = 'hideout';
        else {
          const pool = Object.entries(M.weights).filter(([t]) => !(M.minFloor[t] && n.floor < M.minFloor[t]));
          for (let tries = 0; tries < 4; tries++) {
            n.type = DT.map.weighted(state, pool);
            // 같은 특수 노드가 연달아 나오지 않게
            const clash = special.includes(n.type) && n.prev.some((pid) => nodes[pid].type === n.type);
            if (!clash) break;
          }
        }
      }
    }
    return { nodes, floors };
  },

  weighted(state, pairs) {
    const total = pairs.reduce((a, [, w]) => a + w, 0);
    let r = DT.rng.next(state) * total;
    for (const [k, w] of pairs) {
      if (r < w) return k;
      r -= w;
    }
    return pairs[pairs.length - 1][0];
  },

  // 지금 갈 수 있는 노드 id
  reachable(state) {
    const m = state.map;
    if (!m) return [];
    if (!state.pos) return m.floors[0].slice();
    return m.nodes[state.pos].next.slice();
  },

  icon(type) {
    return { combat: '⚔️', elite: '💀', market: '🛒', hideout: '🏕️', event: '❓', boss: '👑' }[type] || '·';
  },
  label(type) {
    return { combat: '전투', elite: '정예', market: '암시장', hideout: '은신처', event: '이벤트', boss: '보스' }[type] || type;
  },
};
