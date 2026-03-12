import { useState, useEffect, useRef } from "react";
import Navbar from '../components/Common/Navbar';


/* ── tiny helpers ── */
const useInView = (threshold = 0.15) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
};

const Reveal = ({ children, delay = 0, className = "" }) => {
  const [ref, visible] = useInView();
  return (
    <div ref={ref} className={className}
      style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(32px)", transition: `opacity .7s ${delay}s ease, transform .7s ${delay}s ease` }}>
      {children}
    </div>
  );
};

/* ── data ── */
const FEATURES = [
  { icon: "🔤", title: "Harflarni o'rganish (4–7 yosh)", desc: "Matnni nutqqa aylantirish orqali har bir harf tanishtiriladi. Bola shu harf bilan boshlanadigan so'zlarni ovoz bilan aytib bilimini mustahkamlaydi.", tag: "TTS · STT", accent: "from-rose-400 to-orange-400" },
  { icon: "📖", title: "Rasm orqali o'qish", desc: "Bola o'qishni istagan kitobning rasmini oladi yoki faylni yuklaydi — platforma uni bolalar ovozida o'qib beradi va savol beradi.", tag: "OCR · AI", accent: "from-sky-400 to-violet-400" },
  { icon: "🎙️", title: "Ovozli javob va AI tahlil", desc: "Bola qahramonlar haqida fikrlarini mikrofon orqali aytadi. AI bolaning fikrlashini, nutq tezligini va to'liqligini baholaydi.", tag: "LLM Baholash", accent: "from-emerald-400 to-teal-400" },
  { icon: "📚", title: "Kunlik o'qish dasturi", desc: "Boshlang'ich sinf o'quvchilariga har kuni yangi ertak va hikoyalar. Bola ovoz chiqarib o'qiydi, platforma o'qish sifatini kuzatadi.", tag: "Reyting", accent: "from-amber-400 to-yellow-300" },
  { icon: "🧮", title: "Matematika uy vazifasi", desc: "Bola masalani suratga olib yuklaydi. Platforma bosqichma-bosqich yechishni o'rgatadi va tushuntiradi.", tag: "AI Yechim", accent: "from-violet-400 to-pink-400" },
  { icon: "🏢", title: "O'quv markazlari CRM", desc: "O'quv markazlari uchun maxsus CRM: o'quvchilar bazasi, darslar jadvali, to'lovlar va o'quv natijalari boshqaruvi.", tag: "CRM", accent: "from-orange-400 to-amber-300" },
];

const STEPS = [
  { n: "1", title: "Yuklash", desc: "Kitob sahifasini suratga ol yoki fayl yuklang", emoji: "📷", color: "from-rose-500 to-orange-500" },
  { n: "2", title: "AI o'qiydi", desc: "Platforma matnni bolalar ovozida o'qib beradi", emoji: "🔊", color: "from-sky-500 to-blue-600" },
  { n: "3", title: "Savol-javob", desc: "Bola mikrofon orqali tushunganlarini aytadi", emoji: "🎤", color: "from-emerald-500 to-teal-600" },
  { n: "4", title: "Baholash", desc: "Fikrlash, tushunish va nutq darajasi tahlil qilinadi", emoji: "🧠", color: "from-violet-500 to-purple-600" },
  { n: "5", title: "Sovg'a!", desc: "Bola coin yig'ib real sovg'alar oladi", emoji: "🎁", color: "from-amber-500 to-yellow-400" },
];

const AUDIENCE = [
  { icon: "👶", title: "Kichik bolalar", sub: "4–7 yosh", desc: "Harflarni o'rganish, so'zlarni tanish va birinchi o'qish ko'nikmalarini rivojlantirish." },
  { icon: "📗", title: "Boshlang'ich sinf", sub: "1–4 sinf", desc: "Kunlik o'qish, ertaklar, musoboqalar va matematika uy vazifalarida yordam." },
  { icon: "👨‍👩‍👧", title: "Ota-onalar", sub: "Nazorat", desc: "Bolaning o'qish tarixi, baholari va rivojlanishi haqida real vaqtda hisobotlar." },
  { icon: "🧑‍🏫", title: "O'qituvchilar", sub: "Panel", desc: "Sinf reytingi, har bir o'quvchining natijasi va individual tavsiyalar." },
  { icon: "🏫", title: "O'quv markazlari", sub: "CRM", desc: "To'liq CRM tizimi: o'quvchilar, guruhlar, to'lovlar va akademik natijalar." },
];

