// 시작 동료. 판을 시작할 때 이 중 1명을 고른다(로비 해금은 D단계).
//  role: 'tank' | 'healer' | 'dealer'  → js/ai.js 의 역할별 행동
//  row: 시작 줄, basicAttack: 지휘 카드(표적 지정·협공)로 공격할 때 피해
//  deck: 전용 덱(5~6장). 매 턴 손패 2장 중 1장을 역할에 맞게 골라 사용
window.DT = window.DT || {};
DT.data = DT.data || {};

DT.data.companions = {
  shieldbearer: {
    name: '방패잡이', icon: '🛡️', role: 'tank', hp: 34, row: 'front', basicAttack: 4, origin: 'thief',
    desc: '위험한 아군이 있으면 도발하거나 막아 준다.',
    deck: ['cp_guard', 'cp_guard', 'cp_taunt', 'cp_taunt', 'cp_bash', 'cp_bash'],
  },
  herbalist: {
    name: '약초사', icon: '🌿', role: 'healer', hp: 24, row: 'back', basicAttack: 3, origin: 'thief',
    desc: '체력이 절반 이하인 아군을 치료하고, 아니면 힘을 북돋운다.',
    deck: ['cp_mend', 'cp_mend', 'cp_tonic', 'cp_charm', 'cp_dart'],
  },
  sellsword: {
    name: '용병', icon: '🪓', role: 'dealer', hp: 28, row: 'front', basicAttack: 5, origin: 'thief',
    desc: '처치할 수 있는 적부터 노린다. 강탈 대기 중인 적은 건드리지 않는다.',
    deck: ['cp_cleave', 'cp_cleave', 'cp_lunge', 'cp_lunge', 'cp_parry'],
  },
};
