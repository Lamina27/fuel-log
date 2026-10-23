/* ---------- Hari ini */
function dayFrac(date) {
  const tdy = today();
  if (date < tdy) return 1;
  if (date > tdy) return 0;
  const n = new Date();
  return (n.getHours() * 60 + n.getMinutes()) / 1440;
}

const DEFAULT_CONTAINERS = [
  { id: 'c250', key: 'c_glass', ml: 250 }, { id: 'c500', key: 'c_bottle', ml: 500 },
  { id: 'c750', key: 'c_tumbler', ml: 750 }, { id: 'c1000', key: 'c_big', ml: 1000 },
];
function containers() { return Array.isArray(S.state.containers) ? S.state.containers : DEFAULT_CONTAINERS; }
const contLabel = c => (c.key ? t(c.key) : c.label);
const FAST_PRESETS = [12, 14, 16, 18, 20, 23];

function fastCard(day) {
  const f = (S.state || {}).fast;
  const isToday = S.date === today();
  const fastName = x => x.kind === 'ibadah' ? t('fast_religious') : t('fast_n', { n: f1(x.target) });
  const done = (day.fasts || []).map(x => `<li><div><div class="it-name">${fastName(x)}</div>
      <div class="it-meta">${shortDate(isoOf(new Date(x.start)))} ${hhmm(x.start)} → ${hhmm(x.end)}${x.kind !== 'ibadah' && x.target ? ` · ${t('fast_target_h', { n: f1(x.target) })} ${(x.end - x.start) / 36e5 >= x.target ? `<span class="tag">${t('fast_hit')}</span>` : ''}` : ''}</div></div>
      <div class="it-k">${durTxt((x.end - x.start) / 36e5)}</div>
      <button class="del" data-act="delFast" data-id="${esc(x.id)}" aria-label="${t('a_del_fast')}">×</button></li>`).join('');
  let live = '';
  if (f) {
    const h = (Date.now() - f.start) / 36e5;
    const pct = f.kind === 'ibadah' || !f.target ? null : Math.min(100, h / f.target * 100);
    live = `
      <div class="fastlive">
        <div class="head"><div><div class="eyebrow">${t('fast_running', { name: fastName(f) })}</div>
          <div class="fastclock n" id="fastclock">${durTxt(h)}</div></div>
          <div class="hint" style="text-align:right">${t('fast_started', { t: hhmm(f.start) })}${pct != null ? `<br>${t('fast_ends', { t: hhmm(f.start + f.target * 36e5) })}` : ''}</div></div>
        ${pct != null ? `<div class="track"><div class="seg fastbar" style="left:0;width:${pct.toFixed(1)}%"></div></div>` : ''}
        <div class="row"><label class="f" style="flex:1 1 140px">${t('fast_end_at')}<input type="time" id="fast-end" value="${hhmmInput(Date.now())}"></label>
          <button class="btn primary" data-act="endFast" style="align-self:end">${t('fast_end')}</button>
          <button class="btn" data-act="cancelFast" style="align-self:end">${t('fast_cancel')}</button></div>
      </div>`;
  } else if (isToday) {
    const ft = n0(S.profile.fastTarget) || 16;
    const ftCustom = !FAST_PRESETS.includes(ft);
    live = `
      <div class="grid2">
        <label class="f">${t('fast_kind')}<select id="fast-kind">
          ${FAST_PRESETS.map(n => `<option value="${n}"${n === ft ? ' selected' : ''}>${n === 23 ? t('fast_omad') : `${n}:${24 - n} · ${t('n_hours', { n })}`}</option>`).join('')}
          <option value="custom"${ftCustom ? ' selected' : ''}>${t('fast_custom')}</option>
          <option value="ibadah">${t('fast_religious_opt')}</option>
        </select></label>
        <label class="f" id="fast-custom-wrap"${ftCustom ? '' : ' hidden'}>${t('fast_dur_h')}<input id="fast-custom" type="number" inputmode="decimal" min="1" max="72" step="0.5" value="${ft}"></label>
        <label class="f">${t('fast_start_from')}<input type="time" id="fast-start" value="${hhmmInput(Date.now())}"></label>
      </div>
      <button class="btn" data-act="startFast">${t('fast_start')}</button>`;
  }
  if (!live && !done) return '';
  return `
    <div class="card">
      <div class="head"><h2>${t('fast_title')}</h2>${day.ibadah ? `<span class="tag">${t('fast_religious_day')}</span>` : ''}</div>
      ${live}
      ${done ? `<ul class="items">${done}</ul>` : ''}
    </div>`;
}

