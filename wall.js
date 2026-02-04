/* utubee v2.3 - Layout & ESC Fixes */

(() => {
  // --- SETTINGS ---
  const LS_SETTINGS = "utubee_settings_v1_2";
  const DEFAULT_SETTINGS = { minTile: 220, borderW: 1 };
  
  function loadSettings(){
    try { return Object.assign({}, DEFAULT_SETTINGS, JSON.parse(localStorage.getItem(LS_SETTINGS)|| "{}")); }
    catch { return Object.assign({}, DEFAULT_SETTINGS); }
  }
  let SETTINGS = loadSettings();
  function applySettings(){
    document.documentElement.style.setProperty("--minTile", SETTINGS.minTile + "px");
    document.documentElement.style.setProperty("--borderW", SETTINGS.borderW + "px");
  }
  applySettings();

  // --- STATE ---
  const LS_STATE = "utubee_states_v1_2";
  const STATE_UNSEEN = "u";
  const STATE_PARTIAL = "p";
  const STATE_SEEN = "s";

  let STATES = (() => {
    try { return JSON.parse(localStorage.getItem(LS_STATE) || "{}"); } catch { return {}; }
  })();

  function getState(id){ return STATES[id] || STATE_UNSEEN; }
  function setState(id, st){ STATES[id] = st; localStorage.setItem(LS_STATE, JSON.stringify(STATES)); }
  
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

  // --- HELPERS ---
  function parseVideoId(input){
    const s = String(input||"").trim();
    if(!s) return null;
    if(/^[a-zA-Z0-9_-]{8,15}$/.test(s) && !s.includes("http")) return s;
    try{
      const u = new URL(s);
      if(u.hostname.includes("youtu.be")) return u.pathname.replace("/","") || null;
      if(u.hostname.includes("youtube.com")){
        const v = u.searchParams.get("v");
        if(v) return v;
        const m = u.pathname.match(/\/shorts\/([^/]+)/); if(m) return m[1];
        const e = u.pathname.match(/\/embed\/([^/]+)/); if(e) return e[1];
      }
    }catch{}
    return null;
  }

  function getItemId(item){
    if(typeof item === "string") return parseVideoId(item);
    if(item.type === "gallery") return item.id;
    return null;
  }

  // Auto-use thumbnails if opu.peklo.biz
  function getThumbUrl(url){
    if(url && url.includes("opu.peklo.biz/p/") && !url.includes("/thumbs/")){
      const parts = url.split("/");
      const filename = parts.pop();
      return parts.join("/") + "/thumbs/" + filename;
    }
    return url;
  }

  // --- DOM & LAYERS ---
  const els = {
    wall: document.getElementById("wallView"),
    grid: document.getElementById("grid"),
    
    galView: document.getElementById("galleryView"),
    galGrid: document.getElementById("galGrid"),
    galTitle: document.getElementById("galTitle"),
    galBack: document.getElementById("galBack"),

    lb: document.getElementById("lightbox"),
    lbImg: document.getElementById("lbImg"),
    lbPrev: document.getElementById("lbPrev"),
    lbNext: document.getElementById("lbNext"),
    lbClose: document.getElementById("lbClose"),
    lbCount: document.getElementById("lbCount"),
  };

  let activeGallery = null; 
  let viewStack = ["wall"]; // stack of view IDs

  function updateViewVisibility(){
    const current = viewStack[viewStack.length - 1];
    
    // Toggle layers
    els.wall.hidden = (current !== "wall");
    els.galView.hidden = (current !== "gallery");
    els.lb.hidden = (current !== "lightbox");
    
    // Manage Focus for keydown events
    if(current === "lightbox") els.lb.focus();
    else if(current === "gallery") els.galView.focus();
    else window.focus();
  }

  function pushView(v){ 
    viewStack.push(v); 
    updateViewVisibility(); 
  }
  
  function popView(){ 
    if(viewStack.length > 1) {
      viewStack.pop(); 
      updateViewVisibility();
    }
  }

  // --- GLOBAL KEYS (ESC FIX) ---
  // We use window capture to ensure we catch it before anything else swallows it
  window.addEventListener("keydown", (e) => {
    const current = viewStack[viewStack.length - 1];

    if(e.key === "Escape"){
      if(current !== "wall"){
        e.preventDefault();
        e.stopImmediatePropagation();
        popView();
        return;
      }
    }

    if(current === "lightbox"){
      if(e.key === "ArrowLeft") lbNav(-1);
      if(e.key === "ArrowRight") lbNav(1);
    }
  }, true); // useCapture = true is important here

  // --- RENDERERS ---

  // 1. VIDEO TILE
  function createVideoTile(url, id){
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.dataset.id = id;
    tile.dataset.mode = "thumb";
    
    const src = "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg";
    tile.innerHTML = `
      <img class="vid-thumb" loading="lazy" src="${src}" alt="">
      <div class="play"><span><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span></div>
    `;
    
    tile.addEventListener("click", (e) => {
      // Close player button
      if(e.target.closest(".x")){
        tile.dataset.mode = "thumb";
        tile.innerHTML = `
          <img class="vid-thumb" src="${src}" alt="">
          <div class="play"><span><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span></div>
        `;
        return;
      }
      
      // Play
      if(tile.dataset.mode === "thumb"){
        // Stop others
        document.querySelectorAll(".tile[data-mode='player']").forEach(t => t.click()); 
        
        if(getState(id) !== STATE_SEEN){
          setState(id, STATE_SEEN);
          applyCardStateClass(tile.closest(".card"), STATE_SEEN);
        }
        tile.dataset.mode = "player";
        tile.innerHTML = `
          <div class="x" title="Stop">✕</div>
          <iframe class="player" src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0" allowfullscreen></iframe>
        `;
      }
    });
    return tile;
  }

  // 2. GALLERY TILE (Mini Grid)
  function createGalleryTile(item){
    const tile = document.createElement("div");
    tile.className = "tile gallery-tile";
    
    const previews = item.images.slice(0, 6);
    let html = "";
    previews.forEach(img => {
      html += `<img loading="lazy" src="${getThumbUrl(img)}">`;
    });
    
    tile.innerHTML = html;

    tile.addEventListener("click", () => {
       if(getState(item.id) !== STATE_SEEN){
         setState(item.id, STATE_SEEN);
         applyCardStateClass(tile.closest(".card"), STATE_SEEN);
       }
       openGalleryView(item);
    });
    return tile;
  }

  // --- LOGIC: GALLERY VIEW ---
  function openGalleryView(item){
    els.galTitle.textContent = item.title;
    els.galGrid.innerHTML = "";
    activeGallery = { images: item.images, title: item.title };

    // Render Grid
    item.images.forEach((url, idx) => {
      const card = document.createElement("div");
      card.className = "card state-seen"; 
      const tile = document.createElement("div");
      tile.className = "tile";
      
      // Use Thumb for grid view
      tile.innerHTML = `<img class="vid-thumb" loading="lazy" src="${getThumbUrl(url)}">`;
      
      tile.addEventListener("click", () => openLightbox(idx));
      card.appendChild(tile);
      els.galGrid.appendChild(card);
    });
    
    pushView("gallery");
  }

  // --- LOGIC: LIGHTBOX ---
  let lbIndex = 0;
  function openLightbox(idx){ lbIndex = idx; updateLightbox(); pushView("lightbox"); }

  function updateLightbox(){
    if(!activeGallery) return;
    const url = activeGallery.images[lbIndex];
    els.lbImg.src = url; // Load full res
    els.lbCount.textContent = `${lbIndex + 1} / ${activeGallery.images.length}`;
  }

  function lbNav(dir){
    if(!activeGallery) return;
    const len = activeGallery.images.length;
    lbIndex = (lbIndex + dir + len) % len;
    updateLightbox();
  }

  els.lbPrev.addEventListener("click", (e) => { e.stopPropagation(); lbNav(-1); });
  els.lbNext.addEventListener("click", (e) => { e.stopPropagation(); lbNav(1); });
  els.lbClose.addEventListener("click", popView);
  els.galBack.addEventListener("click", popView);

  // --- INIT ---
  async function init(){
    els.grid.innerHTML = "";
    let data;
    try{
      const res = await fetch("content.json", {cache:"no-store"});
      data = await res.json();
    }catch(e){ return; }

    const items = data.items || [];
    
    items.forEach(item => {
      const isGallery = (typeof item === "object" && item.type === "gallery");
      const id = getItemId(item);
      if(!id) return; 

      const card = document.createElement("div");
      card.className = "card";
      applyCardStateClass(card, getState(id));

      let tile = isGallery ? createGalleryTile(item) : createVideoTile(item, id);

      // Manual State (Long Press / Right Click)
      let longPressFired = false;
      let timer = null;
      const onLong = () => {
        longPressFired = true;
        const next = cycleState(getState(id));
        setState(id, next);
        applyCardStateClass(card, next);
      };

      tile.addEventListener("contextmenu", (e) => { e.preventDefault(); onLong(); });
      tile.addEventListener("pointerdown", (e) => {
        if(e.button !== 0) return;
        longPressFired = false;
        tile.classList.add("pressing");
        timer = setTimeout(() => { onLong(); tile.classList.remove("pressing"); }, 500);
      });
      const clear = () => { clearTimeout(timer); tile.classList.remove("pressing"); };
      tile.addEventListener("pointerup", clear);
      tile.addEventListener("pointerleave", clear);

      tile.addEventListener("click", (e) => {
        if(longPressFired){ e.stopImmediatePropagation(); longPressFired = false; }
      }, true);

      card.appendChild(tile);
      els.grid.appendChild(card);
    });
  }

  init();

  // Settings UI
  const panel = document.getElementById("panel");
  const gear = document.getElementById("gear");
  gear.addEventListener("click", () => panel.classList.toggle("on"));
  document.getElementById("close").addEventListener("click", () => panel.classList.remove("on"));
  document.getElementById("minTile").addEventListener("input", (e) => {
    SETTINGS.minTile = +e.target.value; localStorage.setItem(LS_SETTINGS, JSON.stringify(SETTINGS)); applySettings();
    document.getElementById("minTileVal").textContent = e.target.value + "px";
  });
  document.getElementById("borderW").addEventListener("input", (e) => {
    SETTINGS.borderW = +e.target.value; localStorage.setItem(LS_SETTINGS, JSON.stringify(SETTINGS)); applySettings();
    document.getElementById("borderWVal").textContent = e.target.value + "px";
  });
  document.getElementById("resetStates").addEventListener("click", () => {
    STATES = {}; localStorage.setItem(LS_STATE, "{}");
    document.querySelectorAll(".card").forEach(c => applyCardStateClass(c, STATE_UNSEEN));
  });

})();