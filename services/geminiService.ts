
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
 * MOTOR DE PROVADOR VOFY 6.0 - PRO REASONING
 * Utiliza o modelo Gemini 3 Pro Image para compreensão espacial avançada.
 */
export const generateLook = async (
    personBase64: string, 
    topBase64: string | null, 
    bottomBase64: string | null,
    fullBodyBase64: string | null
): Promise<string> => {
    // Criamos uma nova instância para garantir o uso da chave mais recente selecionada pelo usuário
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const parts: any[] = [];

    // 1. MANEQUIM HUMANO (REFERÊNCIA)
    parts.push({ 
        inlineData: { mimeType: 'image/jpeg', data: personBase64 },
    });

    // 2. DEFINIÇÃO DE LÓGICA DE VESTUÁRIO (PRIORIDADE MÁXIMA)
    let specializedInstruction = "";
    
    if (fullBodyBase64) {
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: fullBodyBase64 } });
        specializedInstruction = `
            TASK: TOTAL_REPLACEMENT_WITH_FULL_GARMENT
            - O produto enviado é um VESTIDO ou MACACÃO (Peça Única).
            - Você deve SUBSTITUIR 100% da área do pescoço até os tornozelos da pessoa.
            - IGNORE qualquer textura, cor ou forma da roupa que a pessoa está usando na foto original.
            - Não tente mesclar a roupa nova com a antiga. Use a nova como uma camada opaca e final.
        `;
    } else {
        if (topBase64) parts.push({ inlineData: { mimeType: 'image/jpeg', data: topBase64 } });
        if (bottomBase64) parts.push({ inlineData: { mimeType: 'image/jpeg', data: bottomBase64 } });
        
        specializedInstruction = `
            TASK: MODULAR_TRY_ON (TOP & BOTTOM)
            - Se houver TOP: Substitua apenas do pescoço até a linha do umbigo.
            - Se houver BOTTOM: Substitua apenas da linha do umbigo até os pés.
            - A conexão na cintura deve ser contínua e realista. O TOP deve estar ou por dentro ou por fora do BOTTOM, mas NUNCA misture as estampas das duas peças (sem "clipping").
            - Remova completamente as mangas e golas da roupa original da pessoa.
        `;
    }

    const masterPrompt = `
        VOCÊ É UM EXPERT EM RENDERIZAÇÃO 3D DE MODA E IN-PAINTING.
        
        REGRAS DE OURO:
        1. PRESERVAÇÃO: Mantenha ROSTO, CABELO, MÃOS, PÉS e FUNDO idênticos à foto da pessoa.
        2. SUBSTITUIÇÃO CIRÚRGICA: Trate a roupa da pessoa na foto original como uma máscara vazia a ser preenchida. 
        3. FIDELIDADE MATERIAL: Reproduza fielmente a textura (seda, jeans, algodão) e a estampa do produto enviado.
        4. ILUMINAÇÃO COERENTE: A luz na roupa nova deve seguir a direção da luz no rosto da pessoa.
        
        ${specializedInstruction}

        IMPORTANTE: Se a pessoa na foto base estiver usando roupas volumosas (ex: casaco), remova esse volume antes de aplicar a nova peça para que o caimento seja natural ao corpo real.
    `;

    parts.push({ text: masterPrompt });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview', // Upgrade para maior inteligência visual
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
        throw new Error("O modelo não retornou uma imagem válida.");
    } catch (err: any) {
        if (err.message.includes("404") || err.message.includes("not found")) {
            throw new Error("API_KEY_ERROR: Modelo Gemini 3 Pro não encontrado ou chave sem permissão. Verifique se o projeto tem faturamento ativo.");
        }
        throw err;
    }
};

export const generateVideo = async (
    imageBase64: string,
    aspectRatio: '16:9' | '9:16',
    prompt: string
): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt || 'Professional studio fashion editorial, showcasing the clothing movement.',
        image: { imageBytes: imageBase64, mimeType: 'image/jpeg' },
        config: { numberOfVideos: 1, resolution: '720p', aspectRatio: aspectRatio }
    });
    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
    }
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
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
