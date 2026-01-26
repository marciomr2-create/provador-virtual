
import React, { useState, useEffect } from 'react';
import { 
    fileToBase64, 
    generateLook, 
    resizeImageDataUrl 
} from './services/geminiService';
import { ImageUploader } from './components/ImageUploader';
import { HistoryPanel } from './components/HistoryPanel';
import { VideoGenerator } from './components/VideoGenerator';
import { ImageData, SavedOutfit } from './types';

const LoadingOverlay: React.FC<{ message: string }> = ({ message }) => (
    <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl z-20 border border-teal-500/30">
        <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-teal-400 font-bold animate-pulse">{message}</p>
    </div>
);

const AppHeader: React.FC = () => (
    <header className="bg-gray-900 border-b border-gray-800 p-6 sticky top-0 z-30 shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <h1 className="text-4xl font-black text-amber-400 tracking-tighter italic">
                PROVADOR DIGITAL<span className="text-teal-500">.AI</span>
            </h1>
            <p className="text-gray-400 text-sm font-medium tracking-widest uppercase">
                Powered by Gemini 2.5
            </p>
        </div>
    </header>
);

export default function App() {
    // Estados das Imagens
    const [clientImage, setClientImage] = useState<ImageData | null>(null);
    const [topImage, setTopImage] = useState<ImageData | null>(null);
    const [bottomImage, setBottomImage] = useState<ImageData | null>(null);
    const [fullBodyImage, setFullBodyImage] = useState<ImageData | null>(null);
    
    // Chaves de Reset para forçar remount dos componentes e limpeza física dos inputs
    const [clothingResetKey, setClothingResetKey] = useState(0);
    const [clientResetKey, setClientResetKey] = useState(0);
    
    // Resultados
    const [generatedLook, setGeneratedLook] = useState<string | null>(null);
    const [generatedLookBase64, setGeneratedLookBase64] = useState<string | null>(null);
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
    
    // UI State
    const [isProcessing, setIsProcessing] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [savedOutfits, setSavedOutfits] = useState<SavedOutfit[]>([]);

    useEffect(() => {
        const stored = localStorage.getItem('provador_history');
        if (stored) setSavedOutfits(JSON.parse(stored));
    }, []);

    useEffect(() => {
        localStorage.setItem('provador_history', JSON.stringify(savedOutfits));
    }, [savedOutfits]);

    /**
     * Helper para converter ImageData para Base64 independentemente da origem (File ou DataURL)
     */
    const getB64 = async (img: ImageData | null): Promise<string | null> => {
        if (!img) return null;
        if (img.file) return await fileToBase64(img.file);
        if (img.url.startsWith('data:')) return img.url.split(',')[1];
        return null;
    };

    /**
     * NOVA PROVA: Limpa apenas os quadros de peças (superior, inferior, única)
     * e o resultado gerado. Mantém a foto do cliente.
     */
    const handleNewTryOn = () => {
        setTopImage(null);
        setBottomImage(null);
        setFullBodyImage(null);
        setGeneratedLook(null);
        setGeneratedLookBase64(null);
        setGeneratedVideoUrl(null);
        
        // Incrementa a chave para limpar fisicamente os componentes de upload de roupas
        setClothingResetKey(prev => prev + 1);
        
        const clothingSection = document.getElementById('clothing-selection');
        if (clothingSection) {
            clothingSection.scrollIntoView({ behavior: 'smooth' });
        }
    };

    /**
     * TROCAR CLIENTE: Limpa TUDO. Reinicia o procedimento do zero.
     */
    const handleResetAll = () => {
        if (window.confirm("Deseja trocar o cliente? Todas as imagens atuais serão removidas.")) {
            setClientImage(null);
            setClientResetKey(prev => prev + 1);
            handleNewTryOn(); 
        }
    };

    const handleCreateLook = async () => {
        if (!clientImage || (!topImage && !bottomImage && !fullBodyImage)) {
            alert("Por favor, selecione ao menos uma peça de roupa para provar.");
            return;
        }
        
        setIsProcessing(true);
        setLoadingMessage('Criando seu novo visual...');
        setGeneratedVideoUrl(null);

        try {
            const personB64 = await getB64(clientImage);
            const topB64 = await getB64(topImage);
            const bottomB64 = await getB64(bottomImage);
            const fullBodyB64 = await getB64(fullBodyImage);

            if (!personB64) throw new Error("Imagem do cliente inválida.");

            const resultB64 = await generateLook(personB64, topB64, bottomB64, fullBodyB64);
            setGeneratedLookBase64(resultB64);
            setGeneratedLook(`data:image/jpeg;base64,${resultB64}`);
        } catch (error: any) {
            alert(`Erro ao gerar look: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSaveOutfit = async () => {
        if (!generatedLook) return;
        setIsProcessing(true);
        setLoadingMessage('Salvando no histórico...');
        try {
            const thumb = await resizeImageDataUrl(generatedLook, 300, 533);
            const newOutfit: SavedOutfit = {
                id: Date.now(),
                clientImageUrl: clientImage?.url || '',
                topImageUrl: topImage?.url || null,
                bottomImageUrl: bottomImage?.url || null,
                fullBodyImageUrl: fullBodyImage?.url || null,
                generatedLookUrl: thumb
            };
            setSavedOutfits([newOutfit, ...savedOutfits.slice(0, 19)]);
            alert("Look salvo!");
        } catch (e) {
            alert("Erro ao salvar histórico.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleLoadOutfit = (outfit: SavedOutfit) => {
        setClientImage({ url: outfit.clientImageUrl });
        setTopImage(outfit.topImageUrl ? { url: outfit.topImageUrl } : null);
        setBottomImage(outfit.bottomImageUrl ? { url: outfit.bottomImageUrl } : null);
        setFullBodyImage(outfit.fullBodyImageUrl ? { url: outfit.fullBodyImageUrl } : null);
        setGeneratedLook(outfit.generatedLookUrl);
        setGeneratedLookBase64(outfit.generatedLookUrl.includes(',') ? outfit.generatedLookUrl.split(',')[1] : null);
        setGeneratedVideoUrl(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-[#0a0a0c] text-gray-100 selection:bg-teal-500/30 font-sans">
            <AppHeader />
            
            <main className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                <div className="lg:col-span-4 space-y-6">
                    <section className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800 shadow-xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2">
                                <span className="bg-amber-400 text-black w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold">1</span>
                                Sua Foto
                            </h2>
                            {clientImage && (
                                <button 
                                    onClick={handleResetAll} 
                                    className="text-[10px] uppercase font-bold text-gray-500 hover:text-red-400 transition-colors border-b border-transparent hover:border-red-400/30"
                                >
                                    Trocar Cliente
                                </button>
                            )}
                        </div>
                        <ImageUploader 
                            key={`client-${clientResetKey}`}
                            id="client-up" 
                            label="" 
                            placeholderText="Arraste ou clique (corpo inteiro)" 
                            onImageUpload={setClientImage} 
                            previewUrl={clientImage?.url} 
                            aspectRatio="portrait"
                        />
                    </section>

                    <section id="clothing-selection" className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800 shadow-xl">
                        <h2 className="text-xl font-bold text-amber-400 mb-6 flex items-center gap-2">
                            <span className="bg-amber-400 text-black w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold">2</span>
                            Novas Peças
                        </h2>
                        <div className="space-y-4">
                            <ImageUploader 
                                key={`full-${clothingResetKey}`}
                                id="full-up" 
                                label="Peça Única / Vestido" 
                                placeholderText="Vestidos, Macacões, etc." 
                                onImageUpload={setFullBodyImage} 
                                previewUrl={fullBodyImage?.url}
                                aspectRatio="portrait"
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <ImageUploader 
                                    key={`top-${clothingResetKey}`}
                                    id="top-up" 
                                    label="Parte Superior" 
                                    placeholderText="Blusa, Jaqueta" 
                                    onImageUpload={setTopImage} 
                                    previewUrl={topImage?.url}
                                />
                                <ImageUploader 
                                    key={`bottom-${clothingResetKey}`}
                                    id="bottom-up" 
                                    label="Parte Inferior" 
                                    placeholderText="Calça, Saia" 
                                    onImageUpload={setBottomImage} 
                                    previewUrl={bottomImage?.url}
                                />
                            </div>
                        </div>
                        <button 
                            onClick={handleCreateLook}
                            disabled={isProcessing || !clientImage}
                            className="w-full mt-8 btn-primary py-4 text-lg shadow-lg shadow-teal-500/20 active:scale-95 transition-all"
                        >
                            {isProcessing ? 'PROCESSANDO...' : 'GERAR LOOK'}
                        </button>
                    </section>
                </div>

                <div className="lg:col-span-8 space-y-6">
                    <section className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800 shadow-xl min-h-[600px] flex flex-col relative overflow-hidden">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-teal-400 uppercase tracking-widest">Visualização do Outfit</h2>
                            {generatedLook && (
                                <span className="text-xs bg-teal-500/10 text-teal-400 px-3 py-1 rounded-full border border-teal-500/20">Alta Definição</span>
                            )}
                        </div>

                        <div className="relative flex-grow bg-black/40 rounded-xl overflow-hidden border border-gray-800 flex items-center justify-center min-h-[500px]">
                            {isProcessing && <LoadingOverlay message={loadingMessage} />}
                            
                            {generatedLook ? (
                                <img src={generatedLook} alt="Look Gerado" className="max-w-full max-h-[700px] object-contain shadow-2xl animate-in fade-in zoom-in duration-500" />
                            ) : (
                                <div className="text-gray-600 text-center p-8 max-w-sm">
                                    <div className="w-20 h-20 mx-auto mb-6 bg-gray-800 rounded-full flex items-center justify-center opacity-30">
                                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                    </div>
                                    <p className="font-medium text-lg mb-2">Aguardando Criação</p>
                                    <p className="text-sm opacity-50">Sua foto está carregada. Escolha novas peças ao lado para trocá-las.</p>
                                </div>
                            )}
                        </div>

                        {generatedLook && (
                            <div className="animate-in slide-in-from-bottom-4 duration-500">
                                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <button 
                                        onClick={handleNewTryOn} 
                                        className="btn-secondary flex items-center justify-center gap-2 py-3 border border-amber-500/30 hover:border-amber-500/60 transition-all bg-amber-500/10 hover:bg-amber-500/20 shadow-inner group"
                                    >
                                        <svg className="w-4 h-4 text-amber-400 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                                        Nova Prova
                                    </button>
                                    <button onClick={handleSaveOutfit} className="btn-secondary flex items-center justify-center gap-2 py-3">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>
                                        Salvar Look
                                    </button>
                                    <a href={generatedLook} download="meu-novo-look.jpg" className="btn-primary flex items-center justify-center gap-2 py-3 text-center">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                        Baixar Foto
                                    </a>
                                </div>

                                <div className="mt-8 pt-8 border-t border-gray-800">
                                    <h3 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                                        Gerar Vídeo de Visualização
                                    </h3>
                                    <VideoGenerator 
                                        imageBase64={generatedLookBase64}
                                        aspectRatio="9:16"
                                        onVideoGenerated={setGeneratedVideoUrl}
                                        onGenerationStateChange={(loading, err) => {
                                            if (err) console.error(err);
                                        }}
                                    />
                                    {generatedVideoUrl && (
                                        <div className="mt-4 bg-black rounded-xl overflow-hidden border border-teal-500/30 shadow-2xl">
                                            <video src={generatedVideoUrl} controls className="w-full h-auto" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </section>
                    
                    {savedOutfits.length > 0 && (
                        <section className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800 shadow-xl">
                            <HistoryPanel 
                                outfits={savedOutfits} 
                                onLoad={handleLoadOutfit} 
                                onDelete={(id) => setSavedOutfits(s => s.filter(o => o.id !== id))} 
                            />
                        </section>
                    )}
                </div>
            </main>
        </div>
    );
}
