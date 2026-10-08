# 차원 도둑

아이패드 Safari(가로)용 1인 로그라이크 덱빌딩. 외부 라이브러리 없음.
`?seed=ABC` 를 붙이면 같은 시드로 같은 판이 나온다.

## 진행 상황
- 1단계: 전투 기본(드로우·에너지·방어도·적 손패 공개·슬쩍하기·승패)
- 2단계: 상태 효과 4종을 쓰는 카드·적, 여러 적 동시 전투, 강탈, 복제, 전투 후 카드 보상
- 3단계 예정: 맵(갈림길), 노드 종류, 차원 불안정·귀화

## 구조
- `data/` 카드·적·전투 구성·보상·상태·차원·플레이어 정의 (데이터만)
- `js/rng.js` 시드 난수 · `state.js` 상태 · `effects.js` 공통 효과 · `cards.js` 카드 조회/설명
- `js/deck.js` 덱/손패/버림 · `enemy.js` 적 AI · `combat.js` 전투 흐름
- `js/reward.js` 보상 후보 · `run.js` 전투→강탈→보상→다음 전투
- `js/save.js` localStorage · `ui.js` 화면 · `main.js` 입력/적 턴 진행

## 새 카드 추가
`data/cards.js` 에 항목 추가:

```js
md_guard: { name: '수호', type: 'skill', cost: 2, origin: 'medieval', rarity: 'common',
            effects: [{ type: 'block', value: 12 }, { type: 'draw', value: 1 }] },
```

- 효과 타입: `damage`(times), `block`, `heal`, `loseHp`, `status`(status), `draw`, `energy`, `steal`, `copy`
- `to`: `'self'` | `'opponent'`(적을 탭해 사용) | `'allOpponents'`(모든 적, 대상 선택 없음)
- `rarity` 가 있으면 전투 보상 후보, 없으면 적 전용(슬쩍·강탈로만 획득)
- 적에게 주려면 `data/enemies.js` 의 `deck` 에 id 추가, 전투 구성은 `data/encounters.js`
- 새 효과 타입이 필요할 때만 `js/effects.js` 에 `DT.effects.register(...)`
