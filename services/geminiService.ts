
import { GoogleGenAI, Type } from "@google/genai";
import { Note } from "../types";

export function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function refineNoteWithAI(fullTranscript: string): Promise<Partial<Note>> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Hãy phân tích transcript cuộc họp sau đây và cấu trúc lại thành một ghi chú thông minh theo tiếng Việt.
    Transcript: "${fullTranscript}"
    
    Yêu cầu cấu trúc (Trình bày bằng Tiếng Việt):
    1. Tiêu đề: Đặt tên theo chủ đề chính.
    2. Nội dung (noiDung): Tóm tắt ngắn gọn các ý chính đã thảo luận.
    3. Nhược điểm (nhuocDiem): Những vấn đề, sai sót hoặc điểm chưa tốt được nhắc đến.
    4. Cải thiện (caiThien): Các giải pháp hoặc đề xuất để làm tốt hơn.
    5. Chú ý quan trọng (chuYQuanTrong): Đặc biệt tìm các câu bắt đầu hoặc đi kèm với cụm từ "note lại đi", "ghi lại", "đây là mục quan trọng" để trích xuất vào đây. Trích xuất chính xác ý mà người nói muốn ghi chú.
    
    Trả về định dạng JSON duy nhất.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          noiDung: { type: Type.STRING },
          nhuocDiem: { type: Type.STRING },
          caiThien: { type: Type.STRING },
          chuYQuanTrong: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["title", "noiDung", "nhuocDiem", "caiThien", "chuYQuanTrong"]
      }
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned no content");
  }
  return JSON.parse(text);
}
