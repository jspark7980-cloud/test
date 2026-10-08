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

  // 메타 진행: 도감(훔친 카드), 누적 기록
  loadMeta() {
    return Object.assign({ wins: 0, losses: 0, steals: 0, codex: {} }, DT.save._get(DT.save.META_KEY) || {});
  },
  saveMeta(meta) {
    return DT.save._set(DT.save.META_KEY, meta);
  },
};
