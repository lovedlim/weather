# 날씨 요일 카드

기상청 **단기예보**(공공데이터포털)를 불러와 요일별 카드로 보여주고, 카드 등장·온도 막대 애니메이션을 재생합니다. 브라우저 **WebCodecs**로 화면과 동일한 구성의 H.264 MP4를 내보낼 수 있습니다.

## 구성

| 경로 | 설명 |
|------|------|
| `server.js` | Express — 정적 파일 + `GET /api/forecast` (기상청 API 프록시) |
| `public/index.html` | UI, mp4-muxer 인라인, 캔버스 MP4 렌더 |
| `.env.example` | 필요한 환경 변수 이름만 안내 (**실제 키는 넣지 마세요**) |
| `.env` | 로컬 전용 — **Git에 포함하지 않음** (`.gitignore`) |

## 빠른 시작

```bash
git clone https://github.com/lovedlim/weather.git
cd weather
cp .env.example .env
```

`.env`에 [공공데이터포털](https://www.data.go.kr)에서 발급한 **일반 인증키(Decoding 권장)** 를 넣습니다.

```env
KMA_SERVICE_KEY=여기에_본인_키
```

```bash
npm install
npm start
```

브라우저에서 **http://localhost:3000** 을 엽니다.

> `file://`로 HTML만 열면 `/api/forecast`를 호출할 수 없어 **예시 데이터**로 동작합니다. API를 쓰려면 위처럼 서버를 띄운 뒤 접속하세요.

## 환경 변수

| 변수 | 설명 |
|------|------|
| `KMA_SERVICE_KEY` | 필수. `VilageFcstInfoService_2.0` 단기예보용 인증키 |
| `PORT` | 서버 포트 (기본 `3000`) |
| `DEFAULT_NX`, `DEFAULT_NY` | 기본 격자 (기본값 `61`, `125`, 서울 시청 근처) |

**주의:** 인증키·`.env` 파일은 저장소에 커밋하지 마세요. 유출 시 포털에서 키를 재발급하는 것이 좋습니다.

## API (로컬)

- `GET /api/forecast` — 단기예보를 가공한 일별 요약 JSON  
- `GET /api/forecast?lat=37.5665&lon=126.9780` — 위·경도 → 격자 변환  
- `GET /api/forecast?nx=60&ny=127` — 격자 직접 지정  

단기 응답에 해당 날짜 데이터가 없으면 **끝쪽 날짜부터** 온도가 비는 카드는 응답에서 **잘라** 보내, 카드 개수가 줄어들 수 있습니다.

## 기능 요약

- **단기예보** `getVilageFcst` 기반 최고·최저, SKY/PTY 기반 날씨 아이콘
- **동적 일수**: 제목이 `N일 날씨`처럼 실제 카드 수에 맞춰짐
- **애니메이션**: 카드 스태거 등장, 막대는 카드와 같은 타이밍에 채움
- **MP4 내보내기**: 해상도(1080p/4K), fps, 비트레이트 — Chrome/Edge 권장 (WebCodecs)

## 기술 스택

- Node.js 18+, Express, dotenv
- 기상청 [VilageFcstInfoService_2.0 / getVilageFcst](https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0)
- 클라이언트: mp4-muxer + `VideoEncoder`

## 라이선스

저장소 소유자 정책에 따릅니다. 기상청·공공데이터 이용 시 각 이용약관·출처 표시 규정을 따릅니다.
