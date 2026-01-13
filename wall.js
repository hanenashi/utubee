/* utubee v1.2
   States:
     green  = unseen
     orange = partial
     none   = seen

   Marking:
     - mobile: long-press tile
     - desktop: right-click tile (contextmenu)

   Play:
     - click plays in-tile
     - NO automatic state changes on play
*/

(() => {
  // -----------------------------
  // UI settings (tile size + border thickness)
  // -----------------------------
  const LS_SETTINGS = "utubee_settings_v1_2";
  const DEFAULT_SETTINGS = { minTile: 220, borderW: 1 };

  function loadSettings(){
    try {
      const o = JSON.parse(localStorage.getItem(LS_SETTINGS) || "{}");
      return Object.assign({}, DEFAULT_SETTINGS, o);
    } catch {
      return Object.assign({}, DEFAULT_SETTINGS);
    }
  }
  function saveSettings(s){
    localStorage.setItem(LS_SETTINGS, JSON.stringify(s));
  }

  let SETTINGS = loadSettings();

  function applySettings(){
    document.documentElement.style.setProperty("--minTile", SETTINGS.minTile + "px");
    document.documentElement.style.setProperty("--borderW", SETTINGS.borderW + "px");
  }
  applySettings();

  // -----------------------------
  // State store: id -> "u"|"p"|"s"
  // -----------------------------
  const LS_STATE = "utubee_states_v1_2";
  const STATE_UNSEEN = "u";
  const STATE_PARTIAL = "p";
  const STATE_SEEN = "s";

  function loadStates(){
    try {
      const obj = JSON.parse(localStorage.getItem(LS_STATE) || "{}");
      return (obj && typeof obj === "object") ? obj : {};
    } catch {
      return {};
    }
  }
  function saveStates(states){
    localStorage.setItem(LS_STATE, JSON.stringify(states));
  }

  let STATES = loadStates();

  function getState(id){ return STATES[id] || STATE_UNSEEN; }
  function setState(id, st){ STATES[id] = st; saveStates(STATES); }

  function cycleState(st){
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

  function cycleAndApply(card, id){
    const next = cycleState(getState(id));
    setState(id, next);
    applyCardStateClass(card, next);
  }

  // -----------------------------
  // YouTube helpers
  // -----------------------------
  function parseVideoId(input){
    const s = String(input || "").trim();
    if(!s) return null;

    // plain id
    if(/^[a-zA-Z0-9_-]{8,15}$/.test(s) && !s.includes("http")) return s;

    try{
      const u = new URL(s);
      if(u.hostname.includes("youtu.be")) return (u.pathname || "").replace("/","") || null;
      if(u.hostname.includes("youtube.com")){
        const v = u.searchParams.get("v");
        if(v) return v;
        const m = u.pathname.match(/\/shorts\/([^/]+)/); if(m) return m[1];
        const e = u.pathname.match(/\/embed\/([^/]+)/); if(e) return e[1];
      }
    }catch{}
    return null;
  }

  function thumbHTML(id){
    const src = "https://i.ytimg.com/vi/" + encodeURIComponent(id) + "/hqdefault.jpg";
    return (
      '<img loading="lazy" src="' + src + '" alt="">' +
      '<div class="play" aria-hidden="true">' +
        '<span title="Play">' +
          '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>' +
        '</span>' +
      '</div>'
    );
  }

  function playerHTML(id){
    const src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(id) + "?autoplay=1&rel=0";
    return (
      '<div class="x" title="Stop">✕</div>' +
      '<iframe class="player" ' +
        'src="' + src + '" ' +
        'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" ' +
        'allowfullscreen ' +
        'title="YouTube player"></iframe>'
    );
  }

  function setTileToThumb(tile, id){
    tile.dataset.mode = "thumb";
    tile.innerHTML = thumbHTML(id);
  }

  function setTileToPlayer(tile, id){
    tile.dataset.mode = "player";
    tile.innerHTML = playerHTML(id);
  }

  // -----------------------------
  // Long-press helper (mobile)
  // -----------------------------
  function attachLongPress(tile, onLongPress, ms=450){
    let timer = null;
    let fired = false;

    const cleanup = () => {
      tile.classList.remove("pressing");
      if(timer){ clearTimeout(timer); timer = null; }
    };

    tile.addEventListener("pointerdown", (e) => {
      // ignore right click (desktop uses contextmenu)
      if(e.button !== undefined && e.button !== 0) return;
      if(e.target && e.target.closest && e.target.closest(".x")) return;

      fired = false;
      tile.classList.add("pressing");
      timer = setTimeout(() => {
        fired = true;
        onLongPress();
        cleanup();
      }, ms);
    });

    tile.addEventListener("pointerup", cleanup);
    tile.addEventListener("pointercancel", cleanup);
    tile.addEventListener("pointerleave", cleanup);

    return () => fired;
  }

  // -----------------------------
  // Render wall
  // -----------------------------
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
      applyCardStateClass(card, getState(id));

      const tile = document.createElement("div");
      tile.className = "tile";
      tile.dataset.id = id;
      setTileToThumb(tile, id);

      // mobile: long-press cycles state
      let longPressFired = false;
      const didLongPress = attachLongPress(tile, () => {
        longPressFired = true;
        cycleAndApply(card, id);
      }, 450);

      // desktop: right-click cycles state (no browser menu)
      tile.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        cycleAndApply(card, id);
      });

      // click: play/stop
      tile.addEventListener("click", (e) => {
        // swallow click after long-press
        if(longPressFired || didLongPress()){
          longPressFired = false;
          return;
        }
         
         if(tile.dataset.mode === "thumb"){
           // stop other playing tiles
           document.querySelectorAll(".tile[data-mode='player']").forEach(t => {
             t.dataset.mode = "thumb";
             setTileToThumb(t, t.dataset.id);
           });
         
           // NEW: pressing play marks as SEEN (border disappears)
           if(getState(id) !== STATE_SEEN){
             setState(id, STATE_SEEN);
             applyCardStateClass(card, STATE_SEEN);
           }
         
           setTileToPlayer(tile, id);
           return;
         }


        const x = e.target && e.target.closest ? e.target.closest(".x") : null;
        if(x){
          setTileToThumb(tile, id);
        }
      });

      card.appendChild(tile);
      grid.appendChild(card);
    }
  }

  init();

  // -----------------------------
  // Settings UI
  // -----------------------------
  const $ = (id) => document.getElementById(id);

  const gear = $("gear");
  const panel = $("panel");
  const closeBtn = $("close");
  const resetStatesBtn = $("resetStates");

  const minTile = $("minTile");
  const minTileVal = $("minTileVal");
  const borderW = $("borderW");
  const borderWVal = $("borderWVal");

  function syncSettingsUI(){
    minTile.value = String(SETTINGS.minTile);
    minTileVal.textContent = minTile.value + "px";

    borderW.value = String(SETTINGS.borderW);
    borderWVal.textContent = borderW.value + "px";
  }

  gear.addEventListener("click", () => {
    panel.classList.toggle("on");
    syncSettingsUI();
  });

  closeBtn.addEventListener("click", () => panel.classList.remove("on"));

  document.addEventListener("click", (e) => {
    if(!panel.classList.contains("on")) return;
    if(panel.contains(e.target) || gear.contains(e.target)) return;
    panel.classList.remove("on");
  });

  window.addEventListener("keydown", (e) => {
    if(e.key === "Escape" && panel.classList.contains("on")) panel.classList.remove("on");
  });

  minTile.addEventListener("input", () => {
    SETTINGS.minTile = Number(minTile.value);
    saveSettings(SETTINGS);
    applySettings();
    minTileVal.textContent = minTile.value + "px";
  });

  borderW.addEventListener("input", () => {
    SETTINGS.borderW = Number(borderW.value);
    saveSettings(SETTINGS);
    applySettings();
    borderWVal.textContent = borderW.value + "px";
  });

  resetStatesBtn.addEventListener("click", () => {
    STATES = {};
    saveStates(STATES);

    document.querySelectorAll(".card").forEach(card => {
      applyCardStateClass(card, STATE_UNSEEN);
    });
  });

  syncSettingsUI();
})();
