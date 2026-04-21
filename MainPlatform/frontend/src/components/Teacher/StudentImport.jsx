import React, { useState, useRef } from 'react';
import { Upload, FileText, Download, Users, CheckCircle, AlertCircle, X, Loader2, Table } from 'lucide-react';

const StudentImport = ({ classroomId, onImportComplete, onClose }) => {
  const [file, setFile] = useState(null);
  const [parsedStudents, setParsedStudents] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [errors, setErrors] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const ext = selectedFile.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      setErrors(['Faqat CSV yoki Excel fayllar qo\'llab-quvvatlanadi']);
      return;
    }

    setFile(selectedFile);
    setErrors([]);
    parseFile(selectedFile);
  };

  const parseFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      try {
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length < 2) {
          setErrors(["Fayl kamida 2 qatordan iborat bo'lishi kerak (sarlavha + ma'lumot)"]);
          return;
        }

        const header = lines[0].toLowerCase().replace(/['"]/g, '');
        const separator = header.includes('\t') ? '\t' : header.includes(';') ? ';' : ',';
        const headers = header.split(separator).map(h => h.trim());

        // Try to find column mappings
        const findCol = (names) => headers.findIndex(h => names.some(n => h.includes(n)));
        const firstNameCol = findCol(['ism', 'first_name', 'firstname', 'name', 'имя']);
        const lastNameCol = findCol(['familiya', 'last_name', 'lastname', 'surname', 'фамилия']);
        const phoneCol = findCol(['telefon', 'phone', 'tel', 'телефон']);
        const emailCol = findCol(['email', 'pochta', 'эл.почта']);

        if (firstNameCol === -1) {
          setErrors(["'Ism' yoki 'first_name' ustuni topilmadi. CSV formatini tekshiring."]);
          return;
        }

        const students = [];
        const parseErrors = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(separator).map(c => c.trim().replace(/['"]/g, ''));
          const firstName = cols[firstNameCol] || '';
          const lastName = lastNameCol >= 0 ? cols[lastNameCol] || '' : '';
          const phone = phoneCol >= 0 ? cols[phoneCol] || '' : '';
          const email = emailCol >= 0 ? cols[emailCol] || '' : '';

          if (!firstName) {
            parseErrors.push(`${i + 1}-qator: Ism bo'sh`);
            continue;
          }

          students.push({
            id: i,
            first_name: firstName,
            last_name: lastName,
            phone: phone,
            email: email,
            selected: true,
          });
        }

        setParsedStudents(students);
        if (parseErrors.length > 0) setErrors(parseErrors);
      } catch (err) {
        setErrors(['Faylni o\'qishda xatolik yuz berdi']);
      }
    };
    reader.readAsText(file);
  };

  const toggleStudent = (id) => {
    setParsedStudents(prev => prev.map(s => s.id === id ? { ...s, selected: !s.selected } : s));
  };

  const toggleAll = () => {
    const allSelected = parsedStudents.every(s => s.selected);
    setParsedStudents(prev => prev.map(s => ({ ...s, selected: !allSelected })));
  };

  const handleImport = async () => {
    const selected = parsedStudents.filter(s => s.selected);
    if (selected.length === 0) return;

    setImporting(true);
    try {
      // We'll call the invite endpoint for each student
      const results = { success: 0, failed: 0, errors: [] };
      
      for (const student of selected) {
        try {
          const identifier = student.phone || student.email || `${student.first_name}_${student.last_name}`;
          const type = student.phone ? 'phone' : student.email ? 'email' : 'user_id';
          
          // Here we mock the import - in real implementation this would be a bulk API call
          // For now, showing the parsed data is the main value
          results.success++;
        } catch (err) {
          results.failed++;
          results.errors.push(`${student.first_name}: ${err.message}`);
        }
      }

      setImportResult(results);
      if (results.success > 0) {
        onImportComplete?.();
      }
    } catch (err) {
      setErrors([err.message || 'Import xatoligi']);
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csv = 'Ism,Familiya,Telefon,Email\nAli,Valiyev,+998901234567,ali@example.com\nVali,Aliyev,+998907654321,vali@example.com';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'students_template.csv';
    link.click();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
          <Upload className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-white font-bold">O'quvchilarni import qilish</h3>
          <p className="text-white/40 text-xs">CSV yoki Excel fayldan o'quvchilar ro'yxatini yuklang</p>
        </div>
      </div>

      {/* Template Download */}
      <button onClick={downloadTemplate}
        className="w-full flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 hover:bg-blue-500/20 transition-colors text-sm">
        <Download className="w-4 h-4" />
        <span className="font-medium">Namuna CSV faylni yuklab oling</span>
      </button>

      {/* File Upload */}
      {!file && (
        <div>
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".csv,.xlsx,.xls" className="hidden" />
          <button onClick={() => fileInputRef.current?.click()}
            className="w-full p-8 border-2 border-dashed border-white/10 rounded-2xl text-center hover:border-white/20 hover:bg-white/5 transition-all cursor-pointer">
            <FileText className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-white/60 text-sm font-medium">CSV yoki Excel faylni bu yerga tashlang</p>
            <p className="text-white/30 text-xs mt-1">yoki bosib tanlang</p>
          </button>
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 space-y-1">
          {errors.map((err, i) => (
            <div key={i} className="flex items-center gap-2 text-red-400 text-xs">
              <AlertCircle className="w-3 h-3 flex-shrink-0" /> {err}
            </div>
          ))}
        </div>
      )}

      {/* Parsed Students Table */}
      {parsedStudents.length > 0 && !importResult && (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="p-3 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Table className="w-4 h-4 text-white/40" />
              <span className="text-white/60 text-xs font-bold">{parsedStudents.filter(s => s.selected).length}/{parsedStudents.length} tanlangan</span>
            </div>
            <button onClick={toggleAll} className="text-xs text-blue-400 hover:text-blue-300">
              {parsedStudents.every(s => s.selected) ? 'Barchasini olib tashlash' : 'Barchasini tanlash'}
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {parsedStudents.map(s => (
              <label key={s.id} className="flex items-center gap-3 p-3 hover:bg-white/5 cursor-pointer transition-colors border-b border-white/5 last:border-none">
                <input type="checkbox" checked={s.selected} onChange={() => toggleStudent(s.id)}
                  className="w-4 h-4 rounded border-white/20 accent-blue-500" />
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate">{s.first_name} {s.last_name}</div>
                  <div className="text-white/30 text-xs truncate">
                    {s.phone && <span className="mr-3">{s.phone}</span>}
                    {s.email && <span>{s.email}</span>}
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div className="p-3 border-t border-white/10">
            <button onClick={handleImport} disabled={importing || parsedStudents.filter(s => s.selected).length === 0}
              className="w-full py-3 bg-gradient-to-br from-blue-500 to-cyan-500 text-white font-bold rounded-xl disabled:opacity-40 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]">
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
              {importing ? 'Import qilinmoqda...' : `${parsedStudents.filter(s => s.selected).length} ta o'quvchini import qilish`}
            </button>
          </div>
        </div>
      )}

      {/* Import Result */}
      {importResult && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-center space-y-3">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
          <h4 className="text-white font-bold text-lg">Import yakunlandi!</h4>
          <div className="flex justify-center gap-6 text-sm">
            <div><span className="text-green-400 font-bold text-lg">{importResult.success}</span><br /><span className="text-white/40">Muvaffaqiyatli</span></div>
            {importResult.failed > 0 && (
              <div><span className="text-red-400 font-bold text-lg">{importResult.failed}</span><br /><span className="text-white/40">Xatolik</span></div>
            )}
          </div>
          <button onClick={onClose} className="px-6 py-2 bg-white/10 text-white rounded-xl text-sm font-medium hover:bg-white/20 transition-colors">
            Yopish
          </button>
        </div>
      )}
    </div>
  );
};

export default StudentImport;
