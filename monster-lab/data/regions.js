// 지역·장소·출현표·트레이너. 좌표는 지도 SVG(1000×560) 기준.
// place.kind: gate(출입구) / search(탐색) / boss
// wild: [종, 가중치, 최저 레벨, 최고 레벨] · rare: 낮은 확률 희귀종
var ML = window.ML = window.ML || {};

ML.regions = {
  1: {
    name: '햇살 들판', color: '#7fcf6a', bg: ['#1d3a24', '#132418'],
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
  2: { name: '천둥 해안', locked: '4단계에서 열립니다' },
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
};
