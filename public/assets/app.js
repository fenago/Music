/* SongForge — a single-page studio for the Suno API (https://docs.sunoapi.org). */

/* =========================================================
   Utilities
   ========================================================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const fmtTime = (s) => {
  s = Math.max(0, Math.floor(s || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
const ago = (ts) => {
  const d = (Date.now() - ts) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
};
const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);
const artBg = (t) => {
  if (t?.image) return `background-image:url('${encodeURI(t.image)}')`;
  const h = Math.abs(hash(t?.id || t?.title || "x")) % 360;
  return `background-image:linear-gradient(135deg,hsl(${h} 75% 58%),hsl(${(h + 60) % 360} 80% 52%))`;
};

const store = {
  get(k, d) {
    try {
      const v = localStorage.getItem("sf." + k);
      return v == null ? d : JSON.parse(v);
    } catch { return d; }
  },
  set(k, v) {
    try { localStorage.setItem("sf." + k, JSON.stringify(v)); } catch (e) { console.warn("storage", e); }
  },
  del(k) { try { localStorage.removeItem("sf." + k); } catch {} },
};
const session = {
  get(k) { try { return JSON.parse(sessionStorage.getItem("sf." + k)); } catch { return null; } },
  set(k, v) { try { sessionStorage.setItem("sf." + k, JSON.stringify(v)); } catch {} },
  del(k) { try { sessionStorage.removeItem("sf." + k); } catch {} },
};

/* =========================================================
   Constants from the Suno API docs
   ========================================================= */
const MODELS = [
  { id: "V6", name: "V6", tag: "Recommended", desc: "Natural vocals, rich detail" },
  { id: "V6_WILD", name: "V6 Wild", tag: "Experimental", desc: "Bolder, more distinctive" },
  { id: "V6_MINI", name: "V6 Mini", tag: "Fast", desc: "Lightweight & quick" },
  { id: "V5_5", name: "V5.5", tag: "Legacy", desc: "Custom-taste model", legacy: true },
  { id: "V5", name: "V5", tag: "Legacy", desc: "Fast, strong musicality", legacy: true },
  { id: "V4_5PLUS", name: "V4.5+", tag: "Legacy", desc: "Richer sound, up to 8 min", legacy: true },
  { id: "V4_5ALL", name: "V4.5 All", tag: "Legacy", desc: "Better structure, 8 min", legacy: true },
  { id: "V4_5", name: "V4.5", tag: "Legacy", desc: "Smart prompts, 8 min", legacy: true },
  { id: "V4", name: "V4", tag: "Legacy", desc: "Improved vocals, 4 min", legacy: true },
];
const DURATION_MODELS = new Set(["V5_5", "V6", "V6_WILD", "V6_MINI"]);
const PERSONA_MODELS = new Set(["V5", "V5_5", "V6", "V6_WILD", "V6_MINI"]);
const limitsFor = (m) => (m === "V4" ? { style: 200, lyrics: 3000 } : { style: 1000, lyrics: 5000 });

const GENRES = ["Pop", "Hip-Hop", "Lo-fi", "EDM", "Indie Rock", "R&B", "Jazz", "Synthwave", "Country", "Afrobeats", "Reggaeton", "Cinematic", "K-Pop", "Metal", "Folk", "Gospel", "Bossa Nova", "Drum & Bass", "Trap", "Disco"];
const MOODS = ["Uplifting", "Melancholic", "Dreamy", "Energetic", "Chill", "Epic", "Romantic", "Dark", "Playful", "Nostalgic"];
const SURPRISES = [
  { p: "An upbeat 80s synthwave anthem about a robot who falls in love with a vending machine", s: "synthwave, retro, driving bass" },
  { p: "A cozy lo-fi track for studying on a rainy Sunday with a cat asleep on the keyboard", s: "lo-fi, jazzy chords, vinyl crackle" },
  { p: "An epic sea shanty about debugging production code at 3am", s: "sea shanty, group vocals, stomps" },
  { p: "A heartfelt country ballad about a dog waiting at the front door every evening", s: "country, acoustic guitar, pedal steel" },
  { p: "A bouncy K-pop summer hit about finally getting a day off", s: "k-pop, bright synths, catchy hook" },
  { p: "A dramatic opera-metal duet between a barista and a sleepy customer", s: "symphonic metal, operatic vocals" },
  { p: "A smooth bossa nova love song to a perfect avocado", s: "bossa nova, nylon guitar, soft brush drums" },
  { p: "A triumphant orchestral theme for the moment you finally fold the fitted sheet", s: "cinematic, orchestral, brass fanfare" },
  { p: "A chill afrobeats groove about a beach sunset with old friends", s: "afrobeats, warm percussion, sunny" },
  { p: "A gritty 90s hip-hop track about a pigeon who runs the city", s: "boom bap, 90s hip-hop, dusty samples" },
  { p: "A dreamy indie folk song about stargazing from the roof of a car", s: "indie folk, fingerpicked guitar, harmonies" },
  { p: "A high-energy drum & bass track for a midnight bike ride through neon streets", s: "drum and bass, liquid, neon" },
];
const LYRIC_IDEAS = [
  "A breakup song told from the point of view of a houseplant left behind",
  "Road trip anthem about the best friends you'll ever have",
  "A lullaby for a nervous astronaut on the night before launch",
  "An ode to Monday mornings and the first sip of coffee",
  "A love song between the sun and the moon who only meet at dusk",
  "A victory song for finishing a marathon you never trained for",
];
const SOUND_PRESETS = ["Soft rain with distant thunder", "Retro arcade coin pickup", "Lo-fi drum loop, dusty and warm", "Crackling campfire at night", "Cinematic whoosh transition", "Busy Tokyo street ambience", "Ocean waves on a pebble beach", "Sci-fi spaceship engine hum"];
const KEYS = ["Any", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B", "Cm", "C#m", "Dm", "D#m", "Em", "Fm", "F#m", "Gm", "G#m", "Am", "A#m", "Bm"];
const STEM_NAMES = ["Lead Vocal", "Backing Vocals", "Drum Kit", "Kick", "Snare", "Hi-Hat", "Cymbals", "Percussion", "Bass", "Synth Bass", "808", "Electric Bass", "Upright Bass", "Piano", "Electric Piano", "Rhodes", "Keyboards", "Organ", "Synth", "Synth Pad", "Synth Lead", "Synth Keys", "Synth Strings", "Guitar", "Acoustic Guitar", "Electric Guitar", "Lead Electric Guitar", "Rhythm Electric Guitar", "Distorted Electric Guitar", "String Section", "Violin", "Cello", "Brass Section", "Trumpet", "Saxophone", "Woodwinds", "Flute", "Choir", "Orchestra", "Sound Effects", "Risers", "Bells", "Harp", "Ukulele", "Banjo", "Mandolin", "Harmonica", "Accordion", "Sitar", "Tabla", "Steel Drums", "Marimba", "Vibraphone", "Glockenspiel", "Music Box", "Theremin", "Didgeridoo", "Bagpipes"];
const COOK_MSGS = ["Tuning the guitars…", "Warming up the vocalists…", "Arguing with the drummer…", "Dialing in the low end…", "Polishing the chorus…", "Sprinkling on some reverb…", "Adding a key change nobody asked for…", "Finding the perfect snare…", "Teaching the bassist the song…", "Mixing and mastering…"];
const STRUCTURE_TAGS = ["[Intro]", "[Verse]", "[Pre-Chorus]", "[Chorus]", "[Bridge]", "[Drop]", "[Outro]", "[Instrumental]"];
const STEM_LABELS = { originUrl: "Original mix", vocalUrl: "Vocals", instrumentalUrl: "Instrumental", backingVocalsUrl: "Backing vocals", drumsUrl: "Drums", bassUrl: "Bass", guitarUrl: "Guitar", keyboardUrl: "Keys", percussionUrl: "Percussion", stringsUrl: "Strings", synthUrl: "Synth", fxUrl: "FX", brassUrl: "Brass", woodwindsUrl: "Woodwinds" };
const ERR = {
  400: "The request was rejected. Please check your inputs.",
  401: "That API key wasn't accepted. Double-check it and try again.",
  402: "Not enough credits for this. Top up at sunoapi.org.",
  404: "Not found.",
  405: "Rate limit exceeded. Give it a moment.",
  409: "That already exists.",
  413: "Your prompt or lyrics are too long.",
  422: "Some parameters didn't pass validation.",
  429: "Not enough credits. Top up your Suno API account.",
  430: "You're going a bit fast. Try again in a few seconds.",
  451: "Couldn't fetch the source file. Is the URL public?",
  455: "Suno API is under maintenance. Try again shortly.",
  500: "The Suno API hit an error. Try again.",
};

/* =========================================================
   State
   ========================================================= */
const state = {
  key: null,
  credits: null,
  model: store.get("model", "V6"),
  mode: store.get("mode", "simple"),
  tracks: store.get("tracks", []),
  tasks: store.get("tasks", []),
  personas: store.get("personas", []),
  lyricSets: store.get("lyricSets", []),
  current: null,
  filter: "all",
  search: "",
  drawerTrack: null,
  midi: {},
};
const save = {
  tracks: () => store.set("tracks", state.tracks.slice(0, 400)),
  tasks: () => store.set("tasks", state.tasks.slice(0, 80)),
  personas: () => store.set("personas", state.personas),
  lyrics: () => store.set("lyricSets", state.lyricSets.slice(0, 30)),
};
const findTrack = (id) => state.tracks.find((t) => t.id === id);

/* =========================================================
   API client (proxied through Netlify, direct as fallback)
   ========================================================= */
const HOSTS = { api: ["/suno", "https://api.sunoapi.org"], files: ["/suno-files", "https://sunoapiorg.redpandaai.co"] };
let direct = location.protocol === "file:";

class ApiError extends Error {
  constructor(msg, code, data) { super(msg); this.code = code; this.data = data; }
}

async function api(path, { method = "GET", body, form, host = "api", query, tolerate } = {}) {
  const qs = query ? "?" + new URLSearchParams(query) : "";
  const url = HOSTS[host][direct ? 1 : 0] + path + qs;
  const headers = { Authorization: `Bearer ${state.key}` };
  const init = { method, headers };
  if (body) { headers["Content-Type"] = "application/json"; init.body = JSON.stringify(body); }
  if (form) init.body = form;
  let res;
  try {
    res = await fetch(url, init);
  } catch (e) {
    if (!direct) { direct = true; return api(path, { method, body, form, host, query, tolerate }); }
    throw new ApiError("Network error. Check your connection and try again.", 0);
  }
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("json")) {
    // No proxy available (e.g. a plain static server): talk to the API directly.
    if (!direct && (res.status === 404 || ct.includes("html"))) { direct = true; return api(path, { method, body, form, host, query, tolerate }); }
    throw new ApiError(`Unexpected response from the API (${res.status}).`, res.status);
  }
  const json = await res.json();
  const code = json.code ?? res.status;
  if (code !== 200 && !(tolerate && json?.data?.taskId)) {
    const base = ERR[code] || "Something went wrong.";
    const detail = json.msg && json.msg !== "success" ? json.msg : "";
    throw new ApiError(detail && ![401, 429].includes(code) ? `${detail}` : base, code, json);
  }
  return json;
}

const callbackUrl = () =>
  location.protocol === "https:" && !/^(localhost|127\.)/.test(location.hostname)
    ? `${location.origin}/.netlify/functions/suno-callback`
    : "https://example.com/songforge-callback";

async function refreshCredits() {
  try {
    const j = await api("/api/v1/generate/credit");
    state.credits = j.data;
    $("#credits-val").textContent = Number(j.data).toLocaleString();
  } catch (e) {
    $("#credits-val").textContent = "—";
    if (e.code === 401) logout("Your API key is no longer valid.");
  }
}

async function uploadFile(file, folder = "media") {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("uploadPath", `songforge/${folder}`);
  fd.append("fileName", `${Date.now()}-${file.name.replace(/[^\w.-]+/g, "_")}`);
  const j = await api("/api/file-stream-upload", { method: "POST", form: fd, host: "files" });
  const url = j.data?.fileUrl || j.data?.downloadUrl;
  if (!url) throw new ApiError("Upload succeeded but no file URL came back.");
  return url;
}

/* =========================================================
   Theme
   ========================================================= */
const THEMES = [["light", "☀︎", "Light"], ["dark", "☾", "Dark"], ["system", "◐", "System"]];
const mq = matchMedia("(prefers-color-scheme: dark)");
function applyTheme(pref = store.get("theme", "system")) {
  const dark = pref === "dark" || (pref === "system" && mq.matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  $$("[data-theme-switch] button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.t === pref)));
}
function initTheme() {
  $$("[data-theme-switch]").forEach((el) => {
    el.setAttribute("role", "group");
    el.setAttribute("aria-label", "Theme");
    el.innerHTML = THEMES.map(([t, i, l]) => `<button type="button" data-t="${t}" title="${l} theme" aria-label="${l} theme">${i}</button>`).join("");
    el.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-t]");
      if (!b) return;
      store.set("theme", b.dataset.t);
      applyTheme(b.dataset.t);
    });
  });
  mq.addEventListener?.("change", () => applyTheme());
  applyTheme();
}

/* =========================================================
   Key gate
   ========================================================= */
