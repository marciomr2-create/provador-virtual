
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
    <div className="absolute inset-0 bg-[#0a0a0b]/90 backdrop-blur-md flex flex-col items-center justify-center rounded-xl z-50 border border-[#D4AF37]/20 px-6 text-center">
        <div className="w-16 h-16 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mb-6"></div>
        <p className="text-[#D4AF37] font-bold animate-pulse tracking-widest uppercase text-[10px] leading-relaxed max-w-[200px]">{message}</p>
    </div>
);

const AppHeader: React.FC<{ onReset: () => void }> = ({ onReset }) => (
    <header className="bg-[#050505] border-b border-[#27272a] p-6 sticky top-0 z-[100] shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-col">
                <h1 className="text-4xl font-black text-[#D4AF37] tracking-tighter italic flex items-baseline">
                    VOFY
                    <span className="text-[12px] font-normal not-italic lowercase tracking-normal ml-2 opacity-50">(mvp)</span>
                </h1>
                <span className="text-[10px] text-[#FDFBF7]/60 font-bold uppercase tracking-[0.3em] -mt-1">Provador Digital de Alta Performance</span>
            </div>
            <div className="flex gap-4 items-center">
                 <button 
                    onClick={onReset}
                    className="flex items-center gap-2 px-6 py-2.5 bg-red-900/40 hover:bg-red-800/60 text-white border border-red-700/50 rounded-full transition-all group shadow-lg active:scale-90"
                 >
                    <svg className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    <span className="text-[11px] font-black uppercase tracking-[0.15em]">LIMPAR TUDO</span>
                 </button>
            </div>
        </div>
    </header>
);

