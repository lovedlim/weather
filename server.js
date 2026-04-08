import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const BASE =
  'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst';

/** 기상청 격자 변환 (위·경도 → nx, ny) */
function latLonToGrid(lat, lon) {
  const RE = 6371.00877;
  const GRID = 5.0;
  const SLAT1 = 30.0;
  const SLAT2 = 60.0;
  const OLON = 126.0;
  const OLAT = 38.0;
  const XO = 43;
  const YO = 136;
  const DEGRAD = Math.PI / 180.0;
  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD;
  const slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD;
  const olat = OLAT * DEGRAD;
  let sn =
    Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = (re * sf) / Math.pow(ro, sn);
  let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  ra = (re * sf) / Math.pow(ra, sn);
  let theta = lon * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;
  const x = Math.floor(ra * Math.sin(theta) + XO + 0.5);
  const y = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);
  return { nx: x, ny: y };
}

/** KST 기준 오늘부터 offset일째 날짜 YYYYMMDD (한국은 일광절약시 없음) */
function kstYmdPlus(offsetDays) {
  const ts = Date.now() + offsetDays * 86400000;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(ts));
  return `${parts.find((p) => p.type === 'year').value}${parts.find((p) => p.type === 'month').value}${parts.find((p) => p.type === 'day').value}`;
}

function ymdToKstWeekdayShort(ymd) {
  const y = +ymd.slice(0, 4);
  const m = +ymd.slice(4, 6) - 1;
  const d = +ymd.slice(6, 8);
  const dt = new Date(Date.UTC(y, m, d, 3, 0, 0));
  const ko = new Intl.DateTimeFormat('ko-KR', {
    weekday: 'short',
    timeZone: 'Asia/Seoul',
  }).format(dt);
  const en = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: 'Asia/Seoul',
  }).format(dt);
  return {
    labelKo: ko.replace(/\.$/, ''),
    labelEn: en.slice(0, 3).toUpperCase(),
  };
}

function isWeekendYmd(ymd) {
  const y = +ymd.slice(0, 4);
  const m = +ymd.slice(4, 6) - 1;
  const d = +ymd.slice(6, 8);
  const dt = new Date(Date.UTC(y, m, d, 3, 0, 0));
  const day = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: 'Asia/Seoul',
  }).format(dt);
  return day.startsWith('Sat') || day.startsWith('Sun');
}

/** 가장 최근에 발표된 base_date, base_time (KST, 단기예보 02·05·08·11·14·17·20·23시) */
function getVilageBaseDateTime() {
  const now = new Date();
  const hp = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const hour = +hp.find((p) => p.type === 'hour').value;
  const ymdParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  let y = +ymdParts.find((p) => p.type === 'year').value;
  let m = +ymdParts.find((p) => p.type === 'month').value;
  let d = +ymdParts.find((p) => p.type === 'day').value;

  const ordered = [2, 5, 8, 11, 14, 17, 20, 23];
  let picked = null;
  for (const oh of ordered) {
    if (hour > oh || hour === oh) picked = oh;
  }
  if (picked == null) {
    const prev = new Date(Date.UTC(y, m - 1, d - 1, 12, 0, 0));
    const pp = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(prev);
    y = +pp.find((p) => p.type === 'year').value;
    m = +pp.find((p) => p.type === 'month').value;
    d = +pp.find((p) => p.type === 'day').value;
    picked = 23;
  }
  const baseDate = `${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}`;
  const baseTime = `${String(picked).padStart(2, '0')}00`;
  return { baseDate, baseTime };
}

function tryPrevBase(baseDate, baseTime) {
  const h = +baseTime.slice(0, 2);
  const order = [23, 20, 17, 14, 11, 8, 5, 2];
  const idx = order.indexOf(h);
  if (idx < order.length - 1) {
    const nh = order[idx + 1];
    return { baseDate, baseTime: `${String(nh).padStart(2, '0')}00` };
  }
  const y = +baseDate.slice(0, 4);
  const mo = +baseDate.slice(4, 6) - 1;
  const da = +baseDate.slice(6, 8);
  const prev = new Date(Date.UTC(y, mo, da - 1, 12, 0, 0));
  const pp = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(prev);
  const y2 = pp.find((p) => p.type === 'year').value;
  const m2 = pp.find((p) => p.type === 'month').value;
  const d2 = pp.find((p) => p.type === 'day').value;
  return { baseDate: `${y2}${m2}${d2}`, baseTime: '2300' };
}

async function fetchVilageFcst(serviceKey, nx, ny, baseDate, baseTime) {
  const u = new URL(BASE);
  u.searchParams.set('serviceKey', serviceKey);
  u.searchParams.set('pageNo', '1');
  u.searchParams.set('numOfRows', '1000');
  u.searchParams.set('dataType', 'JSON');
  u.searchParams.set('base_date', baseDate);
  u.searchParams.set('base_time', baseTime);
  u.searchParams.set('nx', String(nx));
  u.searchParams.set('ny', String(ny));
  const res = await fetch(u.toString());
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('기상청 API가 JSON이 아닌 응답을 반환했습니다.');
  }
  return json;
}

