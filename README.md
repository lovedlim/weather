# 날씨 요일 카드 애니메이션

요일별 날씨 카드가 아래에서 위로 순차 등장하는 **단일 HTML** 데모입니다. 브라우저에서 **프레임 단위로 H.264 MP4**를 만들어보낼 수 있습니다 (화면 녹화가 아닌 **WebCodecs + mp4-muxer** 렌더링).

## 기능

- **미리보기**: 글래스모피즘 카드 7장(월~일), 오늘/주말 강조, 별 배경
- **애니메이션**: `translateY` + `opacity` + `scale`, `cubic-bezier(0.16, 1, 0.3, 1)` easing, 카드별 스태거
- **줌**: 헤더·카드 영역 약 **130%** 확대 (캔버스 MP4와 동일 비율)
- **MP4보내기**
  - 해상도: 1080p / 4K
  - 프레임: 30fps / 60fps
  - 품질: 표준 / 고품질(비트레이트)
  - 렌더 중 **취소** 가능
  - `fastStart: 'in-memory'` 로 mp4-muxer v5 요구사항 충족

## 사용 방법

1. [index.html](index.html)을 브라우저로 엽니다 (`file://` 가능 — mp4-muxer는 페이지에 인라인 포함).
2. **렌더링 시작**으로 MP4 생성 후 자동 다운로드.

## 권장 환경

- **Chrome** 또는 **Edge** (Chromium) — `VideoEncoder` / WebCodecs 지원
- 4K·60fps·고품질은 GPU·메모리에 따라 수 분 걸릴 수 있음

## 로컬 서버 (선택)

```bash
git clone https://github.com/lovedlim/weather.git
cd weather
python3 -m http.server 8080
# 브라우저에서 http://localhost:8080
```

## 기술 스택

- 순수 HTML / CSS / JavaScript (빌드 없음)
- [mp4-muxer](https://github.com/Vanilagy/mp4-muxer) v5 (소스 인라인)
- WebCodecs `VideoEncoder` + `VideoFrame`

## 데이터

날씨 수치·아이콘은 **예시(mock)** 입니다. 실제 API 연동은 별도 구현이 필요합니다.

## 라이선스

저장소 소유자 정책에 따릅니다.
