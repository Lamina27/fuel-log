/* ===== Mesin hitung (fungsi murni, tanpa DOM) ===== */
/* MET: 2024 Adult Compendium of Physical Activities (Herrmann dkk., 2024); kode di komentar (dicek ke PDF resmi pacompendium.com).
   perKm: biaya bersih kkal/kg/km. Lari = ACSM (0,2 mL/kg/m × 5 kkal/L). Jalan = ACSM 0,5 (treadmill datar) dinaikkan ~30%:
   jalan di lapangan butuh ~30% energi lebih per km dibanding treadmill datar, terutama karena tanjakan (Schantz dkk., 2022).
   Karena itu bila tanjakan tercatat, jalan memakai 0,5 + komponen vertikal (tidak dihitung dua kali). Hiking = asumsi.
   elev: kkal/kg per meter naik dari komponen vertikal ACSM (lari 0,9, jalan 1,8 mL/kg/m).
   spk: langkah per km. Jalan 1.300 ≈ panjang langkah 0,77 m, di antara 1.220–1.260 langkah/km (jalan komuter, Schantz 2022,
   Tabel 6) dan ~1.480 (langkah 0,674 m, Murtagh dkk. dalam Schantz 2022, Tabel 14). Lari dan hiking = asumsi. */
const TYPES = {
  run:      { label: 'Lari',             met: 9.3, cardio: true,  perKm: 1.0,  elev: 0.0045, spk: 1000 }, // 12050 lari 6–6,3 mph (dipakai hanya tanpa jarak)
  walk:     { label: 'Jalan kaki',       met: 3.8, cardio: true,  perKm: 0.65, elev: 0.009,  spk: 1300 }, // 17190
  hike:     { label: 'Hiking',           met: 6.0, cardio: true,  perKm: 0.85, elev: 0.009,  spk: 1500 }, // 17080
  ride:     { label: 'Sepeda',           met: 7.0, cardio: true },  // 01014
  swim:     { label: 'Renang',           met: 5.8, cardio: true },  // 18240
  strength: { label: 'Angkat beban',     met: 3.5, cardio: false }, // 02054 beberapa latihan, 8–15 repetisi
  strength_hard: { label: 'Angkat beban berat', met: 6.0, cardio: false }, // 02050 power lifting / body building, vigorous
  hiit:     { label: 'HIIT / sirkuit',   met: 7.0, cardio: true },  // 02210 HIIT, moderate effort
  yoga:     { label: 'Yoga / mobilitas', met: 2.3, cardio: false }, // 02150
  sport:    { label: 'Olahraga lain',    met: 7.0, cardio: true },  // 15610 sepak bola santai
  other:    { label: 'Lainnya',          met: 4.0, cardio: false }, // asumsi
};
const KCAL_PER_KG_FAT = 7700;
const KCAL_PER_STEP_PER_KG = 0.0005; // = 0,65 kkal/kg/km ÷ 1.300 langkah/km
const MODEL_VERSION = 2;
const DEFAULTS = { pal: 1.4, baseSteps: 5000, corr: 1.0 };

const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const sum = a => a.reduce((s, x) => s + x, 0);

function bmrOf(p, w) {
  return 10 * w + 6.25 * num(p.height) - 5 * num(p.age) + (p.sex === 'f' ? -161 : 5);
}

