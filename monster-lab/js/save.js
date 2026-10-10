// localStorage 자동 저장. 실패해도 게임은 계속된다.
var ML = window.ML = window.ML || {};

ML.save = {
  load: function () {
    try {
      var raw = window.localStorage.getItem(ML.config.saveKey);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },
  write: function (data) {
    try { window.localStorage.setItem(ML.config.saveKey, JSON.stringify(data)); return true; }
    catch (e) { return false; }
  },
  clear: function () {
    try { window.localStorage.removeItem(ML.config.saveKey); } catch (e) { /* 무시 */ }
  },
};
