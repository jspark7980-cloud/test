// 저장 백업: 저장 데이터를 텍스트 코드(또는 파일)로 내보내고, 붙여 넣어 되살린다.
// 다른 기기·다른 브라우저(사파리 ↔ 홈 화면 앱)로 옮길 때도 쓴다.
var ML = window.ML = window.ML || {};

(function () {
  var ui = ML.ui, PREFIX = 'MLSAVE1:';

  function encode(data) { return PREFIX + btoa(unescape(encodeURIComponent(JSON.stringify(data)))); }
  function decode(text) {
    var t = (text || '').replace(/\s+/g, '');
    if (t.indexOf(PREFIX) === 0) t = t.slice(PREFIX.length);
    var data = JSON.parse(decodeURIComponent(escape(atob(t))));
    if (!data || !data.game || !data.game.party || !data.game.party.length) throw new Error('bad');
    return data;
  }
  function summary(g) {
    var top = g.party.concat(g.box).reduce(function (a, m) { return m.level > a ? m.level : a; }, 0);
    return '파티 ' + g.party.length + ' · 보관 ' + g.box.length + '마리 · 최고 Lv ' + top + ' · 💰 ' + g.gold + ' · 잡은 종 ' + Object.keys(g.dex.caught || {}).length;
  }

  function open() {
    var saved = ML.save.load(), has = saved && saved.game && ML.game;
    if (has) ML.state.save();
    saved = ML.save.load();
    var code = has ? encode(saved) : '';
    var md = ui.modal('<h3>💾 저장 백업</h3>' +
      (has ? '<div class="section-t">내보내기</div><p class="muted small">지금 진행: ' + summary(saved.game) + '<br>아래 코드를 복사해 메모 앱 등에 보관하거나 파일로 저장해 둔다. 이 코드를 붙여 넣으면 지금 상태로 되돌릴 수 있다.</p>' +
        '<textarea id="bk-out" readonly rows="4" style="width:100%;font-size:12px;word-break:break-all">' + code + '</textarea>' +
        '<div class="row" style="margin:6px 0 12px"><button class="btn primary" id="bk-copy">📋 코드 복사</button><button class="btn" id="bk-file">📄 파일로 저장</button></div>' : '') +
      '<div class="section-t">불러오기</div><p class="muted small">백업 코드를 붙여 넣거나 백업 파일을 고른다. <b>지금 진행은 백업 내용으로 바뀐다.</b></p>' +
      '<textarea id="bk-in" rows="4" style="width:100%;font-size:12px" placeholder="MLSAVE1:로 시작하는 코드"></textarea>' +
      '<div class="row" style="margin-top:6px"><label class="btn">📂 파일 고르기<input type="file" id="bk-pick" accept=".txt,text/plain" style="display:none"></label><button class="btn danger" id="bk-load">불러오기</button><button class="btn" data-close>닫기</button></div>');
    if (has) {
      md.querySelector('#bk-copy').onclick = function () {
        var ta = md.querySelector('#bk-out');
        var done = function () { ui.toast('백업 코드를 복사했다!'); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(done, function () { ta.select(); document.execCommand('copy'); done(); });
        else { ta.select(); document.execCommand('copy'); done(); }
      };
      md.querySelector('#bk-file').onclick = function () {
        var d = new Date(), name = 'monster-lab-save-' + d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2) + '.txt';
        var a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([code], { type: 'text/plain' }));
        a.download = name; document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      };
    }
    md.querySelector('#bk-pick').onchange = function () {
      var f = this.files && this.files[0];
      if (!f) return;
      var rd = new FileReader();
      rd.onload = function () { md.querySelector('#bk-in').value = rd.result; };
      rd.readAsText(f);
    };
    md.querySelector('#bk-load').onclick = function () {
      var data;
      try { data = decode(md.querySelector('#bk-in').value); } catch (e) { ui.toast('코드가 올바르지 않다. 전부 복사했는지 확인해 줘.'); return; }
      var cm = ui.modal('<h3>이 백업으로 바꿀까?</h3><p>' + summary(data.game) + '</p><p class="muted small">지금 진행은 사라진다(필요하면 먼저 내보내기).</p>' +
        '<div class="row" style="justify-content:flex-end"><button class="btn" data-close>그만두기</button><button class="btn danger" id="bk-ok">바꾸기</button></div>');
      cm.querySelector('#bk-ok').onclick = function () {
        if (!ML.save.write(data)) { ui.toast('저장에 실패했다.'); return; }
        location.reload();
      };
    };
  }

  ML.backup = { open: open, encode: encode, decode: decode };
})();
