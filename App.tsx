import React, { useState, useCallback, useEffect, useRef } from 'react';

// --- 1. Types ---
type ImageData = {
    file?: File;
    url: string;
};

type SavedOutfit = {
    id: number;
    clientImageUrl: string;
    topImageUrl: string | null;
    bottomImageUrl: string | null;
    generatedLookUrl: string;
    generatedLookBase64: string;
};

// --- 2. API Service ---

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
};

// --- FUNÇÃO REAL (generateLook - Google Gemini) ---
const generateLook = async (
    apiKey: string,
    personB64: string, 
    topB64: string | null, 
    bottomB64: string | null
): Promise<string> => {
    console.log("API Real (Google): Gerando look...");
    const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent';

    const promptParts: any[] = [
        // --- NOVO PROMPT (INQUEBRÁVEL) ---
        { text: `
PERFIL: Motor de IA de Substituição de Vestuário (Virtual Try-On).

TAREFA PRINCIPAL: SUBSTITUIÇÃO 1:1 (UM PARA UM).
Você receberá uma 'IMAGEM ORIGINAL' (pessoa vestindo roupa A) e uma 'IMAGEM DE PRODUTO' (roupa B).
Sua tarefa é gerar uma nova imagem onde a roupa A foi 100% REMOVIDA e a roupa B foi aplicada em seu lugar.

**REGRA INQUEBRÁVEL (PROIBIDO SOBREPOR):**
* A roupa original (ex: a 'blusa branca' da IMAGEM ORIGINAL) **NÃO PODE APARECER** na imagem final.
* A IA deve entender o corpo da pessoa *por baixo* da roupa original.
* **FALHA:** Colar a 'IMAGEM DE PRODUTO' por cima da roupa original é uma falha.

**REGRA INQUEBRÁVEL (PROIBIDO INVENTAR):**
* A 'IMAGEM DE PRODUTO' é a única fonte da verdade para a nova roupa.
* **FIDELIDADE TOTAL:** A cor, textura, costura, e detalhes da roupa na IMAGEM FINAL devem ser **100% IDÊNTICOS** aos da 'IMAGEM DE PRODUTO'.
* A IA não tem permissão para "harmonizar" iluminação se isso alterar a cor do produto.

**REGRA DE PRESERVAÇÃO (NÃO CORTE):**
* Preserve 100% o tom de pele, cabelo, rosto, pose e o fundo da 'IMAGEM ORIGINAL'.
* O enquadramento NÃO PODE ser cortado.

SAÍDA: Apenas a imagem final que obedece a TODAS as regras.
        `},
        { inlineData: { mimeType: "image/jpeg", data: personB64.split(',')[1] } }, // IMAGEM ORIGINAL
    ];
    if (topB64) {
        promptParts.push({ text: "IMAGEM DE PRODUTO (Superior para aplicar no tronco):" });
        promptParts.push({ inlineData: { mimeType: "image/jpeg", data: topB64.split(',')[1] } });
    }
    if (bottomB64) {
        promptParts.push({ text: "IMAGEM DE PRODUTO (Inferior para aplicar nas pernas/quadril):" });
        promptParts.push({ inlineData: { mimeType: "image/jpeg", data: bottomB64.split(',')[1] } });
    }

    const response = await fetch(`${API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ role: "user", parts: promptParts }],
            "generationConfig": {
                "responseModalities": ["IMAGE"]
            }
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Erro da API Gemini:", errorText);
        throw new Error(`Falha ao gerar look: ${errorText}`);
    }

    const result = await response.json();
    const candidate = result.candidates?.[0];
    if (candidate && candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        const imagePart = candidate.content.parts[0];
        if (imagePart.inlineData && imagePart.inlineData.data) {
            const base64Data = imagePart.inlineData.data;
            return base64Data;
        }
    }
    console.error("Resposta da API (Google) não continha imagem:", result);
    if (result.promptFeedback && result.promptFeedback.blockReason) {
        throw new Error(`A API (Google) bloqueou o pedido: ${result.promptFeedback.blockReason}`);
    }
    throw new Error("A resposta da API (Google) não continha dados de imagem válidos.");
};

// --- FUNÇÃO REAL (editImageWithText - Google Gemini) ---
const editImageWithText = async (
    apiKey: string,
    imageBase64: string,
    prompt: string
): Promise<string> => {
    console.log("API Real (Google): Editando imagem...");
    const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent';

    const promptParts: any[] = [
        { text: `Atue como um editor de fotos profissional. Instrução de edição: "${prompt}". Mantenha a qualidade fotográfica, a iluminação e a identidade da pessoa. Não distorça o rosto.` },
        { inlineData: { mimeType: "image/jpeg", data: imageBase64 } },
    ];

    const response = await fetch(`${API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ role: "user", parts: promptParts }],
            "generationConfig": {
                "responseModalities": ["IMAGE"]
            }
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Erro da API Gemini (edição):", errorText);
        throw new Error(`Falha ao editar imagem: ${response.statusText}`);
    }

    const result = await response.json();
    const candidate = result.candidates?.[0];
    if (candidate && candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        const imagePart = candidate.content.parts[0];
        if (imagePart.inlineData && imagePart.inlineData.data) {
            return imagePart.inlineData.data;
        }
    }
    console.error("Resposta da API (edição) não continha imagem:", result);
    if (result.promptFeedback && result.promptFeedback.blockReason) {
        throw new Error(`A API bloqueou o pedido de edição: ${result.promptFeedback.blockReason}`);
    }
    throw new Error("A resposta da API (edição) não continha dados de imagem válidos.");
};

