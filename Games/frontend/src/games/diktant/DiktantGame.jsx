import { useState, useEffect, useRef } from "react";

const TOTAL_LEVELS = 100;
const STORAGE_KEY = "diktant_progress_v3";

const EASY_WORDS = [
  "ONA","OTA","KOʻZ","QOʻL","OGʻIZ","NON","SUV","TOGʻ","KUN","TUN",
  "BOGʻ","GUL","BOLA","DARS","KITOB","MEVA","OLMA","UZUM","QISH","YOZ",
  "BAHOR","KUZ","BALIQ","QUSH","IT","MUSHUK","OT","SIGIR","ECHKI","ARIQ",
  "DARYO","KOʻL","DENGIZ","TOSH","TUPROQ","SHAMOL","QOR","BULUT","UYQU","OVQAT",
  "MAKTAB","DAFTAR","QALAM","RUCHKA","SUMKA","FORMA","PARTA","DASHT","OSMON","YER",
  "ISSIQ","SOVUQ","YORugʻ","BALAND","PAST","KATTA","KICHIK","YANGI","ESKI","QIZIL",
  "YASHIL","KOʻK","SARIQ","OʻRIK","QOVUN","TARVUZ","LIMON","ANOR","SHAFTOLI","PIYOZ",
  "SABZI","BODRING","POMIDOR","KARTOSHKA","KARAM","TOʻP","RAQAM","HARF","RANG","TAOM",
  "XONA","ESHIK","DERAZA","STOL","STUL","KARAVOT","GILAM","SOAT","OYNA","DEVOR",
  "KOʻCHA","BOZOR","MASJID","BOGʻCHA","SHIFOXONA","KUTUBXONA","STADION","MUZEY","TEATR","KINO"
];

const MEDIUM_PAIRS = [
  ["CHIROYLI","QUSH"],["SHAFFOF","SUV"],["KITOB","OʻQISH"],["MEVA","YEMOQ"],["KUN","BOTDI"],
  ["BAHOR","KELDI"],["SHAMOL","ESDI"],["BOLALAR","OʻYNAMOQDA"],["DARS","BOSHLANDI"],["QOR","YOGʻMOQDA"],
  ["MAYMOQ","AYIQ"],["PAXMOQ","MUSHUK"],["TOSHQIN","DARYO"],["QUSHLAR","OVOZI"],["GUL","OCHILDI"],
  ["BULBUL","SAYRAYAPTI"],["BOLALAR","YUGURMOQDA"],["BALAND", "TOG'LAR"],["TINIQ", "KOʻL"],["YOMG'IR","YOG'DI"],
  ["ISSIQ","KUNLAR"],["YANGI","DAFTAR"],["YASHIL","BOGʻ"],["KATTA","MAKTAB"],["QOR","YOGʻMOQDA"],
  ["QUYOSH","CHIQDI"],["OY","PORLADI"],["YULDUZ","YARQIRAYDI"],["TONG","OTDI"],["JAJJI","BOLAJON"],
  ["RANGLI","QALAM"],["SAVAT","TOʻLDI"],["OVQAT","PISHDI"],["ISSIQ","NON"],["QIZIL","OLMA"],
  ["OBAKI","UZUM"],["KATTA","TARVUZ"],["SHIRIN","ANOR"],["YAXSHI","BOLA"],["MEHRIBON","ONA"],
  ["QUVNOQ","OTA"],["SABRLI","BOʻL"],["DIQQAT","QILDI"],["TINIMSIZ","MEHNAT"],["CHARCHAMAY","OʻQIDI"],
  ["BAXTINI","TOPDI"],["SEVIMLI","KITOB"],["SHIRINSOʻZ","BUVI"],["KICHIK","QOʻZICHOQ"],["SAYROQI","QUSHLAR"]
];

