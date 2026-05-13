import React from 'react';
import { X, BookOpen, Clock, Award, Play, CheckCircle } from 'lucide-react';

const ErtakPreviewModal = ({ ertak, onClose }) => {
  if (!ertak) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[10000] p-4" onClick={onClose}>
      <div className="bg-[#1a1a2e] border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              <BookOpen className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-white font-bold text-xl">{ertak.title}</h3>
              <p className="text-white/40 text-sm">{ertak.language === 'uz' ? "O'zbek tili" : "Rus tili"} &bull; {ertak.age_group} yosh</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all text-white/40 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Main Story */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="prose prose-invert max-w-none">
                <h4 className="text-white/40 text-xs uppercase tracking-widest font-bold mb-4 flex items-center gap-2">
                  <Play size={12} className="text-orange-500" /> Matn mazmuni
                </h4>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-white/80 leading-relaxed text-lg font-serif italic">
                  {ertak.content}
                </div>
              </div>

              {ertak.audio_url && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400">
                    <Play size={20} fill="currentColor" />
                  </div>
                  <div className="flex-1">
                    <div className="text-white text-sm font-medium">Audio hamrohlik mavjud</div>
                    <audio src={ertak.audio_url} controls className="w-full mt-2 h-8" />
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar / Image */}
            <div className="space-y-6">
              {ertak.image_url ? (
                <div className="rounded-2xl overflow-hidden border border-white/10 aspect-square">
                  <img src={ertak.image_url} alt={ertak.title} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="rounded-2xl bg-white/5 border border-dashed border-white/10 aspect-square flex flex-col items-center justify-center text-white/20">
                  <BookOpen size={48} className="mb-2" />
                  <span className="text-xs">Rasm yo'q</span>
                </div>
              )}

              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
                <h5 className="text-white font-bold text-sm">Ma'lumotlar</h5>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/40">Savollar</span>
                    <span className="text-white font-medium">{ertak.questions?.length || 0} ta</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/40">Ko'rishlar</span>
                    <span className="text-white font-medium">{ertak.view_count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/40">Yaratilgan</span>
                    <span className="text-white font-medium">{new Date(ertak.created_at).toLocaleDateString('uz')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Questions */}
          {ertak.questions && ertak.questions.length > 0 && (
            <div className="space-y-6 pt-8 border-t border-white/5">
              <h4 className="text-white/40 text-xs uppercase tracking-widest font-bold flex items-center gap-2">
                <Award size={14} className="text-green-500" /> Tushunish savollari
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ertak.questions.map((q, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-green-500/20 rounded-lg flex items-center justify-center text-green-400 text-xs font-bold shrink-0">
                        {i + 1}
                      </div>
                      <div className="space-y-2">
                        <div className="text-white text-sm font-medium">{q.question}</div>
                        <div className="flex items-center gap-2 text-green-400 text-xs bg-green-500/10 w-fit px-2 py-1 rounded-md">
                          <CheckCircle size={12} />
                          <span>Javob: {q.answer}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-white/5 flex justify-end">
          <button onClick={onClose} className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-all">
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErtakPreviewModal;
