/* ── 맨트레일링 GPS 앱 · app.js ── */

'use strict';

// ── 상수 ──────────────────────────────────────────────────────────────
const TILE_URL  = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTR = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const DEFAULT_CENTER = [37.5665, 126.9780]; // 서울 기본값
const DEFAULT_ZOOM   = 16;
const STORAGE_KEY    = 'mantrailing_sessions';

// 핸들러 탭 샘플 경로 (서울 광화문 일대)
const SAMPLE_PATHS = {
  wonder: [[37.5760,126.9770],[37.5765,126.9778],[37.5770,126.9786],[37.5775,126.9793],[37.5780,126.9800],[37.5785,126.9808],[37.5790,126.9815],[37.5795,126.9823],[37.5800,126.9830]],
  cindy:  [[37.5760,126.9770],[37.5763,126.9780],[37.5767,126.9790],[37.5772,126.9798],[37.5778,126.9805],[37.5784,126.9813],[37.5789,126.9820],[37.5795,126.9828],[37.5801,126.9835]],
  old:    [[37.5760,126.9770],[37.5764,126.9777],[37.5769,126.9784],[37.5774,126.9791],[37.5779,126.9799],[37.5785,126.9806],[37.5791,126.9813],[37.5796,126.9821],[37.5802,126.9828]]
};

// ── 상태 ──────────────────────────────────────────────────────────────
let mapHelper = null, mapHandler = null;
let helperPolyline = null, currentMarker = null, startMarker = null, endMarker = null;
let handlerGroup = null;
let watchId = null, timerInterval = null, clockInterval = null;
let seconds = 0, pathCoords = [], totalDist = 0;
let startTimeStr = '', endTimeStr = '', startDateStr = '';
let isTracking = false;
const compareState = { wonder: true, cindy: true, old: false };

// ── 유틸 ──────────────────────────────────────────────────────────────
const pad = v => String(v).padStart(2, '0');

function nowStr() {
  const n = new Date();
  return `${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`;
}
function nowDateStr() {
  const n = new Date();
  return `${n.getFullYear()}-${pad(n.getMonth()+1)}-${pad(n.getDate())}`;
}
function nowFilename() {
  const n = new Date();
  return `${n.getFullYear()}${pad(n.getMonth()+1)}${pad(n.getDate())}_${pad(n.getHours())}${pad(n.getMinutes())}`;
}
function formatTime(s) {
  return [Math.floor(s/3600), Math.floor((s%3600)/60), s%60].map(v => pad(v)).join(':');
}
function haversine(a, b) {
  const R = 6371000, r = d => d * Math.PI / 180;
  const dLat = r(b[0]-a[0]), dLon = r(b[1]-a[1]);
  const x = Math.sin(dLat/2)**2 + Math.cos(r(a[0]))*Math.cos(r(b[0]))*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
}
function fmtDist(m) {
  return m < 1000 ? `${Math.round(m)}m` : `${(m/1000).toFixed(2)}km`;
}