const HARD_SENTENCES = [
  ["QUYOSH","CHIQIB","DALALAR","YORISHIB","KETDI"],
  ["BAHOR","KELIB","GULLAR","OCHILDI"],
  ["SHAMOL","ESIB","DARAXT","MAYIN", "TEBRANDI"],
  ["YOMGIR","YOGʻIB","HOVLI","HOʻL","BOʻLDI"],
  ["QOR","YOGʻIB","TOGLAR","OPPOQ","BOʻLDI"],
  ["BULUTLAR","KOʻKDA","SUZIB","YURIBDI"],
  ["DARYO","TOSHIB","QIRG'OQQA","URILDI"],
  ["KUZ","KELIB","BARGLAR","TOʻKILDI"],
  ["TONG","OTIB","QUSHLAR","SAYRADI"],
  ["OY","CHIQIB","OSMONNI","YORITDI"],
  ["YULDUZLAR","TUNDA","YARQIRAB","TURDI"],
  ["BOGʻDA","GULLAR","OCHILDI"],
  ["ARIQ","BOYLARIDA","YALPIZLAR","UNIB","CHIQDI"],
  ["DALA","BOYLAB","SHAMOL","ESMOQDA"],
  ["TOGLAR","ORASIDA","BULUT","SUZDI"],
  ["DENGIZ","TOʻLQINI","SOHILGA","URDI"],
  ["BAHORDA","DARAXTLAR","GULLADI"],
  ["QISHDA","HAVONING","SOVUQ","BOʻLDI"],
  ["YOZDA","QUYOSH","YERNI","ISITDI"],
  ["KUZDA","BARGLAR","SARG'AYDI"],
  ["BOLALAR","MAKTABGA","SHOD","BORISHDI"],
  ["DARS","BOSHLANGANDA","HAMMA","JIMIB","QOLDI"],
  ["OQITUVCHI","DOSKAGA","YOZIB","TUSHUNTIRDI"],
  ["BOLA","DAFTARIGA","CHIROYLI","YOZDI"],
  ["SINF","BOLALARI","BIRGA","OʻQIYDI"],
  ["KITOB","OʻQISH","AQLNI","OSHIRADI"],
  ["MATEMATIKA","DARSIDA","MISOLLAR","YECHILDI"],
  ["TANAFFUSDA","BOLALAR","OʻYNAB","QOLISHDI"],
  ["QALAM","BILAN","RASM","CHIZDI"],
  ["MAKTAB","KUTUBXONASI","KITOBGA","TOʻLA"],
  ["YANGI","DAFTAR","OLIB","KELDI"],
  ["IMTIHONDA","YAXSHI","BAHO","OLDI"],
  ["OʻQITUVCHI","BOLALARNI","MAQTADI"],
  ["DARS","TUGAGANDAN","KEYIN","UYGA","KETDI"],
  ["SPORTZALDA","MASHQ","QILIB","CHIQDI"],
  ["MAKTABDA","KOʻP","YANGI","NARSALAR","OʻRGANILDI"],
  ["OʻQUVCHI","SAVOLGA","TOʻGʻRI","JAVOB","BERDI"],
  ["BOLALAR","BIRGALIKDA","LOYIHA","QILDI"],
  ["KLASS","TOZALAB","TARTIBGA","SOLINDI"],
  ["ONA","TILIDA","INSHO","YOZDI"],
  ["ONA","NONUSHTA","TAYYORLAB","BOLA","CHAQIRDI"],
  ["OTA","ISHDAN","QAYTIB","UYGA","KIRDI"],
  ["OILA","DASTURXON","ATROFIDA","TOʻPLANDI"],
  ["BUVI","MENGA","ERTAKLAR","AYTIB","BERDI"],
  ["AKAM","MENGA","DARS","TAYYORLASHGA","YORDAM","BERDI"],
  ["SINGIL","KUYLAB","OʻYNAB","YURDI"],
  ["UYDA","HAMMAGA","VAZIFA","BOʻLINDI"],
  ["ONAM","PISHIRGAN","OVQAT","JUDA","MAZALI"],
  ["OTAM","BILAN","BOGʻDA","SAYR","QILDIK"],
  ["KECHQURUN","HAMMA","BIRGA","GAPLASHDI"],
  ["BUVIM","BIZGA","ERTAK","AYTIB","BERDI"],
  ["BOBOM","BOGʻDA","MEVA","TERDI"],
  ["BOLALAR","UYDAGILARGA","YORDAM","BERDI"],
  ["KECHASI","HAMMA","ERTA","UXLADI"],
  ["ERTALAB","NONUSHTA","QILIB","CHIQDIK"],
  ["ONA","BOLASINI","MUHABBAT","BILAN","TARBIYALADI"],
  ["OTAM","MENGA","VELOSIPED","HAYDASHNI","OʻRGATDI"],
  ["OILAMIZ","BAYRAMI","SHOD","OʻTDI"],
  ["AKA","UKASI","BILAN","KITOB","OʻQIDI"],
  ["ONAXON","BOLASIGA","ALLA","AYTDI"],
  ["MUSHUK","SICHQON","KOʻRIB","QOCHIB","KETDI"],
  ["IT","HOVLIGA","KIRIB","QOLDI"],
  ["QUSH","UCHIB","UYIGA","QAYTIB","KELDI"],
  ["SIGIR","YAYLOVDA","OʻT","YEDI"],
  ["QOʻZICHOQ","ONASINI","KOʻRIB","YUGURDI"],
  ["BALIQ","SUVDA","SUZADI"],
  ["OTDA","DALADA","CHOPIB","YURISHDI"],
  ["TOVUQ","PILLACHA","OLIB","KETDI"],
  ["ECHKI","TOGʻDA","OʻT","YEDI"],
  ["KAPALAK","GUL","USTIGA","QOʻNDI"],
  ["ASALARI","GUL","CHANGINI","YIGʻDI"],
  ["ZOGʻCHA","DALADA","SAYRADI"],
  ["QOʻNGIZ","BARGNI","KEMIRIB","YEDI"],
  ["TULKI","OʻRMONDA","OVQAT","IZLADI"],
  ["QUYON","TEZDA","QOCHIB","KETDI"],
  ["AYIQ","TOGʻDA","UYQUGA","YOTDI"],
  ["BURGUT","OSMONDA","UCHIB","YURDI"],
  ["OʻRDAK","HAVUZDA","SUZIB","YURDI"],
  ["MUSHUK","BOLASI","BIRGA","OʻYNADI"],
  ["DARAXT","USTIDA","QUSH","SAYRADI"],
  ["FUTBOLCHI","TOʻPNI","DARVOZAGA","TEPDI"],
  ["BOLALAR","BAYRAMDA","QOʻSHIQ","AYTDI"],
  ["YANGI","YIL","DARAXTI","BEZATILDI"],
  ["NAVROʻZ","BAYRAMI","SHOD","OʻTDI"],
  ["SPORT","MUSOBAQASIDA","BIRINCHI","OʻRIN","OLDI"],
  ["DOSTONIM","TUGʻILGAN","KUNINI","TABRIKLADI"],
  ["KONSERTDA","GOʻZAL","QOʻSHIQLAR","YANGRADI"],
  ["MUZEYDA","QIZIQARLI","NARSALAR","KOʻRDIK"],
  ["PARKDA","DARAXTLAR","OSTIDA","OʻYNADIK"],
  ["TEATRDA","CHIROYLI","SPEKTAKL","KOʻRDIK"],
  ["BOLALAR","VELOSIPED","HAYDAB","KELDI"],
  ["JAMOAMIZ","MUSOBAQADA","GʻOLIB","BOʻLDI"],
  ["MEHMONLAR","UYGA","KELIB","QOLDI"],
  ["HAYIT","KUNI","YANGI","KIYIM","KIYILDI"],
  ["RAMAZON","OYIDA","TAOM","BOʻLISHDI"],
  ["OSHXONADA","MAZALI","PALOV","PISHDI"],
  ["BOZORDAN","YANGI","MEVALAR","KELDI"],
  ["SHAHAR","KOʻCHASI","CHIROQ","BILAN","BEZANDI"],
  ["BOLALAR","BIRGA","KINO","KOʻRDILAR"],
  ["KELAJAKDA","KATTA","ODAM","BOʻLAMAN"],
];

