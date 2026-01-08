
export interface Note {
  id: string;
  timestamp: number;
  title: string;
  transcript: string;
  noiDung: string;
  nhuocDiem: string;
  caiThien: string;
  chuYQuanTrong: string[];
}

export enum RecordingStatus {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  RECORDING = 'RECORDING',
  PROCESSING = 'PROCESSING',
  ERROR = 'ERROR'
}