/* Kalori bersih satu aktivitas (di atas pembakaran dasar), plus metode yang dipakai */
function actKcal(a, p, w, restMin) {
  const T = TYPES[a.type] || TYPES.other;
  const min = num(a.dur);
  const dist = num(a.dist), elev = num(a.elev), dev = num(a.kcal), hr = num(a.hr);
  if (T.perKm && dist > 0) {
    // jalan + tanjakan tercatat: dasar treadmill datar ACSM 0,5 + komponen vertikal (tambahan ~30% Schantz sebagian besar tanjakan)
    const perKm = a.type === 'walk' && elev > 0 ? 0.5 : T.perKm;
    const net = w * dist * perKm + w * elev * T.elev;
    return { net, method: 'jarak', why: `${perKm} kkal/kg/km` + (elev > 0 ? ' + tanjakan' : '') };
  }
  if (dev > 0) {
    const net = dev * (p.corr == null ? DEFAULTS.corr : num(p.corr)) - restMin * min;
    return { net: Math.max(0, net), method: 'perangkat', why: `${Math.round(dev)} kkal × ${p.corr == null ? DEFAULTS.corr : num(p.corr)} − istirahat` };
  }
  if (hr > 0 && T.cardio && min > 0) {
    const age = num(p.age);
    const perMin = p.sex === 'f'
      ? (-20.4022 + 0.4472 * hr - 0.1263 * w + 0.074 * age) / 4.184
      : (-55.0969 + 0.6309 * hr + 0.1988 * w + 0.2017 * age) / 4.184;
    const net = Math.max(0, perMin) * min - restMin * min;
    return { net: Math.max(0, net), method: 'detak jantung', why: `Keytel, HR ${Math.round(hr)}` };
  }
  if (min > 0) {
    const net = T.met * w * min / 60 - restMin * min;
    return { net: Math.max(0, net), method: 'MET', why: `MET ${T.met} × ${Math.round(min)} mnt` };
  }
  return { net: 0, method: 'kurang data', why: 'isi durasi atau jarak' };
}

function activitySteps(a) {
  const T = TYPES[a.type];
  if (!T || !T.spk || a.inSteps === false) return 0;
  if (num(a.steps) > 0) return num(a.steps);
  return num(a.dist) * T.spk;
}

/* Waktu makan. Kunci tetap; label berubah saat puasa ibadah (sahur/berbuka). */
const MEALS = ['pagi', 'siang', 'snack', 'malam'];
const MEAL_LABEL = { pagi: 'Sarapan', siang: 'Makan siang', snack: 'Snack', malam: 'Makan malam' };
const MEAL_LABEL_IBADAH = { pagi: 'Sahur', siang: 'Siang', snack: 'Camilan', malam: 'Berbuka & malam' };
function mealLabel(k, ibadah) { return (ibadah ? MEAL_LABEL_IBADAH : MEAL_LABEL)[k] || k; }
function inferMeal(ts) {
  const d = new Date(ts || Date.now());
  const h = d.getHours() + d.getMinutes() / 60;
  if (h < 10.5) return 'pagi';
  if (h < 15) return 'siang';
  if (h < 17.5) return 'snack';
  return 'malam';
}
function mealOf(f) { return MEALS.includes(f.meal) ? f.meal : inferMeal(f.t); }

/* Target minum harian (mL). EFSA (2010): asupan cukup air TOTAL 2,5 L/hari (laki-laki) dan 2,0 L/hari (perempuan);
   EFSA mengasumsikan makanan biasanya menyumbang ~20% air total (dikutip Eur J Nutr 2016, doi 10.1007/s00394-015-0943-9),
   jadi dari minuman ±80%: 2.000 mL (L) / 1.600 mL (P). */
function waterTarget(p) {
  if (p && num(p.water) > 0) return num(p.water);
  return p && p.sex === 'f' ? 1600 : 2000;
}

/* Batas aman untuk pemakaian tanpa pendamping medis.
   NHLBI Practical Guide (NIH Pub. 00-4084, 2000): diet turun berat 1.000–1.200 kkal/hari untuk sebagian besar
   perempuan dan 1.200–1.600 kkal/hari untuk laki-laki; diet < 800 kkal/hari tidak dipakai rutin (perlu pemantauan khusus).
   Aplikasi swa-pantau memakai batas yang lebih longgar: target tidak pernah di bawah 1.200 (P) / 1.500 (L).
   Usia < 18 tahun: hanya pemeliharaan (rumus Mifflin untuk dewasa; remaja masih tumbuh). */
const MIN_INTAKE = { f: 1200, m: 1500 };
function minIntake(p) { return p && p.sex === 'f' ? MIN_INTAKE.f : MIN_INTAKE.m; }
function isMinor(p) { return !!(p && num(p.age) && num(p.age) < 18); }
function goalOf(p) { return isMinor(p) ? 0 : Math.max(0, num(p && p.goal)); }

