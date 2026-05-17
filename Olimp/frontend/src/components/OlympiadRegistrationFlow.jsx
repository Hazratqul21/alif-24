import { useState } from 'react';
import { ArrowLeft, MapPin, Building, School, CheckCircle, ChevronRight } from 'lucide-react';
import { REGIONS, REGION_NAMES, getDistricts } from '../utils/regions';

/**
 * OlympiadRegistrationFlow — 4 qadamli ro'yxatdan o'tish
 * Step 1: Viloyat tanlash (14 ta grid)
 * Step 2: Tuman tanlash
 * Step 3: Maktab raqami + Sinf
 * Step 4: Tasdiqlash
 */
export default function OlympiadRegistrationFlow({ olympiad, onRegister, onClose }) {
    const [step, setStep] = useState(1);
    const [region, setRegion] = useState('');
    const [district, setDistrict] = useState('');
    const [schoolNumber, setSchoolNumber] = useState('');
    const [classNumber, setClassNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleRegionSelect = (r) => {
        setRegion(r);
        setDistrict('');
        setStep(2);
    };

    const handleDistrictSelect = (d) => {
        setDistrict(d);
        setStep(3);
    };

    const handleSchoolSubmit = () => {
        if (!schoolNumber || schoolNumber < 1 || schoolNumber > 9999) {
            setError("Maktab raqamini to'g'ri kiriting (1-9999)");
            return;
        }
        if (!classNumber) {
            setError("Sinfni tanlang");
            return;
        }
        setError('');
        setStep(4);
    };

    const handleConfirm = async () => {
        setLoading(true);
        setError('');
        try {
            await onRegister({
                region,
                district,
                school_number: parseInt(schoolNumber),
                class_number: parseInt(classNumber),
            });
        } catch (err) {
            setError(err.message || "Ro'yxatdan o'tishda xatolik");
        } finally {
            setLoading(false);
        }
    };

    // Allowed classes from olympiad or default 1-11
    const allowedClasses = olympiad?.allowed_classes?.length
        ? olympiad.allowed_classes
        : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl border border-white/10 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        {step > 1 && (
                            <button
                                onClick={() => { setStep(step - 1); setError(''); }}
                                className="p-2 hover:bg-white/10 rounded-xl transition"
                            >
                                <ArrowLeft className="w-5 h-5 text-indigo-400" />
                            </button>
                        )}
                        <div>
                            <h2 className="text-xl font-bold text-white">Olimpiadaga yozilish</h2>
                            <p className="text-sm text-white/50">
                                {step === 1 && "Viloyatingizni tanlang"}
                                {step === 2 && `${region} — Tumaningizni tanlang`}
                                {step === 3 && "Maktab va sinf"}
                                {step === 4 && "Ma'lumotlarni tasdiqlang"}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white/40 hover:text-white transition text-2xl">&times;</button>
                </div>

                {/* Progress */}
                <div className="flex items-center gap-2 px-6 py-3 bg-white/5">
                    {[1, 2, 3, 4].map(s => (
                        <div key={s} className="flex items-center gap-2 flex-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                                s < step ? 'bg-emerald-500 text-white' :
                                s === step ? 'bg-indigo-500 text-white ring-2 ring-indigo-400/50' :
                                'bg-white/10 text-white/30'
                            }`}>
                                {s < step ? '✓' : s}
                            </div>
                            {s < 4 && <div className={`flex-1 h-0.5 ${s < step ? 'bg-emerald-500' : 'bg-white/10'}`} />}
                        </div>
                    ))}
                </div>

                {/* Content */}
                <div className="p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl text-sm">
                            {error}
                        </div>
                    )}

                    {/* STEP 1: Viloyat */}
                    {step === 1 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {REGION_NAMES.map(r => (
                                <button
                                    key={r}
                                    onClick={() => handleRegionSelect(r)}
                                    className="flex items-center gap-2 p-3 bg-white/5 hover:bg-indigo-600/30 border border-white/10 hover:border-indigo-500/50 rounded-xl transition-all text-left group"
                                >
                                    <MapPin className="w-4 h-4 text-indigo-400 group-hover:text-indigo-300 flex-shrink-0" />
                                    <span className="text-sm text-white/80 group-hover:text-white leading-tight">{r}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* STEP 2: Tuman */}
                    {step === 2 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {getDistricts(region).map(d => (
                                <button
                                    key={d}
                                    onClick={() => handleDistrictSelect(d)}
                                    className="flex items-center gap-2 p-3 bg-white/5 hover:bg-indigo-600/30 border border-white/10 hover:border-indigo-500/50 rounded-xl transition-all text-left group"
                                >
                                    <Building className="w-4 h-4 text-emerald-400 group-hover:text-emerald-300 flex-shrink-0" />
                                    <span className="text-sm text-white/80 group-hover:text-white">{d}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* STEP 3: Maktab + Sinf */}
                    {step === 3 && (
                        <div className="flex flex-col items-center gap-8 py-6">
                            <div className="text-center">
                                <School className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
                                <h3 className="text-lg font-bold text-white">Maktab raqamingiz</h3>
                                <p className="text-white/50 text-sm">{region}, {district}</p>
                            </div>

                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    min={1}
                                    max={9999}
                                    value={schoolNumber}
                                    onChange={e => setSchoolNumber(e.target.value)}
                                    placeholder="1"
                                    className="w-32 text-center text-4xl font-bold bg-slate-900/50 border-2 border-indigo-500/50 rounded-2xl px-4 py-4 text-white focus:outline-none focus:border-indigo-400 transition [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <span className="text-2xl font-bold text-white/50">- maktab</span>
                            </div>

                            <div className="w-full max-w-md">
                                <label className="text-sm font-medium text-white/70 mb-2 block">Sinf tanlang:</label>
                                <div className="grid grid-cols-6 gap-2">
                                    {allowedClasses.map(c => (
                                        <button
                                            key={c}
                                            onClick={() => setClassNumber(String(c))}
                                            className={`p-3 rounded-xl text-center font-bold transition-all ${
                                                classNumber === String(c)
                                                    ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                                                    : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
                                            }`}
                                        >
                                            {c}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={handleSchoolSubmit}
                                disabled={!schoolNumber || !classNumber}
                                className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Davom etish <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    {/* STEP 4: Tasdiqlash */}
                    {step === 4 && (
                        <div className="flex flex-col items-center gap-6 py-6">
                            <CheckCircle className="w-16 h-16 text-emerald-400" />
                            <h3 className="text-xl font-bold text-white">Ma'lumotlarni tasdiqlang</h3>

                            <div className="w-full max-w-sm space-y-3">
                                {[
                                    { label: "Viloyat", value: region },
                                    { label: "Tuman", value: district },
                                    { label: "Maktab", value: `${schoolNumber}-maktab` },
                                    { label: "Sinf", value: `${classNumber}-sinf` },
                                ].map(({ label, value }) => (
                                    <div key={label} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/10">
                                        <span className="text-white/50 text-sm">{label}</span>
                                        <span className="text-white font-medium">{value}</span>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={handleConfirm}
                                disabled={loading}
                                className="flex items-center gap-2 px-10 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-lg transition disabled:opacity-50"
                            >
                                {loading ? "Yuklanmoqda..." : "✅ Tasdiqlash va yozilish"}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
