import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, School, GraduationCap, CheckCircle, ArrowLeft, ArrowRight, AlertCircle, Building } from 'lucide-react';

const REGIONS = {
  "Toshkent shahri": ["Chilonzor", "Yunusobod", "Mirobod", "Mirzo Ulug'bek", "Yashnobod", "Yakkasaroy", "Uchtepa", "Olmazor", "Shayxontohur", "Sergeli", "Bektemir", "Yangihayot"],
  "Toshkent viloyati": ["Zangiota", "Qibray", "Chinoz", "Bo'stonliq", "Parkent", "O'rtachirchiq", "Yuqorichirchiq", "Quyichirchiq", "Olmaliq", "Angren", "Chirchiq", "Yangiyo'l", "Bekobod"],
  "Andijon": ["Andijon shahar", "Asaka", "Shahrixon", "Xonobod", "Qorasuv", "Marhamat", "Oltinko'l", "Baliqchi", "Bo'ston", "Buloqboshi", "Izboskan", "Qo'rg'ontepa", "Paxtaobod", "Ulug'nor", "Xo'jaobod"],
  "Buxoro": ["Buxoro shahar", "Gijduvon", "Qorako'l", "Kogon", "Olot", "Peshku", "Qorovulbozor", "Romitan", "Shofirkon", "Vobkent", "Jondor"],
  "Farg'ona": ["Farg'ona shahar", "Qo'qon", "Marg'ilon", "Quvasoy", "Oltiariq", "Bag'dod", "Beshariq", "Buvayda", "Dang'ara", "Farg'ona tumani", "Furqat", "Qo'shtepa", "Rishton", "So'x", "Toshloq", "Uchko'prik", "Yozyovon"],
  "Jizzax": ["Jizzax shahar", "Arnasoy", "Baxmal", "Do'stlik", "Forish", "G'allaorol", "Sharof Rashidov", "Mirzacho'l", "Paxtakor", "Yangiobod", "Zafarobod", "Zarbdor", "Zomin"],
  "Namangan": ["Namangan shahar", "Chortoq", "Chust", "Kosonsoy", "Mingbuloq", "Namangan tumani", "Norin", "Pop", "Uychi", "Uchqo'rg'on", "Yangiqo'rg'on", "Davlatobod", "Yangi Namangan"],
  "Navoiy": ["Navoiy shahar", "Zarafshon", "Karmana", "Konimex", "Qiziltepa", "Navbahor", "Nurota", "Tomdi", "Uchquduq", "Xatirchi"],
  "Qashqadaryo": ["Qarshi shahar", "Shahrisabz", "Chiroqchi", "Dehqonobod", "G'uzor", "Kasbi", "Kitob", "Koson", "Mirishkor", "Muborak", "Nishon", "Qamashi", "Yakkabog'", "Ko'kdala"],
  "Qoraqalpog'iston Respublikasi": ["Nukus shahar", "Amudaryo", "Beruniy", "Chimboy", "Ellikqal'a", "Kegeyli", "Mo'ynoq", "Nukus tumani", "Qonliko'l", "Qorauzoq", "Qo'ng'irot", "Shumanay", "Taxtako'pir", "To'rtko'l", "Xo'jayli", "Taxiatosh", "Bo'zatov"],
  "Samarqand": ["Samarqand shahar", "Bulung'ur", "Ishtixon", "Jomboy", "Kattaqo'rg'on", "Narpay", "Nurobod", "Oqdaryo", "Payariq", "Pastdarg'om", "Paxtachi", "Samarqand tumani", "Toyloq", "Urgut", "Qo'shrabot"],
  "Sirdaryo": ["Guliston shahar", "Shirin", "Yangiyer", "Boyovut", "Guliston tumani", "Mirzaobod", "Oqoltin", "Sardoba", "Sayxunobod", "Sirdaryo tumani", "Xavast"],
  "Surxondaryo": ["Termiz shahar", "Angor", "Boysun", "Denov", "Jarqo'rg'on", "Muzrabot", "Oltinsoy", "Qiziriq", "Qumqo'rg'on", "Sariosiyo", "Sherobod", "Sho'rchi", "Termiz tumani", "Uzun", "Bandixon"],
  "Xorazm": ["Urganch shahar", "Xiva", "Bog'ot", "Gurlan", "Qo'shko'pir", "Shovot", "Urganch tumani", "Xazorasp", "Xonqa", "Yangiariq", "Yangibozor", "Tuproqqal'a"]
};

const STEPS = [
  { title: "Viloyat", desc: "Viloyatingizni tanlang", icon: MapPin },
  { title: "Tuman", desc: "Tumaningizni tanlang", icon: Building },
  { title: "Maktab & Sinf", desc: "Maktab va sinfingizni kiriting", icon: School },
  { title: "Tasdiqlash", desc: "Ma'lumotlarni tekshiring", icon: CheckCircle }
];

