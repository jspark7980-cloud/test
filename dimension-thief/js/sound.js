// 효과음: Web Audio 로 즉석 생성(음원 파일 없음).
// 아이패드 사파리는 사용자가 한 번 탭한 뒤에야 소리를 낼 수 있어서 첫 탭에 오디오를 깨운다.
// 소리 이름: hit(세기) · block · steal · coin · draw · heal · kill · gacha(등급) · click
window.DT = window.DT || {};

(function () {
  const S = (DT.sound = {});
  let ctx = null;
  const last = {};

  function ac() {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      try { ctx = new C(); } catch (e) { return null; }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // 첫 탭에 깨우기(무음 1프레임 재생)
  S.unlock = function () {
    const c = ac();
    if (!c) return;
    const b = c.createBuffer(1, 1, 22050);
    const src = c.createBufferSource();
    src.buffer = b;
    src.connect(c.destination);
    src.start(0);
  };

  const enabled = () => !DT.settings || DT.settings.sound !== false;

  // 음 하나: freq → to 로 미끄러지며 dur 초
  function tone(c, t0, o) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.freq, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + o.dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.vol || 0.2, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    osc.connect(g).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + o.dur + 0.02);
  }

  // 잡음: 필터를 거친 백색 잡음
  function noise(c, t0, o) {
    const len = Math.max(1, Math.floor(c.sampleRate * o.dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = o.filter || 'lowpass';
    f.frequency.setValueAtTime(o.freq || 1200, t0);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t0 + o.dur);
    const g = c.createGain();
    g.gain.setValueAtTime(o.vol || 0.3, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    src.connect(f).connect(g).connect(c.destination);
    src.start(t0);
  }

  const SOUNDS = {
    hit(c, t, p) {             // p: 0~1 세기
      noise(c, t, { dur: 0.12 + p * 0.15, freq: 900 + p * 1500, to: 200, vol: 0.25 + p * 0.3 });
      tone(c, t, { freq: 160 - p * 60, to: 50, dur: 0.15 + p * 0.15, type: 'sine', vol: 0.35 + p * 0.3 });
    },
    block(c, t) {
      tone(c, t, { freq: 900, to: 500, dur: 0.12, type: 'triangle', vol: 0.18 });
      noise(c, t, { dur: 0.08, filter: 'highpass', freq: 3000, vol: 0.12 });
    },
    steal(c, t) {
      noise(c, t, { dur: 0.25, filter: 'bandpass', freq: 600, to: 4000, vol: 0.25 });
      tone(c, t + 0.05, { freq: 500, to: 1400, dur: 0.18, type: 'sine', vol: 0.15 });
    },
    coin(c, t) {
      tone(c, t, { freq: 988, dur: 0.09, type: 'square', vol: 0.08 });
      tone(c, t + 0.08, { freq: 1319, dur: 0.22, type: 'square', vol: 0.08 });
    },
    draw(c, t) { noise(c, t, { dur: 0.07, filter: 'highpass', freq: 2500, to: 6000, vol: 0.1 }); },
    heal(c, t) {
      tone(c, t, { freq: 520, to: 780, dur: 0.25, type: 'sine', vol: 0.12 });
      tone(c, t + 0.1, { freq: 780, to: 1040, dur: 0.25, type: 'sine', vol: 0.08 });
    },
    kill(c, t) {
      tone(c, t, { freq: 120, to: 35, dur: 0.5, type: 'sawtooth', vol: 0.18 });
      noise(c, t, { dur: 0.45, freq: 800, to: 80, vol: 0.3 });
    },
    click(c, t) { tone(c, t, { freq: 700, dur: 0.04, type: 'triangle', vol: 0.06 }); },
    // 뽑기: 등급이 높을수록 음이 많고 높다
    gacha(c, t, grade) {
      const notes = { common: [523, 659], rare: [523, 659, 784], hero: [523, 659, 784, 1047], legend: [523, 659, 784, 1047, 1319, 1568] }[grade] || [523];
      notes.forEach((f, i) => tone(c, t + i * 0.09, { freq: f, dur: 0.35, type: grade === 'legend' ? 'triangle' : 'sine', vol: 0.14 }));
      if (grade === 'legend') noise(c, t + notes.length * 0.09, { dur: 0.8, filter: 'highpass', freq: 5000, vol: 0.08 });
    },
  };

  // name: 소리 이름, arg: 세기·등급 등, delay: 초
  S.play = function (name, arg, delay) {
    if (!enabled() || !SOUNDS[name]) return;
    const c = ac();
    if (!c) return;
    const now = c.currentTime + (delay || 0);
    // 같은 소리가 한꺼번에 몰리면 하나만
    if (last[name] && now - last[name] < 0.05) return;
    last[name] = now;
    try { SOUNDS[name](c, now, arg); } catch (e) { /* 소리 실패는 무시 */ }
  };
})();
