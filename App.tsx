
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
    <div className="absolute inset-0 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center rounded-[2.5rem] z-50 px-8 text-center border border-[#C6B8A6]/20 shadow-2xl animate-in fade-in duration-700">
        <div className="relative w-24 h-24 mb-10">
            <div className="absolute inset-0 border-[2px] border-[#C6B8A6]/20 rounded-full"></div>
            <div className="absolute inset-0 border-[2px] border-[#C6B8A6] border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-4 border-[1px] border-[#C6B8A6]/40 border-b-transparent rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
        </div>
        <p className="text-[#2B2B2B] font-extrabold tracking-[0.5em] uppercase text-[9px] leading-relaxed max-w-[280px]">
            {message}
        </p>
        <div className="mt-6 flex gap-1">
            <span className="w-1 h-1 bg-[#C6B8A6] rounded-full animate-bounce"></span>
            <span className="w-1 h-1 bg-[#C6B8A6] rounded-full animate-bounce [animation-delay:0.2s]"></span>
            <span className="w-1 h-1 bg-[#C6B8A6] rounded-full animate-bounce [animation-delay:0.4s]"></span>
        </div>
    </div>
);

const AppHeader: React.FC<{ onReset: () => void; onResetKey: () => void }> = ({ onReset, onResetKey }) => (
    <header className="bg-white/90 backdrop-blur-xl border-b border-[#E8E7E4] p-6 sticky top-0 z-[100] shadow-[0_1px_15px_-5px_rgba(0,0,0,0.05)]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex flex-col items-center md:items-start group cursor-default">
                <h1 className="text-4xl font-[900] text-[#2B2B2B] tracking-tighter italic flex items-baseline leading-none">
                    VOFY
                    <span className="text-[14px] font-bold not-italic lowercase tracking-tighter ml-1.5 text-[#C6B8A6] border-l border-[#E8E7E4] pl-2">pro</span>
                </h1>
                <span className="text-[8px] text-[#C6B8A6] font-black uppercase tracking-[0.6em] mt-1 opacity-80">High Fidelity Digital Fitting</span>
            </div>
            <div className="flex items-center gap-6">
                <button 
                    onClick={onResetKey}
                    className="text-[9px] font-black uppercase tracking-[0.3em] text-[#C6B8A6] hover:text-[#2B2B2B] transition-all duration-300 relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-px after:bg-[#2B2B2B] hover:after:w-full after:transition-all"
                >
                    API Engine
                </button>
                <button 
                    onClick={onReset} 
                    className="flex items-center gap-2.5 px-10 py-3.5 bg-[#2B2B2B] hover:bg-black text-white rounded-full transition-all active:scale-95 shadow-lg hover:shadow-xl group"
                >
                    <svg className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    <span className="text-[10px] font-black uppercase tracking-[0.25em]">Nova Prova</span>
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
        if (passcodeAttempt.toUpperCase() === MASTER_PASSCODE) {
            setIsAuthorized(true);
            localStorage.setItem('vofy_authorized_v2', 'true');
        } else {
            setPasscodeAttempt("");
            alert("ACESSO NEGADO: Identidade não reconhecida.");
        }
    };

    const handleGlobalReset = useCallback(() => {
        if(confirm("Deseja limpar todos os campos para uma nova prova?")) {
            setClientImage(null); setTopImage(null); setBottomImage(null); setFullBodyImage(null); setGeneratedLook(null);
            setError(null);
        }
    }, []);

    const handleCreateLook = async () => {
        if (!clientImage) return alert("Selecione sua foto base.");
        if (!fullBodyImage && !topImage && !bottomImage) return alert("Selecione as peças de roupa para a prova.");
        if (!apiKey) return alert("Configuração de motor ausente.");
        
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
            setError(err.message || "Falha técnica no processamento. Verifique sua chave e conexão.");
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isAuthorized) {
        return (
            <div className="min-h-screen bg-[#F6F5F2] flex items-center justify-center p-6 selection:bg-[#C6B8A6] selection:text-white">
                <div className="max-w-sm w-full bg-white border border-[#E8E7E4] p-12 rounded-[3.5rem] shadow-2xl text-center animate-in zoom-in-95 duration-500">
                    <div className="mb-10">
                        <h1 className="text-5xl font-[900] text-[#2B2B2B] italic tracking-tighter">VOFY</h1>
                        <p className="text-[9px] font-black uppercase tracking-[0.5em] text-[#C6B8A6] mt-2">Private Access Only</p>
                    </div>
                    <form onSubmit={handlePasscodeSubmit} className="space-y-6">
                        <input 
                            type="password" 
                            autoFocus
                            value={passcodeAttempt} 
                            onChange={(e) => setPasscodeAttempt(e.target.value)} 
                            placeholder="DIGITE O MASTER CODE" 
                            className="w-full bg-[#F6F5F2] border border-[#E8E7E4] rounded-2xl py-6 px-6 text-center text-[10px] font-black tracking-[0.4em] focus:outline-none focus:border-[#C6B8A6] focus:ring-4 focus:ring-[#C6B8A6]/5 transition-all"
                        />
                        <button type="submit" className="w-full py-6 rounded-2xl font-black uppercase text-[11px] tracking-[0.3em] bg-[#2B2B2B] text-white hover:bg-black transition-all shadow-xl active:scale-95">Autenticar</button>
                    </form>
                </div>
            </div>
        );
    }

    if (!isKeySelected) {
        return (
            <div className="min-h-screen bg-[#F6F5F2] flex items-center justify-center p-6 text-center">
                <div className="max-w-md w-full bg-white border border-[#E8E7E4] p-16 rounded-[4rem] shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="w-24 h-24 bg-[#F6F5F2] rounded-full flex items-center justify-center mx-auto mb-10 border border-[#E8E7E4] shadow-inner">
                        <svg className="w-10 h-10 text-[#C6B8A6]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
                    </div>
                    <h1 className="text-4xl font-[900] text-[#2B2B2B] italic mb-4 tracking-tighter">VOFY PRO</h1>
                    <p className="text-[10px] text-[#7A7A7A] mb-12 font-bold uppercase tracking-[0.3em]">Ativação do Motor Gemini Ultra</p>
                    
                    <div className="space-y-6">
                        <input 
                            type="text" 
                            value={manualApiKey}
                            onChange={(e) => setManualApiKey(e.target.value)}
                            placeholder="SUA API KEY AQUI"
                            className="w-full bg-[#F6F5F2] border border-[#E8E7E4] rounded-2xl py-6 px-6 text-center text-[10px] font-black tracking-[0.2em] focus:outline-none focus:border-[#C6B8A6] focus:ring-4 focus:ring-[#C6B8A6]/5 transition-all"
                        />
                        <button 
                            onClick={() => selectKey(manualApiKey)} 
                            disabled={!manualApiKey}
                            className="w-full py-7 text-[12px] tracking-[0.4em] rounded-2xl font-black bg-[#C6B8A6] text-white shadow-2xl hover:bg-[#b5a896] transition-all disabled:opacity-50 active:scale-95"
                        >
                            SINCRONIZAR PROVADOR
                        </button>
                        <p className="text-[8px] text-[#C6B8A6] mt-6 font-bold uppercase tracking-widest">A chave é encriptada localmente no seu browser.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F6F5F2] text-[#2B2B2B] font-sans pb-32 selection:bg-[#C6B8A6] selection:text-white">
            <AppHeader onReset={handleGlobalReset} onResetKey={resetKeySelection} />
            
            <main className="max-w-7xl mx-auto p-4 md:p-10 grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Coluna de Uploads */}
                <div className="lg:col-span-4 space-y-10">
                    <section className="bg-white p-10 rounded-[3.5rem] border border-[#E8E7E4] shadow-[0_10px_40px_-15px_rgba(0,0,0,0.03)] hover:shadow-[0_15px_50px_-10px_rgba(0,0,0,0.05)] transition-shadow duration-500">
                        <div className="flex items-center justify-between mb-10">
                            <h2 className="text-[10px] font-black italic uppercase tracking-[0.5em] text-[#C6B8A6]">01. Modelo Base</h2>
                            <div className="w-2.5 h-2.5 rounded-full bg-[#C6B8A6] animate-pulse"></div>
                        </div>
                        <ImageUploader id="client-up" label="" placeholderText="Envie sua foto em ambiente iluminado" onImageUpload={setClientImage} previewUrl={clientImage?.url} aspectRatio="portrait" />
                    </section>

                    <section className="bg-white p-10 rounded-[3.5rem] border border-[#E8E7E4] shadow-[0_10px_40px_-15px_rgba(0,0,0,0.03)] hover:shadow-[0_15px_50px_-10px_rgba(0,0,0,0.05)] transition-shadow duration-500">
                        <div className="flex items-center justify-between mb-10">
                            <h2 className="text-[10px] font-black italic uppercase tracking-[0.5em] text-[#C6B8A6]">02. Seleção de Peças</h2>
                            <div className="w-2.5 h-2.5 rounded-full bg-[#C6B8A6]"></div>
                        </div>
                        <div className="space-y-10">
                            <ImageUploader id="full-up" label="Look Completo" placeholderText="Vestidos, Macacões ou Conjuntos" onImageUpload={(img) => { setTopImage(null); setBottomImage(null); setFullBodyImage(img); }} previewUrl={fullBodyImage?.url} aspectRatio="portrait" />
                            
                            <div className="relative flex items-center justify-center">
                                <div className="absolute inset-x-0 h-px bg-[#E8E7E4]"></div>
                                <span className="relative px-4 bg-white text-[8px] font-black text-[#C6B8A6] uppercase tracking-[0.4em]">OU</span>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <ImageUploader id="top-up" label="Superior" placeholderText="Blusa / Top" onImageUpload={(img) => { setFullBodyImage(null); setTopImage(img); }} previewUrl={topImage?.url} />
                                <ImageUploader id="bot-up" label="Inferior" placeholderText="Calça / Saia" onImageUpload={(img) => { setFullBodyImage(null); setBottomImage(img); }} previewUrl={bottomImage?.url} />
                            </div>
                        </div>
                        
                        <button 
                            onClick={handleCreateLook} 
                            disabled={isProcessing} 
                            className="w-full mt-14 py-7 text-[12px] font-black tracking-[0.4em] rounded-[1.5rem] bg-[#2B2B2B] text-white shadow-2xl hover:bg-black disabled:bg-[#E8E7E4] transition-all active:scale-95 uppercase group overflow-hidden relative"
                        >
                            <span className="relative z-10">{isProcessing ? 'Sincronizando Fibras...' : 'Executar Prova Real'}</span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                        </button>
                    </section>
                </div>

                {/* Coluna de Resultado */}
                <div className="lg:col-span-8 h-full">
                    <section className="bg-white p-5 rounded-[4rem] border border-[#E8E7E4] shadow-2xl min-h-[750px] flex flex-col relative overflow-hidden group">
                        <div className="relative flex-grow bg-[#F6F5F2] rounded-[3rem] overflow-hidden border border-[#E8E7E4] flex items-center justify-center min-h-[710px] transition-all duration-700 group-hover:shadow-inner">
                            {isProcessing && <LoadingOverlay message="IA Vofy analisando caimento e texturas..." />}
                            
                            {error && (
                                <div className="absolute inset-0 bg-white/98 z-50 flex flex-col items-center justify-center p-16 text-center animate-in fade-in zoom-in-95">
                                    <div className="w-20 h-20 bg-red-50 text-red-400 rounded-full flex items-center justify-center mb-8 border border-red-100">
                                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                    </div>
                                    <h3 className="text-xl font-black mb-4 uppercase tracking-tighter">Erro na Renderização</h3>
                                    <p className="text-[12px] text-[#7A7A7A] mb-12 max-w-xs font-medium leading-relaxed">{error}</p>
                                    <button onClick={handleCreateLook} className="bg-[#2B2B2B] text-white px-14 py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] hover:bg-black transition-all shadow-lg active:scale-95">Reiniciar Motor</button>
                                </div>
                            )}

                            {generatedLook ? (
                                <div className="w-full h-full p-4 flex items-center justify-center animate-in fade-in zoom-in duration-1000">
                                    <img src={generatedLook} alt="Look Final Renderizado" className="max-w-full max-h-full object-contain rounded-[2rem] shadow-2xl" />
                                    <div className="absolute bottom-10 left-10 right-10 flex justify-center">
                                         <div className="bg-black/20 backdrop-blur-md px-6 py-2 rounded-full border border-white/10">
                                            <p className="text-white text-[8px] font-black uppercase tracking-[0.5em]">Fidelidade 1.0K Ultra HD</p>
                                         </div>
                                    </div>
                                </div>
                            ) : !isProcessing && !error ? (
                                <div className="flex flex-col items-center gap-6 opacity-30 select-none pointer-events-none">
                                    <div className="w-32 h-px bg-gradient-to-r from-transparent via-[#C6B8A6] to-transparent"></div>
                                    <div className="flex flex-col items-center">
                                        <p className="font-black uppercase tracking-[1em] text-[12px] text-[#2B2B2B] ml-[1em]">VOFY PRO</p>
                                        <p className="text-[8px] font-bold text-[#C6B8A6] uppercase tracking-[0.4em] mt-2">Aguardando entrada de dados</p>
                                    </div>
                                    <div className="w-32 h-px bg-gradient-to-r from-transparent via-[#C6B8A6] to-transparent"></div>
                                </div>
                            ) : null}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}
