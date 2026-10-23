/* ---------- ringkasan harian (kartu SVG: tampil di layar & bisa disimpan sebagai gambar) */
const PAL_EXPORT = {
  card: '#F9FAF7', ink: '#18221D', muted: '#5B6861', line: '#C9D2CA', sunk: '#E2E7E0', onc: '#F9FAF7',
  food: '#B35A0C', burn: '#0B6E7F', ok: '#2F7A3E', bad: '#B3261E', water: '#2D6FB0',
  carb: '#A8740E', prot: '#2F7A5A', fat: '#6E4A8E',
  // kutip tunggal: nilai ini masuk ke atribut style="…" di SVG ekspor; kutip ganda merusak XML
  font: "-apple-system, 'Segoe UI', Roboto, 'Hiragino Sans', 'Noto Sans JP', 'Yu Gothic', Helvetica, Arial, sans-serif", num: 'ui-monospace, Menlo, Consolas, monospace',
};
const PAL_SCREEN = {
  card: 'var(--surface)', ink: 'var(--ink)', muted: 'var(--muted)', line: 'var(--line)', sunk: 'var(--sunk)', onc: 'var(--on-ink)',
  food: 'var(--food)', burn: 'var(--burn)', ok: 'var(--ok)', bad: 'var(--bad)', water: 'var(--water)',
  carb: 'var(--carb)', prot: 'var(--prot)', fat: 'var(--fat)',
  font: 'var(--f-body)', num: 'var(--f-num)',
};
function mealIcon(k, cx, cy, P) {
  const st = c => `style="fill:${c}"`;
  if (k === 'pagi') {
    let rays = '';
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; rays += `<line x1="${(cx + Math.cos(a) * 8).toFixed(1)}" y1="${(cy + Math.sin(a) * 8).toFixed(1)}" x2="${(cx + Math.cos(a) * 11).toFixed(1)}" y2="${(cy + Math.sin(a) * 11).toFixed(1)}" style="stroke:${P.carb};stroke-width:1.6;stroke-linecap:round"/>`; }
    return `${rays}<circle cx="${cx}" cy="${cy}" r="5.5" ${st(P.carb)}/>`;
  }
  if (k === 'siang') return `<circle cx="${cx + 3}" cy="${cy - 3}" r="5" ${st(P.carb)}/><path d="M${cx - 11} ${cy + 8} L${cx - 3} ${cy - 1} L${cx + 2} ${cy + 3} L${cx + 6} ${cy} L${cx + 11} ${cy + 8} Z" ${st(P.prot)}/>`;
  if (k === 'snack') return `<circle cx="${cx}" cy="${cy}" r="8" ${st(P.food)}/><circle cx="${cx - 3}" cy="${cy - 2}" r="1.3" ${st(P.onc)}/><circle cx="${cx + 3}" cy="${cy + 1}" r="1.3" ${st(P.onc)}/><circle cx="${cx - 1}" cy="${cy + 4}" r="1.3" ${st(P.onc)}/>`;
  return `<path d="M${cx + 3} ${cy - 9} A9 9 0 1 0 ${cx + 8} ${cy + 5} A7 7 0 1 1 ${cx + 3} ${cy - 9} Z" ${st(P.water)}/>`;
}
function summarySVG(date, day, r, P) {
  const mp = macroPct(r.carb, r.protein, r.fat);
  const mt = macroTargets(S.profile, r.target, r.w);
  const T = (x, y, txt, o) => `<text x="${x}" y="${y}"${o.anchor ? ` text-anchor="${o.anchor}"` : ''} style="fill:${o.c || P.ink};font-family:${o.f || P.font};font-size:${o.s || 13}px;font-weight:${o.w || 400}${o.ls ? `;letter-spacing:${o.ls}px` : ''}">${esc(txt)}</text>`;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 440" width="340" height="440" class="sumsvg" role="img" aria-label="${esc(t('a_summary_of', { d: longDate(date) }))}">`;
  s += `<rect x="0.5" y="0.5" width="339" height="439" rx="16" style="fill:${P.card};stroke:${P.line}"/>`;
  s += T(20, 36, longDate(date), { s: 16, w: 700 });
  s += T(320, 35, 'FUEL LOG', { s: 10, w: 700, anchor: 'end', c: P.muted, ls: 1.5 });
  s += `<line x1="20" y1="50" x2="320" y2="50" style="stroke:${P.line}"/>`;
  s += T(20, 98, fi(r.intake), { s: 44, w: 700, f: P.num, c: P.food });
  s += T(20, 120, t('sum_kcal_in'), { s: 13, c: P.muted });
  s += T(320, 76, t('sum_target', { x: fi(r.target) }), { anchor: 'end', c: P.muted });
  if (r.logged) s += T(320, 96, t('sum_balance', { x: signed(r.balance) }), { anchor: 'end', w: 700, c: r.balance <= 0 ? P.ok : P.bad });
  if (n0(day.weight)) s += T(320, 116, t('sum_weight', { x: f1(day.weight) }), { anchor: 'end', c: P.muted });
  const macros = [[t('carb'), mp.c, r.carb, mt.c, P.carb], [t('protein'), mp.p, r.protein, mt.p, P.prot], [t('fat'), mp.f, r.fat, mt.f, P.fat]];
  macros.forEach(([lbl, pct, g, tg, col], i) => {
    const cx = 62 + i * 108;
    s += `<circle cx="${cx}" cy="170" r="28" style="fill:${col}"/>`;
    s += T(cx, 176, `${fi(pct)}%`, { anchor: 'middle', s: 15, w: 700, f: P.num, c: P.onc });
    s += T(cx, 216, lbl, { anchor: 'middle', s: 12, c: P.muted });
    s += T(cx, 232, `${fi(g)} / ${fi(tg)} g`, { anchor: 'middle', s: 12, w: 600, f: P.num });
  });
  MEALS.forEach((k, i) => {
    const x = i % 2 ? 180 : 20, y = 252 + Math.floor(i / 2) * 52;
    s += `<circle cx="${x + 17}" cy="${y + 18}" r="17" style="fill:${P.sunk}"/>` + mealIcon(k, x + 17, y + 18, P);
    s += T(x + 42, y + 13, mL(k, day.ibadah), { s: 12, c: P.muted });
    s += T(x + 42, y + 32, `${fi(r.byMeal[k].kcal)} ${K()}`, { s: 15, w: 700, f: P.num });
  });
  s += `<line x1="20" y1="364" x2="320" y2="364" style="stroke:${P.line}"/>`;
  const foot = [[t('exercise'), `${fi(r.workoutMin)} ${t('u_min')}`], [t('water_short'), `${f1(r.water / 1000)} L`], [t('fast_title'), `${f1(r.fastH)} ${t('u_h')}`], [t('steps'), fi(r.rawSteps)]];
  foot.forEach(([lbl, v], i) => {
    const cx = 57 + i * 75;
    s += T(cx, 390, lbl, { anchor: 'middle', s: 11, c: P.muted });
    s += T(cx, 412, v, { anchor: 'middle', s: 15, w: 700, f: P.num });
  });
  return s + '</svg>';
}
function summaryBlock(date) {
  const day = S.days.get(date) || blankDay(date);
  const r = calcDay(day, S.profile, 1);
  if (!r) return `<p class="empty">${t('fill_profile_first')}</p>`;
  const recap = day.recap && day.recap.text;
  const busy = S.recapBusy && S.recapBusy.date === date;
  return `
    <div class="sumwrap">${summarySVG(date, day, r, PAL_SCREEN)}</div>
    <div class="row">
      ${S.downloads ? `<button class="btn" data-act="sumImg" data-d="${date}">${t('save_image')}</button>` : ''}
      ${S.sample && (r.logged || r.hasActivity) ? (busy
        ? `<span class="status"><span class="busy"></span>${t('ai_writing_recap')} <button class="btn small" data-act="stopRecap">${t('stop')}</button></span>`
        : `<button class="btn" data-act="sumRecap" data-d="${date}">${recap ? t('recap_again') : t('recap_btn')}</button>`) : ''}
    </div>
    ${recap || busy ? `<div class="recap" id="recap-${date}">${esc(recap || '')}</div>` : ''}
    ${S.recapErr && S.recapErr.date === date ? `<div class="note bad">${esc(S.recapErr.msg)}</div>` : ''}`;
}
async function openSummary(date) {
  await getDay(date);
  S.sheetDate = date;
  const sh = $('#sheet');
  sh.innerHTML = `
    <div class="sheet-back" data-act="closeSheet"></div>
    <div class="sheet-card" role="dialog" aria-modal="true" aria-label="${t('summary')}">
      <div class="head"><h2>${t('summary')}</h2><button class="iconbtn" data-act="closeSheet" aria-label="${t('close')}">×</button></div>
      <div id="sheet-body">${summaryBlock(date)}</div>
    </div>`;
  sh.hidden = false;
}
function refreshSummaries(date) {
  if (S.sheetDate === date && !$('#sheet').hidden) $('#sheet-body').innerHTML = summaryBlock(date);
  if (S.view === 'cal' && S.calSel === date) { const el = $('#cal-sum'); if (el) el.innerHTML = summaryBlock(date); }
}
function closeSheet() { $('#sheet').hidden = true; S.sheetDate = null; }
async function exportSummary(date) {
  const day = await getDay(date);
  const r = calcDay(day, S.profile, 1);
  const svg = summarySVG(date, day, r, PAL_EXPORT);
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    const k = 3;
    const cv = document.createElement('canvas'); cv.width = 340 * k; cv.height = 440 * k;
    cv.getContext('2d').drawImage(img, 0, 0, 340 * k, 440 * k);
    const blob = await new Promise(res => cv.toBlob(res, 'image/png'));
    await S.downloads.save({ filename: `fuel-log-${date}.png`, data: blob });
    toast(t('toast_img_saved'));
  } catch (e) {
    if (!(e && e.code === 'declined')) toast(t('toast_img_fail'));
  } finally { URL.revokeObjectURL(url); }
}
function recapPrompt(date, day, r) {
  const p = S.profile;
  const meals = MEALS.map(k => `${mL(k, day.ibadah)}: ${r.byMeal[k].items.map(f => `${f.name} (${Math.round(f.kcal)} kcal)`).join(', ') || '-'}`).join('\n');
  const acts = r.acts.map(a => `${a.type} ${a.dur ? Math.round(a.dur) + ' min' : ''} ${a.dist ? raw1(a.dist) + ' km' : ''} ≈ ${Math.round(a.net)} kcal`).join('; ') || '-';
  const mt = macroTargets(p, r.target, r.w);
  return [
    'Kamu pendamping diet yang ramah dan jujur. Tulis rekap harian 3–4 kalimat, tanpa daftar poin.',
    `Tulis rekapnya dalam ${LANGS[LANG].ai}.`,
    'Sebut satu hal yang sudah baik dan satu saran konkret untuk besok. Jangan menghakimi, jangan memberi nasihat medis, dan jangan menyarankan makan di bawah target makan.',
    `Tanggal: ${date}. Berat ${raw1(r.w)} kg${n0(p.goalWeight) ? `, target ${raw1(p.goalWeight)} kg` : ''}. Target defisit ${Math.round(r.goal)} kcal/hari${r.floored ? ` (dibatasi batas aman: target makan minimal ${r.floor} kcal)` : ''}${r.minor ? ' (pengguna di bawah 18 tahun: hanya pemeliharaan, jangan sarankan defisit)' : ''}.`,
    `Masuk ${Math.round(r.intake)} kcal (target makan ${Math.round(r.target)}), keluar perkiraan 24 jam ${Math.round(r.out)}, neraca ${Math.round(r.balance)} kcal.`,
    `Makro: karbo ${Math.round(r.carb)}/${mt.c} g, protein ${Math.round(r.protein)}/${mt.p} g, lemak ${Math.round(r.fat)}/${mt.f} g, gula ${Math.round(r.sugar)} g, serat ${Math.round(r.fiber)} g, natrium ${Math.round(r.sodium)} mg.`,
    `Makanan per waktu makan:\n${meals}`,
    `Olahraga: ${acts}. Langkah: ${Math.round(r.rawSteps)}. Air: ${Math.round(r.water)} dari ${Math.round(r.waterTarget)} mL. Puasa: ${raw1(r.fastH)} jam.`,
  ].join('\n');
}
async function runRecap(date) {
  const day = await getDay(date);
  const r = calcDay(day, S.profile, 1);
  const ctl = new AbortController();
  S.recapBusy = { date, ctl }; S.recapErr = null; refreshSummaries(date);
  try {
    const { text } = await S.sample(recapPrompt(date, day, r), {
      signal: ctl.signal, cache: false,
      onText: ({ text }) => { const el = document.getElementById('recap-' + date); if (el) el.textContent = text; },
    });
    day.recap = { text: text.trim().slice(0, 1500), at: Date.now(), lang: LANG };
    await saveDay(day);
  } catch (e) {
    const msg = aiErr(e);
    if (msg) S.recapErr = { date, msg };
  } finally { S.recapBusy = null; refreshSummaries(date); }
}

