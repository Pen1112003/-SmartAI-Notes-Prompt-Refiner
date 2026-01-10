
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { RecordingStatus } from '../types';
import { encodeBase64 } from '../services/geminiService';

interface RecorderProps {
  onFinalTranscript: (transcript: string) => void;
  status: RecordingStatus;
  onStatusChange: (status: RecordingStatus) => void;
}

const Recorder: React.FC<RecorderProps> = ({ onFinalTranscript, status, onStatusChange }) => {
  const [currentText, setCurrentText] = useState('');
  const [duration, setDuration] = useState(0);
  const [hasImportantFlag, setHasImportantFlag] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const timerRef = useRef<number | null>(null);
  const fullTranscriptRef = useRef('');
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (currentText.toLowerCase().includes("note lại đi") || currentText.toLowerCase().includes("ghi lại")) {
      setHasImportantFlag(true);
      const timer = setTimeout(() => setHasImportantFlag(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [currentText]);

  const stopEverything = () => {
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch (e) {}
      sessionRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (e) {}
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    onStatusChange(RecordingStatus.IDLE);
  };

  const handleStop = () => {
    const final = fullTranscriptRef.current;
    stopEverything();
    if (final && final.trim().length > 0) {
      onFinalTranscript(final);
    }
  };

  const startLiveRecording = async () => {
    try {
      onStatusChange(RecordingStatus.CONNECTING);
      setCurrentText('');
      fullTranscriptRef.current = '';
      setDuration(0);

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let sessionPromise: Promise<any>;

      const startAudioStreaming = async () => {
        try {
          // Kích hoạt Auto Gain Control và Noise Suppression từ trình duyệt
          const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              autoGainControl: true,
              echoCancellation: true,
              noiseSuppression: true,
              channelCount: 1
            } 
          });
          
          streamRef.current = stream;
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
          
          const source = audioContextRef.current.createMediaStreamSource(stream);
          
          // Thêm GainNode để khuếch đại âm thanh nhỏ (Sensitivity Boost)
          const gainNode = audioContextRef.current.createGain();
          gainNode.gain.value = 2.5; // Tăng cường độ âm thanh lên 2.5 lần
          
          const scriptProcessor = audioContextRef.current.createScriptProcessor(4096, 1, 1);

          scriptProcessor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const int16 = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              // Chuyển đổi sang PCM 16-bit
              int16[i] = Math.max(-1, Math.min(1, inputData[i])) * 32768;
            }
            const base64 = encodeBase64(new Uint8Array(int16.buffer));
            sessionPromise.then((session) => {
              session.sendRealtimeInput({ media: { data: base64, mimeType: 'audio/pcm;rate=16000' } });
            });
          };

          // Pipeline: Source -> Gain (Amplify) -> ScriptProcessor
          source.connect(gainNode);
          gainNode.connect(scriptProcessor);
          scriptProcessor.connect(audioContextRef.current.destination);
          
          timerRef.current = window.setInterval(() => setDuration(prev => prev + 1), 1000);
        } catch (err) {
          console.error("Audio stream error:", err);
          onStatusChange(RecordingStatus.ERROR);
          stopEverything();
        }
      };
      
      sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: { 
          responseModalities: [Modality.AUDIO], 
          inputAudioTranscription: {},
          systemInstruction: "Bạn là một trợ lý ghi âm chuyên nghiệp. Bạn có khả năng nghe cực tốt ngay cả với âm thanh nhỏ hoặc xa. Hãy tập trung nhận diện giọng nói, bỏ qua tạp âm trắng. Nếu người nói nói nhỏ, hãy cố gắng suy luận từ ngữ dựa trên ngữ cảnh cuộc họp."
        },
        callbacks: {
          onopen: () => {
            onStatusChange(RecordingStatus.RECORDING);
            sessionPromise.then(session => sessionRef.current = session);
            startAudioStreaming();
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              fullTranscriptRef.current += text;
              setCurrentText(prev => prev + text);
            }
          },
          onerror: (e) => { 
            console.error("Live session error:", e);
            onStatusChange(RecordingStatus.ERROR); 
            stopEverything(); 
          },
          onclose: () => { if (status === RecordingStatus.RECORDING) handleStop(); }
        }
      });
    } catch (err) {
      console.error("Connection error:", err);
      onStatusChange(RecordingStatus.ERROR);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col space-y-6">
      <div className={`flex flex-col items-center justify-center p-8 bg-white rounded-[2.5rem] shadow-2xl transition-all duration-500 border-2 ${hasImportantFlag ? 'border-amber-400 shadow-amber-100' : 'border-slate-100 shadow-indigo-100'}`}>
        <div className="relative mb-6">
          {status === RecordingStatus.RECORDING && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`w-24 h-24 rounded-full animate-ping opacity-20 ${hasImportantFlag ? 'bg-amber-500' : 'bg-indigo-500'}`}></div>
              <div className={`w-20 h-20 rounded-full animate-ping opacity-30 delay-75 ${hasImportantFlag ? 'bg-amber-400' : 'bg-indigo-400'}`}></div>
            </div>
          )}
          <button
            onClick={status === RecordingStatus.RECORDING ? handleStop : startLiveRecording}
            disabled={status === RecordingStatus.PROCESSING || status === RecordingStatus.CONNECTING}
            className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 transform active:scale-90 shadow-xl disabled:opacity-50 ${
              status === RecordingStatus.RECORDING 
                ? 'bg-red-500 hover:bg-red-600 shadow-red-200' 
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-300'
            }`}
          >
            {status === RecordingStatus.RECORDING ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : status === RecordingStatus.CONNECTING ? (
              <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>
        </div>

        <div className="text-center">
          <p className="text-xl font-bold text-slate-800">
            {status === RecordingStatus.RECORDING ? 'Đang lắng nghe...' : status === RecordingStatus.CONNECTING ? 'Kết nối Gemini Live...' : status === RecordingStatus.PROCESSING ? 'AI đang tóm tắt...' : 'Bắt đầu Meeting Note'}
          </p>
          <div className="flex items-center justify-center space-x-2 mt-1">
             <p className={`text-sm font-medium ${status === RecordingStatus.RECORDING ? 'text-indigo-600' : 'text-slate-400'}`}>
              {status === RecordingStatus.RECORDING ? `Thời lượng: ${formatDuration(duration)}` : 'Hỗ trợ ghi chú thông minh tự động'}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
             {status === RecordingStatus.RECORDING && (
               <>
                <span className="flex items-center px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-tighter animate-pulse border border-indigo-100">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Noise Filter Active
                </span>
                <span className="flex items-center px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-tighter border border-emerald-100">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Sensitivity Boost (2.5x)
                </span>
               </>
             )}
             {hasImportantFlag && (
                <div className="py-1 px-3 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black animate-bounce border border-amber-200 uppercase tracking-tighter">
                  ⭐ PHÁT HIỆN MỤC QUAN TRỌNG
                </div>
             )}
          </div>
        </div>
      </div>

      {(status === RecordingStatus.RECORDING || currentText) && (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm animate-in fade-in duration-500 relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-1.5 h-full transition-colors duration-500 ${hasImportantFlag ? 'bg-amber-400' : 'bg-indigo-500'}`}></div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <span className={`flex h-3 w-3 rounded-full animate-pulse ${hasImportantFlag ? 'bg-amber-500' : 'bg-indigo-500'}`}></span>
              <span className="text-xs font-black text-slate-800 uppercase tracking-widest">Transcript Trực Tiếp</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase italic">Tự động khuếch đại âm thanh nhỏ</span>
          </div>
          <p className={`text-slate-700 leading-relaxed text-lg font-medium transition-colors duration-500 ${hasImportantFlag ? 'text-amber-900 bg-amber-50/50 rounded-lg p-2' : ''}`}>
            {currentText || 'Sẵn sàng ghi nhận...'}
            {status === RecordingStatus.RECORDING && <span className="inline-block w-1.5 h-6 ml-1 bg-indigo-500 animate-pulse align-middle rounded-full"></span>}
          </p>
        </div>
      )}
    </div>
  );
};

export default Recorder;
