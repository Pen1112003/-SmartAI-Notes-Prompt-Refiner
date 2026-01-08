
import React, { useState } from 'react';
import { Note } from '../types';

interface NoteCardProps {
  note: Note;
  onDelete: (id: string) => void;
  onUpdate: (updatedNote: Note) => void;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, onDelete, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedNote, setEditedNote] = useState<Note>({ ...note });

  const handleSave = () => {
    onUpdate(editedNote);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedNote({ ...note });
    setIsEditing(false);
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

  const exportToWorkspace = () => {
    const date = new Date(note.timestamp);
    const fileName = `Meeting Note ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    
    const content = `
${fileName}
-------------------------------------------

1. NỘI DUNG CHÍNH:
${note.noiDung}

2. NHƯỢC ĐIỂM / CẦN LƯU Ý:
${note.nhuocDiem}

3. CẢI THIỆN / GIẢI PHÁP:
${note.caiThien}

4. CHÚ Ý QUAN TRỌNG:
${note.chuYQuanTrong.map(item => `• ${item}`).join('\n')}

-------------------------------------------
Transcript raw:
${note.transcript}
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    alert(`Đã tạo tệp "${fileName}". Bạn có thể tải lên Google Drive hoặc dán vào Google Docs.`);
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
              <button 
                onClick={handleSave}
                className="p-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 flex items-center space-x-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-xs font-bold px-1 uppercase">Lưu</span>
              </button>
              <button 
                onClick={handleCancel}
                className="p-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => setIsEditing(true)}
                title="Chỉnh sửa ghi chú"
                className="p-3 bg-slate-50 text-slate-500 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-all shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button 
                onClick={exportToWorkspace}
                title="Xuất sang Google Workspace"
                className="p-3 bg-green-50 text-green-600 rounded-2xl hover:bg-green-100 transition-colors shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
              <button 
                onClick={() => onDelete(note.id)}
                className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-colors shadow-sm"
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
        {/* Section 1: Nội dung */}
        <div className={`p-6 rounded-3xl border transition-all ${isEditing ? 'bg-emerald-50 border-emerald-300' : 'bg-emerald-50/50 border-emerald-100'}`}>
          <h4 className="text-xs font-black text-emerald-700 uppercase tracking-widest mb-3 flex items-center">
            <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
            1. Nội dung chính
          </h4>
          {isEditing ? (
            <textarea 
              className="text-slate-700 text-sm leading-relaxed font-medium w-full bg-white/50 border border-emerald-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-200 min-h-[100px]"
              value={editedNote.noiDung}
              onChange={(e) => setEditedNote({ ...editedNote, noiDung: e.target.value })}
            />
          ) : (
            <p className="text-slate-700 text-sm leading-relaxed font-medium whitespace-pre-wrap">{note.noiDung}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section 2: Nhược điểm */}
          <div className={`p-6 rounded-3xl border transition-all ${isEditing ? 'bg-rose-50 border-rose-300' : 'bg-rose-50/50 border-rose-100'}`}>
            <h4 className="text-xs font-black text-rose-700 uppercase tracking-widest mb-3 flex items-center">
              <span className="w-2 h-2 bg-rose-500 rounded-full mr-2"></span>
              2. Nhược điểm
            </h4>
            {isEditing ? (
              <textarea 
                className="text-slate-700 text-sm leading-relaxed w-full bg-white/50 border border-rose-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-rose-200 min-h-[100px]"
                value={editedNote.nhuocDiem}
                onChange={(e) => setEditedNote({ ...editedNote, nhuocDiem: e.target.value })}
              />
            ) : (
              <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{note.nhuocDiem}</p>
            )}
          </div>

          {/* Section 3: Cải thiện */}
          <div className={`p-6 rounded-3xl border transition-all ${isEditing ? 'bg-blue-50 border-blue-300' : 'bg-blue-50/50 border-blue-100'}`}>
            <h4 className="text-xs font-black text-blue-700 uppercase tracking-widest mb-3 flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
              3. Cải thiện
            </h4>
            {isEditing ? (
              <textarea 
                className="text-slate-700 text-sm leading-relaxed w-full bg-white/50 border border-blue-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-200 min-h-[100px]"
                value={editedNote.caiThien}
                onChange={(e) => setEditedNote({ ...editedNote, caiThien: e.target.value })}
              />
            ) : (
              <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{note.caiThien}</p>
            )}
          </div>
        </div>

        {/* Section 4: Chú ý quan trọng */}
        <div className={`p-6 rounded-3xl border-2 transition-all relative overflow-hidden ${isEditing ? 'bg-amber-100 border-amber-400' : 'bg-amber-50 border-amber-200'}`}>
          <div className="absolute top-0 right-0 p-2 opacity-10">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.382-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
          </div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-xs font-black text-amber-700 uppercase tracking-widest flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              4. Chú ý quan trọng (Note lại đi...)
            </h4>
            {isEditing && (
              <button 
                onClick={handleAddImportant}
                className="text-xs bg-amber-600 text-white px-3 py-1 rounded-full font-black hover:bg-amber-700 transition-colors shadow-sm"
              >
                + THÊM Ý
              </button>
            )}
          </div>
          
          <ul className="space-y-3">
            {(isEditing ? editedNote.chuYQuanTrong : note.chuYQuanTrong).length > 0 ? (
              (isEditing ? editedNote.chuYQuanTrong : note.chuYQuanTrong).map((item, idx) => (
                <li key={idx} className="flex items-start bg-white/60 p-3 rounded-xl border border-amber-100 shadow-sm group/item">
                  <span className="text-amber-500 mr-2 font-bold mt-0.5">•</span>
                  {isEditing ? (
                    <div className="flex-1 flex items-center space-x-2">
                      <input 
                        className="flex-1 bg-transparent border-b border-amber-200 outline-none focus:border-amber-500 text-sm font-bold text-slate-800"
                        value={item}
                        onChange={(e) => handleUpdateImportant(idx, e.target.value)}
                        placeholder="Nhập ghi chú quan trọng..."
                        autoFocus={idx === editedNote.chuYQuanTrong.length - 1 && item === ''}
                      />
                      <button 
                        onClick={() => handleRemoveImportant(idx)}
                        className="text-rose-400 hover:text-rose-600 p-1 opacity-0 group-hover/item:opacity-100 transition-opacity"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <span className="text-slate-800 text-sm font-bold">{item}</span>
                  )}
                </li>
              ))
            ) : (
              !isEditing && <p className="text-slate-400 text-xs italic">Không phát hiện ghi chú quan trọng đặc biệt.</p>
            )}
          </ul>
        </div>

        <details className="mt-4 opacity-50 hover:opacity-100 transition-opacity">
          <summary className="text-xs font-bold text-slate-400 cursor-pointer uppercase tracking-tighter">Transcript Raw</summary>
          <div className="mt-2 p-4 bg-slate-50 rounded-2xl text-xs text-slate-500 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
            {note.transcript}
          </div>
        </details>
      </div>
    </div>
  );
};

export default NoteCard;
