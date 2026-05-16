# 🐾 맨트레일링 GPS 경로 추적 앱

인명구조견 맨트레일링 훈련용 GPS 경로 기록 웹 앱입니다.

## 주요 기능

| 기능 | 설명 |
|------|------|
| 실시간 GPS 추적 | `navigator.geolocation`으로 헬퍼 경로를 실시간 기록 |
| OpenStreetMap | 실제 지도 위에 경로 표시 |
| 출발·도착 시각 자동 기록 | 추적 시작/종료 시 현재 시각 자동 입력 |
| GeoJSON 내보내기 | QGIS, Google Maps, Kakao Maps에서 열기 가능 |
| 경로 비교 | 핸들러 탭에서 복수 회차 경로 겹쳐 비교 |
| 훈련 로그 | localStorage에 자동 저장, 회차별 다운로드·삭제 |
| PWA 설치 | 스마트폰 홈 화면에 앱처럼 설치 가능 |

---

## GitHub Pages 배포 방법 (5단계)

### 1단계 — GitHub 계정 및 저장소 만들기
1. [github.com](https://github.com) 접속 후 로그인
2. 우측 상단 **+** → **New repository** 클릭
3. Repository name: `mantrailing-gps` (원하는 이름)
4. **Public** 선택 → **Create repository** 클릭

### 2단계 — 파일 업로드
1. 생성된 저장소에서 **uploading an existing file** 클릭
2. 아래 파일 구조 그대로 업로드:

```
mantrailing-gps/
├── index.html
├── manifest.json
├── css/
│   └── style.css
├── js/
│   └── app.js
└── .github/
    └── workflows/
        └── deploy.yml
```

3. **Commit changes** 클릭

### 3단계 — GitHub Pages 활성화
1. 저장소 → **Settings** 탭 클릭
2. 좌측 메뉴 **Pages** 클릭
3. **Source** → **GitHub Actions** 선택
4. 저장 후 1~2분 대기

### 4단계 — 배포 URL 확인
- `https://[내 GitHub 아이디].github.io/mantrailing-gps/`
- Settings → Pages 화면에서 URL 확인 가능

### 5단계 — 스마트폰 홈 화면에 설치
- **iPhone**: Safari에서 URL 접속 → 공유 버튼 → **홈 화면에 추가**
- **Android**: Chrome에서 URL 접속 → 메뉴 → **홈 화면에 추가**

---

## 현장 사용 시 주의사항

- GPS는 **HTTPS 환경**에서만 동작합니다 (GitHub Pages는 자동 HTTPS)
- 첫 실행 시 브라우저 위치 권한 **허용** 필수
- 건물 내부·지하에서는 GPS 정확도가 낮을 수 있습니다
- GeoJSON 파일은 [geojson.io](https://geojson.io)에서 바로 확인 가능

---

## 기술 스택

- **Leaflet.js** v1.9.4 — 지도 렌더링
- **OpenStreetMap** — 무료 지도 타일
- **navigator.geolocation** — 브라우저 GPS API
- **localStorage** — 훈련 기록 로컬 저장
- **GeoJSON** — 표준 지리 데이터 포맷
- **PWA** — 홈 화면 설치 지원

---

한국인명구조견협회 · 맨트레일링 훈련 관리 시스템