function loadKey() {
  return store.get("key", null) || session.get("key");
}
function initGate() {
  const form = $("#gate-form");
  const input = $("#gate-key");
  $("#gate-peek").onclick = () => {
    input.type = input.type === "password" ? "text" : "password";
    $("#gate-peek").setAttribute("aria-label", input.type === "password" ? "Show key" : "Hide key");
  };
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const key = input.value.trim();
    const errEl = $("#gate-error");
    errEl.hidden = true;
    if (!key) return;
    const btn = $("#gate-submit");
    setLoading(btn, true);
    state.key = key;
    try {
      const j = await api("/api/v1/generate/credit");
      state.credits = j.data;
      if ($("#gate-remember").checked) store.set("key", key);
      else { store.del("key"); session.set("key", key); }
      enterApp();
      toast(`Welcome in! You have <b>${Number(j.data).toLocaleString()}</b> credits. Let's make something.`, { type: "ok" });
    } catch (err) {
      state.key = null;
      errEl.textContent = err.code === 401 ? ERR[401] : err.message;
      errEl.hidden = false;
    } finally {
      setLoading(btn, false);
    }
  });
}
function enterApp() {
  $("#gate").hidden = true;
  $("#app").hidden = false;
  $("#credits-val").textContent = state.credits != null ? Number(state.credits).toLocaleString() : "…";
  renderAll();
  startPolling();
}
function logout(msg) {
  store.del("key");
  session.del("key");
  state.key = null;
  audio.pause();
  $("#app").hidden = true;
  $("#gate").hidden = false;
  $("#gate-key").value = "";
  if (msg) { $("#gate-error").textContent = msg; $("#gate-error").hidden = false; }
}

/* =========================================================
   Navigation
   ========================================================= */
function go(view) {
  $$("[data-nav]").forEach((b) => b.classList.toggle("active", b.dataset.nav === view));
  $$("[data-view]").forEach((v) => v.classList.toggle("active", v.dataset.view === view));
  store.set("view", view);
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function initNav() {
  $$("[data-nav]").forEach((b) => (b.onclick = () => go(b.dataset.nav)));
  document.addEventListener("click", (e) => {
    const g = e.target.closest("[data-goto]");
    if (g) go(g.dataset.goto);
  });
  go(store.get("view", "create"));
}

/* =========================================================
   Reusable creative controls
   ========================================================= */
let uid = 0;
const modelOptions = (sel = "V6") =>
  `<optgroup label="Current">${MODELS.filter((m) => !m.legacy).map((m) => `<option value="${m.id}" ${m.id === sel ? "selected" : ""}>${m.name} · ${m.desc}</option>`).join("")}</optgroup>
   <optgroup label="Legacy">${MODELS.filter((m) => m.legacy).map((m) => `<option value="${m.id}" ${m.id === sel ? "selected" : ""}>${m.name} · ${m.desc}</option>`).join("")}</optgroup>`;

function personaOptions() {
  return `<option value="">None</option>` +
    state.personas.map((p) => `<option value="${esc(p.personaId)}|${esc(p.type || "style_persona")}">${esc(p.name)}${p.type === "voice_persona" ? " (voice)" : ""}</option>`).join("");
}

function controlsHTML(o, v = {}) {
  const id = `c${++uid}`;
  const styleKey = o.style || "style";
  const h = [];
  if (o.model) h.push(`<div class="field"><label class="label" for="${id}-model">Model</label><select id="${id}-model" name="model" class="input" data-model-select>${modelOptions(v.model || "V6")}</select></div>`);
  if (o.title) h.push(`<div class="field"><label class="label" for="${id}-title">Title${o.titleRequired ? " *" : ' <span class="muted">(optional)</span>'}</label><input id="${id}-title" name="title" class="input" maxlength="${o.titleMax || 80}" ${o.titleRequired ? "required" : ""} value="${esc(v.title || "")}" placeholder="Give it a name" /></div>`);
  if (o.style) h.push(`<div class="field">
      <div class="label-row"><label class="label" for="${id}-style">Style${o.styleRequired ? " *" : ""}</label>${o.boost ? `<button type="button" class="link" data-boost>✨ Boost style</button>` : ""}</div>
      <textarea id="${id}-style" name="${styleKey}" class="input" rows="2" data-style data-count maxlength="1000" ${o.styleRequired ? "required" : ""} placeholder="Genres, instruments, mood, tempo, e.g. dreamy synth-pop, female vocals, 110 bpm">${esc(v.style || "")}</textarea>
      <div class="chips" data-chips-for="${id}-style"></div></div>`);
  if (o.instrumental) h.push(`<label class="switch"><input type="checkbox" name="instrumental" ${v.instrumental ? "checked" : ""} /><span></span> Instrumental only (no vocals)</label>`);
  if (o.lyrics) h.push(`<div class="field" data-vocal-only>
      <div class="label-row"><label class="label" for="${id}-lyrics">Lyrics <span class="muted">(optional)</span></label>${o.noWrite ? "" : `<button type="button" class="link" data-write-lyrics="${id}-lyrics">✍️ Write with AI</button>`}</div>
      <div class="tag-row">${STRUCTURE_TAGS.map((t) => `<button type="button" class="chip" data-insert="${t}">${t}</button>`).join("")}</div>
      <textarea id="${id}-lyrics" name="lyrics" class="input" rows="8" data-lyrics data-count maxlength="5000" placeholder="[Verse]\nWrite your own lyrics, or leave empty and let the AI write them">${esc(v.lyrics || "")}</textarea></div>`);
  const adv = [];
  if (o.negative) adv.push(`<div class="field"><label class="label" for="${id}-neg">Avoid these styles${o.negativeRequired ? " *" : ""}</label><input id="${id}-neg" name="negativeTags" class="input" maxlength="1000" ${o.negativeRequired ? "required" : ""} value="${esc(v.negativeTags || (o.negativeRequired ? "Low quality, Off-key" : ""))}" placeholder="e.g. heavy metal, autotune, screaming" /></div>`);
  if (o.gender) adv.push(`<div class="field" data-vocal-only><span class="label">Vocal preference</span><div class="gender">
      <label><input type="radio" name="vocalGender" value="" checked /><span>Any</span></label>
      <label><input type="radio" name="vocalGender" value="f" /><span>♀ Female</span></label>
      <label><input type="radio" name="vocalGender" value="m" /><span>♂ Male</span></label></div></div>`);
  if (o.persona) adv.push(`<div class="field" data-persona-field><label class="label" for="${id}-persona">Persona</label><select id="${id}-persona" name="persona" class="input" data-persona-select>${personaOptions()}</select><small class="hint">Reuse the voice and character of a track you saved as a persona.</small></div>`);
  if (o.duration) adv.push(`<div class="field" data-duration-field>
      <div class="label-row"><label class="switch small"><input type="checkbox" data-duration-on /><span></span> <b>Set length</b></label><output class="muted" data-duration-out>auto</output></div>
      <input type="range" name="duration" min="10" max="360" step="5" value="120" disabled aria-label="Length in seconds" /><small class="hint">10 s to 6 min. Available on V5.5 and V6 models.</small></div>`);
  if (o.finetune) adv.push(`<div class="field"><label class="switch small"><input type="checkbox" data-ft-on /><span></span> <b>Fine-tune the generator</b></label></div>
      <div class="ft-grid" data-ft hidden>
        ${slider("styleWeight", "Style adherence", 0.65, "How strictly to follow the style")}
        ${slider("weirdnessConstraint", "Weirdness", 0.5, "Higher values take more creative risks")}
        <div data-vocal-only>${slider("audioWeight", "Audio weight", 0.65, "Weight of the audio features")}</div>
        <div class="ft"><label>Variety <output data-variety-out>Normal</output></label><input type="range" name="variety" min="0" max="4" step="1" value="1" /><small>From exact to maximum variation</small></div>
      </div>`);
  if (adv.length) h.push(`<details class="more" ${o.openAdvanced ? "open" : ""}><summary>Advanced options</summary>${adv.join("")}</details>`);
  return h.join("");
}
function slider(name, label, val, help) {
  return `<div class="ft"><label>${label} <output>${val.toFixed(2)}</output></label><input type="range" name="${name}" min="0" max="1" step="0.01" value="${val}" /><small>${help}</small></div>`;
}

function renderChips(container) {
  const target = document.getElementById(container.dataset.chipsFor);
  if (!target) return;
  const all = [...GENRES.slice(0, 12), ...MOODS.slice(0, 6)];
  container.innerHTML = all.map((g) => `<button type="button" class="chip">${g}</button>`).join("");
  const sync = () => {
    const cur = target.value.toLowerCase();
    $$(".chip", container).forEach((c) => c.classList.toggle("on", cur.includes(c.textContent.toLowerCase())));
  };
  container.onclick = (e) => {
    const c = e.target.closest(".chip");
    if (!c) return;
    const word = c.textContent;
    const parts = target.value.split(",").map((s) => s.trim()).filter(Boolean);
    const i = parts.findIndex((p) => p.toLowerCase() === word.toLowerCase());
    if (i >= 0) parts.splice(i, 1); else parts.push(word);
    target.value = parts.join(", ");
    target.dispatchEvent(new Event("input", { bubbles: true }));
  };
  target.addEventListener("input", sync);
  sync();
}

function attachCounter(el) {
  if (el._counter) return;
  const c = document.createElement("div");
  c.className = "counter";
  el.after(c);
  el._counter = c;
  const upd = () => {
    const max = +el.getAttribute("maxlength") || 0;
    c.textContent = max ? `${el.value.length.toLocaleString()} / ${max.toLocaleString()}` : `${el.value.length}`;
    c.classList.toggle("over", max && el.value.length >= max);
  };
  el.addEventListener("input", upd);
  el._updCounter = upd;
  upd();
}

function applyModelLimits(root, model) {
  const L = limitsFor(model);
  $$("[data-style]", root).forEach((el) => { el.maxLength = L.style; el._updCounter?.(); });
  $$("[data-lyrics]", root).forEach((el) => { el.maxLength = L.lyrics; el._updCounter?.(); });
  $$("[data-duration-field]", root).forEach((el) => (el.hidden = !DURATION_MODELS.has(model)));
  $$("[data-persona-field]", root).forEach((el) => (el.hidden = !PERSONA_MODELS.has(model)));
}

function wireControls(root) {
  $$("[data-count]", root).forEach(attachCounter);
  $$("[data-chips-for]", root).forEach(renderChips);
  $$(".ft input[type=range]", root).forEach((r) => {
    const out = r.parentElement.querySelector("output");
    if (out && r.name !== "variety") r.addEventListener("input", () => (out.textContent = (+r.value).toFixed(2)));
  });
  const variety = $("[name=variety]", root);
  if (variety) {
    const names = ["Off (exact)", "Normal", "High", "Extra", "Max"];
    variety.addEventListener("input", () => ($("[data-variety-out]", root).textContent = names[variety.value]));
  }
  const ftOn = $("[data-ft-on]", root);
  if (ftOn) ftOn.addEventListener("change", () => ($("[data-ft]", root).hidden = !ftOn.checked));
  const dOn = $("[data-duration-on]", root);
  if (dOn) {
    const r = $("[name=duration]", root), out = $("[data-duration-out]", root);
    const upd = () => { r.disabled = !dOn.checked; out.textContent = dOn.checked ? fmtTime(r.value) : "auto"; };
    dOn.addEventListener("change", upd);
    r.addEventListener("input", upd);
  }
  const inst = $("[name=instrumental]", root);
  if (inst) {
    const upd = () => $$("[data-vocal-only]", root).forEach((el) => (el.hidden = inst.checked));
    inst.addEventListener("change", upd);
    upd();
  }
  $$("[data-insert]", root).forEach((b) =>
    b.addEventListener("click", () => {
      const ta = b.closest(".field").querySelector("textarea");
      const s = ta.selectionStart ?? ta.value.length;
      const pre = ta.value.slice(0, s), post = ta.value.slice(ta.selectionEnd ?? s);
      const ins = (pre && !pre.endsWith("\n") ? "\n" : "") + b.dataset.insert + "\n";
      ta.value = pre + ins + post;
      ta.focus();
      ta.selectionStart = ta.selectionEnd = (pre + ins).length;
      ta.dispatchEvent(new Event("input"));
    })
  );
  $$("[data-boost]", root).forEach((b) => b.addEventListener("click", () => boostStyle(b.closest(".field").querySelector("textarea"), b)));
  $$("[data-write-lyrics]", root).forEach((b) => b.addEventListener("click", () => writeLyricsInto(b.dataset.writeLyrics)));
  const ms = $("[data-model-select]", root);
  if (ms) {
    ms.addEventListener("change", () => applyModelLimits(root, ms.value));
    applyModelLimits(root, ms.value);
  }
}

function readControls(root, model) {
  const out = {};
  const val = (n) => ($(`[name="${n}"]`, root)?.value ?? "").trim();
  const inst = $("[name=instrumental]", root)?.checked || false;
  for (const k of ["title", "style", "tags", "negativeTags"]) if (val(k)) out[k] = val(k);
  if (!inst && val("lyrics")) out.lyrics = val("lyrics");
  if ($("[name=instrumental]", root)) out.instrumental = inst;
  const g = $("[name=vocalGender]:checked", root)?.value;
  if (g && !inst) out.vocalGender = g;
  if ($("[data-ft-on]", root)?.checked) {
    out.styleWeight = +val("styleWeight");
    out.weirdnessConstraint = +val("weirdnessConstraint");
    if (!inst) out.audioWeight = +val("audioWeight");
    out.variety = +val("variety");
  }
  if ($("[data-duration-on]", root)?.checked && DURATION_MODELS.has(model)) out.duration = +val("duration");
  const p = val("persona");
  if (p && PERSONA_MODELS.has(model)) {
    const [personaId, personaModel] = p.split("|");
    out.personaId = personaId;
    out.personaModel = personaModel || "style_persona";
  }
  return out;
}

function refreshPersonaSelects() {
  $$("[data-persona-select]").forEach((s) => {
    const v = s.value;
    s.innerHTML = personaOptions();
    s.value = v;
  });
}

async function boostStyle(ta, btn) {
  const content = ta.value.trim();
  if (!content) { toast("Type a few style words first, then boost them into a rich description.", { type: "err" }); ta.focus(); return; }
  setLoading(btn, true);
  try {
    const j = await api("/api/v1/style/generate", { method: "POST", body: { content } });
    const res = j.data?.result;
    if (!res) throw new Error(j.data?.errorMessage || "No boosted style came back.");
    ta.value = res.slice(0, +ta.getAttribute("maxlength") || 1000);
    ta.dispatchEvent(new Event("input"));
    toast("Style boosted ✨", { type: "ok" });
    refreshCredits();
  } catch (e) { toast(e.message, { type: "err" }); }
  finally { setLoading(btn, false); }
}

/* =========================================================
   Source widget (upload / URL / pick from library)
   ========================================================= */
function initSource(el) {
  const max = +el.dataset.max || 1;
  const accept = el.dataset.accept || "*/*";
  const kind = accept.split("/")[0];
  el._urls = [];
  el.innerHTML = `
    <label class="drop"><span class="ico">${kind === "image" ? "🖼" : kind === "video" ? "🎬" : "🎧"}</span>
      <span><b>Drop a file or click to upload</b><small>${kind === "audio" ? "MP3, WAV, M4A…" : kind === "image" ? "JPG, PNG, WEBP" : "MP4, MOV, WEBM"} · files are stored for 3 days</small></span>
      <input type="file" accept="${accept}" ${max > 1 ? "multiple" : ""} hidden /></label>
    <div class="row"><input type="url" class="input" placeholder="…or paste a public URL" />
      <button type="button" class="btn sm" data-add>Add</button>
      ${el.hasAttribute("data-library") ? `<select class="input" data-lib><option value="">From my library…</option></select>` : ""}</div>
    <div class="items"></div>`;
  const items = $(".items", el), file = $("input[type=file]", el), urlIn = $("input[type=url]", el);
  const render = () => {
    items.innerHTML = el._urls.map((u, i) => {
      const nm = u.name || u.url.split("/").pop().split("?")[0];
      const prev = u.uploading ? `<span class="ph">⏳</span>` : kind === "image" ? `<img src="${esc(u.url)}" alt="" />` : `<span class="ph">${kind === "video" ? "🎬" : "🎵"}</span>`;
      return `<div class="item ${u.uploading ? "up" : ""}">${prev}<span class="nm" title="${esc(nm)}">${esc(nm)}</span>
        ${kind === "audio" && !u.uploading ? `<audio controls preload="none" src="${esc(u.url)}"></audio>` : ""}
        <button type="button" data-rm="${i}" aria-label="Remove">×</button></div>`;
    }).join("");
  };
  const add = (entry) => {
    if (max === 1) el._urls = [entry];
    else if (el._urls.length >= max) { toast(`You can add up to ${max}.`, { type: "err" }); return false; }
    else el._urls.push(entry);
    render();
    return true;
  };
  const handleFiles = async (files) => {
    for (const f of [...files].slice(0, max)) {
      const entry = { url: "", name: f.name, uploading: true };
      if (!add(entry)) break;
      try {
        entry.url = await uploadFile(f, kind);
        entry.uploading = false;
        toast(`Uploaded <b>${esc(f.name)}</b>`, { type: "ok", ttl: 2500 });
      } catch (e) {
        el._urls = el._urls.filter((x) => x !== entry);
        toast(`Upload failed: ${esc(e.message)}`, { type: "err" });
      }
      render();
    }
  };
  file.addEventListener("change", () => { handleFiles(file.files); file.value = ""; });
  $("[data-add]", el).onclick = () => {
    const u = urlIn.value.trim();
    if (!/^https?:\/\//i.test(u)) { toast("Paste a full http(s) URL.", { type: "err" }); return; }
    if (add({ url: u })) urlIn.value = "";
  };
  urlIn.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); $("[data-add]", el).click(); } });
  items.addEventListener("click", (e) => {
    const b = e.target.closest("[data-rm]");
    if (b) { el._urls.splice(+b.dataset.rm, 1); render(); }
  });
  const lib = $("[data-lib]", el);
  if (lib) {
    lib.addEventListener("focus", () => fillLibSelect(lib));
    lib.addEventListener("pointerdown", () => fillLibSelect(lib));
    lib.addEventListener("change", () => {
      const t = findTrack(lib.value);
      if (t) add({ url: t.audio || t.stream, name: `${t.title} (library)` });
      lib.value = "";
    });
  }
  ["dragenter", "dragover"].forEach((ev) => el.addEventListener(ev, (e) => { e.preventDefault(); el.classList.add("drag"); }));
  ["dragleave", "drop"].forEach((ev) => el.addEventListener(ev, (e) => { e.preventDefault(); el.classList.remove("drag"); }));
  el.addEventListener("drop", (e) => e.dataTransfer?.files?.length && handleFiles(e.dataTransfer.files));
  el.setUrl = (url, name) => add({ url, name });
  el.getUrls = () => { if (el._urls.some((u) => u.uploading)) throw new Error("Please wait for uploads to finish."); return el._urls.map((u) => u.url); };
  el.clear = () => { el._urls = []; render(); };
}
function fillLibSelect(sel) {
  const tracks = state.tracks.filter((t) => t.audio);
  sel.innerHTML = `<option value="">From my library…</option>` + tracks.map((t) => `<option value="${esc(t.id)}">${esc(t.title)}${t.duration ? ` · ${fmtTime(t.duration)}` : ""}</option>`).join("");
}

