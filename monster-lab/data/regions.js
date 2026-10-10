// 지역·장소·출현표·트레이너. 좌표는 지도 SVG(1000×560) 기준.
// place.kind: gate(출입구) / search(탐색) / boss
// wild: [종, 가중치, 최저 레벨, 최고 레벨] · rare: 낮은 확률 희귀종
var ML = window.ML = window.ML || {};

ML.regions = {
  1: {
    name: '햇살 들판', need: 0, color: '#7fcf6a', bg: ['#1d3a24', '#132418'],
    desc: '연구소 바로 앞의 너른 들판. 1단계 몬스터들이 산다.',
    start: 'gate',
    places: {
      gate:   { name: '들판 입구', kind: 'gate', x: 110, y: 450, icon: '🚪', desc: '연구소에서 나오면 바로 보이는 풀숲.',
                wild: [['sproutsquirrel', 30, 3, 5], ['zapchick', 25, 3, 5], ['shadecat', 20, 3, 5], ['shroombun', 25, 3, 5]] },
      meadow: { name: '넓은 풀밭', kind: 'search', x: 330, y: 300, icon: '🌾', desc: '키 큰 풀이 바람에 흔들린다.',
                wild: [['emberrat', 25, 5, 8], ['pebblebear', 20, 5, 8], ['shroombun', 15, 5, 8], ['wiresnake', 20, 5, 8], ['zapchick', 20, 5, 8]] },
      brook:  { name: '졸졸 개울', kind: 'search', x: 360, y: 490, icon: '💧', desc: '맑은 물이 흐르는 얕은 개울.', trainer: 'kid',
                wild: [['dropcrab', 30, 5, 8], ['mosstad', 30, 5, 8], ['crystalsnail', 20, 5, 8], ['fogwisp', 20, 5, 8]] },
      flower: { name: '꽃밭', kind: 'search', x: 590, y: 170, icon: '🌼', desc: '온갖 꽃이 핀 언덕 아래. 가끔 반짝이는 날개가 보인다.',
                wild: [['shroombun', 20, 8, 11], ['sproutsquirrel', 20, 8, 11], ['charlizard', 20, 8, 11], ['shadecat', 20, 8, 11], ['fogwisp', 20, 8, 11]],
                rare: ['petalmoth', 9, 11] },
      hill:   { name: '바람 언덕', kind: 'search', x: 640, y: 420, icon: '⛰️', desc: '세찬 바람이 부는 언덕. 들판 지기가 길을 지킨다.', trainer: 'warden',
                wild: [['pebblebear', 20, 9, 12], ['wiresnake', 20, 9, 12], ['charlizard', 15, 9, 12], ['emberrat', 15, 9, 12], ['crystalsnail', 15, 9, 12], ['zapchick', 15, 9, 12]] },
      boss:   { name: '화로 마을 광장', kind: 'boss', x: 870, y: 270, icon: '👑', desc: '불꽃 몬스터를 다루는 화로지기가 기다린다.', trainer: 'boss1' },
    },
    edges: [['gate', 'meadow'], ['gate', 'brook'], ['meadow', 'flower'], ['brook', 'hill'], ['flower', 'hill'], ['hill', 'boss']],
  },
  2: {
    name: '천둥 해안', color: '#6ab4ff', bg: ['#16304a', '#0d1a2a'], need: 1,
    desc: '파도와 번개가 끊이지 않는 해안. 2단계 몬스터가 나타난다.',
    start: 'gate',
    places: {
      gate:  { name: '해안 입구', kind: 'gate', x: 110, y: 430, icon: '🚪', desc: '소금기 섞인 바람이 분다.',
               wild: [['wiresnake', 25, 12, 14], ['dropcrab', 20, 12, 14], ['mosstad', 20, 12, 14], ['zapchick', 20, 12, 14], ['crystalsnail', 15, 12, 14]] },
      sand:  { name: '모래사장', kind: 'search', x: 330, y: 470, icon: '🏖️', desc: '반짝이는 모래 속에 무언가 숨어 있다.',
               wild: [['dropcrab', 20, 13, 16], ['pebblebear', 20, 13, 16], ['zapchick', 20, 13, 16], ['shroombun', 15, 13, 16], ['wavepincer', 25, 16, 17]] },
      bay:   { name: '안개 만', kind: 'search', x: 330, y: 230, icon: '🌫️', desc: '짙은 안개가 낀 잔잔한 만. 낚시꾼이 자리를 지킨다.', trainer: 'fisher',
               wild: [['mosstad', 25, 15, 18], ['fogwisp', 20, 15, 18], ['wavepincer', 25, 16, 18], ['nightcat', 15, 16, 18], ['shadecat', 15, 15, 18]],
               rare: ['mistray', 16, 19] },
      reef:  { name: '번개 암초', kind: 'search', x: 600, y: 420, icon: '⚡', desc: '번개가 자주 떨어지는 바위 암초.',
               wild: [['wiresnake', 20, 17, 20], ['thunderbird', 25, 17, 20], ['boulderbear', 20, 17, 20], ['crystalsnail', 15, 17, 20], ['blazerat', 20, 17, 20]],
               rare: ['sparkjelly', 17, 20] },
      light: { name: '등대 언덕', kind: 'search', x: 640, y: 170, icon: '🗼', desc: '해안을 비추는 낡은 등대. 등대지기가 길을 막는다.', trainer: 'keeper',
               wild: [['thunderbird', 20, 18, 21], ['vinesquirrel', 20, 18, 21], ['blazerat', 20, 18, 21], ['nightcat', 20, 18, 21], ['charlizard', 20, 18, 21]] },
      boss:  { name: '폭풍 부두', kind: 'boss', x: 880, y: 300, icon: '👑', desc: '번개와 파도를 함께 다루는 선장이 기다린다.', trainer: 'boss2' },
    },
    edges: [['gate', 'sand'], ['gate', 'bay'], ['sand', 'reef'], ['bay', 'light'], ['reef', 'light'], ['light', 'boss']],
  },
  3: { name: '안개 고목숲', locked: '5단계에서 열립니다' },
  4: { name: '잿빛 화산령', locked: '5단계에서 열립니다' },
};

