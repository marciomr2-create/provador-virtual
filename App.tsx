import React, { useState, useCallback, useEffect, useRef } from 'react';
import { fileToBase64, generateLook, editImageWithText, fileToResizedDataUrl, dataUrlToResizedDataUrl } from './services/geminiService';
import { VideoGenerator } from './components/VideoGenerator';
import { ImageData, SavedOutfit } from './types';

// --- 2. Helper Components ---

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

    useEffect(() => {
        if (!previewUrl && fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }, [previewUrl]);

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


// --- 3. Main App Component ---
function App() {
    // --- States ---
    const [videoUrl, setVideoUrl] = useState('');
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
        } catch (error) {
            console.error("Failed to load data from localStorage", error);
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('savedOutfits', JSON.stringify(savedOutfits));
        } catch (error) {
            console.error("Failed to save outfits to localStorage", error);
            alert("Erro: Não foi possível salvar o look. O armazenamento local pode estar cheio.");
        }
    }, [savedOutfits]);
    
    // --- Core Handlers ---
    const handleCreateLook = useCallback(async () => {
        if (!clientImage?.file || (!topImage?.file && !bottomImage?.file)) {
            alert("Por favor, envie a imagem do cliente e pelo menos uma peça de roupa.");
            return;
        }
        
        setIsCreatingLook(true);
        setGeneratedLook(null);
        setGeneratedLookBase64(null);
        setVideoUrl('');
        try {
            const personB64 = await fileToBase64(clientImage.file);
            const topB64 = topImage?.file ? await fileToBase64(topImage.file) : null;
            const bottomB64 = bottomImage?.file ? await fileToBase64(bottomImage.file) : null;

            const resultB64 = await generateLook(personB64, topB64, bottomB64);
            
            setGeneratedLook(`data:image/jpeg;base64,${resultB64}`);
            setGeneratedLookBase64(resultB64);
        } catch (error) {
            console.error(error);
            alert(`Falha ao criar o look: ${error.message}`);
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
            alert(`Falha ao editar a imagem: ${error.message}`);
        } finally {
            setIsEditing(false);
        }
    }, [generatedLookBase64]);

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
        if (!clientImage?.file || (!topImage?.file && !bottomImage?.file) || !generatedLook) {
            alert("Não é possível salvar. Certifique-se de que as imagens originais foram carregadas nesta sessão para salvar.");
            return;
        }

        try {
            const MAX_DIM = 512;
            const clientPromise = fileToResizedDataUrl(clientImage.file, MAX_DIM, MAX_DIM);
            const topPromise = topImage?.file ? fileToResizedDataUrl(topImage.file, MAX_DIM, MAX_DIM) : Promise.resolve(null);
            const bottomPromise = bottomImage?.file ? fileToResizedDataUrl(bottomImage.file, MAX_DIM, MAX_DIM) : Promise.resolve(null);
            const generatedPromise = dataUrlToResizedDataUrl(generatedLook, MAX_DIM, MAX_DIM * 1.77); // Approx 16:9

            const [clientImageUrl, topImageUrl, bottomImageUrl, generatedLookUrl] = await Promise.all([
                clientPromise,
                topPromise,
                bottomPromise,
                generatedPromise,
            ]);

            const newOutfit: SavedOutfit = {
                id: Date.now(),
                clientImageUrl,
                topImageUrl,
                bottomImageUrl,
                generatedLookUrl,
            };

            setSavedOutfits(prev => [newOutfit, ...prev]);
            alert("Look salvo!");

        } catch (error) {
            console.error("Falha ao redimensionar e salvar o look:", error);
            alert("Ocorreu um erro ao salvar o look. As imagens podem ser muito grandes ou em um formato inválido.");
        }
    }, [clientImage, topImage, bottomImage, generatedLook]);

    const handleLoadOutfit = useCallback((outfit: SavedOutfit) => {
        setClientImage({ url: outfit.clientImageUrl });
        setTopImage(outfit.topImageUrl ? { url: outfit.topImageUrl } : null);
        setBottomImage(outfit.bottomImageUrl ? { url: outfit.bottomImageUrl } : null);
        setGeneratedLook(outfit.generatedLookUrl);
        
        if (outfit.generatedLookUrl.includes(',')) {
            setGeneratedLookBase64(outfit.generatedLookUrl.split(',')[1]);
        }
        
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
                    <div id="resultado-container" className={`relative w-full bg-gray-700 rounded-lg flex items-center justify-center transition-all duration-300 ${aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-[16:9]'}`}>
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
                            <button onClick={handleSaveOutfit} className="btn-secondary flex-1" disabled={!generatedLook || !clientImage?.file || (!topImage?.file && !bottomImage?.file)}>Salvar</button>
                        </div>

                         <VideoGenerator
                            imageBase64={generatedLookBase64}
                            aspectRatio={aspectRatio}
                            onVideoGenerated={(url) => setVideoUrl(url ?? '')}
                            onGenerationStateChange={(isGenerating) => {
                                if (isGenerating) setVideoUrl('');
                            }}
                        />
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
                .btn-primary:hover:not(:disabled) { background-color: #0f766e; /* teal-700 */ }
                .btn-primary:disabled { background-color: #4b5563; /* gray-600 */ cursor: not-allowed; }
                .btn-secondary { background-color: #4b5563; /* gray-600 */ color: #e5e7eb; /* gray-200 */ font-weight: 600; padding: 0.5rem 1rem; border-radius: 0.5rem; transition: background-color 0.2s; }
                .btn-secondary:hover:not(:disabled) { background-color: #374151; /* gray-700 */ }
                .btn-secondary:disabled { background-color: #374151; /* gray-700 */ color: #6b7280; /* gray-500 */ cursor: not-allowed; }
            `}</style>
            <AppHeader />
            <main className="flex-grow">
                {renderDressingRoom()}
            </main>
        </div>
    );
}

export default App;
