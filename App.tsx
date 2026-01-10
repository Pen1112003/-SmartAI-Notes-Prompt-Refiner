
import React, { useState, useEffect, useCallback } from 'react';
import { Note, RecordingStatus } from './types';
import Header from './components/Header';
import Recorder from './components/Recorder';
import NoteCard from './components/NoteCard';
import { refineNoteWithAI, cleanRawTranscript } from './services/geminiService';

const STORAGE_KEY = 'smart_ai_notes_v3_vn';

const App: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [status, setStatus] = useState<RecordingStatus>(RecordingStatus.IDLE);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    const notesToSave = notes.filter(n => !n.isProcessing);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notesToSave));
  }, [notes]);

  const handleFinalTranscript = useCallback(async (rawTranscript: string) => {
    if (!rawTranscript.trim()) return;

    const tempId = typeof crypto.randomUUID === 'function' 
      ? crypto.randomUUID() 
      : Math.random().toString(36).substring(2, 15);
      
    const timestamp = Date.now();

    const pendingNote: Note = {
      id: tempId,
      timestamp,
      title: 'Đang xử lý nội dung & lọc tạp âm...',
      transcript: rawTranscript,
      noiDung: '',
      nhuocDiem: '',
      caiThien: '',
      chuYQuanTrong: [],
      isProcessing: true
    };

    setNotes(prev => [pendingNote, ...prev]);
    setStatus(RecordingStatus.IDLE);

    try {
      const cleanedTranscript = await cleanRawTranscript(rawTranscript);
      const aiResponse = await refineNoteWithAI(cleanedTranscript);
      
      setNotes(prev => prev.map(n => n.id === tempId ? {
        ...n,
        title: aiResponse.title || 'Meeting Note',
        transcript: cleanedTranscript,
        noiDung: aiResponse.noiDung || 'Không có tóm tắt.',
        nhuocDiem: aiResponse.nhuocDiem || 'Không có dữ liệu.',
        caiThien: aiResponse.caiThien || 'Không có đề xuất.',
        chuYQuanTrong: aiResponse.chuYQuanTrong || [],
        isProcessing: false
      } : n));

    } catch (error) {
      console.error("AI processing failed", error);
      setNotes(prev => prev.map(n => n.id === tempId ? {
        ...n,
        title: `Lỗi xử lý AI - ${new Date(timestamp).toLocaleTimeString()}`,
        noiDung: "Đã có lỗi xảy ra. Transcript thô đã được lưu lại.",
        isProcessing: false
      } : n));
    }
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes(prev => prev.filter(note => note.id !== id));
  }, []);

  const handleClearAll = () => {
    setNotes([]);
    setShowClearConfirm(false);
  };

  const updateNote = useCallback((updatedNote: Note) => {
    setNotes(prev => prev.map(note => note.id === updatedNote.id ? updatedNote : note));
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 md:py-12 space-y-12">
        <section className="sticky top-20 z-20">
          <Recorder 
            status={status} 
            onStatusChange={setStatus}
            onFinalTranscript={handleFinalTranscript} 
          />
        </section>

        <section className="pb-20">
          <div className="flex items-center justify-between mb-8 border-b border-slate-200 pb-4">
            <h2 className="text-2xl font-black text-slate-900 flex items-center">
              Lịch sử ghi chú
              <span className="ml-3 px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-full font-bold">
                {notes.length}
              </span>
            </h2>
            
            {notes.length > 0 && (
              <div className="relative flex items-center">
                {!showClearConfirm ? (
                  <button 
                    onClick={() => setShowClearConfirm(true)}
                    className="text-xs font-black text-red-500 hover:text-red-700 uppercase tracking-widest px-4 py-2 bg-red-50 rounded-xl transition-all flex items-center hover:shadow-md active:scale-95"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Xóa sạch
                  </button>
                ) : (
                  <div className="flex items-center space-x-2 animate-in slide-in-from-right-4 duration-200">
                    <span className="text-[10px] font-black text-red-600 uppercase tracking-tighter mr-1">Chắc chứ?</span>
                    <button 
                      onClick={handleClearAll}
                      className="text-xs font-black bg-red-600 text-white px-3 py-2 rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-100"
                    >
                      XÓA HẾT
                    </button>
                    <button 
                      onClick={() => setShowClearConfirm(false)}
                      className="text-xs font-black bg-slate-200 text-slate-600 px-3 py-2 rounded-xl hover:bg-slate-300 transition-colors"
                    >
                      HỦY
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {notes.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
              <p className="text-slate-400 font-bold">Chưa có ghi chú nào được lưu. Hãy bắt đầu ghi âm!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notes.map(note => (
                <NoteCard 
                  key={note.id} 
                  note={note} 
                  onDelete={deleteNote} 
                  onUpdate={updateNote}
                />
              ))}
            </div>
          )}
        </section>
      </main>
      <footer className="py-8 text-center text-slate-400 text-xs">
        <p>© {new Date().getFullYear()} SmartAI Meeting Note v2.2 (AI Auto-Correction Active)</p>
      </footer>
    </div>
  );
};

export default App;