/* =========================================================
   Create
   ========================================================= */
function renderModels() {
  const showLegacy = store.get("legacy", false) || MODELS.find((m) => m.id === state.model)?.legacy;
  $("#legacy-toggle").textContent = showLegacy ? "Hide legacy models" : "Show legacy models";
  $("#models").innerHTML = MODELS.filter((m) => showLegacy || !m.legacy).map((m) =>
    `<button type="button" class="model ${m.legacy ? "legacy" : ""} ${m.id === state.model ? "on" : ""}" data-model="${m.id}" aria-pressed="${m.id === state.model}">
      <span class="tagline">${m.tag}</span><b>${m.name}</b><span>${m.desc}</span></button>`).join("");
  applyModelLimits($("#create-form"), state.model);
}
function setMode(mode) {
  state.mode = mode;
  store.set("mode", mode);
  $$("#create-form [data-mode]").forEach((b) => { b.classList.toggle("active", b.dataset.mode === mode); b.setAttribute("aria-selected", String(b.dataset.mode === mode)); });
  $$("#create-form [data-pane]").forEach((p) => (p.hidden = p.dataset.pane !== mode));
}
function initCreate() {
  const form = $("#create-form");
  renderModels();
  setMode(state.mode);
  $("#models").onclick = (e) => {
    const b = e.target.closest("[data-model]");
    if (!b) return;
    state.model = b.dataset.model;
    store.set("model", state.model);
    renderModels();
  };
  $("#legacy-toggle").onclick = () => { store.set("legacy", !store.get("legacy", false)); renderModels(); };
  $$("[data-mode]", form).forEach((b) => (b.onclick = () => setMode(b.dataset.mode)));
  $("#surprise").onclick = () => {
    const s = pick(SURPRISES);
    $("#simple-prompt").value = s.p;
    $("#simple-style").value = s.s;
    ["#simple-prompt", "#simple-style"].forEach((q) => $(q).dispatchEvent(new Event("input")));
  };
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("button[type=submit]", form);
    const model = state.model;
    let body = { model, callBackUrl: callbackUrl() };
    try {
      if (state.mode === "simple") {
        const pane = $("[data-pane=simple]", form);
        const prompt = $("#simple-prompt").value.trim();
        const style = $("#simple-style").value.trim();
        const lyrics = $("#simple-lyrics").value.trim();
        const media = {};
        for (const k of ["imageUrls", "videoUrls", "audioUrls"]) {
          const u = $(`[data-source=${k}]`, pane).getUrls();
          if (u.length) media[k] = u;
        }
        if (!prompt && !style && !lyrics && !Object.keys(media).length) {
          toast("Describe your song first, or try 🎲 Surprise me.", { type: "err" });
          $("#simple-prompt").focus();
          return;
        }
        const total = (style ? 1 : 0) + (lyrics ? 1 : 0) + Object.values(media).flat().length;
        if (total > 10) { toast("That's more than 10 references. Remove a few.", { type: "err" }); return; }
        body = { ...body, customMode: false, instrumental: $("[name=instrumental]", pane).checked, ...(prompt && { prompt }), ...(style && { style }), ...(lyrics && { lyrics }), ...media };
      } else {
        const pane = $("[data-pane=custom]", form);
        const c = readControls(pane, model);
        if (!c.style && !c.lyrics && !c.negativeTags) {
          toast("Add a style or some lyrics so the AI knows what to make.", { type: "err" });
          $("[name=style]", pane).focus();
          return;
        }
        body = { ...body, customMode: true, instrumental: false, ...c };
      }
    } catch (err) { toast(err.message, { type: "err" }); return; }
    setLoading(btn, true);
    try {
      const j = await api("/api/v1/generate", { method: "POST", body });
      addTask("music", j.data.taskId, {
        label: body.title || body.prompt?.slice(0, 60) || body.style?.slice(0, 60) || "New song",
        model, source: "Create", instrumental: body.instrumental,
      });
      toast("🎶 Your song is cooking. It usually takes 1–3 minutes.", { type: "ok" });
      refreshCredits();
    } catch (err) { toast(err.message, { type: "err" }); }
    finally { setLoading(btn, false); }
  });
}

/* =========================================================
   Lyrics Lab
   ========================================================= */
