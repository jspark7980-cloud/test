// 적 정의. deck 은 data/cards.js 의 카드 id 목록.
//  handSize: 손패 수, reveal: 플레이어에게 공개되는 장수, actions: [최소, 최대] 턴당 사용 장수
window.DT = window.DT || {};
DT.data = DT.data || {};

DT.data.enemies = {
  knight: {
    name: '중세 기사', icon: '🛡️', origin: 'medieval', hp: 50,
    handSize: 3, reveal: 2, actions: [1, 2],
    deck: ['kn_slash', 'kn_slash', 'kn_shield', 'kn_shield', 'kn_charge',
           'kn_bash', 'kn_rally', 'kn_bandage', 'kn_smite'],
  },
};
