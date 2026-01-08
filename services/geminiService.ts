
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

const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Hàm lọc nhiễu văn bản: Sửa các lỗi nghe nhầm do tạp âm hoặc ASR không chuẩn
 */
export async function cleanRawTranscript(rawTranscript: string): Promise<string> {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Bạn là một chuyên gia hiệu đính bản ghi âm cuộc họp. 
    Dưới đây là một bản ghi thô (ASR) có thể chứa lỗi do tạp âm, từ ngữ không thống nhất hoặc nghe nhầm các từ đồng âm.
    
    Nhiệm vụ:
    1. Sửa lỗi chính tả và các từ bị nghe nhầm dựa vào ngữ cảnh (Ví dụ: "thanh toán" thay vì "thanh tán", "báo cáo" thay vì "báo cá").
    2. Loại bỏ các từ thừa, từ đệm (ừm, à, thì, là) nhưng giữ nguyên nội dung gốc.
    3. Đảm bảo câu văn mạch lạc, đúng ngữ pháp tiếng Việt.
    4. KHÔNG tóm tắt, chỉ sửa lỗi bản ghi văn bản.
    
    Bản ghi thô: "${rawTranscript}"`,
    config: {
      thinkingConfig: { thinkingBudget: 0 }
    }
  });
  
  return response.text?.trim() || rawTranscript;
}

export async function refineNoteWithAI(cleanedTranscript: string): Promise<Partial<Note>> {
  const ai = getAIClient();
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Hãy phân tích nội dung cuộc họp đã được xử lý sau đây và cấu trúc lại thành một ghi chú thông minh.
    Nội dung: "${cleanedTranscript}"
    
    Yêu cầu cấu trúc (Trình bày bằng Tiếng Việt):
    1. Tiêu đề: Đặt tên theo chủ đề chính.
    2. Nội dung (noiDung): Tóm tắt ngắn gọn các ý chính đã thảo luận.
    3. Nhược điểm (nhuocDiem): Những vấn đề, sai sót hoặc điểm chưa tốt được nhắc đến.
    4. Cải thiện (caiThien): Các giải pháp hoặc đề xuất để làm tốt hơn.
    5. Chú ý quan trọng (chuYQuanTrong): Tìm các câu bắt đầu hoặc đi kèm với cụm từ "note lại đi", "ghi lại", "đây là mục quan trọng".
    
    Trả về định dạng JSON duy nhất.`,
    config: {
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 0 },
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
  if (!text) throw new Error("Gemini returned no content");
  return JSON.parse(text);
}

export async function polishContentWithAI(content: string, fieldType: string): Promise<string> {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Hãy chỉnh sửa và làm mượt đoạn văn bản sau đây cho phần "${fieldType}" của một ghi chú cuộc họp. 
    Văn bản: "${content}"
    Chỉ trả về đoạn văn bản đã chỉnh sửa, không thêm lời dẫn.`,
    config: {
      thinkingConfig: { thinkingBudget: 0 }
    }
  });
  
  return response.text?.trim() || content;
}