function initLyrics() {
  const form = $("#lyrics-form");
  $("#lyrics-surprise").onclick = () => { $("#lyrics-prompt").value = pick(LYRIC_IDEAS); $("#lyrics-prompt").dispatchEvent(new Event("input")); };
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const prompt = $("#lyrics-prompt").value.trim();
    if (!prompt) { $("#lyrics-prompt").focus(); return; }
    const btn = $("button[type=submit]", form);
    setLoading(btn, true);
    try { await startLyrics(prompt); toast("✍️ Writing lyrics…", { type: "ok" }); }
    catch (err) { toast(err.message, { type: "err" }); }
    finally { setLoading(btn, false); }
  });
  renderLyrics();
}
async function startLyrics(prompt, target) {
  const j = await api("/api/v1/lyrics", { method: "POST", body: { prompt, callBackUrl: callbackUrl() } });
  addTask("lyrics", j.data.taskId, { label: prompt.slice(0, 60), prompt, target });
  refreshCredits();
}
function writeLyricsInto(targetId) {
  openModal({
    title: "✍️ Write lyrics with AI",
    body: `<div class="field"><label class="label" for="m-lp">What's the song about?</label>
      <textarea id="m-lp" name="prompt" class="input" rows="3" maxlength="200" required placeholder="${esc(pick(LYRIC_IDEAS))}"></textarea></div>
      <p class="hint">You'll get several drafts to choose from in about a minute.</p>`,
    submit: "Write lyrics",
    onSubmit: async (f) => {
      const p = f.prompt.value.trim();
      if (!p) throw new Error("Tell the AI what the song is about.");
      await startLyrics(p, targetId);
      toast("✍️ Writing lyrics… we'll let you pick your favorite.", { type: "ok" });
    },
  });
}
function renderLyrics() {
  const el = $("#lyrics-results");
  const pending = state.tasks.filter((t) => t.kind === "lyrics" && t.status === "pending");
  if (!state.lyricSets.length && !pending.length) {
    el.innerHTML = `<div class="empty card"><span class="big">📝</span>Your lyric drafts will show up here.</div>`;
    return;
  }
  el.innerHTML = pending.map((t) => `<div class="card"><div class="task-top"><span class="eq-mini on"><i></i><i></i><i></i></span><span class="t-title">Writing “${esc(t.label)}”…</span></div></div>`).join("") +
    state.lyricSets.map((set, si) => `<div class="lgroup"><h4>“${esc(set.prompt)}” · ${ago(set.at)}</h4><div class="lgrid">
      ${set.items.map((it, ii) => `<article class="lcard"><b>${esc(it.title || "Untitled")}</b><pre>${esc(it.text)}</pre>
        <div class="actions"><button class="btn sm primary" data-use-lyrics="${si}:${ii}">🎵 Make it a song</button><button class="btn sm" data-copy-lyrics="${si}:${ii}">Copy</button></div></article>`).join("")}
      </div></div>`).join("");
}
function useLyrics(item, targetId) {
  if (targetId && document.getElementById(targetId)) {
    const ta = document.getElementById(targetId);
    ta.value = item.text;
    ta.dispatchEvent(new Event("input"));
    const form = ta.closest("form");
    const title = form && $("[name=title]", form);
    if (title && !title.value) title.value = item.title || "";
    if (ta.closest("#create-form")) { setMode("custom"); go("create"); }
    else if (ta.closest("[data-remix-form]")) go("remix");
    ta.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  const pane = $("#create-form [data-pane=custom]");
  setMode("custom");
  const ta = $("[name=lyrics]", pane);
  ta.value = item.text;
  ta.dispatchEvent(new Event("input"));
  $("[name=title]", pane).value = item.title || "";
  const inst = $("[name=instrumental]", pane);
  if (inst.checked) { inst.checked = false; inst.dispatchEvent(new Event("change")); }
  go("create");
  toast("Lyrics loaded into a Custom song. Add a style and hit Create!", { type: "ok" });
}
document.addEventListener("click", (e) => {
  const u = e.target.closest("[data-use-lyrics]"), c = e.target.closest("[data-copy-lyrics]");
  const ref = (u || c)?.dataset[u ? "useLyrics" : "copyLyrics"];
  if (!ref) return;
  const [si, ii] = ref.split(":").map(Number);
  const item = state.lyricSets[si]?.items[ii];
  if (!item) return;
  if (u) useLyrics(item);
  else navigator.clipboard?.writeText(item.text).then(() => toast("Copied to clipboard", { ttl: 1800 }));
});
function chooseLyrics(set, target) {
  openModal({
    title: "Pick your favorite draft",
    wide: true,
    body: `<div class="lgrid">${set.items.map((it, i) => `<button type="button" class="lchoice" data-pick="${i}"><b>${esc(it.title || `Draft ${i + 1}`)}</b><pre>${esc(it.text)}</pre></button>`).join("")}</div>`,
    submit: null,
    onOpen: (f) => f.addEventListener("click", (e) => {
      const b = e.target.closest("[data-pick]");
      if (!b) return;
      closeModal();
      useLyrics(set.items[+b.dataset.pick], target);
    }),
  });
}

/* =========================================================
   Remix Studio
   ========================================================= */
const REMIX = {
  cover: { path: "/api/v1/generate/upload-cover", label: "Cover" },
  extend: { path: "/api/v1/generate/upload-extend", label: "Extension" },
  vocals: { path: "/api/v1/generate/add-vocals", label: "Vocals" },
  instrumental: { path: "/api/v1/generate/add-instrumental", label: "Instrumental" },
  mashup: { path: "/api/v1/generate/mashup", label: "Mashup" },
  replace: { path: "/api/v1/generate/replace-section", label: "Replaced section" },
};
function remixTab(name) {
  $$("#remix-tabs [data-remix]").forEach((b) => b.classList.toggle("active", b.dataset.remix === name));
  $$("[data-remix-form]").forEach((f) => f.classList.toggle("active", f.dataset.remixForm === name));
}
function initRemix() {
  $$("#remix-tabs [data-remix]").forEach((b) => (b.onclick = () => remixTab(b.dataset.remix)));
  $$("[data-remix-form]").forEach((form) => {
    const kind = form.dataset.remixForm;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = $("button[type=submit]", form);
      const model = $("[name=model]", form)?.value || "V6";
      let body;
      try {
        const c = readControls(form, model);
        body = { model, callBackUrl: callbackUrl(), ...c };
        if (kind === "mashup") {
          const a = $("[data-source=mashA]", form).getUrls()[0], b = $("[data-source=mashB]", form).getUrls()[0];
          if (!a || !b) throw new Error("Add both tracks for the mashup.");
          body.uploadUrlList = [a, b];
        } else {
          const u = $("[data-source=uploadUrl]", form).getUrls()[0];
          if (!u) throw new Error("Add a source audio file or URL first.");
          body.uploadUrl = u;
        }
        for (const el of $$("[required]", form)) {
          if (!el.closest("[hidden]") && !el.value.trim()) { el.focus(); throw new Error(`Please fill in “${el.closest(".field")?.querySelector(".label")?.textContent.replace("*", "").trim() || el.name}”.`); }
        }
        if (kind === "extend") {
          const ca = +$("[name=continueAt]", form).value;
          if (ca > 0) body.continueAt = ca;
        }
        if (kind === "replace") {
          body.infillStartS = +$("[name=infillStartS]", form).value;
          body.infillEndS = +$("[name=infillEndS]", form).value;
          body.prompt = $("[name=prompt]", form).value.trim();
          body.fullLyrics = $("[name=fullLyrics]", form).value.trim();
          if (body.infillEndS - body.infillStartS < 10) throw new Error("The replaced section must be at least 10 seconds long.");
          delete body.instrumental;
        }
        if (kind === "vocals" || kind === "instrumental") delete body.instrumental;
      } catch (err) { toast(err.message, { type: "err" }); return; }
      setLoading(btn, true);
      try {
        const j = await api(REMIX[kind].path, { method: "POST", body });
        addTask("music", j.data.taskId, { label: `${REMIX[kind].label}: ${body.title || body.style || body.tags || "untitled"}`.slice(0, 70), model, source: REMIX[kind].label, instrumental: body.instrumental });
        toast(`🎛 ${REMIX[kind].label} is cooking…`, { type: "ok" });
        refreshCredits();
      } catch (err) { toast(err.message, { type: "err" }); }
      finally { setLoading(btn, false); }
    });
  });
}
function remixFromTrack(track, kind = "cover") {
  go("remix");
  remixTab(kind);
  const form = $(`[data-remix-form=${kind}]`);
  const src = $("[data-source=uploadUrl]", form) || $("[data-source=mashA]", form);
  src.setUrl(track.audio || track.stream, `${track.title} (library)`);
  const title = $("[name=title]", form);
  if (title && !title.value) title.value = `${track.title} (${REMIX[kind].label})`.slice(0, 80);
}

/* =========================================================
   Sound Lab
   ========================================================= */
function initSounds() {
  $("#sound-key").innerHTML = KEYS.map((k) => `<option>${k}</option>`).join("");
  $("#sound-presets").innerHTML = SOUND_PRESETS.map((s) => `<button type="button" class="chip">${s}</button>`).join("");
  $("#sound-presets").onclick = (e) => {
    const c = e.target.closest(".chip");
    if (c) { $("#sound-prompt").value = c.textContent; $("#sound-prompt").dispatchEvent(new Event("input")); }
  };
  const on = $("#sound-bpm-on"), r = $("#sound-bpm"), out = $("#sound-bpm-out");
  const upd = () => { r.disabled = !on.checked; out.textContent = on.checked ? `${r.value} BPM` : "auto"; };
  on.onchange = upd; r.oninput = upd;
  const form = $("#sounds-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const prompt = $("#sound-prompt").value.trim();
    if (!prompt) { toast("Describe the sound you want.", { type: "err" }); $("#sound-prompt").focus(); return; }
    const body = {
      prompt, model: $("#sound-model").value, callBackUrl: callbackUrl(),
      soundLoop: $("[name=soundLoop]", form).checked, grabLyrics: $("[name=grabLyrics]", form).checked,
      soundKey: $("#sound-key").value,
    };
    if (on.checked) body.soundTempo = +r.value;
    const btn = $("button[type=submit]", form);
    setLoading(btn, true);
    try {
      const j = await api("/api/v1/generate/sounds", { method: "POST", body });
      addTask("music", j.data.taskId, { label: `Sound: ${prompt.slice(0, 50)}`, model: body.model, source: "Sound", instrumental: true });
      toast("🌧 Sound is cooking…", { type: "ok" });
      refreshCredits();
    } catch (err) { toast(err.message, { type: "err" }); }
    finally { setLoading(btn, false); }
  });
}

/* =========================================================
   Task engine: create → poll → deliver
   ========================================================= */
const KINDS = {
  music: { path: "/api/v1/generate/record-info", noun: "Song" },
  lyrics: { path: "/api/v1/lyrics/record-info", noun: "Lyrics" },
  wav: { path: "/api/v1/wav/record-info", noun: "WAV" },
  mp4: { path: "/api/v1/mp4/record-info", noun: "Music video" },
  stems: { path: "/api/v1/vocal-removal/record-info", noun: "Stems" },
  midi: { path: "/api/v1/midi/record-info", noun: "MIDI" },
  cover: { path: "/api/v1/suno/cover/record-info", noun: "Cover art" },
};
const STAGES = { PENDING: 1, TEXT_SUCCESS: 2, FIRST_SUCCESS: 3, SUCCESS: 4 };

function addTask(kind, id, meta = {}) {
  if (!id) return;
  state.tasks = state.tasks.filter((t) => t.id !== id);
  state.tasks.unshift({ kind, id, meta, label: meta.label || KINDS[kind].noun, status: "pending", stage: 1, at: Date.now(), next: Date.now() + 4000, tries: 0, msg: pick(COOK_MSGS) });
  save.tasks();
  renderTasks();
  if (kind === "lyrics") renderLyrics();
  pollSoon();
}

function interpret(kind, d) {
  const s = d.status ?? d.successFlag;
  if (typeof s === "number" || /^\d+$/.test(String(s ?? ""))) {
    const n = +s;
    if (kind === "midi" && d.midiData?.instruments?.length) return { st: "done" };
    return n === 1 ? { st: "done" } : n === 3 ? { st: "failed" } : { st: "pending", stage: n === 2 ? 2 : 1 };
  }
  const str = String(s || "PENDING").toUpperCase();
  if (str === "SUCCESS") return { st: "done", stage: 4 };
  if (str === "CALLBACK_EXCEPTION") return { st: "done", stage: 4 }; // results exist; only the webhook failed
  if (/FAIL|ERROR|EXCEPTION|SENSITIVE/.test(str)) return { st: "failed" };
  return { st: str === "FIRST_SUCCESS" ? "partial" : "pending", stage: STAGES[str] || 1 };
}

const normTrack = (x, task) => ({
  id: x.id,
  taskId: task.id,
  title: x.title || task.meta.title || "Untitled",
  tags: x.tags || "",
  lyrics: x.prompt || "",
  image: x.image_url || x.imageUrl || x.source_image_url || x.sourceImageUrl || "",
  audio: x.audio_url || x.audioUrl || x.source_audio_url || x.sourceAudioUrl || "",
  stream: x.stream_audio_url || x.streamAudioUrl || x.source_stream_audio_url || x.sourceStreamAudioUrl || "",
  duration: x.duration || 0,
  model: task.meta.model || "V6",
  modelName: x.model_name || x.modelName || "",
  source: task.meta.source || "Create",
  instrumental: !!task.meta.instrumental,
  at: task.at,
});

function upsertTracks(list) {
  let added = 0;
  for (const t of list) {
    if (!t.id) continue;
    const i = state.tracks.findIndex((x) => x.id === t.id);
    if (i >= 0) {
      const prev = state.tracks[i];
      state.tracks[i] = { ...prev, ...Object.fromEntries(Object.entries(t).filter(([, v]) => v !== "" && v != null && v !== 0)) };
    } else { state.tracks.unshift(t); added++; }
  }
  save.tracks();
  return added;
}

const handlers = {
  music(task, d, r) {
    const raw = d.response?.sunoData || d.response?.data || [];
    const list = raw.map((x) => normTrack(x, task));
    if (list.length) upsertTracks(list);
    if (r.st === "done") {
      const first = list[0];
      celebrate();
      toast(`🎉 <b>${esc(first?.title || task.label)}</b> is ready${list.length > 1 ? ` (${list.length} versions)` : ""}!`, {
        type: "ok", ttl: 9000,
        actions: first ? [{ label: "▶ Play", fn: () => playTrack(first.id) }, { label: "Details", fn: () => openDrawer(first.id) }] : [],
      });
      refreshCredits();
    } else if (r.st === "partial" && !task.notifiedStream && list.some((t) => t.stream || t.audio)) {
      task.notifiedStream = true;
      const t = list.find((x) => x.stream || x.audio);
      toast(`🎧 A first take of <b>${esc(t.title)}</b> is ready to stream while it finishes.`, { actions: [{ label: "▶ Listen", fn: () => playTrack(t.id) }] });
    }
  },
  lyrics(task, d, r) {
    if (r.st !== "done") return;
    const items = (d.response?.data || []).filter((x) => x.text && x.status !== "failed").map((x) => ({ title: x.title, text: x.text }));
    if (!items.length) { task.status = "failed"; task.error = "No lyrics came back. Try a different prompt."; return; }
    const set = { prompt: task.meta.prompt || task.label, items, at: Date.now() };
    state.lyricSets.unshift(set);
    save.lyrics();
    renderLyrics();
    if (task.meta.target) chooseLyrics(set, task.meta.target);
    else toast(`✍️ ${items.length} lyric drafts are ready.`, { type: "ok", actions: [{ label: "View", fn: () => go("lyrics") }] });
  },
  wav(task, d, r) {
    if (r.st !== "done") return;
    const url = d.response?.audioWavUrl || d.response?.audio_wav_url;
    const t = findTrack(task.meta.audioId);
    if (t && url) { t.wav = url; save.tracks(); }
    toast(`🎚 WAV ready for <b>${esc(t?.title || "your track")}</b>.`, { type: "ok", actions: url ? [{ label: "Download", fn: () => window.open(url, "_blank") }] : [] });
  },
  mp4(task, d, r) {
    if (r.st !== "done") return;
    const url = d.response?.videoUrl || d.response?.video_url;
    const t = findTrack(task.meta.audioId);
    if (t && url) { t.video = url; save.tracks(); }
    celebrate();
    toast(`🎬 Music video ready for <b>${esc(t?.title || "your track")}</b>.`, { type: "ok", actions: [{ label: "Watch", fn: () => t ? openDrawer(t.id, "video") : window.open(url, "_blank") }] });
  },
  stems(task, d, r) {
    if (r.st !== "done") return;
    const t = findTrack(task.meta.audioId);
    if (t) { t.stems = d.response || {}; t.stemsTaskId = task.id; t.stemsType = task.meta.type; save.tracks(); }
    toast(`🎛 Stems ready for <b>${esc(t?.title || "your track")}</b>.`, { type: "ok", actions: t ? [{ label: "Open", fn: () => openDrawer(t.id, "stems") }] : [] });
  },
  midi(task, d, r) {
    if (r.st !== "done") return;
    const data = d.midiData || d.response?.midiData || d.response;
    state.midi[task.meta.audioId] = data;
    const t = findTrack(task.meta.audioId);
    toast(`🎹 MIDI transcription ready${t ? ` for <b>${esc(t.title)}</b>` : ""}.`, { type: "ok", actions: [{ label: "Download .mid", fn: () => downloadMidi(data, t?.title || "songforge") }] });
  },
  cover(task, d, r) {
    if (r.st !== "done") return;
    const imgs = d.response?.images || [];
    state.tracks.filter((t) => t.taskId === task.meta.musicTaskId).forEach((t) => (t.covers = imgs));
    save.tracks();
    const t = findTrack(task.meta.audioId);
    toast("🎨 New cover art is ready. Pick your favorite.", { type: "ok", actions: t ? [{ label: "Choose", fn: () => openDrawer(t.id, "covers") }] : [] });
  },
};

