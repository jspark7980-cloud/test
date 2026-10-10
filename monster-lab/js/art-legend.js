// 전설·숨겨진 몬스터 전용 그림. 부품 조합 대신 종마다 따로 그린다(200×200, 바닥 y≈176).
// 각 함수: (p = 팔레트, id = 그라디언트용 고유 접두사) → SVG 조각
var ML = window.ML = window.ML || {};

(function () {
  function st(c, w) { return ' stroke="' + c + '" stroke-width="' + (w || 2) + '" stroke-linejoin="round" stroke-linecap="round"'; }
  function P(d, fill, extra) { return '<path d="' + d + '" fill="' + fill + '"' + (extra || '') + '/>'; }
  function lin(id, x1, y1, x2, y2, stops) {
    return '<linearGradient id="' + id + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '">' +
      stops.map(function (s) { return '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"' + (s[2] !== undefined ? ' stop-opacity="' + s[2] + '"' : '') + '/>'; }).join('') + '</linearGradient>';
  }
  function rad(id, stops) {
    return '<radialGradient id="' + id + '">' +
      stops.map(function (s) { return '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"' + (s[2] !== undefined ? ' stop-opacity="' + s[2] + '"' : '') + '/>'; }).join('') + '</radialGradient>';
  }
  function mirror(d) { return '<g transform="translate(200 0) scale(-1 1)">' + d + '</g>'; }

  ML.art.custom = {
    // ── 일식룡: 검은 태양을 등진 날개 달린 용. 몸이 낮(불꽃)·밤(그림자)으로 갈라진다.
    eclipsedragon: function (p, id) {
      var day = p, night = p.second, o = '<defs>' +
        rad(id + 'cor', [[0.45, day.accent, 0.9], [0.7, day.main, 0.55], [1, day.main, 0]]) +
        lin(id + 'body', 0, 0, 1, 0, [[0, day.main], [0.48, day.main], [0.52, night.main], [1, night.main]]) +
        lin(id + 'wing', 0, 0, 0, 1, [[0, night.dark], [1, night.main, 0.85]]) +
        lin(id + 'belly', 0, 0, 1, 0, [[0, day.accent], [0.5, day.light], [0.5, night.light], [1, night.accent]]) + '</defs>';
      // 검은 태양과 코로나
      o += '<circle cx="100" cy="48" r="44" fill="url(#' + id + 'cor)"/>';
      for (var i = 0; i < 12; i++) {
        var a = i * 30;
        o += P('M100 8 L104 22 L96 22 Z', day.accent, ' opacity="0.8" transform="rotate(' + a + ' 100 48)"');
      }
      o += '<circle cx="100" cy="48" r="26" fill="#0a0710"' + st(day.light, 2.5) + '/>';
      // 날개 (오른쪽을 그리고 왼쪽은 거울)
      var wing = P('M112 92 L150 40 L196 22 L184 52 L196 70 L176 78 L186 102 L160 98 L150 118 L128 108 Z', 'url(#' + id + 'wing)', st(night.dark, 2.5)) +
        P('M118 96 L152 44 M126 102 L184 54 M134 106 L178 82 M140 110 L160 100', 'none', st(night.accent, 1.5) + ' opacity="0.7"');
      o += wing + mirror(wing);
      // 꼬리: 오른쪽으로 휘어 불꽃으로 끝남
      o += P('M118 150 C150 168 176 170 182 146 C186 132 176 124 168 128', 'none', st(night.dark, 13)) +
        P('M118 150 C150 168 176 170 182 146 C186 132 176 124 168 128', 'none', st(night.main, 9));
      o += P('M168 128 C160 112 170 102 166 88 C178 98 186 104 180 120 C190 116 192 106 190 98 C200 116 192 134 176 136 Z', day.accent, st(day.main, 2));
      // 다리
      o += P('M78 140 L70 172 L60 176 L88 176 L88 150 Z', day.dark, st('#1a0b08', 2)) +
        P('M122 140 L130 172 L140 176 L112 176 L112 150 Z', night.dark, st('#0b0614', 2));
      o += P('M60 176 l4 -6 l4 6 l4 -6 l4 6 M112 176 l4 -6 l4 6 l4 -6 l4 6', 'none', st('#f4ecd8', 2));
      // 몸통
      o += P('M100 74 C122 76 134 96 132 122 C130 146 118 158 100 158 C82 158 70 146 68 122 C66 96 78 76 100 74 Z', 'url(#' + id + 'body)', st('#140a14', 3));
      // 가슴 비늘(V자)
      for (var k = 0; k < 5; k++) o += P('M' + (86 + k) + ' ' + (96 + k * 11) + ' L100 ' + (104 + k * 11) + ' L' + (114 - k) + ' ' + (96 + k * 11), 'none', st('url(#' + id + 'belly)', 4));
      // 목·머리: 정면을 보는 각진 머리
      o += P('M88 82 L84 62 L100 56 L116 62 L112 82 Z', 'url(#' + id + 'body)', st('#140a14', 2.5));
      o += P('M100 52 L120 60 L118 74 L108 84 L100 88 L92 84 L82 74 L80 60 Z', 'url(#' + id + 'body)', st('#140a14', 3));
      // 뿔: 뒤로 길게 휘어 올라감
      o += P('M86 58 C76 46 66 30 52 14 C66 24 80 36 92 52 Z', day.light, st('#140a14', 2)) +
        P('M114 58 C124 46 134 30 148 14 C134 24 120 36 108 52 Z', night.light, st('#140a14', 2));
      // 눈(갈라진 빛)
      o += P('M86 68 L97 72 L88 75 Z', day.accent, ' filter="url(#glow)"') + P('M114 68 L103 72 L112 75 Z', night.accent, ' filter="url(#glow)"');
      // 콧날·입
      o += P('M94 82 L100 86 L106 82', 'none', st('#140a14', 2));
      // 어깨 불꽃·그림자 기운
      o += P('M74 92 C70 82 76 76 74 68 C82 74 86 82 82 92 Z', day.accent, ' opacity="0.9"') +
        P('M126 92 C130 82 124 76 126 68 C118 74 114 82 118 92 Z', night.accent, ' opacity="0.9"');
      return o;
    },

    // ── 폭풍고래: 먹구름을 이고 번개를 두른 거대한 고래. 지느러미가 번개 모양.
    stormwhale: function (p, id) {
      var w = p, t = p.second, o = '<defs>' +
        lin(id + 'body', 0, 0, 0, 1, [[0, w.dark], [0.55, w.main], [1, w.light]]) +
        lin(id + 'cloud', 0, 0, 0, 1, [[0, '#5b6478'], [1, '#2a3040']]) +
        rad(id + 'glow', [[0, t.light, 0.7], [1, t.main, 0]]) + '</defs>';
      // 먹구름
      o += '<g fill="url(#' + id + 'cloud)"' + st('#1c2130', 2) + '><circle cx="58" cy="34" r="20"/><circle cx="86" cy="24" r="24"/><circle cx="118" cy="26" r="22"/><circle cx="146" cy="36" r="18"/><ellipse cx="102" cy="44" rx="62" ry="14"/></g>';
      // 번개(구름 → 아래)
      o += P('M128 50 L118 72 L128 72 L114 98', 'none', st(t.light, 4) + ' filter="url(#glow)"');
      // 빗줄기
      for (var i = 0; i < 9; i++) o += P('M' + (40 + i * 16) + ' ' + (56 + (i % 3) * 6) + ' l-6 16', 'none', st(w.light, 1.6) + ' opacity="0.55"');
      // 꼬리지느러미
      o += P('M160 118 C172 112 178 100 176 80 C186 92 196 92 198 84 C196 100 190 116 170 128 Z', 'url(#' + id + 'body)', st('#0c1830', 2.5));
      // 몸통: 왼쪽을 보는 고래
      o += P('M12 128 C12 96 44 82 84 84 C120 86 150 98 168 118 C150 140 116 162 74 162 C36 162 12 150 12 128 Z', 'url(#' + id + 'body)', st('#0c1830', 3));
      // 배 주름
      for (var k = 0; k < 6; k++) o += P('M' + (24 + k * 14) + ' ' + (144 + (k > 2 ? -2 : 0)) + ' Q' + (60 + k * 12) + ' ' + (150 + k) + ' ' + (96 + k * 10) + ' ' + (148 - k * 2), 'none', st(w.accent, 1.5) + ' opacity="0.6"');
      // 몸을 감는 전기 줄기
      o += P('M30 116 L50 110 L58 118 L80 108 L92 116 L116 106 L128 114 L150 108', 'none', st(t.main, 3) + ' filter="url(#glow)"');
      // 등의 번개 가시
      [[70, 84], [96, 86], [122, 92], [146, 104]].forEach(function (q, j) {
        o += P('M' + (q[0] - 7) + ' ' + (q[1] + 2) + ' L' + (q[0] + 2) + ' ' + (q[1] - 16 - j * 2) + ' L' + (q[0] + 1) + ' ' + (q[1] - 6) + ' L' + (q[0] + 8) + ' ' + (q[1] - 10) + ' L' + (q[0] + 6) + ' ' + (q[1] + 3) + ' Z', t.main, st('#5a4400', 1.5));
      });
      // 이마 뿔(번개)
      o += P('M34 98 L22 70 L32 76 L30 54 L44 86 L36 84 Z', t.light, st('#5a4400', 2) + ' filter="url(#glow)"');
      // 가슴지느러미(번개 모양)
      o += P('M84 148 L76 170 L92 162 L90 182 L108 154 Z', t.main, st('#5a4400', 2));
      // 눈과 입
      o += '<circle cx="40" cy="118" r="6" fill="#0c1830"/>' + P('M37 118 L43 115 L41 119 L45 121', 'none', st(t.light, 1.6) + ' filter="url(#glow)"');
      o += P('M14 132 C34 140 58 140 78 134', 'none', st('#0c1830', 2.5));
      return o;
    },

    // ── 세계수거인: 등에서 거대한 나무가 자라는 바위 거인. 갈라진 틈에서 초록 빛이 샌다.
    worldtree: function (p, id) {
      var lf = p, rk = p.second, o = '<defs>' +
        rad(id + 'leaf', [[0, lf.light], [0.7, lf.main], [1, lf.dark]]) +
        lin(id + 'rock', 0, 0, 0, 1, [[0, rk.light], [1, rk.dark]]) +
        lin(id + 'trunk', 0, 0, 1, 0, [[0, '#4a3220'], [0.5, '#7a5532'], [1, '#4a3220']]) + '</defs>';
      // 나무: 줄기와 거대한 수관
      o += P('M92 84 C90 62 84 52 74 44 M108 84 C110 62 118 50 130 42 M100 84 L100 40', 'none', st('#4a3220', 9));
      o += P('M92 84 L100 40 L108 84 Z', 'url(#' + id + 'trunk)');
      [[100, 30, 30], [64, 40, 24], [136, 38, 24], [82, 18, 20], [120, 16, 20], [44, 56, 16], [156, 54, 16]].forEach(function (c) {
        o += '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + c[2] + '" fill="url(#' + id + 'leaf)"' + st(lf.dark, 2) + '/>';
      });
      for (var i = 0; i < 9; i++) o += '<circle cx="' + (52 + i * 12) + '" cy="' + (26 + (i % 3) * 12) + '" r="2.5" fill="' + lf.accent + '" opacity="0.9"/>';
      // 다리
      o += P('M70 150 L64 176 L94 176 L92 150 Z M130 150 L136 176 L106 176 L108 150 Z', 'url(#' + id + 'rock)', st('#2a1d10', 2.5));
      // 팔(늘어진 바위 팔과 주먹)
      var arm = P('M150 96 L170 118 L172 150 L164 158 L150 152 L148 120 Z', 'url(#' + id + 'rock)', st('#2a1d10', 2.5)) +
        P('M158 150 L180 152 L184 172 L160 174 L152 162 Z', 'url(#' + id + 'rock)', st('#2a1d10', 2.5));
      o += arm + mirror(arm);
      // 몸통(사다리꼴 바위)
      o += P('M62 92 L138 92 L146 128 L130 156 L70 156 L54 128 Z', 'url(#' + id + 'rock)', st('#2a1d10', 3));
      // 어깨 바위와 이끼
      var sh = P('M128 78 L158 82 L166 104 L144 112 L126 100 Z', 'url(#' + id + 'rock)', st('#2a1d10', 2.5)) +
        P('M130 80 C140 74 152 76 160 84 C150 86 140 84 130 88 Z', lf.main) +
        P('M150 80 L156 64 L162 82 Z M140 80 L144 70 L148 80 Z', rk.accent, st('#2a5060', 1.5));
      o += sh + mirror(sh);
      // 빛나는 틈
      o += P('M80 100 L90 116 L84 128 L94 146 M120 98 L112 114 L120 130 L110 148 M100 120 L100 136', 'none', st(lf.accent === '#ffd8ef' ? '#8dff8a' : lf.accent, 2.5) + ' filter="url(#glow)"');
      // 머리: 어깨 사이에 묻힌 각진 돌머리와 빛나는 눈구멍
      o += P('M84 74 L116 74 L120 94 L100 102 L80 94 Z', 'url(#' + id + 'rock)', st('#2a1d10', 2.5));
      o += P('M86 84 L114 84 L112 90 L88 90 Z', '#0e140c');
      o += P('M90 86 L98 86 L98 88 L90 88 Z M102 86 L110 86 L110 88 L102 88 Z', '#9dff8a', ' filter="url(#glow)"');
      // 늘어진 덩굴
      o += P('M66 94 C62 108 70 116 64 130 M136 94 C140 110 132 118 138 134', 'none', st(lf.main, 3));
      return o;
    },

    // ── 태초수: 여섯 속성의 구슬과 빛의 고리를 두른 수정 짐승.
    primordial: function (p, id) {
      var o = '<defs>' +
        lin(id + 'body', 0, 0, 1, 1, [[0, '#ffffff'], [0.4, '#ffd6f4'], [0.7, '#c8f2ff'], [1, '#fff4c9']]) +
        lin(id + 'wing', 0, 0, 1, 0, [[0, p.light, 0.1], [1, p.main, 0.75]]) + '</defs>';
      // 빛의 고리
      o += '<ellipse cx="100" cy="96" rx="86" ry="22" fill="none"' + st(p.accent, 1.5) + ' opacity="0.6" transform="rotate(-14 100 96)"/>';
      o += '<circle cx="100" cy="88" r="60" fill="none"' + st('#ffd76b', 2) + ' opacity="0.7" stroke-dasharray="3 6"/>';
      // 여섯 속성 구슬
      ML.elements.order.forEach(function (e, i) {
        var a = (i / 6) * Math.PI * 2 - Math.PI / 2, x = 100 + Math.cos(a) * 82, y = 92 + Math.sin(a) * 70;
        o += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="7" fill="' + ML.elements.info[e].main + '" filter="url(#glow)"' + st('#fff', 1.5) + '/>';
      });
      // 빛의 날개 3쌍
      var wings = '';
      [[-30, 74], [-6, 64], [18, 52]].forEach(function (w) {
        wings += P('M112 ' + (96 + w[0] / 3) + ' L' + (112 + w[1]) + ' ' + (60 + w[0]) + ' L' + (106 + w[1] * 0.7) + ' ' + (88 + w[0] / 2) + ' L' + (112 + w[1] * 0.8) + ' ' + (104 + w[0] / 2) + ' Z', 'url(#' + id + 'wing)', st('#ffffff', 1.2) + ' opacity="0.9"');
      });
      o += wings + mirror(wings);
      // 꼬리 리본
      o += P('M108 150 C140 162 150 140 172 150 C160 156 150 170 124 166 Z', '#ffd6f4', st('#b07ad0', 1.5));
      // 몸통(마름모 수정)
      o += P('M100 70 L126 112 L108 160 L92 160 L74 112 Z', 'url(#' + id + 'body)', st('#a38cc8', 2.5));
      o += P('M100 70 L108 112 L100 160 L92 112 Z', '#ffffff', ' opacity="0.55"');
      // 다리
      o += P('M90 156 L84 176 L96 176 L98 158 Z M110 156 L116 176 L104 176 L102 158 Z', 'url(#' + id + 'body)', st('#a38cc8', 2));
      // 목·머리
      o += P('M94 76 L100 50 L106 76 Z', 'url(#' + id + 'body)', st('#a38cc8', 2));
      o += P('M100 30 L116 44 L110 58 L100 62 L90 58 L84 44 Z', 'url(#' + id + 'body)', st('#a38cc8', 2.5));
      // 뿔·왕관
      o += P('M88 40 L80 16 L94 34 Z M112 40 L120 16 L106 34 Z M100 32 L100 8 L104 28 Z', '#ffd76b', st('#a38320', 1.5));
      // 눈
      o += P('M89 46 L97 48 L90 51 Z', p.accent, ' filter="url(#glow)"') + P('M111 46 L103 48 L110 51 Z', p.accent, ' filter="url(#glow)"');
      // 가슴 보석
      o += P('M100 96 L106 104 L100 112 L94 104 Z', '#ff7ad9', st('#ffffff', 1.5) + ' filter="url(#glow)"');
      return o;
    },
  };
})();