/* Ringkasan satu hari. frac = bagian hari yang sudah lewat (1 untuk hari lalu).
   Mengembalikan null bila profil belum lengkap. */
function calcDay(day, p, frac) {
  if (!p || !num(p.height) || !num(p.age) || !num(p.weight)) return null;
  const f01 = frac == null ? 1 : Math.min(1, Math.max(0, frac));
  const w = num(day.weight) || num(p.weight);
  const bmr = bmrOf(p, w);
  const pal = num(p.pal) || DEFAULTS.pal;
  const base = bmr * pal;
  const restMin = base / 1440;
  const acts = (day.acts || []).map(a => Object.assign({}, a, actKcal(a, p, w, restMin)));
  const rawSteps = num(day.steps && day.steps.count);
  const actSteps = sum(acts.map(activitySteps));
  const effSteps = Math.max(0, rawSteps - actSteps);
  const baseSteps = p.baseSteps == null ? DEFAULTS.baseSteps : num(p.baseSteps);
  const stepKcal = Math.max(0, effSteps - baseSteps) * KCAL_PER_STEP_PER_KG * w;
  const exKcal = sum(acts.map(a => a.net));
  const out = base + stepKcal + exKcal;            // perkiraan 24 jam
  const sofar = base * f01 + stepKcal + exKcal;    // sudah terbakar sampai saat ini
  const foods = day.foods || [];
  const supps = day.supps || [];
  const foodKcal = sum(foods.map(f => num(f.kcal)));
  const suppKcal = sum(supps.map(s => num(s.kcal)));
  const intake = foodKcal + suppKcal;
  const sigma = Math.sqrt(sum(foods.map(f => {
    const half = (num(f.hi) - num(f.lo)) / 2;
    return half > 0 ? half * half : 0;
  })));
  const byMeal = {};
  MEALS.forEach(k => { byMeal[k] = { kcal: 0, items: [] }; });
  foods.forEach(f => { const k = mealOf(f); byMeal[k].kcal += num(f.kcal); byMeal[k].items.push(f); });
  const goalReq = goalOf(p);                        // defisit yang dipilih (0 untuk usia < 18)
  const floor = minIntake(p);
  let target = out - goalReq;
  const floored = goalReq > 0 && target < floor;    // dibatasi batas aman
  if (floored) target = Math.min(out, floor);       // bila keluar < batas: pemeliharaan, tanpa defisit
  const goal = Math.max(0, out - target);           // defisit efektif
  return {
    w, bmr, pal, base, acts, rawSteps, actSteps, effSteps, baseSteps, stepKcal, exKcal, out, sofar, frac: f01,
    foodKcal, suppKcal, intake, sigma, target, left: target - intake, balance: intake - out, byMeal,
    goal, goalReq, floored, floor, minor: isMinor(p),
    protein: sum(foods.map(f => num(f.p))) + sum(supps.map(s => num(s.p))),
    carb: sum(foods.map(f => num(f.c))), fat: sum(foods.map(f => num(f.f))),
    sugar: sum(foods.map(f => num(f.sg))), fiber: sum(foods.map(f => num(f.fb))), sodium: sum(foods.map(f => num(f.na))),
    activeKcal: stepKcal + exKcal, workoutMin: sum((day.acts || []).map(a => num(a.dur))),
    hasActivity: (day.acts || []).length > 0 || rawSteps > 0,
    water: num(day.water), waterTarget: waterTarget(p),
    fastH: sum((day.fasts || []).map(x => Math.max(0, (num(x.end) - num(x.start)) / 36e5))),
    logged: foods.length > 0,
  };
}

/* Target makro harian (gram).
   Protein 1,6 g/kg: di atas ~1,62 g/kg/hari tidak ada tambahan massa bebas lemak dari latihan beban (Morton dkk., 2018),
   dibatasi 35% energi (batas atas AMDR, IOM 2005). Lemak 25% energi (AMDR 20–35%). Karbo = sisa energi. */
