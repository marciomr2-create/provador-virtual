
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
    <div className="absolute inset-0 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center rounded-3xl z-50 px-6 text-center border border-[#C6B8A6]/20">
        <div className="w-12 h-12 border-4 border-[#C6B8A6] border-t-transparent rounded-full animate-spin mb-6"></div>
        <p className="text-[#2B2B2B] font-bold animate-pulse tracking-widest uppercase text-[10px] leading-relaxed max-w-[200px]">{message}</p>
    </div>
);

const AppHeader: React.FC<{ onReset: () => void }> = ({ onReset }) => (
    <header className="bg-white border-b border-[#E8E7E4] p-6 sticky top-0 z-[100] shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-col">
                <h1 className="text-4xl font-black text-[#2B2B2B] tracking-tighter italic flex items-baseline">
                    VOFY
                    <span className="text-[12px] font-normal not-italic lowercase tracking-normal ml-2 text-[#7A7A7A]">(mvp)</span>
                </h1>
                <span className="text-[10px] text-[#C6B8A6] font-bold uppercase tracking-[0.3em] -mt-1">Provador Digital de Alta Fidelidade</span>
            </div>
            <div className="flex gap-4 items-center">
                 <button 
                    onClick={onReset}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#F6F5F2] hover:bg-[#E8E7E4] text-[#2B2B2B] border border-[#E8E7E4] rounded-full transition-all group active:scale-95"
                 >
                    <svg className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    <span className="text-[11px] font-bold uppercase tracking-[0.15em]">LIMPAR</span>
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
        setLoadingMessage('EXECUTANDO PROVA DIGITAL');

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

    if (!isKeySelected) {
        return (
            <div className="min-h-screen bg-[#F6F5F2] flex items-center justify-center p-6 text-center">
                <div className="max-w-md w-full bg-white border border-[#E8E7E4] p-12 rounded-[2.5rem] shadow-xl animate-in zoom-in duration-700">
                    <h1 className="text-5xl font-black text-[#2B2B2B] italic mb-2 tracking-tighter flex items-baseline justify-center">
                        VOFY
                        <span className="text-[14px] font-normal not-italic lowercase tracking-normal ml-3 text-[#7A7A7A] opacity-80">(mvp)</span>
                    </h1>
                    <p className="text-[#C6B8A6] text-[10px] uppercase tracking-[0.4em] mb-12 font-bold">Provador Digital Pro</p>
                    <p className="text-[#7A7A7A] text-sm mb-12 leading-relaxed">
                        Bem-vindo ao Ateliê Digital. Para utilizar nosso motor de <span className="text-[#2B2B2B] font-bold">Alta Fidelidade PRO</span>, clique abaixo para autorizar o acesso.
                    </p>
                    <button 
                        onClick={selectKey}
                        className="w-full py-5 text-lg rounded-2xl font-black uppercase tracking-widest bg-[#C6B8A6] text-white shadow-lg hover:bg-[#b5a896] transition-all"
                    >
                        ACESSAR ATELIÊ
                    </button>
                    <p className="mt-8 text-[9px] text-[#7A7A7A] uppercase tracking-widest font-medium">Tecnologia Gemini 3 Pro</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F6F5F2] text-[#2B2B2B] font-sans pb-32">
            <AppHeader onReset={handleGlobalReset} />
            
            <main className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Controles */}
                <div className="lg:col-span-4 space-y-6">
                    <section className="bg-white p-8 rounded-[2.5rem] border border-[#E8E7E4] shadow-sm">
                        <h2 className="text-lg font-bold text-[#2B2B2B] mb-6 flex items-center gap-3 italic uppercase tracking-widest">
                            <span className="w-8 h-8 rounded-full bg-[#E8E7E4] flex items-center justify-center text-[12px] not-italic">01</span>
                            Sua Foto
                        </h2>
                        <ImageUploader 
                            key={`client-${clientResetKey}`}
                            id="client-up" 
                            label="" 
                            placeholderText="FOTO BASE. FUNDO CLARO. ROUPAS SEM TONALIDADE DA PELE" 
                            onImageUpload={setClientImage} 
                            previewUrl={clientImage?.url} 
                            aspectRatio="portrait"
                        />
                    </section>

                    <section className="bg-white p-8 rounded-[2.5rem] border border-[#E8E7E4] shadow-sm">
                        <h2 className="text-lg font-bold text-[#2B2B2B] mb-6 flex items-center gap-3 italic uppercase tracking-widest">
                            <span className="w-8 h-8 rounded-full bg-[#E8E7E4] flex items-center justify-center text-[12px] not-italic">02</span>
                            Peças
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
                                <ImageUploader id="top-up" label="VESTI SUPERIOR" placeholderText="Blusa" onImageUpload={(img) => { setFullBodyImage(null); setTopImage(img); }} previewUrl={topImage?.url} />
                                <ImageUploader id="bot-up" label="VESTI INFERIOR" placeholderText="Calça" onImageUpload={(img) => { setFullBodyImage(null); setBottomImage(img); }} previewUrl={bottomImage?.url} />
                            </div>
                        </div>

                        <button 
                            onClick={handleCreateLook}
                            disabled={isProcessing || !clientImage}
                            className={`
                                w-full mt-10 py-5 text-lg font-black rounded-2xl uppercase tracking-widest shadow-lg transition-all active:scale-[0.98]
                                ${isProcessing || !clientImage 
                                    ? 'bg-[#E8E7E4] text-[#7A7A7A] cursor-not-allowed' 
                                    : 'bg-[#C6B8A6] text-white hover:bg-[#b5a896] hover:shadow-xl'}
                            `}
                        >
                            {isProcessing ? 'PROCESSANDO...' : 'EXECUTAR PROVA PRO'}
                        </button>
                    </section>
                </div>

                {/* Resultado */}
                <div className="lg:col-span-8 space-y-6">
                    <section className="bg-white p-8 rounded-[3rem] border border-[#E8E7E4] shadow-sm min-h-[650px] flex flex-col relative overflow-hidden">
                        <div className="relative flex-grow bg-[#F6F5F2] rounded-[2rem] overflow-hidden border border-[#E8E7E4] flex items-center justify-center min-h-[550px]">
                            {isProcessing && <LoadingOverlay message={loadingMessage} />}
                            
                            {errorState === 'AUTH' && (
                                <div className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center p-8 text-center">
                                    <h3 className="text-[#2B2B2B] font-black mb-4 uppercase">Sessão Expirada</h3>
                                    <button onClick={selectKey} className="bg-[#C6B8A6] text-white px-8 py-3 rounded-xl font-black hover:bg-[#b5a896]">REATIVAR ATELIÊ</button>
                                </div>
                            )}

                            {errorState === 'QUOTA' && (
                                <div className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center p-8 text-center">
                                    <h3 className="text-[#C6B8A6] font-black mb-4 uppercase tracking-widest">Aguarde um instante</h3>
                                    <p className="text-xs text-[#7A7A7A] mb-8 max-w-[250px]">O Ateliê está finalizando outros pedidos. Tente novamente em alguns segundos.</p>
                                    <button onClick={handleCreateLook} className="bg-[#C6B8A6] text-white px-8 py-3 rounded-xl font-black hover:bg-[#b5a896]">TENTAR NOVAMENTE</button>
                                </div>
                            )}

                            {generatedLook ? (
                                <img src={generatedLook} alt="Look Final" className="max-w-full max-h-[800px] object-contain shadow-sm animate-in fade-in zoom-in duration-1000" />
                            ) : !isProcessing && errorState === 'NONE' ? (
                                <div className="text-center p-12 text-[#7A7A7A]/40">
                                    <p className="font-black uppercase tracking-[0.5em] text-[10px]">VISUALIZAÇÃO DO LOOK</p>
                                </div>
                            ) : null}
                        </div>

                        {generatedLook && errorState === 'NONE' && (
                            <div className="mt-8 grid grid-cols-2 gap-4">
                                <button onClick={handleGlobalReset} className="py-4 bg-[#F6F5F2] border border-[#E8E7E4] rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-white transition-colors">Nova Prova</button>
                                <a href={generatedLook} download="vofy-pro.jpg" className="bg-[#C6B8A6] text-white py-4 text-center rounded-2xl font-black hover:bg-[#b5a896] transition-all shadow-md">SALVAR IMAGEM HD</a>
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
}