/* ---------- kendaraan: tangki = target makan, cadangan = lemak tubuh */
function cloudShape(x, y, s) {
  return `<g transform="translate(${x} ${y}) scale(${s})"><circle cx="0" cy="0" r="9"/><circle cx="11" cy="-5" r="12"/><circle cx="24" cy="0" r="9"/><rect x="-6" y="0" width="36" height="8" rx="4"/></g>`;
}
const FUEL_WAVE = ' q 8 -2.5 16 0 t 16 0 t 16 0 t 16 0 t 16 0 t 16 0 t 16 0 t 16 0 t 16 0 t 16 0 t 16 0 t 16 0 t 16 0 t 16 0 t 16 0';
function fuelFill(clipId, bodyPath, y0, y1, lvl, over) {
  const top = y1 - (y1 - y0) * lvl;
  return `<clipPath id="${clipId}"><path d="${bodyPath}"/></clipPath>
    <g clip-path="url(#${clipId})">
      <rect class="fuel${over ? ' over' : ''}" x="40" y="${top.toFixed(1)}" width="280" height="${((y1 - y0) * lvl + 1).toFixed(1)}"/>
      ${lvl > 0 && lvl < 1 ? `<path class="fuel-surf" d="M40 ${top.toFixed(1)}${FUEL_WAVE}"/>` : ''}
    </g>`;
}
/* Kelas kendaraan generik (bukan replika tipe tertentu). Angka jelajah = nilai khas kelasnya. */
const VEHICLES = {
  airliner: {
    alt: h => `FL${Math.round((390 - 60 * h) / 10) * 10}`,
    spd: h => `M ${(0.85 - 0.40 * h).toFixed(2)}`,
    speedFrac: h => (0.85 - 0.40 * h) / 0.85,
    pitch: h => -(1.5 + 2 * h),
    draw(lvl, over, sf) {
      const body = 'M100 84 L250 84 C272 84 290 95 290 102 C290 110 276 120 250 120 L122 120 C102 120 86 112 72 98 C68 93 78 86 100 84 Z';
      const win = []; for (let x = 118; x <= 244; x += 9) win.push(`<circle cx="${x}" cy="94" r="2"/>`);
      return `
        <path class="contrail" d="M150 131 H${Math.round(150 - 120 * sf)}" stroke="url(#trailg)"/>
        <path class="v-body" d="M80 89 L62 48 C61 45 63 44 66 44 L80 44 L118 84 Z"/>
        <path class="v-body" d="M78 100 L48 104 L52 108 L100 106 Z"/>
        <path class="v-body" d="${body}"/>
        ${fuelFill('clip-air', body, 84, 120, lvl, over)}
        <path class="v-line" d="${body}"/>
        <g class="v-win">${win.join('')}</g>
        <path class="v-dark" d="M264 91 L277 91 C280 92 282 94 283 97 L266 97 Z"/>
        <rect class="v-door" x="252" y="89" width="7" height="16" rx="2"/>
        <path class="v-body" d="M206 108 L170 108 L126 152 L132 152 L126 160 L136 152 L146 152 Z"/>
        <rect class="v-body" x="148" y="123" width="44" height="17" rx="8.5"/>
        <ellipse class="v-dark" cx="192" cy="131.5" rx="3" ry="7.5"/>`;
    },
  },
  jet: {
    alt: h => `FL${Math.round((450 - 200 * h) / 10) * 10}`,
    spd: h => `M ${(1.6 - 0.8 * h).toFixed(2)}`,
    speedFrac: h => (1.6 - 0.8 * h) / 1.6,
    pitch: h => -(1 + 2.5 * h),
    draw(lvl, over, sf, h) {
      const body = 'M74 98 L96 92 L200 90 C236 90 268 96 304 102 C268 108 236 112 200 112 L96 112 L74 106 Z';
      const flame = Math.round(20 + 50 * sf);
      const mach = 1.6 - 0.8 * h;
      const diamonds = mach >= 1 ? [0.3, 0.55, 0.8].map(k => { const x = 70 - flame * k; return `<path class="diamond" d="M${x + 4} 102 L${x} 99 L${x - 4} 102 L${x} 105 Z"/>`; }).join('') : '';
      return `
        <path class="flame" d="M72 97 Q${70 - flame * 0.6} 99 ${70 - flame} 102 Q${70 - flame * 0.6} 105 72 107 Z"/>
        ${diamonds}
        <path class="v-body" d="M84 96 L66 60 C65 57 67 56 70 56 L84 56 L124 92 Z"/>
        <path class="v-body" d="M86 104 L58 112 L64 115 L108 108 Z"/>
        <path class="v-body" d="${body}"/>
        ${fuelFill('clip-jet', body, 90, 112, lvl, over)}
        <path class="v-line" d="${body}"/>
        <path class="canopy" d="M206 91 C214 78 246 80 262 95 Z"/>
        <path class="v-dark" d="M176 97 L198 96 L198 106 L176 107 Z" opacity="0.55"/>
        <path class="v-body" d="M190 108 L128 108 L104 124 L156 118 Z"/>
        <rect class="v-dark" x="66" y="97" width="10" height="10" rx="2"/>`;
    },
  },
  heli: {
    alt: h => `${fi(Math.round((3000 - 2000 * h) / 100) * 100)} ft`,
    spd: h => `${Math.round(140 - 70 * h)} kt`,
    speedFrac: h => (140 - 70 * h) / 140,
    pitch: h => 6 - 4 * h,
    draw(lvl, over) {
      const body = 'M150 96 C150 76 176 66 206 68 C242 70 264 86 264 104 C264 118 248 124 224 124 L172 124 C158 124 150 112 150 96 Z';
      return `
        <path class="v-body" d="M154 92 L64 92 L64 99 L154 110 Z"/>
        <path class="v-body" d="M70 92 L56 70 L64 70 L80 92 Z"/>
        <g class="tailrotor" style="transform-origin:58px 76px"><line x1="58" y1="62" x2="58" y2="90"/></g>
        <circle class="v-dark" cx="58" cy="76" r="2.5"/>
        <path class="v-body" d="${body}"/>
        ${fuelFill('clip-heli', body, 68, 124, lvl, over)}
        <path class="v-line" d="${body}"/>
        <path class="canopy" d="M234 74 C250 80 260 90 262 102 L238 102 Z"/>
        <rect class="canopy" x="196" y="80" width="28" height="18" rx="4"/>
        <path class="skid" d="M182 124 L178 138 M232 124 L236 138 M160 138 L252 138 Q262 138 264 132"/>
        <rect class="v-body" x="200" y="58" width="8" height="11" rx="2"/>
        <ellipse class="rotordisc" cx="204" cy="57" rx="112" ry="4"/>
        <g class="mainrotor" style="transform-origin:204px 57px"><line x1="92" y1="57" x2="316" y2="57"/></g>`;
    },
  },
};
function vehicleKey() { return VEHICLES[S.profile && S.profile.vehicle] ? S.profile.vehicle : 'airliner'; }

