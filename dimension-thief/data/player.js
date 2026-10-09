// 플레이어 이름·시작 덱. 수치(체력·에너지 등)는 data/config.js.
window.DT = window.DT || {};
DT.data = DT.data || {};

DT.data.player = {
  name: '차원 도둑', icon: '🦹',
  starterDeck: [
    'stab', 'stab', 'stab', 'stab',
    'dodge', 'dodge', 'dodge', 'dodge',
    'pilfer', 'pilfer',
  ],
};
