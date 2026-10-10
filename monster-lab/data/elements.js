// 속성 6종 순환 상성: 물결 > 불꽃 > 잎새 > 바위 > 번개 > 그림자 > 물결
var ML = window.ML = window.ML || {};

ML.elements = {
  order: ['water', 'fire', 'leaf', 'rock', 'thunder', 'shadow'],
  // beats[a] = a가 이기는 속성
  beats: { water: 'fire', fire: 'leaf', leaf: 'rock', rock: 'thunder', thunder: 'shadow', shadow: 'water' },
  info: {
    water:   { name: '물결',   icon: '🌊', main: '#3d8bff', light: '#9cc6ff', dark: '#1d4f9e', accent: '#e8f4ff', shiny: ['#2fd6c4', '#a6fff3', '#13786e', '#fff6d8'] },
    fire:    { name: '불꽃',   icon: '🔥', main: '#ff6a3d', light: '#ffb08f', dark: '#a8321a', accent: '#ffe066', shiny: ['#d94fd0', '#f7a6f0', '#7a1f74', '#ffe066'] },
    leaf:    { name: '잎새',   icon: '🍃', main: '#4cc35a', light: '#a8eba9', dark: '#23702c', accent: '#ffd8ef', shiny: ['#e3c642', '#fff0a3', '#86701a', '#ff9bd0'] },
    rock:    { name: '바위',   icon: '🪨', main: '#b08a5b', light: '#e3cba6', dark: '#6b4f2c', accent: '#7fd9ff', shiny: ['#8c97ad', '#d6dceb', '#4a5266', '#ff8fb0'] },
    thunder: { name: '번개',   icon: '⚡', main: '#ffd23d', light: '#fff0a0', dark: '#b08900', accent: '#5fe0ff', shiny: ['#ff8a3d', '#ffd0a6', '#a8460a', '#7dffb0'] },
    shadow:  { name: '그림자', icon: '🌑', main: '#8a5cf0', light: '#c6adff', dark: '#45268f', accent: '#ff5c8a', shiny: ['#3a3f52', '#8a90a8', '#15171f', '#5cffd6'] },
    origin:  { name: '근원',   icon: '✴️', main: '#e8e8f0', light: '#ffffff', dark: '#8c8ca0', accent: '#ff7ad9', shiny: ['#ffd76b', '#fff4c9', '#a38320', '#7ad9ff'] },
  },
};

// 공격 속성 → 방어 몬스터(속성 배열) 배율. 두 속성이면 곱한다. 근원은 상성 없음.
ML.typeMultiplier = function (atkEl, defEls) {
  var c = ML.config, m = 1;
  for (var i = 0; i < defEls.length; i++) {
    var d = defEls[i];
    if (atkEl === 'origin' || d === 'origin') continue;
    if (ML.elements.beats[atkEl] === d) m *= c.typeAdvantage;
    else if (ML.elements.beats[d] === atkEl) m *= c.typeDisadvantage;
  }
  return m;
};
