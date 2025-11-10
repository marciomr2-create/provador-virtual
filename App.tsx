import React, { useState, useCallback, useEffect } from 'react';
import { ImageData, AppTab, SavedOutfit } from './types';
import { fileToBase64, generateLook, editImageWithText, generateImageFromPrompt } from './services/geminiService';
import { ImageUploader } from './components/ImageUploader';
import { EditImageModal } from './components/EditImageModal';
import { VideoGenerator } from './components/VideoGenerator';
import { HistoryPanel } from './components/HistoryPanel';

// --- Helper Components defined outside App to prevent re-creation on re-renders ---

const LoadingSpinner: React.FC = () => (
    <div className="absolute inset-0 bg-gray-800 bg-opacity-75 flex flex-col items-center justify-center rounded-lg z-10">
        <svg className="animate-spin -ml-1 mr-3 h-10 w-10 text-teal-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="text-lg font-medium text-teal-300 mt-2">Generating...</span>
    </div>
);

const AppHeader: React.FC<{ activeTab: AppTab; onTabChange: (tab: AppTab) => void; }> = ({ activeTab, onTabChange }) => (
    <header className="bg-gray-800 border-b-2 border-amber-500 p-4 sticky top-0 z-20">
        <div className="w-full max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center">
            <h1 className="text-3xl font-bold text-amber-300 tracking-tight">Provador Digital<span className="text-teal-400">.AI</span></h1>
            <nav className="flex space-x-2 mt-4 sm:mt-0 bg-gray-900 p-1 rounded-lg">
                <button
                    onClick={() => onTabChange('dressingRoom')}
                    className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'dressingRoom' ? 'bg-teal-600 text-white shadow' : 'text-gray-400 hover:bg-gray-700'}`}
                >
                    Dressing Room
                </button>
                <button
                    onClick={() => onTabChange('imageGenerator')}
                    className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'imageGenerator' ? 'bg-teal-600 text-white shadow' : 'text-gray-400 hover:bg-gray-700'}`}
                >
                    Image Generator
                </button>
            </nav>
        </div>
    </header>
);

// --- Main App Component ---

