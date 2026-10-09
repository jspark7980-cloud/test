// 이벤트. 맵의 ❓ 노드에서 무작위로 하나.
//  options[].effects 종류 (js/run.js 의 EVENT_EFFECTS):
//   gold(value) 골드 증감 · wanted(value) 수배도 증감 · heal(value) 아군 전원 회복
//   hurt(value) 도둑 체력 감소 · card(rarity?) 카드 보상 화면 · upgrade 무작위 카드 1장 강화
//   companionHurt(value) 동료 전원 체력 감소
//  requires: { gold } 처럼 조건을 걸 수 있다.
// H단계에서 6종으로 늘리고 유물 보상을 추가한다.
window.DT = window.DT || {};
DT.data = DT.data || {};

DT.data.events = {
  shrine: {
    title: '버려진 성소', icon: '⛪', dimensions: ['medieval'],
    text: '무너진 성소 안, 촛불이 아직 꺼지지 않았다. 헌금함은 묵직해 보인다.',
    options: [
      { label: '기도한다', desc: '아군 전원 체력 10 회복', effects: [{ type: 'heal', value: 10 }] },
      { label: '헌금함을 턴다', desc: '골드 +45, 수배도 +1', effects: [{ type: 'gold', value: 45 }, { type: 'wanted', value: 1 }] },
      { label: '그냥 지나간다', desc: '아무 일도 없다', effects: [] },
    ],
  },
  ambush_cart: {
    title: '전복된 마차', icon: '🛒', dimensions: ['medieval'],
    text: '길가에 상인 마차가 뒤집혀 있다. 짐칸에서 반짝이는 무언가가 보인다… 근처에 경비병 발소리도.',
    options: [
      { label: '재빨리 뒤진다', desc: '카드 1장 획득, 도둑 체력 -6', effects: [{ type: 'hurt', value: 6 }, { type: 'card' }] },
      { label: '경비병인 척한다', desc: '골드 +25', effects: [{ type: 'gold', value: 25 }] },
    ],
  },
  smith: {
    title: '떠돌이 대장장이', icon: '⚒️', dimensions: ['medieval'],
    text: '"돈만 내면 뭐든 손봐 주지." 모루 위에서 불꽃이 튄다.',
    options: [
      { label: '돈을 낸다', desc: '골드 -35, 무작위 카드 1장 강화', requires: { gold: 35 },
        effects: [{ type: 'gold', value: -35 }, { type: 'upgrade' }] },
      { label: '동료에게 일을 시킨다', desc: '무작위 카드 1장 강화, 동료 전원 체력 -5',
        effects: [{ type: 'companionHurt', value: 5 }, { type: 'upgrade' }] },
      { label: '떠난다', desc: '아무 일도 없다', effects: [] },
    ],
  },
};
