import React, { useState, useEffect } from 'react';
import {
  BookOpen, FileText, Upload, Play, Image, Link, Plus,
  Trash2, X, Save, Eye, Tag, Layers, ChevronDown, ChevronUp,
  File, Video, ImageIcon, GripVertical, Sparkles
} from 'lucide-react';
import { teacherService } from '../../services/teacherService';

const ComplexLessonBuilder = ({ classrooms = [], onShowNotif, onSaved }) => {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // Components
  const [selectedTestId, setSelectedTestId] = useState('');
  const [tests, setTests] = useState([]);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [presentationFile, setPresentationFile] = useState(null);
  const [documentFiles, setDocumentFiles] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const [imageUrls, setImageUrls] = useState(['']);
  const [expandedSections, setExpandedSections] = useState({
    test: true, presentation: true, documents: true, video: true, images: true, imageUrls: true
  });

  useEffect(() => {
    teacherService.getMyTests().then(res => {
      setTests(res.tests || []);
    }).catch(() => {});
  }, []);

  const toggleSection = (key) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAddImageUrl = () => {
    if (imageUrls.length < 5) {
      setImageUrls([...imageUrls, '']);
    }
  };

  const handleRemoveImageUrl = (idx) => {
    setImageUrls(imageUrls.filter((_, i) => i !== idx));
  };

  const handleImageUrlChange = (idx, value) => {
    const updated = [...imageUrls];
    updated[idx] = value;
    setImageUrls(updated);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      onShowNotif?.('error', 'Dars nomini kiriting');
      return;
    }

    setSaving(true);
    try {
      // Upload files first
      const uploadedAttachments = [];

      // Upload presentation
      if (presentationFile) {
        try {
          const upRes = await teacherService.uploadAssignmentFile(presentationFile);
          const fileData = upRes.data || upRes;
          if (fileData?.url) {
            uploadedAttachments.push({
              name: presentationFile.name,
              url: fileData.url,
              type: 'presentation',
              size: fileData.size || presentationFile.size
            });
          }
        } catch (e) {
          console.error('Presentation upload error:', e);
        }
      }

      // Upload documents
      for (const doc of documentFiles) {
        try {
          const upRes = await teacherService.uploadAssignmentFile(doc);
          const fileData = upRes.data || upRes;
          if (fileData?.url) {
            uploadedAttachments.push({
              name: doc.name,
              url: fileData.url,
              type: 'document',
              size: fileData.size || doc.size
            });
          }
        } catch (e) {
          console.error('Document upload error:', e);
        }
      }

      // Upload images
      for (const img of imageFiles) {
        try {
          const upRes = await teacherService.uploadAssignmentFile(img);
          const fileData = upRes.data || upRes;
          if (fileData?.url) {
            uploadedAttachments.push({
              name: img.name,
              url: fileData.url,
              type: 'image',
              size: fileData.size || img.size
            });
          }
        } catch (e) {
          console.error('Image upload error:', e);
        }
      }

      // Build components JSON
      const components = {
        test_id: selectedTestId || null,
        youtube_url: youtubeUrl || null,
        image_urls: imageUrls.filter(u => u.trim()),
        file_types: uploadedAttachments.map(a => a.type),
      };

      // Create lesson
      const lessonData = {
        title,
        subject,
        grade_level: gradeLevel,
        content: JSON.stringify({
          type: 'complex',
          description,
          components,
        }),
        video_url: youtubeUrl || null,
        attachments: uploadedAttachments.length > 0 ? uploadedAttachments : null,
      };

      await teacherService.createLesson(lessonData);
      onShowNotif?.('success', 'Kompleks dars muvaffaqiyatli yaratildi!');
      onSaved?.();
    } catch (e) {
      console.error('Complex lesson creation error:', e);
      onShowNotif?.('error', e.message || 'Darsni saqlashda xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
    } finally {
      setSaving(false);
    }
  };

  const SectionHeader = ({ icon: Icon, title, sectionKey, color = 'text-purple-400', badge }) => (
    <button
      onClick={() => toggleSection(sectionKey)}
      className="w-full flex items-center justify-between py-3 px-4 bg-white/[0.03] hover:bg-white/[0.06] rounded-xl transition-all border-none cursor-pointer"
    >
      <div className="flex items-center gap-2">
        <Icon size={16} className={color} />
        <span className="text-white text-sm font-semibold">{title}</span>
        {badge && (
          <span className="px-2 py-0.5 bg-green-500/15 text-green-400 text-[10px] font-bold rounded-md">{badge}</span>
        )}
      </div>
      {expandedSections[sectionKey] ? <ChevronUp size={14} className="text-white/30" /> : <ChevronDown size={14} className="text-white/30" />}
    </button>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Layers className="w-6 h-6 text-indigo-400" />
          Kompleks dars yaratish
        </h3>
        <p className="text-white/40 text-sm mt-1">
          Test, prezentatsiya, video va boshqa materiallarni birlashtiring
        </p>
      </div>

      {/* Basic Info */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
        <h4 className="text-white font-bold text-sm flex items-center gap-2">
          <BookOpen size={16} className="text-blue-400" /> Asosiy ma'lumotlar
        </h4>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Dars nomi *"
          className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500/50 text-sm"
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Fan (Matematika...)"
            className="bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500/50 text-sm"
          />
          <input
            type="text"
            value={gradeLevel}
            onChange={e => setGradeLevel(e.target.value)}
            placeholder="Sinf (5-sinf, 9-A...)"
            className="bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500/50 text-sm"
          />
        </div>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Dars haqida qisqacha tavsif..."
          className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500/50 text-sm h-20 resize-none"
        />
      </div>

      {/* Components */}
      <div className="space-y-3">

        {/* Test */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <SectionHeader icon={FileText} title="Test" sectionKey="test" color="text-purple-400" badge={selectedTestId ? '✓' : null} />
          {expandedSections.test && (
            <div className="p-4 border-t border-white/5">
              <select
                value={selectedTestId}
                onChange={e => setSelectedTestId(e.target.value)}
                className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 text-sm appearance-none"
              >
                <option value="" className="bg-[#1a1a2e]">Test tanlang (ixtiyoriy)</option>
                {tests.map(t => (
                  <option key={t.id} value={t.id} className="bg-[#1a1a2e]">
                    {t.title} ({t.questions_count || t.questions?.length || 0} savol)
                  </option>
                ))}
              </select>
              <p className="text-white/30 text-[10px] mt-2">Kutubxonangizdagi testlardan birini tanlang yoki bo'sh qoldiring</p>
            </div>
          )}
        </div>

        {/* Presentation */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <SectionHeader icon={File} title="Prezentatsiya (PPTX/PDF)" sectionKey="presentation" color="text-orange-400" badge={presentationFile ? '✓' : null} />
          {expandedSections.presentation && (
            <div className="p-4 border-t border-white/5">
              <input
                type="file"
                accept=".pptx,.ppt,.pdf"
                onChange={e => setPresentationFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-white/60 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-orange-500/20 file:text-orange-400 hover:file:bg-orange-500/30 file:cursor-pointer"
              />
              {presentationFile && (
                <div className="flex items-center justify-between mt-2 bg-orange-500/10 rounded-lg px-3 py-2">
                  <span className="text-orange-400 text-xs">{presentationFile.name}</span>
                  <button onClick={() => setPresentationFile(null)} className="text-white/30 hover:text-red-400 p-1 border-none bg-transparent cursor-pointer">
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Documents */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <SectionHeader icon={FileText} title="Hujjatlar (Word/PDF, 1-3 ta)" sectionKey="documents" color="text-blue-400" badge={documentFiles.length > 0 ? `${documentFiles.length}` : null} />
          {expandedSections.documents && (
            <div className="p-4 border-t border-white/5">
              <input
                type="file"
                accept=".doc,.docx,.pdf,.txt"
                multiple
                onChange={e => {
                  const files = Array.from(e.target.files || []).slice(0, 3);
                  setDocumentFiles(files);
                }}
                className="block w-full text-sm text-white/60 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-500/20 file:text-blue-400 hover:file:bg-blue-500/30 file:cursor-pointer"
              />
              {documentFiles.length > 0 && (
                <div className="space-y-1.5 mt-2">
                  {documentFiles.map((f, i) => (
                    <div key={i} className="flex items-center justify-between bg-blue-500/10 rounded-lg px-3 py-2">
                      <span className="text-blue-400 text-xs">{f.name}</span>
                      <button onClick={() => setDocumentFiles(documentFiles.filter((_, idx) => idx !== i))} className="text-white/30 hover:text-red-400 p-1 border-none bg-transparent cursor-pointer">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* YouTube Video */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <SectionHeader icon={Video} title="YouTube video" sectionKey="video" color="text-red-400" badge={youtubeUrl ? '✓' : null} />
          {expandedSections.video && (
            <div className="p-4 border-t border-white/5">
              <input
                type="url"
                value={youtubeUrl}
                onChange={e => setYoutubeUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-red-500/50 text-sm"
              />
              {youtubeUrl && (() => {
                const match = youtubeUrl.match(/(?:v=|\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                if (!match) return null;
                return (
                  <div className="mt-3 aspect-video bg-black rounded-xl overflow-hidden">
                    <iframe
                      src={`https://www.youtube.com/embed/${match[1]}`}
                      className="w-full h-full"
                      allowFullScreen
                      title="YouTube video"
                    />
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Images upload */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <SectionHeader icon={ImageIcon} title="Rasmlar yuklash (1-5 ta)" sectionKey="images" color="text-green-400" badge={imageFiles.length > 0 ? `${imageFiles.length}` : null} />
          {expandedSections.images && (
            <div className="p-4 border-t border-white/5">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={e => {
                  const files = Array.from(e.target.files || []).slice(0, 5);
                  setImageFiles(files);
                }}
                className="block w-full text-sm text-white/60 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-green-500/20 file:text-green-400 hover:file:bg-green-500/30 file:cursor-pointer"
              />
              {imageFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {imageFiles.map((f, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={URL.createObjectURL(f)}
                        className="w-16 h-16 object-cover rounded-lg border border-white/10"
                        alt={f.name}
                      />
                      <button
                        onClick={() => setImageFiles(imageFiles.filter((_, idx) => idx !== i))}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border-none cursor-pointer"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Image URLs */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <SectionHeader icon={Link} title="Rasm havolalari" sectionKey="imageUrls" color="text-cyan-400" badge={imageUrls.filter(u => u.trim()).length > 0 ? `${imageUrls.filter(u => u.trim()).length}` : null} />
          {expandedSections.imageUrls && (
            <div className="p-4 border-t border-white/5 space-y-2">
              {imageUrls.map((url, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={e => handleImageUrlChange(idx, e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="flex-1 bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 text-sm"
                  />
                  {imageUrls.length > 1 && (
                    <button onClick={() => handleRemoveImageUrl(idx)} className="p-2 text-white/20 hover:text-red-400 transition-colors border-none bg-transparent cursor-pointer">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              {imageUrls.length < 5 && (
                <button onClick={handleAddImageUrl} className="text-cyan-400 text-xs font-medium hover:text-cyan-300 transition-colors border-none bg-transparent cursor-pointer">
                  <Plus size={12} className="inline mr-1" /> Havola qo'shish
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Save button */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving || !title.trim()}
          className={`flex-1 py-3.5 rounded-xl text-sm font-bold transition-all border-none cursor-pointer flex items-center justify-center gap-2 ${
            saving || !title.trim()
              ? 'bg-white/10 text-white/30 cursor-not-allowed'
              : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:scale-[1.02]'
          }`}
        >
          {saving ? (
            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saqlanmoqda...</>
          ) : (
            <><Save size={16} /> Kompleks darsni saqlash</>
          )}
        </button>
      </div>
    </div>
  );
};

export default ComplexLessonBuilder;