/* ---------- data rentang */
async function loadRange(from, to) {
  const key = from + '|' + to;
  if (S.ranges.has(key)) return S.ranges.get(key);
  const days = await getRange(from, to);
  const m = new Map(days.map(d => [d.date, d]));
  S.ranges.set(key, m);
  return m;
}
function weekStart(iso) { const d = parseIso(iso); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return isoOf(d); }

/* ---------- Kalender */
const CAL_METRICS = ['in', 'burn', 'bal', 'wt', 'water'];
function calValue(metric, day, r) {
  if (metric === 'in') return r.logged ? { txt: '+' + fi(r.intake) } : null;
  if (metric === 'burn') return r.activeKcal > 0 ? { txt: '−' + fi(r.activeKcal) } : null;
  if (metric === 'bal') return r.logged ? { txt: signed(r.balance), cls: r.balance <= 0 ? 'neg' : 'pos' } : null;
  if (metric === 'wt') return n0(day.weight) ? { txt: f1(day.weight) + ' kg' } : null;
  return r.water > 0 ? { txt: f1(r.water / 1000) + ' L' } : null;
}
async function renderCal() {
  const root = $('#v-cal');
  if (S.mode === 'loading') return;
  const ym = S.calMonth, tdy = today();
  const head = `
    <div class="monthnav"><button class="iconbtn" data-act="calMonth" data-d="-1" aria-label="${t('a_prev_month')}">‹</button><h2>${esc(monthName(ym))}</h2><button class="iconbtn" data-act="calMonth" data-d="1" aria-label="${t('a_next_month')}" ${ym >= ymOf(tdy) ? 'disabled' : ''}>›</button></div>
    <div class="mchips" role="group" aria-label="${t('a_show')}">${CAL_METRICS.map(k => `<button class="mchip m-${k}" data-act="calMetric" data-v="${k}" aria-pressed="${k === S.calMetric}"><i></i>${t('cm_' + k)}</button>`).join('')}</div>`;
  if (!profileReady()) { root.innerHTML = head + `<div class="card"><p class="hint">${t('need_profile_cal')}</p><button class="btn primary" data-act="go" data-v="prof">${t('fill_profile')}</button></div>`; return; }
  if (!S.months.has(ym)) root.innerHTML = head + `<div class="loading"><span class="busy"></span> ${t('loading_month')}</div>`;
  const days = await loadMonth(ym);
  if (S.view !== 'cal' || S.calMonth !== ym) return;
  const map = new Map(days.map(d => [d.date, d]));
  const p = S.profile, N = daysInMonth(ym);
  const firstDow = (parseIso(ym + '-01').getDay() + 6) % 7;
  let grid = dowNames().map(d => `<span class="dow">${esc(d)}</span>`).join('');
  for (let i = 0; i < firstDow; i++) grid += '<span></span>';
  const vals = [];
  for (let d = 1; d <= N; d++) {
    const iso = `${ym}-${pad(d)}`;
    const day = map.get(iso) || blankDay(iso);
    const r = calcDay(day, p, 1);
    const v = iso <= tdy ? calValue(S.calMetric, day, r) : null;
    if (v) vals.push({ iso, day, r });
    grid += `<button class="cday${v ? ' has m-' + S.calMetric + (v.cls ? ' ' + v.cls : '') : ''}${iso === S.calSel ? ' sel' : ''}${iso === tdy ? ' today' : ''}" data-act="calSel" data-d="${iso}" ${iso > tdy ? 'disabled' : ''} aria-label="${esc(longDate(iso))}${v ? ': ' + esc(v.txt) : ''}">
      <span class="dot n">${d}</span><span class="val n">${v ? esc(v.txt) : '–'}</span></button>`;
  }
  let foot = '';
  if (vals.length) {
    const m = S.calMetric, B = x => `<b class="n">${x}</b>`;
    if (m === 'in') foot = t('cf_in', { x: B(fi(sum(vals.map(x => x.r.intake)) / vals.length)), n: vals.length });
    if (m === 'burn') foot = t('cf_burn', { x: B(fi(sum(vals.map(x => x.r.activeKcal)))), n: vals.length });
    if (m === 'bal') { const tb = sum(vals.map(x => x.r.balance)); foot = t('cf_bal', { x: B(signed(tb)), kg: `${tb <= 0 ? '−' : '+'}${f1(Math.abs(tb) / 7700)}` }); }
    if (m === 'wt') { const w = vals.map(x => n0(x.day.weight)); const dw = w[w.length - 1] - w[0]; foot = t('cf_wt', { a: B(f1(w[0])), b: B(f1(w[w.length - 1])), d: `${dw <= 0 ? '−' : '+'}${f1(Math.abs(dw))}` }); }
    if (m === 'water') foot = t('cf_water', { x: B(f1(sum(vals.map(x => x.r.water)) / vals.length / 1000)), n: vals.length });
  } else foot = t('cf_none');
  const selIn = ymOf(S.calSel) === ym && S.calSel <= tdy;
  if (selIn) await getDay(S.calSel);
  if (S.view !== 'cal' || S.calMonth !== ym) return;
  root.innerHTML = head + `
    <div class="card">
      <div class="calgrid">${grid}</div>
      <p class="hint">${foot}</p>
    </div>
    ${selIn ? `<div class="card">
      <div class="head"><h2>${esc(longDate(S.calSel))}</h2><button class="btn small" data-act="openDay" data-d="${S.calSel}">${t('open_day')}</button></div>
      <div id="cal-sum">${summaryBlock(S.calSel)}</div>
    </div>` : ''}`;
}

