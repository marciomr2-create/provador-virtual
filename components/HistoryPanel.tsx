import React from 'react';
import { SavedOutfit } from '../types';

interface HistoryPanelProps {
    outfits: SavedOutfit[];
    onLoad: (outfit: SavedOutfit) => void;
    onDelete: (id: number) => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ outfits, onLoad, onDelete }) => {
    return (
        <div className="w-full max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-amber-400 mb-2">Saved Outfits</h2>
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
                {outfits.map((outfit) => (
                    <div key={outfit.id} className="group relative border border-amber-700 rounded-lg overflow-hidden bg-gray-800">
                        <img src={outfit.generatedLookUrl} alt={`Saved outfit ${outfit.id}`} className="w-full h-full object-cover aspect-[9/16]" />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-300 flex flex-col items-center justify-center p-1 gap-1">
                            <button
                                onClick={() => onLoad(outfit)}
                                className="w-full text-white bg-teal-600 bg-opacity-90 hover:bg-opacity-100 px-2 py-1 text-xs font-semibold rounded-md opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-y-0 translate-y-2"
                            >
                                Load
                            </button>
                            <button
                                onClick={() => onDelete(outfit.id)}
                                className="w-full text-white bg-red-700 bg-opacity-90 hover:bg-opacity-100 px-2 py-1 text-xs font-semibold rounded-md opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-y-0 translate-y-2"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};