let pollTimer = null, polling = false;
function startPolling() { if (!pollTimer) pollTimer = setInterval(pollTick, 2500); pollTick(); }
function pollSoon() { setTimeout(pollTick, 4200); }
async function pollTick() {
  if (polling || !state.key) return;
  polling = true;
  try {
    const now = Date.now();
    const due = state.tasks.filter((t) => (t.status === "pending" || t.status === "partial") && t.next <= now);
    for (const task of due) await pollTask(task);
  } finally { polling = false; }
}
async function pollTask(task) {
  task.tries++;
  const age = Date.now() - task.at;
  task.next = Date.now() + (age < 120000 ? 5000 : age < 600000 ? 10000 : 20000);
  task.msg = pick(COOK_MSGS);
  try {
    const j = await api(KINDS[task.kind].path, { query: { taskId: task.id } });
    const d = j.data || {};
    const r = interpret(task.kind, d);
    if (r.stage) task.stage = Math.max(task.stage, r.stage);
    if (r.st === "failed") {
      task.status = "failed";
      task.error = d.errorMessage || d.response?.errorMessage || `${KINDS[task.kind].noun} generation failed.`;
      toast(`😕 ${esc(task.label)}: ${esc(task.error)}`, { type: "err", ttl: 9000 });
    } else {
      if (r.st === "done") task.status = "done";
      else if (r.st === "partial") task.status = "partial";
      handlers[task.kind](task, d, r);
    }
  } catch (e) {
    if (e.code === 401) { logout("Your API key is no longer valid."); return; }
    task.fails = (task.fails || 0) + 1;
    if (task.fails > 6) { task.status = "failed"; task.error = e.message; }
  }
  if (task.status === "pending" && age > 30 * 60000) { task.status = "failed"; task.error = "Timed out. Try importing the task ID later."; }
  save.tasks();
  renderTasks();
  if (["music", "cover", "wav", "mp4", "stems"].includes(task.kind)) renderTracks();
  if (task.kind === "lyrics") renderLyrics();
  if (state.drawerTrack) refreshDrawer();
}

function taskHTML(t) {
  const active = t.status === "pending" || t.status === "partial";
  const steps = t.kind === "music" ? 4 : 2;
  const stage = t.status === "done" ? steps : Math.min(t.stage, steps - 1);
  const labels = { pending: "", partial: "Streaming", done: "Done", failed: "Failed" };
  return `<div class="task ${t.status}">
    <div class="task-top">${active ? `<span class="eq-mini on"><i></i><i></i><i></i></span>` : t.status === "done" ? "✅" : "⚠️"}
      <span class="t-title" title="${esc(t.label)}">${esc(t.label)}</span>
      ${labels[t.status] ? `<span class="badge ${t.status === "done" ? "ok" : t.status === "failed" ? "err" : "live"}">${labels[t.status]}</span>` : `<span class="badge">${KINDS[t.kind].noun}</span>`}</div>
    ${active ? `<div class="steps">${Array.from({ length: steps }, (_, i) => `<i class="${i < stage ? "done" : i === stage ? "now" : ""}"></i>`).join("")}</div><div class="msg">${esc(t.msg)} · ${ago(t.at)}</div>` : ""}
    ${t.status === "failed" ? `<div class="err">${esc(t.error || "Something went wrong.")}</div><div><button class="link" data-retry="${esc(t.id)}">Check again</button> · <button class="link" data-dismiss="${esc(t.id)}">Dismiss</button></div>` : ""}
  </div>`;
}
function renderTasks() {
  const active = state.tasks.filter((t) => t.status === "pending" || t.status === "partial");
  $("#tasks-count").textContent = active.length;
  $("#tasks-btn .eq-mini").classList.toggle("on", active.length > 0);
  $("#tasks-list").innerHTML = state.tasks.length ? state.tasks.slice(0, 30).map(taskHTML).join("") : `<div class="empty">Nothing yet. Go make some noise!</div>`;
  const cooking = state.tasks.filter((t) => t.kind === "music" && t.status !== "done").slice(0, 5);
  $("#cooking").innerHTML = cooking.length ? cooking.map(taskHTML).join("")
    : `<div class="empty"><span class="big">🎧</span>No songs in the oven. Describe one and hit <b>Create song</b>.</div>`;
}
function initTasksUI() {
  const pop = $("#tasks-pop"), btn = $("#tasks-btn");
  btn.onclick = (e) => { e.stopPropagation(); pop.hidden = !pop.hidden; btn.setAttribute("aria-expanded", String(!pop.hidden)); };
  document.addEventListener("click", (e) => { if (!pop.hidden && !pop.contains(e.target) && e.target !== btn) { pop.hidden = true; btn.setAttribute("aria-expanded", "false"); } });
  $("#tasks-clear").onclick = () => { state.tasks = state.tasks.filter((t) => t.status === "pending" || t.status === "partial"); save.tasks(); renderTasks(); };
  document.addEventListener("click", (e) => {
    const r = e.target.closest("[data-retry]"), d = e.target.closest("[data-dismiss]");
    if (r) { const t = state.tasks.find((x) => x.id === r.dataset.retry); if (t) { t.status = "pending"; t.fails = 0; t.at = Date.now(); t.next = 0; save.tasks(); renderTasks(); pollTick(); } }
    if (d) { state.tasks = state.tasks.filter((x) => x.id !== d.dataset.dismiss); save.tasks(); renderTasks(); }
  });
  setInterval(() => { if (state.tasks.some((t) => t.status === "pending" || t.status === "partial")) renderTasks(); }, 3500);
}

/* =========================================================
   Library
   ========================================================= */
function visibleTracks() {
  const q = state.search.toLowerCase();
  return state.tracks.filter((t) => {
    if (state.filter === "fav" && !t.fav) return false;
    if (state.filter === "inst" && !t.instrumental) return false;
    if (state.filter === "vocal" && t.instrumental) return false;
    if (q && !`${t.title} ${t.tags} ${t.lyrics} ${t.source}`.toLowerCase().includes(q)) return false;
    return true;
  });
}
function renderTracks() {
  $("#lib-count").textContent = state.tracks.length;
  const list = visibleTracks();
  const lib = $("#library");
  if (!state.tracks.length) {
    lib.innerHTML = `<div class="empty card" style="grid-column:1/-1"><span class="big">💿</span><b>Your library is empty</b>Songs you create show up here automatically.<button class="btn primary" data-goto="create">✨ Create your first song</button></div>`;
  } else if (!list.length) {
    lib.innerHTML = `<div class="empty" style="grid-column:1/-1">No tracks match.</div>`;
  } else {
    lib.innerHTML = list.map((t) => {
      const playable = t.audio || t.stream;
      const isCur = state.current === t.id;
      const badges = [!t.audio && t.stream ? `<span class="badge">Streaming</span>` : "", t.instrumental ? `<span class="badge">Inst</span>` : "", t.video ? `<span class="badge">🎬</span>` : "", t.stems ? `<span class="badge">Stems</span>` : ""].join("");
      return `<article class="tcard ${isCur ? "current" : ""}" data-id="${esc(t.id)}">
        <div class="art ${isCur && !audio.paused ? "playing" : ""}" style="${artBg(t)}">
          <div class="badges">${badges}</div>
          <button class="fav ${t.fav ? "on" : ""}" data-fav="${esc(t.id)}" aria-label="${t.fav ? "Unfavorite" : "Favorite"}">${t.fav ? "★" : "☆"}</button>
          ${playable ? `<button class="play-fab" data-play="${esc(t.id)}" aria-label="Play ${esc(t.title)}">${isCur && !audio.paused ? "❚❚" : "▶"}</button>` : ""}
        </div>
        <div class="body" data-open="${esc(t.id)}"><b>${esc(t.title)}</b><span>${esc(t.tags || t.source)}</span>
          <div class="meta"><span>${esc(t.source)}</span><span>${t.duration ? fmtTime(t.duration) : ago(t.at)}</span></div></div>
      </article>`;
    }).join("");
  }
  const fresh = state.tracks.slice(0, 5);
  $("#fresh").innerHTML = fresh.length ? fresh.map(rowHTML).join("") : `<div class="empty"><span class="big">🌱</span>Finished songs land here.</div>`;
}
const rowHTML = (t) => `<div class="trow" data-open="${esc(t.id)}"><div class="art ${state.current === t.id && !audio.paused ? "playing" : ""}" style="${artBg(t)}"></div>
  <div class="tm"><b>${esc(t.title)}</b><span>${esc(t.tags || t.source)}</span></div>
  ${t.audio || t.stream ? `<button class="btn ghost icon" data-play="${esc(t.id)}" aria-label="Play">${state.current === t.id && !audio.paused ? "❚❚" : "▶"}</button>` : ""}</div>`;

function initLibrary() {
  $("#lib-search").addEventListener("input", (e) => { state.search = e.target.value; renderTracks(); });
  $("#lib-filter").onclick = (e) => {
    const b = e.target.closest("[data-filter]");
    if (!b) return;
    state.filter = b.dataset.filter;
    $$("#lib-filter button").forEach((x) => x.classList.toggle("active", x === b));
    renderTracks();
  };
  document.addEventListener("click", (e) => {
    const p = e.target.closest("[data-play]");
    if (p) { e.stopPropagation(); togglePlay(p.dataset.play); return; }
    const f = e.target.closest("[data-fav]");
    if (f) { const t = findTrack(f.dataset.fav); if (t) { t.fav = !t.fav; save.tracks(); renderTracks(); } return; }
    const o = e.target.closest("[data-open]");
    if (o) openDrawer(o.dataset.open);
  });
  $("#import-btn").onclick = () => openModal({
    title: "⤓ Import a task",
    body: `<p class="hint">Paste a task ID from a song generated elsewhere with your key, or one from an earlier session. We'll fetch its tracks into your library.</p>
      <div class="field"><label class="label" for="m-tid">Task ID</label><input id="m-tid" name="taskId" class="input" required placeholder="e.g. 5c79…be8e" /></div>`,
    submit: "Import",
    onSubmit: async (f) => {
      const id = f.taskId.value.trim();
      if (!id) throw new Error("Paste a task ID.");
      const j = await api(KINDS.music.path, { query: { taskId: id } });
      if (!j.data) throw new Error("Task not found.");
      addTask("music", id, { label: "Imported task", source: "Import" });
      toast("Importing…", { ttl: 2000 });
    },
  });
}

/* =========================================================
   Track drawer & actions
   ========================================================= */
