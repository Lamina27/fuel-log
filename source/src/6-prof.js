/* ---------- Profil */
function renderProf() {
  const root = $('#v-prof');
  if (S.mode === 'loading') return;
  const p = S.profile || { sex: 'm', age: '', height: '', weight: '', goal: 500, corr: DEFAULTS.corr, baseSteps: DEFAULTS.baseSteps, pal: DEFAULTS.pal };
  const opt = (v, cur, lbl) => `<option value="${v}"${String(v) === String(cur) ? ' selected' : ''}>${lbl}</option>`;
  const bmr = profileReady() ? bmrOf(p, n0(p.weight)) : null;
  const pal = n0(p.pal) || DEFAULTS.pal;
  const ref = (href, txt) => `<a href="${href}" target="_blank" rel="noopener">${txt}</a>`;
  const goalOpt = (kc, kgw) => opt(kc, p.goal, kc ? t('goal_opt', { k: fi(kc), u: K(), w: fdec(kgw) }) : t('goal_keep', { u: K() }));
  // batas aman di hari tanpa olahraga, dan BMI berat target
  const r0 = profileReady() ? calcDay(blankDay(today()), p, 1) : null;
  const hM = n0(p.height) / 100, gw = n0(p.goalWeight);
  const bmiG = hM && gw ? gw / (hM * hM) : 0;
  const minW = hM ? Math.ceil(18.5 * hM * hM * 2) / 2 : 0;
  const safeNotes = (r0 && r0.minor ? `<div class="note">${t('minor_prof')}</div>`
      : r0 && r0.floored ? `<div class="note">${t('floor_prof', { min: fi(r0.floor), u: K(), eff: fi(r0.goal), req: fi(r0.goalReq) })}</div>` : '')
    + (bmiG && bmiG < 18.5 ? `<div class="note bad">${t('goalw_low', { bmi: fdec(Math.round(bmiG * 10) / 10), w: fdec(minW) })}</div>` : '');
  root.innerHTML = `
    <div class="card">
      <h2>${t('language')}</h2>
      ${langPicker()}
    </div>
    <div class="card">
      <h2>${t('profile')}</h2>
      <div class="grid2">
        <label class="f">${t('sex')}<select id="p-sex">${opt('m', p.sex, t('male'))}${opt('f', p.sex, t('female'))}</select></label>
        <label class="f">${t('age')}<input id="p-age" type="number" inputmode="numeric" min="12" max="100" value="${p.age || ''}"></label>
        <label class="f">${t('height')}<input id="p-height" type="number" inputmode="decimal" min="100" max="250" value="${p.height || ''}"></label>
        <label class="f">${t('weight_kg')}<input id="p-weight" type="number" inputmode="decimal" min="25" max="400" step="0.1" value="${p.weight || ''}"></label>
      </div>
      <label class="f">${t('goal_weight')}<input id="p-goalw" type="number" inputmode="decimal" min="30" max="300" step="0.5" value="${p.goalWeight || ''}" placeholder="${esc(t('goal_weight_ph'))}"></label>
      <label class="f">${t('daily_deficit')}<select id="p-goal">
        ${goalOpt(0)}${goalOpt(250, 0.23)}${goalOpt(500, 0.45)}${goalOpt(750, 0.7)}${goalOpt(1000, 0.9)}
      </select></label>
      ${safeNotes}
      <details class="more"><summary>${t('advanced')}</summary>
        <div style="display:grid;gap:10px">
          <label class="f">${t('pal_label')}<select id="p-pal">
            ${opt(1.3, pal, `${fdec(1.3)} · ${t('pal_13')}`)}${opt(1.4, pal, `${fdec(1.4)} · ${t('pal_14')}`)}${opt(1.5, pal, `${fdec(1.5)} · ${t('pal_15')}`)}${opt(1.6, pal, `${fdec(1.6)} · ${t('pal_16')}`)}
          </select></label>
          <label class="f">${t('water_target_label')}<input id="p-water" type="number" inputmode="numeric" min="500" max="6000" step="100" value="${n0(p.water) || waterTarget(p)}"></label>
          <div class="grid2">
            <label class="f">${t('corr_label')}<select id="p-corr">${[1.1, 1, 0.9, 0.8].map(v => opt(v, p.corr ?? DEFAULTS.corr, fdec(v) + (v === 1 ? ` (${t('default')})` : ''))).join('')}</select></label>
            <label class="f">${t('base_steps_label')}<input id="p-base" type="number" inputmode="numeric" min="0" max="10000" step="500" value="${p.baseSteps ?? DEFAULTS.baseSteps}"></label>
          </div>
        </div>
        <p class="hint">${t('advanced_hint')}</p>
      </details>
      <button class="btn primary" data-act="saveProf">${t('save_profile')}</button>
      ${bmr ? `<p class="hint">${t('bmr_line', { bmr: `<b>${fi(bmr)}</b>`, pal: fdec(pal), base: `<b>${fi(bmr * pal)}</b>`, u: K() })}</p>` : ''}
    </div>

    <div class="card">
      <h2>${t('how_calc')}</h2>
      ${disclaimer()}
      <dl class="how">
        <div><dt>${t('base_burn')}</dt><dd>${t('hc_base')}</dd></div>
      </dl>
      <div class="formula">${t('bmr_formula')}</div>
      <dl class="how">
        <div><dt>${t('hc_dist_t')}</dt><dd>${t('hc_dist')}</dd></div>
        <div><dt>${t('hc_other_t')}</dt><dd>${t('hc_other')}</dd></div>
        <div><dt>${t('hc_corr_t')}</dt><dd>${t('hc_corr')}</dd></div>
        <div><dt>${t('steps')}</dt><dd>${t('hc_steps')}</dd></div>
        <div><dt>${t('food')}</dt><dd>${t('hc_food')}</dd></div>
        <div><dt>${t('hc_macro_t')}</dt><dd>${t('hc_macro')}</dd></div>
        <div><dt>${t('hc_calib_t')}</dt><dd>${t('hc_calib')}</dd></div>
        <div><dt>${t('hc_water_t')}</dt><dd>${t('hc_water')}</dd></div>
        <div><dt>${t('hc_safe_t')}</dt><dd>${t('hc_safe')}</dd></div>
      </dl>
    </div>

    <div class="card">
      <h2>${t('references')}</h2>
      <ol class="refs">
        <li>Mifflin MD, St Jeor ST, et al. Am J Clin Nutr 1990;51:241–7. ${t('validation')}: Frankenfield D, et al. ${ref('https://doi.org/10.1016/j.jada.2005.02.005', 'J Am Diet Assoc 2005;105:775–89')}.</li>
        <li>FAO/WHO/UNU. ${ref('https://www.fao.org/4/Y5686E/y5686e07.htm', 'Human Energy Requirements, 2004, Table 5.3')}.</li>
        <li>American College of Sports Medicine. ACSM's Guidelines for Exercise Testing and Prescription (${t('ref_acsm')}).</li>
        <li>Schantz P, Olsson KSE, Salier Eriksson J, Rosdahl H. ${ref('https://doi.org/10.3389/fpubh.2022.911863', 'Front Public Health 2022;10:911863')}.</li>
        <li>Keytel LR, et al. ${ref('https://doi.org/10.1080/02640410470001730089', 'J Sports Sci 2005;23(3):289–97')}.</li>
        <li>Herrmann SD, et al. ${ref('https://doi.org/10.1016/j.jshs.2023.10.010', '2024 Adult Compendium of Physical Activities. J Sport Health Sci 2024;13:6–12')}; ${ref('https://pacompendium.com/adult-compendium', 'pacompendium.com')}.</li>
        <li>O'Driscoll R, et al. ${ref('https://doi.org/10.1136/bjsports-2018-099643', 'Br J Sports Med 2020;54:332–40')}.</li>
        <li>Tudor-Locke C, Bassett DR. ${ref('https://doi.org/10.2165/00007256-200434010-00001', 'Sports Med 2004;34(1):1–8')}.</li>
        <li>Kementerian Kesehatan RI. Tabel Komposisi Pangan Indonesia 2017; versi daring: ${ref('https://www.panganku.org/', 'panganku.org')}.</li>
        <li>O'Hara C, et al. ${ref('https://doi.org/10.3390/nu17040607', 'Nutrients 2025;17(4):607')}.</li>
        <li>Hall KD. ${ref('https://doi.org/10.1038/sj.ijo.0803720', 'Int J Obes 2008;32:573–6')}.</li>
        <li>Morton RW, et al. ${ref('https://doi.org/10.1136/bjsports-2017-097608', 'Br J Sports Med 2018;52:376–84')}.</li>
        <li>Institute of Medicine. Dietary Reference Intakes for Energy, Carbohydrate, Fiber, Fat, Fatty Acids, Cholesterol, Protein, and Amino Acids, 2005 (AMDR).</li>
        <li>National Heart, Lung, and Blood Institute. ${ref('https://www.nhlbi.nih.gov/files/docs/guidelines/prctgd_c.pdf', 'The Practical Guide: Identification, Evaluation, and Treatment of Overweight and Obesity in Adults. NIH Pub. 00-4084, 2000')}.</li>
        <li>WHO. Obesity: preventing and managing the global epidemic. ${ref('https://iris.who.int/handle/10665/42330', 'WHO Technical Report Series 894, 2000')} (BMI 18,5–24,9).</li>
        <li>EFSA Panel on Dietetic Products, Nutrition and Allergies. Scientific Opinion on Dietary Reference Values for water. ${ref('https://doi.org/10.2903/j.efsa.2010.1459', 'EFSA Journal 2010;8(3):1459')}.</li>
      </ol>
    </div>

    ${STANDALONE ? apiKeyCard() : ''}
    <div class="card">
      <h2>${t('storage')}</h2>
      <p class="hint">${S.mode === 'cloud' ? t('storage_cloud') : STANDALONE ? t('storage_offline') : t('storage_local') + ' ' + t(S.localWhy === 'nowrite' ? 'storage_nowrite' : 'storage_nodb')}</p>
      <p class="hint statusline">${STANDALONE ? t('st_offline_ver') + ' · ' : ''}Claude ${S.hasClaude ? '✓' : '—'} · ${t('st_account')} ${S.mode === 'cloud' ? '✓' : '—'} · AI ${S.sample ? (S.sample.viaApi ? '✓ (API ' + esc((AI_MODELS[S.sample.model] || {}).label || '') + ')' : '✓') : '—'} · ${t('st_photo')} ${S.img ? '✓' : '—'}</p>
    </div>
    ${backupCard()}`;
}

function render() {
  document.documentElement.lang = LANG;
  S.liveStale = false;
  renderSync(); renderHeader();
  if (S.loadErr) {
    const root = $('#v-' + S.view);
    if (root) root.innerHTML = `<div class="card"><h2>${t('load_fail_t')}</h2><p class="hint">${t('load_fail')}</p><button class="btn primary" data-act="retryLoad">${t('retry')}</button></div>`;
    return;
  }
  syncWatch();
  if (S.view === 'today') renderToday();
  else if (S.view === 'log') renderLog();
  else if (S.view === 'cal') renderCal();
  else if (S.view === 'stats') renderStats();
  else renderProf();
  if (S.sheetDate && !$('#sheet').hidden) openSummary(S.sheetDate);
}
