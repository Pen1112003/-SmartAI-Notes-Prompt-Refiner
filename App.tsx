
import React, { useState, useEffect, useCallback } from 'react';
import { Note, RecordingStatus } from './types';
import Header from './components/Header';
import Recorder from './components/Recorder';
import NoteCard from './components/NoteCard';
import { refineNoteWithAI } from './services/geminiService';

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

  // Lưu vào localStorage, loại bỏ các ghi chú đang xử lý để tránh lưu dữ liệu rác
  useEffect(() => {
    const notesToSave = notes.filter(n => !n.isProcessing);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notesToSave));
  }, [notes]);

  const handleFinalTranscript = useCallback(async (transcript: string) => {
    if (!transcript.trim()) return;

    const tempId = crypto.randomUUID();
    const timestamp = Date.now();

    // Tạo một ghi chú "chờ" (Skeleton Note) ngay lập tức để phản hồi người dùng
    const pendingNote: Note = {
      id: tempId,
      timestamp,
      title: 'Đang tóm tắt nội dung...',
      transcript: transcript,
      noiDung: '',
      nhuocDiem: '',
      caiThien: '',
      chuYQuanTrong: [],
      isProcessing: true
    };

    setNotes(prev => [pendingNote, ...prev]);
    
    // Đặt lại trạng thái recorder về IDLE ngay lập tức để người dùng có thể ghi âm tiếp
    setStatus(RecordingStatus.IDLE);

    try {
      // AI xử lý ở chế độ nền
      const aiResponse = await refineNoteWithAI(transcript);
      
      setNotes(prev => prev.map(n => n.id === tempId ? {
        ...n,
        title: aiResponse.title || 'Meeting Note',
        noiDung: aiResponse.noiDung || 'Không có tóm tắt.',
        nhuocDiem: aiResponse.nhuocDiem || 'Không có dữ liệu.',
        caiThien: aiResponse.caiThien || 'Không có đề xuất.',
        chuYQuanTrong: aiResponse.chuYQuanTrong || [],
        isProcessing: false
      } : n));

    } catch (error) {
      console.error("AI Refinement failed", error);
      setNotes(prev => prev.map(n => n.id === tempId ? {
        ...n,
        title: `Lỗi xử lý AI - ${new Date(timestamp).toLocaleTimeString()}`,
        noiDung: "Đã có lỗi xảy ra khi AI tóm tắt. Transcript vẫn được lưu lại.",
        isProcessing: false
      } : n));
    }
  }, []);

  const deleteNote = (id: string) => {
    if (window.confirm("Bạn có muốn xóa ghi chú này không?")) {
      setNotes(prev => prev.filter(note => note.id !== id));
    }
  };

  const updateNote = (updatedNote: Note) => {
    setNotes(prev => prev.map(note => note.id === updatedNote.id ? updatedNote : note));
  };

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
        <p>© {new Date().getFullYear()} SmartAI Meeting Note v2.1 (Performance Optimized)</p>
      </footer>
    </div>
  );
};

export default App;
