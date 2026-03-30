'use strict';

const KEY = 'st-entries-v2';
const PENDING_KEY = 'st-pending';

let entries = [];
let pendingSleep = null;
let sleepChart = null;

function toMins(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function dur(bed, wake) {
  let b = toMins(bed), w = toMins(wake);
  if (w <= b) w += 1440;
  return w - b;
}

function fmtDur(m) {
  const h = Math.floor(m / 60), mm = m % 60;
  return h + 'h ' + (mm < 10 ? '0' : '') + mm + 'm';
}

function fmtTime(t) {
  const [h, m] = t.split(':').map(Number);
  return (h % 12 || 12) + ':' + (m < 10 ? '0' : '') + m + ' ' + (h >= 12 ? 'PM' : 'AM');
}

function fmtDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function nowTime() {
  const n = new Date();
  return String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0');
}

function minsToHHMM(m) {
  const hh = Math.floor(((m % 1440) + 1440) % 1440 / 60);
  const mm = Math.round(Math.abs(m) % 60);
  return (hh % 12 || 12) + ':' + (mm < 10 ? '0' : '') + mm + (hh >= 12 ? ' PM' : ' AM');
}

function qClass(m) {
  if (m >= 420 && m <= 540) return 'good';
  if (m > 540) return 'long';
  if (m >= 360) return 'ok';
  return 'bad';
}

function qLabel(m) {
  if (m >= 420 && m <= 540) return 'Good';
  if (m > 540) return 'Long';
  if (m >= 360) return 'Short';
  return 'Poor';
}

function badgeHtml(m) {
  const cls = qClass(m), lbl = qLabel(m);
  return `<span class="badge badge-${cls}">${lbl}</span>`;
}

function load() {
  try { entries = JSON.parse(localStorage.getItem(KEY)) || []; } catch { entries = []; }
  try { pendingSleep = JSON.parse(localStorage.getItem(PENDING_KEY)); } catch { pendingSleep = null; }
  document.getElementById('m-date').value = todayStr();
  updateTapUI();
  render();
}

function persist() {
  entries.sort((a, b) => a.date.localeCompare(b.date));
  localStorage.setItem(KEY, JSON.stringify(entries));
}

function tapSleep() {
  pendingSleep = { time: nowTime(), date: todayStr() };
  localStorage.setItem(PENDING_KEY, JSON.stringify(pendingSleep));
  updateTapUI();
  showToast('Sleep timer started — good night!');
}

function tapWake() {
  if (!pendingSleep) return;
  const wakeTime = nowTime();
  const d = dur(pendingSleep.time, wakeTime);
  upsertEntry({ date: pendingSleep.date, bed: pendingSleep.time, wake: wakeTime, dur: d, notes: '' });
  pendingSleep = null;
  localStorage.removeItem(PENDING_KEY);
  persist();
  updateTapUI();
  render();
  showToast('Logged ' + fmtDur(d) + ' — good morning!');
}

function upsertEntry(entry) {
  const idx = entries.findIndex(e => e.date === entry.date);
  if (idx >= 0) entries[idx] = entry;
  else entries.push(entry);
}

function deleteEntry(date) {
  entries = entries.filter(e => e.date !== date);
  persist();
  render();
  showToast('Entry deleted');
}

function manualSave() {
  const bed = document.getElementById('m-bed').value;
  const wake = document.getElementById('m-wake').value;
  const date = document.getElementById('m-date').value;
  const notes = document.getElementById('m-notes').value.trim();
  if (!bed || !wake || !date) return;
  upsertEntry({ date, bed, wake, dur: dur(bed, wake), notes });
  persist();
  render();
  const msg = document.getElementById('manual-msg');
  msg.textContent = 'Saved for ' + fmtDate(date);
  setTimeout(() => msg.textContent = '', 2500);
}

function updateTapUI() {
  const bs = document.getElementById('btn-sleep');
  const bw = document.getElementById('btn-wake');
  const st = document.getElementById('tap-status');
  const ws = document.getElementById('wake-sub');
  if (pendingSleep) {
    bs.disabled = true;
    bw.disabled = false;
    ws.textContent = 'Since ' + fmtTime(pendingSleep.time);
    st.textContent = 'Sleeping since ' + fmtTime(pendingSleep.time) + '. Tap Wake up when you rise.';
  } else {
    bs.disabled = false;
    bw.disabled = true;
    ws.textContent = 'Tap when you rise';
    const last = entries[entries.length - 1];
    st.textContent = last ? 'Last logged: ' + fmtDate(last.date) : 'Tap Sleep now when going to bed';
  }
}

function consistency() {
  if (entries.length < 3) return null;
  const recent = entries.slice(-7);
  const bm = recent.map(e => toMins(e.bed));
  const wm = recent.map(e => toMins(e.wake));
  const avgB = bm.reduce((a, b) => a + b, 0) / bm.length;
  const avgW = wm.reduce((a, b) => a + b, 0) / wm.length;
  const stdB = Math.sqrt(bm.reduce((s, m) => s + Math.pow(m - avgB, 2), 0) / bm.length);
  const stdW = Math.sqrt(wm.reduce((s, m) => s + Math.pow(m - avgW, 2), 0) / wm.length);
  const score = Math.max(0, Math.round(100 - (stdB + stdW) / 2));
  return { score, avgB, avgW, stdB: Math.round(stdB), stdW: Math.round(stdW), n: recent.length };
}

function render() {
  const n = entries.length;
  document.getElementById('days-logged').textContent = n;
  const cEl = document.getElementById('consistency');
  if (n) {
    const avg = Math.round(entries.reduce((s, e) => s + e.dur, 0) / n);
    document.getElementById('avg-sleep').textContent = fmtDur(avg);
    document.getElementById('last-sleep').textContent = fmtDur(entries[n - 1].dur);
    const c = consistency();
    if (c) {
      cEl.textContent = c.score + '%';
      cEl.className = 'metric-value ' + (c.score >= 75 ? 'high' : c.score >= 50 ? 'mid' : 'low');
    } else {
      cEl.textContent = '—'; cEl.className = 'metric-value';
    }
  } else {
    ['avg-sleep', 'last-sleep'].forEach(id => document.getElementById(id).textContent = '—');
    cEl.textContent = '—'; cEl.className = 'metric-value';
  }
  renderLog();
  renderWeek();
  if (!document.getElementById('pane-chart').hidden) renderChart();
}

function renderLog() {
  const el = document.getElementById('log-list');
  if (!entries.length) {
    el.innerHTML = '<p class="empty-state">No entries yet. Tap Sleep now to begin.</p>';
    return;
  }
  el.innerHTML = [...entries].reverse().slice(0, 14).map(e => `
    <div class="log-row">
      <span class="log-date">${fmtDate(e.date)}</span>
      <span class="log-times">${fmtTime(e.bed)} → ${fmtTime(e.wake)}</span>
      <span class="log-dur">${fmtDur(e.dur)}</span>
      ${badgeHtml(e.dur)}
      ${e.notes ? `<span class="log-note" title="${e.notes}">${e.notes}</span>` : ''}
      <button class="del-btn" onclick="deleteEntry('${e.date}')">del</button>
    </div>`).join('');
}

function renderWeek() {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const start = new Date(today); start.setDate(today.getDate() - today.getDay());
  const wv = document.getElementById('week-view');
  wv.innerHTML = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const ds = d.toISOString().slice(0, 10);
    const e = entries.find(x => x.date === ds);
    const isToday = ds === todayStr();
    const pct = e ? Math.min(100, Math.round(e.dur / 540 * 100)) : 0;
    const barColor = e ? (e.dur >= 420 && e.dur <= 540 ? '#10b981' : e.dur >= 360 ? '#f59e0b' : '#ef4444') : 'transparent';
    return `<div class="week-row">
      <span class="week-day-label${isToday ? ' today' : ''}">${days[d.getDay()]}</span>
      <div class="bar-wrap"><div class="bar-fill" style="width:${pct}%;background:${barColor}"></div></div>
      <span class="week-dur" style="color:${e ? barColor : 'var(--text3)'}">${e ? fmtDur(e.dur) : '—'}</span>
      ${e ? badgeHtml(e.dur) : '<span class="badge" style="color:var(--text3)">—</span>'}
    </div>`;
  }).join('');

  const c = consistency();
  const cd = document.getElementById('consistency-detail');
  if (c) {
    const msg = c.score >= 75 ? 'Great consistency — your body clock is well set.' :
                c.score >= 50 ? 'Moderate — try to keep bedtime within ±30 min each night.' :
                'Low consistency — irregular timing can reduce sleep quality.';
    cd.innerHTML = `Score: <strong style="color:${c.score >= 75 ? 'var(--good)' : c.score >= 50 ? 'var(--ok)' : 'var(--bad)'}">${c.score}%</strong> (last ${c.n} nights)<br>
Avg bedtime: ${minsToHHMM(c.avgB)} ± ${c.stdB} min<br>
Avg wake: ${minsToHHMM(c.avgW)} ± ${c.stdW} min<br><br>${msg}`;
  } else {
    cd.textContent = 'Log at least 3 nights to see your score.';
  }
}