const OLYMPIAD_PRIZES = [
  { place: "🥇", title: "1-o'rin", prize: "Planshet yoki Laptop", coin: "5000 coin", color: "from-yellow-400 to-amber-500", glow: "shadow-yellow-300/50" },
  { place: "🥈", title: "2-o'rin", prize: "Smartfon yoki Soat", coin: "3000 coin", color: "from-slate-300 to-slate-400", glow: "shadow-slate-300/50" },
  { place: "🥉", title: "3-o'rin", prize: "Kitob to'plami & Sumka", coin: "1500 coin", color: "from-orange-400 to-amber-600", glow: "shadow-orange-300/50" },
];

const TECH = [
  { icon: "🗣️", name: "TTS", desc: "Bolalar ovozida matn o'qish" },
  { icon: "🎤", name: "STT", desc: "Bolalar nutqini aniqlash" },
  { icon: "🤖", name: "LLM", desc: "Fikrlashni tahlil qilish" },
  { icon: "📷", name: "OCR", desc: "Rasm matnini o'qish" },
  { icon: "🗃️", name: "Dataset", desc: "O'zbek bolalar ovozi bazasi" },
  { icon: "📊", name: "Analytics", desc: "O'qish tezligi & sifati" },
];

/* ── floating blobs background ── */
const Blobs = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[
      "w-72 h-72 bg-yellow-400/10 top-[5%] left-[3%] animate-[float_9s_ease-in-out_infinite]",
      "w-48 h-48 bg-rose-400/10 top-[12%] right-[6%] animate-[float_7s_ease-in-out_infinite_-3s]",
      "w-36 h-36 bg-emerald-400/10 bottom-[18%] left-[8%] animate-[float_11s_ease-in-out_infinite_-5s]",
      "w-56 h-56 bg-violet-400/10 bottom-[8%] right-[4%] animate-[float_8s_ease-in-out_infinite_-2s]",
      "w-24 h-24 bg-sky-400/10 top-[42%] left-[1%] animate-[float_6s_ease-in-out_infinite_-1s]",
    ].map((cls, i) => (
      <div key={i} className={`absolute rounded-full blur-2xl ${cls}`} />
    ))}
  </div>
);

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
export default function AboutAlif24() {
  const [coinCount, setCoinCount] = useState(0);

  useEffect(() => {
    const target = 2480;
    let cur = 0;
    const step = Math.ceil(target / 60);
    const t = setInterval(() => {
      cur = Math.min(cur + step, target);
      setCoinCount(cur);
      if (cur >= target) clearInterval(t);
    }, 30);
    return () => clearInterval(t);
  }, []);

  return (
 

    <div className="font-sans bg-[#778da9] text-[#1A2B3C] overflow-x-hidden">

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;600;700;800&family=Nunito:wght@400;600;700;800;900&display=swap');
        .font-display { font-family: 'Baloo 2', cursive; }
        .font-body { font-family: 'Nunito', sans-serif; }
        @keyframes float { 0%,100%{transform:translateY(0) rotate(0)} 50%{transform:translateY(-20px) rotate(5deg)} }
        @keyframes fadeDown { from{opacity:0;transform:translateY(-24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin-slow { to{transform:rotate(360deg)} }
        @keyframes coinBob { 0%,100%{transform:rotateY(0deg) scale(1)} 50%{transform:rotateY(18deg) scale(1.05)} }
        @keyframes pulseDot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.3)} }
        @keyframes shimmer { from{background-position:-200% center} to{background-position:200% center} }
        .anim-fadeDown { animation: fadeDown .8s ease both; }
        .anim-fadeDown-2 { animation: fadeDown .8s .15s ease both; }
        .anim-fadeDown-3 { animation: fadeDown .8s .3s ease both; }
        .anim-fadeDown-4 { animation: fadeDown .8s .45s ease both; }
        .coin-bob { animation: coinBob 3.5s ease-in-out infinite; }
        .spin-slow { animation: spin-slow 10s linear infinite; }
        .shimmer-text {
          background: linear-gradient(90deg, #FFD43B, #FF922B, #FFD43B);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 3s linear infinite;
        }
      `}</style>

          {/* Navbar */}
      <Navbar />

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 py-8 bg-gradient-to-br from-[#0D1B2A] via-[#1a3a5c] to-[#0f2d4a]">
        <Blobs />

        {/* star grid overlay */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

        <div className="relative z-10 max-w-3xl mx-auto">
 

          <h1 className="font-display font-extrabold text-white leading-[1.08] mb-6 anim-fadeDown-2"
            style={{ fontSize: "clamp(2.6rem,7vw,5.2rem)" }}>
            Bolalar uchun<br />
            <span className="shimmer-text">aqlli o'qish</span><br />
            platformasi
          </h1>

          <p className="font-body text-white/65 mb-10 leading-relaxed anim-fadeDown-3"
            style={{ fontSize: "clamp(1rem,2vw,1.2rem)" }}>
            Alif24 — harflarni o'rganishdan mustaqil o'qishgacha,<br />
            sun'iy intellekt yordamida har bir bolaga shaxsiy ta'lim yo'li.
          </p>

          <div className="flex flex-wrap justify-center gap-3 anim-fadeDown-4">
            {[
              ["4–12", "Yosh oralig'i"],
              ["3 Til", "UZ · RU · EN"],
              ["AI", "Asoslangan baho"],
              ["🏆", "Coin & Sovg'alar"],
              ["🏅", "Olimpiadalar"],
            ].map(([num, lbl]) => (
              <div key={lbl} className="bg-white/6 border border-white/12 backdrop-blur-md rounded-full px-5 py-3 text-center">
                <div className="font-display font-extrabold text-yellow-300 text-xl leading-none">{num}</div>
                <div className="font-body text-white/55 text-[11px] mt-1 tracking-wide">{lbl}</div>
              </div>
            ))}
          </div>
        </div>

      </section>

      {/* ── MISSION ── */}
      <section className="py-24 px-6 bg-[#f0ead2]">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          {/* visual */}
          <Reveal className="flex justify-center">
            <div className="relative w-64 h-80 flex flex-col justify-end gap-2 items-center">
              {[
                ["#FF6B6B", "#ee5a24", "w-72"],
                ["#4DABF7", "#228be6", "w-64"],
                ["#51CF66", "#2f9e44", "w-56"],
                ["#FFD43B", "#f59f00", "w-48"],
                ["#845EF7", "#7048e8", "w-60"],
              ].map(([a, b, w], i) => (
                <div key={i} className={`${w} h-11 rounded-lg relative shadow-lg`}
                  style={{ background: `linear-gradient(135deg,${a},${b})`, animation: `float ${4 + i * 0.4}s ease-in-out infinite`, animationDelay: `${-i * 0.8}s` }}>
                  <div className="absolute left-0 top-0 bottom-0 w-4 rounded-l-lg bg-black/15" />
                </div>
              ))}
              {["⭐", "🌟", "✨"].map((s, i) => (
                <div key={i} className="absolute text-2xl"
                  style={{ top: `${[10, 20, 55][i]}%`, left: `${[5, 85, 0][i]}%`, animation: `float ${[7, 9, 5][i]}s ease-in-out infinite`, animationDelay: `${[-2, 0, -1][i]}s` }}>{s}</div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <span className="inline-block bg-yellow-100 text-yellow-700 text-xs font-extrabold tracking-widest uppercase px-4 py-1.5 rounded-full mb-3 font-body">🎯 Bizning maqsadimiz</span>
            <h2 className="font-display font-extrabold text-4xl leading-tight mb-4">Har bir bola<br />kitob sevsin</h2>
            <p className="font-body text-slate-500 leading-relaxed mb-8">
              Biz O'zbekistonning har bir bolasini o'qishga qiziqtirishni, raqamli texnologiyalar va sun'iy intellekt yordamida bilimga muhabbat uyg'otishni maqsad qilamiz. Alif24 — bu nafaqat platforma, bu bolaning kelajagi.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[["🧠","Sun'iy intellekt"],["🎮","Qiziqarli o'yin"],["📊","Ota-ona nazorati"],["🧑‍🏫","O'qituvchi panel"],["🎁","Real sovg'alar"],["🌍","Ko'p tillik"]].map(([ic, lbl]) => (
                <div key={lbl} className="flex items-center gap-2.5 bg-white rounded-2xl px-4 py-3.5 font-body font-bold text-sm shadow-sm border border-slate-100 hover:-translate-y-1 transition-transform cursor-default">
                  <span className="text-xl">{ic}</span>{lbl}
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-24 px-6 bg-blue-50/60">
        <div className="max-w-6xl mx-auto">
          <Reveal className="mb-14">
            <span className="inline-block bg-blue-100 text-blue-700 text-xs font-extrabold tracking-widest uppercase px-4 py-1.5 rounded-full mb-3 font-body">⚡ Imkoniyatlar</span>
            <h2 className="font-display font-extrabold text-4xl mb-3">Platformaning kuchlari</h2>
            <p className="font-body text-slate-500 max-w-xl">Har bir xususiyat bolaning rivojlanishini inobatga olib ishlab chiqilgan.</p>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <Reveal key={i} delay={i * 0.07}>
                <div className="bg-white rounded-3xl p-7 shadow-sm border border-slate-100/80 hover:-translate-y-2 hover:shadow-xl transition-all duration-300 h-full flex flex-col group">
                  <div className={`h-1 w-full rounded-full bg-gradient-to-r ${f.accent} mb-6 -mt-7 mx-auto opacity-0 group-hover:opacity-100 transition-opacity`} style={{marginTop:"-1.75rem",marginLeft:"-1.75rem",width:"calc(100% + 3.5rem)",borderRadius:"1.5rem 1.5rem 0 0"}} />
                  <div className="text-4xl mb-4">{f.icon}</div>
                  <h3 className="font-display font-bold text-lg mb-2">{f.title}</h3>
                  <p className="font-body text-slate-500 text-sm leading-relaxed flex-1">{f.desc}</p>
                  <span className="mt-4 inline-block bg-slate-100 text-slate-500 text-[11px] font-bold tracking-wider uppercase px-3 py-1 rounded-full font-body">{f.tag}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-24 px-6 bg-[#FFFDF7]">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-16">
            <span className="inline-block bg-violet-100 text-violet-700 text-xs font-extrabold tracking-widest uppercase px-4 py-1.5 rounded-full mb-3 font-body">🚀 Qanday ishlaydi</span>
            <h2 className="font-display font-extrabold text-4xl">5 ta oddiy qadam</h2>
          </Reveal>
          <div className="relative">
            <div className="hidden md:block absolute top-11 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-rose-400 via-violet-400 to-emerald-400 opacity-40" />
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              {STEPS.map((s, i) => (
                <Reveal key={i} delay={i * 0.1} className="text-center">
                  <div className={`w-20 h-20 mx-auto rounded-full bg-gradient-to-br ${s.color} flex items-center justify-center font-display font-extrabold text-white text-2xl shadow-xl mb-4 hover:scale-110 transition-transform cursor-default relative z-10`}>
                    {s.n}
                  </div>
                  <div className="text-2xl mb-2">{s.emoji}</div>
                  <h4 className="font-display font-bold text-sm mb-1">{s.title}</h4>
                  <p className="font-body text-slate-500 text-xs leading-snug">{s.desc}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── OLYMPIAD ── */}
      <section className="py-24 px-6 relative overflow-hidden" style={{ background: "linear-gradient(135deg,#0d1117 0%,#1a1a2e 50%,#16213e 100%)" }}>
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-yellow-400/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-violet-400/8 rounded-full blur-3xl" />

        <div className="max-w-6xl mx-auto relative z-10">
          <Reveal className="text-center mb-16">
            <span className="inline-block bg-yellow-400/15 border border-yellow-400/30 text-yellow-300 text-xs font-extrabold tracking-widest uppercase px-4 py-1.5 rounded-full mb-4 font-body">🏅 Olimpiadalar</span>
            <h2 className="font-display font-extrabold text-white leading-tight mb-4" style={{ fontSize: "clamp(2rem,4.5vw,3.2rem)" }}>
              Oylik olimpiadalar —<br /><span className="shimmer-text">qimmatbaho sovg'alar!</span>
            </h2>
            <p className="font-body text-white/55 max-w-xl mx-auto leading-relaxed">
              Har oy o'qilgan hikoya va ertaklardan tuzilgan savollar bo'yicha bolalar o'rtasida musoboqa o'tkaziladi. G'oliblar real qimmatbaho sovg'alar bilan taqvirlanadi!
            </p>
          </Reveal>

          {/* Podium */}
          <div className="flex flex-col md:flex-row justify-center items-end gap-5 mb-14">
            {[OLYMPIAD_PRIZES[1], OLYMPIAD_PRIZES[0], OLYMPIAD_PRIZES[2]].map((p, i) => {
              const heights = ["h-44", "h-56", "h-36"];
              const scales = ["", "md:-translate-y-4", ""];
              return (
                <Reveal key={i} delay={i * 0.12} className={`w-full md:w-64 ${scales[i]}`}>
                  <div className={`bg-white/5 border border-white/10 rounded-3xl p-6 text-center hover:bg-white/8 hover:border-white/20 transition-all hover:-translate-y-2 cursor-default shadow-2xl ${p.glow}`}>
                    <div className="text-5xl mb-3">{p.place}</div>
                    <div className={`font-display font-extrabold text-transparent bg-gradient-to-r ${p.color} bg-clip-text text-xl mb-2`}>{p.title}</div>
                    <div className="font-display font-bold text-white text-lg mb-1">{p.prize}</div>
                    <div className="font-body text-yellow-400/80 text-sm font-bold">+{p.coin}</div>
                  </div>
                </Reveal>
              );
            })}
          </div>

          {/* Olympiad details */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: "📅", title: "Har oy", desc: "Muntazam  musoboqalar" },
              { icon: "📝", title: "Savol formati", desc: "O'qilgan ertak va hikoyalardan testlar" },
              { icon: "🎤", title: "Audio o'qish", desc: "Musoboqa jarayonida ovoz yozib olinadi" },
              { icon: "📊", title: "Reyting", desc: "Umumiy va mintaqaviy reytinglar" },
            ].map((item, i) => (
              <Reveal key={i} delay={i * 0.08}>
                <div className="bg-white/4 border border-white/8 rounded-2xl p-5 hover:bg-white/7 transition-colors">
                  <div className="text-3xl mb-3">{item.icon}</div>
                  <h4 className="font-display font-bold text-white text-sm mb-1">{item.title}</h4>
                  <p className="font-body text-white/45 text-xs leading-relaxed">{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── AUDIENCE ── */}
      <section className="py-24 px-6 bg-[#778da9]">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-14">
            <span className="inline-block bg-sky-400/15 border border-sky-400/30 text-sky-300 text-xs font-extrabold tracking-widest uppercase px-4 py-1.5 rounded-full mb-3 font-body">👥 Kim uchun</span>
            <h2 className="font-display font-extrabold text-white text-4xl mb-3">Platforma hammaga</h2>
            <p className="font-body text-white/50 max-w-lg mx-auto">Boladan to o'qituvchi va o'quv markazigacha — hamma uchun!</p>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {AUDIENCE.map((a, i) => (
              <Reveal key={i} delay={i * 0.08}>
                <div className="bg-white/4 border border-white/8 rounded-3xl p-6 text-center hover:bg-white/8 hover:border-white/18 hover:-translate-y-2 transition-all duration-300 cursor-default">
                  <div className="text-4xl mb-3">{a.icon}</div>
                  <h3 className="font-display font-bold text-white text-sm mb-0.5">{a.title}</h3>
                  <div className="font-body text-sky-400 text-xs font-bold mb-3">{a.sub}</div>
                  <p className="font-body text-white/45 text-xs leading-relaxed">{a.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── TECH ── */}
      <section className="py-24 px-6 bg-emerald-50/40">
        <div className="max-w-5xl mx-auto">
          <Reveal className="mb-14">
            <span className="inline-block bg-emerald-100 text-emerald-700 text-xs font-extrabold tracking-widest uppercase px-4 py-1.5 rounded-full mb-3 font-body">🔬 Texnologiyalar</span>
            <h2 className="font-display font-extrabold text-4xl mb-3">AI quvvati bilan</h2>
            <p className="font-body text-slate-500 max-w-lg">Platforma ilg'or sun'iy intellekt texnologiyalari asosida qurilgan — va o'zbek bolalar ovozi dataseti yaratilmoqda.</p>
          </Reveal>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {TECH.map((t, i) => (
              <Reveal key={i} delay={i * 0.07}>
                <div className="bg-white rounded-2xl p-5 text-center shadow-sm border border-slate-100 hover:-translate-y-2 hover:shadow-md transition-all cursor-default">
                  <div className="text-3xl mb-2.5">{t.icon}</div>
                  <div className="font-display font-extrabold text-sm text-slate-800">{t.name}</div>
                  <div className="font-body text-slate-400 text-[11px] mt-1 leading-snug">{t.desc}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── REWARD ── */}
      <section className="py-24 px-6" style={{ background: "linear-gradient(135deg,#fff9db,#fff3e0)" }}>
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          {/* coin animation */}
          <Reveal className="flex justify-center">
            <div className="relative w-72 h-72 flex items-center justify-center">
              {/* orbit ring */}
              <div className="absolute w-64 h-64 border-2 border-dashed border-amber-400/30 rounded-full spin-slow" />
              {/* orbit dots */}
              {["🎁", "⭐", "📚", "🏆"].map((em, i) => {
                const angle = i * 90;
                const rad = angle * (Math.PI / 180);
                const x = 50 + 44 * Math.cos(rad);
                const y = 50 + 44 * Math.sin(rad);
                return (
                  <div key={i} className="absolute w-10 h-10 bg-gradient-to-br from-rose-400 to-orange-400 rounded-full flex items-center justify-center text-lg shadow-lg"
                    style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)" }}>{em}</div>
                );
              })}
              {/* big coin */}
              <div className="relative z-10 w-36 h-36 rounded-full flex items-center justify-center text-6xl coin-bob"
                style={{ background: "linear-gradient(135deg,#FFD43B,#FFA94D,#FFD43B)", boxShadow: "0 12px 40px rgba(255,169,77,0.5), inset 0 -6px 12px rgba(0,0,0,0.1)" }}>
                🪙
              </div>
              {/* counter */}
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white rounded-full px-5 py-2 shadow-lg border border-amber-100">
                <span className="font-display font-extrabold text-amber-500 text-xl">{coinCount.toLocaleString()}</span>
                <span className="font-body text-amber-400 text-sm ml-1">coin</span>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <span className="inline-block bg-orange-100 text-orange-600 text-xs font-extrabold tracking-widest uppercase px-4 py-1.5 rounded-full mb-3 font-body">🎁 Mukofot tizimi</span>
            <h2 className="font-display font-extrabold text-3xl leading-tight mb-3">O'qib coin yig', <br />real sovg'a ol!</h2>
            <p className="font-body text-slate-500 leading-relaxed mb-6">Bola platformada faol bo'lgan sari coin yig'ib boradi. Ma'lum miqdorga yetganda haqiqiy sovg'alarga almashtiriladi!</p>
            <ul className="space-y-3">
              {[
                ["🔤", "O'rgangan harf bilan so'z aytganda coin"],
                ["📖", "Ertak yoki hikoya o'qiganda coin"],
                ["✅", "Savollarga to'g'ri javob berganda bonus"],
                ["🏅", "Oylik olimpiadada g'olib — qimmatbaho sovg'a!"],
                ["📈", "Sinfdoshlar orasida reyting kurashi"],
              ].map(([ic, txt], i) => (
                <li key={i} className="flex items-start gap-3 font-body text-slate-600 text-sm border-b border-slate-200/60 pb-3 last:border-0">
                  <span className="text-lg flex-shrink-0 mt-0.5">{ic}</span>{txt}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ── LANGUAGES ── */}
      <section className="py-24 px-6 bg-violet-50/50">
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>
            <span className="inline-block bg-violet-100 text-violet-700 text-xs font-extrabold tracking-widest uppercase px-4 py-1.5 rounded-full mb-3 font-body">🌐 Tillar</span>
            <h2 className="font-display font-extrabold text-4xl mb-3">Uch tilda ishlaydi</h2>
            <p className="font-body text-slate-500 mb-12">Platforma O'zbek, Rus va Ingliz tillarida to'liq ishlaydi.</p>
          </Reveal>
          <div className="flex flex-wrap justify-center gap-6">
            {[["🇺🇿","O'zbek","Asosiy til"],["🇷🇺","Русский","Qo'shimcha til"],["🇬🇧","English","Xalqaro"]].map(([flag, name, sub]) => (
              <Reveal key={name}>
                <div className="w-48 bg-white rounded-3xl p-8 text-center shadow-md border border-slate-100 hover:-translate-y-3 hover:shadow-xl transition-all duration-300 cursor-default">
                  <div className="text-5xl mb-3">{flag}</div>
                  <div className="font-display font-extrabold text-xl text-slate-800">{name}</div>
                  <div className="font-body text-slate-400 text-sm mt-1">{sub}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-28 px-6 relative overflow-hidden text-center"
        style={{ background: "linear-gradient(135deg,#1a0533 0%,#0d1b2a 50%,#1a3a5c 100%)" }}>
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "36px 36px" }} />
        <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl -translate-y-1/2" />
        <div className="absolute top-1/2 right-1/4 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl -translate-y-1/2" />

        <div className="relative z-10 max-w-2xl mx-auto">
          <Reveal>
            <div className="text-6xl mb-6">🚀</div>
            <h2 className="font-display font-extrabold text-white mb-4" style={{ fontSize: "clamp(1.8rem,4vw,3rem)" }}>
              Farzandingiz bugun boshlaydi
            </h2>
            <p className="font-body text-white/55 text-lg mb-10 leading-relaxed">
              Minglab bolalar allaqachon Alif24 bilan o'qishni sevib qoldi.<br />Navbat sizniki!
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <button className="font-body font-extrabold text-[#1a0533] px-9 py-4 rounded-full hover:-translate-y-1 hover:shadow-2xl transition-all text-base"
                style={{ background: "linear-gradient(135deg,#FFD43B,#FF922B)", boxShadow: "0 8px 28px rgba(255,169,77,0.4)" }}>
                🚀 Bepul boshlash
              </button>
              <button className="font-body font-bold text-white px-9 py-4 rounded-full border-2 border-white/25 hover:bg-white/8 hover:border-white/50 transition-all text-base">
                📞 Bog'lanish
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#070f18] py-12 px-6 text-center">
        <div className="font-display font-extrabold text-3xl shimmer-text mb-2">Alif24</div>
        <p className="font-body text-white/30 text-sm">© 2024 Alif24.uz — Bolalar uchun aqlli o'qish platformasi</p>
        <p className="font-body text-white/20 text-xs mt-1">O'zbekiston · Россия · English</p>
      </footer>
    </div>
  );
}