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

export const generateLook = async (person: string, top: string, bottom: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        // FIX: Changed model to 'gemini-2.5-flash-image' for image editing and generation. 'gemini-2.5-pro' is a text-only model.
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { text: `Sua tarefa é criar uma imagem fotorrealista de "provador virtual". Use a imagem da pessoa fornecida como base principal. Seu objetivo é vestir perfeitamente essa pessoa com as peças de roupa superior e inferior fornecidas.

Instruções para a imagem final:
1.  **Aplicação das Roupas**: Aplique realisticamente as peças de roupa (superior e inferior) na pessoa, prestando muita atenção ao caimento natural, dobras do tecido, textura e iluminação para garantir que as roupas pareçam estar realmente sendo usadas.
2.  **Preservação**: É crucial manter a pose original da pessoa, sua forma corporal, estrutura facial e cabelo. Não altere suas características físicas.
3.  **Fundo**: Substitua o fundo original por um fundo limpo e neutro.
4.  **Retoque de Pele**: Aplique um retoque de pele leve e sutil para remover pequenas imperfeições e reduzir o brilho excessivo, visando um resultado natural.
5.  **Resultado**: O resultado final deve ser apenas a imagem gerada.` },
                { inlineData: { mimeType: 'image/jpeg', data: person } },
                { inlineData: { mimeType: 'image/jpeg', data: top } },
                { inlineData: { mimeType: 'image/jpeg', data: bottom } },
            ]
        },
        config: {
            responseModalities: [Modality.IMAGE],
        }
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            return part.inlineData.data;
        }
    }
    throw new Error("No image generated from look creation.");
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
    throw new Error("No image generated from editing.");
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

export const generateVideo = async (baseImage: string, aspectRatio: '16:9' | '9:16'): Promise<string> => {
    // Re-create instance to use the latest key from the dialog
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: 'A short, cinematic video of this scene, with subtle, natural movement.',
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
        throw new Error(operation.error.message || 'Video generation failed.');
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
        throw new Error("Video generation completed, but no download link was found.");
    }

    const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if (!videoResponse.ok) {
        throw new Error("Failed to download the generated video.");
    }
    const videoBlob = await videoResponse.blob();
    return URL.createObjectURL(videoBlob);
};