// 이벤트. 맵의 ❓ 노드에서 무작위로 하나.
//  dimensions: 나오는 차원(없으면 모든 차원)
//  options[].effects 종류 (js/run.js 의 EVENT_EFFECTS):
//   gold(value) 골드 증감 · goldPerWanted(value) 수배도 × value 골드 · wanted(value) 수배도 증감
//   heal(value) 아군 전원 회복 · hurt(value) 도둑 체력 감소 · companionHurt(value) 동료 전원 체력 감소
//   maxHp(value) 도둑 최대 체력 · card(rarity?) 카드 보상 화면 · upgrade 무작위 카드 1장 강화
//   relic(grades?) 유물 1개 · chance(p, win[], lose[], winText, loseText) 확률로 갈리는 결과
//  requires: { gold, wanted } 처럼 조건을 걸 수 있다.
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

  // ── H단계 추가: 모든 차원 ──
  gambler: {
    title: '수상한 도박꾼', icon: '🎲',
    text: '두건 쓴 사내가 컵 세 개를 굴린다. "맞히면 내 보물을 주지. 어디서 났는지는 묻지 말고."',
    options: [
      { label: '골드 30을 건다', desc: '50% 확률로 유물 1개', requires: { gold: 30 },
        effects: [{ type: 'gold', value: -30 }, { type: 'chance', p: 0.5, winText: '맞혔다! 사내가 마지못해 보물을 내민다.',
          loseText: '빈 컵이다. 사내가 씩 웃는다.', win: [{ type: 'relic' }], lose: [] }] },
      { label: '도박꾼의 주머니를 턴다', desc: '골드 +40, 수배도 +2', effects: [{ type: 'gold', value: 40 }, { type: 'wanted', value: 2 }] },
      { label: '지나간다', desc: '아무 일도 없다', effects: [] },
    ],
  },
  bounty_board: {
    title: '현상금 게시판', icon: '📋',
    text: '광장 게시판에 낯익은 얼굴이 붙어 있다. 바로 당신이다. 생각보다 잘 그렸다.',
    options: [
      { label: '수배서를 뜯어낸다', desc: '수배도 −2', requires: { wanted: 1 }, effects: [{ type: 'wanted', value: -2 }] },
      { label: '현상금 사냥꾼에게 정보를 판다', desc: '수배도 × 10 골드, 수배도 +1', requires: { wanted: 1 },
        effects: [{ type: 'goldPerWanted', value: 10 }, { type: 'wanted', value: 1 }] },
      { label: '자기 그림에 사인을 남긴다', desc: '도둑 최대 체력 +4, 수배도 +1', effects: [{ type: 'maxHp', value: 4 }, { type: 'wanted', value: 1 }] },
    ],
  },
  vault: {
    title: '잠든 경비대의 보물고', icon: '🏛️',
    text: '보초가 창에 기대 코를 곤다. 그 뒤로 열린 보물고 문틈에서 빛이 새어 나온다.',
    options: [
      { label: '안쪽 보물 상자를 연다', desc: '유물 1개, 도둑 체력 −10, 수배도 +2',
        effects: [{ type: 'hurt', value: 10 }, { type: 'wanted', value: 2 }, { type: 'relic' }] },
      { label: '문가의 금화만 챙긴다', desc: '골드 +30', effects: [{ type: 'gold', value: 30 }] },
      { label: '보초의 주머니를 슬쩍한다', desc: '60% 확률로 골드 +50, 실패하면 도둑 체력 −6',
        effects: [{ type: 'chance', p: 0.6, winText: '보초는 깨지 않았다.', loseText: '보초가 눈을 떴다! 한 대 맞고 도망쳤다.',
          win: [{ type: 'gold', value: 50 }], lose: [{ type: 'hurt', value: 6 }] }] },
    ],
  },
};
