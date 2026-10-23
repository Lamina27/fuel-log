/* ---------- gambar */
function addImgs(kind, files) {
  const list = kind === 'food' ? S.foodImgs : S.shotImgs;
  const max = (S.img && S.img.maxCount) || 4;
  const maxBytes = (S.img && S.img.maxInputBytes) || 20e6;
  let skipped = 0;
  Array.from(files || []).forEach(f => {
    if (!/^image\//.test(f.type) || f.size > maxBytes || list.length >= max) { skipped++; return; }
    list.push({ file: f, url: URL.createObjectURL(f) });
  });
  if (skipped) toast(t('toast_skipped', { n: skipped, max }));
  if (kind === 'food') { S.foodText = ($('#food-text') || {}).value || S.foodText; }
  renderLog();
}
const dayTxt = d => d === today() ? t('w_today') : shortDate(d);

/* ---------- event */
document.addEventListener('click', async ev => {
  const nav = ev.target.closest('.tabs button[data-view]');
  if (nav) { S.view = nav.dataset.view; render(); window.scrollTo(0, 0); return; }
  const b = ev.target.closest('[data-act]');
  if (!b) return;
  const act = b.dataset.act;
  if (act === 'go') { S.view = b.dataset.v; if (b.dataset.tab) S.logTab = b.dataset.tab; if (b.dataset.meal) S.meal = b.dataset.meal; render(); window.scrollTo(0, 0); }
  else if (act === 'lang') setLang(b.dataset.v);
  else if (act === 'pickMeal') { S.foodText = ($('#food-text') || {}).value || S.foodText || ''; S.meal = b.dataset.v; renderLog(); }
  else if (act === 'logTab') { if (S.logTab === 'food') S.foodText = ($('#food-text') || {}).value || ''; S.logTab = b.dataset.v; renderLog(); }
  else if (act === 'delFood' || act === 'delAct') {
    const field = act === 'delFood' ? 'foods' : 'acts';
    const day = await getDay(S.date);
    const item = day[field].find(x => x.id === b.dataset.id);
    if (!item) return;
    const date = S.date;
    await removeIds(date, field, [item.id]);
    renderToday();
    toast(t('toast_deleted', { x: item.name || item.title || 'Item' }), { fn: async () => { const d = await getDay(date); d[field].push(item); await saveDay(d); if (S.date === date) renderToday(); } });
  }
  else if (act === 'runFood') { S.foodText = ($('#food-text') || {}).value || ''; runFoodAI(); }
  else if (act === 'stopFood') { S.foodBusy && S.foodBusy.abort(); }
  else if (act === 'runShot') runShotAI();
  else if (act === 'stopShot') { S.shotBusy && S.shotBusy.abort(); }
  else if (act === 'rmImg') {
    const list = b.dataset.kind === 'food' ? S.foodImgs : S.shotImgs;
    const [x] = list.splice(Number(b.dataset.i), 1); if (x) URL.revokeObjectURL(x.url);
    if (b.dataset.kind === 'food') S.foodText = ($('#food-text') || {}).value || '';
    renderLog();
  }
  else if (act === 'saveFood') {
    const items = (S.foodDraft || []).filter(x => x.on && n0(x.kcal) > 0);
    if (!items.length) { toast(t('toast_check_one')); return; }
    const date = S.date;
    const ids = await addFoods(items, date, S.meal);
    S.foodDraft = null; S.foodNote = ''; S.foodText = '';
    S.foodImgs.forEach(x => URL.revokeObjectURL(x.url)); S.foodImgs = [];
    S.view = 'today'; render(); window.scrollTo(0, 0);
    toast(t('toast_items_added', { n: items.length }), { fn: async () => { await removeIds(date, 'foods', ids); render(); } });
  }
  else if (act === 'clearFood') { S.foodDraft = null; S.foodNote = ''; renderLog(); }
  else if (act === 'libAdd') {
    const x = S.lib[Number(b.dataset.i)]; if (!x) return;
    const date = S.date;
    const ids = await addFoods([x], date, S.meal);
    toast(t('toast_lib_added', { x: x.name, k: fi(x.kcal), u: K() }), { fn: async () => { await removeIds(date, 'foods', ids); render(); } });
  }
  else if (act === 'manualFood') {
    const name = $('#m-name').value.trim(); const kcal = nOrNull($('#m-kcal').value);
    if (!name || !(kcal > 0)) { toast(t('toast_name_kcal')); return; }
    const date = S.date;
    await addFoods([{ name, portion: $('#m-portion').value.trim(), kcal, lo: kcal, hi: kcal }], date, S.meal);
    $('#m-name').value = ''; $('#m-kcal').value = ''; $('#m-portion').value = '';
    toast(t('toast_added', { x: name }));
  }
  else if (act === 'saveShot') {
    const acts = (S.actDraft || []).filter(a => a.on);
    const sd = S.stepsDraft && S.stepsDraft.on ? S.stepsDraft : null;
    if (!acts.length && !sd) { toast(t('toast_check_row')); return; }
    if (acts.length) await addActs(acts);
    if (sd && sd.count > 0) await setSteps(sd.date, sd.count, sd.app || 'screenshot');
    S.actDraft = null; S.stepsDraft = null;
    S.shotImgs.forEach(x => URL.revokeObjectURL(x.url)); S.shotImgs = [];
    const dates = [...new Set(acts.map(a => a.date).concat(sd ? [sd.date] : []))];
    if (dates.length === 1) S.date = dates[0];
    await getDay(S.date);
    S.view = 'today'; render(); window.scrollTo(0, 0);
    toast(t(sd ? 'toast_saved_acts_steps' : 'toast_saved_acts', { n: acts.length }));
  }
  else if (act === 'clearShot') { S.actDraft = null; S.stepsDraft = null; renderLog(); }
  else if (act === 'manualAct') {
    const type = $('#a-type').value;
    const a = {
      type, title: typeLabel(type), date: S.date,
      dur: nOrNull($('#a-dur').value), dist: nOrNull($('#a-dist').value), elev: nOrNull($('#a-elev').value),
      hr: nOrNull($('#a-hr').value), kcal: nOrNull($('#a-kcal').value), steps: null, inSteps: true,
    };
    if (!(a.dur > 0) && !(a.dist > 0)) { toast(t('toast_dur_dist')); return; }
    await addActs([a]);
    ['#a-dur', '#a-dist', '#a-elev', '#a-hr', '#a-kcal'].forEach(s => { $(s).value = ''; });
    toast(t('toast_act_added', { x: a.title, d: dayTxt(S.date) }));
  }
  else if (act === 'month') {
    const [y, m] = S.month.split('-').map(Number);
    const d = new Date(y, m - 1 + Number(b.dataset.d), 1);
    const ym = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    if (ym > ymOf(today())) return;
    S.month = ym; renderStats();
  }
  else if (act === 'openDay') { closeSheet(); S.date = b.dataset.d; await getDay(S.date); S.view = 'today'; render(); window.scrollTo(0, 0); }
  else if (act === 'saveProf') {
    const p = {
      kind: 'profile', sex: $('#p-sex').value, age: nOrNull($('#p-age').value), height: nOrNull($('#p-height').value),
      weight: nOrNull($('#p-weight').value), goal: Number($('#p-goal').value), corr: Number($('#p-corr').value), pal: Number($('#p-pal').value), v: MODEL_VERSION,
      baseSteps: nOrNull($('#p-base').value) ?? DEFAULTS.baseSteps, fastTarget: (S.profile && S.profile.fastTarget) || 16, goalWeight: nOrNull($('#p-goalw').value), vehicle: (S.profile && S.profile.vehicle) || 'airliner',
      water: (v => (v && v !== waterTarget({ sex: $('#p-sex').value }) ? v : null))(nOrNull($('#p-water').value)), weightDate: (S.profile && S.profile.weightDate) || today(),
    };
    if (!(p.age >= 12 && p.age <= 100) || !(p.height >= 100 && p.height <= 250) || !(p.weight >= 25 && p.weight <= 400)) {
      toast(t('toast_check_profile')); return;
    }
    const first = !profileReady();
    S.profile = p; S.months.clear(); S.ranges.clear();
    await saveDoc('profile', p);
    toast(t('toast_profile_saved'));
    if (first) { S.view = 'today'; render(); } else renderProf();
  }
  else if (act === 'water') {
    const day = await getDay(S.date);
    const ml = Number(b.dataset.ml);
    day.water = Math.max(0, n0(day.water) + ml);
    S.days.set(day.date, day); renderToday();
    queueDaySave(day);
    toast(t('toast_water', { x: fi(ml) }), { fn: () => { const d = S.days.get(day.date) || day; d.water = Math.max(0, n0(d.water) - ml); renderToday(); queueDaySave(d); } });
  }
  else if (act === 'addCont') {
    const label = $('#w-name').value.trim(); const ml = Math.round(n0($('#w-ml').value));
    if (!label || !(ml >= 10 && ml <= 3000)) { toast(t('toast_cont_need')); return; }
    S.state.containers = containers().concat([{ id: uid(), label: label.slice(0, 24), ml }]).sort((x, y) => x.ml - y.ml);
    await saveState(); renderToday(); toast(t('toast_cont_added', { x: label, ml: fi(ml) }));
  }
  else if (act === 'delCont') {
    const list = containers(); const c = list.find(x => x.id === b.dataset.id); if (!c) return;
    if (list.length <= 1) { toast(t('toast_cont_keep')); return; }
    S.state.containers = list.filter(x => x.id !== c.id);
    await saveState(); renderToday();
    toast(t('toast_deleted', { x: contLabel(c) }), { fn: async () => { S.state.containers = containers().concat([c]).sort((x, y) => x.ml - y.ml); await saveState(); renderToday(); } });
  }
  else if (act === 'toggleSupp') {
    const s = (S.state.supps || []).find(x => x.id === b.dataset.id); if (!s) return;
    const day = await getDay(S.date);
    const has = (day.supps || []).some(x => x.sid === s.id);
    day.supps = has ? day.supps.filter(x => x.sid !== s.id) : (day.supps || []).concat([{ sid: s.id, name: s.name, dose: s.dose || '', kcal: n0(s.kcal), p: n0(s.p), t: Date.now() }]);
    renderToday(); await saveDay(day);
  }
  else if (act === 'addSupp') {
    const name = $('#s-name').value.trim();
    if (!name) { toast(t('toast_supp_name')); return; }
    S.state.supps = (S.state.supps || []).concat([{ id: uid(), name: name.slice(0, 40), dose: $('#s-dose').value.trim().slice(0, 30), kcal: Math.max(0, n0($('#s-kcal').value)), p: Math.max(0, n0($('#s-p').value)) }]);
    await saveState(); renderToday(); toast(t('toast_supp_added', { x: name }));
  }
  else if (act === 'delSupp') {
    const s = (S.state.supps || []).find(x => x.id === b.dataset.id); if (!s) return;
    S.state.supps = S.state.supps.filter(x => x.id !== s.id);
    await saveState(); renderToday();
    toast(t('toast_supp_deleted', { x: s.name }), { fn: async () => { S.state.supps.push(s); await saveState(); renderToday(); } });
  }
  else if (act === 'startFast') {
    let kind = $('#fast-kind').value;
    if (kind === 'custom') {
      const hcus = nOrNull($('#fast-custom').value);
      if (!(hcus >= 1 && hcus <= 72)) { toast(t('toast_fast_range')); return; }
      kind = String(hcus);
    }
    const [hh, mm] = ($('#fast-start').value || '').split(':').map(Number);
    const d = new Date(); if (Number.isFinite(hh)) d.setHours(hh, mm || 0, 0, 0);
    if (d.getTime() > Date.now()) d.setDate(d.getDate() - 1);
    S.state.fast = { start: d.getTime(), kind: kind === 'ibadah' ? 'ibadah' : 'if', target: kind === 'ibadah' ? null : Number(kind) };
    if (kind === 'ibadah') { const day = await getDay(isoOf(d)); day.ibadah = true; await saveDay(day); }
    else if (S.profile.fastTarget !== Number(kind)) { S.profile.fastTarget = Number(kind); saveDoc('profile', S.profile); }
    await saveState(); renderToday(); toast(t('toast_fast_started'));
  }
  else if (act === 'endFast' || act === 'cancelFast') {
    const f = S.state.fast; if (!f) return;
    S.state.fast = null;
    if (act === 'endFast') {
      const [hh, mm] = ($('#fast-end').value || '').split(':').map(Number);
      const d = new Date(); if (Number.isFinite(hh)) d.setHours(hh, mm || 0, 0, 0);
      if (d.getTime() > Date.now()) d.setDate(d.getDate() - 1);
      const end = Math.max(f.start + 60000, d.getTime());
      const day = await getDay(isoOf(new Date(end)));
      day.fasts = (day.fasts || []).concat([{ id: uid(), start: f.start, end, kind: f.kind, target: f.target }]);
      await saveDay(day);
      const h = (end - f.start) / 36e5;
      toast(t(f.target && h >= f.target ? 'toast_fast_done_hit' : 'toast_fast_done', { x: durTxt(h) }));
    } else toast(t('toast_fast_cancelled'), { fn: async () => { S.state.fast = f; await saveState(); renderToday(); } });
    await saveState(); renderToday();
  }
  else if (act === 'delFast') {
    const day = await getDay(S.date);
    const x = (day.fasts || []).find(y => y.id === b.dataset.id); if (!x) return;
    day.fasts = day.fasts.filter(y => y.id !== x.id); await saveDay(day); renderToday();
    toast(t('toast_fast_deleted'), { fn: async () => { const d = await getDay(S.date); d.fasts.push(x); await saveDay(d); renderToday(); } });
  }
  else if (act === 'vehicle') {
    if (!S.profile || S.profile.vehicle === b.dataset.v) return;
    S.profile.vehicle = b.dataset.v;
    document.querySelectorAll('.vpick button').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.v === b.dataset.v)));
    const box = document.querySelector('#v-today .flightbox');
    if (box) {
      const day = S.days.get(S.date) || blankDay(S.date);
      box.outerHTML = vehicleHero(calcDay(day, S.profile, dayFrac(S.date)), S.date === today());
    } else renderToday();
    saveDoc('profile', S.profile);
  }
  else if (act === 'openSummary') openSummary(b.dataset.d);
  else if (act === 'closeSheet') closeSheet();
  else if (act === 'sumImg') exportSummary(b.dataset.d);
  else if (act === 'sumRecap') runRecap(b.dataset.d);
  else if (act === 'stopRecap') { S.recapBusy && S.recapBusy.ctl.abort(); }
  else if (act === 'calMonth') {
    const [y, m] = S.calMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + Number(b.dataset.d), 1);
    const ym = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    if (ym > ymOf(today())) return;
    S.calMonth = ym; renderCal();
  }
  else if (act === 'calMetric') { S.calMetric = b.dataset.v; renderCal(); }
  else if (act === 'calSel') { S.calSel = b.dataset.d; renderCal(); }
  else if (act === 'statsTab') { S.statsTab = b.dataset.v; renderStats(); }
  else if (act === 'chartMetric') { S.chartMetric = b.dataset.v; renderStats(); }
  else if (act === 'chartPeriod') { S.chartPeriod = b.dataset.v; renderStats(); }
  else if (act === 'nutPeriod') { S.nutPeriod = b.dataset.v; renderStats(); }
  else if (act === 'nutView') { S.nutView = b.dataset.v; renderStats(); }
  else if (act === 'nutNav') {
    const k = Number(b.dataset.d), a0 = S.nutAnchor;
    let nx;
    if (S.nutPeriod === 'd') nx = addDays(a0, k);
    else if (S.nutPeriod === 'w') nx = addDays(weekStart(a0), 7 * k);
    else { const [y, m] = a0.split('-').map(Number); const d = new Date(y, m - 1 + k, 1); nx = isoOf(d); }
    if (nx > today()) return;
    S.nutAnchor = nx; renderStats();
  }
  else if (act === 'csv') exportCsv();
  else if (act === 'retryLoad') { S.loadErr = false; S.mode = 'loading'; renderSync(); init(); }
  else if (act === 'actType') {
    const v = b.dataset.v; if (!TYPES[v]) return;
    const date = S.date, day = await getDay(date);
    const a = day.acts.find(x => x.id === b.dataset.id); if (!a) return;
    const prev = a.type; a.type = v;
    await saveDay(day); renderToday();
    toast(t('toast_act_type', { x: typeLabel(v) }), { fn: async () => { const d = await getDay(date); const y = d.acts.find(x => x.id === a.id); if (y) { y.type = prev; await saveDay(d); if (S.date === date) renderToday(); } } });
  }
  else if (act === 'aiKeySave') saveApiKey();
  else if (act === 'aiKeyDel') deleteApiKey();
  else if (act === 'backup') exportBackup();
  else if (act === 'restoreGo') restoreBackup();
  else if (act === 'restoreCancel') { S.restore = null; renderProf(); }
});

