
import React, { useState, useCallback, useEffect } from 'react';
import { useApiKey } from '../hooks/useApiKey';
import { generateVideo } from '../services/geminiService';

interface VideoGeneratorProps {
    imageBase64: string | null;
    aspectRatio: '16:9' | '9:16';
    onVideoGenerated: (url: string | null) => void;
    onGenerationStateChange: (isGenerating: boolean, error: string | null) => void;
}

const loadingMessages = [
    "Aquecendo a cadeira do diretor digital...",
    "Coreografando pixels em movimento...",
    "Renderizando sua obra-prima cinematográfica...",
    "Aplicando os toques finais...",
    "Isso pode levar alguns minutos. Por favor, aguarde...",
];

export const VideoGenerator: React.FC<VideoGeneratorProps> = ({ imageBase64, aspectRatio, onVideoGenerated, onGenerationStateChange }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentMessage, setCurrentMessage] = useState(loadingMessages[0]);
    const [prompt, setPrompt] = useState('');

    const { isKeySelected, isCheckingKey, selectKey, resetKeySelection } = useApiKey();

    useEffect(() => {
        onGenerationStateChange(isGenerating, error);
    }, [isGenerating, error, onGenerationStateChange]);

    useEffect(() => {
        let interval: number;
        if (isGenerating) {
            interval = window.setInterval(() => {
                setCurrentMessage(prev => {
                    const currentIndex = loadingMessages.indexOf(prev);
                    const nextIndex = (currentIndex + 1) % loadingMessages.length;
                    return loadingMessages[nextIndex];
                });
            }, 4000);
        }
        return () => clearInterval(interval);
    }, [isGenerating]);

    const handleGenerateVideo = useCallback(async () => {
        if (!imageBase64) return;

        // Mitiga condição de corrida: assume que a seleção foi bem-sucedida e prossegue.
        if (!isKeySelected) {
            await selectKey();
        }

        setIsGenerating(true);
        setError(null);
        onVideoGenerated(null);
        setCurrentMessage(loadingMessages[0]);
        
        try {
            const url = await generateVideo(imageBase64, aspectRatio, prompt);
            onVideoGenerated(url);
        } catch (err: any) {
            const errorMessage = err.message || "Ocorreu um erro desconhecido.";
            
            if (errorMessage.includes("Requested entity was not found") || 
                errorMessage.toLowerCase().includes("api key not valid") ||
                errorMessage.toLowerCase().includes("permission denied")) {
                const detailedError = "A chave de API é inválida ou não tem permissão. Verifique se o faturamento está ativado e selecione a chave novamente.";
                setError(detailedError);
                resetKeySelection();
            } else {
                setError(`Falha na geração do vídeo: ${errorMessage}`);
            }
            onVideoGenerated(null);
        } finally {
            setIsGenerating(false);
        }
    }, [imageBase64, isKeySelected, selectKey, aspectRatio, resetKeySelection, prompt, onVideoGenerated]);

    const buttonText = isCheckingKey
        ? 'Verificando Chave...'
        : !isKeySelected
        ? 'Selecionar Chave de API para Gerar'
        : isGenerating
        ? 'Gerando Vídeo...'
        : 'Gerar Vídeo';

    return (
        <div className="w-full flex flex-col gap-2">
             <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Descreva o vídeo que você quer criar (opcional)."
                className="w-full p-2 bg-gray-700 border border-gray-600 text-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-shadow resize-none text-sm"
                rows={2}
                disabled={isGenerating || !imageBase64}
            />
            <button
                onClick={handleGenerateVideo}
                className="btn-primary w-full"
                disabled={isCheckingKey || isGenerating || !imageBase64}
            >
                {buttonText}
            </button>
            {!isKeySelected && !isCheckingKey && (
                 <p className="text-xs text-center text-gray-400">
                    A geração de vídeo requer uma chave de API. Para detalhes, visite <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-teal-400 underline">docs de faturamento do Google AI</a>.
                </p>
            )}
            {isGenerating && (
                <div className="text-center p-2 bg-gray-700 rounded-lg">
                    <p className="text-teal-400 font-medium text-sm">{currentMessage}</p>
                </div>
            )}
            {error && <p className="text-red-500 text-center text-sm">{error}</p>}
        </div>
    );
};
