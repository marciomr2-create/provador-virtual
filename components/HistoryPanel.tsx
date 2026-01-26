
import React from 'react';
import { SavedOutfit } from '../types';

interface HistoryPanelProps {
    outfits: SavedOutfit[];
    onLoad: (outfit: SavedOutfit) => void;
    onDelete: (id: number) => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ outfits, onLoad, onDelete }) => {
    return (
        <div className="w-full">
            <h2 className="text-xl font-bold text-amber-400 mb-6 flex items-center gap-3">
                Histórico de Looks
                <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded-full">{outfits.length}</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {outfits.map((outfit) => (
                    <div key={outfit.id} className="group relative bg-gray-950 rounded-lg overflow-hidden border border-gray-800 aspect-[3/4] shadow-lg">
                        <img src={outfit.generatedLookUrl} alt="Saved" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                            <button
                                onClick={() => onLoad(outfit)}
                                className="w-full bg-teal-600 hover:bg-teal-500 text-white text-[10px] font-bold py-1.5 rounded uppercase"
                            >
                                Carregar
                            </button>
                            <button
                                onClick={() => onDelete(outfit.id)}
                                className="w-full bg-red-900/80 hover:bg-red-700 text-white text-[10px] font-bold py-1.5 rounded uppercase"
                            >
                                Excluir
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
