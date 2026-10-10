// 몬스터 그림: SVG 도형 부품 조합. 진화할수록 부품이 늘고 커진다.
// ML.art.svg(speciesId, { shiny, size }) → SVG 문자열
var ML = window.ML = window.ML || {};

(function () {
  var uid = 0;

  // 몸통: 경로 + 부품을 붙일 기준점(머리 위 top, 눈 높이 eyeY, 눈 간격 eyeDX, 옆 side, 꼬리 tail)
  var BODIES = {
    round:   { d: el(100, 122, 52, 48), top: 78, eyeY: 112, eyeDX: 18, side: 50, sideY: 128, tail: [146, 140], back: 118 },
    oval:    { d: el(100, 116, 44, 54), top: 66, eyeY: 100, eyeDX: 16, side: 42, sideY: 126, tail: [138, 148], back: 106 },
    pear:    { d: 'M100 58 C130 58 136 92 146 120 C158 152 140 172 100 172 C60 172 42 152 54 120 C64 92 70 58 100 58 Z', top: 62, eyeY: 96, eyeDX: 15, side: 50, sideY: 136, tail: [148, 150], back: 104 },
    long:    { d: 'M44 128 C44 100 70 88 100 92 C132 96 164 108 164 132 C164 156 132 166 100 164 C68 162 44 152 44 128 Z', top: 92, eyeY: 116, eyeDX: 14, eyeX: 74, side: 60, sideY: 140, tail: [160, 138], back: 100 },
    flat:    { d: el(100, 138, 66, 32), top: 106, eyeY: 108, eyeDX: 20, stalks: true, side: 64, sideY: 132, tail: [160, 142], back: 130 },
    blob:    { d: 'M100 76 C134 76 148 104 146 128 C144 158 124 170 100 170 C76 170 56 158 54 128 C52 104 66 76 100 76 Z', top: 80, eyeY: 112, eyeDX: 18, side: 46, sideY: 136, tail: [144, 146], back: 120 },
    serpent: { d: 'M60 166 C40 166 40 140 66 138 C90 136 130 142 136 156 C142 170 120 172 100 170 Z M76 140 C66 120 72 96 96 88 C116 82 130 90 128 104 C126 118 110 122 100 130 C94 134 90 138 86 140 Z', top: 84, eyeY: 100, eyeDX: 11, eyeX: 106, side: 44, sideY: 150, tail: [146, 162], back: 110 },
    dome:    { d: 'M52 128 C52 92 74 72 100 72 C126 72 148 92 148 128 C140 134 132 126 124 134 C116 126 108 134 100 128 C92 134 84 126 76 134 C68 126 60 134 52 128 Z', top: 76, eyeY: 108, eyeDX: 17, side: 48, sideY: 112, tail: [100, 132], back: 100 },
    snail:   { d: 'M40 160 C40 146 54 140 70 140 L150 146 C162 148 166 158 160 166 C150 172 60 172 46 168 C42 166 40 164 40 160 Z', top: 104, eyeY: 128, eyeDX: 9, eyeX: 58, side: 60, sideY: 156, tail: [162, 160], back: 120, shell: true },
    ghost:   { d: 'M100 62 C132 62 148 88 148 118 L148 162 C140 152 132 170 124 160 C116 150 108 170 100 160 C92 170 84 150 76 160 C68 170 60 152 52 162 L52 118 C52 88 68 62 100 62 Z', top: 66, eyeY: 104, eyeDX: 16, side: 48, sideY: 120, tail: [148, 150], back: 108 },
    wide:    { d: 'M24 130 C40 104 72 98 100 98 C128 98 160 104 176 130 C160 152 128 160 100 160 C72 160 40 152 24 130 Z', top: 100, eyeY: 120, eyeDX: 26, side: 74, sideY: 132, tail: [176, 132], back: 112 },
  };

  var STAGE_SCALE = { 1: 0.74, 2: 0.88, 3: 1.0 };
  var RARITY_SCALE = { rare: 0.86, fusion: 1.0, legend: 1.06, hidden: 1.06 };

  function el(cx, cy, rx, ry) {
    return 'M' + (cx - rx) + ' ' + cy + ' a' + rx + ' ' + ry + ' 0 1 0 ' + (2 * rx) + ' 0 a' + rx + ' ' + ry + ' 0 1 0 ' + (-2 * rx) + ' 0 Z';
  }
  function circle(x, y, r, fill, extra) { return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + fill + '"' + (extra || '') + '/>'; }
  function path(d, fill, extra) { return '<path d="' + d + '" fill="' + fill + '"' + (extra || '') + '/>'; }
  function stroke(c, w) { return ' stroke="' + c + '" stroke-width="' + (w || 3) + '" stroke-linejoin="round" stroke-linecap="round"'; }

  function palette(els, shiny) {
    var get = function (e) {
      var i = ML.elements.info[e];
      return shiny ? { main: i.shiny[0], light: i.shiny[1], dark: i.shiny[2], accent: i.shiny[3] } : { main: i.main, light: i.light, dark: i.dark, accent: i.accent };
    };
    var p = get(els[0]);
    p.second = els[1] ? get(els[1]) : p;
    return p;
  }

  // ── 부품 ──────────────────────────────────────────
  function ears(kind, b, p) {
    var t = b.top, cx = b.eyeX || 100, dx = b.eyeDX + 12, o = '', ol = stroke(p.dark, 3);
    if (kind === 'round') { o += circle(cx - dx, t + 6, 13, p.main, ol) + circle(cx + dx, t + 6, 13, p.main, ol) + circle(cx - dx, t + 6, 6, p.light) + circle(cx + dx, t + 6, 6, p.light); }
    if (kind === 'pointy') {
      [-1, 1].forEach(function (s) {
        o += path('M' + (cx + s * (dx - 12)) + ' ' + (t + 14) + ' L' + (cx + s * (dx + 4)) + ' ' + (t - 20) + ' L' + (cx + s * (dx + 12)) + ' ' + (t + 14) + ' Z', p.main, ol);
        o += path('M' + (cx + s * (dx - 4)) + ' ' + (t + 10) + ' L' + (cx + s * (dx + 4)) + ' ' + (t - 8) + ' L' + (cx + s * (dx + 6)) + ' ' + (t + 10) + ' Z', p.accent);
      });
    }
    if (kind === 'long') {
      [-1, 1].forEach(function (s) {
        o += '<ellipse cx="' + (cx + s * (dx - 4)) + '" cy="' + (t - 22) + '" rx="10" ry="30" fill="' + p.main + '" transform="rotate(' + (s * 12) + ' ' + (cx + s * (dx - 4)) + ' ' + (t - 22) + ')"' + ol + '/>';
        o += '<ellipse cx="' + (cx + s * (dx - 4)) + '" cy="' + (t - 20) + '" rx="4" ry="20" fill="' + p.light + '" transform="rotate(' + (s * 12) + ' ' + (cx + s * (dx - 4)) + ' ' + (t - 22) + ')"/>';
      });
    }
    if (kind === 'antenna') {
      [-1, 1].forEach(function (s) {
        o += path('M' + (cx + s * 6) + ' ' + (t + 6) + ' Q' + (cx + s * 12) + ' ' + (t - 18) + ' ' + (cx + s * 24) + ' ' + (t - 26), 'none', stroke(p.dark, 3));
        o += circle(cx + s * 24, t - 26, 5, p.accent, stroke(p.dark, 2));
      });
    }
    return o;
  }

  function horns(spec, b, p, stage) {
    if (!spec) return '';
    var kind = spec[0], n = spec[1], t = b.top, cx = b.eyeX || 100, o = '', c = p.second, ol = stroke(p.dark, 2.5);
    var sz = 1 + 0.25 * (n - 1);
    if (kind === 'spike') {
      var xs = n === 1 ? [0] : n === 2 ? [-14, 14] : [-20, 0, 20];
      xs.forEach(function (x, i) {
        var h = 22 * sz * (n === 3 && i === 1 ? 1.3 : 1);
        o += path('M' + (cx + x - 7) + ' ' + (t + 8) + ' L' + (cx + x) + ' ' + (t - h) + ' L' + (cx + x + 7) + ' ' + (t + 8) + ' Z', c.light, ol);
      });
    }
    if (kind === 'sprout' || kind === 'antler') {
      var lvl = kind === 'antler' ? n + 1 : n;
      for (var i = 0; i < lvl; i++) {
        var s = i % 2 === 0 ? -1 : 1, x = cx + (lvl === 1 ? 0 : s * (8 + 4 * i));
        var h = 24 + i * 8;
        o += path('M' + x + ' ' + (t + 6) + ' L' + (x + s * 4) + ' ' + (t - h), 'none', stroke(kind === 'antler' ? '#7a5532' : '#3f8a2c', 4));
        o += '<ellipse cx="' + (x + s * 12) + '" cy="' + (t - h + 2) + '" rx="12" ry="6" fill="#6ad06a" transform="rotate(' + (s * -25) + ' ' + (x + s * 12) + ' ' + (t - h + 2) + ')"' + stroke('#2c6a22', 2) + '/>';
      }
    }
    if (kind === 'cap') {
      var w = 34 + 10 * n, h2 = 18 + 6 * n;
      o += path('M' + (cx - w) + ' ' + (t + 12) + ' Q' + cx + ' ' + (t - h2 * 2) + ' ' + (cx + w) + ' ' + (t + 12) + ' Z', '#e0525a', stroke('#7a1f2a', 3));
      for (var j = 0; j < 2 + n; j++) o += circle(cx - w * 0.6 + j * (w * 1.2 / (1 + n)), t - h2 * 0.4 + (j % 2) * 8, 5, '#fff3e6');
    }
    if (kind === 'crest') {
      for (var k = 0; k < n + 1; k++) {
        var a = -30 + k * (60 / Math.max(1, n));
        o += '<path d="M' + cx + ' ' + (t + 6) + ' Q' + (cx - 6) + ' ' + (t - 18) + ' ' + cx + ' ' + (t - 30 - 4 * n) + ' Q' + (cx + 6) + ' ' + (t - 14) + ' ' + cx + ' ' + (t + 6) + ' Z" fill="' + p.accent + '" transform="rotate(' + a + ' ' + cx + ' ' + (t + 6) + ')"' + ol + '/>';
      }
    }
    if (kind === 'crystal') {
      var cs = n === 1 ? [0] : n === 2 ? [-16, 16] : [-24, 0, 24];
      cs.forEach(function (x, i) {
        var hh = 18 + 8 * n * (n === 3 && i === 1 ? 1.3 : 1);
        o += path('M' + (cx + x - 8) + ' ' + (t + 10) + ' L' + (cx + x - 6) + ' ' + (t - hh * 0.6) + ' L' + (cx + x) + ' ' + (t - hh) + ' L' + (cx + x + 6) + ' ' + (t - hh * 0.6) + ' L' + (cx + x + 8) + ' ' + (t + 10) + ' Z', p.accent, stroke(p.dark, 2) + ' opacity="0.95"');
      });
    }
    if (kind === 'flame') {
      var fh = 30 + 10 * n;
      o += path('M' + (cx - 14) + ' ' + (t + 10) + ' C' + (cx - 20) + ' ' + (t - fh * 0.5) + ' ' + (cx - 4) + ' ' + (t - fh * 0.6) + ' ' + cx + ' ' + (t - fh) + ' C' + (cx + 6) + ' ' + (t - fh * 0.6) + ' ' + (cx + 22) + ' ' + (t - fh * 0.4) + ' ' + (cx + 14) + ' ' + (t + 10) + ' Z', '#ffb43d', stroke('#c4421a', 2.5));
      o += path('M' + (cx - 6) + ' ' + (t + 8) + ' C' + (cx - 8) + ' ' + (t - fh * 0.3) + ' ' + cx + ' ' + (t - fh * 0.5) + ' ' + cx + ' ' + (t - fh * 0.55) + ' C' + (cx + 4) + ' ' + (t - fh * 0.3) + ' ' + (cx + 8) + ' ' + (t - fh * 0.2) + ' ' + (cx + 6) + ' ' + (t + 8) + ' Z', '#fff0a0');
    }
    if (kind === 'crescent') {
      var r = 14 + 4 * n;
      o += path('M' + (cx - r) + ' ' + (t - 4) + ' A' + r + ' ' + r + ' 0 1 0 ' + (cx + r) + ' ' + (t - 4) + ' A' + (r * 0.8) + ' ' + (r * 0.8) + ' 0 1 1 ' + (cx - r) + ' ' + (t - 4) + ' Z', p.accent, ol + ' transform="rotate(180 ' + cx + ' ' + (t - 4) + ')"');
    }
    if (kind === 'bump') { o += circle(cx - 18, t + 4, 8, p.light, ol) + circle(cx + 18, t + 4, 8, p.light, ol); }
    if (kind === 'crown') {
      o += path('M' + (cx - 26) + ' ' + (t + 8) + ' L' + (cx - 26) + ' ' + (t - 18) + ' L' + (cx - 13) + ' ' + (t - 4) + ' L' + cx + ' ' + (t - 28) + ' L' + (cx + 13) + ' ' + (t - 4) + ' L' + (cx + 26) + ' ' + (t - 18) + ' L' + (cx + 26) + ' ' + (t + 8) + ' Z', '#ffd76b', stroke('#a38320', 2.5));
      o += circle(cx, t - 4, 4, '#ff7ad9');
    }
    return o;
  }

  function tail(kind, b, p) {
    if (!kind) return '';
    var x = b.tail[0], y = b.tail[1], o = '', ol = stroke(p.dark, 3);
    if (kind === 'flame') {
      o += path('M' + (x - 10) + ' ' + y + ' Q' + (x + 18) + ' ' + (y - 10) + ' ' + (x + 26) + ' ' + (y - 40) + ' Q' + (x + 30) + ' ' + (y - 20) + ' ' + (x + 40) + ' ' + (y - 30) + ' Q' + (x + 40) + ' ' + (y + 6) + ' ' + (x + 4) + ' ' + (y + 12) + ' Z', '#ffb43d', stroke('#c4421a', 3));
      o += path('M' + x + ' ' + (y + 2) + ' Q' + (x + 18) + ' ' + (y - 4) + ' ' + (x + 26) + ' ' + (y - 22) + ' Q' + (x + 30) + ' ' + (y + 2) + ' ' + (x + 6) + ' ' + (y + 8) + ' Z', '#fff0a0');
    }
    if (kind === 'thin') o += path('M' + (x - 8) + ' ' + y + ' Q' + (x + 30) + ' ' + (y + 6) + ' ' + (x + 34) + ' ' + (y - 30), 'none', stroke(p.main, 7)) + path('M' + (x - 8) + ' ' + y + ' Q' + (x + 30) + ' ' + (y + 6) + ' ' + (x + 34) + ' ' + (y - 30), 'none', stroke(p.dark, 1.5));
    if (kind === 'leaf') o += '<ellipse cx="' + (x + 18) + '" cy="' + (y - 22) + '" rx="16" ry="32" fill="#6ad06a" transform="rotate(30 ' + (x + 18) + ' ' + (y - 22) + ')"' + stroke('#2c6a22', 3) + '/>' + path('M' + (x + 4) + ' ' + (y + 4) + ' L' + (x + 32) + ' ' + (y - 48), 'none', stroke('#2c6a22', 2));
    if (kind === 'bolt') o += path('M' + (x - 6) + ' ' + y + ' L' + (x + 20) + ' ' + (y - 12) + ' L' + (x + 12) + ' ' + (y - 22) + ' L' + (x + 38) + ' ' + (y - 44) + ' L' + (x + 24) + ' ' + (y - 20) + ' L' + (x + 32) + ' ' + (y - 12) + ' L' + x + ' ' + (y + 10) + ' Z', p.second === p ? p.accent : p.second.main, stroke(p.dark, 2.5));
    if (kind === 'fin') o += path('M' + (x - 10) + ' ' + y + ' Q' + (x + 16) + ' ' + (y - 4) + ' ' + (x + 34) + ' ' + (y - 26) + ' Q' + (x + 26) + ' ' + y + ' ' + (x + 36) + ' ' + (y + 22) + ' Q' + (x + 14) + ' ' + (y + 10) + ' ' + (x - 6) + ' ' + (y + 10) + ' Z', p.light, ol);
    if (kind === 'wisp') o += path('M' + (x - 10) + ' ' + y + ' C' + (x + 20) + ' ' + (y - 4) + ' ' + (x + 10) + ' ' + (y - 34) + ' ' + (x + 34) + ' ' + (y - 40) + ' C' + (x + 24) + ' ' + (y - 24) + ' ' + (x + 34) + ' ' + (y + 4) + ' ' + (x - 4) + ' ' + (y + 12) + ' Z', p.light, stroke(p.dark, 2) + ' opacity="0.85"');
    if (kind === 'tentacles') {
      for (var i = -2; i <= 2; i++) o += path('M' + (x + i * 14) + ' ' + y + ' q' + (6 * (i % 2 ? 1 : -1)) + ' 14 0 26 q' + (-6 * (i % 2 ? 1 : -1)) + ' 12 ' + (i * 2) + ' 22', 'none', stroke(p.main, 5)) ;
    }
    return o;
  }

  function wings(n, b, p) {
    if (!n) return '';
    var y = b.back, o = '', w = n === 1 ? 34 : 54, c = p.second === p ? p.light : p.second.light;
    [-1, 1].forEach(function (s) {
      var x = 100 + s * (b.side - 10);
      o += path('M' + x + ' ' + (y + 10) + ' Q' + (x + s * w) + ' ' + (y - w) + ' ' + (x + s * (w + 14)) + ' ' + (y - 6) + ' Q' + (x + s * (w * 0.7)) + ' ' + (y + 6) + ' ' + (x + s * (w * 0.8)) + ' ' + (y + 24) + ' Q' + (x + s * (w * 0.4)) + ' ' + (y + 16) + ' ' + x + ' ' + (y + 26) + ' Z', c, stroke(p.dark, 3));
    });
    return o;
  }

  function claws(n, b, p) {
    if (!n) return '';
    var y = b.sideY, o = '', r = 10 + n * 4;
    [-1, 1].forEach(function (s) {
      var x = 100 + s * (b.side + r * 0.6);
      o += circle(x, y, r, p.main, stroke(p.dark, 3));
      o += path('M' + (x + s * r * 0.2) + ' ' + (y - r * 0.2) + ' L' + (x + s * r * 1.1) + ' ' + (y - r * 0.9) + ' L' + (x + s * r * 0.9) + ' ' + (y + r * 0.1) + ' Z', p.light, stroke(p.dark, 2));
    });
    return o;
  }

  function pattern(kind, b, p, clipId) {
    if (!kind) return '';
    var o = '<g clip-path="url(#' + clipId + ')" opacity="0.55">', i;
    if (kind === 'spots') for (i = 0; i < 7; i++) o += circle(60 + (i * 37) % 90, 100 + (i * 23) % 60, 5 + (i % 3) * 2, p.dark);
    if (kind === 'stripes') for (i = 0; i < 4; i++) o += path('M' + (52 + i * 28) + ' 60 l10 0 l-14 120 l-10 0 Z', p.dark);
    if (kind === 'gems') for (i = 0; i < 5; i++) { var gx = 64 + (i * 31) % 80, gy = 110 + (i * 19) % 50; o += path('M' + gx + ' ' + (gy - 8) + ' l7 8 l-7 8 l-7 -8 Z', p.accent); }
    if (kind === 'swirl') o += path('M100 130 m-30 0 a30 30 0 1 1 30 30 a20 20 0 1 1 -20 -20 a10 10 0 1 1 10 10', 'none', stroke(p.light, 4));
    return o + '</g>';
  }

  function eyes(kind, b, p) {
    var y = b.eyeY, cx = b.eyeX || 100, dx = b.eyeDX, o = '';
    if (b.stalks) {
      [-1, 1].forEach(function (s) { o += path('M' + (cx + s * dx) + ' ' + (y + 22) + ' L' + (cx + s * dx) + ' ' + (y + 4), 'none', stroke(p.dark, 4)); });
    }
    [-1, 1].forEach(function (s) {
      var x = cx + s * dx;
      if (kind === 'big') o += circle(x, y, 9, '#fff', stroke('#1c1c28', 2)) + circle(x + 1, y + 1, 5, '#1c1c28') + circle(x + 3, y - 2, 2, '#fff');
      if (kind === 'sharp') o += path('M' + (x - 9) + ' ' + y + ' Q' + x + ' ' + (y - 9) + ' ' + (x + 9) + ' ' + (y + s * 2) + ' Q' + x + ' ' + (y + 6) + ' ' + (x - 9) + ' ' + y + ' Z', '#fff', stroke('#1c1c28', 2)) + circle(x, y, 3.5, '#1c1c28');
      if (kind === 'sleepy') o += path('M' + (x - 8) + ' ' + y + ' Q' + x + ' ' + (y + 6) + ' ' + (x + 8) + ' ' + y, 'none', stroke('#1c1c28', 3));
      if (kind === 'glow') o += '<ellipse cx="' + x + '" cy="' + y + '" rx="7" ry="9" fill="' + p.accent + '" filter="url(#glow)"/>' + '<ellipse cx="' + x + '" cy="' + y + '" rx="2" ry="6" fill="#1c1c28"/>';
    });
    // 입
    o += path('M' + (cx - 6) + ' ' + (y + 15) + ' Q' + cx + ' ' + (y + 20) + ' ' + (cx + 6) + ' ' + (y + 15), 'none', stroke('#1c1c28', 2.5));
    return o;
  }

  function aura(n, p) {
    if (!n) return '';
    var o = '';
    for (var i = n; i >= 1; i--) o += circle(100, 120, 60 + i * 12, p.accent, ' opacity="' + (0.08 + 0.04 * (n - i)) + '"');
    return o;
  }

  function sparkles() {
    var o = '', pts = [[34, 52], [166, 70], [150, 30], [44, 150]];
    pts.forEach(function (q, i) {
      var r = 7 - i;
      o += path('M' + q[0] + ' ' + (q[1] - r) + ' L' + (q[0] + r * 0.3) + ' ' + (q[1] - r * 0.3) + ' L' + (q[0] + r) + ' ' + q[1] + ' L' + (q[0] + r * 0.3) + ' ' + (q[1] + r * 0.3) + ' L' + q[0] + ' ' + (q[1] + r) + ' L' + (q[0] - r * 0.3) + ' ' + (q[1] + r * 0.3) + ' L' + (q[0] - r) + ' ' + q[1] + ' L' + (q[0] - r * 0.3) + ' ' + (q[1] - r * 0.3) + ' Z', '#fff7c2');
    });
    return o;
  }

  ML.art = {
    svg: function (speciesId, opts) {
      opts = opts || {};
      var sp = ML.species[speciesId], a = sp.art, b = BODIES[a.body] || BODIES.round;
      var p = palette(sp.els, opts.shiny);
      var scale = sp.stage ? STAGE_SCALE[sp.stage] : (RARITY_SCALE[sp.rarity] || 1);
      var clipId = 'mlc' + (uid++);
      var tf = 'translate(100 172) scale(' + scale + ') translate(-100 -172)';
      if (opts.flip) tf = 'translate(200 0) scale(-1 1) ' + tf;
      var g = '';
      g += aura(a.aura, p);
      g += wings(a.wings, b, p);
      g += tail(a.tail, b, p);
      g += path(b.d, p.main, stroke(p.dark, 3.5));
      if (b.shell) g += circle(118, 130, 30, p.second.light, stroke(p.dark, 3)) + path('M118 130 m-18 0 a18 18 0 1 1 18 18 a11 11 0 1 1 -11 -11 a5 5 0 1 1 5 5', 'none', stroke(p.dark, 3));
      g += '<clipPath id="' + clipId + '"><path d="' + b.d + '"/></clipPath>';
      g += '<ellipse cx="' + (b.eyeX || 100) + '" cy="' + (b.eyeY + 40) + '" rx="' + (b.side * 0.55) + '" ry="22" fill="' + p.light + '" opacity="0.5" clip-path="url(#' + clipId + ')"/>';
      g += pattern(a.pattern, b, p, clipId);
      g += ears(a.ears, b, p);
      g += horns(a.horns, b, p, sp.stage);
      g += claws(a.claws, b, p);
      g += eyes(a.eyes || 'big', b, p);
      var size = opts.size || 120;
      return '<svg class="mon-svg" viewBox="0 0 200 200" width="' + size + '" height="' + size + '" xmlns="http://www.w3.org/2000/svg">' +
        '<defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>' +
        '<ellipse cx="100" cy="176" rx="' + (56 * scale) + '" ry="8" fill="#000" opacity="0.25"/>' +
        '<g transform="' + tf + '">' + g + '</g>' + (opts.shiny ? sparkles() : '') + '</svg>';
    },
  };
})();
