/**
 * TestBuilderModal — Qayta ishlatiluvchi test yaratish modal komponenti
 *
 * Props:
 *   olympiadId  {string}  — qaysi olimpiad uchun test yaratilayapti
 *   onSave      {fn}      — ({id, title, questions_count}) yaratilgach chaqiriladi
 *   onClose     {fn}      — modal yopilganda chaqiriladi
 *   adminRole   {string}  — X-Admin-Role header qiymati
 *   adminKey    {string}  — X-Admin-Key header qiymati
 *   apiBase     {string}  — TestAI backend URL (default: localhost:8002)
 *
 * Ishlatilishi:
 *   import TestBuilderModal from 'testai/components/test/TestBuilderModal';
 *   <TestBuilderModal olympiadId={id} onSave={ts => ...} onClose={() => setOpen(false)} ... />
 */

import { useState, useRef } from 'react';
import {
    X, Upload, AlignJustify, Sparkles, Plus, Trash2, Edit,
    CheckCircle, Loader2, ChevronDown, ChevronUp, FileText,
} from 'lucide-react';

const DEFAULT_API_BASE =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:8002/api/v1'
        : '/testai/api/v1';

export default function TestBuilderModal({
    olympiadId,
    onSave,
    onClose,
    adminRole = '',
    adminKey = '',
    apiBase = DEFAULT_API_BASE,
}) {
    const [tab, setTab] = useState('file');               // 'file' | 'text' | 'ai' | 'manual'
    const [title, setTitle] = useState('');
    const [parsedQs, setParsedQs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [errMsg, setErrMsg] = useState('');

    // text tab
    const [pasteText, setPasteText] = useState('');

    // ai tab
    const [aiText, setAiText] = useState('');
    const [aiCount, setAiCount] = useState(10);

    // manual tab
    const [manualQ, setManualQ] = useState({ question: '', options: ['', '', '', ''], correct: 0 });

    // collapsed state for preview questions
    const [collapsedMap, setCollapsedMap] = useState({});

    const fileRef = useRef(null);

    const adminHeaders = { 'X-Admin-Role': adminRole, 'X-Admin-Key': adminKey };

    // ── helpers ──────────────────────────────────────────────────────────────

    const apiFetch = async (path, opts = {}) => {
        const res = await fetch(`${apiBase}${path}`, {
            ...opts,
            headers: { 'Content-Type': 'application/json', ...adminHeaders, ...(opts.headers || {}) },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || data.message || 'Xatolik');
        return data;
    };

    const clearState = () => {
        setParsedQs([]);
        setErrMsg('');
        setPasteText('');
        setAiText('');
    };

    // ── handlers ─────────────────────────────────────────────────────────────

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLoading(true);
        setErrMsg('');
        const fd = new FormData();
        fd.append('file', file);
        try {
            const res = await fetch(`${apiBase}/olympiad-tests/parse-file`, {
                method: 'POST',
                headers: adminHeaders,
                body: fd,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Fayl parse xatolik');
            setParsedQs(data.questions || []);
            if (!title) setTitle(file.name.replace(/\.[^.]+$/, ''));
        } catch (err) {
            setErrMsg(err.message);
        } finally {
            setLoading(false);
            e.target.value = '';
        }
    };

    const handleParseText = async () => {
        if (!pasteText.trim()) { setErrMsg('Matn kiriting'); return; }
        setLoading(true);
        setErrMsg('');
        try {
            const data = await apiFetch('/olympiad-tests/parse-text', {
                method: 'POST',
                body: JSON.stringify({ text: pasteText }),
            });
            setParsedQs(data.questions || []);
        } catch (err) {
            setErrMsg(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAiGenerate = async () => {
        if (!aiText.trim()) { setErrMsg('Matn kiriting'); return; }
        setLoading(true);
        setErrMsg('');
        try {
            const data = await apiFetch('/olympiad-tests/ai-generate', {
                method: 'POST',
                body: JSON.stringify({ text: aiText, count: aiCount, olympiad_id: '' }),
            });
            setParsedQs(data.data?.questions || []);
        } catch (err) {
            setErrMsg(err.message);
        } finally {
            setLoading(false);
        }
    };

    const addManualQuestion = () => {
        if (!manualQ.question.trim()) { setErrMsg('Savol matnini kiriting'); return; }
        if (manualQ.options.some(o => !o.trim())) { setErrMsg("Barcha variantlarni to'ldiring"); return; }
        setParsedQs(prev => [...prev, { ...manualQ }]);
        setManualQ({ question: '', options: ['', '', '', ''], correct: 0 });
        setErrMsg('');
    };

    const removeQ = (i) => setParsedQs(prev => prev.filter((_, idx) => idx !== i));

    const updateQField = (i, field, val) =>
        setParsedQs(prev => prev.map((q, idx) => idx === i ? { ...q, [field]: val } : q));

    const updateQOption = (qi, oi, val) =>
        setParsedQs(prev => prev.map((q, idx) => {
            if (idx !== qi) return q;
            const opts = [...q.options];
            opts[oi] = val;
            return { ...q, options: opts };
        }));

    const handleSave = async () => {
        if (!parsedQs.length) { setErrMsg('Kamida 1 ta savol kerak'); return; }
        if (!title.trim()) { setErrMsg('Test nomini kiriting'); return; }
        setSaving(true);
        setErrMsg('');
        try {
            const data = await apiFetch('/olympiad-tests', {
                method: 'POST',
                body: JSON.stringify({
                    olympiad_id: olympiadId,
                    title: title.trim(),
                    questions: parsedQs,
                    status: 'draft',
                }),
            });
            onSave?.(data.data);
            onClose?.();
        } catch (err) {
            setErrMsg(err.message);
        } finally {
            setSaving(false);
        }
    };

    // ── render ────────────────────────────────────────────────────────────────

    const tabs = [
        { key: 'file',   label: 'Fayl yuklash',  icon: Upload },
        { key: 'text',   label: 'Matn',           icon: AlignJustify },
        { key: 'ai',     label: 'AI bilan',        icon: Sparkles },
        { key: 'manual', label: 'Yangi savol',     icon: Plus },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 shrink-0">
                    <h2 className="text-white font-bold text-lg flex items-center gap-2">
                        <FileText size={18} className="text-emerald-400" /> Test to'plami yaratish
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

                    {/* Test title */}
                    <div>
                        <label className="text-xs text-gray-400 mb-1 block">Test nomi *</label>
                        <input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                            placeholder="Masalan: Amir Temur haqida test"
                        />
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 bg-gray-800 p-1 rounded-xl">
                        {tabs.map(t => (
                            <button
                                key={t.key}
                                onClick={() => { setTab(t.key); clearState(); }}
                                className={`flex items-center gap-1.5 flex-1 justify-center px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                    tab === t.key
                                        ? 'bg-emerald-600 text-white shadow'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                <t.icon size={13} /> {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Error */}
                    {errMsg && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center justify-between">
                            {errMsg}
                            <button onClick={() => setErrMsg('')}><X size={14} /></button>
                        </div>
                    )}

                    {/* === FILE TAB === */}
                    {tab === 'file' && (
                        <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${loading ? 'border-emerald-500 bg-emerald-500/5' : 'border-gray-600 hover:border-emerald-500 hover:bg-gray-800'}`}>
                            <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={handleFileSelect} disabled={loading} />
                            {loading
                                ? <Loader2 size={28} className="text-emerald-400 animate-spin mb-1" />
                                : <Upload size={28} className="text-gray-500 mb-1" />
                            }
                            <span className="text-sm text-gray-400">{loading ? 'Qayta ishlanmoqda...' : 'Bosing yoki fayl suring'}</span>
                            <span className="text-xs text-gray-600 mt-0.5">.pdf .docx .txt</span>
                        </label>
                    )}

                    {/* === TEXT TAB === */}
                    {tab === 'text' && (
                        <div className="space-y-3">
                            <textarea
                                value={pasteText}
                                onChange={e => setPasteText(e.target.value)}
                                rows={8}
                                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 resize-none font-mono"
                                placeholder={"1. Savol matni\nA) variant\nB) variant\nC) variant\nD) variant\n\n2. Ikkinchi savol..."}
                            />
                            <button
                                onClick={handleParseText}
                                disabled={loading || !pasteText.trim()}
                                className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                            >
                                {loading ? <><Loader2 size={15} className="animate-spin" /> Qayta ishlanmoqda...</> : 'Savollarni ajratib olish'}
                            </button>
                        </div>
                    )}

                    {/* === AI TAB === */}
                    {tab === 'ai' && (
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Matn (AI shu matndan savollar tuzadi)</label>
                                <textarea
                                    value={aiText}
                                    onChange={e => setAiText(e.target.value)}
                                    rows={6}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 resize-none"
                                    placeholder="Ertak matni, dars matni, yoki mavzu tavsifini kiriting..."
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="text-xs text-gray-400 shrink-0">Savollar soni:</label>
                                <input
                                    type="number" min={1} max={50} value={aiCount}
                                    onChange={e => setAiCount(parseInt(e.target.value) || 10)}
                                    className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                                />
                            </div>
                            <button
                                onClick={handleAiGenerate}
                                disabled={loading || !aiText.trim()}
                                className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                            >
                                {loading ? <><Loader2 size={15} className="animate-spin" /> AI yaratmoqda...</> : <><Sparkles size={15} /> AI bilan savollar yaratish</>}
                            </button>
                        </div>
                    )}

                    {/* === MANUAL TAB === */}
                    {tab === 'manual' && (
                        <div className="space-y-3">
                            <input
                                value={manualQ.question}
                                onChange={e => setManualQ(p => ({ ...p, question: e.target.value }))}
                                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                                placeholder="Savol matni"
                            />
                            <div className="grid grid-cols-2 gap-2">
                                {manualQ.options.map((opt, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <button
                                            onClick={() => setManualQ(p => ({ ...p, correct: i }))}
                                            className={`w-7 h-7 rounded-lg text-xs font-bold shrink-0 transition-colors ${i === manualQ.correct ? 'bg-emerald-500 text-white' : 'bg-gray-700 text-gray-400'}`}
                                        >{String.fromCharCode(65 + i)}</button>
                                        <input
                                            value={opt}
                                            onChange={e => {
                                                const opts = [...manualQ.options];
                                                opts[i] = e.target.value;
                                                setManualQ(p => ({ ...p, options: opts }));
                                            }}
                                            className="flex-1 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                                            placeholder={`${String.fromCharCode(65 + i)} variant`}
                                        />
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={addManualQuestion}
                                className="w-full py-2 bg-gray-800 border border-dashed border-gray-600 text-emerald-400 rounded-xl text-sm hover:border-emerald-500 flex items-center justify-center gap-1.5 transition-colors"
                            >
                                <Plus size={14} /> Savol qo'shish
                            </button>
                        </div>
                    )}

                    {/* === PARSED QUESTIONS PREVIEW === */}
                    {parsedQs.length > 0 && (
                        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 space-y-2">
                            <p className="text-sm text-gray-300 font-semibold">{parsedQs.length} ta savol — ko'rib chiqing:</p>
                            {parsedQs.map((q, i) => (
                                <div key={i} className="bg-gray-900 border border-gray-700 rounded-xl p-3">
                                    <div className="flex justify-between items-start gap-2">
                                        <p className="text-white text-sm font-medium">{i + 1}. {q.question}</p>
                                        <div className="flex gap-1 shrink-0">
                                            <button
                                                onClick={() => setCollapsedMap(m => ({ ...m, [i]: !m[i] }))}
                                                className="p-1 text-gray-500 hover:text-gray-300"
                                            >
                                                {collapsedMap[i] ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                                            </button>
                                            <button onClick={() => removeQ(i)} className="p-1 text-gray-500 hover:text-red-400">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    {!collapsedMap[i] && (
                                        <div className="mt-2 space-y-1">
                                            <textarea
                                                value={q.question}
                                                onChange={e => updateQField(i, 'question', e.target.value)}
                                                rows={2}
                                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-emerald-500 resize-none"
                                            />
                                            {(q.options || []).map((opt, j) => (
                                                <div key={j} className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => updateQField(i, 'correct', j)}
                                                        className={`w-6 h-6 rounded text-xs font-bold shrink-0 ${j === (q.correct ?? 0) ? 'bg-emerald-500 text-white' : 'bg-gray-700 text-gray-400'}`}
                                                    >{String.fromCharCode(65 + j)}</button>
                                                    <input
                                                        value={opt}
                                                        onChange={e => updateQOption(i, j, e.target.value)}
                                                        className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-xs focus:outline-none focus:border-emerald-500"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-between gap-3 shrink-0">
                    <span className="text-xs text-gray-500">{parsedQs.length} ta savol tayyor</span>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
                            Bekor qilish
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving || !parsedQs.length || !title.trim()}
                            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-40 transition-colors"
                        >
                            {saving ? <><Loader2 size={14} className="animate-spin" /> Saqlanmoqda...</> : <><CheckCircle size={14} /> Saqlash</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
