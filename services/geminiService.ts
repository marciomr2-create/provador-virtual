
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
 * MOTOR DE PROVADOR VOFY 6.0 - PRO REASONING
 * Implementação segura usando process.env.API_KEY (Server-side injected)
 */
export const generateLook = async (
    personBase64: string, 
    topBase64: string | null, 
    bottomBase64: string | null,
    fullBodyBase64: string | null
): Promise<string> => {
    // A chave process.env.API_KEY é protegida pelo ambiente de execução
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const parts: any[] = [];

    parts.push({ 
        inlineData: { mimeType: 'image/jpeg', data: personBase64 },
    });

    let specializedInstruction = "";
    
    if (fullBodyBase64) {
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: fullBodyBase64 } });
        specializedInstruction = `
            TASK: TOTAL_REPLACEMENT_WITH_FULL_GARMENT
            - O produto enviado é um VESTIDO ou MACACÃO.
            - Substitua a roupa da pessoa mantendo a anatomia.
            - Ignore a roupa anterior completamente.
        `;
    } else {
        if (topBase64) parts.push({ inlineData: { mimeType: 'image/jpeg', data: topBase64 } });
        if (bottomBase64) parts.push({ inlineData: { mimeType: 'image/jpeg', data: bottomBase64 } });
        
        specializedInstruction = `
            TASK: MODULAR_TRY_ON
            - Se houver TOP: Substitua o torso superior.
            - Se houver BOTTOM: Substitua as pernas.
            - Ajuste natural na cintura.
        `;
    }

    const masterPrompt = `
        VOCÊ É UM EXPERT EM MODA DE LUXO.
        REGRAS:
        1. Mantenha ROSTO, CABELO e FUNDO originais.
        2. Aplique a roupa nova com texturas realistas.
        3. A iluminação deve ser coerente com a foto base.
        ${specializedInstruction}
    `;

    parts.push({ text: masterPrompt });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
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
        throw new Error("Falha na renderização visual.");
    } catch (err: any) {
        // Log genérico para não expor detalhes técnicos ou de rede a terceiros
        console.error("VOFY_ENGINE_LOG: Error during generation");
        throw new Error("O servidor de IA está temporariamente ocupado. Por favor, tente novamente em instantes.");
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
