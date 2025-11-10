import { GoogleGenAI, Modality } from "@google/genai";

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

export const generateLook = async (person: string, top: string | null, bottom: string | null): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    let clothingPrompt = '';
    if (top && bottom) {
        clothingPrompt = 'com as peças de roupa superior e inferior fornecidas';
    } else if (top) {
        clothingPrompt = 'com a peça de roupa superior fornecida';
    } else if (bottom) {
        clothingPrompt = 'com a peça de roupa inferior fornecida';
    } else {
        throw new Error("At least one clothing item is required.");
    }

    const fullPrompt = `Sua tarefa é criar uma imagem fotorrealista de "provador virtual". Use a imagem da pessoa fornecida como base principal. Seu objetivo é vestir perfeitamente essa pessoa ${clothingPrompt}.

Instruções para a imagem final:
1.  **Aplicação das Roupas**: Aplique realisticamente a(s) peça(s) de roupa na pessoa, prestando muita atenção ao caimento natural, dobras do tecido, textura e iluminação para garantir que as roupas pareçam estar realmente sendo usadas. Se apenas uma peça for fornecida (superior ou inferior), imagine uma peça complementar que combine bem (por exemplo, se um top for fornecido, adicione uma calça jeans ou saia neutra; se uma calça for fornecida, adicione uma camiseta branca simples). A peça fornecida deve ser o foco principal.
2.  **Preservação**: É crucial manter a pose original da pessoa, sua forma corporal, estrutura facial e cabelo. Não altere suas características físicas.
3.  **Fundo**: Substitua o fundo original por um fundo limpo e neutro.
4.  **Retoque de Pele**: Aplique um retoque de pele leve e sutil para remover pequenas imperfeições e reduzir o brilho excessivo, visando um resultado natural.
5.  **Resultado**: O resultado final deve ser apenas a imagem gerada.`;

    const parts: any[] = [
        { text: fullPrompt },
        { inlineData: { mimeType: 'image/jpeg', data: person } }
    ];
    if (top) {
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: top } });
    }
    if (bottom) {
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: bottom } });
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: {
            responseModalities: [Modality.IMAGE],
        }
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            return part.inlineData.data;
        }
    }
    throw new Error("Nenhuma imagem gerada a partir da criação do look.");
};

export const editImageWithText = async (baseImage: string, prompt: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { mimeType: 'image/jpeg', data: baseImage } },
                { text: prompt },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            return part.inlineData.data;
        }
    }
    throw new Error("Nenhuma imagem gerada a partir da edição.");
};

export const generateImageFromPrompt = async (prompt: string): Promise<string[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: '1:1',
        },
    });

    return response.generatedImages.map(img => img.image.imageBytes);
};

export const generateVideo = async (baseImage: string, aspectRatio: '16:9' | '9:16', prompt: string): Promise<string> => {
    // Re-create instance to use the latest key from the dialog
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const finalPrompt = prompt.trim() ? prompt : 'Um vídeo curto e cinematográfico desta cena, com movimento sutil e natural.';
    
    let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: finalPrompt,
        image: {
            imageBytes: baseImage,
            mimeType: 'image/jpeg',
        },
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: aspectRatio,
        }
    });

    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    if(operation.error) {
        throw new Error(operation.error.message || 'A geração de vídeo falhou.');
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
        throw new Error("A geração do vídeo foi concluída, mas nenhum link para download foi encontrado.");
    }

    const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if (!videoResponse.ok) {
        const errorText = await videoResponse.text();
        console.error("Video download error:", errorText);
        throw new Error("Falha ao baixar o vídeo gerado.");
    }
    const videoBlob = await videoResponse.blob();
    return URL.createObjectURL(videoBlob);
};