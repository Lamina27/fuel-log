/* ---------- Cadangan & pulihkan
   File JSON: { app:'fuel-log', format:1, exported, profile, state, lib, days:[…] }.
   Pulihkan = GABUNG (tidak menghapus): item digabung per id, air diambil yang terbesar, berat/langkah yang ada
   di sini dipertahankan. File dari luar tidak dipercaya: setiap rekaman dibangun ulang dari daftar kolom yang
   diizinkan dengan tipe yang dipaksa (id dan tanggal masuk ke atribut HTML, jadi harus aman). */
const BK = {
  id: v => (typeof v === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(v)) ? v : uid(),
  s: (v, n) => (typeof v === 'string' ? v : v == null ? '' : String(v)).slice(0, n),
  n: v => { const x = Number(v); return Number.isFinite(x) ? x : 0; },
  nn: v => (v == null || v === '' || !Number.isFinite(Number(v))) ? null : Number(v),
  pos: v => Math.max(0, BK.n(v)),
  clamp: (v, lo, hi) => { const x = BK.nn(v); return x == null ? null : Math.min(hi, Math.max(lo, x)); },
  date: v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v),
  arr: (v, n) => Array.isArray(v) ? v.slice(0, n).filter(x => x && typeof x === 'object' && !Array.isArray(x)) : [],
};
function bkFood(f) {
  return Object.assign({ id: BK.id(f.id) }, MEALS.includes(f.meal) ? { meal: f.meal } : {}, {
    name: BK.s(f.name, 80) || t('food_default'), portion: BK.s(f.portion, 60), grams: BK.nn(f.grams),
    kcal: Math.round(BK.pos(f.kcal)), lo: Math.round(BK.pos(f.lo)), hi: Math.round(BK.pos(f.hi)),
    p: BK.pos(f.p), c: BK.pos(f.c), f: BK.pos(f.f), sg: BK.pos(f.sg), fb: BK.pos(f.fb), na: BK.pos(f.na), t: BK.nn(f.t),
  });
}
function bkAct(a) {
  return {
    id: BK.id(a.id), type: TYPE_KEYS.includes(a.type) ? a.type : 'other', title: BK.s(a.title, 60),
    start: typeof a.start === 'string' && /^\d{1,2}:\d{2}$/.test(a.start) ? a.start : null,
    dur: BK.clamp(a.dur, 0, 1440), dist: BK.clamp(a.dist, 0, 500), elev: BK.clamp(a.elev, 0, 10000), hr: BK.clamp(a.hr, 0, 250),
    kcal: BK.clamp(a.kcal, 0, 10000), steps: BK.clamp(a.steps, 0, 200000), inSteps: a.inSteps !== false, app: BK.s(a.app, 30), t: BK.nn(a.t),
  };
}
function bkDay(d) {
  if (!d || typeof d !== 'object' || !BK.date(d.date)) return null;
  const st = d.steps && BK.n(d.steps.count) > 0 ? { count: Math.round(BK.clamp(d.steps.count, 0, 200000)), src: BK.s(d.steps.src, 30) || 'manual' } : null;
  const w = BK.nn(d.weight);
  const out = {
    kind: 'day', date: d.date,
    foods: BK.arr(d.foods, 300).map(bkFood), acts: BK.arr(d.acts, 50).map(bkAct), steps: st,
    weight: w != null && w >= 20 && w <= 400 ? Math.round(w * 10) / 10 : null,
    water: Math.round(BK.clamp(d.water, 0, 20000) || 0),
    supps: BK.arr(d.supps, 50).map(s => ({ sid: BK.id(s.sid), name: BK.s(s.name, 40), dose: BK.s(s.dose, 30), kcal: BK.pos(s.kcal), p: BK.pos(s.p), t: BK.nn(s.t) })),
    fasts: BK.arr(d.fasts, 20).map(x => ({ id: BK.id(x.id), start: BK.pos(x.start), end: BK.pos(x.end), kind: x.kind === 'ibadah' ? 'ibadah' : 'if', target: BK.clamp(x.target, 1, 72) }))
      .filter(x => x.end > x.start),
    ibadah: !!d.ibadah,
  };
  if (d.recap && typeof d.recap.text === 'string' && d.recap.text.trim()) out.recap = { text: BK.s(d.recap.text, 1500), at: BK.nn(d.recap.at), lang: LANGS[d.recap.lang] ? d.recap.lang : null };
  return out;
}
function bkProfile(p) {
  if (!p || typeof p !== 'object') return null;
  const pick = (v, list, dflt) => list.includes(BK.n(v)) ? BK.n(v) : dflt;
  const out = {
    kind: 'profile', sex: p.sex === 'f' ? 'f' : 'm', age: BK.clamp(p.age, 12, 100), height: BK.clamp(p.height, 100, 250), weight: BK.clamp(p.weight, 25, 400),
    goal: pick(p.goal, [0, 250, 500, 750, 1000], 500), corr: pick(p.corr, [1.1, 1, 0.9, 0.8], DEFAULTS.corr), pal: pick(p.pal, [1.3, 1.4, 1.5, 1.6], DEFAULTS.pal),
    v: MODEL_VERSION, baseSteps: BK.clamp(p.baseSteps, 0, 10000) ?? DEFAULTS.baseSteps, fastTarget: BK.clamp(p.fastTarget, 1, 72) || 16,
    goalWeight: BK.clamp(p.goalWeight, 30, 300), vehicle: VEHICLES[p.vehicle] ? p.vehicle : 'airliner', water: BK.clamp(p.water, 500, 6000),
    weightDate: BK.date(p.weightDate) ? p.weightDate : null,
  };
  return out.age && out.height && out.weight ? out : null;
}
function bkState(s) {
  s = s && typeof s === 'object' ? s : {};
  return {
    kind: 'state',
    fast: s.fast && BK.n(s.fast.start) > 0 ? { start: BK.n(s.fast.start), kind: s.fast.kind === 'ibadah' ? 'ibadah' : 'if', target: BK.clamp(s.fast.target, 1, 72) } : null,
    supps: BK.arr(s.supps, 50).map(x => ({ id: BK.id(x.id), name: BK.s(x.name, 40), dose: BK.s(x.dose, 30), kcal: BK.pos(x.kcal), p: BK.pos(x.p) })).filter(x => x.name),
    containers: Array.isArray(s.containers) ? BK.arr(s.containers, 12).map(c => Object.assign({ id: BK.id(c.id) },
      typeof c.key === 'string' && /^c_[a-z]+$/.test(c.key) ? { key: c.key } : { label: BK.s(c.label, 24) || 'mL' }, { ml: Math.round(BK.clamp(c.ml, 10, 3000) || 250) })) : null,
    lang: LANGS[s.lang] ? s.lang : null,
  };
}
function bkLib(items) {
  return BK.arr(items, 80).map(x => ({ name: BK.s(x.name, 80), portion: BK.s(x.portion, 60), kcal: Math.round(BK.pos(x.kcal)), lo: Math.round(BK.pos(x.lo)), hi: Math.round(BK.pos(x.hi)),
    p: BK.pos(x.p), c: BK.pos(x.c), f: BK.pos(x.f), sg: BK.pos(x.sg), fb: BK.pos(x.fb), na: BK.pos(x.na), n: BK.n(x.n) || 1, last: BK.nn(x.last) })).filter(x => x.name.trim());
}
const dayHasData = d => d && ((d.foods || []).length || (d.acts || []).length || d.steps || d.weight || d.water || (d.supps || []).length || (d.fasts || []).length || d.recap);

