// 플레이어 기본 수치와 시작 덱.
window.DT = window.DT || {};
DT.data = DT.data || {};

DT.data.player = {
  name: '차원 도둑', icon: '🦹', hp: 60, energy: 3, draw: 5, maxHand: 10,
  starterDeck: [
    'stab', 'stab', 'stab', 'stab',
    'dodge', 'dodge', 'dodge', 'dodge',
    'pilfer', 'pilfer',
  ],
};
