/* ---------- data bulanan & tab Model */
async function loadMonth(ym) {
  if (S.months.has(ym)) return S.months.get(ym);
  const n = daysInMonth(ym);
  const days = await getRange(ym + '-01', ym + '-' + pad(n));
  days.sort((a, b) => a.date < b.date ? -1 : 1);
  S.months.set(ym, days);
  return days;
}
function niceStep(range) { const rawS = range / 4; const m = Math.pow(10, Math.floor(Math.log10(rawS || 1))); return [1, 2, 2.5, 5, 10].map(k => k * m).find(s => s >= rawS) || m * 10; }

function balanceChart(ym, rows, goal) {
  const N = daysInMonth(ym), W = 340, H = 170, L = 38, R = 8, T = 10, B = 22;
  const vals = rows.filter(x => x.r.logged).map(x => x.r.balance);
  let lo = Math.min(-goal - 150, ...vals, 0), hi = Math.max(150, ...vals, 0);
  const st = niceStep(hi - lo); lo = Math.floor(lo / st) * st; hi = Math.ceil(hi / st) * st;
  const y = v => T + (hi - v) / (hi - lo) * (H - T - B);
  const bw = (W - L - R) / N;
  const x = d => L + (d - 1) * bw;
  let g = '';
  for (let v = lo; v <= hi + 1e-9; v += st) g += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 4}" y="${y(v) + 3}" text-anchor="end">${fi(v)}</text>`;
  [1, 8, 15, 22, 29].filter(d => d <= N).forEach(d => { g += `<text x="${x(d) + bw / 2}" y="${H - 6}" text-anchor="middle">${d}</text>`; });
  const bars = rows.filter(x => x.r.logged).map(xr => {
    const d = Number(xr.date.slice(8)); const v = xr.r.balance;
    const y0 = y(0), y1 = y(v);
    return `<rect class="${v <= 0 ? 'b-neg' : 'b-pos'}" x="${(x(d) + bw * 0.15).toFixed(1)}" width="${(bw * 0.7).toFixed(1)}" y="${Math.min(y0, y1).toFixed(1)}" height="${Math.max(1, Math.abs(y1 - y0)).toFixed(1)}"><title>${shortDate(xr.date)}: ${signed(v)} ${K()}</title></rect>`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${t('a_balance_chart')}">${g}
    <line class="ax" x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}"/>
    ${goal > 0 ? `<line class="tgt" x1="${L}" x2="${W - R}" y1="${y(-goal)}" y2="${y(-goal)}"/><text x="${W - R}" y="${y(-goal) - 4}" text-anchor="end" style="fill:var(--ink)">${t('target_minus', { x: fi(goal) })}</text>` : ''}
    ${bars}</svg>`;
}
function weightChart(ym, m) {
  const pts = m.weights; if (pts.length < 2) return '';
  const N = daysInMonth(ym), W = 340, H = 150, L = 38, R = 8, T = 10, B = 22;
  let lo = Math.min(...pts.map(p => p.y)), hi = Math.max(...pts.map(p => p.y));
  lo = Math.floor((lo - 0.3) * 2) / 2; hi = Math.ceil((hi + 0.3) * 2) / 2;
  const st = niceStep(hi - lo);
  const firstDate = ((S.months.get(ym) || [])[0] || { date: ym + '-01' }).date;
  const offset = Number(firstDate.slice(8)) - 1;
  const xd = d => L + (d - 0.5) / N * (W - L - R);
  const y = v => T + (hi - v) / (hi - lo) * (H - T - B);
  let g = '';
  for (let v = lo; v <= hi + 1e-9; v += st) g += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 4}" y="${y(v) + 3}" text-anchor="end">${f1(v)}</text>`;
  [1, 8, 15, 22, 29].filter(d => d <= N).forEach(d => { g += `<text x="${xd(d)}" y="${H - 6}" text-anchor="middle">${d}</text>`; });
  const dayOf = p => p.x + 1 + offset;
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${xd(dayOf(p)).toFixed(1)},${y(p.y).toFixed(1)}`).join('');
  const dots = pts.map(p => `<circle class="wpt" cx="${xd(dayOf(p)).toFixed(1)}" cy="${y(p.y).toFixed(1)}" r="3"><title>${f1(p.y)} kg</title></circle>`).join('');
  let tr = '';
  if (m.trend) {
    const x0 = Math.min(...pts.map(p => p.x)), x1 = Math.max(...pts.map(p => p.x));
    tr = `<path class="trend" d="M${xd(x0 + 1 + offset).toFixed(1)},${y(m.trend.intercept + m.trend.slope * x0).toFixed(1)}L${xd(x1 + 1 + offset).toFixed(1)},${y(m.trend.intercept + m.trend.slope * x1).toFixed(1)}"/>`;
  }
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${t('a_weight_chart')}">${g}<path class="wline" d="${line}"/>${tr}${dots}</svg>`;
}

