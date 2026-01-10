
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
      title: 'Đang xử lý nội dung...',
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
    <div className="min-h-screen flex flex-col bg-[#F3F4F6] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/40 via-slate-50 to-white text-slate-800 font-sans">
      <Header />
      
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 md:py-12 space-y-10">
        {/* Recorder Section - Sticky but with backdrop blur for cleaner overlay */}
        <section className="sticky top-20 z-20">
          <Recorder 
            status={status} 
            onStatusChange={setStatus}
            onFinalTranscript={handleFinalTranscript} 
          />
        </section>

        {/* Notes List Section */}
        <section className="pb-24">
          <div className="flex items-end justify-between mb-6 px-2">
            <div>
              <h2 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center">
                Lịch sử ghi chú
              </h2>
              <p className="text-slate-500 text-sm mt-1">Danh sách các cuộc họp đã được AI xử lý</p>
            </div>
            
            <div className="flex items-center gap-3">
               <span className="px-3 py-1 text-xs font-bold bg-white text-indigo-600 rounded-full border border-indigo-100 shadow-sm">
                {notes.length} bản ghi
              </span>
              
              {notes.length > 0 && (
                <div className="relative">
                  {!showClearConfirm ? (
                    <button 
                      onClick={() => setShowClearConfirm(true)}
                      className="text-xs font-bold text-slate-500 hover:text-red-600 px-3 py-2 bg-white hover:bg-red-50 rounded-xl transition-all border border-slate-200 hover:border-red-200 shadow-sm flex items-center gap-2 group"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400 group-hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Xóa tất cả
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 animate-in slide-in-from-right-4 duration-200 bg-white p-1 pr-1.5 rounded-xl border border-red-100 shadow-sm">
                      <button 
                        onClick={handleClearAll}
                        className="text-xs font-bold bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                      >
                        Xác nhận xóa
                      </button>
                      <button 
                        onClick={() => setShowClearConfirm(false)}
                        className="text-xs font-bold text-slate-500 hover:bg-slate-100 px-2 py-1.5 rounded-lg transition-colors"
                      >
                        Hủy
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {notes.length === 0 ? (
            <div className="text-center py-24 bg-white/60 backdrop-blur-sm rounded-3xl border border-dashed border-slate-300">
              <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <p className="text-slate-500 font-medium">Chưa có ghi chú nào. Nhấn nút ghi âm để bắt đầu!</p>
            </div>
          ) : (
            <div className="space-y-6">
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
      
      <footer className="py-8 text-center text-slate-400 text-xs font-medium border-t border-slate-200/60 bg-white/40 backdrop-blur-md">
        <p>© {new Date().getFullYear()} SmartAI Meeting Note v2.3 - Powered by Google Gemini</p>
      </footer>
    </div>
  );
};

export default App;
