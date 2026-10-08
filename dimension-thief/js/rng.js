// 시드 기반 난수. 상태(state.rng)는 32비트 정수 하나라 저장/복원이 쉽다.
window.DT = window.DT || {};

DT.rng = {
  // 문자열 시드 → 32비트 정수 (xmur3)
  hashSeed(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^ (h >>> 16)) >>> 0;
  },

  // 새 판용 시드 문자열 (시드 자체를 고를 때만 Math.random 사용)
  randomSeed() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  },

  // mulberry32: 0 이상 1 미만
  next(state) {
    let t = (state.rng = (state.rng + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  },

  // min 이상 max 이하 정수
  int(state, min, max) {
    return min + Math.floor(DT.rng.next(state) * (max - min + 1));
  },

  pick(state, arr) {
    return arr.length ? arr[Math.floor(DT.rng.next(state) * arr.length)] : undefined;
  },

  shuffle(state, arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(DT.rng.next(state) * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },
};