function normalizeItems(body) {
  if (!body?.items) return [];
  const raw = body.items.item;
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function groupByFcstDate(items) {
  const map = new Map();
  for (const it of items) {
    const key = it.fcstDate;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(it);
  }
  return map;
}

function summarizeDay(list) {
  let high = -999;
  let low = 999;
  let maxSky = 1;
  let maxPty = 0;
  let hasCondition = false;
  for (const it of list) {
    const v = it.fcstValue;
    const n = parseFloat(v);
    if (it.category === 'TMX' && !Number.isNaN(n)) high = Math.max(high, n);
    if (it.category === 'TMN' && !Number.isNaN(n)) low = Math.min(low, n);
    if (it.category === 'TMP' && !Number.isNaN(n)) {
      high = Math.max(high, n);
      low = Math.min(low, n);
    }
    if (it.category === 'SKY') {
      hasCondition = true;
      maxSky = Math.max(maxSky, +v || 1);
    }
    if (it.category === 'PTY') {
      hasCondition = true;
      maxPty = Math.max(maxPty, +v || 0);
    }
  }
  if (high <= -900) high = null;
  if (low >= 900) low = null;
  return { high, low, maxSky, maxPty, hasCondition };
}

function toConditionIcon({ maxPty, maxSky }) {
  if (maxPty === 1 || maxPty === 4) return { icon: '🌧', condition: '비' };
  if (maxPty === 2) return { icon: '🌨', condition: '비 또는 눈' };
  if (maxPty === 3) return { icon: '❄️', condition: '눈' };
  if (maxSky >= 4) return { icon: '☁️', condition: '흐림' };
  if (maxSky >= 3) return { icon: '⛅', condition: '구름 많음' };
  return { icon: '☀️', condition: '맑음' };
}

function barFromRange(high, low, minW, maxW) {
  if (high == null || low == null) return 0.5;
  const mid = (high + low) / 2;
  if (maxW <= minW) return 0.65;
  const t = (mid - minW) / (maxW - minW);
  return Math.min(0.95, Math.max(0.35, 0.35 + t * 0.6));
}

/** high·low 모두 없는 날은 끝에서만 제거(오늘부터 연속 구간). 최소 1일 유지 */
function trimTrailingDaysWithoutTemps(days) {
  const out = days.slice();
  while (
    out.length > 1 &&
    out[out.length - 1].high == null &&
    out[out.length - 1].low == null
  ) {
    out.pop();
  }
  return out.map((d, i) => ({ ...d, isToday: i === 0 }));
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/forecast', async (req, res) => {
  const serviceKey = process.env.KMA_SERVICE_KEY?.trim();
  if (!serviceKey) {
    return res.status(500).json({
      error: 'KMA_SERVICE_KEY가 설정되지 않았습니다. .env 파일을 확인하세요.',
    });
  }

  let nx = parseInt(req.query.nx, 10);
  let ny = parseInt(req.query.ny, 10);
  const lat = req.query.lat != null ? parseFloat(req.query.lat) : null;
  const lon = req.query.lon != null ? parseFloat(req.query.lon) : null;

  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    const g = latLonToGrid(lat, lon);
    nx = g.nx;
    ny = g.ny;
  } else {
    if (!Number.isFinite(nx) || !Number.isFinite(ny)) {
      nx = parseInt(process.env.DEFAULT_NX || '61', 10);
      ny = parseInt(process.env.DEFAULT_NY || '125', 10);
    }
  }

  let { baseDate, baseTime } = getVilageBaseDateTime();
  let json;
  let lastErr = null;
  let usedBase = { baseDate, baseTime };
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      json = await fetchVilageFcst(serviceKey, nx, ny, baseDate, baseTime);
      const code = json?.response?.header?.resultCode;
      const items = normalizeItems(json?.response?.body);
      if (code === '00' && items.length > 0) {
        usedBase = { baseDate, baseTime };
        break;
      }
      lastErr = json?.response?.header?.resultMsg || code || 'NO_DATA';
    } catch (e) {
      lastErr = e.message;
    }
    const prev = tryPrevBase(baseDate, baseTime);
    baseDate = prev.baseDate;
    baseTime = prev.baseTime;
  }

  const items = normalizeItems(json?.response?.body);
  if (!items.length) {
    return res.status(502).json({
      error: '기상청 단기예보 데이터를 가져오지 못했습니다.',
      detail: String(lastErr),
      baseDate,
      baseTime,
      nx,
      ny,
    });
  }

  const byDate = groupByFcstDate(items);
  const targetYmds = [];
  for (let i = 0; i < 7; i++) targetYmds.push(kstYmdPlus(i));

  const summaries = targetYmds.map((ymd) => {
    const list = byDate.get(ymd) || [];
    return { ymd, ...summarizeDay(list) };
  });

  let minW = 100;
  let maxW = -100;
  for (const s of summaries) {
    if (s.high != null) {
      minW = Math.min(minW, s.high);
      maxW = Math.max(maxW, s.high);
    }
    if (s.low != null) {
      minW = Math.min(minW, s.low);
      maxW = Math.max(maxW, s.low);
    }
  }
  if (minW > maxW) {
    minW = 0;
    maxW = 30;
  }

  const days = summaries.map((s, i) => {
    const { labelKo, labelEn } = ymdToKstWeekdayShort(s.ymd);
    const ci = s.hasCondition
      ? toConditionIcon({ maxPty: s.maxPty, maxSky: s.maxSky })
      : { icon: '🌤', condition: '정보 없음' };
    const high = s.high != null ? Math.round(s.high) : null;
    const low = s.low != null ? Math.round(s.low) : null;
    const bar =
      high != null && low != null
        ? barFromRange(high, low, minW, maxW)
        : 0.5;
    return {
      ymd: s.ymd,
      labelKo,
      labelEn,
      isWeekend: isWeekendYmd(s.ymd),
      isToday: i === 0,
      icon: ci.icon,
      condition: ci.condition,
      high,
      low,
      bar,
    };
  });

  const daysOut = trimTrailingDaysWithoutTemps(days);

  res.json({
    days: daysOut,
    baseDate: usedBase.baseDate,
    baseTime: usedBase.baseTime,
    nx,
    ny,
    updatedAt: new Date().toISOString(),
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`http://localhost:${PORT}  (static + /api/forecast)`);
});
