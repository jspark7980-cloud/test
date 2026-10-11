// 아주 작은 deflate(raw) 해제기 — 브라우저 내장 압축 해제가 없거나 실패해도 백업 코드를 풀 수 있게(RFC 1951)
var ML = window.ML = window.ML || {};

ML.inflateRaw = (function () {
  var LBASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
  var LEXT = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
  var DBASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
  var DEXT = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
  var CLORD = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

  // 코드 길이 → { counts[길이], symbols[] } (정규 허프만)
  function build(lengths, n) {
    var counts = new Uint16Array(16), offs = new Uint16Array(16), syms = new Uint16Array(n), i;
    for (i = 0; i < n; i++) counts[lengths[i]]++;
    counts[0] = 0;
    for (i = 1; i < 16; i++) offs[i] = offs[i - 1] + counts[i - 1];
    for (i = 0; i < n; i++) if (lengths[i]) syms[offs[lengths[i]]++] = i;
    return { counts: counts, syms: syms };
  }

  return function (src) {
    var pos = 0, bit = 0, out = new Uint8Array(src.length * 6 + 1024), op = 0;
    function need(n) { if (op + n > out.length) { var o = new Uint8Array(Math.max(out.length * 2, op + n)); o.set(out); out = o; } }
    function bits(n) {
      var v = 0;
      for (var i = 0; i < n; i++) {
        if (pos >= src.length) throw new Error('inflate: 데이터가 끝났다');
        v |= ((src[pos] >> bit) & 1) << i;
        if (++bit === 8) { bit = 0; pos++; }
      }
      return v;
    }
    function decode(h) {
      var code = 0, first = 0, index = 0;
      for (var len = 1; len < 16; len++) {
        code |= bits(1);
        var c = h.counts[len];
        if (code - c < first) return h.syms[index + (code - first)];
        index += c; first += c; first <<= 1; code <<= 1;
      }
      throw new Error('inflate: 잘못된 코드');
    }
    var fixedL, fixedD;
    function fixed() {
      if (!fixedL) {
        var l = new Uint8Array(288), i;
        for (i = 0; i < 144; i++) l[i] = 8; for (; i < 256; i++) l[i] = 9; for (; i < 280; i++) l[i] = 7; for (; i < 288; i++) l[i] = 8;
        fixedL = build(l, 288);
        var d = new Uint8Array(30); for (i = 0; i < 30; i++) d[i] = 5;
        fixedD = build(d, 30);
      }
      return [fixedL, fixedD];
    }
    function dynamic() {
      var hlit = bits(5) + 257, hdist = bits(5) + 1, hclen = bits(4) + 4, i;
      var cl = new Uint8Array(19);
      for (i = 0; i < hclen; i++) cl[CLORD[i]] = bits(3);
      var ch = build(cl, 19), lens = new Uint8Array(hlit + hdist);
      for (i = 0; i < hlit + hdist;) {
        var sym = decode(ch);
        if (sym < 16) lens[i++] = sym;
        else {
          var rep = 0, val = 0;
          if (sym === 16) { if (!i) throw new Error('inflate: 반복 오류'); val = lens[i - 1]; rep = 3 + bits(2); }
          else if (sym === 17) rep = 3 + bits(3);
          else rep = 11 + bits(7);
          while (rep--) lens[i++] = val;
        }
      }
      return [build(lens.subarray(0, hlit), hlit), build(lens.subarray(hlit), hdist)];
    }
    var last;
    do {
      last = bits(1);
      var type = bits(2);
      if (type === 0) {
        if (bit) { bit = 0; pos++; }
        var len = src[pos] | (src[pos + 1] << 8); pos += 4;
        need(len); out.set(src.subarray(pos, pos + len), op); op += len; pos += len;
      } else if (type === 1 || type === 2) {
        var t = type === 1 ? fixed() : dynamic(), lt = t[0], dt = t[1];
        for (;;) {
          var s = decode(lt);
          if (s < 256) { need(1); out[op++] = s; }
          else if (s === 256) break;
          else {
            s -= 257;
            var L = LBASE[s] + bits(LEXT[s]), ds = decode(dt), D = DBASE[ds] + bits(DEXT[ds]);
            if (D > op) throw new Error('inflate: 거리 오류');
            need(L);
            for (var k = 0; k < L; k++, op++) out[op] = out[op - D];
          }
        }
      } else throw new Error('inflate: 블록 형식 오류');
    } while (!last);
    return out.subarray(0, op);
  };
})();