function openDrawer(id, focus) {
  const t = findTrack(id);
  if (!t) return;
  state.drawerTrack = id;
  refreshDrawer();
  const d = $("#drawer");
  d.classList.add("open");
  d.setAttribute("aria-hidden", "false");
  $("#drawer .drawer-panel").scrollTop = 0;
  if (focus) setTimeout(() => $(`#drawer [data-sec=${focus}]`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
}
function closeDrawer() {
  state.drawerTrack = null;
  $("#drawer").classList.remove("open");
  $("#drawer").setAttribute("aria-hidden", "true");
}
function refreshDrawer() {
  const t = findTrack(state.drawerTrack);
  if (!t) return closeDrawer();
  const pend = (kind) => state.tasks.some((x) => x.kind === kind && (x.status === "pending" || x.status === "partial") && x.meta.audioId === t.id);
  const stems = t.stems ? Object.entries(STEM_LABELS).filter(([k]) => t.stems[k]).map(([k, l]) => [l, t.stems[k]]) : [];
  const origin = t.stems?.originData || [];
  const isCur = state.current === t.id && !audio.paused;
  const A = (act, e, label, sub, busy) => `<button class="act" data-act="${act}" ${busy ? "disabled" : ""}><span class="e">${busy ? "⏳" : e}</span>${label}${sub ? `<small>${sub}</small>` : ""}</button>`;
  $("#drawer-body").innerHTML = `
    <div class="d-hero" style="${artBg(t)}"><button class="btn icon round d-close" data-close-drawer aria-label="Close">✕</button></div>
    <div class="d-body">
      <div class="d-title">${t.audio || t.stream ? `<button class="btn primary round icon play" data-play="${esc(t.id)}" aria-label="Play">${isCur ? "❚❚" : "▶"}</button>` : ""}
        <div><h3>${esc(t.title)}</h3><div class="d-tags">${esc(t.tags || "")}</div></div></div>
      <div class="row-wrap"><span class="badge">${esc(t.source)}</span><span class="badge">${esc(MODELS.find((m) => m.id === t.model)?.name || t.model)}</span>
        ${t.duration ? `<span class="badge">${fmtTime(t.duration)}</span>` : ""}${!t.audio && t.stream ? `<span class="badge live">Streaming, still finishing</span>` : ""}</div>

      <div class="d-sec"><h4>Create from this track</h4><div class="actions-grid">
        ${A("extend", "➕", "Extend", "Keep it going")}
        ${A("replace", "✂️", "Replace section", "Rewrite a part")}
        ${A("cover-remix", "🎭", "Cover", "New style")}
        ${A("persona", "🧑‍🎤", "Make persona", "Reuse this voice")}
        ${A("karaoke", "🎤", "Sing along", "Synced lyrics", t.instrumental)}
        ${A("mashup", "🔀", "Mashup", "Mix with another")}
      </div></div>

      <div class="d-sec"><h4>Produce &amp; export</h4><div class="actions-grid">
        ${A("stems", "🎛", "Split stems", t.stems ? "Done ✓" : "Vocals & instruments", pend("stems"))}
        ${A("wav", "🎚", "Get WAV", t.wav ? "Ready ✓" : "Lossless", pend("wav"))}
        ${A("video", "🎬", "Music video", t.video ? "Ready ✓" : "MP4 visualizer", pend("mp4"))}
        ${A("coverart", "🎨", "Cover art", t.covers ? "Ready ✓" : "New artwork", pend("cover"))}
        ${A("midi", "🎹", "MIDI", t.stemsTaskId ? "From stems" : "Needs stems first", pend("midi"))}
        ${A("download", "⬇️", "Download MP3", "")}
      </div></div>

      ${t.video ? `<div class="d-sec" data-sec="video"><h4>Music video</h4><video class="d-video" controls preload="metadata" src="${esc(t.video)}"></video>
        <div class="row-wrap" style="margin-top:8px"><a class="btn sm" href="${esc(t.video)}" target="_blank" rel="noopener">⬇ Download MP4</a></div></div>` : ""}

      ${t.covers?.length ? `<div class="d-sec" data-sec="covers"><h4>Cover art: tap to use</h4><div class="covers">${t.covers.map((u) => `<button data-setcover="${esc(u)}" class="${t.image === u ? "on" : ""}"><img src="${esc(u)}" alt="Cover option" loading="lazy" /></button>`).join("")}</div></div>` : ""}

      ${stems.length ? `<div class="d-sec" data-sec="stems"><h4>Stems</h4><div class="dl-list">${stems.map(([l, u]) => `<div class="dl"><span class="nm">${esc(l)}</span><audio controls preload="none" src="${esc(u)}"></audio><a class="btn ghost icon" href="${esc(u)}" target="_blank" rel="noopener" aria-label="Download ${esc(l)}">⬇</a></div>`).join("")}
        </div></div>` : ""}
      ${!stems.length && origin.length ? `<div class="d-sec" data-sec="stems"><h4>Stems</h4><div class="dl-list">${origin.map((o) => `<div class="dl"><span class="nm">${esc(o.stem_type_group_name || "Track")}</span><audio controls preload="none" src="${esc(o.audio_url)}"></audio><a class="btn ghost icon" href="${esc(o.audio_url)}" target="_blank" rel="noopener">⬇</a></div>`).join("")}</div></div>` : ""}

      ${state.midi[t.id] ? `<div class="d-sec"><h4>MIDI</h4><button class="btn sm" data-act="midi-dl">⬇ Download .mid (${(state.midi[t.id].instruments || []).length} instruments)</button></div>` : ""}

      ${t.wav ? `<div class="d-sec"><h4>Lossless</h4><a class="btn sm" href="${esc(t.wav)}" target="_blank" rel="noopener">⬇ Download WAV</a></div>` : ""}

      ${t.lyrics ? `<div class="d-sec"><h4>Lyrics</h4><pre class="d-lyrics">${esc(t.lyrics)}</pre></div>` : ""}

      <div class="d-sec"><h4>Details</h4><div class="ids">
        <span>Audio ID</span><code>${esc(t.id)}</code><button class="link" data-copy="${esc(t.id)}">Copy</button>
        <span>Task ID</span><code>${esc(t.taskId)}</code><button class="link" data-copy="${esc(t.taskId)}">Copy</button>
      </div><div class="row-wrap" style="margin-top:12px"><button class="btn sm danger" data-act="remove">Remove from library</button></div></div>
    </div>`;
}
function initDrawer() {
  $("#drawer").addEventListener("click", (e) => {
    if (e.target.closest("[data-close-drawer]")) return closeDrawer();
    const t = findTrack(state.drawerTrack);
    if (!t) return;
    const c = e.target.closest("[data-copy]");
    if (c) { navigator.clipboard?.writeText(c.dataset.copy).then(() => toast("Copied", { ttl: 1500 })); return; }
    const sc = e.target.closest("[data-setcover]");
    if (sc) { t.image = sc.dataset.setcover; save.tracks(); refreshDrawer(); renderTracks(); updatePlayerUI(); return; }
    const a = e.target.closest("[data-act]");
    if (a && !a.disabled) trackAction(a.dataset.act, t);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!$("#karaoke").hidden) closeKaraoke();
    else if (state.drawerTrack && !$("#modal").open) closeDrawer();
  });
}

function trackAction(act, t) {
  const needFinal = () => { if (!t.audio) { toast("This track is still finishing. Try again in a moment.", { type: "err" }); return false; } return true; };
  switch (act) {
    case "extend": return extendDialog(t);
    case "replace": return replaceDialog(t);
    case "cover-remix": if (needFinal()) { closeDrawer(); remixFromTrack(t, "cover"); } return;
    case "mashup": if (needFinal()) { closeDrawer(); remixFromTrack(t, "mashup"); } return;
    case "persona": return personaDialog(t);
    case "karaoke": return openKaraoke(t);
    case "stems": return stemsDialog(t);
    case "wav":
      if (t.wav) return window.open(t.wav, "_blank");
      return simpleTask("wav", "/api/v1/wav/generate", { taskId: t.taskId, audioId: t.id }, t, "🎚 Converting to WAV…");
    case "video":
      if (t.video) return $("#drawer [data-sec=video]")?.scrollIntoView({ behavior: "smooth" });
      return videoDialog(t);
    case "coverart":
      if (t.covers?.length) return $("#drawer [data-sec=covers]")?.scrollIntoView({ behavior: "smooth" });
      return simpleTask("cover", "/api/v1/suno/cover/generate", { taskId: t.taskId }, t, "🎨 Painting cover art…", { musicTaskId: t.taskId }, true);
    case "midi": return midiDialog(t);
    case "midi-dl": return downloadMidi(state.midi[t.id], t.title);
    case "download": {
      const u = t.audio || t.stream;
      if (!u) return;
      const a = document.createElement("a");
      a.href = u; a.download = `${t.title}.mp3`; a.target = "_blank"; a.rel = "noopener";
      document.body.appendChild(a); a.click(); a.remove();
      return;
    }
    case "remove":
      if (!confirm(`Remove “${t.title}” from your library? The file stays on Suno's servers until it expires.`)) return;
      state.tracks = state.tracks.filter((x) => x.id !== t.id);
      save.tracks(); closeDrawer(); renderTracks();
      return;
  }
}

async function simpleTask(kind, path, body, t, msg, extraMeta = {}, tolerate = false) {
  try {
    const j = await api(path, { method: "POST", body: { ...body, callBackUrl: callbackUrl() }, tolerate });
    addTask(kind, j.data.taskId, { label: `${KINDS[kind].noun}: ${t.title}`, audioId: t.id, ...extraMeta });
    toast(msg, { type: "ok" });
    refreshCredits();
    refreshDrawer();
  } catch (e) { toast(e.message, { type: "err" }); }
}

function extendDialog(t) {
  const legacyModel = t.model || "V6";
  openModal({
    title: `➕ Extend “${esc(t.title)}”`,
    body: `<div class="field"><label class="label">Continue from <output id="m-ca-out" class="muted">${fmtTime(Math.max(1, (t.duration || 60) - 5))}</output></label>
        <input type="range" name="continueAt" min="1" max="${Math.max(2, Math.floor(t.duration || 120) - 1)}" value="${Math.max(1, Math.floor((t.duration || 60) - 5))}" step="1" />
        <small class="hint">Pick where the new part should start. Anything after that point is replaced.</small></div>
      ${controlsHTML({ model: true, title: true, titleMax: 100, style: "style", instrumental: true, lyrics: true, noWrite: true, negative: true, gender: true, persona: true, finetune: true }, { model: legacyModel, title: `${t.title} (Extended)`.slice(0, 100), style: t.tags, instrumental: t.instrumental })}
      <p class="hint">Use the same model as the original for the smoothest result.</p>`,
    submit: "Extend track",
    onOpen: (f) => { const r = $("[name=continueAt]", f); r.oninput = () => ($("#m-ca-out").textContent = fmtTime(r.value)); },
    onSubmit: async (f) => {
      const model = $("[name=model]", f).value;
      const c = readControls(f, model);
      if (c.instrumental) delete c.vocalGender;
      const body = { audioId: t.id, taskId: t.taskId, model, continueAt: +$("[name=continueAt]", f).value, callBackUrl: callbackUrl(), ...c };
      const j = await api("/api/v1/generate/extend", { method: "POST", body });
      addTask("music", j.data.taskId, { label: `Extend: ${t.title}`, model, source: "Extension", instrumental: c.instrumental });
      toast("➕ Extending your track…", { type: "ok" });
      refreshCredits();
    },
  });
}

function replaceDialog(t) {
  const dur = Math.floor(t.duration || 120);
  openModal({
    title: `✂️ Replace a section of “${esc(t.title)}”`,
    wide: true,
    body: `<div class="two-col">
        <div class="field"><label class="label">Start (seconds) *</label><input class="input" type="number" name="s" min="0" max="${dur}" step="0.01" value="${Math.min(30, Math.max(0, dur - 20))}" /></div>
        <div class="field"><label class="label">End (seconds) *</label><input class="input" type="number" name="e" min="0" max="${dur}" step="0.01" value="${Math.min(dur, Math.min(30, Math.max(0, dur - 20)) + 15)}" /></div></div>
      <p class="hint">The window must be at least 10 seconds long. Track length is ${fmtTime(dur)}.</p>
      <div class="field"><label class="label">New lyrics for this section *</label><textarea class="input" name="prompt" rows="3" placeholder="[Bridge]&#10;Your new lines here"></textarea></div>
      <div class="field"><label class="label">Full lyrics after the change *</label><textarea class="input" name="fullLyrics" rows="7">${esc(t.lyrics)}</textarea><small class="hint">Edit the full lyrics so they include your new section.</small></div>
      ${controlsHTML({ title: true, titleRequired: true, style: "tags", styleRequired: true, negative: true, gender: true, persona: true, finetune: true }, { title: t.title, style: t.tags })}`,
    submit: "Replace section",
    onSubmit: async (f) => {
      const s = +f.s.value, e = +f.e.value;
      if (!(e - s >= 10)) throw new Error("The section must be at least 10 seconds long.");
      const prompt = f.prompt.value.trim(), fullLyrics = f.fullLyrics.value.trim();
      if (!prompt || !fullLyrics) throw new Error("Add the new section lyrics and the full lyrics.");
      const c = readControls(f, t.model || "V6");
      if (!c.title || !c.tags) throw new Error("Title and style are required.");
      const body = { taskId: t.taskId, audioId: t.id, infillStartS: s, infillEndS: e, prompt, fullLyrics, callBackUrl: callbackUrl(), ...c };
      const j = await api("/api/v1/generate/replace-section", { method: "POST", body });
      addTask("music", j.data.taskId, { label: `Replace: ${t.title}`, model: t.model, source: "Replaced section" });
      toast("✂️ Rewriting that section…", { type: "ok" });
      refreshCredits();
    },
  });
}

function personaDialog(t) {
  const dur = Math.floor(t.duration || 30);
  openModal({
    title: "🧑‍🎤 Make a persona",
    body: `<p class="hint">Capture the voice and character of <b>${esc(t.title)}</b> so you can reuse it on new songs. Each track can be turned into a persona once.</p>
      <div class="field"><label class="label">Persona name *</label><input class="input" name="name" required maxlength="80" placeholder="e.g. Midnight Crooner" /></div>
      <div class="field"><label class="label">Description *</label><textarea class="input" name="description" rows="3" required placeholder="Warm, breathy baritone with a vintage soul feel and playful ad-libs"></textarea></div>
      <div class="field"><label class="label">Style tag</label><input class="input" name="style" value="${esc((t.tags || "").slice(0, 120))}" /></div>
      <div class="two-col"><div class="field"><label class="label">Analyze from (s)</label><input class="input" type="number" name="vs" min="0" max="${dur}" value="0" step="0.1" /></div>
        <div class="field"><label class="label">to (s)</label><input class="input" type="number" name="ve" min="0" max="${dur}" value="${Math.min(30, dur)}" step="0.1" /></div></div>
      <small class="hint">Choose a 10–30 second window where the vocals are clear.</small>`,
    submit: "Create persona",
    onSubmit: async (f) => {
      if (!t.audio) throw new Error("Wait until the track has finished generating.");
      const name = f.name.value.trim(), description = f.description.value.trim();
      if (!name || !description) throw new Error("Name and description are required.");
      const vs = +f.vs.value, ve = +f.ve.value;
      if (ve - vs < 10 || ve - vs > 30) throw new Error("The analysis window must be 10–30 seconds long.");
      const body = { taskId: t.taskId, audioId: t.id, name, description, vocalStart: vs, vocalEnd: ve };
      if (f.style.value.trim()) body.style = f.style.value.trim();
      const j = await api("/api/v1/generate/generate-persona", { method: "POST", body });
      const p = { personaId: j.data.personaId, name: j.data.name || name, description: j.data.description || description, style: body.style, type: "style_persona", from: t.title, image: t.image, at: Date.now() };
      state.personas.unshift(p);
      save.personas();
      renderPersonas();
      refreshPersonaSelects();
      celebrate();
      toast(`🧑‍🎤 Persona <b>${esc(p.name)}</b> saved. Pick it under Advanced options when you create.`, { type: "ok", actions: [{ label: "Use now", fn: () => usePersona(p) }] });
      refreshCredits();
    },
  });
}

function stemsDialog(t) {
  openModal({
    title: "🎛 Split into stems",
    body: `<div class="radio-cards">
        <label><input type="radio" name="type" value="separate_vocal" checked /><div><b>Vocals + instrumental</b><span>Two clean tracks, great for karaoke and remixes.</span></div></label>
        <label><input type="radio" name="type" value="split_stem" /><div><b>Full band split</b><span>Up to 12 stems: vocals, drums, bass, guitar, keys, strings and more.</span></div></label>
        <label><input type="radio" name="type" value="split_stem_advanced" /><div><b>Pull out one instrument</b><span>Isolate a specific part with precision.</span></div></label>
      </div>
      <div class="field" id="m-stem" hidden><label class="label">Instrument</label><select name="stemName" class="input">${STEM_NAMES.map((s) => `<option>${s}</option>`).join("")}</select></div>
      <p class="hint">Stem separation uses credits. The full band split costs more than a two-track split.</p>`,
    submit: "Separate",
    onOpen: (f) => f.addEventListener("change", () => ($("#m-stem").hidden = f.type.value !== "split_stem_advanced")),
    onSubmit: async (f) => {
      if (!t.audio) throw new Error("Wait until the track has finished generating.");
      const body = { taskId: t.taskId, audioId: t.id, type: f.type.value, callBackUrl: callbackUrl() };
      if (body.type === "split_stem_advanced") body.stemName = f.stemName.value;
      const j = await api("/api/v1/vocal-removal/generate", { method: "POST", body });
      addTask("stems", j.data.taskId, { label: `Stems: ${t.title}`, audioId: t.id, type: body.type });
      toast("🎛 Separating stems…", { type: "ok" });
      refreshCredits();
      refreshDrawer();
    },
  });
}

function videoDialog(t) {
  openModal({
    title: "🎬 Make a music video",
    body: `<p class="hint">Generates an MP4 with visuals synced to <b>${esc(t.title)}</b>, ready to share.</p>
      <div class="field"><label class="label">Artist name <span class="muted">(optional)</span></label><input class="input" name="author" maxlength="50" placeholder="Shown on the video" /></div>
      <div class="field"><label class="label">Website / watermark <span class="muted">(optional)</span></label><input class="input" name="domainName" maxlength="50" placeholder="e.g. yourname.com" /></div>`,
    submit: "Create video",
    onSubmit: async (f) => {
      if (!t.audio) throw new Error("Wait until the track has finished generating.");
      const body = { taskId: t.taskId, audioId: t.id, callBackUrl: callbackUrl() };
      if (f.author.value.trim()) body.author = f.author.value.trim();
      if (f.domainName.value.trim()) body.domainName = f.domainName.value.trim();
      const j = await api("/api/v1/mp4/generate", { method: "POST", body });
      addTask("mp4", j.data.taskId, { label: `Video: ${t.title}`, audioId: t.id });
      toast("🎬 Rendering your music video…", { type: "ok" });
      refreshCredits();
      refreshDrawer();
    },
  });
}

function midiDialog(t) {
  if (!t.stemsTaskId) {
    toast("MIDI is transcribed from separated stems. Split the stems first.", { type: "err", actions: [{ label: "Split stems", fn: () => stemsDialog(t) }] });
    return;
  }
  const origin = t.stems?.originData || [];
  openModal({
    title: "🎹 Transcribe to MIDI",
    body: `<p class="hint">Turns the separated stems into MIDI notes you can drop into any DAW.</p>
      <div class="field"><label class="label">Which stem?</label><select name="audioId" class="input"><option value="">All separated tracks</option>
      ${origin.map((o) => `<option value="${esc(o.id)}">${esc(o.stem_type_group_name || o.id)}</option>`).join("")}</select></div>`,
    submit: "Transcribe",
    onSubmit: async (f) => {
      const body = { taskId: t.stemsTaskId, callBackUrl: callbackUrl() };
      if (f.audioId.value) body.audioId = f.audioId.value;
      const j = await api("/api/v1/midi/generate", { method: "POST", body });
      addTask("midi", j.data.taskId, { label: `MIDI: ${t.title}`, audioId: t.id });
      toast("🎹 Transcribing to MIDI…", { type: "ok" });
      refreshCredits();
    },
  });
}

/* =========================================================
   Personas
   ========================================================= */
function renderPersonas() {
  const el = $("#personas");
  if (!state.personas.length) {
    el.innerHTML = `<div class="empty card" style="grid-column:1/-1"><span class="big">🧑‍🎤</span><b>No personas yet</b>Open any finished track in your Library and choose <b>Make persona</b>.<button class="btn" data-goto="library">Go to Library</button></div>`;
    return;
  }
  el.innerHTML = state.personas.map((p, i) => `<article class="pcard">
    <div class="avatar" style="${artBg({ id: p.personaId, image: p.image })};background-size:cover">${p.image ? "" : "🎙"}</div>
    <b>${esc(p.name)}</b><p>${esc(p.description || "")}</p>
    ${p.style ? `<span class="badge">${esc(p.style)}</span>` : ""}
    <code>${esc(p.type === "voice_persona" ? "Voice" : "Persona")} · ${esc(p.personaId)}</code>
    <div class="actions"><button class="btn sm primary" data-use-persona="${i}">Use</button><button class="btn sm ghost danger" data-del-persona="${i}">Delete</button></div>
  </article>`).join("");
}
function usePersona(p) {
  setMode("custom");
  if (!PERSONA_MODELS.has(state.model)) { state.model = "V6"; store.set("model", "V6"); renderModels(); }
  refreshPersonaSelects();
  const sel = $("#create-form [data-persona-select]");
  sel.value = `${p.personaId}|${p.type || "style_persona"}`;
  const det = sel.closest("details");
  if (det) det.open = true;
  go("create");
  toast(`Using persona <b>${esc(p.name)}</b>. Add a style or lyrics and create!`, { type: "ok" });
}
function initPersonas() {
  $("#personas").addEventListener("click", (e) => {
    const u = e.target.closest("[data-use-persona]"), d = e.target.closest("[data-del-persona]");
    if (u) usePersona(state.personas[+u.dataset.usePersona]);
    if (d && confirm("Delete this persona from SongForge?")) { state.personas.splice(+d.dataset.delPersona, 1); save.personas(); renderPersonas(); refreshPersonaSelects(); }
  });
  $("#persona-add").onclick = () => openModal({
    title: "＋ Add a persona or voice by ID",
    body: `<div class="field"><label class="label">ID *</label><input class="input" name="id" required placeholder="Persona ID or Suno Voice ID" /></div>
      <div class="field"><label class="label">Name *</label><input class="input" name="name" required /></div>
      <div class="radio-cards"><label><input type="radio" name="type" value="style_persona" checked /><div><b>Style persona</b><span>From Generate Persona</span></div></label>
      <label><input type="radio" name="type" value="voice_persona" /><div><b>Custom voice</b><span>A Suno Voice ID</span></div></label></div>`,
    submit: "Save",
    onSubmit: async (f) => {
      const id = f.id.value.trim(), name = f.name.value.trim();
      if (!id || !name) throw new Error("ID and name are required.");
      state.personas.unshift({ personaId: id, name, type: f.type.value, at: Date.now() });
      save.personas(); renderPersonas(); refreshPersonaSelects();
    },
  });
}

/* =========================================================
   Player
   ========================================================= */
const audio = $("#audio");
function playable() { return visibleTracks().filter((t) => t.audio || t.stream); }
function playTrack(id) {
  const t = findTrack(id);
  if (!t) return;
  const src = t.audio || t.stream;
  if (!src) return;
  if (state.current !== id || !audio.src) { state.current = id; audio.src = src; }
  audio.play().catch(() => toast("Couldn't start playback. The file may have expired.", { type: "err" }));
  updatePlayerUI();
}
function togglePlay(id) {
  if (id && id !== state.current) return playTrack(id);
  if (!state.current) { const f = playable()[0]; if (f) playTrack(f.id); return; }
  audio.paused ? audio.play() : audio.pause();
}
function step(dir) {
  const list = playable();
  if (!list.length) return;
  const i = list.findIndex((t) => t.id === state.current);
  playTrack(list[(i + dir + list.length) % list.length].id);
}
function updatePlayerUI() {
  const t = findTrack(state.current);
  $("#p-title").textContent = t ? t.title : "Nothing playing";
  $("#p-sub").textContent = t ? t.tags || t.source : "Pick a track to start listening";
  $("#p-art").style.cssText = t ? artBg(t) : "";
  $("#p-play").textContent = audio.paused ? "▶" : "❚❚";
  $("#p-play").setAttribute("aria-label", audio.paused ? "Play" : "Pause");
  $("#k-play").textContent = audio.paused ? "▶" : "❚❚";
  renderTracks();
  if (state.drawerTrack) {
    const b = $("#drawer .d-title [data-play]");
    if (b) b.textContent = state.current === state.drawerTrack && !audio.paused ? "❚❚" : "▶";
  }
  if (t && "mediaSession" in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: "SongForge", album: t.tags?.slice(0, 60) || "", artwork: t.image ? [{ src: t.image, sizes: "512x512" }] : [] });
  }
}
function initPlayer() {
  $("#p-play").onclick = () => togglePlay();
  $("#p-prev").onclick = () => (audio.currentTime > 3 ? (audio.currentTime = 0) : step(-1));
  $("#p-next").onclick = () => step(1);
  $("#p-open").onclick = () => state.current && openDrawer(state.current);
  $("#p-karaoke").onclick = () => { const t = findTrack(state.current) || playable()[0]; if (t) openKaraoke(t); else toast("Play a vocal track first."); };
  const vol = $("#p-vol");
  audio.volume = store.get("vol", 0.9);
  vol.value = audio.volume;
  vol.oninput = () => { audio.volume = +vol.value; store.set("vol", audio.volume); };
  const seek = $("#p-seek");
  let seeking = false;
  seek.oninput = () => { seeking = true; $("#p-cur").textContent = fmtTime((seek.value / 1000) * (audio.duration || 0)); };
  seek.onchange = () => { if (audio.duration) audio.currentTime = (seek.value / 1000) * audio.duration; seeking = false; };
  audio.addEventListener("timeupdate", () => {
    if (!seeking && audio.duration) seek.value = (audio.currentTime / audio.duration) * 1000;
    $("#p-cur").textContent = fmtTime(audio.currentTime);
  });
  audio.addEventListener("loadedmetadata", () => {
    $("#p-dur").textContent = fmtTime(audio.duration);
    const t = findTrack(state.current);
    if (t && !t.duration && isFinite(audio.duration)) { t.duration = audio.duration; save.tracks(); }
  });
  ["play", "pause"].forEach((ev) => audio.addEventListener(ev, updatePlayerUI));
  audio.addEventListener("ended", () => step(1));
  if ("mediaSession" in navigator) {
    navigator.mediaSession.setActionHandler("previoustrack", () => step(-1));
    navigator.mediaSession.setActionHandler("nexttrack", () => step(1));
  }
  document.addEventListener("keydown", (e) => {
    if (e.code !== "Space" || e.target.closest("input, textarea, select, button, [contenteditable]") || $("#modal").open) return;
    if ($("#app").hidden) return;
    e.preventDefault();
    togglePlay();
  });
}

