/* ---------- Catat */
function thumbs(list, kind) {
  return list.length ? `<div class="thumbs">${list.map((x, i) => `<figure><img src="${x.url}" alt="${esc(t('a_image_n', { n: i + 1 }))}"><button data-act="rmImg" data-kind="${kind}" data-i="${i}" aria-label="${t('a_del_image')}">×</button></figure>`).join('')}</div>` : '';
}
function typeOptions(sel) { return TYPE_KEYS.map(k => `<option value="${k}"${k === sel ? ' selected' : ''}>${esc(typeLabel(k))}</option>`).join(''); }

// Kenapa AI tidak tampil: versi offline, salinan di luar Claude, atau Claude tidak memberi AI di tampilan ini.
function noAiNote(kind) {
  const link = `<a href="${CLAUDE_URL}" target="_blank" rel="noopener">${t('open_claude_ver')}</a>`;
  if (STANDALONE) return `<div class="note info">${t(kind === 'food' ? 'ai_byok_food' : 'ai_byok_shot')} <a href="#" data-act="go" data-v="prof">${t('ai_byok_go')}</a> · ${link}</div>`;
  if (!S.hasClaude) return `<div class="note info">${t(kind === 'food' ? 'ai_offline_food' : 'ai_offline_shot')} ${link}</div>`;
  return `<div class="note info">${t(kind === 'food' ? 'ai_unavail_food' : 'ai_unavail_shot')}</div>`;
}
function renderLog() {
  const root = $('#v-log');
  if (S.mode === 'loading') return;
  const ai = !!S.sample;
  const imgOk = !!S.img;
  const isToday = S.date === today();
  const dl = isToday ? t('w_today') : shortDate(S.date);
  let body = '';
  if (S.logTab === 'food') {
    const dayNow = S.days.get(S.date) || blankDay(S.date);
    const meal = S.meal || (isToday ? inferMeal(Date.now()) : 'siang');
    S.meal = meal;
    const addTo = t('add_to_meal', { meal: mL(meal, dayNow.ibadah), d: dl });
    const draft = S.foodDraft;
    const draftTot = draft ? draft.filter(x => x.on).reduce((s, x) => s + n0(x.kcal), 0) : 0;
    body = `
      <div class="card">
        <span class="eyebrow">${t('log_for')}</span>
        <div class="mealpick" role="group" aria-label="${t('a_meal_time')}">${MEALS.map(k => `<button data-act="pickMeal" data-v="${k}" aria-pressed="${k === meal}">${esc(mL(k, dayNow.ibadah))}</button>`).join('')}</div>
      </div>
      ${ai ? `<div class="card">
        <h2>${t('food_ai_title')}</h2>
        <textarea id="food-text" placeholder="${esc(t('food_ai_ph'))}">${esc(S.foodText || '')}</textarea>
        ${imgOk ? `<label class="drop" for="food-img" data-drop="food"><b>${t('food_photo')}</b><span>${t('drop_hint')}</span></label>
        <input type="file" id="food-img" accept="${esc((S.img.mediaTypes || ['image/*']).join(','))}" multiple hidden>
        ${thumbs(S.foodImgs, 'food')}` : ''}
        ${S.foodBusy
          ? `<div class="status"><span class="busy"></span>${t('ai_counting')} <button class="btn small" data-act="stopFood">${t('stop')}</button></div>`
          : `<button class="btn food block" data-act="runFood">${t('count_kcal')}</button>`}
        ${S.foodErr ? `<div class="note bad">${esc(S.foodErr)}</div>` : ''}
      </div>` : noAiNote('food')}

      ${draft ? `<div class="card">
        <div class="head"><h2>${t('check_first')}</h2><span class="tot" style="color:var(--food)">${fi(draftTot)} ${K()}</span></div>
        ${S.foodNote ? `<p class="hint">${esc(S.foodNote)}</p>` : ''}
        <div class="draft">${draft.map((x, i) => `
          <div class="drow${x.on ? '' : ' off'}">
            <div class="top2"><input type="checkbox" data-fd="${i}" data-k="on" ${x.on ? 'checked' : ''} aria-label="${esc(t('a_include', { x: x.name }))}">
              <input class="inp" data-fd="${i}" data-k="name" value="${esc(x.name)}" aria-label="${t('name')}"></div>
            <div class="grid2">
              <label class="f">${t('portion')}<input data-fd="${i}" data-k="portion" value="${esc(x.portion)}"></label>
              <label class="f">${t('calories_kcal')}<input type="number" inputmode="numeric" data-fd="${i}" data-k="kcal" value="${x.kcal}"></label>
            </div>
            <div class="rng">${t('range_line', { lo: fi(x.lo), hi: fi(x.hi), k: K(), pcl: t('pcl_short', { p: f1(x.p), c: f1(x.c), f: f1(x.f) }) })}</div>
          </div>`).join('')}</div>
        <div class="row"><button class="btn food" data-act="saveFood">${esc(addTo)}</button><button class="btn" data-act="clearFood">${t('discard')}</button></div>
      </div>` : ''}

      ${S.lib.length ? `<div class="card">
        <h2>${t('frequent')}</h2>
        <p class="hint">${esc(t('frequent_hint', { meal: mL(meal, dayNow.ibadah), d: dl }))}</p>
        <div class="chips">${S.lib.slice(0, 14).map((x, i) => `<button class="chip" data-act="libAdd" data-i="${i}">${esc(x.name)}<span class="n">${fi(x.kcal)}</span></button>`).join('')}</div>
      </div>` : ''}

      <div class="card">
        <details class="more"${ai ? '' : ' open'}><summary>${t('manual_log')}</summary>
          <div style="display:grid;gap:10px">
            <label class="f">${t('food_name')}<input id="m-name" placeholder="${esc(t('food_name_ph'))}"></label>
            <div class="grid2">
              <label class="f">${t('portion')}<input id="m-portion" placeholder="${esc(t('portion_ph'))}"></label>
              <label class="f">${t('calories_kcal')}<input id="m-kcal" type="number" inputmode="numeric" min="0"></label>
            </div>
            <button class="btn" data-act="manualFood">${esc(addTo)}</button>
          </div>
        </details>
      </div>`;
  } else {
    const draft = S.actDraft, sd = S.stepsDraft;
    body = `
      ${ai && imgOk ? `<div class="card">
        <h2>${t('from_shot')}</h2>
        <p class="hint">${t('shot_hint')}</p>
        <label class="drop" for="shot-img" data-drop="shot"><b>${t('pick_shot')}</b><span>${t('several_ok')}</span></label>
        <input type="file" id="shot-img" accept="${esc((S.img.mediaTypes || ['image/*']).join(','))}" multiple hidden>
        ${thumbs(S.shotImgs, 'shot')}
        ${S.shotBusy
          ? `<div class="status"><span class="busy"></span>${t('ai_reading')} <button class="btn small" data-act="stopShot">${t('stop')}</button></div>`
          : `<button class="btn burn block" data-act="runShot" ${S.shotImgs.length ? '' : 'disabled'}>${t('read_shot')}</button>`}
        ${S.shotErr ? `<div class="note bad">${esc(S.shotErr)}</div>` : ''}
      </div>` : noAiNote('shot')}

      ${draft || sd ? `<div class="card">
        <h2>${t('check_first')}</h2>
        <p class="hint">${t('shot_check_hint')}</p>
        <div class="draft">
        ${sd ? `<div class="drow${sd.on ? '' : ' off'}">
            <div class="top2"><input type="checkbox" data-sd="on" ${sd.on ? 'checked' : ''} aria-label="${t('a_include_steps')}">
              <div class="it-name">${t('daily_steps')}${sd.app ? ' · ' + esc(sd.app) : ''}</div></div>
            <div class="grid2"><label class="f">${t('date')}<input type="date" data-sd="date" value="${sd.date}" max="${today()}"></label>
              <label class="f">${t('steps')}<input type="number" inputmode="numeric" data-sd="count" value="${sd.count}"></label></div>
          </div>` : ''}
        ${(draft || []).map((a, i) => `
          <div class="drow${a.on ? '' : ' off'}">
            <div class="top2"><input type="checkbox" data-ad="${i}" data-k="on" ${a.on ? 'checked' : ''} aria-label="${t('a_include_act')}">
              <input class="inp" data-ad="${i}" data-k="title" value="${esc(a.title)}" aria-label="${t('title')}"></div>
            ${a.dup ? `<div class="note">${t('dup_note')}</div>` : ''}
            <div class="grid2">
              <label class="f">${t('kind')}<select data-ad="${i}" data-k="type">${typeOptions(a.type)}</select></label>
              <label class="f">${t('date')}<input type="date" data-ad="${i}" data-k="date" value="${a.date}" max="${today()}"></label>
            </div>
            <div class="grid3">
              <label class="f">${t('dur_min')}<input type="number" inputmode="decimal" data-ad="${i}" data-k="dur" value="${a.dur ?? ''}"></label>
              <label class="f">${t('dist_km')}<input type="number" inputmode="decimal" data-ad="${i}" data-k="dist" value="${a.dist ?? ''}"></label>
              <label class="f">${t('elev_m')}<input type="number" inputmode="numeric" data-ad="${i}" data-k="elev" value="${a.elev ?? ''}"></label>
              <label class="f">${t('avg_hr')}<input type="number" inputmode="numeric" data-ad="${i}" data-k="hr" value="${a.hr ?? ''}"></label>
              <label class="f">${t('app_kcal')}<input type="number" inputmode="numeric" data-ad="${i}" data-k="kcal" value="${a.kcal ?? ''}"></label>
              <label class="f">${t('steps')}<input type="number" inputmode="numeric" data-ad="${i}" data-k="steps" value="${a.steps ?? ''}"></label>
            </div>
          </div>`).join('')}
        </div>
        <div class="row"><button class="btn burn" data-act="saveShot">${t('save')}</button><button class="btn" data-act="clearShot">${t('discard')}</button></div>
      </div>` : ''}

      <div class="card">
        <details class="more"${ai && imgOk ? '' : ' open'}><summary>${t('manual_log')}</summary>
          <div style="display:grid;gap:10px">
            <div class="grid2">
              <label class="f">${t('kind')}<select id="a-type">${typeOptions('run')}</select></label>
              <label class="f">${t('dur_min')}<input id="a-dur" type="number" inputmode="decimal" min="0"></label>
            </div>
            <div class="grid3">
              <label class="f">${t('dist_km')}<input id="a-dist" type="number" inputmode="decimal" min="0"></label>
              <label class="f">${t('elev_m')}<input id="a-elev" type="number" inputmode="numeric" min="0"></label>
              <label class="f">${t('avg_hr')}<input id="a-hr" type="number" inputmode="numeric" min="0"></label>
            </div>
            <label class="f">${t('app_kcal_opt')}<input id="a-kcal" type="number" inputmode="numeric" min="0"></label>
            <button class="btn" data-act="manualAct">${esc(t('add_to_day', { d: dl }))}</button>
          </div>
        </details>
      </div>`;
  }
  root.innerHTML = `
    <div class="seg-tabs" role="group" aria-label="${t('a_log_kind')}">
      <button data-act="logTab" data-v="food" aria-pressed="${S.logTab === 'food'}">${t('food')}</button>
      <button data-act="logTab" data-v="act" aria-pressed="${S.logTab === 'act'}">${t('ex_steps')}</button>
    </div>
    ${body}`;
}
