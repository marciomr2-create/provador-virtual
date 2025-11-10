import React, { useRef, useState, useCallback } from 'react';
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
    const [isDragging, setIsDragging] = useState(false);

    const handleFile = (file: File | null) => {
        if (file && file.type.startsWith('image/')) {
            onImageUpload({
                file,
                url: URL.createObjectURL(file),
            });
        }
    };

    const handleAreaClick = () => {
        inputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        handleFile(event.target.files?.[0] ?? null);
    };

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        handleFile(e.dataTransfer.files?.[0] ?? null);
    }, [onImageUpload]);

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const aspectRatioClass = {
        square: 'aspect-square',
        portrait: 'aspect-[9/16]',
        landscape: 'aspect-video',
    }[aspectRatio];
    
    // Combine classes for dynamic styling
    const areaClasses = [
        'upload-area',
        'relative w-full transition-all duration-300',
        aspectRatioClass,
        isDragging ? 'border-amber-500 bg-gray-600' : '',
        previewUrl ? 'border-solid border-teal-500' : ''
    ].filter(Boolean).join(' ');


    return (
        <div className="flex flex-col gap-2">
            {label && <h3 className="text-lg font-medium text-amber-400">{label}</h3>}
            <div
                className={areaClasses}
                onClick={handleAreaClick}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
            >
                {previewUrl ? (
                    <img src={previewUrl} alt={label} className="w-full h-full object-cover rounded-lg" />
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <span className="text-center text-sm p-4">{placeholderText}</span>
                    </div>
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