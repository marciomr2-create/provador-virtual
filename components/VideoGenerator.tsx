import React, { useState, useCallback, useEffect } from 'react';
import { useApiKey } from '../hooks/useApiKey';
import { generateVideo } from '../services/geminiService';

interface VideoGeneratorProps {
    imageBase64: string | null;
    aspectRatio: '16:9' | '9:16';
}

const loadingMessages = [
    "Warming up the digital director's chair...",
    "Choreographing pixels into motion...",
    "Rendering your cinematic masterpiece...",
    "Applying the final touches...",
    "This can take a few minutes. Please wait...",
];

export const VideoGenerator: React.FC<VideoGeneratorProps> = ({ imageBase64, aspectRatio }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [currentMessage, setCurrentMessage] = useState(loadingMessages[0]);

    const { isKeySelected, isCheckingKey, selectKey, resetKeySelection } = useApiKey();

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

        if (!isKeySelected) {
            await selectKey();
            return;
        }

        setIsGenerating(true);
        setError(null);
        setVideoUrl(null);
        setCurrentMessage(loadingMessages[0]);
        
        try {
            const url = await generateVideo(imageBase64, aspectRatio);
            setVideoUrl(url);
        } catch (err: any) {
            const errorMessage = err.message || "An unknown error occurred.";
            setError(errorMessage);
            if (errorMessage.includes("Requested entity was not found")) {
                setError("Your API Key is invalid or not found. Please select a valid key.");
                resetKeySelection();
            }
        } finally {
            setIsGenerating(false);
        }
    }, [imageBase64, isKeySelected, selectKey, aspectRatio, resetKeySelection]);

    const buttonText = isCheckingKey
        ? 'Checking Key...'
        : !isKeySelected
        ? 'Select API Key to Generate'
        : isGenerating
        ? 'Generating Video...'
        : 'Generate Video';

    return (
        <div className="w-full mt-4 flex flex-col gap-4">
            <button
                onClick={handleGenerateVideo}
                className="btn-secondary flex-1"
                disabled={isCheckingKey || isGenerating || !imageBase64}
            >
                {buttonText}
            </button>
            {!isKeySelected && !isCheckingKey && (
                 <p className="text-xs text-center text-gray-400">
                    Video generation requires an API key. For billing details, visit <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-teal-400 underline">Google AI billing docs</a>.
                </p>
            )}
            {isGenerating && (
                <div className="text-center p-4 bg-gray-700 rounded-lg">
                    <p className="text-teal-400 font-medium">{currentMessage}</p>
                </div>
            )}
            {error && <p className="text-red-500 text-center">{error}</p>}
            {videoUrl && (
                <div className="mt-4">
                    <h4 className="text-lg font-semibold text-amber-400 mb-2">Generated Video:</h4>
                    <video controls src={videoUrl} className={`w-full rounded-lg bg-black aspect-[${aspectRatio.replace(':', '/')}]`} />
                </div>
            )}
        </div>
    );
};