function macroTargets(p, kcal, w) {
  const W = num(w) || num(p.weight);
  const K = Math.max(0, num(kcal));
  const P = Math.min(1.6 * W, 0.35 * K / 4);
  const F = 0.25 * K / 9;
  const C = Math.max(0, (K - P * 4 - F * 9) / 4);
  return { p: Math.round(P), f: Math.round(F), c: Math.round(C) };
}
/* Persentase energi makro (4/4/9 kkal per gram) */
function macroPct(c, p, f) {
  const e = num(c) * 4 + num(p) * 4 + num(f) * 9;
  if (!e) return { c: 0, p: 0, f: 0 };
  return { c: num(c) * 4 / e * 100, p: num(p) * 4 / e * 100, f: num(f) * 9 / e * 100 };
}
/* Gabungan gizi untuk sekumpulan hari (rata-rata per hari tercatat) */
function nutrition(days, p) {
  const rows = days.map(d => ({ d, r: calcDay(d, p) })).filter(x => x.r && x.r.logged);
  const n = rows.length;
  const tot = k => sum(rows.map(x => num(x.r[k])));
  const byMeal = {};
  MEALS.forEach(k => { byMeal[k] = sum(rows.map(x => x.r.byMeal[k].kcal)); });
  return {
    n, rows,
    kcal: tot('intake'), c: tot('carb'), p: tot('protein'), f: tot('fat'),
    sugar: tot('sugar'), fiber: tot('fiber'), sodium: tot('sodium'), byMeal,
  };
}

/* Regresi linier berat vs hari; kemiringan kg/hari */
function weightTrend(points) {
  if (points.length < 2) return null;
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const mx = sum(xs) / xs.length, my = sum(ys) / ys.length;
  let sxx = 0, sxy = 0;
  for (let i = 0; i < xs.length; i++) { sxx += (xs[i] - mx) ** 2; sxy += (xs[i] - mx) * (ys[i] - my); }
  if (sxx === 0) return null;
  const slope = sxy / sxx;
  return { slope, intercept: my - slope * mx, span: Math.max(...xs) - Math.min(...xs) };
}

/* Ringkasan bulan + kalibrasi model terhadap tren berat nyata */
function calcMonth(days, p) {
  const rows = days.map(d => ({ date: d.date, day: d, r: calcDay(d, p) })).filter(x => x.r);
  const logged = rows.filter(x => x.r.logged);
  const avg = k => logged.length ? sum(logged.map(x => x.r[k])) / logged.length : 0;
  const weights = days.filter(d => num(d.weight) > 0)
    .map(d => ({ x: Math.round((Date.parse(d.date) - Date.parse(days[0].date)) / 864e5), y: num(d.weight) }));
  const trend = weightTrend(weights);
  const totalBalance = sum(logged.map(x => x.r.balance));
  let calib = null;
  if (logged.length >= 14 && trend && trend.span >= 14) {
    const obsOut = avg('intake') - trend.slope * KCAL_PER_KG_FAT;
    const modelOut = avg('out');
    calib = { obsOut, modelOut, ratio: obsOut / modelOut };
  }
  return {
    rows, loggedDays: logged.length,
    avgIntake: avg('intake'), avgOut: avg('out'), avgBalance: avg('balance'),
    totalBalance, predictedKg: totalBalance / KCAL_PER_KG_FAT,
    weights, trend, actualKg: trend ? trend.slope * trend.span : null, calib,
  };
}

/* Deteksi duplikat aktivitas */
function isDuplicate(a, existing) {
  return (existing || []).some(b => {
    if (b.type !== a.type) return false;
    const dd = Math.abs(num(b.dur) - num(a.dur)) <= 2;
    const da = num(a.dist), db = num(b.dist);
    const dist = (da === 0 && db === 0) || (da > 0 && db > 0 && Math.abs(da - db) / Math.max(da, db) < 0.03);
    return dd && dist;
  });
}

if (typeof module !== 'undefined') module.exports = { TYPES, DEFAULTS, MODEL_VERSION, MEALS, macroTargets, macroPct, nutrition, mealLabel, inferMeal, mealOf, waterTarget, calcDay, calcMonth, actKcal, isDuplicate, weightTrend, bmrOf };
