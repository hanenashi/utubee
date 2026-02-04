/* utubee v2.0 - Mixed Media (Video + Gallery) */

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

  // --- STATE (Watch History) ---
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

  // Get a stable ID for any item
  function getItemId(item){
    if(typeof item === "string") return parseVideoId(item);
    if(item.type === "gallery") return item.id;
    return null;
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

  let activeGallery = null; // { images: [], index: 0 }
  let viewStack = ["wall"]; // "wall", "gallery", "lightbox"

  function updateViewVisibility(){
    const current = viewStack[viewStack.length - 1];
    els.wall.hidden = (current !== "wall");
    els.galView.hidden = (current !== "gallery");
    els.lb.hidden = (current !== "lightbox");
    
    if(current === "lightbox") els.lb.focus();
  }

  function pushView(v){ viewStack.push(v); updateViewVisibility(); }
  function popView(){ 
    if(viewStack.length > 1) viewStack.pop(); 
    updateViewVisibility(); 
  }

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
    
    // Play logic
    tile.addEventListener("click", (e) => {
      // If closing player
      if(e.target.closest(".x")){
        tile.dataset.mode = "thumb";
        tile.innerHTML = `
          <img class="vid-thumb" src="${src}" alt="">
          <div class="play"><span><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span></div>
        `;
        return;
      }
      
      // If playing
      if(tile.dataset.mode === "thumb"){
        // stop others
        document.querySelectorAll(".tile[data-mode='player']").forEach(t => t.click()); 
        
        // mark seen
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

  // 2. GALLERY TILE (Mini-Grid)
  function createGalleryTile(item){
    const tile = document.createElement("div");
    tile.className = "tile gallery-tile";
    
    // Take first 6 images for preview
    const previews = item.images.slice(0, 6);
    // Fill with empty if less than 6 to maintain grid cells? No, auto-fill is fine.
    
    let html = "";
    previews.forEach(img => {
      html += `<img loading="lazy" src="${img}">`;
    });

    // Icon & Label
    html += `
      <div class="icon">
        <svg viewBox="0 0 24 24"><path d="M22 16V4c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2zm-11-4l2.03 2.71L16 11l4 5H8l3-4zM2 6v14c0 1.1.9 2 2 2h14v-2H4V6H2z"/></svg>
      </div>
      <div class="gal-label">${item.title}</div>
    `;
    tile.innerHTML = html;

    // Interaction
    tile.addEventListener("click", () => {
       // Mark seen immediately on open
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

    item.images.forEach((url, idx) => {
      const card = document.createElement("div");
      card.className = "card state-seen"; // Gallery items don't have individual read state
      
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.innerHTML = `<img class="vid-thumb" loading="lazy" src="${url}">`;
      
      tile.addEventListener("click", () => {
        openLightbox(idx);
      });

      card.appendChild(tile);
      els.galGrid.appendChild(card);
    });

    pushView("gallery");
  }

  // --- LOGIC: LIGHTBOX ---
  let lbIndex = 0;

  function openLightbox(idx){
    lbIndex = idx;
    updateLightbox();
    pushView("lightbox");
  }

  function updateLightbox(){
    if(!activeGallery) return;
    const url = activeGallery.images[lbIndex];
    els.lbImg.src = url;
    els.lbCount.textContent = `${lbIndex + 1} / ${activeGallery.images.length}`;
  }

  function lbNav(dir){
    if(!activeGallery) return;
    const len = activeGallery.images.length;
    lbIndex = (lbIndex + dir + len) % len;
    updateLightbox();
  }

  // Lightbox Events
  els.lbPrev.addEventListener("click", (e) => { e.stopPropagation(); lbNav(-1); });
  els.lbNext.addEventListener("click", (e) => { e.stopPropagation(); lbNav(1); });
  els.lbClose.addEventListener("click", popView);
  els.galBack.addEventListener("click", popView);

  // Keyboard Nav
  window.addEventListener("keydown", (e) => {
    const current = viewStack[viewStack.length - 1];

    if(e.key === "Escape"){
      if(current !== "wall") popView();
    }
    
    if(current === "lightbox"){
      if(e.key === "ArrowLeft") lbNav(-1);
      if(e.key === "ArrowRight") lbNav(1);
    }
  });

  // --- INIT WALL ---
  async function init(){
    els.grid.innerHTML = "";
    let data;
    try{
      // Try content.json first, fall back to videos.json logic if needed
      const res = await fetch("content.json", {cache:"no-store"});
      data = await res.json();
    }catch(e){
      console.log("No content.json, trying videos.json...");
      try {
        const res2 = await fetch("videos.json", {cache:"no-store"});
        data = await res2.json();
      } catch(e2){
        els.grid.innerHTML = "<div style='opacity:.5;padding:20px'>No content found.</div>";
        return;
      }
    }

    const items = data.items || data.videos || [];
    
    items.forEach(item => {
      const isGallery = (typeof item === "object" && item.type === "gallery");
      const id = getItemId(item);
      if(!id) return; // skip invalid

      const card = document.createElement("div");
      card.className = "card";
      applyCardStateClass(card, getState(id));

      let tile;
      if(isGallery){
        tile = createGalleryTile(item);
      } else {
        tile = createVideoTile(item, id);
      }

      // Context Menu / Long Press Logic (Shared)
      // We wrap the specific tile click, but the state cycle is on the wrapper card/id
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

      // Prevent click if long pressed
      tile.addEventListener("click", (e) => {
        if(longPressFired){
          e.stopImmediatePropagation();
          longPressFired = false;
        }
      }, true);

      card.appendChild(tile);
      els.grid.appendChild(card);
    });
  }

  init();

  // --- SETTINGS UI (Existing) ---
  const panel = document.getElementById("panel");
  const gear = document.getElementById("gear");
  
  gear.addEventListener("click", () => panel.classList.toggle("on"));
  document.getElementById("close").addEventListener("click", () => panel.classList.remove("on"));
  document.getElementById("minTile").addEventListener("input", (e) => {
    SETTINGS.minTile = +e.target.value;
    localStorage.setItem(LS_SETTINGS, JSON.stringify(SETTINGS));
    applySettings();
    document.getElementById("minTileVal").textContent = e.target.value + "px";
  });
  document.getElementById("borderW").addEventListener("input", (e) => {
    SETTINGS.borderW = +e.target.value;
    localStorage.setItem(LS_SETTINGS, JSON.stringify(SETTINGS));
    applySettings();
    document.getElementById("borderWVal").textContent = e.target.value + "px";
  });
  document.getElementById("resetStates").addEventListener("click", () => {
    STATES = {};
    localStorage.setItem(LS_STATE, "{}");
    document.querySelectorAll(".card").forEach(c => applyCardStateClass(c, STATE_UNSEEN));
  });

})();