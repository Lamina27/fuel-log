/* ===== Fuel Log — inti: utilitas, bahasa, state, penyimpanan, AI ===== */

/* ---------- bahasa */
const LANGS = {
  id: { name: 'Indonesia', loc: 'id-ID', ai: 'bahasa Indonesia', tsep: '.', dm: 'dm' },
  en: { name: 'English', loc: 'en-US', ai: 'English', tsep: ':', dm: 'md' },
  ja: { name: '日本語', loc: 'ja-JP', ai: 'Japanese (日本語)', tsep: ':', dm: 'md' },
};
let LANG = 'id';
const LIDX = { id: 0, en: 1, ja: 2 };
function t(k, v) {
  const e = STR[k];
  let s = e ? (e[LIDX[LANG]] != null ? e[LIDX[LANG]] : e[0]) : k;
  if (v) s = s.replace(/\{(\w+)\}/g, (m, x) => (v[x] != null ? v[x] : m));
  return s;
}
const LOC = () => LANGS[LANG].loc;
function detectLang() {
  const n = (navigator.language || 'id').toLowerCase();
  return n.startsWith('ja') ? 'ja' : n.startsWith('en') ? 'en' : 'id';
}

/* ---------- utilitas */
const $ = (s, r) => (r || document).querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fi = n => Math.round(Number(n) || 0).toLocaleString(LOC());
const f1 = n => (Math.round((Number(n) || 0) * 10) / 10).toLocaleString(LOC(), { maximumFractionDigits: 1 });
const fdec = n => Number(n).toLocaleString(LOC(), { maximumFractionDigits: 2 });
const raw1 = n => String(Math.round((Number(n) || 0) * 10) / 10);
const signed = n => (n > 0 ? '+' : n < 0 ? '−' : '') + fi(Math.abs(n));
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const pad = n => String(n).padStart(2, '0');
const isoOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => isoOf(new Date());
const parseIso = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, k) => { const d = parseIso(s); d.setDate(d.getDate() + k); return isoOf(d); };
const ymOf = s => s.slice(0, 7);
const longDate = s => parseIso(s).toLocaleDateString(LOC(), { weekday: 'long', day: 'numeric', month: 'long' });
const shortDate = s => parseIso(s).toLocaleDateString(LOC(), { day: 'numeric', month: 'short' });
const monthName = ym => { const [y, m] = ym.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString(LOC(), { month: 'long', year: 'numeric' }); };
const daysInMonth = ym => { const [y, m] = ym.split('-').map(Number); return new Date(y, m, 0).getDate(); };
const n0 = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const nOrNull = v => { if (v === '' || v == null) return null; const x = Number(String(v).replace(',', '.')); return Number.isFinite(x) ? x : null; };
const dowNames = () => Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(LOC(), { weekday: 'short' }));
const dm = iso => LANGS[LANG].dm === 'dm' ? `${Number(iso.slice(8))}/${Number(iso.slice(5, 7))}` : `${Number(iso.slice(5, 7))}/${Number(iso.slice(8))}`;
const hhmm = ms => { const d = new Date(ms); return `${pad(d.getHours())}${LANGS[LANG].tsep}${pad(d.getMinutes())}`; };
const hhmmInput = ms => { const d = new Date(ms); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const durTxt = h => { const m = Math.max(0, Math.round(h * 60)); return t('dur_hm', { h: Math.floor(m / 60), m: pad(m % 60) }); };
const K = () => t('kcal');
const mL = (k, ib) => t((ib ? 'mealI_' : 'meal_') + k);
const typeLabel = k => t('type_' + (TYPES[k] ? k : 'other'));
const tD = (base, isToday) => t(base + (isToday ? '_today' : '_then'));

/* ---------- state */
const S = {
  hasClaude: !!(window.claude && typeof window.claude.use === 'function'),
  mode: 'loading', localWhy: '', isOwner: false, db: null, uid: null, sample: null, downloads: null, img: null,
  profile: null, lib: [], days: new Map(), months: new Map(),
  date: today(), view: 'today', logTab: 'food', month: ymOf(today()), meal: null,
  state: { kind: 'state', fast: null, supps: [], containers: null, lang: null },
  calMonth: ymOf(today()), calMetric: 'in', calSel: today(),
  statsTab: 'chart', chartMetric: 'in', chartPeriod: 'd', nutPeriod: 'd', nutAnchor: today(), nutView: 'gizi',
  ranges: new Map(), recapBusy: null, sheetDate: null,
  foodImgs: [], foodDraft: null, foodNote: '', foodBusy: null, foodErr: '',
  shotImgs: [], actDraft: null, stepsDraft: null, shotBusy: null, shotErr: '',
};

/* ---------- penyimpanan: akun (db) atau perangkat (localStorage) */
const LS = {
  get(k) { try { const v = localStorage.getItem('nk:' + k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem('nk:' + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
};
const queues = new Map();
function enqueue(key, fn) {
  const prev = queues.get(key) || Promise.resolve();
  const next = prev.catch(() => {}).then(fn);
  queues.set(key, next);
  return next;
}
const col = () => S.db.collection('data/users/' + S.uid);
// db: data() dikirim beku (Object.freeze) — salin dulu supaya bisa diubah
const thaw = v => v == null ? v : JSON.parse(JSON.stringify(v));
const dayKey = d => 'd' + d;

async function loadDoc(id) {
  if (S.mode === 'cloud') {
    try { const s = await col().doc(id).get(); return s.exists ? thaw(s.data()) : null; }
    catch (e) {
      if (e && e.code === 'unavailable') {
        await new Promise(r => setTimeout(r, 400 + Math.random() * 600));
        const s = await col().doc(id).get(); return s.exists ? thaw(s.data()) : null;
      }
      throw e;
    }
  }
  return LS.get(id);
}
/* Tulis ke akun. Kontrak db: satu tulis per dokumen sekaligus (enqueue), 'unavailable' dicoba ulang
   sekali, kode tak dikenal = 'unavailable'. Gagal karena jaringan → antre di perangkat (outbox) dan
   dikirim otomatis saat online, supaya catatan tidak hilang di sinyal buruk. */
const pending = new Map();                       // id → jumlah tulis lokal yang belum selesai
const busy = id => (pending.get(id) || 0) > 0;
const NOWRITE = ['invalid_argument', 'not_granted', 'revoked', 'capability_disabled', 'capability_removed'];
const outbox = () => LS.get('outbox') || {};
function outboxPut(id, body) { const o = outbox(); o[id] = body; LS.set('outbox', o); }
function outboxDel(id) { const o = outbox(); if (id in o) { delete o[id]; LS.set('outbox', o); } }
const outboxCount = () => Object.keys(outbox()).length;
async function writeOnce(id, body) {
  try { await col().doc(id).set(body); }
  catch (e) {
    const code = e && e.code;
    if (code === 'unavailable' || code === 'resource_exhausted' || !code || ![...NOWRITE, 'quota_exceeded', 'transform_error'].includes(code)) {
      await new Promise(r => setTimeout(r, 500 + Math.random() * 800));
      await col().doc(id).set(body); return;
    }
    throw e;
  }
}
async function saveDoc(id, data) {
  const body = thaw(data);                       // JSON bersih: tanpa undefined/NaN, tidak berbagi objek
  if (S.mode === 'cloud') {
    pending.set(id, (pending.get(id) || 0) + 1);
    try { await enqueue(id, () => writeOnce(id, body)); outboxDel(id); if (!outboxCount()) renderSync(); return true; }
    catch (e) {
      const code = e && e.code;
      if (NOWRITE.includes(code) && !S.isOwner) { goLocal('nowrite'); }
      else if (code === 'quota_exceeded') { toast(t('err_quota')); return false; }
      else if (code === 'invalid_argument' || code === 'transform_error') { toast(t('err_save')); return false; }
      else {
        outboxPut(id, body); renderSync();
        // ditunda supaya tidak tertimpa toast "ditambahkan" dari aksi yang sama
        if (!S.offlineWarned) { S.offlineWarned = true; setTimeout(() => toast(t('toast_queued')), 2600); }
        scheduleFlush(); return true;
      }
    } finally { pending.set(id, pending.get(id) - 1); }
  }
  if (!LS.set(id, body)) {
    if (!S.lsFailed) { S.lsFailed = true; renderSync(); setTimeout(() => toast(t('err_local_save')), 2600); }
    return false;
  }
  if (S.lsFailed) { S.lsFailed = false; renderSync(); }
  return true;
}
// Ketukan beruntun (air) digabung jadi satu tulis per hari; selama menunggu, dokumen dianggap sibuk.
const dayTimers = new Map();
function queueDaySave(day, ms = 700) {
  const date = day.date, k = dayKey(date);
  if (dayTimers.has(k)) clearTimeout(dayTimers.get(k).h);
  else pending.set(k, (pending.get(k) || 0) + 1);
  const run = () => { dayTimers.delete(k); saveDay(S.days.get(date) || day).finally(() => pending.set(k, pending.get(k) - 1)); };
  dayTimers.set(k, { h: setTimeout(run, ms), run });
}
function flushDayTimers() { [...dayTimers.values()].forEach(x => { clearTimeout(x.h); x.run(); }); }
let flushTimer = null, flushing = false;
function scheduleFlush(ms = 30000) { clearTimeout(flushTimer); flushTimer = setTimeout(flushOutbox, ms); }
async function flushOutbox() {
  if (flushing || S.mode !== 'cloud') return;
  const ids = Object.keys(outbox()); if (!ids.length) return;
  flushing = true;
  try {
    for (const id of ids) {
      const body = outbox()[id]; if (!body) continue;
      pending.set(id, (pending.get(id) || 0) + 1);
      try { await enqueue(id, () => col().doc(id).set(body)); outboxDel(id); }
      catch (e) {
        // isi dokumen tidak valid tidak akan pernah berhasil → buang; selain itu simpan dan coba lagi nanti
        if ((e && e.code) === 'invalid_argument' && S.isOwner) outboxDel(id);
        else { scheduleFlush(); break; }
      }
      finally { pending.set(id, pending.get(id) - 1); }
    }
  } finally { flushing = false; renderSync(); }
  if (!outboxCount() && S.offlineWarned) { S.offlineWarned = false; toast(t('toast_synced')); }
}
// Terapkan antrean yang belum terkirim ke data yang baru dimuat (dipanggil saat mulai).
function applyOutbox() {
  const o = outbox();
  Object.entries(o).forEach(([id, body]) => {
    if (id === 'profile') S.profile = body;
    else if (id === 'state') S.state = Object.assign({ kind: 'state', fast: null, supps: [], containers: null, lang: null }, body);
    else if (id === 'lib') S.lib = body.items || [];
    else if (/^d\d{4}-\d{2}-\d{2}$/.test(id)) S.days.set(id.slice(1), Object.assign(blankDay(id.slice(1)), body));
  });
  return Object.keys(o).length;
}

/* Sinkron langsung antar-perangkat: dengarkan profil, pengaturan, makanan sering, dan hari yang dibuka.
   Satu langganan per dokumen; hari dipindah hanya saat tanggal berganti. */
const subs = new Map();
function watchDoc(id, apply) {
  if (S.mode !== 'cloud' || subs.has(id)) return;
  try {
    const un = col().doc(id).onSnapshot(s => {
      if (S.mode !== 'cloud' || !s || !s.exists) return;
      if ((s.metadata && s.metadata.hasPendingWrites) || busy(id) || (id in outbox())) return;
      apply(thaw(s.data()));
    }, () => { subs.delete(id); });
    subs.set(id, un);
  } catch (e) { /* tanpa langganan: tetap jalan seperti biasa */ }
}
function unwatchDoc(id) { const un = subs.get(id); if (un) { try { un(); } catch (e) {} subs.delete(id); } }
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
let watchedDay = null;
function syncWatch() {
  if (S.mode !== 'cloud') return;
  watchDoc('profile', d => { if (same(d, S.profile)) return; S.profile = d; S.months.clear(); S.ranges.clear(); liveRender(); });
  watchDoc('state', d => {
    const st = Object.assign({ kind: 'state', fast: null, supps: [], containers: null, lang: null }, d);
    if (same(st, S.state)) return;
    S.state = st;
    if (st.lang && LANGS[st.lang] && st.lang !== LANG) { LANG = st.lang; LS.set('lang', LANG); renderHeader(); }
    liveRender();
  });
  watchDoc('lib', d => { const items = d.items || []; if (!same(items, S.lib)) { S.lib = items; if (S.view === 'log') liveRender(); } });
  const key = dayKey(S.date);
  if (watchedDay !== key) {
    if (watchedDay) unwatchDoc(watchedDay);
    watchedDay = key;
    const date = S.date;
    watchDoc(key, d => {
      const nd = Object.assign(blankDay(date), d);
      if (same(nd, S.days.get(date))) return;
      S.days.set(date, nd); S.months.delete(ymOf(date)); S.ranges.clear(); liveRender();
    });
  }
}
// Gambar ulang setelah perubahan dari perangkat lain — tapi jangan ganggu orang yang sedang mengetik.
function liveRender() {
  const a = document.activeElement;
  const typing = a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.closest('main');
  if (typing || S.view === 'log' || S.view === 'prof') { S.liveStale = true; return; }
  S.liveStale = false; render();
}
function goLocal(why) {
  if (S.mode === 'local') return;
  S.mode = 'local'; S.localWhy = why;
  if (why === 'nowrite') LS.set('mode', 'local');
  if (S.profile) LS.set('profile', S.profile);
  LS.set('lib', { kind: 'lib', items: S.lib });
  LS.set('state', S.state);
  S.days.forEach((d, k) => LS.set(dayKey(k), d));
  renderSync();
  toast(t('toast_local'));
}
function blankDay(date) { return { kind: 'day', date, foods: [], acts: [], steps: null, weight: null, water: 0, supps: [], fasts: [], ibadah: false }; }
async function getDay(date) {
  if (S.days.has(date)) return S.days.get(date);
  let d = null;
  try { d = await loadDoc(dayKey(date)); } catch (e) { d = null; }
  d = Object.assign(blankDay(date), d || {});
  S.days.set(date, d);
  return d;
}
async function saveDay(day) {
  S.days.set(day.date, day);
  S.months.delete(ymOf(day.date));
  S.ranges.clear();
  return saveDoc(dayKey(day.date), day);
}
async function getRange(from, to) {
  if (S.mode === 'cloud') {
    try {
      const snap = await col().where('kind', '==', 'day').where('date', '>=', from).where('date', '<=', to).limit(400).get();
      const map = new Map();
      snap.docs.forEach(s => { const d = Object.assign(blankDay(s.id.slice(1)), thaw(s.data())); map.set(d.date, d); });
      S.days.forEach((d, k) => { if (k >= from && k <= to) map.set(k, d); });
      map.forEach((d, k) => { if (!S.days.has(k)) S.days.set(k, d); });
      return [...map.values()];
    } catch (e) { /* jatuh ke cache */ }
  }
  const out = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const v = S.days.get(d) || (S.mode === 'local' ? LS.get(dayKey(d)) : null);
    if (v) out.push(Object.assign(blankDay(d), v));
  }
  return out;
}
async function saveState() { return saveDoc('state', S.state); }
async function saveLib() { return saveDoc('lib', { kind: 'lib', items: S.lib.slice(0, 80) }); }
function remember(foods) {
  foods.forEach(f => {
    const key = f.name.trim().toLowerCase();
    if (!key) return;
    const ex = S.lib.find(x => x.name.trim().toLowerCase() === key && (x.portion || '') === (f.portion || ''));
    if (ex) { Object.assign(ex, { kcal: f.kcal, lo: f.lo, hi: f.hi, p: f.p, c: f.c, f: f.f, sg: f.sg, fb: f.fb, na: f.na }); ex.n = (ex.n || 0) + 1; ex.last = Date.now(); }
    else S.lib.push({ name: f.name, portion: f.portion || '', kcal: f.kcal, lo: f.lo, hi: f.hi, p: f.p, c: f.c, f: f.f, sg: f.sg, fb: f.fb, na: f.na, n: 1, last: Date.now() });
  });
  S.lib.sort((a, b) => (b.n - a.n) || (b.last - a.last));
  S.lib = S.lib.slice(0, 80);
  saveLib();
}
async function setLang(l) {
  if (!LANGS[l]) return;
  LANG = l; document.documentElement.lang = l;
  LS.set('lang', l);
  S.state.lang = l;
  render();
  await saveState();
}

/* ---------- toast */
let toastTimer = null;
function toast(msg, action) {
  const el = $('#toast');
  el.innerHTML = '';
  const span = document.createElement('span'); span.textContent = msg; el.appendChild(span);
  if (action) {
    const b = document.createElement('button'); b.textContent = action.label || t('undo');
    b.onclick = () => { el.hidden = true; action.fn(); }; el.appendChild(b);
  }
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, action ? 6000 : 3800);
}

/* ---------- AI (sample) */
function aiErr(e) {
  switch (e && e.code) {
    case 'cancelled': return '';
    case 'not_granted': case 'sampling_disabled': case 'not_declared': case 'capability_disabled': case 'capability_removed':
      return t('ai_not_granted');
    case 'images_unavailable': return t('ai_no_images');
    case 'image_rejected': return t('ai_img_rejected');
    case 'rate_limited': return t('ai_rate');
    case 'session_expired': return t('ai_session');
    case 'refused': return t('ai_refused');
    case 'invalid_json': case 'empty_completion': return t('ai_incomplete');
    case 'prompt_too_large': return t('ai_too_long');
    case 'bad_key': return t('ai_key_bad');
    case 'no_credit': return t('ai_no_credit');
    case 'offline': return t('ai_offline');
    case 'network': return t('ai_network');
    case 'overloaded': return t('ai_overloaded');
    default: return t('ai_failed');
  }
}

function foodPrompt(text, nImg) {
  return [
    'Kamu ahli gizi yang paham makanan Indonesia dan internasional. Tugasmu memperkirakan energi dan makronutrien dari makanan yang dimakan pengguna.',
    nImg ? `Terlampir ${nImg} foto makanan/minuman. Kenali setiap item dan perkirakan porsinya dari petunjuk visual (ukuran piring, sendok, gelas, tangan).` : '',
    text ? `Deskripsi dari pengguna:\n"""${text.slice(0, 2000)}"""` : '',
    'Aturan:',
    '- Pecah menjadi item terpisah (nasi, lauk, sayur, sambal, kerupuk, minuman, dst).',
    '- Pakai data komposisi seperti TKPI (Tabel Komposisi Pangan Indonesia), USDA FoodData Central, atau label kemasan untuk produk bermerek.',
    '- Bila porsi tidak disebut, pakai porsi umum dan tulis porsinya.',
    '- Hitung minyak goreng, santan, gula di minuman, dan saus yang biasanya ada.',
    '- Model AI cenderung meremehkan porsi sedang dan besar. Untuk piring penuh atau porsi besar, perkirakan berat dengan hati-hati dan jangan mengecilkannya.',
    '- kcal_low dan kcal_high adalah rentang wajar karena ketidakpastian porsi dan resep.',
    '- sugar_g = gula total, fiber_g = serat pangan, sodium_mg = natrium (termasuk dari garam, kecap, MSG, saus).',
    `- Tulis nilai "name", "portion", dan "note" dalam ${LANGS[LANG].ai}.`,
    'Jawab HANYA dengan JSON seperti ini:',
    '{"items":[{"name":"Nasi putih","portion":"1 piring (±200 g)","grams":200,"kcal":260,"kcal_low":220,"kcal_high":320,"protein_g":5,"carb_g":57,"fat_g":0.5,"sugar_g":0.1,"fiber_g":0.6,"sodium_mg":2}],"note":"asumsi singkat, maksimal 2 kalimat"}',
  ].filter(Boolean).join('\n');
}

function shotPrompt(nImg) {
  return [
    `Terlampir ${nImg} screenshot dari aplikasi olahraga atau kesehatan (misalnya Strava, Hevy, Garmin Connect, Apple Fitness/Health, Samsung Health, Google Fit, Nike Run Club).`,
    `Hari ini tanggal ${today()} (zona waktu pengguna Asia/Jakarta). Tanggal yang sedang dibuka pengguna: ${S.date}.`,
    'Ekstrak data PERSIS seperti tertulis. Jangan menebak angka yang tidak terlihat: isi null.',
    '- Ubah satuan: mil → km, ft → m, durasi h:mm:ss → menit (desimal). Untuk lari/sepeda pakai moving time bila ada.',
    '- Ubah tanggal relatif ("Today", "Yesterday", "Hari ini", "Kemarin", "今日", "昨日") menjadi YYYY-MM-DD. Bila tanggal tidak terlihat sama sekali, isi null.',
    '- type salah satu: run, walk, hike, ride, swim, strength, strength_hard, hiit, yoga, sport, other.',
    '- Sesi gym/Hevy: strength_hard bila banyak set ditandai sampai gagal (F / failure), RPE ≥ 9, atau latihan berat gaya bodybuilding/powerlifting; selain itu strength (beberapa latihan, 8–15 repetisi).',
    '- kcal hanya bila aplikasi menampilkan kalori/energi aktif. Untuk sepeda yang hanya menampilkan kJ, isi kcal = kJ.',
    '- steps diisi bila aktivitas menampilkan jumlah langkah.',
    '- daily_steps diisi bila screenshot menunjukkan total langkah harian (bukan satu aktivitas).',
    '- Satu screenshot bisa berisi beberapa aktivitas (daftar feed). Masukkan semuanya.',
    'Jawab HANYA dengan JSON seperti ini:',
    '{"app":"Strava","activities":[{"type":"run","title":"Morning Run","date":"2026-10-22","start_time":"06:10","duration_min":42.5,"distance_km":7.21,"elev_gain_m":35,"avg_hr":152,"kcal":540,"steps":null}],"daily_steps":null}',
    'Bila ada langkah harian: "daily_steps":{"date":"2026-10-22","steps":9431}',
  ].join('\n');
}

const TYPE_KEYS = Object.keys(TYPES);
function cleanFood(it) {
  const kcal = Math.max(0, n0(it.kcal));
  let lo = n0(it.kcal_low), hi = n0(it.kcal_high);
  if (!(lo > 0) || lo > kcal) lo = Math.round(kcal * 0.8);
  if (!(hi > 0) || hi < kcal) hi = Math.round(kcal * 1.25);
  return {
    id: uid(), on: true, name: String(it.name || t('food_default')).slice(0, 80), portion: String(it.portion || '').slice(0, 60),
    grams: n0(it.grams) || null, kcal: Math.round(kcal), lo: Math.round(lo), hi: Math.round(hi),
    p: Math.round(n0(it.protein_g) * 10) / 10, c: Math.round(n0(it.carb_g) * 10) / 10, f: Math.round(n0(it.fat_g) * 10) / 10,
    sg: Math.round(n0(it.sugar_g) * 10) / 10, fb: Math.round(n0(it.fiber_g) * 10) / 10, na: Math.round(n0(it.sodium_mg)),
  };
}
function cleanAct(a) {
  const type = TYPE_KEYS.includes(a.type) ? a.type : 'other';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(a.date || '') && a.date <= today() ? a.date : S.date;
  return {
    id: uid(), on: true, type, title: String(a.title || typeLabel(type)).slice(0, 60), date,
    start: /^\d{1,2}:\d{2}$/.test(a.start_time || '') ? a.start_time : null,
    dur: nOrNull(a.duration_min), dist: nOrNull(a.distance_km), elev: nOrNull(a.elev_gain_m),
    hr: nOrNull(a.avg_hr), kcal: nOrNull(a.kcal), steps: nOrNull(a.steps), inSteps: true,
  };
}

async function runFoodAI() {
  const text = ($('#food-text') || {}).value || '';
  if (!text.trim() && !S.foodImgs.length) { toast(t('toast_food_need')); return; }
  const ctl = new AbortController();
  S.foodBusy = ctl; S.foodErr = ''; renderLog();
  try {
    const opts = { signal: ctl.signal };
    if (S.foodImgs.length) opts.images = S.foodImgs.map(x => x.file);
    const res = await S.sample.json(foodPrompt(text.trim(), S.foodImgs.length), opts);
    const items = Array.isArray(res && res.items) ? res.items.map(cleanFood).filter(x => x.kcal > 0) : [];
    if (!items.length) throw { code: 'empty_completion' };
    S.foodDraft = items; S.foodNote = String((res && res.note) || '').slice(0, 300);
  } catch (e) {
    S.foodErr = aiErr(e);
  } finally {
    S.foodBusy = null; renderLog();
  }
}

async function runShotAI() {
  if (!S.shotImgs.length) return;
  const ctl = new AbortController();
  S.shotBusy = ctl; S.shotErr = ''; renderLog();
  try {
    const res = await S.sample.json(shotPrompt(S.shotImgs.length), { signal: ctl.signal, images: S.shotImgs.map(x => x.file) });
    const acts = Array.isArray(res && res.activities) ? res.activities.map(cleanAct) : [];
    for (const a of acts) {
      const d = await getDay(a.date);
      a.dup = isDuplicate(a, d.acts);
      if (a.dup) a.on = false;
    }
    let steps = null;
    const ds = res && res.daily_steps;
    if (ds && n0(ds.steps) > 0) {
      const date = /^\d{4}-\d{2}-\d{2}$/.test(ds.date || '') && ds.date <= today() ? ds.date : S.date;
      steps = { on: true, date, count: Math.round(n0(ds.steps)), app: String((res && res.app) || '') };
    }
    if (!acts.length && !steps) throw { code: 'empty_completion' };
    acts.forEach(a => { a.app = String((res && res.app) || ''); });
    S.actDraft = acts; S.stepsDraft = steps;
  } catch (e) {
    S.shotErr = e && e.code === 'empty_completion' ? t('shot_none') : aiErr(e);
  } finally {
    S.shotBusy = null; renderLog();
  }
}

/* ---------- aksi data */
async function addFoods(items, date, meal) {
  const day = await getDay(date);
  const m = MEALS.includes(meal) ? meal : inferMeal(Date.now());
  const added = items.map(f => ({ id: uid(), meal: m, name: f.name, portion: f.portion || '', grams: f.grams || null, kcal: Math.round(n0(f.kcal)), lo: Math.round(n0(f.lo)), hi: Math.round(n0(f.hi)), p: n0(f.p), c: n0(f.c), f: n0(f.f), sg: n0(f.sg), fb: n0(f.fb), na: n0(f.na), t: Date.now() }));
  day.foods = day.foods.concat(added);
  await saveDay(day);
  remember(added);
  return added.map(a => a.id);
}
async function removeIds(date, field, ids) {
  const day = await getDay(date);
  day[field] = day[field].filter(x => !ids.includes(x.id));
  await saveDay(day);
}
async function addActs(acts) {
  const byDate = {};
  acts.forEach(a => { (byDate[a.date] = byDate[a.date] || []).push(a); });
  for (const date of Object.keys(byDate)) {
    const day = await getDay(date);
    day.acts = day.acts.concat(byDate[date].map(a => ({
      id: uid(), type: a.type, title: a.title, start: a.start || null, dur: a.dur, dist: a.dist, elev: a.elev, hr: a.hr,
      kcal: a.kcal, steps: a.steps, inSteps: a.inSteps !== false, app: a.app || '', t: Date.now(),
    })));
    await saveDay(day);
  }
}
async function setSteps(date, count, src) {
  const day = await getDay(date);
  day.steps = count > 0 ? { count: Math.round(count), src: src || 'manual' } : null;
  await saveDay(day);
}
async function setWeight(date, kg) {
  const day = await getDay(date);
  day.weight = kg > 0 ? Math.round(kg * 10) / 10 : null;
  await saveDay(day);
  if (kg > 0 && S.profile && date >= (S.profile.weightDate || '')) {
    S.profile.weight = kg; S.profile.weightDate = date;
    await saveDoc('profile', S.profile);
  }
}

/* ---------- kepala */
function renderSync() {
  const el = $('#sync');
  const n = S.mode === 'cloud' ? outboxCount() : 0;
  if (S.loadErr) { el.className = 'sync bad'; el.textContent = t('sync_offline'); return; }
  if (S.lsFailed) { el.className = 'sync bad'; el.textContent = t('sync_nosave'); return; }
  el.className = 'sync ' + (n ? 'local' : S.mode === 'cloud' ? 'cloud' : S.mode === 'local' ? 'local' : '');
  el.textContent = n ? t('sync_pending', { n }) : S.mode === 'cloud' ? t('sync_cloud') : S.mode === 'local' ? t('sync_local') : t('sync_loading');
}
function renderHeader() {
  document.querySelectorAll('[data-t]').forEach(el => { el.textContent = t(el.dataset.t); });
  document.querySelectorAll('[data-ta]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.ta)); });
  const showDate = S.view === 'today' || S.view === 'log';
  $('#datenav').hidden = !showDate;
  const tdy = today();
  $('#dateLbl').textContent = S.date === tdy ? t('w_Today') : S.date === addDays(tdy, -1) ? t('w_Yesterday') : longDate(S.date);
  const dp = $('#datePick'); dp.value = S.date; dp.max = tdy;
  $('#nextDay').disabled = S.date >= tdy;
  document.querySelectorAll('.tabs button').forEach(b => { if (b.dataset.view === S.view) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  ['today', 'log', 'cal', 'stats', 'prof'].forEach(v => { $('#v-' + v).hidden = v !== S.view; });
}
function profileReady() { const p = S.profile; return !!(p && n0(p.height) && n0(p.age) && n0(p.weight)); }
function langPicker() {
  return `<div class="langpick" role="group" aria-label="Bahasa · Language · 言語">${Object.entries(LANGS).map(([k, x]) => `<button data-act="lang" data-v="${k}" aria-pressed="${k === LANG}" lang="${k}">${esc(x.name)}</button>`).join('')}</div>`;
}
