
import React, { useRef, useState } from 'react';
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
            {label && <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{label}</span>}
            <div
                onClick={() => inputRef.current?.click()}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={`
                    relative cursor-pointer overflow-hidden rounded-xl border-2 border-dashed transition-all duration-300
                    ${aspectRatio === 'portrait' ? 'aspect-[3/4]' : 'aspect-square'}
                    ${previewUrl ? 'border-teal-500/50' : 'border-gray-800 hover:border-amber-500/50 hover:bg-gray-800/30'}
                `}
            >
                {previewUrl ? (
                    <>
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                        {isHovered && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-xs font-bold text-white uppercase">
                                Alterar Imagem
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                        <svg className="w-8 h-8 mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                        <span className="text-xs text-gray-500 px-4">{placeholderText}</span>
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