function App() {
    const [activeTab, setActiveTab] = useState<AppTab>('dressingRoom');
    
    // Dressing Room State
    const [clientImage, setClientImage] = useState<ImageData | null>(null);
    const [topImage, setTopImage] = useState<ImageData | null>(null);
    const [bottomImage, setBottomImage] = useState<ImageData | null>(null);
    const [generatedLook, setGeneratedLook] = useState<string | null>(null);
    const [generatedLookBase64, setGeneratedLookBase64] = useState<string | null>(null);
    const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9'>('9:16');
    const [isCreatingLook, setIsCreatingLook] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [savedOutfits, setSavedOutfits] = useState<SavedOutfit[]>([]);

    // Image Generator State
    const [prompt, setPrompt] = useState('');
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    
    // --- LocalStorage Effects for Persistence ---
    useEffect(() => {
        try {
            const storedOutfits = localStorage.getItem('savedOutfits');
            if (storedOutfits) {
                setSavedOutfits(JSON.parse(storedOutfits));
            }
        } catch (error) {
            console.error("Failed to load saved outfits from localStorage", error);
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('savedOutfits', JSON.stringify(savedOutfits));
        } catch (error) {
            console.error("Failed to save outfits to localStorage", error);
        }
    }, [savedOutfits]);


    // --- Core Handlers ---
    const handleCreateLook = useCallback(async () => {
        if (!clientImage || !topImage || !bottomImage) {
            alert("Please upload all three images.");
            return;
        }
        setIsCreatingLook(true);
        setGeneratedLook(null);
        setGeneratedLookBase64(null);
        try {
            const [personB64, topB64, bottomB64] = await Promise.all([
                fileToBase64(clientImage.file!),
                fileToBase64(topImage.file!),
                fileToBase64(bottomImage.file!),
            ]);
            const resultB64 = await generateLook(personB64, topB64, bottomB64);
            setGeneratedLook(`data:image/jpeg;base64,${resultB64}`);
            setGeneratedLookBase64(resultB64);
        } catch (error) {
            console.error(error);
            alert("Failed to create look. See console for details.");
        } finally {
            setIsCreatingLook(false);
        }
    }, [clientImage, topImage, bottomImage]);

    const handleEditLook = useCallback(async (editPrompt: string) => {
        if (!generatedLookBase64) return;
        setIsEditing(true);
        try {
            const resultB64 = await editImageWithText(generatedLookBase64, editPrompt);
            setGeneratedLook(`data:image/jpeg;base64,${resultB64}`);
            setGeneratedLookBase64(resultB64);
            setShowEditModal(false);
        } catch (error) {
            console.error(error);
            alert("Failed to edit image. See console for details.");
        } finally {
            setIsEditing(false);
        }
    }, [generatedLookBase64]);

    const handleGenerateImage = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) return;
        setIsGeneratingImage(true);
        setGeneratedImage(null);
        try {
            const results = await generateImageFromPrompt(prompt);
            if (results.length > 0) {
                setGeneratedImage(`data:image/jpeg;base64,${results[0]}`);
            }
        } catch (error) {
            console.error(error);
            alert("Failed to generate image. See console for details.");
        } finally {
            setIsGeneratingImage(false);
        }
    }, [prompt]);

    const handleDownload = () => {
        if (!generatedLook) return;
        const link = document.createElement('a');
        link.href = generatedLook;
        link.download = 'provador-digital-ai.jpg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- History Handlers ---
    const handleSaveOutfit = useCallback(async () => {
        if (!clientImage?.file || !topImage?.file || !bottomImage?.file || !generatedLook || !generatedLookBase64) {
            alert("Cannot save outfit. Ensure all original images are present and a look has been generated.");
            return;
        }

        const newOutfit: SavedOutfit = {
            id: Date.now(),
            clientImageUrl: clientImage.url,
            topImageUrl: topImage.url,
            bottomImageUrl: bottomImage.url,
            generatedLookUrl: generatedLook,
            generatedLookBase64: generatedLookBase64,
        };

        setSavedOutfits(prev => [newOutfit, ...prev]);
        alert("Outfit saved!");
    }, [clientImage, topImage, bottomImage, generatedLook, generatedLookBase64]);

    const handleLoadOutfit = useCallback((outfit: SavedOutfit) => {
        setClientImage({ url: outfit.clientImageUrl });
        setTopImage({ url: outfit.topImageUrl });
        setBottomImage({ url: outfit.bottomImageUrl });
        setGeneratedLook(outfit.generatedLookUrl);
        setGeneratedLookBase64(outfit.generatedLookBase64);
        alert("Outfit loaded. You can now edit it or generate a video.");
        window.scrollTo(0, 0);
    }, []);

    const handleDeleteOutfit = useCallback((id: number) => {
        if (window.confirm("Are you sure you want to delete this saved outfit?")) {
            setSavedOutfits(prev => prev.filter(outfit => outfit.id !== id));
        }
    }, []);

    const renderDressingRoom = () => (
        <div className="flex flex-col">
            <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
                <div className="panel flex flex-col gap-4">
                    <h2 className="text-xl font-semibold text-amber-400">1. Imagem do Cliente</h2>
                    <ImageUploader id="cliente-img-input" label="" onImageUpload={setClientImage} previewUrl={clientImage?.url} placeholderText="Arraste ou clique para enviar a foto do cliente" aspectRatio="portrait" />
                </div>

                <div className="panel flex flex-col gap-4">
                    <h2 className="text-xl font-semibold text-amber-400">2. Itens de Vestuário</h2>
                    <div className="flex flex-col gap-4 flex-grow overflow-y-auto min-h-0">
                        <ImageUploader id="superior-img-input" label="Superior" onImageUpload={setTopImage} previewUrl={topImage?.url} placeholderText="Peça Superior" />
                        <ImageUploader id="inferior-img-input" label="Inferior" onImageUpload={setBottomImage} previewUrl={bottomImage?.url} placeholderText="Peça Inferior" />
                    </div>
                    <button 
                        id="criar-look-btn" 
                        className="btn-primary w-full mt-auto" 
                        onClick={handleCreateLook} 
                        disabled={!clientImage || !topImage || !bottomImage || isCreatingLook}
                    >
                        {isCreatingLook ? 'Criando Look...' : 'Criar Look'}
                    </button>
                </div>
                
                <div className="panel flex flex-col gap-4">
                    <h2 className="text-xl font-semibold text-amber-400">3. Resultado Gerado</h2>
                    <div id="resultado-container" className={`relative w-full bg-gray-700 rounded-lg flex items-center justify-center transition-all duration-300 ${aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-[16/9]'}`}>
                        {isCreatingLook && <LoadingSpinner />}
                        <img id="resultado-img" src={generatedLook ?? `https://placehold.co/${aspectRatio === '9:16' ? '900x1600' : '1600x900'}/374151/ca8a04?text=Aguardando...`} alt="Look Gerado" className="w-full h-full object-contain rounded-lg" />
                    </div>
                    <div className="flex flex-col gap-4 mt-auto">
                        <div>
                            <h3 className="text-lg font-medium text-amber-400">Proporção</h3>
                            <div className="flex gap-2 mt-1">
                                {(['9:16', '16:9'] as const).map(ratio => (
                                    <button key={ratio} onClick={() => setAspectRatio(ratio)} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${aspectRatio === ratio ? 'bg-teal-600 text-white' : 'bg-gray-600 text-gray-200 hover:bg-gray-500'}`}>
                                        {ratio} {ratio === '9:16' ? '(V)' : '(H)'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div id="post-actions" className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <button onClick={() => setShowEditModal(true)} className="btn-secondary flex-1" disabled={!generatedLook}>Editar</button>
                            <button onClick={handleDownload} className="btn-secondary flex-1" disabled={!generatedLook}>Baixar</button>
                            <button onClick={handleSaveOutfit} className="btn-secondary flex-1" disabled={!generatedLook || !clientImage?.file}>Salvar</button>
                        </div>
                        <VideoGenerator imageBase64={generatedLookBase64} aspectRatio={aspectRatio} />
                    </div>
                </div>
            </div>
             {savedOutfits.length > 0 && (
                <div className="px-6 pb-6">
                    <HistoryPanel
                        outfits={savedOutfits}
                        onLoad={handleLoadOutfit}
                        onDelete={handleDeleteOutfit}
                    />
                </div>
            )}
            {showEditModal && generatedLook && (
                <EditImageModal imageUrl={generatedLook} onClose={() => setShowEditModal(false)} onEdit={handleEditLook} isEditing={isEditing} />
            )}
        </div>
    );
    
    const renderImageGenerator = () => (
        <div className="w-full max-w-5xl mx-auto p-6 flex flex-col items-center">
            <div className="w-full max-w-2xl panel">
                <h2 className="text-2xl font-bold text-amber-400 mb-4">Gerador de Imagem AI</h2>
                <p className="text-gray-300 mb-6">Descreva a imagem que você quer criar. Seja detalhista para melhores resultados.</p>
                <form onSubmit={handleGenerateImage} className="flex flex-col gap-4">
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Ex: Um astronauta andando a cavalo em marte, arte digital fotorrealista"
                        className="w-full p-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-shadow resize-none"
                        rows={4}
                        disabled={isGeneratingImage}
                    />
                    <button
                        type="submit"
                        className="btn-primary w-full"
                        disabled={!prompt.trim() || isGeneratingImage}
                    >
                        {isGeneratingImage ? 'Gerando...' : 'Gerar Imagem'}
                    </button>
                </form>
            </div>
            <div className="mt-8 w-full max-w-2xl">
                <h3 className="text-xl font-semibold text-amber-400 mb-4 text-center">Resultado</h3>
                <div className="relative aspect-square bg-gray-700 rounded-lg flex items-center justify-center panel">
                    {isGeneratingImage && <LoadingSpinner />}
                    {generatedImage ? (
                        <img src={generatedImage} alt="Imagem gerada" className="w-full h-full object-contain rounded-lg" />
                    ) : (
                        <p className="text-gray-400">A imagem gerada aparecerá aqui.</p>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="h-screen bg-gray-900 text-amber-300 flex flex-col">
            <AppHeader activeTab={activeTab} onTabChange={setActiveTab} />
            <main className="flex-grow overflow-y-auto">
                {activeTab === 'dressingRoom' ? renderDressingRoom() : renderImageGenerator()}
            </main>
        </div>
    );
}

export default App;