document.addEventListener('change', async ev => {
  const el = ev.target;
  if (el.id === 'water-set') { const day = await getDay(S.date); day.water = Math.max(0, Math.round(n0(el.value))); await saveDay(day); renderToday(); toast(t('toast_water_set', { x: fi(day.water) })); return; }
  if (el.id === 'fast-kind') { const w = $('#fast-custom-wrap'); if (w) w.hidden = el.value !== 'custom'; return; }
  if (el.id === 'steps-in') { const v = nOrNull(el.value); await setSteps(S.date, v || 0, 'manual'); renderToday(); return; }
  if (el.id === 'weight-in') {
    const v = nOrNull(el.value);
    if (v != null && (v < 20 || v > 400)) { toast(t('toast_weight_range')); return; }
    await setWeight(S.date, v || 0); renderToday(); toast(v ? t('toast_weight_set', { x: f1(v) }) : t('toast_weight_del')); return;
  }
  if (el.id === 'datePick' && el.value) { S.date = el.value > today() ? today() : el.value; await getDay(S.date); render(); return; }
  if (el.id === 'restore-file') { const f = el.files && el.files[0]; el.value = ''; if (f) readBackup(f); return; }
  if (el.id === 'food-img') { addImgs('food', el.files); el.value = ''; return; }
  if (el.id === 'shot-img') { addImgs('shot', el.files); el.value = ''; return; }
  if (el.dataset.fd != null) {
    const x = S.foodDraft[Number(el.dataset.fd)]; const k = el.dataset.k;
    if (k === 'on') x.on = el.checked;
    else if (k === 'kcal') {
      const v = Math.max(0, n0(el.value)); const ratio = x.kcal > 0 ? v / x.kcal : 1;
      ['p', 'c', 'f', 'sg', 'fb'].forEach(q => { x[q] = Math.round(n0(x[q]) * ratio * 10) / 10; }); x.na = Math.round(n0(x.na) * ratio);
      x.lo = Math.round(x.lo * ratio); x.hi = Math.round(x.hi * ratio); x.kcal = Math.round(v);
    } else x[k] = el.value;
    S.foodText = ($('#food-text') || {}).value || S.foodText;
    renderLog(); return;
  }
  if (el.dataset.ad != null) {
    const a = S.actDraft[Number(el.dataset.ad)]; const k = el.dataset.k;
    if (k === 'on') a.on = el.checked;
    else if (k === 'type' || k === 'title') a[k] = el.value;
    else if (k === 'date') { a.date = el.value || S.date; const d = await getDay(a.date); a.dup = isDuplicate(a, d.acts); }
    else a[k] = nOrNull(el.value);
    renderLog(); return;
  }
  if (el.dataset.sd != null) {
    const sd = S.stepsDraft; const k = el.dataset.sd;
    if (k === 'on') sd.on = el.checked; else if (k === 'date') sd.date = el.value || S.date; else sd.count = Math.round(n0(el.value));
    renderLog();
  }
});
document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape' && !$('#sheet').hidden) { closeSheet(); return; }
  if (ev.key === 'Enter' && (ev.target.id === 'steps-in' || ev.target.id === 'weight-in')) ev.target.blur();
});
['dragover', 'dragleave', 'drop'].forEach(type => document.addEventListener(type, ev => {
  const z = ev.target.closest && ev.target.closest('[data-drop]');
  if (!z) return;
  ev.preventDefault();
  z.classList.toggle('over', type === 'dragover');
  if (type === 'drop') addImgs(z.dataset.drop, ev.dataTransfer.files);
}));
document.addEventListener('paste', ev => {
  if (S.view !== 'log') return;
  const files = Array.from(ev.clipboardData && ev.clipboardData.files || []).filter(f => /^image\//.test(f.type));
  if (!files.length || !S.img) return;
  ev.preventDefault();
  addImgs(S.logTab === 'food' ? 'food' : 'shot', files);
});
$('#prevDay').onclick = async () => { S.meal = null; S.date = addDays(S.date, -1); await getDay(S.date); render(); };
$('#nextDay').onclick = async () => { if (S.date >= today()) return; S.meal = null; S.date = addDays(S.date, 1); await getDay(S.date); render(); };

/* ---------- ekspor */
async function exportCsv() {
  const days = await loadMonth(S.month);
  const head = t('csv_head');
  const lines = days.map(d => { const r = calcDay(d, S.profile); if (!r) return null;
    return [d.date, Math.round(r.intake), ...MEALS.map(k => Math.round(r.byMeal[k].kcal)), Math.round(r.suppKcal), Math.round(r.sigma), Math.round(r.out), r.logged ? Math.round(r.balance) : '', Math.round(r.base), r.rawSteps || '', Math.round(r.stepKcal), Math.round(r.exKcal), r.water || '', r.fastH ? raw1(r.fastH) : '', d.weight || '', raw1(r.protein), raw1(r.carb), raw1(r.fat)].join(','); }).filter(Boolean);
  try { await S.downloads.save({ filename: `fuel-log-${S.month}.csv`, data: [head].concat(lines).join('\n') }); toast(t('toast_csv_saved')); }
  catch (e) { if (e && e.code !== 'declined') toast(t('toast_dl_unavail')); }
}

/* ---------- mulai */
async function init() {
  const saved = LS.get('lang');
  LANG = LANGS[saved] ? saved : detectLang();
  document.documentElement.lang = LANG;
  renderHeader(); renderSync();
  const use = n => (window.claude && typeof window.claude.use === 'function') ? window.claude.use(n).catch(() => null) : Promise.resolve(null);
  // AI & unduhan tidak boleh menahan data tampil: tunggu sebentar, sisanya menyusul.
  const quick = (p, ms) => Promise.race([p, new Promise(r => setTimeout(() => r(undefined), ms))]);
  const setSample = async s => {
    S.sample = s || null; S.img = null;
    if (s && typeof s.limits === 'function') { try { const l = await s.limits(); S.img = (l && l.images) || null; } catch (e) { S.img = null; } }
  };
  const pSample = use('sample'), pDl = use('downloads');
  const [db, user] = await Promise.all([use('db'), use('user')]);
  const [sample, downloads] = await Promise.all([quick(pSample, 1500), quick(pDl, 1500)]);
  await setSample(sample);
  S.downloads = downloads || null;
  if (sample === undefined) pSample.then(async s => { if (!s) return; await setSample(s); if (S.mode !== 'loading') render(); });
  if (downloads === undefined) pDl.then(d => { if (!d) return; S.downloads = d; if (S.mode !== 'loading') render(); });
  if (!S.sample && STANDALONE) await useApiSample();   // versi offline: AI lewat API key sendiri bila ada
  const id = user ? await user.id() : null;
  if (db && id) { S.db = db; S.uid = id; S.mode = 'cloud'; } else { S.mode = 'local'; S.localWhy = 'nodb'; }
  // Pengunjung link publik tidak boleh menulis ke akun: pakai simpanan perangkat sejak awal.
  if (S.mode === 'cloud') {
    let owner = false, canWrite = null;
    try { owner = await user.isOwner(); } catch (e) { owner = false; }
    if (!owner) { try { canWrite = await user.can('data.write'); } catch (e) { canWrite = null; } }
    S.isOwner = owner;
    const known = LS.get('mode');
    if (!owner && (canWrite === false || known === 'local')) { S.mode = 'local'; S.localWhy = 'nowrite'; }
    else if (owner || canWrite === true) LS.set('mode', 'cloud');
    else if (known !== 'cloud') {
      // Izin tidak diketahui (mis. pengunjung link publik): uji sekali dengan satu dokumen kecil.
      try { await col().doc('probe').set({ kind: 'probe', at: Date.now() }); LS.set('mode', 'cloud'); }
      catch (e) { if (e && (e.code === 'invalid_argument' || e.code === 'not_granted' || e.code === 'revoked')) { S.mode = 'local'; S.localWhy = 'nowrite'; LS.set('mode', 'local'); } }
    }
  }
  try { S.profile = await loadDoc('profile'); }
  catch (e) {
    if (S.mode === 'cloud' && S.isOwner) {
      // Pemilik: jangan diam-diam pindah ke penyimpanan perangkat (catatan akan terpisah dari akun).
      try { await new Promise(r => setTimeout(r, 1200)); S.profile = await loadDoc('profile'); }
      catch (e2) { S.loadErr = true; S.mode = 'cloud'; render(); return; }
    } else { S.mode = 'local'; S.localWhy = 'nodb'; S.profile = LS.get('profile'); }
  }
  if (S.mode === 'cloud' && !S.profile && LS.get('profile') && LS.get('mode') === 'local') { S.mode = 'local'; S.localWhy = 'nowrite'; S.profile = LS.get('profile'); }
  if (S.profile && (S.profile.v || 1) < MODEL_VERSION) {
    S.profile = Object.assign({}, S.profile, { pal: DEFAULTS.pal, corr: DEFAULTS.corr, baseSteps: DEFAULTS.baseSteps, v: MODEL_VERSION });
    saveDoc('profile', S.profile);
    S.migrated = true;
  }
  try { const lib = await loadDoc('lib'); S.lib = (lib && lib.items) || []; } catch (e) { S.lib = []; }
  try { const st = await loadDoc('state'); if (st) S.state = Object.assign({ kind: 'state', fast: null, supps: [], containers: null, lang: null }, st); } catch (e) { /* bawaan */ }
  if (S.state.lang && LANGS[S.state.lang]) LANG = S.state.lang;
  else if (!saved && S.isOwner && S.profile) LANG = 'id';
  LS.set('lang', LANG);
  await getDay(S.date);
  const queued = S.mode === 'cloud' ? applyOutbox() : 0;
  render();
  if (S.migrated) toast(t('toast_migrated'));
  if (queued) flushOutbox();
}
// kembali ke halaman / online lagi: kirim antrean, pastikan langganan hidup, segarkan bila ada perubahan
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { flushDayTimers(); return; }
  if (S.mode !== 'cloud') return;
  syncWatch(); flushOutbox();
  if (S.liveStale) liveRender();
});
window.addEventListener('pagehide', flushDayTimers);
window.addEventListener('online', () => flushOutbox());
document.addEventListener('focusout', () => setTimeout(() => { if (S.liveStale) liveRender(); }, 50));
// galat tak tertangkap (mis. di handler async) jangan diam-diam: tampilkan singkat
let lastErrAt = 0;
function showErr(e) {
  if (e && e.name === 'AbortError') return;
  try { console.error(e); } catch (x) {}
  const now = Date.now(); if (now - lastErrAt < 3000) return; lastErrAt = now;
  const m = String((e && (e.message || e.code)) || e || '?').slice(0, 90);
  try { toast(t('err_generic', { m })); } catch (x) {}
}
window.addEventListener('unhandledrejection', ev => showErr(ev.reason));
window.addEventListener('error', ev => { if (ev.error || ev.message) showErr(ev.error || ev.message); });

init();
// Versi offline (GitHub Pages): service worker menyimpan halaman untuk dipakai tanpa sinyal.
if (STANDALONE && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
setInterval(() => {
  const el = document.getElementById('fastclock');
  if (el && S.state.fast) el.textContent = durTxt((Date.now() - S.state.fast.start) / 36e5);
}, 30000);
