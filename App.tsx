
import React, { useState, useEffect, useCallback } from 'react';
import { 
    fileToBase64, 
    generateLook
} from './services/geminiService';
import { useApiKey } from './hooks/useApiKey';
import { ImageUploader } from './components/ImageUploader';
import { ImageData } from './types';

const MASTER_PASSCODE = "OGUM";

const LoadingOverlay: React.FC<{ message: string }> = ({ message }) => (
    <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center rounded-[2.5rem] z-50 px-6 text-center border border-[#C6B8A6]/10 shadow-2xl animate-in fade-in duration-500">
        <div className="w-16 h-16 border-[3px] border-[#C6B8A6] border-t-transparent rounded-full animate-spin mb-8"></div>
        <p className="text-[#2B2B2B] font-bold tracking-[0.4em] uppercase text-[10px] leading-relaxed max-w-[250px] animate-pulse">
            {message}
        </p>
    </div>
);

const AppHeader: React.FC<{ onReset: () => void; onResetKey: () => void }> = ({ onReset, onResetKey }) => (
    <header className="bg-white/80 backdrop-blur-md border-b border-[#E8E7E4] p-6 sticky top-0 z-[100] shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-col">
                <h1 className="text-4xl font-black text-[#2B2B2B] tracking-tighter italic flex items-baseline">
                    VOFY
                    <span className="text-[12px] font-normal not-italic lowercase tracking-normal ml-2 text-[#C6B8A6]">pro</span>
                </h1>
                <span className="text-[9px] text-[#C6B8A6] font-bold uppercase tracking-[0.4em] -mt-1">Provador Digital de Alta Performance</span>
            </div>
            <div className="flex items-center gap-4">
                <button 
                    onClick={onResetKey}
                    className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#C6B8A6] hover:text-[#2B2B2B] transition-colors"
                >
                    Configurar Chave
                </button>
                <button 
                    onClick={onReset} 
                    className="flex items-center gap-2 px-8 py-3 bg-white hover:bg-[#F6F5F2] text-[#2B2B2B] border border-[#E8E7E4] rounded-full transition-all active:scale-95 shadow-sm group"
                >
                    <svg className="w-3.5 h-3.5 text-[#C6B8A6] group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Limpar Provador</span>
                </button>
            </div>
        </div>
    </header>
);

export default function App() {
    const { isKeySelected, selectKey, resetKeySelection, apiKey } = useApiKey();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [passcodeAttempt, setPasscodeAttempt] = useState("");
    const [manualApiKey, setManualApiKey] = useState("");
    
    const [clientImage, setClientImage] = useState<ImageData | null>(null);
    const [topImage, setTopImage] = useState<ImageData | null>(null);
    const [bottomImage, setBottomImage] = useState<ImageData | null>(null);
    const [fullBodyImage, setFullBodyImage] = useState<ImageData | null>(null);
    const [generatedLook, setGeneratedLook] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const storedAuth = localStorage.getItem('vofy_authorized_v2');
        if (storedAuth === 'true') setIsAuthorized(true);
    }, []);

    const handlePasscodeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (passcodeAttempt === MASTER_PASSCODE) {
            setIsAuthorized(true);
            localStorage.setItem('vofy_authorized_v2', 'true');
        } else {
            setPasscodeAttempt("");
            alert("Acesso Negado.");
        }
    };

    const handleGlobalReset = useCallback(() => {
        setClientImage(null); setTopImage(null); setBottomImage(null); setFullBodyImage(null); setGeneratedLook(null);
        setError(null);
    }, []);

    const handleCreateLook = async () => {
        if (!clientImage) return alert("Selecione sua foto base.");
        if (!fullBodyImage && !topImage && !bottomImage) return alert("Selecione pelo menos uma peça de roupa.");
        if (!apiKey) return alert("Chave de API não configurada.");
        
        setIsProcessing(true); 
        setError(null);

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

            const resultB64 = await generateLook(personB64!, topB64, bottomB64, fullBodyB64, apiKey);
            setGeneratedLook(`data:image/jpeg;base64,${resultB64}`);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Ocorreu um erro no processamento. Verifique sua conexão.");
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isAuthorized) {
        return (
            <div className="min-h-screen bg-[#F6F5F2] flex items-center justify-center p-6">
                <div className="max-w-sm w-full bg-white border border-[#E8E7E4] p-12 rounded-[3rem] shadow-2xl text-center">
                    <h1 className="text-5xl font-black text-[#2B2B2B] italic mb-10 tracking-tighter">VOFY</h1>
                    <form onSubmit={handlePasscodeSubmit} className="space-y-6">
                        <input 
                            type="password" 
                            autoFocus
                            value={passcodeAttempt} 
                            onChange={(e) => setPasscodeAttempt(e.target.value)} 
                            placeholder="SENHA VOFY PRO" 
                            className="w-full bg-[#F6F5F2] border border-[#E8E7E4] rounded-2xl py-5 px-6 text-center text-[10px] font-bold tracking-[0.3em] focus:outline-none focus:border-[#C6B8A6] transition-colors"
                        />
                        <button type="submit" className="w-full py-5 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] bg-[#2B2B2B] text-white hover:bg-black transition-all shadow-lg active:scale-95">Acessar</button>
                    </form>
                </div>
            </div>
        );
    }

    if (!isKeySelected) {
        return (
            <div className="min-h-screen bg-[#F6F5F2] flex items-center justify-center p-6 text-center">
                <div className="max-w-md w-full bg-white border border-[#E8E7E4] p-14 rounded-[3.5rem] shadow-2xl">
                    <div className="w-20 h-20 bg-[#F6F5F2] rounded-full flex items-center justify-center mx-auto mb-10 border border-[#E8E7E4]">
                        <svg className="w-8 h-8 text-[#C6B8A6]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
                    </div>
                    <h1 className="text-4xl font-black text-[#2B2B2B] italic mb-4 tracking-tighter">VOFY PRO</h1>
                    <p className="text-[10px] text-[#7A7A7A] mb-12 font-bold uppercase tracking-[0.2em]">Insira sua chave de ativação Gemini</p>
                    
                    <div className="space-y-6">
                        <input 
                            type="text" 
                            value={manualApiKey}
                            onChange={(e) => setManualApiKey(e.target.value)}
                            placeholder="SUA GEMINI API KEY"
                            className="w-full bg-[#F6F5F2] border border-[#E8E7E4] rounded-2xl py-5 px-6 text-center text-[10px] font-bold tracking-[0.2em] focus:outline-none focus:border-[#C6B8A6] transition-colors"
                        />
                        <button 
                            onClick={() => selectKey(manualApiKey)} 
                            disabled={!manualApiKey}
                            className="w-full py-6 text-[12px] tracking-[0.3em] rounded-2xl font-black bg-[#C6B8A6] text-white shadow-xl hover:bg-[#b5a896] transition-all disabled:opacity-50"
                        >
                            CONECTAR PROVADOR
                        </button>
                        <p className="text-[9px] text-[#C6B8A6] mt-4 font-bold">A chave será salva apenas localmente no seu navegador.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F6F5F2] text-[#2B2B2B] font-sans pb-32">
            <AppHeader onReset={handleGlobalReset} onResetKey={resetKeySelection} />
            
            <main className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Coluna de Uploads */}
                <div className="lg:col-span-4 space-y-8">
                    <section className="bg-white p-8 rounded-[3rem] border border-[#E8E7E4] shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xs font-black italic uppercase tracking-[0.3em] text-[#C6B8A6]">01. Modelo Base</h2>
                            <div className="w-2 h-2 rounded-full bg-[#C6B8A6]"></div>
                        </div>
                        <ImageUploader id="client-up" label="" placeholderText="Sua Foto de Corpo Inteiro" onImageUpload={setClientImage} previewUrl={clientImage?.url} aspectRatio="portrait" />
                    </section>

                    <section className="bg-white p-8 rounded-[3rem] border border-[#E8E7E4] shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xs font-black italic uppercase tracking-[0.3em] text-[#C6B8A6]">02. Seleção de Peças</h2>
                            <div className="w-2 h-2 rounded-full bg-[#C6B8A6]"></div>
                        </div>
                        <div className="space-y-8">
                            <ImageUploader id="full-up" label="LOOK COMPLETO" placeholderText="Vestido ou Macacão" onImageUpload={(img) => { setTopImage(null); setBottomImage(null); setFullBodyImage(img); }} previewUrl={fullBodyImage?.url} aspectRatio="portrait" />
                            <div className="grid grid-cols-2 gap-4">
                                <ImageUploader id="top-up" label="PARTE SUPERIOR" placeholderText="Blusa / Casaco" onImageUpload={(img) => { setFullBodyImage(null); setTopImage(img); }} previewUrl={topImage?.url} />
                                <ImageUploader id="bot-up" label="PARTE INFERIOR" placeholderText="Calça / Saia" onImageUpload={(img) => { setFullBodyImage(null); setBottomImage(img); }} previewUrl={bottomImage?.url} />
                            </div>
                        </div>
                        
                        <button 
                            onClick={handleCreateLook} 
                            disabled={isProcessing} 
                            className="w-full mt-12 py-6 text-[11px] font-black tracking-[0.3em] rounded-2xl bg-[#2B2B2B] text-white shadow-xl hover:bg-black disabled:bg-[#E8E7E4] transition-all active:scale-95 uppercase"
                        >
                            {isProcessing ? 'Processando Tecidos...' : 'Executar Prova Real'}
                        </button>
                    </section>
                </div>

                {/* Coluna de Resultado */}
                <div className="lg:col-span-8">
                    <section className="bg-white p-4 rounded-[3.5rem] border border-[#E8E7E4] shadow-sm min-h-[700px] flex flex-col relative overflow-hidden">
                        <div className="relative flex-grow bg-[#F6F5F2] rounded-[2.5rem] overflow-hidden border border-[#E8E7E4] flex items-center justify-center min-h-[660px]">
                            {isProcessing && <LoadingOverlay message="Renderizando alta fidelidade..." />}
                            
                            {error && (
                                <div className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center p-12 text-center animate-in fade-in">
                                    <div className="w-16 h-16 bg-red-50 text-red-400 rounded-full flex items-center justify-center mb-6">
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                    </div>
                                    <h3 className="text-lg font-black mb-4 uppercase tracking-tighter">Ops! Algo deu errado.</h3>
                                    <p className="text-[11px] text-[#7A7A7A] mb-10 max-w-xs font-medium leading-relaxed">{error}</p>
                                    <button onClick={handleCreateLook} className="bg-[#2B2B2B] text-white px-12 py-4 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-black transition-all">Tentar Novamente</button>
                                </div>
                            )}

                            {generatedLook ? (
                                <div className="w-full h-full p-4 flex items-center justify-center animate-in fade-in zoom-in duration-700">
                                    <img src={generatedLook} alt="Look Final" className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" />
                                </div>
                            ) : !isProcessing && !error ? (
                                <div className="flex flex-col items-center gap-4 opacity-20">
                                    <div className="w-20 h-px bg-[#C6B8A6]"></div>
                                    <p className="font-black uppercase tracking-[0.6em] text-[10px] text-[#2B2B2B]">Provador Digital</p>
                                    <div className="w-20 h-px bg-[#C6B8A6]"></div>
                                </div>
                            ) : null}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}