// --- MUDANÇA: Voltamos para a SIMULAÇÃO de vídeo ---
/**
 * Simula a geração do vídeo (já que a API do Stability não está acessível)
 */
async function stabilityGenerateVideo(
    apiKey: string, // (Não será usada, mas mantemos a assinatura)
    imageBase64: string
): Promise<string> {
    console.log('Iniciando geração de vídeo MOCK (SIMULAÇÃO)...');
    await sleep(4000); // Simula o tempo de espera da API
    console.log('Simulação de vídeo concluída.');
    // Retorna um vídeo de exemplo
    return 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
}


// --- 3. Helper Components (sem alterações) ---

const LoadingSpinner: React.FC = () => (
    <div className="absolute inset-0 bg-gray-800 bg-opacity-75 flex flex-col items-center justify-center rounded-lg z-10">
        <svg className="animate-spin -ml-1 mr-3 h-10 w-10 text-teal-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="text-lg font-medium text-teal-300 mt-2">Generating...</span>
    </div>
);

const AppHeader: React.FC = () => (
    <header className="bg-gray-800 border-b-2 border-amber-500 p-4 sticky top-0 z-20">
        <div className="w-full max-w-5xl mx-auto flex flex-col sm:flex-row justify-center items-center">
            <h1 className="text-3xl font-bold text-amber-300 tracking-tight">Provador Digital<span className="text-teal-400">.AI</span></h1>
        </div>
    </header>
);