// 트레이너. team: [종, 레벨] · potions: 체력 30% 이하일 때 쓰는 고급 회복약 수
ML.trainers = {
  kid:    { name: '꼬마 수집가 하늘', icon: '🧒', line: '내가 잡은 몬스터 구경할래?', lose: '우와, 너 진짜 세다!',
            team: [['mosstad', 6], ['shroombun', 7]], gold: 120 },
  warden: { name: '들판 지기 바람', icon: '🧑‍🌾', line: '이 언덕을 넘으려면 날 이겨야 해.', lose: '좋아, 길을 열어 주지.',
            team: [['pebblebear', 9], ['wiresnake', 9], ['fogwisp', 10]], gold: 260 },
  boss1:  { name: '화로지기 여울', icon: '🔥', boss: true, line: '불꽃은 꺼지지 않아. 각오는 됐지?', lose: '…좋은 불씨를 가졌구나. 다음 길을 열어 주마.',
            team: [['charlizard', 12], ['emberrat', 13], ['candlefae', 14]], potions: 1, gold: 600 },
  fisher: { name: '해변 낚시꾼 물새', icon: '🎣', line: '안개 속에서 낚은 녀석들이야. 만만치 않을걸?', lose: '이런, 오늘은 내가 낚였네.',
            team: [['mosstad', 16], ['wavepincer', 17], ['fogwisp', 17]], gold: 450 },
  keeper: { name: '등대지기 은솔', icon: '🧑‍✈️', line: '등대 불빛 아래에선 도망칠 곳이 없지.', lose: '…지나가도 좋다. 부두에 선장이 있다.',
            team: [['thunderbird', 20], ['boulderbear', 20], ['nightcat', 21]], potions: 1, gold: 700 },
  boss2:  { name: '폭풍 선장 해랑', icon: '⚓', boss: true, line: '번개와 파도, 둘 다 감당할 수 있겠어?', lose: '하하! 폭풍을 뚫었구나. 다음 바다로 가라!',
            team: [['bogfrog', 23], ['voltsnake', 23], ['thunderbird', 24]], potions: 2, gold: 1300 },
};
