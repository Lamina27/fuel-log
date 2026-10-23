/* ---------- AI dengan API key sendiri (versi offline / GitHub Pages)
   Halaman di luar Claude tidak mendapat kapabilitas `sample`. Pengguna boleh memasukkan kunci Claude API miliknya;
   aplikasi lalu memanggil API langsung dari browser (header resmi anthropic-dangerous-direct-browser-access: true,
   pola "bring your own key"). Kunci hanya disimpan di localStorage perangkat ini (nk:ai), tidak ikut cadangan,
   tidak pernah ditulis ke kode. Objek di bawah meniru antarmuka `sample` (fungsi + .json + .limits) sehingga
   kartu foto makanan, pembaca screenshot, dan rekap memakai jalur yang sama.
   Harga (platform.claude.com/docs/en/about-claude/pricing, dicek 23 Okt 2026), USD per juta token masuk / keluar. */
const AI_MODELS = {
  'claude-sonnet-5-5': { label: 'Sonnet 5.5', inp: 2, out: 10 },
  'claude-haiku-5-5': { label: 'Haiku 5.5', inp: 0.1, out: 0.5 },
};
const AI_DEFAULT_MODEL = 'claude-sonnet-5-5';
const AI_IMG_EDGE = 1568;           // sisi terpanjang setelah diperkecil (token gambar = ⌈w/28⌉·⌈h/28⌉)
const API_URL = 'https://api.anthropic.com/v1/messages';

function aiCfg() {
  const c = LS.get('ai');
  return c && typeof c.key === 'string' && c.key.trim() ? { key: c.key.trim(), model: AI_MODELS[c.model] ? c.model : AI_DEFAULT_MODEL } : null;
}
const apiErr = (code, message) => Object.assign(new Error(message || code), { code });