// ── 아이콘 ────────────────────────────────────────────────────────────
function makeIcon(bg, letter, size = 26) {
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:${Math.round(size*0.46)}px;border:2.5px solid rgba(255,255,255,0.9);box-shadow:0 2px 6px rgba(0,0,0,0.3)">${letter}</div>`,
    iconSize: [size, size], iconAnchor: [size/2, size/2]
  });
}
function pulseIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="width:20px;height:20px;border-radius:50%;background:#185FA5;border:3px solid rgba(255,255,255,0.95);box-shadow:0 0 0 7px rgba(24,95,165,0.22),0 2px 6px rgba(0,0,0,0.25)"></div>`,
    iconSize: [20, 20], iconAnchor: [10, 10]
  });
}

// ── 지도 초기화 ───────────────────────────────────────────────────────
function initMaps() {
  if (mapHelper) return;

  mapHelper = L.map('map-helper', { zoomControl: true, attributionControl: true })
    .setView(DEFAULT_CENTER, DEFAULT_ZOOM);
  L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(mapHelper);
  helperPolyline = L.polyline([], { color: '#185FA5', weight: 5, lineCap: 'round', lineJoin: 'round' }).addTo(mapHelper);

  mapHandler = L.map('map-handler', { zoomControl: true, attributionControl: true })
    .setView(DEFAULT_CENTER, DEFAULT_ZOOM);
  L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(mapHandler);
  handlerGroup = L.layerGroup().addTo(mapHandler);

  drawHandlerPaths();
}

// ── 핸들러 경로 비교 지도 ─────────────────────────────────────────────
function drawHandlerPaths() {
  if (!handlerGroup) return;
  handlerGroup.clearLayers();

  const cfg = {
    wonder: { color: '#185FA5', label: '원더', weight: 5, dash: null },
    cindy:  { color: '#D85A30', label: '신디',  weight: 5, dash: null },
    old:    { color: '#888780', label: '이전',  weight: 3, dash: '8,5' }
  };

  const visiblePts = [];
  ['old', 'cindy', 'wonder'].forEach(key => {
    if (!compareState[key]) return;
    const { color, label, weight, dash } = cfg[key];
    const pts = SAMPLE_PATHS[key];
    visiblePts.push(...pts);

    L.polyline(pts, { color, weight, dashArray: dash, lineCap: 'round', lineJoin: 'round', opacity: 0.85 })
      .addTo(handlerGroup);
    L.marker(pts[pts.length-1], { icon: makeIcon(color, label[0]) })
      .bindTooltip(label, { permanent: false, direction: 'top' })
      .addTo(handlerGroup);
  });

  // 공통 출발 마커
  L.marker(SAMPLE_PATHS.wonder[0], { icon: makeIcon('#3B6D11', 'S') })
    .bindTooltip('출발', { permanent: false, direction: 'top' })
    .addTo(handlerGroup);

  if (visiblePts.length) {
    mapHandler.fitBounds(L.latLngBounds(visiblePts), { padding: [24, 24] });
  }
}

function toggleCompare(type) {
  compareState[type] = !compareState[type];
  document.getElementById('cmp-' + type).classList.toggle('selected', compareState[type]);
  drawHandlerPaths();
}

// ── 탭 전환 ───────────────────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab').forEach((t, i) =>
    t.classList.toggle('active', ['helper', 'handler', 'log'][i] === name)
  );
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');

  setTimeout(() => {
    initMaps();
    if (mapHelper)  mapHelper.invalidateSize();
    if (mapHandler) mapHandler.invalidateSize();
    if (name === 'log') renderLog();
  }, 60);
}

// ── 추적 시작 ─────────────────────────────────────────────────────────
function startTracking() {
  if (!navigator.geolocation) {
    setStatus('red', 'GPS를 지원하지 않는 브라우저입니다');
    return;
  }
  initMaps();
  pathCoords = []; totalDist = 0; seconds = 0; isTracking = true;
  startTimeStr = nowStr();
  startDateStr = nowDateStr();

  document.getElementById('start-time-display').textContent = startTimeStr;
  document.getElementById('end-time-display').textContent = '—';
  document.getElementById('dist-display').textContent = '0m';
  document.getElementById('point-display').textContent = '0';
  document.getElementById('start-btn').style.display = 'none';
  document.getElementById('stop-btn').style.display = '';
  document.getElementById('export-btn').disabled = true;
  document.getElementById('export-info').textContent = '추적 종료 후 저장 가능합니다';
  document.getElementById('gps-notice').style.display = 'none';

  // 이전 마커 제거
  [startMarker, endMarker, currentMarker].forEach(m => { if (m) mapHelper.removeLayer(m); });
  startMarker = endMarker = currentMarker = null;
  helperPolyline.setLatLngs([]);

  setStatus('amber', 'GPS 신호 수신 중...');

  timerInterval = setInterval(() => {
    seconds++;
    document.getElementById('timer-display').textContent = formatTime(seconds);
  }, 1000);

  watchId = navigator.geolocation.watchPosition(onPosition, onGpsError, {
    enableHighAccuracy: true, maximumAge: 1000, timeout: 15000
  });
}

function onPosition(pos) {
  const { latitude: lat, longitude: lng, accuracy } = pos.coords;
  const coord = [lat, lng];

  if (pathCoords.length === 0) {
    mapHelper.setView(coord, 17);
    startMarker = L.marker(coord, { icon: makeIcon('#3B6D11', 'S') })
      .bindTooltip(`출발 ${startTimeStr}`, { permanent: true, direction: 'top', offset: [0, -12] })
      .addTo(mapHelper);
    setStatus('green', `GPS 추적 중 (정확도 ±${Math.round(accuracy)}m)`);
  } else {
    totalDist += haversine(pathCoords[pathCoords.length-1], coord);
    document.getElementById('dist-display').textContent = fmtDist(totalDist);
  }

  pathCoords.push(coord);
  document.getElementById('point-display').textContent = pathCoords.length;
  helperPolyline.setLatLngs(pathCoords);

  if (currentMarker) currentMarker.setLatLng(coord);
  else currentMarker = L.marker(coord, { icon: pulseIcon() }).addTo(mapHelper);
  mapHelper.panTo(coord);
}

function onGpsError(err) {
  const msgs = { 1: '위치 권한이 거부됐습니다', 2: 'GPS 신호를 찾을 수 없습니다', 3: 'GPS 시간 초과' };
  setStatus('red', msgs[err.code] || 'GPS 오류');
}

// ── 추적 종료 ─────────────────────────────────────────────────────────
function stopTracking() {
  if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
  clearInterval(timerInterval);
  isTracking = false;
  endTimeStr = nowStr();

  document.getElementById('end-time-display').textContent = endTimeStr;
  document.getElementById('start-btn').style.display = '';
  document.getElementById('stop-btn').style.display = 'none';
  setStatus('red', '추적 완료');

  if (pathCoords.length > 0) {
    const last = pathCoords[pathCoords.length-1];
    if (currentMarker) { mapHelper.removeLayer(currentMarker); currentMarker = null; }
    endMarker = L.marker(last, { icon: makeIcon('#E24B4A', 'E') })
      .bindTooltip(`도착 ${endTimeStr}`, { permanent: true, direction: 'top', offset: [0, -12] })
      .addTo(mapHelper);
    if (pathCoords.length > 1) mapHelper.fitBounds(helperPolyline.getBounds(), { padding: [32, 32] });
  }

  document.getElementById('export-btn').disabled = false;
  document.getElementById('export-info').textContent = 'GeoJSON · QGIS·Google Maps에서 열 수 있습니다';

  // 로그 자동 저장
  saveSession();
}

// ── GeoJSON 내보내기 ──────────────────────────────────────────────────
function exportRoute() {
  if (pathCoords.length === 0) return;
  const geojson = {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: pathCoords.map(c => [c[1], c[0]])  // GeoJSON은 [lng, lat]
      },
      properties: {
        title:       '맨트레일링 경로 기록',
        date:        startDateStr,
        start_time:  startTimeStr,
        end_time:    endTimeStr,
        duration:    formatTime(seconds),
        distance_m:  Math.round(totalDist),
        points:      pathCoords.length
      }
    }]
  };
  const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `mantrailing_${nowFilename()}.geojson`;
  a.click(); URL.revokeObjectURL(url);
}

// ── 세션 저장 (localStorage) ──────────────────────────────────────────
function saveSession() {
  const sessions = loadSessions();
  sessions.unshift({
    id:       Date.now(),
    date:     startDateStr,
    start:    startTimeStr,
    end:      endTimeStr,
    duration: formatTime(seconds),
    dist_m:   Math.round(totalDist),
    points:   pathCoords.length,
    coords:   pathCoords
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, 100))); // 최대 100회
}

function loadSessions() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

function renderLog() {
  const sessions = loadSessions();
  const list = document.getElementById('session-list');
  const countEl = document.getElementById('log-count');
  const distEl  = document.getElementById('log-dist');

  // 이번 달 통계
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthSessions = sessions.filter(s => s.date.startsWith(thisMonth));
  const totalM = sessions.reduce((acc, s) => acc + (s.dist_m || 0), 0);
  countEl.textContent = `${monthSessions.length}회`;
  distEl.textContent  = fmtDist(totalM);

  if (sessions.length === 0) {
    list.innerHTML = '<p style="color:#888;font-size:13px">아직 저장된 기록이 없습니다.</p>';
    return;
  }

  list.innerHTML = sessions.map(s => `
    <div class="session-row">
      <div class="session-info">
        <div>${s.date} · ${s.start} 출발</div>
        <div class="session-meta">소요 ${s.duration} · ${fmtDist(s.dist_m)} · ${s.points}포인트</div>
      </div>
      <div class="session-actions">
        <button class="btn-icon" title="GeoJSON 다운로드" onclick="downloadSession(${s.id})">⬇</button>
        <button class="btn-icon" title="삭제" onclick="deleteSession(${s.id})">🗑</button>
      </div>
    </div>
  `).join('');
}

function downloadSession(id) {
  const sessions = loadSessions();
  const s = sessions.find(x => x.id === id);
  if (!s) return;
  const geojson = {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: s.coords.map(c => [c[1], c[0]]) },
      properties: { date: s.date, start_time: s.start, end_time: s.end, duration: s.duration, distance_m: s.dist_m }
    }]
  };
  const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `mantrailing_${s.date}_${s.start.replace(/:/g,'')}.geojson`;
  a.click(); URL.revokeObjectURL(url);
}

function deleteSession(id) {
  if (!confirm('이 기록을 삭제할까요?')) return;
  const sessions = loadSessions().filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  renderLog();
}

function clearLog() {
  if (!confirm('전체 훈련 기록을 초기화할까요?')) return;
  localStorage.removeItem(STORAGE_KEY);
  renderLog();
}

// ── 메모 저장 ─────────────────────────────────────────────────────────
function saveMemo() {
  const text = document.getElementById('memo-text').value.trim();
  if (!text) return;
  const memos = JSON.parse(localStorage.getItem('mantrailing_memos') || '[]');
  memos.unshift({ date: nowDateStr(), time: nowStr(), text });
  localStorage.setItem('mantrailing_memos', JSON.stringify(memos.slice(0, 200)));
  document.getElementById('memo-info').textContent = `✓ ${nowStr()} 저장됨`;
  document.getElementById('memo-text').value = '';
}

// ── 상태 표시 ─────────────────────────────────────────────────────────
function setStatus(color, text) {
  document.getElementById('gps-dot').className = 'status-dot dot-' + color;
  document.getElementById('gps-status').textContent = text;
}

// ── 헤더 시계 ─────────────────────────────────────────────────────────
function updateClock() {
  const el = document.getElementById('header-time');
  if (el) el.textContent = nowStr();
}

// ── 초기화 ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  updateClock();
  clockInterval = setInterval(updateClock, 1000);

  // 헬퍼 탭이 기본이므로 바로 지도 로드
  setTimeout(initMaps, 200);
});