interface ImageUploaderProps {
    id: string;
    label: string;
    onImageUpload: (data: ImageData) => void;
    previewUrl?: string;
    placeholderText: string;
    aspectRatio?: 'portrait' | 'square';
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ id, label, onImageUpload, previewUrl, placeholderText, aspectRatio = 'square' }) => {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- MUDANÇA AQUI ---
    // Adiciona um useEffect para observar o previewUrl
    useEffect(() => {
        // Se o previewUrl for 'null' ou 'undefined' (o que acontece ao "Limpar")
        // E o ref do input existir...
        if (!previewUrl && fileInputRef.current) {
            // ...nós resetamos o valor interno do input.
            // Isso corrige o bug onde o navegador não dispara o evento 'change'
            // se o usuário tentar enviar a *mesma* imagem novamente.
            fileInputRef.current.value = "";
        }
    }, [previewUrl]); // O 'useEffect' roda toda vez que 'previewUrl' muda
    // --- FIM DA MUDANÇA ---

    const handleFile = (file: File) => {
        if (file && file.type.startsWith('image/')) {
            const fileUrl = URL.createObjectURL(file);
            onImageUpload({ file, url: fileUrl });
        }
    };

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    }, [onImageUpload]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); e.stopPropagation(); setIsDragging(true);
    };
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    };
    const handleClick = () => fileInputRef.current?.click();

    const aspectClass = aspectRatio === 'portrait' ? 'aspect-[9/16]' : 'aspect-square';

    return (
        <div className="flex flex-col gap-2">
            {label && <label htmlFor={id} className="text-sm font-medium text-amber-200">{label}</label>}
            <div
                onClick={handleClick}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`relative w-full ${aspectClass} bg-gray-700 border-2 border-dashed border-gray-500 rounded-lg flex items-center justify-center text-center text-gray-400 cursor-pointer transition-colors hover:border-teal-400 ${isDragging ? 'border-teal-400 bg-gray-600' : ''}`}
            >
                {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-contain rounded-lg" />
                ) : (
                    <span>{placeholderText}</span>
                )}
                <input
                    id={id}
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleChange}
                    className="hidden"
                />
            </div>
        </div>
    );
};

interface EditImageModalProps {
    imageUrl: string;
    onClose: () => void;
    onEdit: (prompt: string) => void;
    isEditing: boolean;
}

