
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
  const [micLevel, setMicLevel] = useState(0); 
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const timerRef = useRef<number | null>(null);
  const fullTranscriptRef = useRef('');
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (currentText.toLowerCase().includes("note lại đi") || currentText.toLowerCase().includes("ghi lại")) {
      setHasImportantFlag(true);
      const timer = setTimeout(() => setHasImportantFlag(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [currentText]);

  const updateVisualizer = () => {
    if (!analyserRef.current) return;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const average = sum / dataArray.length;
    setMicLevel(Math.min(100, average * 1.5));
    animationFrameRef.current = requestAnimationFrame(updateVisualizer);
  };

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
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setMicLevel(0);
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
          const gainNode = audioContextRef.current.createGain();
          gainNode.gain.value = 5.0; 
          
          const analyser = audioContextRef.current.createAnalyser();
          analyser.fftSize = 256;
          analyserRef.current = analyser;
          
          const scriptProcessor = audioContextRef.current.createScriptProcessor(4096, 1, 1);

          scriptProcessor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const int16 = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              int16[i] = Math.max(-1, Math.min(1, inputData[i])) * 32767;
            }
            const base64 = encodeBase64(new Uint8Array(int16.buffer));
            sessionPromise.then((session) => {
              session.sendRealtimeInput({ media: { data: base64, mimeType: 'audio/pcm;rate=16000' } });
            });
          };

          source.connect(gainNode);
          gainNode.connect(analyser);
          analyser.connect(scriptProcessor);
          scriptProcessor.connect(audioContextRef.current.destination);
          
          updateVisualizer();
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
          systemInstruction: "Bạn là một trợ lý ghi âm chuyên nghiệp với thính giác siêu nhạy. Hãy ưu tiên lọc bỏ tạp âm môi trường và chỉ tập trung vào giọng người nói. Nếu âm thanh nhỏ, hãy dùng trí tuệ nhân tạo để đoán từ dựa trên ngữ cảnh câu chuyện."
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
    <div className="flex flex-col gap-6">
      {/* Control Center */}
      <div className={`relative overflow-hidden flex flex-col items-center justify-center p-8 bg-white rounded-3xl shadow-xl border border-slate-100 transition-all duration-500 ${hasImportantFlag ? 'ring-2 ring-amber-400' : ''}`}>
        
        {/* Background Visualizer Effect when Recording */}
        {status === RecordingStatus.RECORDING && (
          <div className="absolute inset-0 z-0 opacity-10 pointer-events-none flex items-center justify-center gap-1">
             {/* Simple CSS bar animation simulated here for bg effect */}
             {[...Array(20)].map((_, i) => (
                <div key={i} className="w-4 bg-indigo-600 rounded-full animate-pulse" style={{ height: `${Math.random() * 100}%`, animationDuration: `${0.5 + Math.random()}s` }}></div>
             ))}
          </div>
        )}

        {/* Main Button */}
        <div className="relative z-10 mb-6">
          {status === RecordingStatus.RECORDING && (
             <div className="absolute inset-0 flex items-center justify-center">
               <div className="w-24 h-24 bg-red-500/20 rounded-full animate-ping"></div>
               <div className="w-20 h-20 bg-red-500/40 rounded-full animate-ping delay-75"></div>
             </div>
          )}
          
          <button
            onClick={status === RecordingStatus.RECORDING ? handleStop : startLiveRecording}
            disabled={status === RecordingStatus.PROCESSING || status === RecordingStatus.CONNECTING}
            className={`relative group w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 transform active:scale-95 shadow-lg ${
              status === RecordingStatus.RECORDING 
                ? 'bg-gradient-to-br from-red-500 to-red-600 shadow-red-200 ring-4 ring-red-100' 
                : 'bg-gradient-to-br from-indigo-600 to-indigo-700 shadow-indigo-200 ring-4 ring-indigo-50 hover:ring-indigo-100'
            } disabled:opacity-50 disabled:grayscale`}
          >
            {status === RecordingStatus.RECORDING ? (
              <div className="w-8 h-8 bg-white rounded-lg shadow-inner"></div>
            ) : status === RecordingStatus.CONNECTING ? (
              <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-9 w-9 text-white ml-1 group-hover:scale-110 transition-transform" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>

        {/* Text Status */}
        <div className="relative z-10 text-center space-y-2">
          <h3 className={`text-2xl font-bold tracking-tight ${status === RecordingStatus.RECORDING ? 'text-slate-800' : 'text-slate-700'}`}>
            {status === RecordingStatus.RECORDING ? 'Đang ghi âm...' : status === RecordingStatus.CONNECTING ? 'Đang kết nối...' : status === RecordingStatus.PROCESSING ? 'Đang phân tích...' : 'Bắt đầu cuộc họp mới'}
          </h3>
          
          {status === RecordingStatus.RECORDING ? (
            <div className="flex flex-col items-center">
               <div className="font-mono text-xl font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
                  {formatDuration(duration)}
               </div>
               
               {/* High-Tech Visualizer Bar */}
               <div className="mt-4 w-64 h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200 relative shadow-inner">
                  {/* Glow effect behind the bar */}
                  <div 
                    className={`absolute h-full transition-all duration-100 ease-linear ${micLevel > 50 ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-red-500' : 'bg-gradient-to-r from-indigo-400 to-indigo-600'}`}
                    style={{ width: `${micLevel}%`, boxShadow: '0 0 10px rgba(99, 102, 241, 0.5)' }}
                  ></div>
               </div>
               <div className="mt-1 flex justify-between w-64 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  <span>Im lặng</span>
                  <span>Bình thường</span>
                  <span>Ồn ào</span>
               </div>
            </div>
          ) : (
            <p className="text-slate-400 text-sm font-medium">Sử dụng Gemini AI để ghi chép và tóm tắt thông minh</p>
          )}

          {/* Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4 pt-4 border-t border-slate-50 w-full">
             {status === RecordingStatus.RECORDING && (
               <>
                <span className="flex items-center px-2 py-1 bg-white text-slate-500 rounded text-[10px] font-bold uppercase tracking-wider border border-slate-200 shadow-sm">
                   5.0x Gain
                </span>
                <span className="flex items-center px-2 py-1 bg-white text-slate-500 rounded text-[10px] font-bold uppercase tracking-wider border border-slate-200 shadow-sm">
                   Noise Canceling
                </span>
               </>
             )}
             {hasImportantFlag && (
                <span className="flex items-center px-2 py-1 bg-amber-50 text-amber-600 rounded text-[10px] font-bold uppercase tracking-wider border border-amber-200 animate-pulse">
                  ⭐ Important Idea
                </span>
             )}
          </div>
        </div>
      </div>

      {/* Live Transcript Box */}
      {(status === RecordingStatus.RECORDING || currentText) && (
        <div className="group relative bg-white/80 backdrop-blur-md border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className={`absolute top-0 left-0 bottom-0 w-1.5 rounded-l-3xl transition-colors duration-300 ${hasImportantFlag ? 'bg-amber-400' : status === RecordingStatus.RECORDING ? 'bg-indigo-500' : 'bg-slate-300'}`}></div>
          
          <div className="flex justify-between items-center mb-3 pl-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              {status === RecordingStatus.RECORDING && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
              Live Transcript
            </span>
          </div>
          
          <div className="pl-2">
            <p className={`text-slate-700 text-base leading-relaxed whitespace-pre-wrap font-medium ${!currentText ? 'italic text-slate-400' : ''}`}>
               {currentText || 'Đang lắng nghe cuộc hội thoại...'}
               {status === RecordingStatus.RECORDING && <span className="inline-block w-1.5 h-4 ml-1 bg-indigo-500 animate-pulse align-middle rounded-sm"></span>}
            </p>
          </div>
          
          {micLevel < 5 && status === RecordingStatus.RECORDING && (
             <div className="absolute top-4 right-6 text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded-md animate-bounce">
                No Audio Detected
             </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Recorder;
