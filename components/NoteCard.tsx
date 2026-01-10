
import React, { useState } from 'react';
import { Note } from '../types';
import { polishContentWithAI } from '../services/geminiService';

interface NoteCardProps {
  note: Note;
  onDelete: (id: string) => void;
  onUpdate: (updatedNote: Note) => void;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, onDelete, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isPolishing, setIsPolishing] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editedNote, setEditedNote] = useState<Note>({ ...note });

  // Processing State UI
  if (note.isProcessing) {
    return (
      <div className="bg-white rounded-2xl border border-indigo-100 p-6 shadow-lg shadow-indigo-50 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-loading-bar"></div>
        <div className="flex items-center space-x-4 animate-pulse">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
             <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-slate-100 rounded w-1/3"></div>
            <div className="h-3 bg-slate-50 rounded w-1/4"></div>
          </div>
        </div>
        <div className="mt-6 space-y-3">
          <div className="h-20 bg-slate-50 rounded-xl"></div>
          <div className="h-20 bg-slate-50 rounded-xl"></div>
        </div>
        <p className="text-center text-xs font-medium text-indigo-500 mt-4 animate-pulse">
          Gemini đang phân tích và cấu trúc lại ghi chú của bạn...
        </p>
      </div>
    );
  }

  // Helper Functions (Save, Cancel, Polish, Export...)
  const handleSave = () => {
    onUpdate(editedNote);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedNote({ ...note });
    setIsEditing(false);
  };

  const handlePolish = async (field: keyof Note, label: string) => {
    const originalValue = editedNote[field];
    if (typeof originalValue !== 'string' || !originalValue.trim()) return;

    setIsPolishing(field as string);
    try {
      const polished = await polishContentWithAI(originalValue, label);
      setEditedNote(prev => ({ ...prev, [field]: polished }));
    } catch (error) {
      console.error("Polish failed", error);
    } finally {
      setIsPolishing(null);
    }
  };

  const generatePlainTextContent = () => {
    // ... (Keep existing logic)
    const headerTitle = note.title.toUpperCase() || "MEETING NOTE";
    const dateStr = new Date(note.timestamp).toLocaleString('vi-VN');
    let content = `${headerTitle}\n==================\nNgày: ${dateStr}\n\n`;
    content += `1. NỘI DUNG:\n${note.noiDung}\n\n`;
    content += `2. NHƯỢC ĐIỂM:\n${note.nhuocDiem}\n\n`;
    content += `3. CẢI THIỆN:\n${note.caiThien}\n\n`;
    content += `4. CHÚ Ý:\n${note.chuYQuanTrong.join('\n• ')}\n\n`;
    content += `TRANSCRIPT GỐC:\n${note.transcript}\n`;
    return content;
  };

  const exportToTxt = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = generatePlainTextContent();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = note.title.replace(/[^a-z0-9]/gi, '_');
    a.download = `${safeTitle}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const copyForDocs = async (e: React.MouseEvent) => {
    e.stopPropagation();
    // Simple copy logic for clarity in this update
    await navigator.clipboard.writeText(`${note.title}\n\n${note.noiDung}\n\n${note.nhuocDiem}\n\n${note.caiThien}`);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const confirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const executeDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(note.id);
  };

  const cancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(false);
  };
  
  // Important Items Handlers
  const handleAddImportant = () => setEditedNote(prev => ({ ...prev, chuYQuanTrong: [...prev.chuYQuanTrong, ''] }));
  const handleUpdateImportant = (index: number, val: string) => {
    const list = [...editedNote.chuYQuanTrong]; list[index] = val; setEditedNote(prev => ({ ...prev, chuYQuanTrong: list }));
  };
  const handleRemoveImportant = (index: number) => {
    setEditedNote(prev => ({ ...prev, chuYQuanTrong: prev.chuYQuanTrong.filter((_, i) => i !== index) }));
  };

  // --- RENDER ---
  return (
    <div className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden ${isEditing ? 'border-indigo-300 ring-4 ring-indigo-50 shadow-2xl' : 'border-slate-200 shadow-sm hover:shadow-lg hover:border-indigo-200'}`}>
      
      {/* Header Section */}
      <div className="p-6 border-b border-slate-100 bg-white">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input 
                className="text-2xl font-bold text-slate-800 w-full border-b-2 border-indigo-200 focus:border-indigo-500 outline-none bg-transparent py-1 transition-all"
                value={editedNote.title}
                onChange={(e) => setEditedNote({ ...editedNote, title: e.target.value })}
                placeholder="Tiêu đề cuộc họp..."
              />
            ) : (
              <h3 className="text-xl md:text-2xl font-bold text-slate-800 leading-tight">{note.title}</h3>
            )}
            <div className="flex items-center space-x-2 mt-2 text-xs font-medium text-slate-400">
              <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-500">
                {new Date(note.timestamp).toLocaleDateString('vi-VN')}
              </span>
              <span>•</span>
              <span>{new Date(note.timestamp).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex items-center gap-2 shrink-0">
            {isEditing ? (
              <>
                <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-sm transition-colors">
                  Lưu lại
                </button>
                <button onClick={handleCancel} className="px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors">
                  Hủy
                </button>
              </>
            ) : (
              <>
                {!showDeleteConfirm ? (
                  <>
                     <div className="flex bg-slate-50 rounded-lg p-1 border border-slate-200">
                        <button onClick={copyForDocs} title="Sao chép" className={`p-2 rounded-md transition-all ${copyFeedback ? 'bg-green-500 text-white' : 'text-slate-500 hover:bg-white hover:text-indigo-600 hover:shadow-sm'}`}>
                          {copyFeedback ? <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm8 4a1 1 0 100 2h-6a1 1 0 100-2h6z" clipRule="evenodd" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>}
                        </button>
                        <button onClick={exportToTxt} title="Tải xuống" className="p-2 text-slate-500 rounded-md hover:bg-white hover:text-indigo-600 hover:shadow-sm transition-all">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        </button>
                        <button onClick={() => setIsEditing(true)} title="Chỉnh sửa" className="p-2 text-slate-500 rounded-md hover:bg-white hover:text-indigo-600 hover:shadow-sm transition-all">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                     </div>
                     <button onClick={confirmDelete} className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                     </button>
                  </>
                ) : (
                  <div className="flex items-center gap-2 bg-red-50 p-1 rounded-lg border border-red-100 animate-in fade-in zoom-in-95">
                    <button onClick={executeDelete} className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-md hover:bg-red-700 shadow-sm">Xóa</button>
                    <button onClick={cancelDelete} className="px-3 py-1.5 bg-white text-slate-600 text-xs font-bold rounded-md hover:bg-slate-100">Hủy</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="p-6 grid grid-cols-1 gap-8">
        
        {/* Section 1: Nội dung chính (Clean White Card style) */}
        <div className="relative pl-4 border-l-4 border-emerald-500">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Nội dung chính</h4>
            {isEditing && (
              <button onClick={() => handlePolish('noiDung', 'Nội dung')} disabled={isPolishing === 'noiDung'} className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded hover:bg-emerald-100">
                {isPolishing === 'noiDung' ? '...' : 'AI Refine'}
              </button>
            )}
          </div>
          {isEditing ? (
            <textarea 
              className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3 min-h-[120px] focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none"
              value={editedNote.noiDung}
              onChange={(e) => setEditedNote({ ...editedNote, noiDung: e.target.value })}
            />
          ) : (
            <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{note.noiDung}</p>
          )}
        </div>

        {/* Split Section: Cons & Improvements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Nhược điểm */}
          <div className="relative pl-4 border-l-4 border-rose-400">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Nhược điểm</h4>
              {isEditing && (
                <button onClick={() => handlePolish('nhuocDiem', 'Nhược điểm')} disabled={isPolishing === 'nhuocDiem'} className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded hover:bg-rose-100">AI Refine</button>
              )}
            </div>
            {isEditing ? (
              <textarea 
                className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3 min-h-[100px] focus:ring-2 focus:ring-rose-100 focus:border-rose-300 outline-none"
                value={editedNote.nhuocDiem}
                onChange={(e) => setEditedNote({ ...editedNote, nhuocDiem: e.target.value })}
              />
            ) : (
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{note.nhuocDiem}</p>
            )}
          </div>

          {/* Cải thiện */}
          <div className="relative pl-4 border-l-4 border-blue-400">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Giải pháp & Cải thiện</h4>
              {isEditing && (
                <button onClick={() => handlePolish('caiThien', 'Cải thiện')} disabled={isPolishing === 'caiThien'} className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100">AI Refine</button>
              )}
            </div>
            {isEditing ? (
              <textarea 
                className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3 min-h-[100px] focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none"
                value={editedNote.caiThien}
                onChange={(e) => setEditedNote({ ...editedNote, caiThien: e.target.value })}
              />
            ) : (
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{note.caiThien}</p>
            )}
          </div>
        </div>

        {/* Important Notes */}
        <div className="bg-amber-50/50 rounded-xl p-5 border border-amber-100/50">
          <div className="flex justify-between items-center mb-3">
             <h4 className="text-sm font-bold text-amber-800 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                CHÚ Ý QUAN TRỌNG
             </h4>
             {isEditing && <button onClick={handleAddImportant} className="text-xs bg-white text-amber-600 px-2 py-1 rounded border border-amber-200 hover:bg-amber-50">+ Thêm</button>}
          </div>
          <ul className="space-y-2">
            {(isEditing ? editedNote.chuYQuanTrong : note.chuYQuanTrong).map((item, idx) => (
              <li key={idx} className="flex items-start text-sm text-slate-700">
                <span className="text-amber-500 mr-2 mt-1">•</span>
                {isEditing ? (
                   <div className="flex-1 flex gap-2">
                      <input className="flex-1 bg-white border border-amber-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-amber-400" value={item} onChange={(e) => handleUpdateImportant(idx, e.target.value)} />
                      <button onClick={() => handleRemoveImportant(idx)} className="text-rose-400 hover:text-rose-600">x</button>
                   </div>
                ) : (
                   <span>{item}</span>
                )}
              </li>
            ))}
            {!isEditing && note.chuYQuanTrong.length === 0 && <span className="text-slate-400 text-xs italic">Không có lưu ý đặc biệt.</span>}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default NoteCard;
