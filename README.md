# 날씨 요일 카드 애니메이션

요일별 날씨 카드가 아래에서 위로 순차 등장하는 웹 UI입니다. **기상청 단기예보**(공공데이터포털)를 Node 서버에서 불러와 표시하고, 브라우저 **WebCodecs**로 H.264 MP4를 프레임 단위 렌더링합니다.

## 구성

| 경로 | 설명 |
|------|------|
| `server.js` | Express — 정적 파일 + `/api/forecast` (기상청 API 프록시) |
| `public/index.html` | UI · mp4-muxer 인라인 · 캔버스 렌더 |
| `.env` | **인증키 (저장소에 넣지 마세요)** |

## 빠른 시작

```bash
git clone https://github.com/lovedlim/weather.git
cd weather
cp .env.example .env
# .env 에 KMA_SERVICE_KEY= (공공데이터포털 Decoding 인증키) 입력
npm install
npm start
# http://localhost:3000
```

- **MP4보내기**는 반드시 `http://localhost:3000` 처럼 **서버를 통해** 열어야 `/api/forecast`와 같은 출처로 동작합니다.
- `public/index.html`만 `file://`로 열면 API는 호출되지 않고 예시 데이터로 대체됩니다.

### 쿼리 파라미터 (선택)

- `GET /api/forecast` — 기본 격자: `DEFAULT_NX`, `DEFAULT_NY` (서울 시청 근처 기본 `61`, `125`)
- `GET /api/forecast?nx=60&ny=127` — 격자 직접 지정
- `GET /api/forecast?lat=37.5665&lon=126.9780` — 위·경도 → 격자 자동 변환

## 기능

- **7일 예보**: 오늘(KST)부터 7일, 요일 라벨·최고/최저(가능한 경우)·SKY/PTY 기반 아이콘
- **애니메이션**: 느린 상승 + 스태거, 온도 바
- **줌**: 장면 약 130% (화면·MP4 동일)
- **MP4**: 1080p/4K, 30/60fps, 품질, 취소, `fastStart: 'in-memory'`

## 권장 브라우저

Chrome 또는 Edge (WebCodecs).

## 기술 스택

- Node 18+, Express, dotenv
- 기상청 **단기예보 조회** `getVilageFcst` ([VilageFcstInfoService_2.0](https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0))
- mp4-muxer v5 (클라이언트 인라인) + `VideoEncoder`

## 보안

- 인증키는 **환경 변수**로만 두고 Git에 올리지 마세요.
- 키가 유출된 적이 있다면 공공데이터포털에서 **재발급**하세요.

## 라이선스

저장소 소유자 정책에 따릅니다. 기상청·공공데이터 이용 시 각 이용약관을 따릅니다.