/* =========================================================
   Karaoke (timestamped lyrics)
   ========================================================= */
let kRaf = null, kWords = [], kWave = [];
async function openKaraoke(t) {
  if (t.instrumental) { toast("That one's instrumental. Nothing to sing along to!", { type: "err" }); return; }
  if (!t.audio) { toast("Wait for the track to finish, then sing along.", { type: "err" }); return; }
  if (!t.aligned) {
    toast("🎤 Syncing lyrics…", { ttl: 2000 });
    try {
      const j = await api("/api/v1/generate/get-timestamped-lyrics", { method: "POST", body: { taskId: t.taskId, audioId: t.id } });
      t.aligned = j.data?.alignedWords || [];
      t.wave = j.data?.waveformData || [];
      save.tracks();
    } catch (e) { toast(e.message, { type: "err" }); return; }
  }
  if (!t.aligned.length) { toast("No synced lyrics are available for this track.", { type: "err" }); return; }
  closeDrawer();
  kWave = t.wave || [];
  $("#k-title").textContent = t.title;
  $("#k-sub").textContent = t.tags || "";
  buildKaraoke(t.aligned);
  $("#karaoke").hidden = false;
  document.body.style.overflow = "hidden";
  if (state.current !== t.id) playTrack(t.id); else if (audio.paused) audio.play();
  kLoop();
}
function buildKaraoke(words) {
  const lines = [[]];
  const html = [];
  kWords = [];
  const pushLine = () => { if (lines[lines.length - 1].length) lines.push([]); };
  words.forEach((w) => {
    const segs = String(w.word || "").split("\n");
    segs.forEach((seg, si) => {
      if (si > 0) pushLine();
      const secs = seg.match(/\[[^\]]*\]/g);
      if (secs) { pushLine(); secs.forEach((s) => lines[lines.length - 1].push({ sec: s.slice(1, -1) })); pushLine(); }
      const txt = seg.replace(/\[[^\]]*\]/g, "").trim();
      if (txt) lines[lines.length - 1].push({ txt, s: w.startS, e: w.endS });
    });
  });
  lines.filter((l) => l.length).forEach((l, li) => {
    if (l[0].sec) { html.push(`<div class="k-sec">${esc(l.map((x) => x.sec).join(" · "))}</div>`); return; }
    html.push(`<div class="k-line" data-l="${li}">${l.map((x) => { kWords.push(x); return `<span class="w" data-i="${kWords.length - 1}" data-s="${x.s}">${esc(x.txt)}</span>`; }).join(" ")}</div>`);
  });
  $("#k-lines").innerHTML = html.join("");
  $("#k-lines").scrollTop = 0;
}
function kLoop() {
  cancelAnimationFrame(kRaf);
  const spans = $$("#k-lines .w");
  let lastLine = null;
  const canvas = $("#k-wave"), ctx = canvas.getContext("2d");
  const tick = () => {
    if ($("#karaoke").hidden) return;
    const now = audio.currentTime;
    let activeIdx = -1;
    spans.forEach((s, i) => {
      const w = kWords[i];
      const sung = now >= w.e, cur = now >= w.s && now < w.e;
      if (cur || (now >= w.s && activeIdx < i)) activeIdx = i;
      s.classList.toggle("sung", sung);
      s.classList.toggle("now", cur);
    });
    const line = activeIdx >= 0 ? spans[activeIdx].parentElement : null;
    if (line !== lastLine) {
      lastLine?.classList.remove("active");
      line?.classList.add("active");
      line?.scrollIntoView({ block: "center", behavior: "smooth" });
      lastLine = line;
    }
    drawWave(ctx, canvas, now);
    kRaf = requestAnimationFrame(tick);
  };
  tick();
}
function drawWave(ctx, canvas, now) {
  const dpr = devicePixelRatio || 1, w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== w * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const data = kWave.length ? kWave : Array.from({ length: 120 }, (_, i) => 0.3 + 0.25 * Math.sin(i / 3) ** 2);
  const n = Math.max(1, Math.floor(w / 5));
  const bw = w / n, prog = audio.duration ? now / audio.duration : 0;
  const max = Math.max(...data.map(Math.abs), 0.001);
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, "#a78bfa"); g.addColorStop(0.55, "#f472b6"); g.addColorStop(1, "#fbbf24");
  for (let i = 0; i < n; i++) {
    const v = Math.abs(data[Math.floor((i / n) * data.length)]) / max;
    const bh = Math.max(3, v * (h - 6));
    ctx.fillStyle = i / n <= prog ? g : "rgba(255,255,255,.18)";
    ctx.fillRect(i * bw + 1, (h - bh) / 2, Math.max(1, bw - 2), bh);
  }
}
function closeKaraoke() {
  $("#karaoke").hidden = true;
  document.body.style.overflow = "";
  cancelAnimationFrame(kRaf);
}
function initKaraoke() {
  $("#k-close").onclick = closeKaraoke;
  $("#k-play").onclick = () => togglePlay();
  $("#k-lines").addEventListener("click", (e) => { const w = e.target.closest(".w"); if (w) audio.currentTime = +w.dataset.s; });
  $("#k-wave").addEventListener("click", (e) => { if (audio.duration) audio.currentTime = (e.offsetX / e.currentTarget.clientWidth) * audio.duration; });
}

