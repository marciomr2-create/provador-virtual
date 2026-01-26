
import React, { useState, useEffect, useCallback } from 'react';
import { 
    fileToBase64, 
    generateLook, 
    resizeImageDataUrl 
} from './services/geminiService';
import { useApiKey } from './hooks/useApiKey';
import { ImageUploader } from './components/ImageUploader';
import { HistoryPanel } from './components/HistoryPanel';
import { ImageData, SavedOutfit } from './types';

const LoadingOverlay: React.FC<{ message: string }> = ({ message }) => (
    <div className="absolute inset-0 bg-[#0a0a0b]/90 backdrop-blur-md flex flex-col items-center justify-center rounded-xl z-50 border border-[#D4AF37]/20">
        <div className="w-16 h-16 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mb-6"></div>
        <p className="text-[#D4AF37] font-bold animate-pulse text-center px-6 tracking-widest uppercase text-xs leading-relaxed">{message}</p>
    </div>
);

const AppHeader: React.FC<{ onReset: () => void }> = ({ onReset }) => (
    <header className="bg-[#050505] border-b border-[#27272a] p-6 sticky top-0 z-[100] shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-col">
                <h1 className="text-4xl font-black text-[#D4AF37] tracking-tighter italic">
                    VOFY
                </h1>
                <span className="text-[10px] text-[#FDFBF7]/60 font-bold uppercase tracking-[0.3em] -mt-1">Provador Digital de Alta Fidelidade</span>
            </div>
            <div className="flex gap-4 items-center">
                 <button 
                    onClick={onReset}
                    title="Limpar tudo (inclusive sua foto)"
                    className="flex items-center gap-2 px-6 py-2.5 bg-red-900/40 hover:bg-red-800/60 text-white border border-red-700/50 rounded-full transition-all group shadow-lg active:scale-90"
                 >
                    <svg className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    <span className="text-[11px] font-black uppercase tracking-[0.15em]">LIMPAR TUDO</span>
                 </button>
                 <div className="px-4 py-2 bg-[#161618] rounded-full border border-[#27272a] hidden sm:block">
                    <p className="text-[#FDFBF7]/60 text-[10px] font-bold tracking-widest uppercase">
                        Motor: <span className="text-[#D4AF37]">Pro 6.0 Stable</span>
                    </p>
                 </div>
            </div>
        </div>
    </header>
);

