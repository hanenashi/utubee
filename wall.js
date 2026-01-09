/* ===============================
   Settings
================================ */
const LS_KEY = "utubee_settings_v1";
const DEFAULTS = {
  minTile:220,
  dimMax:0.45,
  satMax:0.25,
  borderMinA:0.08,
  borderMaxA:0.35
};

function loadSettings(){
  try{
    return {...DEFAULTS, ...JSON.parse(localStorage.getItem(LS_KEY))};
  }catch{
    return {...DEFAULTS};
  }
}

function saveSettings(s){
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}

let SETTINGS = loadSettings();
applySettings();

function applySettings(){
  const r = document.documentElement.style;
  r.setProperty("--minTile", SETTINGS.minTile+"px");
  r.setProperty("--dimMax", SETTINGS.dimMax);
  r.setProperty("--satMax", SETTINGS.satMax);
  r.setProperty("--borderMinA", SETTINGS.borderMinA);
  r.setProperty("--borderMaxA", SETTINGS.borderMaxA);
}

/* ===============================
   YouTube helpers
================================ */
function parseVideoId(input){
  try{
    if(!input) return null;
    if(!input.includes("http")) return input;
    const u = new URL(input);
    if(u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    if(u.searchParams.get("v")) return u.searchParams.get("v");
  }catch{}
  return null;
}

function thumbHTML(id){
  return `
    <img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg">
    <div class="play">
      <span>
        <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
      </span>
    </div>`;
}

function playerHTML(id){
  return `
    <div class="x">✕</div>
    <iframe class="player"
      src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0"
      allow="autoplay; encrypted-media; fullscreen"
      allowfullscreen></iframe>`;
}

/* ===============================
   Render wall
================================ */
const grid = document.getElementById("grid");
let tiles = [];

function applyAge(tile,i,total){
  const age = total<=1 ? 0 : i/(total-1);
  tile.style.setProperty("--b", (1-age*SETTINGS.dimMax).toFixed(3));
  tile.style.setProperty("--s", (1-age*SETTINGS.satMax).toFixed(3));
  tile.style.setProperty("--borderA",
    (SETTINGS.borderMaxA-age*(SETTINGS.borderMaxA-SETTINGS.borderMinA)).toFixed(3)
  );
}

async function init(){
  const res = await fetch("videos.json",{cache:"no-store"});
  const ids = (await res.json()).videos.map(parseVideoId).filter(Boolean);

  grid.innerHTML="";
  tiles=[];

  ids.forEach((id,i)=>{
    const card=document.createElement("div");
    card.className="card"+(i===0?" is-new":"");

    const tile=document.createElement("div");
    tile.className="tile";
    tile.dataset.id=id;
    tile.dataset.mode="thumb";

    applyAge(tile,i,ids.length);
    tile.innerHTML=thumbHTML(id);

    tile.onclick=e=>{
      if(tile.dataset.mode==="thumb"){
        document.querySelectorAll(".tile[data-mode='player']")
          .forEach(t=>{t.dataset.mode="thumb";t.innerHTML=thumbHTML(t.dataset.id)});
        tile.dataset.mode="player";
        tile.innerHTML=playerHTML(id);
      }else if(e.target.classList.contains("x")){
        tile.dataset.mode="thumb";
        tile.innerHTML=thumbHTML(id);
      }
    };

    card.appendChild(tile);
    grid.appendChild(card);
    tiles.push(tile);
  });
}

init();

/* ===============================
   Settings UI
================================ */
const $ = id => document.getElementById(id);
const panel = $("panel");

$("gear").onclick=()=>panel.classList.toggle("on");
$("close").onclick=()=>panel.classList.remove("on");
$("reset").onclick=()=>{
  SETTINGS={...DEFAULTS};
  saveSettings(SETTINGS);
  applySettings();
  tiles.forEach((t,i)=>applyAge(t,i,tiles.length));
};

["minTile","dimMax","satMax","borderMinA","borderMaxA"].forEach(k=>{
  const el=$(k), val=$(k+"Val");
  el.value=SETTINGS[k];
  val.textContent=el.value+(k==="minTile"?"px":"");
  el.oninput=()=>{
    SETTINGS[k]=Number(el.value);
    saveSettings(SETTINGS);
    applySettings();
    val.textContent=el.value+(k==="minTile"?"px":"");
    tiles.forEach((t,i)=>applyAge(t,i,tiles.length));
  };
});
