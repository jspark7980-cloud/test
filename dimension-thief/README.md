# 차원 도둑

아이패드 Safari(가로)용 1인 로그라이크 덱빌딩. 외부 라이브러리 없음.
`?seed=ABC` 를 붙이면 같은 시드로 같은 판이 나온다.

## 구조
- `data/` 카드·적·상태·차원·플레이어 정의 (데이터만)
- `js/rng.js` 시드 난수 · `state.js` 상태 · `effects.js` 공통 효과 · `cards.js` 카드 조회/설명
- `js/deck.js` 덱/손패/버림 · `enemy.js` 적 AI · `combat.js` 전투 흐름
- `js/save.js` localStorage · `ui.js` 화면 · `main.js` 입력/적 턴 진행

## 새 카드 추가
`data/cards.js` 에 항목 추가:

```js
kn_guard: { name: '수호', type: 'skill', cost: 2, origin: 'medieval',
            effects: [{ type: 'block', value: 12 }, { type: 'draw', value: 1 }] },
```

효과 타입: `damage`(times), `block`, `heal`, `loseHp`, `status`(status), `draw`, `energy`, `steal`.
`to: 'self' | 'opponent'` 로 대상 변경. 상대를 향한 효과가 있으면 자동으로 "적을 탭해 사용" 카드가 된다.
적에게 주려면 `data/enemies.js` 의 `deck` 에 id 추가.
새 효과 타입이 필요할 때만 `js/effects.js` 에 `DT.effects.register(...)`.
