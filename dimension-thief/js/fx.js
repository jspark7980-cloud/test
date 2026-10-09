// 화면 연출: 숫자 튀기기, 흔들림·붉은 깜빡임, 카드 날아가기, 처치 슬로모션·파편.
// 수치는 config.fx. '화면 흔들림 끄기' 설정이면 흔들림만 생략한다.
window.DT = window.DT || {};

(function () {
  const F = (DT.fx = {});
  const cfg = () => DT.config.fx;
  const $ = (s) => document.querySelector(s);
  const layer = () => $('#fx');
  const shakeOn = () => !DT.settings || DT.settings.shake !== false;
  const portrait = (id) => document.querySelector(`[data-actor="${id}"] .portrait`) || document.querySelector(`[data-actor="${id}"]`);
  const center = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, r }; };
  const later = (ms, fn) => (ms > 0 ? setTimeout(fn, ms) : fn());

  // 숫자·글자 튀기기. size 를 주면 그 크기(px), big 이면 튀어나오는 연출
  F.float = function (id, text, cls, delay, size, big) {
    const el = portrait(id);
    if (!el) return;
    later(delay, () => {
      const c = center(el);
      const f = document.createElement('div');
      f.className = 'float ' + cls + (big ? ' big' : '');
      f.textContent = text;
      f.style.left = c.x + (Math.random() * 30 - 15) + 'px';
      f.style.top = c.r.top + c.r.height * 0.15 + 'px';
      if (size) f.style.fontSize = size + 'px';
      layer().appendChild(f);
      setTimeout(() => f.remove(), 1500);
    });
  };

  // 피해량 → 글자 크기
  F.dmgSize = (n) => Math.round(Math.min(cfg().dmgSizeMax, cfg().dmgSizeMin + n * cfg().dmgSizePer));

  F.shakeActor = function (id, delay) {
    if (!shakeOn()) return;
    const el = document.querySelector(`[data-actor="${id}"]`);
    if (!el) return;
    later(delay, () => { el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); });
  };

  // 화면 전체 흔들림. power: 0~1
  F.shakeScreen = function (power, delay) {
    if (!shakeOn()) return;
    const app = $('#app');
    later(delay, () => {
      app.style.setProperty('--shake', Math.round(4 + power * cfg().shakeMax) + 'px');
      app.classList.remove('shake'); void app.offsetWidth; app.classList.add('shake');
    });
  };

  // 화면 가장자리 붉은 깜빡임
  F.flash = function (power, delay) {
    later(delay, () => {
      let el = $('#hurtflash');
      if (!el) { el = document.createElement('div'); el.id = 'hurtflash'; document.body.appendChild(el); }
      el.style.setProperty('--a', (0.25 + power * 0.5).toFixed(2));
      el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
    });
  };

  // 카드가 from → to 로 곡선을 그리며 날아간다. from·to: 화면 좌표 {x, y}
  F.cardFly = function (html, from, to, delay) {
    later(delay, () => {
      const w = document.createElement('div');
      w.className = 'flycard';
      w.innerHTML = html;
      w.style.left = from.x + 'px';
      w.style.top = from.y + 'px';
      layer().appendChild(w);
      const dx = to.x - from.x, dy = to.y - from.y;
      const ms = cfg().cardFlyMs;
      if (w.animate) {
        w.animate([
          { transform: 'translate(-50%, -50%) scale(0.5) rotate(-12deg)', opacity: 0.2 },
          { transform: `translate(calc(-50% + ${dx * 0.45}px), calc(-50% + ${dy * 0.45 - 120}px)) scale(1.1) rotate(8deg)`, opacity: 1, offset: 0.45 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.45) rotate(0deg)`, opacity: 0.6 },
        ], { duration: ms, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'forwards' });
      }
      setTimeout(() => w.remove(), ms + 50);
    });
  };
  F.posOf = function (sel) {
    const el = typeof sel === 'string' ? (document.querySelector(`[data-actor="${sel}"]`) || $(sel)) : sel;
    return el ? center(el) : { x: innerWidth / 2, y: innerHeight / 2 };
  };

  // 처치: 짧은 슬로모션 + 파편
  F.kill = function (id, color, delay) {
    const el = portrait(id);
    if (!el) return;
    later(delay, () => {
      const c = center(el);
      const n = cfg().particles;
      for (let i = 0; i < n; i++) {
        const p = document.createElement('div');
        p.className = 'shard';
        const ang = (Math.PI * 2 * i) / n + Math.random() * 0.4;
        const dist = 60 + Math.random() * 90;
        p.style.left = c.x + 'px';
        p.style.top = c.y + 'px';
        p.style.background = color || '#ffd166';
        p.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
        p.style.setProperty('--dy', Math.sin(ang) * dist + 'px');
        layer().appendChild(p);
        setTimeout(() => p.remove(), 1000);
      }
      document.body.classList.remove('slowmo'); void document.body.offsetWidth;
      document.body.classList.add('slowmo');
      setTimeout(() => document.body.classList.remove('slowmo'), cfg().slowmoMs);
    });
  };

  // 뽑기 결과 등 화면 가운데 반짝임
  F.burstAt = function (x, y, color, n) {
    for (let i = 0; i < (n || 18); i++) {
      const p = document.createElement('div');
      p.className = 'shard';
      const ang = Math.random() * Math.PI * 2;
      const dist = 80 + Math.random() * 160;
      p.style.left = x + 'px';
      p.style.top = y + 'px';
      p.style.background = color === 'rainbow' ? `hsl(${Math.floor(Math.random() * 360)},90%,65%)` : color;
      p.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
      p.style.setProperty('--dy', Math.sin(ang) * dist + 'px');
      layer().appendChild(p);
      setTimeout(() => p.remove(), 1000);
    }
  };
})();
