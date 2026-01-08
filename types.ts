
export interface Note {
  id: string;
  timestamp: number;
  title: string;
  transcript: string;
  noiDung: string;
  nhuocDiem: string;
  caiThien: string;
  chuYQuanTrong: string[];
  isProcessing?: boolean; // Thuộc tính mới để xác định ghi chú đang được AI xử lý
}

export enum RecordingStatus {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  RECORDING = 'RECORDING',
  PROCESSING = 'PROCESSING', // Giữ lại để tương thích nhưng sẽ ít dùng hơn cho việc chặn UI
  ERROR = 'ERROR'
}