export default function App() {
    const { isKeySelected, selectKey, resetKeySelection } = useApiKey();

    // Estados de Imagem
    const [clientImage, setClientImage] = useState<ImageData | null>(null);
    const [topImage, setTopImage] = useState<ImageData | null>(null);
    const [bottomImage, setBottomImage] = useState<ImageData | null>(null);
    const [fullBodyImage, setFullBodyImage] = useState<ImageData | null>(null);
    
    // Chaves para Forçar Reset de Componentes
    const [clothingResetKey, setClothingResetKey] = useState(0);
    const [clientResetKey, setClientResetKey] = useState(0);
    
    // Estados de Resultado
    const [generatedLook, setGeneratedLook] = useState<string | null>(null);
    const [generatedLookBase64, setGeneratedLookBase64] = useState<string | null>(null);
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [savedOutfits, setSavedOutfits] = useState<SavedOutfit[]>([]);

    useEffect(() => {
        const stored = localStorage.getItem('provador_history_v6');
        if (stored) setSavedOutfits(JSON.parse(stored));
    }, []);

    useEffect(() => {
        localStorage.setItem('provador_history_v6', JSON.stringify(savedOutfits));
    }, [savedOutfits]);

    const revokeUrls = useCallback((...images: (ImageData | null | string)[]) => {
        images.forEach(img => {
            if (img && typeof img === 'object' && img.url && img.url.startsWith('blob:')) {
                URL.revokeObjectURL(img.url);
            } else if (typeof img === 'string' && img.startsWith('blob:')) {
                URL.revokeObjectURL(img);
            }
        });
    }, []);

    const handleTrialReset = useCallback(() => {
        revokeUrls(topImage, bottomImage, fullBodyImage);
        setTopImage(null);
        setBottomImage(null);
        setFullBodyImage(null);
        setGeneratedLook(null);
        setGeneratedLookBase64(null);
        setClothingResetKey(k => k + 1);
        const el = document.getElementById('clothing-selection');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, [topImage, bottomImage, fullBodyImage, revokeUrls]);

    const handleGlobalReset = useCallback(() => {
        revokeUrls(clientImage, topImage, bottomImage, fullBodyImage);
        setClientImage(null);
        setTopImage(null);
        setBottomImage(null);
        setFullBodyImage(null);
        setGeneratedLook(null);
        setGeneratedLookBase64(null);
        setClientResetKey(k => k + 1);
        setClothingResetKey(k => k + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [clientImage, topImage, bottomImage, fullBodyImage, revokeUrls]);

    const getB64 = async (img: ImageData | null): Promise<string | null> => {
        if (!img) return null;
        if (img.file) return await fileToBase64(img.file);
        if (img.url.startsWith('data:')) return img.url.split(',')[1];
        return null;
    };

    const onSelectFullBody = (img: ImageData) => {
        setTopImage(null);
        setBottomImage(null);
        setFullBodyImage(img);
    };

    const onSelectModular = (type: 'top' | 'bottom', img: ImageData) => {
        setFullBodyImage(null);
        if (type === 'top') setTopImage(img);
        else setBottomImage(img);
    };

    const handleCreateLook = async () => {
        if (!isKeySelected) {
            await selectKey();
            return;
        }

        if (!clientImage || (!topImage && !bottomImage && !fullBodyImage)) {
            alert("Selecione sua foto e pelo menos uma peça de roupa.");
            return;
        }
        
        setIsProcessing(true);
        setLoadingMessage('Sincronizando pixels de luxo...');

        try {
            const personB64 = await getB64(clientImage);
            const topB64 = await getB64(topImage);
            const bottomB64 = await getB64(bottomImage);
            const fullBodyB64 = await getB64(fullBodyImage);

            if (!personB64) throw new Error("Imagem base corrompida.");

            const resultB64 = await generateLook(personB64, topB64, bottomB64, fullBodyB64);
            setGeneratedLookBase64(resultB64);
            setGeneratedLook(`data:image/jpeg;base64,${resultB64}`);
        } catch (error: any) {
            console.error(error);
            if (error.message.includes("API_KEY_ERROR")) {
                alert("Erro de API: Verifique sua chave Pro.");
                resetKeySelection();
            } else {
                alert(`Erro: ${error.message}`);
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSaveOutfit = async () => {
        if (!generatedLook) return;
        setIsProcessing(true);
        setLoadingMessage('Arquivando na coleção privada...');
        try {
            const thumb = await resizeImageDataUrl(generatedLook, 600, 800);
            const newOutfit: SavedOutfit = {
                id: Date.now(),
                clientImageUrl: clientImage?.url || '',
                topImageUrl: topImage?.url || null,
                bottomImageUrl: bottomImage?.url || null,
                fullBodyImageUrl: fullBodyImage?.url || null,
                generatedLookUrl: thumb
            };
            setSavedOutfits([newOutfit, ...savedOutfits.slice(0, 19)]);
        } catch (e) {
            alert("Erro ao salvar.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0b] text-[#FDFBF7] selection:bg-[#D4AF37]/30 font-sans pb-32">
            <AppHeader onReset={handleGlobalReset} />
            
            <main className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4 space-y-6">
                    {/* CLIENTE */}
                    <section className="bg-[#161618] p-6 rounded-3xl border border-[#27272a] shadow-xl backdrop-blur-sm">
                        <h2 className="text-xl font-bold text-[#D4AF37] mb-6 flex items-center gap-3">
                            <span className="bg-[#D4AF37] text-black w-7 h-7 flex items-center justify-center rounded-full text-xs font-black">1</span>
                            Sua Foto Base
                        </h2>
                        <ImageUploader 
                            key={`client-instance-${clientResetKey}`}
                            id="client-up" 
                            label="" 
                            placeholderText="Upload Retrato de Corpo Inteiro" 
                            onImageUpload={setClientImage} 
                            previewUrl={clientImage?.url} 
                            aspectRatio="portrait"
                        />
                    </section>

                    {/* VESTUÁRIO */}
                    <section id="clothing-selection" className="bg-[#161618] p-6 rounded-3xl border border-[#27272a] shadow-xl backdrop-blur-sm">
                        <h2 className="text-xl font-bold text-[#D4AF37] mb-6 flex items-center gap-3">
                            <span className="bg-[#D4AF37] text-black w-7 h-7 flex items-center justify-center rounded-full text-xs font-black">2</span>
                            Vestuário
                        </h2>
                        <div className="space-y-6">
                            <div className={`p-4 bg-black/40 rounded-2xl border transition-all ${fullBodyImage ? 'border-[#D4AF37]/50 shadow-lg shadow-[#D4AF37]/10' : 'border-[#27272a]'}`}>
                                <ImageUploader 
                                    key={`full-instance-${clothingResetKey}`}
                                    id="full-up" 
                                    label="A: Vestido ou Conjunto" 
                                    placeholderText="Upload Peça Única" 
                                    onImageUpload={onSelectFullBody} 
                                    previewUrl={fullBodyImage?.url}
                                    aspectRatio="portrait"
                                />
                            </div>
                            
                            <div className={`p-4 bg-black/40 rounded-2xl border transition-all ${topImage || bottomImage ? 'border-[#D4AF37]/50 shadow-lg shadow-[#D4AF37]/10' : 'border-[#27272a]'}`}>
                                <span className="text-[10px] font-bold text-[#FDFBF7]/40 uppercase tracking-widest block mb-4 text-center">B: Peças Separadas</span>
                                <div className="grid grid-cols-2 gap-4">
                                    <ImageUploader 
                                        key={`top-instance-${clothingResetKey}`}
                                        id="top-up" 
                                        label="Superior" 
                                        placeholderText="Blusa" 
                                        onImageUpload={(img) => onSelectModular('top', img)} 
                                        previewUrl={topImage?.url}
                                    />
                                    <ImageUploader 
                                        key={`bottom-instance-${clothingResetKey}`}
                                        id="bottom-up" 
                                        label="Inferior" 
                                        placeholderText="Calça/Saia" 
                                        onImageUpload={(img) => onSelectModular('bottom', img)} 
                                        previewUrl={bottomImage?.url}
                                    />
                                </div>
                            </div>
                        </div>

                        {!isKeySelected ? (
                            <button 
                                onClick={selectKey}
                                className="w-full mt-8 py-5 bg-[#D4AF37]/5 hover:bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] font-black rounded-2xl transition-all uppercase tracking-widest text-[10px]"
                            >
                                Ativar Ateliê Digital (Chave API)
                            </button>
                        ) : (
                            <button 
                                onClick={handleCreateLook}
                                disabled={isProcessing || !clientImage}
                                className="w-full mt-8 btn-primary py-5 text-lg shadow-2xl relative overflow-hidden group border-none"
                            >
                                <span className="relative z-10">{isProcessing ? 'PROCESSANDO...' : 'EXECUTAR PROVA REAL'}</span>
                                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                            </button>
                        )}
                    </section>
                </div>

                <div className="lg:col-span-8 space-y-6">
                    {/* RESULTADO */}
                    <section className="bg-[#161618] p-6 rounded-3xl border border-[#27272a] shadow-xl min-h-[600px] flex flex-col relative overflow-hidden backdrop-blur-sm">
                        <div className="relative flex-grow bg-black/80 rounded-2xl overflow-hidden border border-[#27272a] flex items-center justify-center min-h-[500px]">
                            {isProcessing && <LoadingOverlay message={loadingMessage} />}
                            
                            {generatedLook ? (
                                <img src={generatedLook} alt="Look Gerado" className="max-w-full max-h-[750px] object-contain shadow-2xl animate-in fade-in zoom-in duration-1000" />
                            ) : (
                                <div className="text-[#FDFBF7]/20 text-center p-12 flex flex-col items-center">
                                    <div className="w-20 h-20 mb-6 bg-black/40 border-2 border-[#27272a] rounded-full flex items-center justify-center">
                                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 4v16m8-8H4"></path></svg>
                                    </div>
                                    <p className="font-black uppercase tracking-[0.4em] text-[10px]">Aguardando Criação</p>
                                </div>
                            )}
                        </div>

                        {generatedLook && (
                            <div className="animate-in slide-in-from-bottom-8 duration-700 mt-8">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <button 
                                        onClick={handleTrialReset} 
                                        className="py-4 px-6 bg-black hover:bg-red-950/20 hover:text-red-400 transition-colors border border-[#27272a] rounded-2xl font-black text-[10px] uppercase tracking-widest"
                                    >
                                        Limpar Tela
                                    </button>
                                    <button onClick={handleSaveOutfit} className="py-4 px-6 bg-black hover:bg-[#18181b] transition-colors border border-[#27272a] rounded-2xl font-black text-[10px] uppercase tracking-widest">Salvar no Acervo</button>
                                    <a href={generatedLook} download="vofy-pro.jpg" className="btn-primary py-4 text-center font-black rounded-2xl flex items-center justify-center gap-2">
                                        Exportar HD
                                    </a>
                                </div>
                            </div>
                        )}
                    </section>
                    
                    {savedOutfits.length > 0 && (
                        <HistoryPanel 
                            outfits={savedOutfits} 
                            onLoad={(outfit) => {
                                revokeUrls(clientImage, topImage, bottomImage, fullBodyImage);
                                setClientImage({ url: outfit.clientImageUrl });
                                setTopImage(outfit.topImageUrl ? { url: outfit.topImageUrl } : null);
                                setBottomImage(outfit.bottomImageUrl ? { url: outfit.bottomImageUrl } : null);
                                setFullBodyImage(outfit.fullBodyImageUrl ? { url: outfit.fullBodyImageUrl } : null);
                                setGeneratedLook(outfit.generatedLookUrl);
                                setGeneratedLookBase64(outfit.generatedLookUrl.split(',')[1]);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }} 
                            onDelete={(id) => setSavedOutfits(s => s.filter(o => o.id !== id))} 
                        />
                    )}
                </div>
            </main>
        </div>
    );
}
