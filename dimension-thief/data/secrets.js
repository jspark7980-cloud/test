// 숨겨진 콘텐츠(v4 4단계). 발견하기 전에는 도감의 '비밀' 칸에 ??? 로만 보인다.
//  id 는 meta.secrets 의 키(발견 이벤트 type: 'secret' 의 id). hint 는 발견 뒤 공개되는 조건
window.DT = window.DT || {};
DT.data = DT.data || {};

DT.data.secrets = {
  vault:     { name: '황금 금고', icon: '💰', hint: '4층 이상에서 아주 드물게 전투·이벤트 자리에 나타난다. 정예급 경비, 골드 ×3·장비 2개·유물·저주 장비' },
  void:      { name: '차원의 틈', icon: '🕳️', hint: '중세·사이버·심해·지옥 출신 카드를 각 1장 이상 가진 채 마왕을 쓰러뜨리면 열린다' },
  proto:     { name: '원조 도둑', icon: '🎭', hint: '차원의 틈 끝에서 기다린다. 내 덱을 그대로 복사해 싸운다' },
  timeThief: { name: '시간의 도둑', icon: '⏳', hint: '원조 도둑을 쓰러뜨리면 동료가 된다(뽑기로는 얻을 수 없음)' },
  'item:blood_dagger':  { name: '피의 단검', icon: '🩸', hint: '저주 장비. 정예·황금 금고에서 드물게' },
  'item:greed_bag':     { name: '탐욕의 가방', icon: '💼', hint: '저주 장비. 정예·황금 금고에서 드물게' },
  'item:madness_crown': { name: '광기의 왕관', icon: '🤪', hint: '저주 장비. 정예·황금 금고에서 드물게' },
  'item:cursed_mirror': { name: '저주받은 거울', icon: '🪞', hint: '저주 장비. 정예·황금 금고에서 드물게' },
};