function renderChart() {
  const ctx = document.getElementById('sleep-chart').getContext('2d');
  const last14 = entries.slice(-14);
  const labels = last14.map(e => new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  const data = last14.map(e => +(e.dur / 60).toFixed(2));
  if (sleepChart) sleepChart.destroy();
  sleepChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: data.map(h => h >= 7 && h <= 9 ? '#10b981' : h >= 6 ? '#f59e0b' : '#ef4444'),
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => fmtDur(Math.round(c.parsed.y * 60)) } }
      },
      scales: {
        x: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { display: false } },
        y: {
          min: 0, max: 12,
          ticks: { callback: v => v + 'h', color: '#64748b', font: { size: 10 } },
          grid: { color: 'rgba(255,255,255,0.05)' }
        }
      }
    }
  });
}

function showTab(t) {
  ['log', 'week', 'chart', 'manual'].forEach(x => {
    document.getElementById('pane-' + x).style.display = x === t ? 'block' : 'none';
    document.getElementById('tab-' + x).className = 'tab' + (x === t ? ' active' : '');
  });
  if (t === 'chart') renderChart();
}

let toastTimer;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js'));
}

window.addEventListener('DOMContentLoaded', load);
window.tapSleep = tapSleep;
window.tapWake = tapWake;
window.manualSave = manualSave;
window.deleteEntry = deleteEntry;
window.showTab = showTab;