function localDayKeys() {
  const out = [];
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^nk:d\d{4}-\d{2}-\d{2}$/.test(k)) out.push(k.slice(3)); } } catch (e) { /* tanpa akses */ }
  return out;
}
async function gatherAll() {
  const map = new Map();
  if (S.mode === 'cloud') {
    let last = '';
    for (let i = 0; i < 40; i++) {          // halaman 500 dokumen
      let q = col().where('kind', '==', 'day');
      if (last) q = q.where('date', '>', last);
      const snap = await q.orderBy('date').limit(500).get();
      snap.docs.forEach(s => { const d = thaw(s.data()); if (d && BK.date(d.date)) map.set(d.date, d); });
      if (snap.size < 500) break;
      last = map.size ? [...map.keys()].sort().pop() : '';
    }
  } else {
    localDayKeys().forEach(k => { const d = LS.get(k); if (d && BK.date(d.date)) map.set(d.date, d); });
  }
  S.days.forEach((d, k) => map.set(k, d));    // yang ada di memori paling baru
  const days = [...map.values()].filter(dayHasData).map(bkDay).filter(Boolean).sort((a, b) => a.date < b.date ? -1 : 1);
  return { app: 'fuel-log', format: 1, exported: new Date().toISOString(), profile: S.profile, state: S.state, lib: { kind: 'lib', items: S.lib }, days };
}
async function exportBackup() {
  if (S.backupBusy) return;
  S.backupBusy = true;
  try {
    const data = await gatherAll();
    const txt = JSON.stringify(data);
    const name = `fuel-log-backup-${today()}.json`;
    if (S.downloads) await S.downloads.save({ filename: name, data: txt });
    else {
      const url = URL.createObjectURL(new Blob([txt], { type: 'application/json' }));
      const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
    S.state.lastBackup = Date.now(); await saveState();
    toast(t('toast_backup_saved', { n: data.days.length }));
    if (S.view === 'prof') renderProf(); else if (S.view === 'today') renderToday();
  } catch (e) {
    if (!(e && e.code === 'declined')) toast(t('toast_backup_fail'));
  } finally { S.backupBusy = false; }
}
async function readBackup(file) {
  S.restore = null;
  try {
    if (!file || file.size > 25e6) throw new Error('size');
    const raw = JSON.parse(await file.text());
    if (!raw || raw.app !== 'fuel-log' || !Array.isArray(raw.days)) throw new Error('format');
    const days = raw.days.slice(0, 5000).map(bkDay).filter(Boolean);
    const profile = bkProfile(raw.profile);
    if (!days.length && !profile) throw new Error('empty');
    const ds = days.map(d => d.date).sort();
    S.restore = { days, profile, state: bkState(raw.state), lib: bkLib(raw.lib && raw.lib.items), from: ds[0] || null, to: ds[ds.length - 1] || null };
  } catch (e) { toast(t('restore_bad')); }
  renderProf();
}
function mergeDay(cur, bak) {
  if (!dayHasData(cur)) return bak;
  const byKey = (a, b, k) => { const seen = new Set((a || []).map(x => x[k])); return (a || []).concat((b || []).filter(x => !seen.has(x[k]))); };
  return Object.assign({}, cur, {
    foods: byKey(cur.foods, bak.foods, 'id'), acts: byKey(cur.acts, bak.acts, 'id'),
    supps: byKey(cur.supps, bak.supps, 'sid'), fasts: byKey(cur.fasts, bak.fasts, 'id'),
    steps: cur.steps || bak.steps, weight: cur.weight || bak.weight, water: Math.max(n0(cur.water), n0(bak.water)),
    ibadah: !!(cur.ibadah || bak.ibadah), recap: cur.recap || bak.recap,
  });
}
async function restoreBackup() {
  const R = S.restore; if (!R || S.restoring) return;
  const n = R.days.length;
  S.restoring = { i: 0, n }; renderProf();
  try {
    if (R.profile && !profileReady()) { S.profile = R.profile; await saveDoc('profile', S.profile); }
    const st = S.state, bs = R.state;
    const supps = (st.supps || []).concat((bs.supps || []).filter(x => !(st.supps || []).some(y => y.id === x.id)));
    const stale = bs.fast && Date.now() - bs.fast.start > 72 * 36e5;
    S.state = Object.assign({}, st, { supps, containers: st.containers || bs.containers, fast: st.fast || (stale ? null : bs.fast), lang: st.lang || bs.lang });
    await saveState();
    const key = x => x.name.trim().toLowerCase() + '|' + (x.portion || '');
    const have = new Set(S.lib.map(key));
    S.lib = S.lib.concat(R.lib.filter(x => !have.has(key(x)))).slice(0, 80);
    await saveLib();
    for (let i = 0; i < n; i++) {
      const bak = R.days[i];
      const cur = await getDay(bak.date);
      const merged = mergeDay(cur, bak);
      if (!same(merged, cur)) await saveDay(Object.assign(blankDay(bak.date), merged));
      S.restoring.i = i + 1;
      if (i % 5 === 4 || i === n - 1) { const el = document.getElementById('restore-prog'); if (el) el.textContent = t('restoring', { i: i + 1, n }); }
    }
    S.months.clear(); S.ranges.clear();
    toast(t('toast_restored', { n }));
  } catch (e) { toast(t('err_generic', { m: String((e && (e.message || e.code)) || e).slice(0, 80) })); }
  S.restoring = null; S.restore = null;
  render();
}
function backupCard() {
  const lb = S.state && S.state.lastBackup;
  const R = S.restore, busy = S.restoring;
  return `
    <div class="card">
      <h2>${t('backup_t')}</h2>
      <p class="hint">${t(S.mode === 'cloud' ? 'backup_hint_cloud' : 'backup_hint_local')} ${lb ? t('backup_last', { d: esc(longDate(isoOf(new Date(lb)))) }) : t('backup_never')}</p>
      <div class="row">
        <button class="btn" data-act="backup"${busy ? ' disabled' : ''}>${t('backup_save')}</button>
        <label class="btn" for="restore-file"${busy ? ' aria-disabled="true"' : ''}>${t('backup_restore')}</label>
        <input type="file" id="restore-file" accept="application/json,.json" hidden${busy ? ' disabled' : ''}>
      </div>
      ${R ? `<div class="note">
        ${R.days.length ? t('restore_confirm', { n: fi(R.days.length), from: esc(shortDate(R.from)), to: esc(shortDate(R.to)) }) : ''}
        ${R.profile && !profileReady() ? ' ' + t('restore_profile') : ''}
        <div class="row" style="margin-top:8px">
          ${busy ? `<span class="status"><span class="busy"></span><span id="restore-prog">${t('restoring', { i: busy.i, n: busy.n })}</span></span>`
            : `<button class="btn primary" data-act="restoreGo">${t('restore_go')}</button><button class="btn" data-act="restoreCancel">${t('restore_cancel')}</button>`}
        </div>
      </div>` : ''}
    </div>`;
}
// Pengingat lembut di Hari ini untuk penyimpanan perangkat: ≥ 7 hari tercatat dan belum dicadangkan 14 hari.
function backupNudge() {
  if (S.mode !== 'local' || !profileReady()) return '';
  const lb = S.state && S.state.lastBackup;
  if (lb && Date.now() - lb < 14 * 864e5) return '';
  if (localDayKeys().length < 7) return '';
  return `<div class="note info">${t('backup_nudge')} <button class="btn small" data-act="backup">${t('backup_save')}</button></div>`;
}
