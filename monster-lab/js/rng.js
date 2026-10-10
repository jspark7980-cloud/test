// 시드 기반 난수 (mulberry32)
var ML = window.ML = window.ML || {};

ML.makeRng = function (seed) {
  var s = (typeof seed === 'string' ? ML.hashSeed(seed) : seed) >>> 0;
  var rng = function () {
    s = (s + 0x6D2B79F5) >>> 0;
    var t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.int = function (a, b) { return a + Math.floor(rng() * (b - a + 1)); };     // a~b 포함
  rng.range = function (a, b) { return a + rng() * (b - a); };
  rng.pick = function (arr) { return arr[Math.floor(rng() * arr.length)]; };
  rng.chance = function (p) { return rng() < p; };
  rng.weighted = function (table) {                                            // {key: weight}
    var total = 0, k;
    for (k in table) total += table[k];
    var r = rng() * total;
    for (k in table) { r -= table[k]; if (r < 0) return k; }
    return k;
  };
  rng.state = function () { return s; };
  return rng;
};

ML.hashSeed = function (str) {
  var h = 2166136261 >>> 0;
  for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
};

ML.randomSeed = function () { return Math.floor(Math.random() * 1e9); };