function flightOf(r) {
  const goal = Math.max(n0(r.goal), 500);
  const excess = Math.max(0, r.intake - r.target);
  const heavy = Math.min(1, excess / (goal * 1.5));
  return {
    fill: r.intake / Math.max(1, r.target), heavy,
    state: r.intake <= r.target ? 'cruise' : r.intake <= r.out ? 'heavy' : 'over',
  };
}
function vehicleHero(r, isToday) {
  const key = vehicleKey(); const V = VEHICLES[key];
  const F = flightOf(r);
  const lvl = Math.min(1, Math.max(0, F.fill));
  const over = F.fill > 1;
  const sf = V.speedFrac(F.heavy);
  const yOff = (24 * F.heavy).toFixed(1);
  const cloudDur = (12 / sf).toFixed(1);
  const far = [cloudShape(20, 150, 0.7), cloudShape(130, 165, 0.6), cloudShape(250, 148, 0.75)].join('');
  const near = [cloudShape(60, 178, 1.1), cloudShape(210, 182, 1.25), cloudShape(320, 172, 0.9)].join('');
  const drips = over ? [178, 196, 214].map((x, i) => `<circle class="drip" cx="${x}" cy="124" r="2.6" style="animation-delay:${i * 0.45}s"/>`).join('') : '';
  const pct = Math.round(F.fill * 100);
  const label = t('veh_aria', { v: t('veh_' + key), alt: V.alt(F.heavy), spd: V.spd(F.heavy), pct });
  return `
    <div class="flightbox ${F.state}">
      <svg class="sky v-${key}" viewBox="0 0 340 200" role="img" aria-label="${esc(label)}" style="--cloud-dur:${cloudDur}s">
        <defs>
          <linearGradient id="skyg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--sky1)"/><stop offset="1" style="stop-color:var(--sky2)"/></linearGradient>
          <linearGradient id="trailg" x1="1" y1="0" x2="0" y2="0"><stop offset="0" style="stop-color:var(--cloud);stop-opacity:.9"/><stop offset="1" style="stop-color:var(--cloud);stop-opacity:0"/></linearGradient>
        </defs>
        <rect x="0" y="0" width="340" height="200" rx="10" fill="url(#skyg)"/>
        <g class="clouds far"><g class="loop">${far}<g transform="translate(340 0)">${far}</g></g></g>
        <g class="speedlines"><line x1="8" y1="70" x2="58" y2="70"/><line x1="0" y1="108" x2="40" y2="108"/><line x1="14" y1="132" x2="52" y2="132"/></g>
        <g class="vehicle" transform="translate(0 ${yOff}) rotate(${V.pitch(F.heavy).toFixed(1)} 180 102)">
          <g class="bob">${V.draw(lvl, over, sf, F.heavy)}${drips}</g>
        </g>
        <g class="clouds near"><g class="loop">${near}<g transform="translate(340 0)">${near}</g></g></g>
        <g class="hud">
          <text x="14" y="24" class="hud-big">${esc(V.alt(F.heavy))}</text>
          <text x="14" y="40">${esc(V.spd(F.heavy))}</text>
          <text x="326" y="18" text-anchor="end" class="hud-k">${t('hud_tank')}</text>
          <text x="326" y="36" text-anchor="end" class="hud-big${over ? ' hud-over' : ''}">${pct}%</text>
          <text x="326" y="50" text-anchor="end" class="hud-k">${fi(r.intake)} / ${fi(r.target)} ${K()}</text>
        </g>
      </svg>
      <div class="vpick" role="group" aria-label="${t('a_vehicle')}">${Object.keys(VEHICLES).map(k => `<button data-act="vehicle" data-v="${k}" aria-pressed="${k === key}">${t('veh_' + k)}</button>`).join('')}</div>
      <div class="flightmsg">${flightMsg(r, F, key, isToday)}</div>
    </div>`;
}
function flightMsg(r, F, key, isToday) {
  const goal = n0(r.goal);
  const g = k => fi(Math.round(Math.abs(k) / 7.7));
  const noun = t('noun_' + key);
  const st = k => `<b class="st">${t(k)}</b> `;
  const B = v => `<b class="n">${v}</b>`;
  if (!isToday) {
    if (!r.logged) return st('st_nodata') + t('fm_nodata');
    if (F.state === 'over') return st('st_over') + t('fm_past_over', { in: fi(r.intake), out: fi(r.out), x: B(fi(r.intake - r.out)), g: g(r.intake - r.out) });
    const used = r.out - r.intake;
    return st(F.state === 'cruise' ? 'st_cruise' : 'st_heavy') + t(F.state === 'heavy' ? 'fm_past_used_under' : 'fm_past_used', { x: B(fi(used)), g: g(used), goal: fi(goal) });
  }
  if (F.state === 'cruise') {
    const head = r.intake > 0
      ? t('fm_cruise_left', { x: B(fi(r.left)) })
      : t('fm_cruise_empty', { now: hhmm(Date.now()), x: fi(r.sofar) });
    return st('st_cruise') + head + (goal > 0 ? ' ' + t('fm_cruise_plan', { target: fi(r.target), x: B(fi(goal)), g: g(goal) }) : '');
  }
  if (F.state === 'heavy') return st('st_heavy') + t('fm_heavy', { x: B(fi(r.intake - r.target)), noun, left: fi(r.out - r.intake), goal: fi(goal) });
  return st('st_over') + t('fm_over', { in: fi(r.intake), out: fi(r.out), x: B(fi(r.intake - r.out)), g: g(r.intake - r.out), Noun: noun.charAt(0).toUpperCase() + noun.slice(1) });
}

