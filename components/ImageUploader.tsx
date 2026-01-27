
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
            {label && <span className="text-[9px] font-bold text-[#7A7A7A] uppercase tracking-widest block text-center mb-1">{label}</span>}
            <div
                onClick={() => inputRef.current?.click()}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={`
                    relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300
                    ${aspectRatio === 'portrait' ? 'aspect-[3/4]' : 'aspect-square'}
                    ${previewUrl ? 'border-[#C6B8A6] bg-white shadow-sm' : 'border-[#E8E7E4] bg-[#F6F5F2] hover:border-[#C6B8A6] hover:bg-white'}
                `}
            >
                {previewUrl ? (
                    <>
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover animate-in fade-in duration-500" />
                        {isHovered && (
                            <div className="absolute inset-0 bg-white/80 flex items-center justify-center text-[10px] font-black text-[#2B2B2B] uppercase tracking-widest backdrop-blur-sm">
                                Alterar
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                        <div className="w-10 h-10 mb-4 bg-white rounded-full flex items-center justify-center border border-[#E8E7E4] shadow-sm">
                            <svg className="w-5 h-5 text-[#C6B8A6]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
                        </div>
                        <span className="text-[8px] font-bold text-[#7A7A7A] uppercase tracking-[0.2em] leading-relaxed max-w-[150px]">{placeholderText}</span>
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
