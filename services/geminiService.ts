
import { GoogleGenAI } from "@google/genai";

export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
        };
        reader.onerror = (error) => reject(error);
    });
};

/**
 * Gera o look combinando a pessoa com as peças de roupa.
 * Estrutura a entrada para que a IA identifique claramente o que é cada imagem.
 */
export const generateLook = async (
    personBase64: string, 
    topBase64: string | null, 
    bottomBase64: string | null,
    fullBodyBase64: string | null
): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Iniciamos com a pessoa como referência principal
    const parts: any[] = [
        { inlineData: { mimeType: 'image/jpeg', data: personBase64 } },
        { text: "REFERENCE_PERSON: Esta é a pessoa que deve vestir as novas roupas." }
    ];

    // Adicionamos as peças com labels claros
    if (fullBodyBase64) {
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: fullBodyBase64 } });
        parts.push({ text: "NEW_CLOTHING_FULL: Este é o vestido ou conjunto de corpo inteiro que a pessoa deve usar." });
    }
    if (topBase64) {
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: topBase64 } });
        parts.push({ text: "NEW_CLOTHING_TOP: Esta é a peça superior (blusa/jaqueta) que a pessoa deve usar." });
    }
    if (bottomBase64) {
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: bottomBase64 } });
        parts.push({ text: "NEW_CLOTHING_BOTTOM: Esta é a peça inferior (calça/saia) que a pessoa deve usar." });
    }

    // Instrução final de síntese
    parts.push({
        text: `ACTION: Realize um 'Virtual Try-On' realista. 
        INSTRUCTIONS:
        1. Remova COMPLETAMENTE a roupa atual da REFERENCE_PERSON.
        2. Vista a pessoa com as peças marcadas como NEW_CLOTHING.
        3. Se houver TOP e BOTTOM, combine-os. Se houver FULL, ele tem prioridade.
        4. Preserve o rosto, cabelo, mãos, pés e a pose da REFERENCE_PERSON exatamente como na imagem original.
        5. Ajuste o caimento das novas roupas ao corpo da pessoa de forma natural, respeitando sombras e iluminação.
        6. O fundo da imagem deve permanecer o mesmo.
        7. Retorne APENAS a imagem final resultante.`
    });

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return part.inlineData.data;
        }
    }
    
    throw new Error("A IA não gerou uma imagem de retorno. Verifique as fotos enviadas.");
};

/**
 * Gera um vídeo a partir de uma imagem de outfit.
 */
export const generateVideo = async (
    imageBase64: string,
    aspectRatio: '16:9' | '9:16',
    prompt: string
): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt || 'A high-quality fashion video showcasing the outfit on a moving person, cinematic lighting.',
        image: {
            imageBytes: imageBase64,
            mimeType: 'image/jpeg',
        },
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: aspectRatio
        }
    });

    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
        throw new Error("Falha ao obter o link do vídeo gerado.");
    }
    
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
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
