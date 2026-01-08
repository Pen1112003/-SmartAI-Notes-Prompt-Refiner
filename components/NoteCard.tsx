
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
  const [editedNote, setEditedNote] = useState<Note>({ ...note });

  if (note.isProcessing) {
    return (
      <div className="bg-white rounded-[2rem] border border-slate-100 p-8 mb-8 animate-pulse shadow-sm">
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1 space-y-3">
            <div className="h-7 bg-slate-200 rounded-lg w-3/4"></div>
            <div className="h-4 bg-slate-100 rounded-lg w-1/4"></div>
          </div>
          <div className="flex space-x-2">
            <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-24 bg-emerald-50/50 rounded-3xl border border-emerald-100"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-24 bg-rose-50/50 rounded-3xl border border-rose-100"></div>
            <div className="h-24 bg-blue-50/50 rounded-3xl border border-blue-100"></div>
          </div>
          <div className="h-16 bg-amber-50 rounded-3xl border border-amber-100"></div>
        </div>
        <p className="text-center text-[10px] font-black text-indigo-400 mt-4 uppercase tracking-widest animate-bounce">
          ✨ Gemini đang tinh luyện ghi chú của bạn...
        </p>
      </div>
    );
  }

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
    const headerTitle = note.title.toUpperCase() || "MEETING NOTE";
    const dateStr = new Date(note.timestamp).toLocaleString('vi-VN');
    
    let content = `${headerTitle}\n`;
    content += `==========================================\n`;
    content += `Ngày tạo: ${dateStr}\n`;
    content += `Hệ thống: SmartAI Meeting Notes\n`;
    content += `==========================================\n\n`;

    content += `1. NỘI DUNG CHÍNH\n`;
    content += `------------------------------------------\n`;
    content += `${note.noiDung}\n\n`;

    content += `2. NHƯỢC ĐIỂM\n`;
    content += `------------------------------------------\n`;
    content += `${note.nhuocDiem}\n\n`;

    content += `3. CẢI THIỆN\n`;
    content += `------------------------------------------\n`;
    content += `${note.caiThien}\n\n`;

    content += `4. CHÚ Ý QUAN TRỌNG\n`;
    content += `------------------------------------------\n`;
    note.chuYQuanTrong.filter(item => item.trim() !== '').forEach(item => {
      content += `• ${item}\n`;
    });
    content += `\n`;

    content += `TRANSCRIPT GỐC (ĐÃ XỬ LÝ AI)\n`;
    content += `------------------------------------------\n`;
    content += `${note.transcript}\n\n`;

    content += `==========================================\n`;
    content += `© SmartAI Meeting Notes v2.2 - AI Correction Active`;
    
    return content;
  };

  const exportToTxt = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = generatePlainTextContent();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = note.title.replace(/[^a-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ\s]/gi, '').replace(/\s+/g, '_');
    a.download = `${safeTitle || 'Meeting_Note'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyForDocs = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const dateStr = new Date(note.timestamp).toLocaleString('vi-VN');
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #334155;">
        <h1 style="color: #1e293b; border-bottom: 2px solid #4f46e5; padding-bottom: 8px;">${note.title}</h1>
        <p style="color: #64748b; font-size: 12px;">Ngày tạo: ${dateStr}</p>
        
        <h2 style="color: #059669; font-size: 16px; background: #ecfdf5; padding: 8px; border-radius: 4px;">1. Nội dung chính</h2>
        <p>${note.noiDung.replace(/\n/g, '<br>')}</p>

        <h2 style="color: #dc2626; font-size: 16px; background: #fff1f2; padding: 8px; border-radius: 4px;">2. Nhược điểm</h2>
        <p>${note.nhuocDiem.replace(/\n/g, '<br>')}</p>

        <h2 style="color: #2563eb; font-size: 16px; background: #eff6ff; padding: 8px; border-radius: 4px;">3. Cải thiện</h2>
        <p>${note.caiThien.replace(/\n/g, '<br>')}</p>

        <h2 style="color: #d97706; font-size: 16px; background: #fffbeb; padding: 8px; border-radius: 4px;">4. Chú ý quan trọng</h2>
        <ul>
          ${note.chuYQuanTrong.filter(item => item.trim() !== '').map(item => `<li style="font-weight: bold; margin-bottom: 4px;">${item}</li>`).join('')}
        </ul>
        <hr style="margin-top: 24px; border: 0.5px solid #e2e8f0;">
        <p style="font-size: 10px; color: #94a3b8; text-align: center;">Tạo bởi SmartAI Meeting Notes</p>
      </div>
    `;

    try {
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const data = [new ClipboardItem({ 'text/html': blob })];
      await navigator.clipboard.write(data);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (err) {
      await navigator.clipboard.writeText(`${note.title}\n\n${note.noiDung}`);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  };

  const handleAddImportant = () => {
    setEditedNote(prev => ({
      ...prev,
      chuYQuanTrong: [...prev.chuYQuanTrong, '']
    }));
  };

  const handleUpdateImportant = (index: number, value: string) => {
    const newList = [...editedNote.chuYQuanTrong];
    newList[index] = value;
    setEditedNote(prev => ({ ...prev, chuYQuanTrong: newList }));
  };

  const handleRemoveImportant = (index: number) => {
    const newList = editedNote.chuYQuanTrong.filter((_, i) => i !== index);
    setEditedNote(prev => ({ ...prev, chuYQuanTrong: newList }));
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(note.id);
  };

  return (
    <div className={`bg-white rounded-[2rem] border transition-all duration-300 p-8 mb-8 overflow-hidden group shadow-sm ${isEditing ? 'border-indigo-400 ring-2 ring-indigo-50 shadow-2xl' : 'border-slate-100 hover:shadow-xl'}`}>
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1">
          {isEditing ? (
            <input 
              className="text-2xl font-black text-slate-900 w-full border-b-2 border-indigo-200 focus:border-indigo-500 outline-none bg-indigo-50/30 px-2 py-1 rounded-t-lg transition-all"
              value={editedNote.title}
              onChange={(e) => setEditedNote({ ...editedNote, title: e.target.value })}
              placeholder="Tiêu đề cuộc họp..."
            />
          ) : (
            <h3 className="text-2xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{note.title}</h3>
          )}
          <p className="text-sm text-slate-400 font-bold uppercase tracking-wider mt-1">
            {new Date(note.timestamp).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="flex space-x-2 ml-4">
          {isEditing ? (
            <>
              <button onClick={handleSave} className="p-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 flex items-center space-x-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-xs font-bold px-1 uppercase">Lưu</span>
              </button>
              <button onClick={handleCancel} className="p-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={copyForDocs} 
                title="Copy định dạng để dán vào Google Docs" 
                className={`p-3 rounded-2xl transition-all shadow-sm flex items-center space-x-2 ${copyFeedback ? 'bg-green-600 text-white' : 'bg-slate-50 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'}`}
              >
                {copyFeedback ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                )}
              </button>
              
              <button 
                onClick={exportToTxt} 
                title="Tải file văn bản (.txt)" 
                className="p-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>

              <button onClick={() => setIsEditing(true)} title="Chỉnh sửa" className="p-3 bg-slate-50 text-slate-500 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-all shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              
              <button 
                onClick={handleDelete} 
                title="Xóa ghi chú"
                className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-colors shadow-sm cursor-pointer z-10"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className={`p-6 rounded-3xl border transition-all ${isEditing ? 'bg-emerald-50 border-emerald-300' : 'bg-emerald-50/50 border-emerald-100'}`}>
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-xs font-black text-emerald-700 uppercase tracking-widest flex items-center">
              <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
              1. Nội dung chính
            </h4>
            {isEditing && (
              <button 
                onClick={() => handlePolish('noiDung', 'Nội dung chính')}
                disabled={isPolishing === 'noiDung'}
                className="text-[10px] bg-emerald-600 text-white px-2 py-1 rounded-lg font-black hover:bg-emerald-700 disabled:opacity-50 flex items-center"
              >
                {isPolishing === 'noiDung' ? 'ĐANG XỬ LÝ...' : '✨ AI POLISH'}
              </button>
            )}
          </div>
          {isEditing ? (
            <textarea 
              className="text-slate-700 text-sm leading-relaxed font-medium w-full bg-white/50 border border-emerald-200 rounded-xl p-3 focus:outline-none min-h-[100px]"
              value={editedNote.noiDung}
              onChange={(e) => setEditedNote({ ...editedNote, noiDung: e.target.value })}
            />
          ) : (
            <p className="text-slate-700 text-sm leading-relaxed font-medium whitespace-pre-wrap">{note.noiDung}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={`p-6 rounded-3xl border transition-all ${isEditing ? 'bg-rose-50 border-rose-300' : 'bg-rose-50/50 border-rose-100'}`}>
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-black text-rose-700 uppercase tracking-widest flex items-center">
                <span className="w-2 h-2 bg-rose-500 rounded-full mr-2"></span>
                2. Nhược điểm
              </h4>
              {isEditing && (
                <button 
                  onClick={() => handlePolish('nhuocDiem', 'Nhược điểm')}
                  disabled={isPolishing === 'nhuocDiem'}
                  className="text-[10px] bg-rose-600 text-white px-2 py-1 rounded-lg font-black hover:bg-rose-700 disabled:opacity-50"
                >
                  ✨ AI POLISH
                </button>
              )}
            </div>
            {isEditing ? (
              <textarea 
                className="text-slate-700 text-sm leading-relaxed w-full bg-white/50 border border-rose-200 rounded-xl p-3 focus:outline-none min-h-[100px]"
                value={editedNote.nhuocDiem}
                onChange={(e) => setEditedNote({ ...editedNote, nhuocDiem: e.target.value })}
              />
            ) : (
              <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{note.nhuocDiem}</p>
            )}
          </div>

          <div className={`p-6 rounded-3xl border transition-all ${isEditing ? 'bg-blue-50 border-blue-300' : 'bg-blue-50/50 border-blue-100'}`}>
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-black text-blue-700 uppercase tracking-widest flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                3. Cải thiện
              </h4>
              {isEditing && (
                <button 
                  onClick={() => handlePolish('caiThien', 'Cải thiện')}
                  disabled={isPolishing === 'caiThien'}
                  className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded-lg font-black hover:bg-blue-700 disabled:opacity-50"
                >
                  ✨ AI POLISH
                </button>
              )}
            </div>
            {isEditing ? (
              <textarea 
                className="text-slate-700 text-sm leading-relaxed w-full bg-white/50 border border-blue-200 rounded-xl p-3 focus:outline-none min-h-[100px]"
                value={editedNote.caiThien}
                onChange={(e) => setEditedNote({ ...editedNote, caiThien: e.target.value })}
              />
            ) : (
              <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{note.caiThien}</p>
            )}
          </div>
        </div>

        <div className={`p-6 rounded-3xl border-2 transition-all relative overflow-hidden ${isEditing ? 'bg-amber-100 border-amber-400' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-xs font-black text-amber-700 uppercase tracking-widest flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              4. Chú ý quan trọng (Note lại đi...)
            </h4>
            {isEditing && (
              <button onClick={handleAddImportant} className="text-xs bg-amber-600 text-white px-3 py-1 rounded-full font-black hover:bg-amber-700 shadow-sm">+ THÊM Ý</button>
            )}
          </div>
          <ul className="space-y-3">
            {(isEditing ? editedNote.chuYQuanTrong : note.chuYQuanTrong).map((item, idx) => (
              <li key={idx} className="flex items-start bg-white/60 p-3 rounded-xl border border-amber-100 shadow-sm group/item">
                <span className="text-amber-500 mr-2 font-bold mt-0.5">•</span>
                {isEditing ? (
                  <div className="flex-1 flex items-center space-x-2">
                    <input className="flex-1 bg-transparent border-b border-amber-200 outline-none focus:border-amber-500 text-sm font-bold text-slate-800" value={item} onChange={(e) => handleUpdateImportant(idx, e.target.value)} />
                    <button onClick={() => handleRemoveImportant(idx)} className="text-rose-400 hover:text-rose-600 opacity-0 group-hover/item:opacity-100">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </button>
                  </div>
                ) : (
                  <span className="text-slate-800 text-sm font-bold">{item}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default NoteCard;