/* =========================================================
   Modal, toasts, loading, confetti
   ========================================================= */
let modalCfg = null;
function openModal(cfg) {
  modalCfg = cfg;
  const m = $("#modal"), f = $("#modal-form");
  m.classList.toggle("wide", !!cfg.wide);
  f.innerHTML = `<div class="m-head"><h3>${cfg.title}</h3><button type="button" class="btn ghost icon" data-mclose aria-label="Close">✕</button></div>
    <div class="m-body">${cfg.body}<p class="error" data-merr hidden role="alert"></p></div>
    <div class="m-foot"><button type="button" class="btn ghost" data-mclose>Cancel</button>${cfg.submit ? `<button type="submit" class="btn primary" value="ok"><span class="btn-label">${cfg.submit}</span></button>` : ""}</div>`;
  wireControls(f);
  cfg.onOpen?.(f);
  m.showModal();
  setTimeout(() => $("input:not([type=hidden]):not([type=radio]):not([type=range]), textarea", f)?.focus(), 50);
}
function closeModal() { $("#modal").close(); modalCfg = null; }
function initModal() {
  const m = $("#modal"), f = $("#modal-form");
  f.addEventListener("click", (e) => { if (e.target.closest("[data-mclose]")) closeModal(); });
  m.addEventListener("click", (e) => { if (e.target === m) closeModal(); });
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!modalCfg?.onSubmit) return closeModal();
    const btn = $("button[type=submit]", f), err = $("[data-merr]", f);
    err.hidden = true;
    setLoading(btn, true);
    try { await modalCfg.onSubmit(f); closeModal(); }
    catch (x) { err.textContent = x.message; err.hidden = false; }
    finally { setLoading(btn, false); }
  });
}

function toast(html, { type = "", ttl = 5000, actions = [] } = {}) {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<div class="tx">${html}${actions.length ? `<div class="ta">${actions.map((a, i) => `<button class="btn sm" data-ta="${i}">${a.label}</button>`).join("")}</div>` : ""}</div><button class="x" aria-label="Dismiss">×</button>`;
  const kill = () => { el.classList.add("out"); setTimeout(() => el.remove(), 200); };
  el.querySelector(".x").onclick = kill;
  el.addEventListener("click", (e) => { const b = e.target.closest("[data-ta]"); if (b) { actions[+b.dataset.ta].fn(); kill(); } });
  $("#toasts").appendChild(el);
  while ($("#toasts").children.length > 4) $("#toasts").firstChild.remove();
  setTimeout(kill, ttl);
}
function setLoading(btn, on) {
  if (!btn) return;
  btn.disabled = on;
  btn.classList.toggle("loading", on);
}

function celebrate() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const c = $("#confetti"), ctx = c.getContext("2d");
  c.width = innerWidth; c.height = innerHeight;
  const colors = ["#7c3aed", "#db2777", "#f59e0b", "#22c55e", "#38bdf8", "#f472b6"];
  const parts = Array.from({ length: 140 }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 200, y: innerHeight * 0.6,
    vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 16 - 6, r: Math.random() * 6 + 3,
    c: pick(colors), rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, note: Math.random() < 0.12,
  }));
  let frame = 0;
  const tick = () => {
    ctx.clearRect(0, 0, c.width, c.height);
    parts.forEach((p) => {
      p.vy += 0.4; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.rot += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c;
      if (p.note) { ctx.font = `${p.r * 4}px sans-serif`; ctx.fillText("♪", 0, 0); } else ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 1.6);
      ctx.restore();
    });
    if (++frame < 120) requestAnimationFrame(tick); else ctx.clearRect(0, 0, c.width, c.height);
  };
  tick();
}

/* =========================================================
   MIDI file writer (Standard MIDI File, format 1)
   ========================================================= */
function downloadMidi(data, title) {
  const ins = data?.instruments || [];
  if (!ins.length) { toast("No MIDI notes were detected.", { type: "err" }); return; }
  const TPQ = 480, BPM = 120, tps = (TPQ * BPM) / 60;
  const vlq = (n) => { const b = [n & 0x7f]; while ((n >>= 7)) b.unshift((n & 0x7f) | 0x80); return b; };
  const str = (s) => [...s].map((c) => c.charCodeAt(0) & 0x7f);
  const u32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
  const chunk = (bytes) => [...str("MTrk"), ...u32(bytes.length), ...bytes];
  const tempo = 60000000 / BPM;
  const tracks = [chunk([0, 0xff, 0x51, 3, (tempo >> 16) & 255, (tempo >> 8) & 255, tempo & 255, 0, 0xff, 0x2f, 0])];
  const melodic = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15];
  let ch = 0;
  ins.forEach((inst) => {
    const drums = /drum|kick|snare|hat|cymbal|percussion/i.test(inst.name || "");
    const channel = drums ? 9 : melodic[ch++ % melodic.length];
    const name = str((inst.name || "Track").slice(0, 60));
    const ev = [];
    (inst.notes || []).forEach((n) => {
      const pitch = Math.max(0, Math.min(127, Math.round(n.pitch)));
      const vel = Math.max(1, Math.min(127, Math.round((n.velocity <= 1 ? n.velocity * 127 : n.velocity) || 90)));
      ev.push({ t: Math.round(n.start * tps), b: [0x90 | channel, pitch, vel] });
      ev.push({ t: Math.round(Math.max(n.end, n.start + 0.02) * tps), b: [0x80 | channel, pitch, 0] });
    });
    ev.sort((a, b) => a.t - b.t || (a.b[0] & 0xf0) - (b.b[0] & 0xf0));
    const bytes = [0, 0xff, 0x03, ...vlq(name.length), ...name];
    let last = 0;
    ev.forEach((e) => { bytes.push(...vlq(e.t - last), ...e.b); last = e.t; });
    bytes.push(0, 0xff, 0x2f, 0);
    tracks.push(chunk(bytes));
  });
  const header = [...str("MThd"), 0, 0, 0, 6, 0, 1, 0, tracks.length, (TPQ >> 8) & 255, TPQ & 255];
  const blob = new Blob([new Uint8Array([...header, ...tracks.flat()])], { type: "audio/midi" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${(title || "songforge").replace(/[^\w -]+/g, "")}.mid`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* =========================================================
   Settings
   ========================================================= */
function initSettings() {
  $("#credits").onclick = async () => { $("#credits-val").textContent = "…"; await refreshCredits(); toast("Credits refreshed", { ttl: 1500 }); };
  $("#key-btn").onclick = () => {
    const k = state.key || "";
    const remembered = !!store.get("key", null);
    openModal({
      title: "⚙︎ Settings",
      body: `<div class="field"><span class="label">API key</span><div class="input-row"><input class="input" readonly value="${esc(k.slice(0, 4) + "•".repeat(Math.max(0, Math.min(24, k.length - 8))) + k.slice(-4))}" /></div>
          <small class="hint">${remembered ? "Saved on this device." : "Kept for this browser session only."} Manage keys at <a href="https://sunoapi.org/api-key" target="_blank" rel="noopener">sunoapi.org</a>.</small></div>
        <div class="row-wrap"><button type="button" class="btn" id="m-logout">Sign out &amp; forget key</button>
          <a class="btn ghost" href="https://sunoapi.org/billing" target="_blank" rel="noopener">Buy credits ↗</a></div>
        <div class="field"><span class="label">Library</span><p class="hint">${state.tracks.length} tracks, ${state.personas.length} personas, stored in this browser. Generated files are hosted by Suno for about 14 days, so download your favorites.</p>
          <div class="row-wrap" style="margin-top:8px"><button type="button" class="btn sm" id="m-export">Export library (JSON)</button><button type="button" class="btn sm danger" id="m-wipe">Clear library</button></div></div>`,
      submit: null,
      onOpen: (f) => {
        $("#m-logout", f).onclick = () => { closeModal(); logout(); };
        $("#m-export", f).onclick = () => {
          const blob = new Blob([JSON.stringify({ tracks: state.tracks, personas: state.personas, lyricSets: state.lyricSets }, null, 2)], { type: "application/json" });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob); a.download = "songforge-library.json"; a.click();
        };
        $("#m-wipe", f).onclick = () => {
          if (!confirm("Clear all tracks, lyric drafts and task history from this browser?")) return;
          state.tracks = []; state.tasks = []; state.lyricSets = [];
          save.tracks(); save.tasks(); save.lyrics();
          closeModal(); renderAll();
        };
      },
    });
  };
}

/* =========================================================
   Boot
   ========================================================= */
function renderAll() { renderTracks(); renderTasks(); renderLyrics(); renderPersonas(); refreshPersonaSelects(); updatePlayerUI(); }

function init() {
  initTheme();
  // Build reusable controls & sources before wiring the forms that use them.
  $$("[data-controls]").forEach((el) => { el.innerHTML = controlsHTML(JSON.parse(el.dataset.controls)); });
  $$("[data-model-select]").forEach((s) => { if (!s.options.length) s.innerHTML = modelOptions("V6"); });
  $$("[data-source]").forEach(initSource);
  $$("#create-form [data-pane]").forEach(wireControls);
  $$("[data-remix-form]").forEach(wireControls);
  wireControls($("#lyrics-form"));
  wireControls($("#sounds-form"));

  initGate(); initNav(); initCreate(); initLyrics(); initRemix(); initSounds(); initTasksUI();
  initLibrary(); initDrawer(); initPersonas(); initPlayer(); initKaraoke(); initModal(); initSettings();

  const key = loadKey();
  if (key) {
    state.key = key;
    enterApp();
    refreshCredits();
  }
}
init();
