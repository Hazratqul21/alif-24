import React, { useState, useRef } from 'react';
import { teacherService } from '../../services/teacherService';
import {
  Folder, FolderPlus, File, FileText, Image, Film, Upload, Trash2,
  Download, Search, ChevronRight, MoreVertical, Plus, X, Loader2,
  FolderOpen, Paperclip, Grid, List
} from 'lucide-react';

const ResourceLibrary = ({ onAttach }) => {
  const [resources, setResources] = useState([]);
  const [folders, setFolders] = useState([
    { id: 'root', name: 'Barcha fayllar', parent: null },
    { id: 'tests', name: 'Testlar', parent: 'root', icon: '📝' },
    { id: 'presentations', name: 'Prezentatsiyalar', parent: 'root', icon: '📊' },
    { id: 'documents', name: 'Hujjatlar', parent: 'root', icon: '📄' },
    { id: 'media', name: 'Rasm va Video', parent: 'root', icon: '🖼️' },
  ]);
  const [currentFolder, setCurrentFolder] = useState('root');
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [uploading, setUploading] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const fileInputRef = useRef(null);

  const breadcrumb = [];
  let current = folders.find(f => f.id === currentFolder);
  while (current) {
    breadcrumb.unshift(current);
    current = folders.find(f => f.id === current.parent);
  }

  const currentFolderChildren = folders.filter(f => f.parent === currentFolder);
  const currentFiles = uploadedFiles.filter(f => f.folder === currentFolder);

  const filteredFiles = searchQuery
    ? uploadedFiles.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : currentFiles;

  const getFileIcon = (name) => {
    const ext = name.split('.').pop().toLowerCase();
    if (['pdf'].includes(ext)) return { icon: FileText, color: 'text-red-400', bg: 'bg-red-500/20' };
    if (['doc', 'docx'].includes(ext)) return { icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/20' };
    if (['ppt', 'pptx'].includes(ext)) return { icon: FileText, color: 'text-orange-400', bg: 'bg-orange-500/20' };
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return { icon: Image, color: 'text-green-400', bg: 'bg-green-500/20' };
    if (['mp4', 'avi', 'mov', 'webm'].includes(ext)) return { icon: Film, color: 'text-purple-400', bg: 'bg-purple-500/20' };
    return { icon: File, color: 'text-white/40', bg: 'bg-white/10' };
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      for (const file of files) {
        // Upload to server
        try {
          const res = await teacherService.uploadAssignmentFile(file);
          const fileData = res.data || res;
          setUploadedFiles(prev => [...prev, {
            id: Date.now() + Math.random(),
            name: file.name,
            size: file.size,
            url: fileData?.url || '#',
            folder: currentFolder,
            uploadedAt: new Date().toISOString(),
          }]);
        } catch {
          // Fallback: store locally
          setUploadedFiles(prev => [...prev, {
            id: Date.now() + Math.random(),
            name: file.name,
            size: file.size,
            url: URL.createObjectURL(file),
            folder: currentFolder,
            uploadedAt: new Date().toISOString(),
          }]);
        }
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    setFolders(prev => [...prev, {
      id: `folder_${Date.now()}`,
      name: newFolderName.trim(),
      parent: currentFolder,
      icon: '📁',
    }]);
    setNewFolderName('');
    setShowNewFolder(false);
  };

  const handleDeleteFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 relative min-w-[200px]">
          <Search className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Fayl qidirish..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#4b30fb]/50"
          />
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-white/40 hover:text-white">
            {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
          </button>
          <button onClick={() => setShowNewFolder(true)}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-white/60 text-xs font-medium">
            <FolderPlus className="w-4 h-4" /> Papka
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-br from-[#4b30fb] to-[#764ba2] rounded-xl text-white text-xs font-bold hover:scale-105 transition-transform disabled:opacity-50">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Yuklash
          </button>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs overflow-x-auto pb-1">
        {breadcrumb.map((f, i) => (
          <React.Fragment key={f.id}>
            {i > 0 && <ChevronRight className="w-3 h-3 text-white/20 flex-shrink-0" />}
            <button onClick={() => setCurrentFolder(f.id)}
              className={`px-2 py-1 rounded-lg flex-shrink-0 transition-colors ${f.id === currentFolder ? 'text-white font-bold bg-white/10' : 'text-white/40 hover:text-white/60'}`}>
              {f.name}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* New Folder Input */}
      {showNewFolder && (
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-3">
          <FolderPlus className="w-4 h-4 text-amber-400" />
          <input type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Papka nomi..."
            className="flex-1 bg-transparent border-none text-white text-sm focus:outline-none placeholder:text-white/20"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
          />
          <button onClick={handleCreateFolder} className="text-green-400 hover:text-green-300 text-xs font-bold">Yaratish</button>
          <button onClick={() => setShowNewFolder(false)} className="text-white/30 hover:text-white/60"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Content */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* Folders */}
          {currentFolderChildren.map(f => (
            <button key={f.id} onClick={() => setCurrentFolder(f.id)}
              className="p-4 bg-white/5 border border-white/10 rounded-xl text-left hover:bg-white/10 transition-all group">
              <div className="text-2xl mb-2">{f.icon || '📁'}</div>
              <div className="text-white text-sm font-medium truncate">{f.name}</div>
              <div className="text-white/30 text-[10px] mt-0.5">{uploadedFiles.filter(uf => uf.folder === f.id).length} ta fayl</div>
            </button>
          ))}

          {/* Files */}
          {filteredFiles.map(f => {
            const { icon: FileIcon, color, bg } = getFileIcon(f.name);
            return (
              <div key={f.id} className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all group relative">
                <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center mb-2`}>
                  <FileIcon className={`w-5 h-5 ${color}`} />
                </div>
                <div className="text-white text-sm font-medium truncate">{f.name}</div>
                <div className="text-white/30 text-[10px] mt-0.5">{formatFileSize(f.size)}</div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  {onAttach && (
                    <button onClick={() => onAttach(f)} className="p-1.5 bg-blue-500/20 rounded-lg text-blue-400 hover:bg-blue-500/30">
                      <Paperclip className="w-3 h-3" />
                    </button>
                  )}
                  <button onClick={() => handleDeleteFile(f.id)} className="p-1.5 bg-red-500/20 rounded-lg text-red-400 hover:bg-red-500/30">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Empty state */}
          {currentFolderChildren.length === 0 && filteredFiles.length === 0 && (
            <div className="col-span-full py-10 text-center">
              <FolderOpen className="w-12 h-12 text-white/10 mx-auto mb-3" />
              <p className="text-white/30 text-sm">Bu papka bo'sh</p>
              <p className="text-white/20 text-xs mt-1">Fayl yuklash tugmasini bosing</p>
            </div>
          )}
        </div>
      ) : (
        /* List View */
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          {/* Folders */}
          {currentFolderChildren.map(f => (
            <button key={f.id} onClick={() => setCurrentFolder(f.id)}
              className="w-full flex items-center gap-3 p-3 hover:bg-white/5 border-b border-white/5 transition-colors text-left">
              <span className="text-lg">{f.icon || '📁'}</span>
              <span className="text-white text-sm font-medium flex-1">{f.name}</span>
              <span className="text-white/20 text-xs">{uploadedFiles.filter(uf => uf.folder === f.id).length} ta fayl</span>
              <ChevronRight className="w-4 h-4 text-white/20" />
            </button>
          ))}

          {/* Files */}
          {filteredFiles.map(f => {
            const { icon: FileIcon, color, bg } = getFileIcon(f.name);
            return (
              <div key={f.id} className="flex items-center gap-3 p-3 hover:bg-white/5 border-b border-white/5 transition-colors group">
                <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <FileIcon className={`w-4 h-4 ${color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate">{f.name}</div>
                  <div className="text-white/30 text-[10px]">{formatFileSize(f.size)}</div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onAttach && (
                    <button onClick={() => onAttach(f)} className="p-1.5 bg-blue-500/20 rounded-lg text-blue-400 hover:bg-blue-500/30">
                      <Paperclip className="w-3 h-3" />
                    </button>
                  )}
                  <button onClick={() => handleDeleteFile(f.id)} className="p-1.5 bg-red-500/20 rounded-lg text-red-400 hover:bg-red-500/30">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}

          {currentFolderChildren.length === 0 && filteredFiles.length === 0 && (
            <div className="py-10 text-center">
              <FolderOpen className="w-10 h-10 text-white/10 mx-auto mb-2" />
              <p className="text-white/30 text-sm">Bo'sh</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResourceLibrary;