const EditImageModal: React.FC<EditImageModalProps> = ({ imageUrl, onClose, onEdit, isEditing }) => {
    const [prompt, setPrompt] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (prompt.trim()) {
            onEdit(prompt);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-amber-400">Editar Imagem</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </div>
                <div className="flex flex-col md:flex-row gap-4">
                    <img src={imageUrl} alt="Para editar" className="w-full md:w-1/2 rounded-lg" />
                    <form onSubmit={handleSubmit} className="flex flex-col flex-1">
                        <label htmlFor="edit-prompt" className="text-sm text-gray-300 mb-2">Descreva a mudança:</label>
                        <textarea
                            id="edit-prompt"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Ex: Mude a cor da blusa para vermelho"
                            className="w-full p-2 bg-gray-700 border border-gray-600 text-gray-200 rounded-lg flex-grow resize-none"
                            rows={4}
                            disabled={isEditing}
                        />
                        <div className="flex gap-2 mt-4">
                            <button type="button" onClick={onClose} className="btn-secondary flex-1" disabled={isEditing}>Cancelar</button>
                            <button type="submit" className="btn-primary flex-1" disabled={!prompt.trim() || isEditing}>
                                {isEditing ? 'Editando...' : 'Aplicar'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

interface HistoryPanelProps {
    outfits: SavedOutfit[];
    onLoad: (outfit: SavedOutfit) => void;
    onDelete: (id: number) => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ outfits, onLoad, onDelete }) => (
    <div className="panel p-4 md:p-6">
        <h2 className="text-xl font-semibold text-amber-400 mb-4">Looks Salvos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {outfits.map(outfit => (
                <div key={outfit.id} className="bg-gray-700 rounded-lg overflow-hidden shadow">
                    <img src={outfit.generatedLookUrl} alt="Look salvo" className="w-full aspect-[9/16] object-cover" />
                    <div className="p-2 flex flex-col gap-2">
                        <button onClick={() => onLoad(outfit)} className="btn-secondary text-sm w-full">Carregar</button>
                        <button onClick={() => onDelete(outfit.id)} className="bg-red-700 hover:bg-red-600 text-white text-sm py-1 px-2 rounded w-full">Excluir</button>
                    </div>
                </div>
            ))}
        </div>
    </div>
);


// --- 4. Main App Component ---
function App() {
    // --- States de Vídeo ---
    const [videoUrl, setVideoUrl] = useState('');
    const [isVideoLoading, setIsVideoLoading] = useState(false);
    
    // --- MUDANÇA: Apenas a chave do Google é necessária ---
    const [googleApiKey, setGoogleApiKey] = useState(''); 
    // const [stabilityApiKey, setStabilityApiKey] = useState(''); // Removida

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
    
    // --- LocalStorage Effects for Persistence ---
    useEffect(() => {
        try {
            const storedOutfits = localStorage.getItem('savedOutfits');
            if (storedOutfits) {
                setSavedOutfits(JSON.parse(storedOutfits));
            }
            // Carrega apenas a chave do Google
            const storedGoogleKey = localStorage.getItem('googleApiKey');
            if(storedGoogleKey) {
                setGoogleApiKey(storedGoogleKey);
            }
        } catch (error) {
            console.error("Failed to load data from localStorage", error);
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('savedOutfits', JSON.stringify(savedOutfits));
        } catch (error) {
            console.error("Failed to save outfits to localStorage", error);
        }
    }, [savedOutfits]);
    
    // Handlers para a chave do Google
    const handleGoogleApiKeyChange = (key: string) => {
        setGoogleApiKey(key);
        localStorage.setItem('googleApiKey', key);
    }
    
    // Pede a API Key do Google
    const getGoogleApiKey = (): string | null => {
        if (googleApiKey) return googleApiKey;

        // --- MUDANÇA AQUI ---
        // Removemos o window.prompt(). 
        // Agora, se a chave não estiver no estado, nós apenas avisamos
        // o usuário para preenchê-la no campo de input principal.
        
        alert('API Key do Google é necessária. Por favor, insira no campo "Google AI API Key" no topo da página.');
        return null;
    }


    // --- Core Handlers ---
    const handleCreateLook = useCallback(async () => {
        if (!clientImage?.file || (!topImage?.file && !bottomImage?.file)) {
            alert("Por favor, envie a imagem do cliente e pelo menos uma peça de roupa.");
            return;
        }
        
        const currentApiKey = getGoogleApiKey();
        if (!currentApiKey) return;
        
        setIsCreatingLook(true);
        setGeneratedLook(null);
        setGeneratedLookBase64(null);
        setVideoUrl('');
        try {
            const personB64 = await fileToBase64(clientImage.file);
            const topB64 = topImage?.file ? await fileToBase64(topImage.file) : null;
            const bottomB64 = bottomImage?.file ? await fileToBase64(bottomImage.file) : null;

            const resultB64 = await generateLook(currentApiKey, personB64, topB64, bottomB64);
            
            setGeneratedLook(`data:image/jpeg;base64,${resultB64}`);
            setGeneratedLookBase64(resultB64);
        } catch (error) {
            console.error(error);
            alert(`Falha ao criar o look: ${error.message}`);
        } finally {
            setIsCreatingLook(false);
        }
    }, [clientImage, topImage, bottomImage, googleApiKey]);

    const handleEditLook = useCallback(async (editPrompt: string) => {
        if (!generatedLookBase64) return;
        
        const currentApiKey = getGoogleApiKey();
        if (!currentApiKey) return;
        
        setIsEditing(true);
        try {
            const resultB64 = await editImageWithText(currentApiKey, generatedLookBase64, editPrompt);
            
            setGeneratedLook(`data:image/jpeg;base64,${resultB64}`);
            setGeneratedLookBase64(resultB64);
            setShowEditModal(false);
        } catch (error) {
            console.error(error);
            alert(`Falha ao editar a imagem: ${error.message}`);
        } finally {
            setIsEditing(false);
        }
    }, [generatedLookBase64, googleApiKey]);

    const handleGenerateVideo = async () => {
        if (!generatedLookBase64) {
            alert('Gere um look primeiro.');
            return;
        }
        
        // A chave do Stability não é mais necessária para a simulação
        
        try {
            setIsVideoLoading(true);
            setVideoUrl(''); 
            const imageBase64 = generatedLookBase64;
            
            // Chama a função SIMULADA
            const url = await stabilityGenerateVideo("simulated_key", imageBase64);
            setVideoUrl(url);
        } catch (error) {
            console.error(error);
            alert(`Erro ao gerar vídeo: ${error.message}`);
        } finally {
            setIsVideoLoading(false);
        }
    };

    // --- MUDANÇA: NOVA FUNÇÃO PARA LIMPAR A TELA ---
    const handleClearScreen = useCallback(() => {
        setClientImage(null);
        setTopImage(null);
        setBottomImage(null);
        setGeneratedLook(null);
        setGeneratedLookBase64(null);
        setVideoUrl('');
    }, []);
    
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
        if (!clientImage?.url || (!topImage?.url && !bottomImage?.url) || !generatedLook || !generatedLookBase64) {
            alert("Não é possível salvar o look...");
            return;
        }
        const newOutfit: SavedOutfit = {
            id: Date.now(),
            clientImageUrl: clientImage.url,
            topImageUrl: topImage?.url ?? null,
            bottomImageUrl: bottomImage?.url ?? null,
            generatedLookUrl: generatedLook,
            generatedLookBase64: generatedLookBase64,
        };
        setSavedOutfits(prev => [newOutfit, ...prev]);
        alert("Look salvo!");
    }, [clientImage, topImage, bottomImage, generatedLook, generatedLookBase64]);

    const handleLoadOutfit = useCallback((outfit: SavedOutfit) => {
        setClientImage({ url: outfit.clientImageUrl });
        setTopImage(outfit.topImageUrl ? { url: outfit.topImageUrl } : null);
        setBottomImage(outfit.bottomImageUrl ? { url: outfit.bottomImageUrl } : null);
        setGeneratedLook(outfit.generatedLookUrl);
        setGeneratedLookBase64(outfit.generatedLookBase64);
        setVideoUrl(''); 
        alert("Look carregado.");
        window.scrollTo(0, 0);
    }, []);

    const handleDeleteOutfit = useCallback((id: number) => {
        setSavedOutfits(prev => prev.filter(outfit => outfit.id !== id));
    }, []);

    // --- Render Functions ---

    const renderDressingRoom = () => (
        <div className="flex flex-col">
            <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 p-4 md:p-6">
                <div className="panel flex flex-col gap-4 p-4 md:p-6">
                    <h2 className="text-xl font-semibold text-amber-400">1. Imagem do Cliente</h2>
                    <ImageUploader id="cliente-img-input" label="" onImageUpload={setClientImage} previewUrl={clientImage?.url} placeholderText="Arraste ou clique para enviar a foto do cliente" aspectRatio="portrait" />
                </div>

                <div className="panel flex flex-col gap-4 p-4 md:p-6">
                    <h2 className="text-xl font-semibold text-amber-400">2. Itens de Vestuário</h2>
                    <div className="flex flex-col gap-4 flex-grow overflow-y-auto min-h-0">
                        <ImageUploader id="superior-img-input" label="Superior" onImageUpload={setTopImage} previewUrl={topImage?.url} placeholderText="Peça Superior" />
                        <ImageUploader id="inferior-img-input" label="Inferior" onImageUpload={setBottomImage} previewUrl={bottomImage?.url} placeholderText="Peça Inferior" />
                    </div>
                    
                    {/* --- MUDANÇA: Botões "Limpar" e "Criar Look" lado a lado --- */}
                    <div className="flex gap-4 mt-auto">
                        <button
                            id="limpar-tela-btn"
                            className="btn-secondary w-1/2"
                            onClick={handleClearScreen}
                        >
                            Limpar
                        </button>
                        <button 
                            id="criar-look-btn" 
                            className="btn-primary w-1/2" 
                            onClick={handleCreateLook} 
                            disabled={!clientImage?.file || (!topImage?.file && !bottomImage?.file) || isCreatingLook}
                        >
                            {isCreatingLook ? 'Criando Look...' : 'Criar Look'}
                        </button>
                    </div>
                </div>
                
                <div className="panel flex flex-col gap-4 p-4 md:p-6">
                    <h2 className="text-xl font-semibold text-amber-400">3. Resultado Gerado</h2>
                    <div id="resultado-container" className={`relative w-full bg-gray-700 rounded-lg flex items-center justify-center transition-all duration-300 ${aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-[16/9]'}`}>
                        {isCreatingLook && <LoadingSpinner />}
                        
                        {videoUrl ? (
                            <video 
                                src={videoUrl} 
                                controls 
                                autoPlay 
                                loop 
                                className="w-full h-full object-contain rounded-lg"
                            />
                        ) : (
                            <img id="resultado-img" src={generatedLook ?? `https://placehold.co/${aspectRatio === '9:16' ? '900x1600' : '1600x900'}/374151/ca8a04?text=Aguardando...`} alt="Look Gerado" className="w-full h-full object-contain rounded-lg" />
                        )}
                        {isVideoLoading && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg z-20">
                                <p className="text-white text-lg">Gerando Vídeo...</p>
                            </div>
                        )}
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
                            <button onClick={handleSaveOutfit} className="btn-secondary flex-1" disabled={!generatedLook || !clientImage || (!topImage && !bottomImage)}>Salvar</button>
                        </div>

                        {/* Campo de prompt de vídeo removido */}
                        <button 
                            id="editar-video-btn" 
                            className="btn-primary w-full mt-2" 
                            onClick={handleGenerateVideo}
                            disabled={isVideoLoading || !generatedLook}
                        >
                            {isVideoLoading ? 'Gerando Vídeo...' : 'Gerar Vídeo'}
                        </button>
                    </div>
                </div>
            </div>
             {savedOutfits.length > 0 && (
                 <div className="px-4 md:px-6 pb-6">
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

    return (
        <div className="min-h-screen bg-gray-900 text-amber-300 flex flex-col">
            <style>{`
                /* Estilos Globais para Tailwind */
                .panel { background-color: #1f2937; /* gray-800 */ border-radius: 0.5rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); }
                .btn-primary { background-color: #0d9488; /* teal-600 */ color: white; font-weight: 600; padding: 0.75rem 1rem; border-radius: 0.5rem; transition: background-color 0.2s; }
                .btn-primary:hover { background-color: #0f766e; /* teal-700 */ }
                .btn-primary:disabled { background-color: #4b5563; /* gray-600 */ cursor: not-allowed; }
                .btn-secondary { background-color: #4b5563; /* gray-600 */ color: #e5e7eb; /* gray-200 */ font-weight: 600; padding: 0.5rem 1rem; border-radius: 0.5rem; transition: background-color 0.2s; }
                .btn-secondary:hover { background-color: #374151; /* gray-700 */ }
                .btn-secondary:disabled { background-color: #374151; /* gray-700 */ color: #6b7280; /* gray-500 */ cursor: not-allowed; }
            `}</style>
            <AppHeader />
            <main className="flex-grow">
                <div className="w-full max-w-5xl mx-auto p-4">
                    {/* --- MUDANÇA: Apenas uma chave de API --- */}
                    <div>
                        <label htmlFor="google-api-key-input" className="text-sm font-medium text-amber-400">Google AI API Key (Imagens)</label>
                        <input 
                            id="google-api-key-input"
                            type="password" 
                            value={googleApiKey}
                            onChange={(e) => handleGoogleApiKeyChange(e.target.value)}
                            placeholder="Insira sua chave do Google AI Studio"
                            className="w-full p-2 mt-1 bg-gray-700 border border-gray-600 text-gray-200 rounded-md text-sm"
                        />
                    </div>
                </div>
                {renderDressingRoom()}
            </main>
        </div>
    );
}

export default App;