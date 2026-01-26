
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
 * MOTOR DE PROVADOR VOFY - VERSÃO MVP COMPATÍVEL
 * Configurado para lidar com alta demanda e limites de cota de forma elegante.
 */
export const generateLook = async (
    personBase64: string, 
    topBase64: string | null, 
    bottomBase64: string | null,
    fullBodyBase64: string | null
): Promise<string> => {
    // Instanciação no momento da chamada garantindo uso da chave de ambiente
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const parts: any[] = [];

    parts.push({ 
        inlineData: { mimeType: 'image/jpeg', data: personBase64 },
    });

    let specializedInstruction = "";
    
    if (fullBodyBase64) {
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: fullBodyBase64 } });
        specializedInstruction = `
            TASK: TOTAL_REPLACEMENT
            - Peça única (VESTIDO/MACACÃO).
            - Substitua a roupa atual mantendo a anatomia.
        `;
    } else {
        if (topBase64) parts.push({ inlineData: { mimeType: 'image/jpeg', data: topBase64 } });
        if (bottomBase64) parts.push({ inlineData: { mimeType: 'image/jpeg', data: bottomBase64 } });
        
        specializedInstruction = `
            TASK: MODULAR_PLACEMENT
            - Substitua as partes correspondentes (superior/inferior).
        `;
    }

    const masterPrompt = `
        VOCÊ É O MOTOR VOFY (IA DE ALTA MODA).
        OBJETIVO: Virtual Try-On realista.
        PRESERVE: Rosto, tom de pele, cabelo e fundo.
        AJUSTE: Caimento natural e iluminação coerente.
        ${specializedInstruction}
    `;

    parts.push({ text: masterPrompt });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
            config: {
                imageConfig: {
                    aspectRatio: "3:4"
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
        
        // Detecção de erro de cota (429 - Too Many Requests / Quota Exceeded)
        if (errorMsg.toLowerCase().includes("quota") || errorMsg.includes("429")) {
            throw new Error("O Ateliê VOFY está com lotação máxima de convidados VIP. Por favor, aguarde 60 segundos e tente sua prova novamente.");
        }
        
        // Outros erros
        console.error("VOFY_LOG: Service Exception");
        throw new Error("O servidor de alta costura está processando muitos pedidos. Tente novamente em um instante.");
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