export default function App() {
    const { isKeySelected, selectKey } = useApiKey();
    const [clientImage, setClientImage] = useState<ImageData | null>(null);
    const [topImage, setTopImage] = useState<ImageData | null>(null);
    const [bottomImage, setBottomImage] = useState<ImageData | null>(null);
    const [fullBodyImage, setFullBodyImage] = useState<ImageData | null>(null);
    
    const [clothingResetKey, setClothingResetKey] = useState(0);
    const [clientResetKey, setClientResetKey] = useState(0);
    
    const [generatedLook, setGeneratedLook] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorState, setErrorState] = useState<'NONE' | 'QUOTA' | 'AUTH' | 'GENERIC'>('NONE');
    const [loadingMessage, setLoadingMessage] = useState('');
    const [savedOutfits, setSavedOutfits] = useState<SavedOutfit[]>([]);

    useEffect(() => {
        const stored = localStorage.getItem('vofy_history_v1');
        if (stored) setSavedOutfits(JSON.parse(stored));
    }, []);

    useEffect(() => {
        localStorage.setItem('vofy_history_v1', JSON.stringify(savedOutfits));
    }, [savedOutfits]);

    const handleGlobalReset = useCallback(() => {
        setClientImage(null);
        setTopImage(null);
        setBottomImage(null);
        setFullBodyImage(null);
        setGeneratedLook(null);
        setErrorState('NONE');
        setClientResetKey(k => k + 1);
        setClothingResetKey(k => k + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    const handleCreateLook = async () => {
        if (!clientImage || (!topImage && !bottomImage && !fullBodyImage)) {
            alert("Selecione sua foto base e as roupas.");
            return;
        }
        
        setIsProcessing(true);
        setErrorState('NONE');
        setLoadingMessage('Executando Costura Digital...');

        try {
            const getB64 = async (img: ImageData | null) => {
                if (!img) return null;
                if (img.file) return await fileToBase64(img.file);
                return img.url.startsWith('data:') ? img.url.split(',')[1] : null;
            };

            const personB64 = await getB64(clientImage);
            const topB64 = await getB64(topImage);
            const bottomB64 = await getB64(bottomImage);
            const fullBodyB64 = await getB64(fullBodyImage);

            const resultB64 = await generateLook(personB64!, topB64, bottomB64, fullBodyB64);
            setGeneratedLook(`data:image/jpeg;base64,${resultB64}`);
        } catch (error: any) {
            if (error.message === 'QUOTA_EXCEEDED') setErrorState('QUOTA');
            else if (error.message === 'AUTH_REQUIRED') setErrorState('AUTH');
            else setErrorState('GENERIC');
        } finally {
            setIsProcessing(false);
        }
    };

    // TELA DE ACESSO AO ATELIÊ (PARA LIBERAR O MOTOR PRO)
    if (!isKeySelected) {
        return (
            <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-6 text-center">
                <div className="max-w-md w-full bg-[#161618] border border-[#D4AF37]/30 p-12 rounded-[2rem] shadow-2xl animate-in zoom-in duration-700">
                    <h1 className="text-5xl font-black text-[#D4AF37] italic mb-2 tracking-tighter flex items-baseline justify-center">
                        VOFY
                        <span className="text-[14px] font-normal not-italic lowercase tracking-normal ml-3 opacity-40">(mvp)</span>
                    </h1>
                    <p className="text-[#FDFBF7]/40 text-[10px] uppercase tracking-[0.4em] mb-12">Provador de Luxo</p>
                    <p className="text-[#FDFBF7]/60 text-sm mb-12 leading-relaxed">
                        Bem-vindo ao Ateliê. Para utilizar nosso motor de <span className="text-[#D4AF37]">Alta Fidelidade PRO</span>, clique no botão abaixo para autorizar o acesso.
                    </p>
                    <button 
                        onClick={selectKey}
                        className="btn-primary w-full py-5 text-lg shadow-[0_0_50px_rgba(212,175,55,0.2)]"
                    >
                        ACESSAR ATELIÊ
                    </button>
                    <p className="mt-8 text-[9px] text-[#FDFBF7]/20 uppercase tracking-widest">Tecnologia Gemini 3 Pro</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0b] text-[#FDFBF7] font-sans pb-32">
            <AppHeader onReset={handleGlobalReset} />
            
            <main className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Controles */}
                <div className="lg:col-span-4 space-y-6">
                    <section className="bg-[#161618] p-6 rounded-3xl border border-[#27272a] shadow-xl">
                        <h2 className="text-xl font-bold text-[#D4AF37] mb-6 flex items-center gap-3 italic">
                            1. Sua Foto
                        </h2>
                        <ImageUploader 
                            key={`client-${clientResetKey}`}
                            id="client-up" 
                            label="" 
                            placeholderText="Foto Base" 
                            onImageUpload={setClientImage} 
                            previewUrl={clientImage?.url} 
                            aspectRatio="portrait"
                        />
                    </section>

                    <section className="bg-[#161618] p-6 rounded-3xl border border-[#27272a] shadow-xl">
                        <h2 className="text-xl font-bold text-[#D4AF37] mb-6 flex items-center gap-3 italic">
                            2. Peças
                        </h2>
                        <div className="space-y-6">
                            <ImageUploader 
                                key={`full-${clothingResetKey}`}
                                id="full-up" 
                                label="VESTIDO / MACACÃO" 
                                placeholderText="Peça Única" 
                                onImageUpload={(img) => { setTopImage(null); setBottomImage(null); setFullBodyImage(img); }} 
                                previewUrl={fullBodyImage?.url}
                                aspectRatio="portrait"
                            />
                            
                            <div className="grid grid-cols-2 gap-4">
                                <ImageUploader id="top-up" label="SUP" placeholderText="Blusa" onImageUpload={(img) => { setFullBodyImage(null); setTopImage(img); }} previewUrl={topImage?.url} />
                                <ImageUploader id="bot-up" label="INF" placeholderText="Calça" onImageUpload={(img) => { setFullBodyImage(null); setBottomImage(img); }} previewUrl={bottomImage?.url} />
                            </div>
                        </div>

                        <button 
                            onClick={handleCreateLook}
                            disabled={isProcessing || !clientImage}
                            className="w-full mt-8 btn-primary py-5 text-lg shadow-2xl group relative overflow-hidden"
                        >
                            <span className="relative z-10">{isProcessing ? 'GERANDO LOOK...' : 'EXECUTAR PROVA PRO'}</span>
                        </button>
                    </section>
                </div>

                {/* Resultado */}
                <div className="lg:col-span-8 space-y-6">
                    <section className="bg-[#161618] p-6 rounded-3xl border border-[#27272a] shadow-xl min-h-[650px] flex flex-col relative overflow-hidden">
                        <div className="relative flex-grow bg-black/80 rounded-2xl overflow-hidden border border-[#27272a] flex items-center justify-center min-h-[550px]">
                            {isProcessing && <LoadingOverlay message={loadingMessage} />}
                            
                            {errorState === 'AUTH' && (
                                <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-8 text-center">
                                    <h3 className="text-[#D4AF37] font-black mb-4 uppercase">Sessão Expirada</h3>
                                    <button onClick={selectKey} className="btn-primary px-8 py-3">REATIVAR ATELIÊ</button>
                                </div>
                            )}

                            {errorState === 'QUOTA' && (
                                <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-8 text-center">
                                    <h3 className="text-[#D4AF37] font-black mb-4 uppercase tracking-widest">Muitos Pedidos</h3>
                                    <p className="text-xs text-[#FDFBF7]/60 mb-8 max-w-[250px]">O Ateliê Pro está atendendo muitos convidados. Tente novamente em 60 segundos.</p>
                                    <button onClick={handleCreateLook} className="btn-primary px-8 py-3">TENTAR NOVAMENTE</button>
                                </div>
                            )}

                            {generatedLook ? (
                                <img src={generatedLook} alt="Look Final" className="max-w-full max-h-[800px] object-contain shadow-2xl animate-in fade-in duration-1000" />
                            ) : !isProcessing && errorState === 'NONE' ? (
                                <div className="text-center p-12 opacity-10">
                                    <p className="font-black uppercase tracking-[0.5em] text-[12px]">Seu Ateliê Digital</p>
                                </div>
                            ) : null}
                        </div>

                        {generatedLook && errorState === 'NONE' && (
                            <div className="mt-8 grid grid-cols-2 gap-4">
                                <button onClick={handleGlobalReset} className="py-4 bg-black border border-[#27272a] rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-950/20">Novo Look</button>
                                <a href={generatedLook} download="vofy-pro.jpg" className="btn-primary py-4 text-center rounded-2xl font-black">EXPORTAR HD</a>
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
}
