// 적 정의. deck 은 data/cards.js 의 카드 id 목록.
//  handSize: 손패 수, reveal: 플레이어에게 공개되는 장수, actions: [최소, 최대] 턴당 사용 장수
window.DT = window.DT || {};
DT.data = DT.data || {};

DT.data.enemies = {
  knight: {
    name: '중세 기사', icon: '🛡️', origin: 'medieval', hp: 32,
    handSize: 3, reveal: 2, actions: [1, 2],
    deck: ['kn_slash', 'kn_slash', 'kn_shield', 'kn_shield', 'kn_charge',
           'kn_bash', 'kn_rally', 'kn_bandage', 'kn_smite'],
  },
  archer: {
    name: '석궁병', icon: '🏹', origin: 'medieval', hp: 18,
    handSize: 3, reveal: 2, actions: [1, 1],
    deck: ['ar_bolt', 'ar_bolt', 'ar_bolt', 'ar_poison', 'ar_poison', 'ar_aim', 'ar_cover', 'ar_cover'],
  },
  monk: {
    name: '수도사', icon: '📿', origin: 'medieval', hp: 17,
    handSize: 3, reveal: 2, actions: [1, 1],
    deck: ['mk_staff', 'mk_staff', 'mk_staff', 'mk_prayer', 'mk_prayer', 'mk_curse', 'mk_curse', 'mk_bless'],
  },
  squire: {
    name: '종자', icon: '🪖', origin: 'medieval', hp: 14,
    handSize: 3, reveal: 2, actions: [1, 1],
    deck: ['sq_poke', 'sq_poke', 'sq_poke', 'sq_guard', 'sq_guard', 'sq_taunt'],
  },
};