// Perkecil foto ke ≤ 1568 px dan kirim sebagai JPEG: request lebih kecil, lebih cepat, lebih murah.
async function imgBlock(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(apiErr('image_rejected')); i.src = url; });
    const s = Math.min(1, AI_IMG_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * s)), h = Math.max(1, Math.round(img.naturalHeight * s));
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.drawImage(img, 0, 0, w, h);
    return { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: cv.toDataURL('image/jpeg', 0.85).split(',')[1] } };
  } finally { URL.revokeObjectURL(url); }
}
function parseJsonLoose(text) {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const s = fence ? fence[1] : text;
  const i = s.search(/[[{]/); if (i < 0) return undefined;
  const j = s.lastIndexOf(s[i] === '{' ? '}' : ']');
  try { return JSON.parse(s.slice(i, j + 1)); } catch (e) { return undefined; }
}
function aiUsage() { return LS.get('aiUsage') || { calls: 0, cost: 0 }; }
function addUsage(model, u) {
  const M = AI_MODELS[model] || AI_MODELS[AI_DEFAULT_MODEL];
  const cost = (n0(u && u.input_tokens) * M.inp + n0(u && u.output_tokens) * M.out) / 1e6;
  const a = aiUsage(); LS.set('aiUsage', { calls: a.calls + 1, cost: a.cost + cost });
}

function makeApiSample(cfg) {
  const call = async (input, opts = {}) => {
    if (navigator.onLine === false) throw apiErr('offline');
    const content = [];
    const imgs = opts.images ? Array.from(opts.images) : [];
    for (let i = 0; i < imgs.length; i++) {
      if (imgs.length > 1) content.push({ type: 'text', text: `Gambar ${i + 1}:` });
      content.push(await imgBlock(imgs[i]));
    }
    content.push({ type: 'text', text: String(input) });
    let res;
    try {
      res = await fetch(API_URL, {
        method: 'POST', signal: opts.signal,
        headers: {
          'content-type': 'application/json', 'x-api-key': cfg.key, 'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({ model: cfg.model, max_tokens: opts.maxTokens || 2048, messages: [{ role: 'user', content }] }),
      });
    } catch (e) {
      if (e && e.name === 'AbortError') throw apiErr('cancelled');
      throw apiErr(navigator.onLine === false ? 'offline' : 'network', String((e && e.message) || e));
    }
    if (!res.ok) {
      let msg = ''; try { const j = await res.json(); msg = (j && j.error && j.error.message) || ''; } catch (e) { /* bukan JSON */ }
      const code = res.status === 401 || res.status === 403 ? 'bad_key'
        : res.status === 429 ? 'rate_limited'
        : res.status === 413 ? 'prompt_too_large'
        : res.status === 400 && /credit|balance|billing/i.test(msg) ? 'no_credit'
        : res.status === 400 ? 'invalid_request'
        : res.status === 529 ? 'overloaded' : 'upstream_error';
      throw apiErr(code, msg);
    }
    const j = await res.json();
    addUsage(cfg.model, j.usage);
    if (j.stop_reason === 'refusal') throw apiErr('refused');
    const text = (j.content || []).filter(b => b && b.type === 'text').map(b => b.text).join('');
    if (!text.trim()) throw apiErr('empty_completion');
    if (opts.onText) opts.onText({ text, delta: text });
    return { text, truncated: j.stop_reason === 'max_tokens' };
  };
  call.json = async (input, opts) => {
    const { text } = await call(input, opts);
    const v = parseJsonLoose(text);
    if (v === undefined) throw apiErr('invalid_json');
    return v;
  };
  call.limits = async () => ({ maxInputBytes: 200000, images: { maxCount: 4, maxInputBytes: 25e6, mediaTypes: ['image/*'] } });
  call.viaApi = true;
  call.model = cfg.model;
  return call;
}
async function useApiSample() {
  const cfg = aiCfg();
  if (!cfg) return false;
  S.sample = makeApiSample(cfg);
  S.img = (await S.sample.limits()).images;
  return true;
}

// Kartu Profil (hanya versi offline)
function apiKeyCard() {
  const cfg = aiCfg(), u = aiUsage();
  const mOpt = Object.entries(AI_MODELS).map(([id, m]) => `<option value="${id}"${(cfg ? cfg.model : AI_DEFAULT_MODEL) === id ? ' selected' : ''}>${esc(t(id === 'claude-haiku-5-5' ? 'ai_m_haiku' : 'ai_m_sonnet', { m: m.label }))}</option>`).join('');
  const mask = cfg ? cfg.key.slice(0, 10) + '…' + cfg.key.slice(-4) : '';
  return `
    <div class="card">
      <h2>${t('apikey_t')}</h2>
      <p class="hint">${t('apikey_hint')} <a href="https://platform.claude.com/docs/en/get-api-key" target="_blank" rel="noopener">${t('apikey_how')}</a></p>
      ${cfg ? `<div class="note info">${t('apikey_on', { k: esc(mask), m: esc(AI_MODELS[cfg.model].label) })} ${u.calls ? t('apikey_usage', { n: fi(u.calls), c: (u.cost < 0.01 ? '< $0.01' : '$' + u.cost.toFixed(2)) }) : ''}</div>` : ''}
      <label class="f">${t('apikey_label')}<input id="ai-key" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="sk-ant-…"></label>
      <label class="f">${t('apikey_model')}<select id="ai-model">${mOpt}</select></label>
      <div class="row">
        <button class="btn primary" data-act="aiKeySave"${S.aiKeyBusy ? ' disabled' : ''}>${S.aiKeyBusy ? t('apikey_testing') : t('apikey_save')}</button>
        ${cfg ? `<button class="btn" data-act="aiKeyDel">${t('apikey_del')}</button>` : ''}
      </div>
      ${S.aiKeyMsg ? `<div class="note${S.aiKeyMsg.ok ? '' : ' bad'}">${esc(S.aiKeyMsg.text)}</div>` : ''}
      <p class="hint">${t('apikey_safety')}</p>
    </div>`;
}
async function saveApiKey() {
  const raw = ($('#ai-key') || {}).value || '';
  const model = ($('#ai-model') || {}).value || AI_DEFAULT_MODEL;
  const prev = aiCfg();
  const key = raw.trim() || (prev && prev.key) || '';
  if (!key) { S.aiKeyMsg = { ok: false, text: t('apikey_empty') }; renderProf(); return; }
  S.aiKeyBusy = true; S.aiKeyMsg = null; renderProf();
  const cfg = { key, model: AI_MODELS[model] ? model : AI_DEFAULT_MODEL };
  try {
    await makeApiSample(cfg)('Balas hanya dengan kata: OK', { maxTokens: 5 });
    LS.set('ai', cfg); await useApiSample();
    S.aiKeyMsg = { ok: true, text: t('apikey_ok', { m: AI_MODELS[cfg.model].label }) };
  } catch (e) {
    S.aiKeyMsg = { ok: false, text: aiErr(e) || t('ai_failed') };
    if (e && e.code === 'bad_key' && prev && prev.key === key) { LS.set('ai', null); S.sample = null; S.img = null; }
  }
  S.aiKeyBusy = false; renderProf(); renderSync();
}
function deleteApiKey() {
  try { localStorage.removeItem('nk:ai'); } catch (e) { /* abaikan */ }
  if (S.sample && S.sample.viaApi) { S.sample = null; S.img = null; }
  S.aiKeyMsg = { ok: true, text: t('apikey_deleted') };
  renderProf();
}
