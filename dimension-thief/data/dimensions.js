// 차원 정의: 카드 출신(origin) 값이자 배경 테마.
// neutral: true 인 차원은 차원 불안정 계산에서 제외된다(도둑 본래 카드).
window.DT = window.DT || {};
DT.data = DT.data || {};

DT.data.dimensions = {
  thief:    { name: '도둑 소굴',  neutral: true, color: '#b48cff', bg: '#15131c', bg2: '#251f36' },
  medieval: { name: '중세 왕국',  order: 1, next: 'cyber',      color: '#e0ac3e', bg: '#1b150e', bg2: '#33261a' },
  cyber:    { name: '사이버 도시', order: 2, next: 'abyss',      color: '#2fe3ff', bg: '#0a1120', bg2: '#16233f' },
  abyss:    { name: '심해 왕국',  order: 3, next: 'hell',      color: '#3fd0a8', bg: '#05161a', bg2: '#0c2c33' },
  hell:     { name: '지옥',      order: 4,      color: '#ff5a3c', bg: '#1c0806', bg2: '#3a120c' },
  // 비밀 차원(v4 4단계): 4개 차원이 뒤섞인 틈. 층 수는 config.void.floors, 차원 불안정 없음(chaos)
  void:     { name: '차원의 틈',  order: 5, secret: true, chaos: true, color: '#d8d8ff', bg: '#09090f', bg2: '#1d1d33' },
};
