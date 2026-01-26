
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
 * MOTOR VOFY PRO - ALTA FIDELIDADE
 * Especializado em substituição total de tecidos (Try-on Profissional).
 */
export const generateLook = async (
    personBase64: string, 
    topBase64: string | null, 
    bottomBase64: string | null,
    fullBodyBase64: string | null
): Promise<string> => {
    // Instanciação imediata para capturar a chave ativa (obrigatório para o modelo Pro)
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const parts: any[] = [];

    // Foto Base
    parts.push({ 
        inlineData: { mimeType: 'image/jpeg', data: personBase64 },
    });

    // Peças de Referência
    if (fullBodyBase64) {
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: fullBodyBase64 } });
    } else {
        if (topBase64) parts.push({ inlineData: { mimeType: 'image/jpeg', data: topBase64 } });
        if (bottomBase64) parts.push({ inlineData: { mimeType: 'image/jpeg', data: bottomBase64 } });
    }

    // PROMPT DE ALTA COSTURA - FOCO EM SUBSTITUIÇÃO TOTAL
    const masterPrompt = `
        YOU ARE THE VOFY PROFESSIONAL FASHION ENGINE.
        TASK: HIGH-FIDELITY VIRTUAL TRY-ON.
        
        STRICT RULES:
        1. CLOTHING REPLACEMENT: Completely REMOVE the original clothes from the person. 
        2. NO LAYERING: Do not put new clothes over old ones (e.g., never put shorts over pants). The person should only be wearing the NEW items provided.
        3. ANATOMY PRESERVATION: Maintain face, skin tone, hair, and body shape perfectly.
        4. BACKGROUND INTEGRITY: Keep the exact same background and environment.
        5. SEAMLESS FIT: Adjust the fabric drapes and shadows to match the person's pose and current lighting.
    `;

    parts.push({ text: masterPrompt });

    try {
        const response = await ai.models.generateContent({
            // Upgrade para o modelo Pro para máxima responsividade ao prompt
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
        if (imagePart?.inlineData) {
            return imagePart.inlineData.data;
        }
        throw new Error("EMPTY_RESPONSE");
    } catch (err: any) {
        const errorMsg = err?.message || "";
        if (errorMsg.includes("429") || errorMsg.toLowerCase().includes("quota")) {
            throw new Error("QUOTA_EXCEEDED");
        }
        if (errorMsg.includes("403") || errorMsg.toLowerCase().includes("permission")) {
            throw new Error("AUTH_REQUIRED");
        }
        throw new Error("SERVICE_UNAVAILABLE");
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
