/* ===============================
   v1.1 - manual state tracking
   green = unseen
   orange = partial
   none  = seen
   Shift-click cycles state
================================ */

/* -------------------------------
   Settings (tile size only)
-------------------------------- */
const LS_SETTINGS = "utubee_settings_v1_1";
const DEFAULT_SETTINGS = { minTile: 220 };

function loadSettings(){
  try{
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(LS_SETTINGS) || "{}") };
  }catch{
    return { ...DEFAULT_SETTINGS };
  }
}
function saveSettings(s){
  localStorage.setItem(LS_SETTINGS, JSON.stringify(s));
}
let SETTINGS = loadSettings();

function applySettings(){
  document.documentElement.style.setProperty("--minTile", SETTINGS.minTile + "px");
}
applySettings();

/* -------------------------------
   State store: id -> "u"|"p"|"s"
-------------------------------- */
const LS_STATE = "utubee_states_v1_1";
const STATE_UNSEEN = "u";
const STATE_PARTIAL = "p";
const STATE_SEEN = "s";

function loadStates(){
  try{
    const obj = JSON.parse(localStorage.getItem(LS_STATE) || "{}");
    return (obj && typeof obj === "object") ? obj : {};
  }catch{
    return {};
  }
}

function saveStates(states){
  localStorage.setItem(LS_STATE, JSON.stringify(states));
}

let STATES = loadStates();

function getState(id){
  return STATES[id] || STATE_UNSEEN;
}

function setState(id, st){
  STATES[id] = st;
  saveStates(STATES);
}

function cycleState(st){
  // green -> orange -> none -> green
  if(st === STATE_UNSEEN) return STATE_PARTIAL;
  if(st === STATE_PARTIAL) return STATE_SEEN;
  return STATE_UNSEEN;
}

function applyCardStateClass(card, st){
  card.classList.remove("state-unseen", "state-partial", "state-seen");
  if(st === STATE_PARTIAL) card.classList.add("state-partial");
  else if(st === STATE_SEEN) card.classList.add("state-seen");
  else card.classList.add("state-unseen");
}

/* -------------------------------
   YouTube helpers
-------------------------------- */
function parseVideoId(input){
  const s = String(input||"").trim();
  if(!s) return null;

  if(/^[a-zA-Z0-9_-]{8,15}$/.test(s) && !s.includes("http")) return s;

  try{
    const u = new URL(s);
    if(u.hostname.includes("youtu.be")) return u.pathname.replace("/","") || null;
    if(u.hostname.includes("youtube.com")){
      if(u.searchParams.get("v")) return u.searchParams.get("v");
      const m = u.pathname.match(/\/shorts\/([^/]+)/); if(m) return m[1];
      const e = u.pathname.match(/\/embed\/([^/]+)/); if(e) return e[1];
    }
  }catch{}
  return null;
}

function thumbHTML(id){
  return `
    <img loading="lazy" src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="">
    <div class="play" aria-hidden="true">
      <span title="Play">
        <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
      </span>
    </div>
  `;
}

function playerHTML(id){
  return `
    <div class="x" title="Stop">✕</div>
    <iframe
      class="player"
      src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
      allowfullscreen
      title="YouTube player"></iframe>
  `;
}

function setTileToThumb(tile, id){
  tile.dataset.mode = "thumb";
  tile.innerHTML = thumbHTML(id);
}

function setTileToPlayer(tile, id){
  tile.dataset.mode = "player";
  tile.innerHTML = playerHTML(id);
}

/* -------------------------------
   Render wall
-------------------------------- */
const grid = document.getElementById("grid");

async function init(){
  grid.innerHTML = "";

  let data;
  try{
    const res = await fetch("videos.json", { cache:"no-store" });
    data = await res.json();
  }catch{
    grid.innerHTML = "<div style='opacity:.8;font-size:12px;padding:8px'>Couldn't load videos.json.</div>";
    return;
  }

  const urls = Array.isArray(data.videos) ? data.videos : [];
  const ids = urls.map(parseVideoId).filter(Boolean);

  if(!ids.length){
    grid.innerHTML = "<div style='opacity:.8;font-size:12px;padding:8px'>No valid videos in videos.json yet.</div>";
    return;
  }

  for(const id of ids){
    const card = document.createElement("div");
    card.className = "card";

    // apply stored state
    applyCardStateClass(card, getState(id));

    const tile = document.createElement("div");
    tile.className = "tile";
    tile.dataset.id = id;
    setTileToThumb(tile, id);

    tile.addEventListener("click", (e) => {
      const isShift = !!e.shiftKey;
      const currentState = getState(id);

      // SHIFT-CLICK: cycle state, do NOT play
      if(isShift){
        const next = cycleState(currentState);
        setState(id, next);
        applyCardStateClass(card, next);
        return;
      }

      // Normal click: play/stop behavior
      if(tile.dataset.mode === "thumb"){
        // Stop any other playing tiles
        document.querySelectorAll(".tile[data-mode='player']").forEach(t => {
          t.dataset.mode = "thumb";
          setTileToThumb(t, t.dataset.id);
        });

        // Optional: auto-bump from green -> orange on first play.
        // (Does NOT force "seen". User can decide.)
        if(currentState === STATE_UNSEEN){
          setState(id, STATE_PARTIAL);
          applyCardStateClass(card, STATE_PARTIAL);
        }

        setTileToPlayer(tile, id);
        return;
      }

      // Player mode: only stop when hitting ✕
      const x = e.target.closest(".x");
      if(x){
        setTileToThumb(tile, id);
      }
    });

    card.appendChild(tile);
    grid.appendChild(card);
  }
}

init();

/* -------------------------------
   Settings UI
-------------------------------- */
const $ = (id) => document.getElementById(id);

const gear = $("gear");
const panel = $("panel");
const closeBtn = $("close");
const resetStatesBtn = $("resetStates");

const minTile = $("minTile");
const minTileVal = $("minTileVal");

function syncSettingsUI(){
  minTile.value = String(SETTINGS.minTile);
  minTileVal.textContent = `${minTile.value}px`;
}

gear.addEventListener("click", () => {
  panel.classList.toggle("on");
  syncSettingsUI();
});

closeBtn.addEventListener("click", () => panel.classList.remove("on"));

// click outside to close
document.addEventListener("click", (e) => {
  if(!panel.classList.contains("on")) return;
  if(panel.contains(e.target) || gear.contains(e.target)) return;
  panel.classList.remove("on");
});

// ESC closes settings panel
window.addEventListener("keydown", (e) => {
  if(e.key === "Escape" && panel.classList.contains("on")) panel.classList.remove("on");
});

minTile.addEventListener("input", () => {
  SETTINGS.minTile = Number(minTile.value);
  saveSettings(SETTINGS);
  applySettings();
  minTileVal.textContent = `${minTile.value}px`;
});

resetStatesBtn.addEventListener("click", () => {
  STATES = {};
  saveStates(STATES);
  // Re-apply classes without reloading JSON
  document.querySelectorAll(".card").forEach((card, idx) => {
    const tile = card.querySelector(".tile");
    if(!tile) return;
    const id = tile.dataset.id;
    applyCardStateClass(card, STATE_UNSEEN);
  });
});

/* init UI once */
syncSettingsUI();
