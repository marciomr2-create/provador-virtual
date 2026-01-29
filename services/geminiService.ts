
import { GoogleGenAI } from "@google/genai";

export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
        };
        reader.onerror = () => reject(new Error("Erro ao processar arquivo de imagem."));
    });
};

/**
 * MOTOR VOFY PRO - ALTA FIDELIDADE (GEMINI 3 PRO)
 */
export const generateLook = async (
    personBase64: string, 
    topBase64: string | null, 
    bottomBase64: string | null,
    fullBodyBase64: string | null,
    apiKey: string // Agora recebe a chave explicitamente
): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey });
    
    const parts: any[] = [];
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: personBase64 } });

    if (fullBodyBase64) {
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: fullBodyBase64 } });
    } else {
        if (topBase64) parts.push({ inlineData: { mimeType: 'image/jpeg', data: topBase64 } });
        if (bottomBase64) parts.push({ inlineData: { mimeType: 'image/jpeg', data: bottomBase64 } });
    }

    const masterPrompt = `
        TASK: HIGH-FIDELITY VIRTUAL TRY-ON (ULTRA REALISTIC).
        STRICT RULES:
        1. Replace the person's current clothing with the EXACT provided reference garments.
        2. Keep the person's face, hair, and body shape 100% identical.
        3. Match the lighting and texture of the new clothes to the original scene.
        4. High resolution output with natural fabric wrinkles.
    `;

    parts.push({ text: masterPrompt });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: { parts },
            config: { 
                imageConfig: { 
                    aspectRatio: "3:4",
                    imageSize: "1K" 
                } 
            }
        });

        const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
        if (imagePart?.inlineData) return imagePart.inlineData.data;
        throw new Error("A IA processou, mas não retornou uma imagem. Tente novamente.");
    } catch (err: any) {
        if (err?.message?.includes('API_KEY_INVALID')) {
            throw new Error("Chave de API Inválida. Verifique suas configurações.");
        }
        throw new Error(err?.message || "Erro na comunicação com o motor Pro.");
    }
};

export const resizeImageDataUrl = (dataUrl: string, maxWidth: number, maxHeight: number): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            if (width > height) {
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
    });
};
