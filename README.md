# Vision Widget

투명 데스크탑 위젯 — Tauri v2 + React + TypeScript

항상 위(always-on-top) + 투명 배경 + 드래그 이동 가능한 개인 대시보드.

## 기능

- ⏰ 실시간 시계
- 📊 프로젝트 현황 (진행률 + 목표 지표)
- 🔥 습관 스트릭 트래커 (클릭으로 +1)
- 💬 영감 문구 로테이션
- 💾 로컬 JSON 자동 저장
- 🖱️ 드래그로 위치 이동

## 사전 준비

```bash
# 1. Rust 설치
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 2. Tauri v2 필수 의존성 (Windows)
# → https://v2.tauri.app/start/prerequisites/

# 3. Node.js 18+
```

## 설치 & 실행

```bash
# 의존성 설치
npm install

# 개발 모드 (hot reload)
npm run tauri dev

# 프로덕션 빌드
npm run tauri build
```

## 데이터 편집

위젯 데이터는 아래 경로에 JSON으로 저장됨:

- **Windows**: `%APPDATA%/vision-widget-data.json`
- **macOS/Linux**: `~/.config/vision-widget-data.json`

직접 JSON 편집하거나, 나중에 위젯 내 에디터 UI 추가 예정.

## 커스텀

### 프로젝트 추가/수정

`vision-widget-data.json`에서 projects 배열 수정

### 문구 추가

`vision-widget-data.json`에서 quotes 배열에 추가

### 위젯 크기/위치 변경

`src-tauri/tauri.conf.json`에서 windows 설정 수정

```json
{
  "width": 380, // 위젯 폭
  "height": 700, // 위젯 높이
  "x": 20, // 화면 X 좌표
  "y": 60 // 화면 Y 좌표
}
```

## 로드맵

- [ ] 위치 및 크기 프리셋 기능 왼쪽 끝 오른쪽 끝, 위쪽, 아래쪽
- [ ] 드래그 드롭으로 위치 이동
- [ ] 포모도로 타이머 내장
- [ ] 시스템 트레이 아이콘
- [ ] 투명도 조절 설정 기능
- [ ] 위젯 내 인라인 편집
- [ ] GitHub API 연동 (커밋 수 자동 업데이트)
- [ ] Google Analytics 연동 (방문자 수)