function macroBars(r, p) {
  const mt = macroTargets(p, r.target, r.w);
  const row = (lbl, cls, v, tg) => `<div class="mbar"><span>${lbl}</span><div class="mtrack"><i class="${cls}${v > tg ? ' over' : ''}" style="width:${Math.min(100, tg ? v / tg * 100 : 0).toFixed(1)}%"></i></div><b class="n">${fi(v)} / ${fi(tg)} g</b></div>`;
  return `<div class="mbars">${row(t('carb'), 'mc', r.carb, mt.c)}${row(t('protein'), 'mp', r.protein, mt.p)}${row(t('fat'), 'mf', r.fat, mt.f)}</div>`;
}
function actWhy(a) {
  const T = TYPES[a.type] || TYPES.other;
  if (a.method === 'jarak') return `${fdec(a.type === 'walk' && n0(a.elev) > 0 ? 0.5 : T.perKm)} ${K()}/kg/km${n0(a.elev) > 0 ? ' + ' + t('w_uphill') : ''}`;
  if (a.method === 'perangkat') return `${fi(a.kcal)} ${K()} × ${fdec(S.profile.corr == null ? DEFAULTS.corr : S.profile.corr)} − ${t('w_rest')}`;
  if (a.method === 'detak jantung') return `Keytel, HR ${fi(a.hr)}`;
  if (a.method === 'MET') return `MET ${fdec(T.met)} × ${fi(a.dur)} ${t('u_min')}`;
  return t('w_need_dur');
}
const METHOD_KEY = { 'jarak': 'm_dist', 'perangkat': 'm_dev', 'detak jantung': 'm_hr', 'MET': 'm_met', 'kurang data': 'm_none' };