async function renderModel(root) {
  if (S.mode === 'loading') return;
  const ym = S.month;
  const nav = `<div class="monthnav"><button class="iconbtn" data-act="month" data-d="-1" aria-label="${t('a_prev_month')}">‹</button><h2>${esc(monthName(ym))}</h2><button class="iconbtn" data-act="month" data-d="1" aria-label="${t('a_next_month')}" ${ym >= ymOf(today()) ? 'disabled' : ''}>›</button></div>`;
  if (!S.months.has(ym)) root.innerHTML = nav + `<div class="loading"><span class="busy"></span> ${t('loading_month')}</div>`;
  const days = await loadMonth(ym);
  if (S.view !== 'stats' || S.statsTab !== 'model' || S.month !== ym) return;
  const p = S.profile;
  const m = calcMonth(days.length ? days : [blankDay(ym + '-01')], p);
  const N = daysInMonth(ym);
  const tdy = today();
  const fatKg = m.predictedKg;
  const slopeW = m.trend ? `${m.trend.slope <= 0 ? '−' : '+'}${f1(Math.abs(m.trend.slope * 7))}` : '';
  const calib = m.calib
    ? `<div class="cmp">
         <div class="tile"><span class="k">${t('by_model')}</span><span class="v">${fi(m.calib.modelOut)}</span><span class="s">${t('kcal_out_day')}</span></div>
         <div class="tile"><span class="k">${t('by_scale')}</span><span class="v">${fi(m.calib.obsOut)}</span><span class="s">${t('kcal_out_day')}</span></div>
       </div>
       <p class="hint">${t('calib_text', {
         intake: fi(m.avgIntake), slope: slopeW, obs: `<b>${fi(m.calib.obsOut)}</b>`,
         cmp: Math.abs(m.calib.ratio - 1) < 0.05 ? t('calib_match') : `<b>${t(m.calib.ratio > 1 ? 'calib_higher' : 'calib_lower', { n: fi(Math.abs(m.calib.ratio - 1) * 100) })}</b>`,
       })}</p>`
    : `<p class="hint">${t('calib_need', { d: m.loggedDays, w: m.weights.length })}</p>`;

  root.innerHTML = nav + `
    <div class="tiles">
      <div class="tile"><span class="k">${t('avg_in')}</span><span class="v" style="color:var(--food)">${m.loggedDays ? fi(m.avgIntake) : '–'}</span><span class="s">${t('kcal_per_logged')}</span></div>
      <div class="tile"><span class="k">${t('avg_out')}</span><span class="v" style="color:var(--burn)">${m.loggedDays ? fi(m.avgOut) : '–'}</span><span class="s">${t('kcal_per_logged')}</span></div>
      <div class="tile"><span class="k">${t('total_balance')}</span><span class="v" style="color:${m.totalBalance <= 0 ? 'var(--ok)' : 'var(--bad)'}">${m.loggedDays ? signed(m.totalBalance) : '–'}</span><span class="s">${m.loggedDays ? t('approx_fat', { x: `${fatKg <= 0 ? '−' : '+'}${f1(Math.abs(fatKg))}` }) : K()}</span></div>
      <div class="tile"><span class="k">${t('days_logged')}</span><span class="v">${m.loggedDays}<span style="font-size:14px;color:var(--muted)"> / ${ym === ymOf(tdy) ? Number(tdy.slice(8)) : N}</span></span><span class="s">${t('days_with_food')}</span></div>
    </div>
    <div class="card">
      <div class="head"><h2>${t('daily_balance')}</h2><span class="tot">${K()}</span></div>
      ${m.loggedDays ? balanceChart(ym, m.rows, (rs => rs.length ? rs.reduce((s, x) => s + x.r.goal, 0) / rs.length : goalOf(p))(m.rows.filter(x => x.r.logged))) : `<p class="empty">${t('no_food_month')}</p>`}
    </div>
    <div class="card">
      <div class="head"><h2>${t('body_weight')}</h2><span class="tot">${m.trend ? `${slopeW} ${t('kg_per_week')}` : 'kg'}</span></div>
      ${m.weights.length >= 2 ? weightChart(ym, m) + `<p class="hint">${t('trend_hint')}</p>` : `<p class="empty">${t('weight_need2')}</p>`}
    </div>
    <div class="card calib">
      <div class="head"><h2>${t('model_vs_real')}</h2></div>
      ${calib}
    </div>
    ${S.downloads && m.loggedDays ? `<button class="btn" data-act="csv">${t('csv_btn')}</button>` : ''}`;
}