/* ---------- Stats */
function statBuckets(period) {
  const tdy = today(); const out = [];
  if (period === 'd') {
    for (let i = 6; i >= 0; i--) { const d = addDays(tdy, -i); out.push({ from: d, to: d, l1: i === 0 ? t('w_Today') : parseIso(d).toLocaleDateString(LOC(), { weekday: 'short' }), l2: dm(d), now: i === 0 }); }
  } else if (period === 'w') {
    const ws = weekStart(tdy);
    for (let i = 5; i >= 0; i--) { const f = addDays(ws, -7 * i), e = addDays(f, 6); out.push({ from: f, to: e > tdy ? tdy : e, l1: dm(f), l2: '–' + dm(e), now: i === 0 }); }
  } else {
    const [y, m] = tdy.split('-').map(Number);
    for (let i = 5; i >= 0; i--) {
      const d = new Date(y, m - 1 - i, 1); const ym = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
      const last = `${ym}-${pad(daysInMonth(ym))}`;
      out.push({ from: ym + '-01', to: last > tdy ? tdy : last, l1: d.toLocaleDateString(LOC(), { month: 'short' }), l2: String(d.getFullYear()), now: i === 0 });
    }
  }
  return out;
}
function bucketVals(b, map, p) {
  const ds = []; let nDays = 0;
  for (let d = b.from; d <= b.to; d = addDays(d, 1)) { nDays++; const x = map.get(d); if (x) ds.push(x); }
  const rs = ds.map(d => ({ d, r: calcDay(d, p, 1) })).filter(x => x.r);
  const logged = rs.filter(x => x.r.logged), act = rs.filter(x => x.r.hasActivity);
  const wts = ds.filter(d => n0(d.weight) > 0).map(d => n0(d.weight));
  const fastH = sum(rs.map(x => x.r.fastH));
  return {
    in: logged.length ? sum(logged.map(x => x.r.intake)) / logged.length : null,
    burn: act.length ? sum(act.map(x => x.r.activeKcal)) / act.length : null,
    fast: fastH > 0 ? fastH / nDays : null,
    wt: wts.length ? sum(wts) / wts.length : null,
  };
}
const CHART_METRICS = {
  in: { col: 'var(--food)', fmt: v => fi(v), unit: () => K() },
  burn: { col: 'var(--burn)', fmt: v => fi(v), unit: () => K() },
  fast: { col: 'var(--ok)', fmt: v => f1(v), unit: () => t('u_h') },
};
function statsChart(bs, vals, metric) {
  const M = CHART_METRICS[metric];
  const W = 340, H = 300, n = bs.length, colW = (W - 20) / n, cx = i => 10 + colW * (i + 0.5);
  const ws = vals.map(v => v.wt).filter(v => v != null);
  const wlo = ws.length ? Math.min(...ws) - 0.5 : 0, whi = ws.length ? Math.max(...ws) + 0.5 : 1;
  const wy = v => 78 - (v - wlo) / (whi - wlo) * 40;
  let s = `<svg class="chart statchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t('a_stat_chart', { m: t('cm_' + metric) }))}">`;
  const pts = vals.map((v, i) => v.wt != null ? [cx(i), wy(v.wt), v.wt] : null).filter(Boolean);
  s += `<line class="wbase" x1="${cx(0)}" x2="${cx(n - 1)}" y1="58" y2="58"/>`;
  if (pts.length > 1) s += `<path class="wline2" d="${pts.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ',' + q[1].toFixed(1)).join('')}"/>`;
  vals.forEach((v, i) => {
    if (v.wt != null) s += `<circle class="wdot" cx="${cx(i).toFixed(1)}" cy="${wy(v.wt).toFixed(1)}" r="4"/><text class="wlbl" x="${cx(i).toFixed(1)}" y="${(wy(v.wt) - 9).toFixed(1)}" text-anchor="middle">${f1(v.wt)}</text>`;
    else s += `<circle class="wnone" cx="${cx(i).toFixed(1)}" cy="58" r="2.5"/>`;
  });
  s += `<text class="unit" x="${W - 6}" y="98" text-anchor="end">kg</text><line class="sep" x1="6" x2="${W - 6}" y1="104" y2="104"/><text class="unit" x="${W - 6}" y="118" text-anchor="end">${esc(M.unit())}</text>`;
  const max = Math.max(1, ...vals.map(v => v[metric] || 0));
  const base = 250, hmax = 110;
  vals.forEach((v, i) => {
    const val = v[metric];
    if (val > 0) {
      const h = Math.max(4, val / max * hmax), bw = colW * 0.62;
      s += `<rect class="bar${bs[i].now ? ' now' : ''}" x="${(cx(i) - bw / 2).toFixed(1)}" y="${(base - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="6" style="fill:${M.col}"/>`;
      s += `<text class="bval" x="${cx(i).toFixed(1)}" y="${(base - h - 6).toFixed(1)}" text-anchor="middle">${M.fmt(val)}</text>`;
    }
    s += `<text class="xl${bs[i].now ? ' now' : ''}" x="${cx(i).toFixed(1)}" y="${base + 20}" text-anchor="middle">${esc(bs[i].l1)}</text><text class="xl2" x="${cx(i).toFixed(1)}" y="${base + 34}" text-anchor="middle">${esc(bs[i].l2)}</text>`;
  });
  return s + '</svg>';
}
const periodTabs = (act, cur) => `<div class="seg-tabs three small" role="group" aria-label="${t('a_period')}">${['d', 'w', 'm'].map(k => `<button data-act="${act}" data-v="${k}" aria-pressed="${cur === k}">${t('per_' + k)}</button>`).join('')}</div>`;
async function renderStats() {
  const root = $('#v-stats');
  if (S.mode === 'loading') return;
  const tabs = `<div class="seg-tabs three" role="group" aria-label="${t('a_stats_part')}">${['chart', 'nutri', 'model'].map(k => `<button data-act="statsTab" data-v="${k}" aria-pressed="${S.statsTab === k}">${t('st_' + k)}</button>`).join('')}</div>`;
  if (!profileReady()) { root.innerHTML = tabs + `<div class="card"><p class="hint">${t('need_profile_stats')}</p><button class="btn primary" data-act="go" data-v="prof">${t('fill_profile')}</button></div>`; return; }
  if (!root.querySelector('#stats-body')) root.innerHTML = tabs + '<div id="stats-body" class="statsbody"></div>';
  else root.firstElementChild.outerHTML = tabs;
  const body = $('#stats-body');
  if (S.statsTab === 'chart') return renderChart(body);
  if (S.statsTab === 'nutri') return renderNutri(body);
  return renderModel(body);
}
async function renderChart(body) {
  const tdy = today(), p = S.profile;
  const [y, m] = tdy.split('-').map(Number);
  const d0 = new Date(y, m - 1 - 5, 1); const from = isoOf(d0) < addDays(weekStart(tdy), -35) ? isoOf(d0) : addDays(weekStart(tdy), -35);
  if (!S.ranges.has(from + '|' + tdy)) body.innerHTML = `<div class="loading"><span class="busy"></span> ${t('loading_data')}</div>`;
  const map = await loadRange(from, tdy);
  if (S.view !== 'stats' || S.statsTab !== 'chart') return;
  const bs = statBuckets(S.chartPeriod);
  const vals = bs.map(b => bucketVals(b, map, p));
  const cur = vals[vals.length - 1];
  const M = CHART_METRICS[S.chartMetric];
  const v = cur[S.chartMetric];
  const x = v != null ? M.fmt(v) : '0';
  const headline = t(`hl_${S.chartMetric}_${S.chartPeriod}`, { x });
  const allW = [...map.values()].filter(d => n0(d.weight) > 0).sort((a, b) => a.date < b.date ? -1 : 1);
  const gw = n0(p.goalWeight);
  const sofar = allW.length > 1 ? n0(allW[allW.length - 1].weight) - n0(allW[0].weight) : null;
  const lastW = allW.length ? n0(allW[allW.length - 1].weight) : n0(p.weight);
  body.innerHTML = `
    <div class="mtabs" role="group" aria-label="${t('a_metric')}">${Object.keys(CHART_METRICS).map(k => `<button data-act="chartMetric" data-v="${k}" aria-pressed="${k === S.chartMetric}">${t('cm_' + k)}</button>`).join('')}</div>
    <div class="card statcard m-${S.chartMetric}">
      <h2 class="statline">${esc(headline)}</h2>
      <div class="goalrow">
        <span>${t('goal_w')} <b class="n">${gw ? f1(gw) + ' kg' : '–'}</b></span>
        <span>${t('so_far')} <b class="n">${sofar != null ? (sofar <= 0 ? '−' : '+') + f1(Math.abs(sofar)) + ' kg' : '–'}</b></span>
        ${gw ? `<span>${t('remaining')} <b class="n">${f1(Math.max(0, lastW - gw))} kg</b></span>` : `<button class="btn small" data-act="go" data-v="prof">${t('set_goal_w')}</button>`}
      </div>
      ${statsChart(bs, vals, S.chartMetric)}
      ${periodTabs('chartPeriod', S.chartPeriod)}
      <p class="hint">${S.chartPeriod === 'd' ? t('chart_hint_d') : t('chart_hint_wm')} ${t('chart_hint_burn')}</p>
    </div>`;
}
function nutRange() {
  const a = S.nutAnchor;
  if (S.nutPeriod === 'd') return { from: a, to: a, label: longDate(a) };
  if (S.nutPeriod === 'w') { const ws = weekStart(a); return { from: ws, to: addDays(ws, 6), label: `${shortDate(ws)} – ${shortDate(addDays(ws, 6))}` }; }
  const ym = ymOf(a); return { from: ym + '-01', to: `${ym}-${pad(daysInMonth(ym))}`, label: monthName(ym) };
}
function bubbles(pct) {
  const items = [[pct.c, 'var(--carb)'], [pct.p, 'var(--prot)'], [pct.f, 'var(--fat)']].sort((x, y) => y[0] - x[0]);
  const pos = [[128, 86], [222, 76], [182, 136]];
  let s = `<svg class="bubbles" viewBox="0 0 340 190" role="img" aria-label="${t('a_macro_energy')}">`;
  items.forEach(([v, col], i) => {
    const r = 18 + 50 * Math.sqrt(v / 100);
    s += `<circle cx="${pos[i][0]}" cy="${pos[i][1]}" r="${r.toFixed(1)}" style="fill:${col}"/><text x="${pos[i][0]}" y="${pos[i][1] + 6}" text-anchor="middle" class="bpct">${fi(v)}%</text>`;
  });
  return s + '</svg>';
}
async function renderNutri(body) {
  const p = S.profile, tdy = today();
  const R = nutRange();
  if (!S.ranges.has(R.from + '|' + (R.to > tdy ? tdy : R.to))) body.innerHTML = `<div class="loading"><span class="busy"></span> ${t('loading_data')}</div>`;
  const map = await loadRange(R.from, R.to > tdy ? tdy : R.to);
  if (S.view !== 'stats' || S.statsTab !== 'nutri') return;
  const N = nutrition([...map.values()], p);
  const k = S.nutPeriod === 'd' ? 1 : Math.max(1, N.n);
  const avg = v => v / k;
  const pct = macroPct(N.c, N.p, N.f);
  const per = S.nutPeriod === 'd' ? '' : t('per_day');
  const day1 = S.nutPeriod === 'd' ? (map.get(R.from) || blankDay(R.from)) : null;
  const r1 = day1 ? calcDay(day1, p, 1) : null;
  const mt = r1 ? macroTargets(p, r1.target, r1.w) : null;
  const nav = `
    ${periodTabs('nutPeriod', S.nutPeriod)}
    <div class="monthnav"><button class="iconbtn" data-act="nutNav" data-d="-1" aria-label="${t('a_prev')}">‹</button><h2 style="font-size:18px">${esc(R.label)}</h2><button class="iconbtn" data-act="nutNav" data-d="1" aria-label="${t('a_next')}" ${R.to >= tdy ? 'disabled' : ''}>›</button></div>`;
  if (!N.n) { body.innerHTML = nav + `<div class="card"><p class="empty">${t('nut_empty')}</p></div>`; return; }
  const row = (lbl, v, unit, tgt, sub) => `<li class="${sub ? 'sub' : ''}"><span>${lbl}</span><b class="n">${v}${unit}${tgt != null ? ` <small>/ ${fi(tgt)}${unit}</small>` : ''}</b></li>`;
  const tot = N.byMeal; const totK = sum(MEALS.map(m => tot[m])) || 1;
  const mealList = MEALS.map(m => {
    const items = S.nutPeriod === 'd' && r1 ? r1.byMeal[m].items : [];
    return `<li class="mrow"><div class="mrow-h"><span>${esc(mL(m, day1 && day1.ibadah))}</span><b class="n">${fi(avg(tot[m]))} ${K()}${per}</b><small class="n">${fi(tot[m] / totK * 100)}%</small></div>
      <div class="mtrack"><i style="width:${(tot[m] / totK * 100).toFixed(1)}%;background:var(--food)"></i></div>
      ${items.length ? `<div class="it-meta">${items.map(f => `${esc(f.name)} ${fi(f.kcal)}`).join(' · ')}</div>` : ''}</li>`;
  }).join('');
  body.innerHTML = nav + `
    <div class="card">
      ${bubbles(pct)}
      <div class="mgrams">
        <div><i style="background:var(--carb)"></i><span>${t('carb')}</span><b class="n">${fi(avg(N.c))} g${per}</b></div>
        <div><i style="background:var(--prot)"></i><span>${t('protein')}</span><b class="n">${fi(avg(N.p))} g${per}</b></div>
        <div><i style="background:var(--fat)"></i><span>${t('fat')}</span><b class="n">${fi(avg(N.f))} g${per}</b></div>
      </div>
      <p class="hint">${t('nut_pct_hint')}${S.nutPeriod === 'd' ? '' : ' ' + t('nut_avg_of', { n: N.n })}</p>
    </div>
    <div class="seg-tabs" role="group" aria-label="${t('a_view')}"><button data-act="nutView" data-v="gizi" aria-pressed="${S.nutView === 'gizi'}">${t('nut_v_gizi')}</button><button data-act="nutView" data-v="meal" aria-pressed="${S.nutView === 'meal'}">${t('nut_v_meal')}</button></div>
    <div class="card">
      ${S.nutView === 'gizi' ? `<ul class="nlist">
        ${row(t('total_kcal'), fi(avg(N.kcal)), ' ' + K() + per, r1 ? r1.target : null)}
        ${S.nutPeriod !== 'd' ? row(t('period_total'), fi(N.kcal), ' ' + K(), null, true) : ''}
        ${row(t('carbohydrate'), fi(avg(N.c)), ' g' + per, mt ? mt.c : null)}
        ${row('– ' + t('sugar'), f1(avg(N.sugar)), ' g' + per, null, true)}
        ${row('– ' + t('fiber'), f1(avg(N.fiber)), ' g' + per, null, true)}
        ${row(t('protein'), fi(avg(N.p)), ' g' + per, mt ? mt.p : null)}
        ${row(t('fat'), fi(avg(N.f)), ' g' + per, mt ? mt.f : null)}
        ${row(t('sodium'), fi(avg(N.sodium)), ' mg' + per, null)}
      </ul>
      <p class="hint">${t('nut_extra_hint')}</p>`
      : `<ul class="nlist meals">${mealList}</ul>`}
    </div>`;
}