function getWordSet(difficulty, levelIndex) {
  if (difficulty === "easy")   return [EASY_WORDS[levelIndex % EASY_WORDS.length]];
  if (difficulty === "medium") return MEDIUM_PAIRS[levelIndex % MEDIUM_PAIRS.length];
  return HARD_SENTENCES[levelIndex % HARD_SENTENCES.length];
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
function saveProgress(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}
function initProgress() {
  return {
    easy:   { maxUnlocked: 0, completed: [], score: 0 },
    medium: { maxUnlocked: 0, completed: [], score: 0 },
    hard:   { maxUnlocked: 0, completed: [], score: 0 },
  };
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function buildTilePool(words) {
  const letters = words.join("").split("");
  const extra = "ABDEFGHIJKLMNOPRSTUVWXYZ".split("");
  const distractors = shuffle(extra).slice(0, Math.max(2, 14 - letters.length));
  return shuffle([...letters, ...distractors]).map((letter, id) => ({ id, letter, used: false }));
}

async function speakText(text, setIsPlaying) {
  try {
    setIsPlaying(true);
    const res = await fetch("/api/v1/smartkids/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language: "uz" }),
    });
    if (!res.ok) throw new Error("TTS fail");
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => { setIsPlaying(false); URL.revokeObjectURL(url); };
    audio.onerror = () => { setIsPlaying(false); URL.revokeObjectURL(url); fallbackTTS(text, setIsPlaying); };
    await audio.play();
  } catch { fallbackTTS(text, setIsPlaying); }
}
function fallbackTTS(text, setIsPlaying) {
  if (!("speechSynthesis" in window)) { setIsPlaying(false); return; }
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = "uz-UZ"; utt.rate = 0.82; utt.pitch = 1.1;
  const voices = window.speechSynthesis.getVoices();
  const uz = voices.find(v => v.lang.startsWith("uz"));
  const ru = voices.find(v => v.lang.startsWith("ru"));
  if (uz) utt.voice = uz; else if (ru) utt.voice = ru;
  setIsPlaying(true);
  utt.onend  = () => setIsPlaying(false);
  utt.onerror = () => setIsPlaying(false);
  window.speechSynthesis.speak(utt);
}

function PastelBg() {
  return (
    <div className="fixed inset-0 overflow-hidden z-0 pointer-events-none select-none">
      <div className="absolute inset-0" style={{
        background:"linear-gradient(135deg,#fde8f0 0%,#e8d8f8 25%,#d0eaff 50%,#c8f5e8 75%,#fff4cc 100%)"
      }}/>
      {[
        {w:"70vw",h:"70vw",top:"-20%",left:"-15%",  bg:"rgba(255,182,210,0.55)",a:"dkt_blobA 12s ease-in-out infinite"},
        {w:"60vw",h:"60vw",top:"10%", right:"-10%", bg:"rgba(196,168,255,0.50)",a:"dkt_blobB 15s ease-in-out infinite"},
        {w:"55vw",h:"55vw",bottom:"-10%",left:"20%",bg:"rgba(150,230,200,0.50)",a:"dkt_blobC 10s ease-in-out infinite"},
        {w:"50vw",h:"50vw",bottom:"5%",right:"5%",  bg:"rgba(255,230,140,0.45)",a:"dkt_blobD 18s ease-in-out infinite"},
        {w:"45vw",h:"45vw",top:"35%", left:"30%",   bg:"rgba(255,200,160,0.35)",a:"dkt_blobB 20s ease-in-out infinite reverse"},
      ].map((b,i)=>(
        <div key={i} className="absolute" style={{
          width:b.w,height:b.h,top:b.top,left:b.left,right:b.right,bottom:b.bottom,
          background:`radial-gradient(circle,${b.bg} 0%,transparent 70%)`,
          borderRadius:"50%",animation:b.a,
        }}/>
      ))}
      <div className="absolute inset-0" style={{
        backgroundImage:"radial-gradient(circle,rgba(180,120,200,0.07) 1px,transparent 1px)",
        backgroundSize:"36px 36px",
      }}/>
      <style>{`
        @keyframes dkt_blobA{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(4%,6%) scale(1.06)}66%{transform:translate(-3%,3%) scale(0.97)}}
        @keyframes dkt_blobB{0%,100%{transform:translate(0,0) scale(1)}40%{transform:translate(-5%,4%) scale(1.08)}70%{transform:translate(3%,-4%) scale(0.95)}}
        @keyframes dkt_blobC{0%,100%{transform:translate(0,0) scale(1)}30%{transform:translate(6%,-5%) scale(1.05)}60%{transform:translate(-4%,6%) scale(0.96)}}
        @keyframes dkt_blobD{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-6%,-4%) scale(1.1)}}
        @keyframes dkt_tileIn{0%{transform:translateY(28px) scale(0.65);opacity:0}100%{transform:translateY(0) scale(1);opacity:1}}
        @keyframes dkt_pop{0%{transform:scale(1)}40%{transform:scale(1.28)}100%{transform:scale(1)}}
        @keyframes dkt_shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}
        @keyframes dkt_glowGreen{0%{box-shadow:0 0 0 0 rgba(100,210,100,0.7)}100%{box-shadow:0 0 0 18px rgba(100,210,100,0)}}
        @keyframes dkt_starUp{0%{transform:translateY(0) scale(1);opacity:1}100%{transform:translateY(-130px) scale(0.3);opacity:0}}
        @keyframes dkt_slideUp{0%{transform:translateY(22px);opacity:0}100%{transform:translateY(0);opacity:1}}
        @keyframes dkt_fadeIn{0%{opacity:0}100%{opacity:1}}
        @keyframes dkt_bounceIn{0%{transform:scale(0.45);opacity:0}60%{transform:scale(1.18)}100%{transform:scale(1);opacity:1}}
        @keyframes dkt_pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
        @keyframes dkt_lvlPop{0%{transform:scale(0.75);opacity:0}100%{transform:scale(1);opacity:1}}
      `}</style>
    </div>
  );
}

const DIFF_CFG = {
  easy:   {label:"🟢 Oson",  sub:"1 ta so'z · 3–10 harf", bg:"#b8f0b0",shadow:"#72c070",text:"#1a4a18"},
  medium: {label:"🟡 O'rta", sub:"2–3 ta so'z",            bg:"#f5e8a0",shadow:"#c4b060",text:"#4a3a10"},
  hard:   {label:"🔴 Qiyin", sub:"4–6 so'zli gap",         bg:"#f4b0b0",shadow:"#c47070",text:"#5a1818"},
};

function MenuScreen({ onStart }) {
  return (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 gap-4"
      style={{animation:"dkt_fadeIn 0.5s ease"}}>
      <div className="text-center">
        <div style={{fontSize:"5rem",filter:"drop-shadow(0 4px 12px rgba(0,0,0,0.12))",marginBottom:10}}>🎵</div>
        <h1 style={{fontFamily:"'Baloo 2',cursive",fontSize:"clamp(2rem,6vw,3.2rem)",
                    fontWeight:900,color:"#5a3a6a",
                    textShadow:"0 3px 0 rgba(255,255,255,0.75),0 6px 20px rgba(0,0,0,0.08)",
                    letterSpacing:"1px"}}>Diktant O'yini</h1>
        <p style={{color:"#8a5a9a",fontWeight:700,fontSize:"1.1rem",marginTop:6}}>
          Eshiting va to'g'ri yozing! 🇺🇿
        </p>
      </div>
      <button onClick={onStart} style={{
        marginTop:12,
        background:"#b8f0b0",border:"none",borderRadius:18,
        width:"min(300px,80vw)",padding:"16px 30px",
        fontFamily:"'Nunito',sans-serif",fontWeight:900,fontSize:"1.15rem",
        color:"#1a4a18",cursor:"pointer",textTransform:"uppercase",letterSpacing:"1px",
        boxShadow:"0 5px 0 #72c070,0 8px 20px rgba(0,0,0,0.1)",
        transition:"transform 0.1s",
      }}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";}}
      onMouseLeave={e=>{e.currentTarget.style.transform="";}}
      onMouseDown={e=>{e.currentTarget.style.transform="translateY(3px)";}}
      onMouseUp={e=>{e.currentTarget.style.transform="";}}
      >▶ O'ynashni boshlash</button>
      <p style={{color:"#9a6aaa",fontWeight:700,fontSize:"0.85rem",marginTop:4}}>
        100 ta daraja · 3 qiyinlik · progress saqlanadi 💾
      </p>
    </div>
  );
}

function DifficultyScreen({ progress, onSelect, onBack }) {
  return (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 gap-4"
      style={{animation:"dkt_slideUp 0.4s ease"}}>
      <h2 style={{fontFamily:"'Baloo 2',cursive",fontSize:"clamp(1.6rem,5vw,2.4rem)",
                  fontWeight:800,color:"#5a3a6a",textShadow:"0 2px 0 rgba(255,255,255,0.6)",marginBottom:4}}>
        Qiyinlikni tanlang
      </h2>
      {Object.entries(DIFF_CFG).map(([key,cfg])=>{
        const done = progress[key].completed.length;
        const sc   = progress[key].score;
        const pct  = done / TOTAL_LEVELS;
        const maxU = progress[key].maxUnlocked;
        return (
          <button key={key} onClick={()=>onSelect(key)} style={{
            position:"relative",width:"min(340px,85vw)",padding:"16px 24px",
            background:cfg.bg,border:"none",borderRadius:20,
            boxShadow:`0 5px 0 ${cfg.shadow},0 8px 20px rgba(0,0,0,0.1)`,
            fontFamily:"'Nunito',sans-serif",fontWeight:900,color:cfg.text,cursor:"pointer",
            display:"flex",flexDirection:"column",alignItems:"center",gap:3,
            transition:"transform 0.1s",
          }}
          onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";}}
          onMouseLeave={e=>{e.currentTarget.style.transform="";}}
          onMouseDown={e=>{e.currentTarget.style.transform="translateY(3px)";}}
          onMouseUp={e=>{e.currentTarget.style.transform="";}}
          >
            <span style={{fontSize:"1.2rem",textTransform:"uppercase",letterSpacing:"1px"}}>{cfg.label}</span>
            <span style={{fontSize:"0.75rem",opacity:0.7,fontWeight:700}}>{cfg.sub}</span>
            <div style={{display:"flex",justifyContent:"space-between",width:"100%",fontSize:"0.72rem",fontWeight:800,opacity:0.8,marginTop:4}}>
              <span>✅ {done}/{TOTAL_LEVELS}</span>
              <span>⭐ {sc} ball</span>
            </div>
            <div style={{width:"100%",height:5,background:"rgba(0,0,0,0.1)",borderRadius:4,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${pct*100}%`,background:"rgba(0,0,0,0.22)",borderRadius:4,transition:"width 0.5s"}}/>
            </div>
            <div style={{fontSize:"0.68rem",opacity:0.65,fontWeight:700}}>🔓 {maxU+1}-daraja ochiq</div>
          </button>
        );
      })}
      <button onClick={onBack} style={{
        marginTop:8,background:"rgba(255,255,255,0.65)",border:"none",borderRadius:16,
        padding:"11px 28px",fontFamily:"'Nunito',sans-serif",fontWeight:800,
        fontSize:"0.95rem",color:"#5a3a7a",cursor:"pointer",boxShadow:"0 4px 0 rgba(0,0,0,0.1)",
      }}>← Orqaga</button>
    </div>
  );
}

function DktLevelSelectScreen({ difficulty, progress, onSelect, onBack }) {
  const completedSet = new Set(progress[difficulty].completed);
  const correctSet   = new Set(progress[difficulty].correct || []);
  const maxUnlocked  = progress[difficulty].maxUnlocked;
  const done         = completedSet.size;
  const sc           = progress[difficulty].score;
  const cfg          = DIFF_CFG[difficulty];

  return (
    <div className="relative z-10 flex flex-col items-center min-h-screen px-4 pt-1 pb-1"
      style={{animation:"dkt_fadeIn 0.35s ease",overflowY:"auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:3,width:"min(520px,96vw)",marginBottom:14}}>
        <button onClick={onBack} style={{
          background:"rgba(255,255,255,0.7)",border:"none",borderRadius:14,
          padding:"8px 15px",fontWeight:800,fontSize:"0.88rem",color:"#5a3a6a",
          cursor:"pointer",boxShadow:"0 3px 0 rgba(0,0,0,0.1)",flexShrink:0,
        }}>← Orqaga</button>
        <div style={{flex:1,textAlign:"center"}}>
          <span style={{fontFamily:"'Baloo 2',cursive",fontSize:"1.3rem",fontWeight:800,
                        color:"#5a3a6a",textShadow:"0 2px 0 rgba(255,255,255,0.6)"}}>
            {cfg.label}
          </span>
        </div>
        <div style={{
          background:"rgba(255,255,255,0.65)",borderRadius:14,padding:"6px 14px",
          fontSize:"0.75rem",fontWeight:800,color:"#5a3a7a",flexShrink:0,
          boxShadow:"0 2px 8px rgba(0,0,0,0.08)",
        }}>✅{done} ⭐{sc}</div>
      </div>
      <div style={{
        display:"grid",gridTemplateColumns:"repeat(4,1fr)",
        gap:"clamp(5px,1.3vw,10px)",width:"min(320px,96vw)",
        maxHeight:"calc(100vh - 180px)",overflowY:"auto",paddingRight:6,
      }}>
        {Array.from({length:TOTAL_LEVELS},(_,i)=>{
          const isCorrect  = correctSet.has(i);
          const isCompleted = completedSet.has(i);
          const isCurrent  = i === maxUnlocked && !isCompleted;
          const isLocked   = i > maxUnlocked;
          let bg, color, shadow, cursor, opacity;
          if (isCorrect) { bg = "#a8e6a0"; color = "#1a4a18"; shadow = "0 3px 0 #5ab050,0 4px 10px rgba(0,0,0,0.1)"; cursor = "pointer"; opacity = 1; }
          else if (isCompleted && !isCorrect) { bg = "#f8c8b0"; color = "#5a1a18"; shadow = "0 3px 0 #c07050,0 4px 10px rgba(0,0,0,0.08)"; cursor = "pointer"; opacity = 1; }
          else if (isCurrent) { bg = "#7ab8f0"; color = "#0a2a5a"; shadow = "0 4px 0 #3a80d0,0 6px 14px rgba(58,128,208,0.35)"; cursor = "pointer"; opacity = 1; }
          else if (isLocked) { bg = "rgba(200,195,215,0.45)"; color = "rgba(120,100,150,0.4)"; shadow = "none"; cursor = "not-allowed"; opacity = 0.7; }
          else { bg = "#7ab8f0"; color = "#0a2a5a"; shadow = "0 4px 0 #3a80d0"; cursor = "pointer"; opacity = 1; }
          return (
            <button key={i} onClick={()=>{ if(!isLocked) onSelect(i); }} disabled={isLocked}
              style={{
                aspectRatio:"1",borderRadius:10,border:"none",background:bg,
                fontFamily:"'Nunito',sans-serif",fontWeight:900,fontSize:"clamp(0.62rem,1.7vw,0.82rem)",
                color,cursor,boxShadow:shadow,display:"flex",flexDirection:"column",alignItems:"center",
                justifyContent:"center",gap:1,transition:"transform 0.1s,box-shadow 0.1s",
                animation:`dkt_lvlPop 0.2s ease ${i*6}ms both`,position:"relative",zIndex:1,opacity,
              }}
              onMouseEnter={e=>{if(!isLocked){e.currentTarget.style.transform="scale(1.14)";e.currentTarget.style.zIndex=3;}}}
              onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.zIndex=1;}}
            >
              <span>{i+1}</span>
              {isCorrect && <span style={{fontSize:"0.46rem",lineHeight:1}}>✓</span>}
              {isCompleted && !isCorrect && <span style={{fontSize:"0.46rem",lineHeight:1}}>✗</span>}
              {isCurrent && <span style={{fontSize:"0.46rem",lineHeight:1}}>▶</span>}
              {isLocked && <span style={{fontSize:"0.46rem",lineHeight:1}}>🔒</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DktGameScreen({ difficulty, levelIndex, isLastLevel, onExit, onFinish, onNextLevel }) {
  const words   = useRef(getWordSet(difficulty, levelIndex)).current;
  const isHardMode = difficulty === "hard";
  const [tiles, setTiles]       = useState(() => buildTilePool(words));
  const [selected, setSelected] = useState([]);
  const [typedText, setTypedText] = useState("");
  const [phase, setPhase]       = useState("playing");
  const [checked, setChecked]   = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [stars, setStars]       = useState([]);
  const resultMarked = useRef(false);
  const starId = useRef(0);

  useEffect(()=>{
    const t = setTimeout(()=> speakText(words.join(" "), setIsPlaying), 400);
    return ()=> clearTimeout(t);
  },[]);

  function handleSpeak(){ speakText(words.join(" "), setIsPlaying); }

  function selectTile(id){
    if(checked || isHardMode) return;
    const total = words.join("").length;
    if(selected.length >= total) return;
    const tile = tiles.find(t=>t.id===id);
    if(!tile||tile.used) return;
    setTiles(prev=>prev.map(t=>t.id===id?{...t,used:true}:t));
    setSelected(prev=>[...prev,{letter:tile.letter,tileId:id}]);
  }
  function removeAt(idx){
    if(checked || isHardMode) return;
    const rm = selected[idx];
    setTiles(prev=>prev.map(t=>t.id===rm.tileId?{...t,used:false}:t));
    setSelected(prev=>prev.filter((_,i)=>i!==idx));
  }
  function deleteLast(){
    if(checked) return;
    if(isHardMode) { setTypedText(prev => prev.slice(0, -1)); return; }
    if(selected.length===0) return;
    const rm = selected[selected.length-1];
    setTiles(prev=>prev.map(t=>t.id===rm.tileId?{...t,used:false}:t));
    setSelected(prev=>prev.slice(0,-1));
  }
  function checkAnswer(){
    if(checked){ onNextLevel(phase==="correct"); return; }
    const total = words.join("").length;
    const userAnswer = isHardMode ? typedText : selected.map(s=>s.letter).join("");
    const userAnswerNoSpaces = userAnswer.replace(/\s/g, "");
    if(userAnswerNoSpaces.length<total){ flash(isHardMode?"Barcha harflarni kiriting!":"Barcha harflarni tanlang!",false); return; }
    const correct = words.join("");
    const ok      = userAnswerNoSpaces.toUpperCase()===correct.toUpperCase();
    setChecked(true);
    setPhase(ok?"correct":"wrong");
    if(!resultMarked.current){ resultMarked.current=true; onFinish(ok); }
    if(ok){ burst(); flash("✅ To'g'ri! Ajoyib!",true); }
    else   { flash(`❌ Xato! To'g'ri: ${words.join(" ")}`,false); }
  }
  function burst(){
    const ns=Array.from({length:10},(_,i)=>({
      id:starId.current++,x:25+Math.random()*50,
      emoji:["⭐","✨","🌟","💫"][i%4],delay:i*55,
    }));
    setStars(p=>[...p,...ns]);
    setTimeout(()=>setStars([]),1600);
  }
  function flash(msg,ok){
    setFeedback({msg,ok});
    setTimeout(()=>setFeedback(null),2300);
  }

  const renderSlots=()=>{
    const slots=[]; let ci=0;
    const userAnswer = isHardMode ? typedText.replace(/\s/g, "").split("") : selected.map(s=>s.letter);
    words.forEach((word,wi)=>{
      if(wi>0) slots.push(<div key={`g${wi}`} style={{width:8}}/>);
      word.split("").forEach((_,li)=>{
        const char=userAnswer[ci]; const key=`s${wi}-${li}`;
        if(char){
          slots.push(
            <button key={key} onClick={()=>isHardMode?null:removeAt(ci)} style={{
              width:36,height:42,borderRadius:9,flexShrink:0,
              background:"rgba(255,255,255,0.93)",border:"none",
              fontFamily:"'Baloo 2',cursive",fontWeight:800,fontSize:"1.2rem",
              color:"#2a1a4a",cursor:isHardMode?"default":"pointer",
              boxShadow:"0 3px 7px rgba(0,0,0,0.16)",
              display:"flex",alignItems:"center",justifyContent:"center",
              animation:"dkt_pop 0.2s ease",transition:"transform 0.1s",
            }}>{char}</button>
          );
        } else {
          slots.push(<div key={key} style={{
            width:36,height:42,borderRadius:9,flexShrink:0,
            background:"rgba(255,255,255,0.18)",
            border: "2px dashed rgba(255,255,255,0.4)",
          }}/>);
        }
        ci++;
      });
    });
    return slots;
  };

  const renderInput=()=>{
    if(!isHardMode) return null;
    const total = words.join("").length;
    return (
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,paddingBottom:5, paddingTop:10}}>
        <input type="text" value={typedText}
          onChange={(e)=>{
            if(checked) return;
            const upper = e.target.value.toUpperCase();
            let val = ""; let letterCount = 0;
            for (const ch of upper) {
              if (ch === " ") { val += ch; }
              else if (letterCount < total) { val += ch; letterCount++; }
            }
            setTypedText(val);
          }}
          disabled={checked}
          placeholder="So'zni kiriting..."
          style={{
            width:"min(320px,90vw)",padding:"14px 20px",fontSize:"1.1rem",
            fontFamily:"'Baloo 2',cursive",fontWeight:700,textAlign:"center",
            border:"2px solid rgba(180,150,220,0.5)",borderRadius:14,
            background:"rgba(255,255,255,0.9)",color:"#3a2060",outline:"none",
            boxShadow:"0 4px 12px rgba(0,0,0,0.1)",cursor:checked?"default":"text",
          }}
          autoFocus
        />
      </div>
    );
  };

  const prog   = (levelIndex/TOTAL_LEVELS)*100;
  const half   = Math.ceil(tiles.length/2);
  const rows   = [tiles.slice(0,half),tiles.slice(half)];
  const boxBg  = phase==="correct"?"rgba(55,160,55,0.68)": phase==="wrong"?"rgba(205,55,55,0.68)":"rgba(100,70,160,0.38)";

  return (
    <div className="fixed inset-0 z-10 flex flex-col" style={{fontFamily:"'Nunito',sans-serif"}}>
      <div style={{position:"absolute",top:0,left:0,right:0,height:5,background:"rgba(255,255,255,0.25)",zIndex:20}}>
        <div style={{height:"100%",width:prog+"%",borderRadius:"0 4px 4px 0",background:"linear-gradient(90deg,#c4a0f0,#a0d8f8)",transition:"width 0.4s"}}/>
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"20px 16px 0"}}>
        <button onClick={onExit} style={{
          background:"#f4b0c0",border:"none",borderRadius:20,padding:"8px 15px",
          fontWeight:800,fontSize:"0.82rem",color:"#5a1825",cursor:"pointer",
          boxShadow:"0 4px 0 #c47890",textTransform:"uppercase",letterSpacing:"0.5px",
        }}>✕</button>
        <div style={{
          background:"rgba(255,255,255,0.82)",borderRadius:50,padding:"7px 18px",
          fontWeight:900,fontSize:"0.95rem",color:"#7a4a9a",
          boxShadow:"0 4px 14px rgba(0,0,0,0.1)",backdropFilter:"blur(6px)",textAlign:"center",lineHeight:1.3,
        }}>
          <div>{levelIndex+1}<span style={{color:"#bbb",fontWeight:700,fontSize:"0.85rem"}}>/{TOTAL_LEVELS}</span></div>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"top",gap:16,padding:"0 16px"}}>
        <button onClick={handleSpeak} style={{
          background:"rgba(255,255,255,0.72)",border:"none",borderRadius:18,
          padding:"13px 30px",fontWeight:900,fontSize:"1.05rem",color:"#4a2a7a",cursor:"pointer",
          paddingTop:"10px",marginTop:10,
          boxShadow:"0 5px 0 rgba(180,150,220,0.5),0 8px 20px rgba(0,0,0,0.08)",
          display:"flex",alignItems:"center",gap:12,textTransform:"uppercase",letterSpacing:"1px",
          minWidth:"min(340px,85vw)",justifyContent:"center",backdropFilter:"blur(6px)",
          animation:isPlaying?"dkt_pulse 0.6s ease infinite":undefined,transition:"transform 0.1s",
        }}>
          <span style={{fontSize:"1.3rem"}}>{isPlaying?"🔊":"▶"}</span>
          <span>Tinglash</span>
        </button>
        <div style={{
          background:boxBg,borderRadius:18,padding:"14px 18px",minWidth:"min(380px,88vw)",minHeight:62,
          display:"flex",alignItems:"center",justifyContent:"center",gap:5,flexWrap:"wrap",backdropFilter:"blur(8px)",
          boxShadow:"inset 0 3px 12px rgba(0,0,0,0.15),0 4px 20px rgba(0,0,0,0.08)",
          animation:phase==="correct"?"dkt_glowGreen 0.5s ease":phase==="wrong"?"dkt_shake 0.4s ease":undefined,
          transition:"background 0.35s",
        }}>
          {renderSlots()}
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,paddingBottom:12,paddingLeft:12,paddingRight:12, paddingTop:"10px"}}>
        {isHardMode ? renderInput() : (
          rows.map((row,ri)=>(
            <div key={ri} style={{display:"flex",gap:7,flexWrap:"wrap",justifyContent:"center"}}>
              {row.map((tile,ti)=>(
                <button key={tile.id} onClick={()=>selectTile(tile.id)} disabled={tile.used||checked}
                  style={{
                    width:"clamp(42px,9.5vw,54px)",height:"clamp(42px,9.5vw,54px)",
                    background:tile.used?"rgba(220,210,240,0.3)":"rgba(255,255,255,0.82)",
                    border:"none",borderRadius:13,fontFamily:"'Baloo 2',cursive",fontWeight:800,
                    fontSize:"clamp(0.9rem,2.2vw,1.3rem)",color:tile.used?"rgba(100,80,140,0.3)":"#3a2060",
                    cursor:tile.used?"default":"pointer",
                    boxShadow:tile.used?"0 2px 0 rgba(180,150,220,0.2)":"0 4px 0 rgba(180,150,220,0.7),0 6px 12px rgba(0,0,0,0.08)",
                    transition:"transform 0.1s,box-shadow 0.1s",
                    animation:`dkt_tileIn 0.22s ease ${(ri*row.length+ti)*28}ms both`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                  }}>{tile.letter}</button>
              ))}
            </div>
          ))
        )}
        <div style={{display:"flex",gap:12,alignItems:"center",marginTop:4}}>
          <button onClick={checkAnswer} style={{
            background:checked?(phase==="correct"?"#78dd78":phase==="wrong"?"#e07272":"rgba(255,255,255,0.7)"):"#78dd78",
            border:"none",borderRadius:18,padding:"12px 34px",
            fontFamily:"'Nunito',sans-serif",fontWeight:900,fontSize:"1rem",
            color:checked&&phase==="wrong"?"white":"#1a3818",cursor:"pointer",
            textTransform:"uppercase",letterSpacing:"1px",
            boxShadow:checked?(phase==="wrong"?"0 5px 0 #b04040":"0 5px 0 #50aa50"):"0 5px 0 #50aa50,0 8px 16px rgba(0,0,0,0.1)",
            transition:"background 0.3s,transform 0.1s",
          }}
          onMouseDown={e=>{e.currentTarget.style.transform="translateY(3px)";}}
          onMouseUp={e=>{e.currentTarget.style.transform="";}}
          >{checked?(isLastLevel?"🏁 Yakunlash":"→ Keyingi"):"✔ Tekshirish"}</button>
          <button onClick={deleteLast} disabled={checked||(isHardMode ? typedText.length===0 : selected.length===0)} style={{
            background:"#f4b0c0",border:"none",borderRadius:14,width:50,height:48,fontSize:"1.35rem",
            cursor:checked||(isHardMode ? typedText.length===0 : selected.length===0)?"default":"pointer",
            opacity:checked||(isHardMode ? typedText.length===0 : selected.length===0)?0.45:1,boxShadow:"0 4px 0 #c47890",
            display:"flex",alignItems:"center",justifyContent:"center",transition:"transform 0.1s",
          }}>⌫</button>
        </div>
      </div>
      {feedback&&(
        <div style={{
          position:"fixed",top:"42%",left:"50%",transform:"translate(-50%,-50%)",
          background:feedback.ok?"rgba(40,150,40,0.95)":"rgba(200,50,50,0.95)",
          color:"white",borderRadius:20,padding:"13px 26px",fontWeight:900,fontSize:"1.05rem",
          boxShadow:"0 10px 40px rgba(0,0,0,0.22)",backdropFilter:"blur(8px)",
          zIndex:100,animation:"dkt_bounceIn 0.3s ease",maxWidth:"80vw",textAlign:"center",
        }}>{feedback.msg}</div>
      )}
      {stars.map(s=>(
        <div key={s.id} style={{
          position:"fixed",left:s.x+"vw",top:"55vh",fontSize:"1.9rem",pointerEvents:"none",zIndex:200,
          animation:`dkt_starUp 1s ease ${s.delay}ms both`,
        }}>{s.emoji}</div>
      ))}
    </div>
  );
}

function ResultScreen({ difficulty, progress, onBack, onMenu }) {
  const sc   = progress[difficulty].score;
  const done = progress[difficulty].completed.length;
  const pct  = sc / TOTAL_LEVELS;
  const cfg  = DIFF_CFG[difficulty];
  const emoji = pct>=0.9?"🏆":pct>=0.7?"🎉":pct>=0.5?"😊":"💪";
  const title = pct>=0.9?"Zo'r! Ajoyib!":pct>=0.7?"Barakalla!":pct>=0.5?"Yaxshi!":"Harakat qiling!";
  const starsText = pct>=0.9?"⭐⭐⭐":pct>=0.6?"⭐⭐":"⭐";
  return (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center gap-4"
      style={{animation:"dkt_bounceIn 0.5s ease"}}>
      <div style={{fontSize:"4.5rem",filter:"drop-shadow(0 6px 12px rgba(0,0,0,0.12))",animation:"dkt_pop 0.5s ease"}}>{emoji}</div>
      <h2 style={{fontFamily:"'Baloo 2',cursive",fontSize:"clamp(2rem,6vw,2.8rem)",fontWeight:800,color:"#5a3a6a",textShadow:"0 3px 0 rgba(255,255,255,0.6)"}}>{title}</h2>
      <div style={{fontSize:"2.2rem"}}>{starsText}</div>
      <div style={{
        background:"rgba(255,255,255,0.72)",borderRadius:18,padding:"14px 26px",fontWeight:800,fontSize:"1.1rem",
        color:"#5a3a7a",backdropFilter:"blur(6px)",boxShadow:"0 4px 20px rgba(0,0,0,0.08)",
      }}>
        <div>⭐ {sc} ball</div>
        <div style={{fontSize:"0.85rem",opacity:0.75,marginTop:4}}>{done} ta daraja bajarildi · {Math.round(pct*100)}% to'g'ri</div>
        <div style={{marginTop:8}}>
          <span style={{background:cfg.bg,color:cfg.text,borderRadius:20,padding:"2px 12px",fontSize:"0.8rem",fontWeight:800}}>{cfg.label}</span>
        </div>
      </div>
      <button onClick={onBack} style={{
        background:"#b8f0b0",border:"none",borderRadius:18,width:"min(280px,78vw)",padding:"14px 28px",
        fontFamily:"'Nunito',sans-serif",fontWeight:900,fontSize:"1.05rem",color:"#1a4a18",cursor:"pointer",
        textTransform:"uppercase",letterSpacing:"1px",boxShadow:"0 5px 0 #72c070,0 8px 16px rgba(0,0,0,0.1)",transition:"transform 0.1s",
      }}>🎯 Boshqa daraja tanlash</button>
      <button onClick={onMenu} style={{
        background:"rgba(255,255,255,0.65)",border:"none",borderRadius:16,padding:"11px 30px",
        fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:"0.95rem",color:"#5a3a7a",cursor:"pointer",
        boxShadow:"0 4px 0 rgba(0,0,0,0.08)",
      }}>🏠 Bosh sahifa</button>
    </div>
  );
}

export default function DiktantGame() {
  const [screen,     setScreen]     = useState("menu");
  const [difficulty, setDifficulty] = useState("easy");
  const [levelIndex, setLevelIndex] = useState(0);
  const [progress,   setProgress]   = useState(()=>{
    const saved = loadProgress();
    if(!saved) return initProgress();
    const p = initProgress();
    ["easy","medium","hard"].forEach(d=>{
      if(saved[d]){
        p[d].completed   = Array.isArray(saved[d].completed)   ? saved[d].completed   : [];
        p[d].correct     = Array.isArray(saved[d].correct)     ? saved[d].correct     : [];
        p[d].score       = saved[d].score       || 0;
        p[d].maxUnlocked = saved[d].maxUnlocked != null ? saved[d].maxUnlocked : 0;
      }
    });
    return p;
  });

  useEffect(()=>{ saveProgress(progress); },[progress]);

  function markLevel(diff, idx, correct) {
    setProgress(prev=>{
      const dp = prev[diff];
      const alreadyDone = dp.completed.includes(idx);
      const newCompleted = alreadyDone ? dp.completed : [...dp.completed, idx];
      const newCorrect   = (correct && !dp.correct?.includes(idx)) ? [...(dp.correct||[]), idx] : (dp.correct||[]);
      const newScore     = alreadyDone ? dp.score : dp.score + (correct ? 1 : 0);
      const newMaxUnlocked = Math.max(dp.maxUnlocked, idx + 1 < TOTAL_LEVELS ? idx + 1 : dp.maxUnlocked);
      return { ...prev, [diff]:{ completed: newCompleted, correct: newCorrect, score: newScore, maxUnlocked: newMaxUnlocked } };
    });
  }

  function handleNextLevel() {
    const next = levelIndex + 1;
    if (next >= TOTAL_LEVELS) { setScreen("result"); }
    else { setLevelIndex(next); }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800;900&family=Nunito:wght@700;800;900&display=swap');
        *,*::before,*::after{box-sizing:border-box;}
      `}</style>
      <PastelBg/>
      {screen==="menu" && <MenuScreen onStart={()=>setScreen("difficulty")}/>}
      {screen==="difficulty" && (
        <DifficultyScreen progress={progress}
          onSelect={d=>{ setDifficulty(d); setScreen("levelSelect"); }}
          onBack={()=>setScreen("menu")}/>
      )}
      {screen==="levelSelect" && (
        <DktLevelSelectScreen
          difficulty={difficulty} progress={progress}
          onSelect={idx=>{ setLevelIndex(idx); setScreen("game"); }}
          onBack={()=>setScreen("difficulty")}
        />
      )}
      {screen==="game" && (
        <DktGameScreen
          key={`${difficulty}-${levelIndex}`}
          difficulty={difficulty} levelIndex={levelIndex}
          isLastLevel={levelIndex>=TOTAL_LEVELS-1}
          onExit={()=> setScreen("levelSelect")}
          onFinish={(ok)=>markLevel(difficulty,levelIndex,ok)}
          onNextLevel={handleNextLevel}
        />
      )}
      {screen==="result" && (
        <ResultScreen difficulty={difficulty} progress={progress}
          onBack={()=>setScreen("levelSelect")} onMenu={()=>setScreen("menu")}/>
      )}
    </>
  );
}
