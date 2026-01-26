
import React, { useRef, useState, useEffect } from 'react';
import { ImageData } from '../types';

interface ImageUploaderProps {
    id: string;
    label: string;
    onImageUpload: (imageData: ImageData) => void;
    previewUrl?: string;
    placeholderText: string;
    aspectRatio?: 'square' | 'portrait';
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ id, label, onImageUpload, previewUrl, placeholderText, aspectRatio = 'square' }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    // Resetar o input físico se o preview sumir (limpeza global)
    useEffect(() => {
        if (!previewUrl && inputRef.current) {
            inputRef.current.value = "";
        }
    }, [previewUrl]);

    const handleFile = (file: File | null) => {
        if (file && file.type.startsWith('image/')) {
            onImageUpload({
                file,
                url: URL.createObjectURL(file),
            });
        }
    };

    return (
        <div className="flex flex-col gap-2">
            {label && <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block text-center mb-1">{label}</span>}
            <div
                onClick={() => inputRef.current?.click()}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={`
                    relative cursor-pointer overflow-hidden rounded-xl border-2 border-dashed transition-all duration-300
                    ${aspectRatio === 'portrait' ? 'aspect-[3/4]' : 'aspect-square'}
                    ${previewUrl ? 'border-teal-500 shadow-lg shadow-teal-500/10' : 'border-gray-800 hover:border-amber-500/50 hover:bg-gray-800/30'}
                `}
            >
                {previewUrl ? (
                    <>
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover animate-in fade-in duration-500" />
                        {isHovered && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px] font-black text-white uppercase tracking-widest backdrop-blur-sm">
                                Alterar Imagem
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                        <div className="w-10 h-10 mb-3 bg-gray-900 rounded-full flex items-center justify-center border border-gray-800">
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
                        </div>
                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest leading-tight">{placeholderText}</span>
                    </div>
                )}
            </div>
            <input
                type="file"
                ref={inputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => handleFile(e.target.files?.[0] || null)}
            />
        </div>
    );
};