export default function OlympiadRegistrationFlow({ onSubmit, loading, allowedClasses = [], studentProfile = null }) {
  const [step, setStep] = useState(1);
  const [region, setRegion] = useState("");
  const [district, setDistrict] = useState("");
  const [schoolNumber, setSchoolNumber] = useState("");
  const [classNumber, setClassNumber] = useState("");
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    if (studentProfile) {
      const extractNumber = (val) => {
        if (!val) return "";
        const matches = String(val).match(/\d+/);
        return matches ? matches[0] : "";
      };
      if (studentProfile.school_name && !schoolNumber) {
        setSchoolNumber(extractNumber(studentProfile.school_name));
      }
      if (studentProfile.grade && !classNumber) {
        setClassNumber(extractNumber(studentProfile.grade));
      }
    }
  }, [studentProfile]);

  const handleSelectRegion = (r) => {
    setRegion(r);
    setDistrict("");
    setValidationError("");
    setStep(2);
  };

  const handleSelectDistrict = (d) => {
    setDistrict(d);
    setValidationError("");
    setStep(3);
  };

  const handleNextStep3 = () => {
    if (!schoolNumber) {
      setValidationError("Iltimos, maktab raqamini kiriting");
      return;
    }
    if (Number(schoolNumber) <= 0 || Number(schoolNumber) > 9999) {
      setValidationError("Noto'g'ri maktab raqami");
      return;
    }
    if (!classNumber) {
      setValidationError("Iltimos, sinfingizni tanlang");
      return;
    }
    setValidationError("");
    setStep(4);
  };

  const handleConfirmSubmit = () => {
    onSubmit({
      region,
      district,
      school_number: Number(schoolNumber),
      class_number: Number(classNumber)
    });
  };

  const currentDistricts = region ? REGIONS[region] || [] : [];
  const classesList = allowedClasses.length > 0 ? allowedClasses : Array.from({ length: 11 }, (_, i) => i + 1);

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 space-y-6 text-left">
      {/* Step Indicator */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4 overflow-x-auto gap-4">
        {STEPS.map((st, i) => {
          const num = i + 1;
          const isActive = step === num;
          const isCompleted = step > num;
          return (
            <div key={num} className="flex items-center gap-2 flex-shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                isActive ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/25' :
                isCompleted ? 'bg-emerald-600 text-white' : 'bg-white/10 text-white/40'
              }`}>
                {isCompleted ? "✓" : num}
              </div>
              <div className="text-left hidden md:block">
                <p className={`text-xs font-semibold ${isActive ? 'text-white' : 'text-white/40'}`}>{st.title}</p>
                <p className="text-[10px] text-white/30">{st.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {validationError && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-sm animate-pulse">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Step Contents */}
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-4"
          >
            <h3 className="text-white font-bold text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5 text-indigo-400" /> Viloyatni tanlang
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.keys(REGIONS).map((r) => (
                <button
                  key={r}
                  onClick={() => handleSelectRegion(r)}
                  className={`text-left p-3.5 rounded-xl border font-medium text-sm transition-all ${
                    region === r ? 'bg-indigo-600/10 border-indigo-500 text-white shadow shadow-indigo-500/5' :
                    'bg-white/5 border-white/5 text-white/70 hover:border-white/20 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <p className="truncate">{r}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-4"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <Building className="w-5 h-5 text-indigo-400" /> Tuman / Shaharni tanlang
              </h3>
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1 text-xs text-white/50 hover:text-white transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Viloyatlarga qaytish
              </button>
            </div>
            <div className="bg-indigo-500/10 border border-indigo-500/20 px-3.5 py-2 rounded-xl text-xs text-indigo-300 font-medium max-w-max">
              Viloyat: {region}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1">
              {currentDistricts.map((d) => (
                <button
                  key={d}
                  onClick={() => handleSelectDistrict(d)}
                  className={`text-left p-3.5 rounded-xl border font-medium text-sm transition-all ${
                    district === d ? 'bg-indigo-600/10 border-indigo-500 text-white' :
                    'bg-white/5 border-white/5 text-white/70 hover:border-white/20 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <p className="truncate">{d}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-5"
          >
            <h3 className="text-white font-bold text-lg flex items-center gap-2">
              <School className="w-5 h-5 text-indigo-400" /> Maktab va Sinf ma'lumotlari
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* School Input */}
              <div className="space-y-2">
                <label className="text-xs text-white/60 font-semibold block">Maktab raqami</label>
                <input
                  type="number"
                  min="1"
                  max="9999"
                  placeholder="Masalan: 12"
                  value={schoolNumber}
                  onChange={(e) => {
                    setSchoolNumber(e.target.value);
                    setValidationError("");
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition font-medium"
                />
              </div>

              {/* Class Selector */}
              <div className="space-y-2">
                <label className="text-xs text-white/60 font-semibold block">Sinfingiz</label>
                <select
                  value={classNumber}
                  onChange={(e) => {
                    setClassNumber(e.target.value);
                    setValidationError("");
                  }}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition font-medium cursor-pointer"
                >
                  <option value="" disabled>Sinfni tanlang</option>
                  {classesList.map((c) => (
                    <option key={c} value={c} className="bg-slate-950">{c}-sinf</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl transition"
              >
                <ArrowLeft className="w-4 h-4" /> Orqaga
              </button>
              <button
                type="button"
                onClick={handleNextStep3}
                className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition"
              >
                Keyingi <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-5"
          >
            <h3 className="text-white font-bold text-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400 animate-bounce" /> Ro'yxatdan o'tishni tasdiqlang
            </h3>

            {/* Summary Card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 divide-y divide-white/5 space-y-3">
              <div className="flex justify-between py-1.5 animate-pulse">
                <span className="text-white/50 text-sm">Viloyat:</span>
                <span className="text-white font-bold text-sm">{region}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-white/50 text-sm">Tuman / Shahar:</span>
                <span className="text-white font-bold text-sm">{district}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-white/50 text-sm">Maktab:</span>
                <span className="text-white font-bold text-sm">{schoolNumber}-maktab</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-white/50 text-sm">Sinf:</span>
                <span className="text-white font-bold text-sm">{classNumber}-sinf</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex items-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl transition"
              >
                <ArrowLeft className="w-4 h-4" /> Orqaga
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={loading}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold rounded-xl hover:from-emerald-600 hover:to-green-700 transition shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Yuborilmoqda...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Tasdiqlash & Ro'yxatdan o'tish</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