function renderToday() {
  const root = $('#v-today');
  if (S.mode === 'loading') return;
  if (!profileReady()) {
    root.innerHTML = `
      <div class="card">${langPicker()}</div>
      <div class="card">
        <span class="eyebrow">${t('start_here')}</span>
        <h2>${t('fill_profile_first')}</h2>
        <p class="hint">${t('fill_profile_why')}</p>
        <button class="btn primary" data-act="go" data-v="prof">${t('fill_profile')}</button>
      </div>
      ${introCard()}`;
    return;
  }
  const day = S.days.get(S.date) || blankDay(S.date);
  const frac = dayFrac(S.date);
  const isToday = S.date === today();
  const r = calcDay(day, S.profile, frac);
  const p = S.profile;
  const over = r.left < 0;
  const scale = Math.max(r.out, r.intake + r.sigma, r.target) * 1.06 || 1;
  const pc = v => (Math.max(0, v) / scale * 100).toFixed(2) + '%';
  const tPos = pc(r.target);
  const nowTxt = hhmm(Date.now());
  const pal = fdec(r.pal);

  const foodLi = f => `
    <li>
      <div><div class="it-name">${esc(f.name)}</div><div class="it-meta">${esc(f.portion || '')}${f.p || f.c || f.f ? ` · ${t('pcl_short', { p: f1(f.p), c: f1(f.c), f: f1(f.f) })}` : ''}</div></div>
      <div class="it-k">${fi(f.kcal)}<small>${f.hi > f.lo ? `${fi(f.lo)}–${fi(f.hi)}` : K()}</small></div>
      <button class="del" data-act="delFood" data-id="${esc(f.id)}" aria-label="${esc(t('a_delete', { x: f.name }))}">×</button>
    </li>`;
  const meals = MEALS.map(k => {
    const m = r.byMeal[k];
    return `
      <div class="meal">
        <div class="mealhead"><h3>${esc(mL(k, day.ibadah))}</h3>
          <span class="n">${m.items.length ? fi(m.kcal) + ' ' + K() : ''}</span>
          <button class="btn small" data-act="go" data-v="log" data-tab="food" data-meal="${k}" aria-label="${esc(t('a_add_to', { x: mL(k, day.ibadah) }))}">${t('add_plus')}</button></div>
        ${m.items.length ? `<ul class="items">${m.items.map(foodLi).join('')}</ul>` : ''}
      </div>`;
  }).join('');

  const acts = r.acts.map(a => {
    const bits = [];
    if (a.dur) bits.push(`${f1(a.dur)} ${t('u_min')}`);
    if (a.dist) bits.push(`${f1(a.dist)} km`);
    if (a.elev) bits.push(`↑${fi(a.elev)} m`);
    if (a.hr) bits.push(`HR ${fi(a.hr)}`);
    if (a.kcal) bits.push(t('kcal_in_app', { x: fi(a.kcal) }));
    return `
    <li>
      <div><div class="it-name">${esc(a.title || typeLabel(a.type))} <span class="tag${a.method === 'kurang data' ? ' warn' : ''}" title="${esc(actWhy(a))}">${t(METHOD_KEY[a.method] || 'm_none')}</span></div>
      <div class="it-meta">${esc(typeLabel(a.type))}${a.app ? ' · ' + esc(a.app) : ''}${bits.length ? ' · ' + bits.join(' · ') : ''}</div>
      ${a.method === 'MET' && (a.type === 'strength' || a.type === 'strength_hard') ? `<div class="it-act"><button class="btn small" data-act="actType" data-id="${esc(a.id)}" data-v="${a.type === 'strength' ? 'strength_hard' : 'strength'}">${t(a.type === 'strength' ? 'to_vigorous' : 'to_moderate')}</button></div>` : ''}</div>
      <div class="it-k">${fi(a.net)}<small>${t('kcal_net')}</small></div>
      <button class="del" data-act="delAct" data-id="${esc(a.id)}" aria-label="${t('a_del_act')}">×</button>
    </li>`;
  }).join('');

  const stepNote = r.rawSteps
    ? t('steps_counted', { n: fi(r.effSteps) }) + (r.actSteps ? ' ' + t('steps_minus_act', { n: fi(r.actSteps) }) : '') + '. ' + t('steps_base_note', { n: fi(r.baseSteps) })
    : t('steps_fill', { n: fi(r.baseSteps) });

  // air putih
  const conts = containers();
  const wpct = Math.min(100, r.water / Math.max(1, r.waterTarget) * 100);
  const water = `
    <div class="card">
      <div class="head"><h2>${t('water')}</h2><span class="tot n">${f1(r.water / 1000)} / ${f1(r.waterTarget / 1000)} L</span></div>
      <div class="wtank" aria-label="${esc(t('a_water_pct', { n: fi(wpct) }))}"><i style="width:${wpct.toFixed(1)}%"></i>${[0.25, 0.5, 0.75].map(k => `<b style="left:${k * 100}%"></b>`).join('')}<span class="n">${fi(r.water / Math.max(1, r.waterTarget) * 100)}%</span></div>
      <div class="wbtns">${conts.map(c => `<button class="wbtn" data-act="water" data-ml="${c.ml}"><b class="n">+${c.ml >= 1000 ? f1(c.ml / 1000) + ' L' : fi(c.ml) + ' mL'}</b><span>${esc(contLabel(c))}</span></button>`).join('')}</div>
      <details class="more"><summary>${t('water_manage')}</summary>
        <div style="display:grid;gap:10px">
          <ul class="items">${conts.map(c => `<li><div><div class="it-name">${esc(contLabel(c))}</div><div class="it-meta n">${fi(c.ml)} mL</div></div><span></span><button class="del" data-act="delCont" data-id="${esc(c.id)}" aria-label="${esc(t('a_delete', { x: contLabel(c) }))}">×</button></li>`).join('')}</ul>
          <div class="grid2">
            <label class="f">${t('cont_name')}<input id="w-name" placeholder="${esc(t('cont_name_ph'))}"></label>
            <label class="f">${t('cont_ml')}<input id="w-ml" type="number" inputmode="numeric" min="10" max="3000" placeholder="600"></label>
          </div>
          <button class="btn" data-act="addCont">${t('cont_save')}</button>
          <div class="inline"><label class="hint" for="water-set">${tD('water_total_set', isToday)}</label>
            <input class="inp n" id="water-set" type="number" inputmode="numeric" min="0" step="50" value="${r.water || ''}" placeholder="0"></div>
        </div>
      </details>
    </div>`;

  // suplemen
  const list = (S.state && S.state.supps) || [];
  const taken = new Set((day.supps || []).map(s => s.sid));
  const supps = `
    <div class="card">
      <div class="head"><h2>${t('supps')}</h2>${r.suppKcal ? `<span class="tot n" style="color:var(--food)">${fi(r.suppKcal)} ${K()}</span>` : ''}</div>
      ${list.length ? `<div class="chips">${list.map(s => `<button class="chip supp${taken.has(s.id) ? ' on' : ''}" data-act="toggleSupp" data-id="${esc(s.id)}" aria-pressed="${taken.has(s.id)}">${taken.has(s.id) ? '✓ ' : ''}${esc(s.name)}${s.dose ? ` <span class="n">${esc(s.dose)}</span>` : ''}</button>`).join('')}</div>
        <p class="hint">${t('supps_hint')}</p>`
        : `<p class="empty">${t('supps_empty')}</p>`}
      <details class="more"${list.length ? '' : ' open'}><summary>${list.length ? t('supps_manage') : t('supps_add_title')}</summary>
        <div style="display:grid;gap:10px">
          ${list.length ? `<ul class="items">${list.map(s => `<li><div><div class="it-name">${esc(s.name)}</div><div class="it-meta">${esc(s.dose || '')}${s.kcal ? ` · ${fi(s.kcal)} ${K()}` : ''}${s.p ? ` · ${t('protein')} ${f1(s.p)} g` : ''}</div></div><span></span><button class="del" data-act="delSupp" data-id="${esc(s.id)}" aria-label="${esc(t('a_delete', { x: s.name }))}">×</button></li>`).join('')}</ul>` : ''}
          <label class="f">${t('name')}<input id="s-name" placeholder="${esc(t('supp_name_ph'))}"></label>
          <div class="grid3">
            <label class="f">${t('dose')}<input id="s-dose" placeholder="1 scoop"></label>
            <label class="f">${t('calories')}<input id="s-kcal" type="number" inputmode="numeric" min="0" placeholder="0"></label>
            <label class="f">${t('protein_g')}<input id="s-p" type="number" inputmode="decimal" min="0" placeholder="0"></label>
          </div>
          <button class="btn" data-act="addSupp">${t('supps_save')}</button>
        </div>
      </details>
    </div>`;

  const formula = t('formula', { target: `<b class="n">${fi(r.target)}</b>`, out: fi(r.out), minus: r.goal ? ' ' + t('formula_minus', { goal: fi(r.goal) }) : '', in: `<b class="n">${fi(r.intake)}</b>` })
    + (r.floored ? ' ' + t('floor_note', { min: fi(r.floor), u: K(), req: fi(r.goalReq) }) : '')
    + (r.minor && n0(p.goal) > 0 ? ' ' + t('minor_note') : '');

  root.innerHTML = `
    <div class="hero">
      ${vehicleHero(r, isToday)}
      <div>
        <div class="eyebrow">${over ? t('over_target') : tD('left_to_eat', isToday)}</div>
        <div class="big${over ? ' over' : ''}">${fi(Math.abs(r.left))}<small>${K()}</small></div>
        <div class="sub">${formula}</div>
      </div>
      <div class="bars" aria-label="${t('a_bars')}">
        <div class="bar"><span>${t('out')}</span><div class="track">
          <div class="seg base" style="left:0;width:${pc(r.base)}"></div>
          <div class="seg step" style="left:${pc(r.base)};width:${pc(r.stepKcal)}"></div>
          <div class="seg ex" style="left:${pc(r.base + r.stepKcal)};width:${pc(r.exKcal)}"></div>
          ${isToday ? `<div class="seg ahead" style="left:${pc(r.sofar)};width:${pc(r.out - r.sofar)}"></div><div class="nowmark" style="left:${pc(r.sofar)}"><span>${nowTxt}</span></div>` : ''}
          <div class="tmark" style="left:${tPos}" title="${t('eat_target')}"></div>
        </div></div>
        <div class="bar"><span>${t('in')}</span><div class="track">
          <div class="seg food" style="left:0;width:${pc(r.intake)}"></div>
          ${r.sigma > 0 ? `<div class="whisk" style="left:${pc(r.intake - r.sigma)};width:${pc(r.intake + r.sigma - Math.max(0, r.intake - r.sigma))}" title="${esc(t('uncert', { x: fi(r.sigma) }))}"></div>` : ''}
          <div class="tmark" style="left:${tPos}"></div>
        </div></div>
        <div class="legend">
          <span><i style="background:var(--burn3)"></i>${t('lg_base')}</span><span><i style="background:var(--burn2)"></i>${t('lg_steps')}</span>
          <span><i style="background:var(--burn)"></i>${t('lg_ex')}</span><span><i style="background:var(--food)"></i>${t('lg_food')}</span>
          <span><i style="background:none;border-left:2px dashed var(--ink);border-radius:0"></i>${t('eat_target')}</span>
          ${isToday ? `<span><i class="sw-ahead"></i>${t('lg_ahead')}</span>` : ''}
        </div>
      </div>
      <div class="figs">
        <div class="fig"><div class="k">${t('in')}</div><div class="v in">${fi(r.intake)}</div>${r.sigma ? `<div class="k">± ${fi(r.sigma)}</div>` : ''}</div>
        ${isToday
          ? `<div class="fig"><div class="k">${t('burned_until', { t: nowTxt })}</div><div class="v out">${fi(r.sofar)}</div><div class="k">${t('of_24h', { x: fi(r.out) })}</div></div>`
          : `<div class="fig"><div class="k">${t('out_24h')}</div><div class="v out">${fi(r.out)}</div></div>`}
        <div class="fig"><div class="k">${isToday ? t('balance_eod') : t('balance')}</div><div class="v ${r.balance <= 0 ? 'neg' : 'pos'}">${r.logged ? signed(r.balance) : '–'}</div>${isToday ? `<div class="k">${t('estimate')}</div>` : ''}</div>
      </div>
      <button class="btn block" data-act="openSummary" data-d="${S.date}">${tD('summary_btn', isToday)}</button>
      <details class="more defs"><summary>${t('defs_title')}</summary>
        <dl class="how">
          <div><dt>${t('def_vehicle_t')}</dt><dd>${t('def_vehicle')}</dd></div>
          <div><dt>${t('def_out_t')}</dt><dd>${t('def_out', { pal, n: fi(r.baseSteps) })}</dd></div>
          <div><dt>${t('def_sofar_t')}</dt><dd>${t('def_sofar')}</dd></div>
          <div><dt>${t('eat_target')}</dt><dd>${t('def_target')}</dd></div>
          <div><dt>${t('def_left_t')}</dt><dd>${t('def_left')}</dd></div>
          <div><dt>${t('balance')}</dt><dd>${t('def_balance')}</dd></div>
        </dl>
      </details>
    </div>

    ${fastCard(day)}

    <div class="card">
      <div class="head"><h2>${t('eat_drink')}</h2><span class="tot" style="color:var(--food)">${fi(r.foodKcal)} ${K()}</span></div>
      ${meals}
      ${macroBars(r, p)}
    </div>

    ${water}
    ${supps}

    <div class="card">
      <div class="head"><h2>${t('out_body')}</h2><span class="tot" style="color:var(--burn)">${fi(r.out)} ${K()} / 24 ${t('u_h')}</span></div>
      <ul class="items">
        <li><div><div class="it-name">${t('base_burn')}</div><div class="it-meta">BMR ${fi(r.bmr)} × ${pal} · ${t('weight_lc')} ${f1(r.w)} kg${isToday ? ` · ${t('so_far_until', { x: fi(r.base * frac), t: nowTxt })}` : ''}</div></div><div class="it-k">${fi(r.base)}<small>${K()} / 24 ${t('u_h')}</small></div><span></span></li>
        <li><div><div class="it-name">${t('daily_steps')}</div><div class="it-meta">${esc(stepNote)}</div></div><div class="it-k">${fi(r.stepKcal)}<small>${K()}</small></div><span></span></li>
        ${acts}
      </ul>
      <div class="inline"><label class="hint" for="steps-in">${tD('steps_total', isToday)}${day.steps && day.steps.src && day.steps.src !== 'manual' ? ` (${esc(t('from_x', { x: day.steps.src }))})` : ''}</label>
        <input class="inp n" id="steps-in" type="number" inputmode="numeric" min="0" step="1" placeholder="${esc(t('steps_ph'))}" value="${day.steps ? day.steps.count : ''}"></div>
      <button class="btn burn" data-act="go" data-v="log" data-tab="act">${t('log_exercise')}</button>
    </div>

    <div class="card">
      <div class="inline"><div><h2 style="font-size:17px">${t('body_weight')}</h2><p class="hint">${t('weigh_hint')}</p></div>
        <input class="inp n" id="weight-in" type="number" inputmode="decimal" min="20" max="400" step="0.1" placeholder="kg" value="${day.weight ? Math.round(day.weight * 10) / 10 : ''}"></div>
    </div>
    ${backupNudge()}`;
}

function introCard() {
  return `
    <div class="card">
      <span class="eyebrow">${t('how_it_works')}</span>
      <dl class="how">
        <div><dt>${t('food')}</dt><dd>${t('intro_food')}</dd></div>
        <div><dt>${t('exercise')}</dt><dd>${t('intro_ex')}</dd></div>
        <div><dt>${t('balance')}</dt><dd>${t('intro_bal')}</dd></div>
      </dl>
      ${disclaimer()}
    </div>`;
}
function disclaimer() { return `<div class="note"><b>${t('disc_t')}.</b> ${t('disc')}</div>`; }
