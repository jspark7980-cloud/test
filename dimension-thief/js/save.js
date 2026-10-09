// localStorage 저장. 사파리 개인정보 보호 모드 등에서 실패해도 게임은 계속된다.
window.DT = window.DT || {};

DT.save = {
  RUN_KEY: 'dimthief.run.v1',
  META_KEY: 'dimthief.meta.v1',

  _get(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },
  _set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  },

  saveRun(state) {
    const copy = Object.assign({}, state, { events: [] });
    return DT.save._set(DT.save.RUN_KEY, copy);
  },
  loadRun() {
    const s = DT.save._get(DT.save.RUN_KEY);
    if (!s || s.version !== DT.state.VERSION || !s.player || !Array.isArray(s.enemies)) return null;
    s.events = [];
    return s;
  },
  clearRun() {
    try { localStorage.removeItem(DT.save.RUN_KEY); } catch (e) { /* 무시 */ }
  },

  // 메타 진행: 도감(훔친 카드), 누적 기록. heists 는 도둑 레벨 계산용.
  loadMeta() {
    // coins: 로비에서 쓰는 영구 화폐(판 종료 시 보존된 코인이 쌓인다)
    // upgrades: 영구 강화 단계 { id: 단계 }, unlocked: 해금한 동료 id
    // stash: 창고(판이 끝나고 남은 아이템)
    const m = Object.assign({ coins: 0, upgrades: {}, unlocked: [], stash: [], runs: 0, clears: 0, bestFloor: 0, combatsWon: 0, steals: 0, heists: 0, copies: 0, codex: {} },
      DT.save._get(DT.save.META_KEY) || {});
    // 창고 아이템 id 중복 정리(이전 버전 저장 데이터 호환)
    const seen = new Set();
    m.nextStashId = m.nextStashId || 1;
    m.stash.forEach((it) => { if (seen.has(it.uid) || !/^s\d/.test(it.uid)) it.uid = 's' + m.nextStashId++; seen.add(it.uid); });
    return m;
  },
  saveMeta(meta) {
    return DT.save._set(DT.save.META_KEY, meta);
  },
};
