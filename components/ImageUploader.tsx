import React, { useRef } from 'react';
import { ImageData } from '../types';

interface ImageUploaderProps {
    id: string;
    label: string;
    onImageUpload: (imageData: ImageData) => void;
    previewUrl?: string;
    placeholderText: string;
    aspectRatio?: 'square' | 'portrait' | 'landscape';
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ id, label, onImageUpload, previewUrl, placeholderText, aspectRatio = 'square' }) => {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleAreaClick = () => {
        inputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onImageUpload({
                file,
                url: URL.createObjectURL(file),
            });
        }
    };

    const aspectRatioClass = {
        square: 'aspect-square',
        portrait: 'aspect-[9/16]',
        landscape: 'aspect-[16/9]',
    }[aspectRatio];

    return (
        <div className="flex flex-col gap-2">
            {label && <h3 className="text-lg font-medium text-amber-400">{label}</h3>}
            <div
                className={`upload-area relative w-full transition-all duration-300 ${previewUrl ? 'border-solid border-teal-500' : ''} ${aspectRatioClass}`}
                onClick={handleAreaClick}
            >
                {previewUrl ? (
                    <img src={previewUrl} alt={label} className="w-full h-full object-cover rounded-lg" />
                ) : (
                    <span className="text-center text-sm p-4">{placeholderText}</span>
                )}
            </div>
            <input
                type="file"
                id={id}
                ref={inputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
            />
        </div>
    );
};
