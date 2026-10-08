# 저장소 규칙

GitHub Pages는 `main` 브랜치 루트에서 배포된다. 여러 게임이 한 사이트에 있다.

- 게임마다 자기 폴더 하나만 사용한다: `dimension-thief/`, `hantang/`, `air-hockey/`, `fft/`
- 작업 중인 게임 폴더 밖의 파일은 건드리지 않는다.
- 새 게임은 새 폴더를 만들고, 루트 `index.html`(게임 목록)에 링크 카드를 하나 추가한다.
- 루트 `index.html`은 게임 목록 전용이다. 게임 코드를 넣지 않는다.
- `database.rules.json`은 한탕 카지노의 Firebase 규칙 파일이다(배포 경로와 무관).
