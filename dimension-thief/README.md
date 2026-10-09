# 차원 도둑

아이패드 Safari(가로)용 1인 로그라이크 덱빌딩. 외부 라이브러리 없음.
`?seed=ABC` 를 붙이면 같은 시드로 같은 판이 나온다.

## 진행 상황
- 1단계: 전투 기본(드로우·에너지·방어도·적 손패 공개·슬쩍하기·승패)
- 2단계: 상태 효과 4종을 쓰는 카드·적, 여러 적 동시 전투, 강탈, 복제, 전투 후 카드 보상
- v3 설계 A단계: 밸런스 조정(짧고 굵은 전투), 강탈 규칙 변경, 수치 `data/config.js`, 시뮬레이터
- v3 설계 B단계: 파티(도둑+동료 2), 앞줄·뒷줄, 동료 AI(탱커·힐러·딜러), 지휘 카드 4종, 강탈 시 동료 영입
- v3 설계 C단계: 1차원 12층 갈림길 맵(전투·정예·이벤트·암시장·은신처·보스), 골드·코인, 도주, 카드 강화, 정예 근위대장, 보스 폭군 왕(왕관)
- 설계 전체는 `DESIGN.md`, 아이템은 `ITEMS.md`

## 밸런스 시뮬레이션
```
node dimension-thief/tools/sim.js 100        # 시작 동료별
node dimension-thief/tools/sim.js 100 solo   # 동료 없이
```
동료별 × 전투 구성별 승률·평균 턴·남은 체력·강탈률·동료 사망률, 그리고 맵을 따라 보스까지 가는 한 판의 클리어율·사망 층·보존 코인을 출력한다. 수치를 바꾼 뒤 다시 돌려서 비교한다.

## 구조
- `data/config.js` 모든 수치(플레이어·강탈·보상·연출 시간)
- `data/` 카드·적·전투 구성·상태·차원·플레이어 정의 (데이터만)
- `js/rng.js` 시드 난수 · `state.js` 상태 · `effects.js` 공통 효과 · `cards.js` 카드 조회/설명
- `js/deck.js` 덱/손패/버림 · `enemy.js` 적 · `combat.js` 전투 흐름(내 턴 → 동료 → 적)
- `js/party.js` 동료 생성·진형·이탈 · `ai.js` 적의 대상 선택, 동료 역할별 행동
- `data/companions.js` 시작 동료, `data/enemies.js` 의 `role`·`companionDeck` 은 영입용
- `js/reward.js` 보상 후보 · `map.js` 맵 생성 · `run.js` 판 진행(맵·노드·골드·코인·도주·판 종료)
- `data/events.js` 이벤트, `data/encounters.js` 일반·정예·보스 구성
- `js/save.js` localStorage · `ui.js` 화면 · `main.js` 입력/적 턴 진행

## 새 카드 추가
`data/cards.js` 에 항목 추가:

```js
md_guard: { name: '수호', type: 'skill', cost: 2, origin: 'medieval', rarity: 'common',
            effects: [{ type: 'block', value: 12 }, { type: 'draw', value: 1 }] },
```

- 효과 타입: `damage`(times), `block`, `heal`, `loseHp`, `status`(status), `draw`, `energy`, `steal`, `copy`
- `to`: `'self'` | `'opponent'`(적을 탭해 사용) | `'allOpponents'`(모든 적) | `'ally'`(아군을 탭해 지정, 안 하면 자신)
- 방어도·회복은 기본이 `'ally'`. 지휘: `{ type: 'order', order: 'focus' | 'assist' | 'cover' | 'retreat' }`
- `rarity` 가 있으면 전투 보상 후보, 없으면 적 전용(슬쩍·강탈로만 획득)
- 적에게 주려면 `data/enemies.js` 의 `deck` 에 id 추가, 전투 구성은 `data/encounters.js`
- 새 효과 타입이 필요할 때만 `js/effects.js` 에 `DT.effects.register(...)`
