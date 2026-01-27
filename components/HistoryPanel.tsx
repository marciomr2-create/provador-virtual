
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
            <h2 className="text-xl font-bold text-[#2B2B2B] mb-6 flex items-center gap-3 italic">
                Acervo Pessoal
                <span className="text-[10px] bg-white text-[#C6B8A6] font-bold px-3 py-1 rounded-full border border-[#E8E7E4] uppercase tracking-widest">{outfits.length} LOOKS</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {outfits.map((outfit) => (
                    <div key={outfit.id} className="group relative bg-white rounded-2xl overflow-hidden border border-[#E8E7E4] aspect-[3/4] shadow-sm transition-all hover:shadow-md hover:scale-[1.02]">
                        <img src={outfit.generatedLookUrl} alt="Saved" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-white via-white/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2">
                            <button
                                onClick={() => onLoad(outfit)}
                                className="w-full bg-[#C6B8A6] hover:bg-[#b5a896] text-white text-[9px] font-black py-2 rounded-xl uppercase tracking-widest transition-colors"
                            >
                                Restaurar
                            </button>
                            <button
                                onClick={() => onDelete(outfit.id)}
                                className="w-full bg-white hover:bg-[#F6F5F2] text-[#7A7A7A] hover:text-red-500 text-[9px] font-bold py-2 rounded-xl uppercase tracking-widest border border-[#E8E7E4] transition-all"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
