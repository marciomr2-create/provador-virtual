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
    
    let instruction = `INSTRUÇÃO PRINCIPAL: Substitua a roupa da pessoa na imagem base pelas novas peças de roupa fornecidas. A imagem final deve ser fotorrealista e crível.

IMAGENS DE ENTRADA:
- Imagem 1: Pessoa Base (modelo).
- Imagem 2 (se fornecida): Peça de Roupa Superior.
- Imagem 3 (se fornecida): Peça de Roupa Inferior.

PROCESSO OBRIGATÓRIO (Passo a Passo):
1. ANÁLISE: Identifique a(s) peça(s) de roupa que a Pessoa Base está vestindo (ex: blusa, calça).
2. REMOÇÃO: Remova DIGITALMENTE a(s) peça(s) de roupa original(is) correspondente(s) às novas peças fornecidas.`;

    if (top && bottom) {
        instruction += ` Remova a blusa/top e a calça/saia originais.`;
    } else if (top) {
        instruction += ` Remova APENAS a blusa/top original.`;
    } else if (bottom) {
        instruction += ` Remova APENAS a calça/saia/shorts original.`;
    }

    instruction += ` É CRUCIAL que a roupa antiga seja 100% removida, não apenas coberta.
3. RECONSTRUÇÃO: Recrie o corpo da pessoa que estava sob a roupa removida de forma realista.
4. APLICAÇÃO: Vista a pessoa com a(s) nova(s) peça(s) de roupa. O caimento, a textura, as sombras e a iluminação devem parecer naturais no corpo da pessoa.
5. PRESERVAÇÃO: Mantenha TODO O RESTO da imagem original INTACTO: o rosto da pessoa, cabelo, pele, pose, o fundo da imagem e qualquer roupa que não foi substituída.

REGRAS FINAIS:
- FIDELIDADE: As novas peças de roupa na imagem final devem ser idênticas às fornecidas.
- NÃO SOBREPOR: NUNCA coloque a nova roupa por cima da roupa antiga. A roupa antiga DEVE desaparecer.
- REALISMO: O resultado final deve parecer uma fotografia real.`;


    const parts: any[] = [
        { text: instruction },
        { inlineData: { mimeType: 'image/jpeg', data: person } } // Pessoa Base
    ];
    if (top) {
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: top } }); // Peça de Roupa
    }
    if (bottom) {
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: bottom } }); // Peça de Roupa
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
    
    const fullPrompt = `Atue como um editor de fotos profissional. Sua instrução de edição é: "${prompt}". Ao editar, mantenha a qualidade fotográfica, a iluminação e a identidade da pessoa na imagem. É crucial que você não distorça o rosto. Aplique apenas a alteração solicitada.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { mimeType: 'image/jpeg', data: baseImage } },
                { text: fullPrompt },
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