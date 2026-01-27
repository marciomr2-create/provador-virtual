
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
            <h2 className="text-xl font-bold text-[#D4AF37] mb-6 flex items-center gap-3">
                Acervo Pessoal
                <span className="text-[10px] bg-[#161618] text-white px-3 py-1 rounded-full border border-[#27272a]">{outfits.length} LOOKS</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {outfits.map((outfit) => (
                    <div key={outfit.id} className="group relative bg-black rounded-lg overflow-hidden border border-[#27272a] aspect-[3/4] shadow-lg transition-transform hover:scale-[1.02]">
                        <img src={outfit.generatedLookUrl} alt="Saved" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black via-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                            <button
                                onClick={() => onLoad(outfit)}
                                className="w-full bg-[#D4AF37] hover:bg-[#e5c05b] text-black text-[9px] font-black py-2 rounded uppercase tracking-widest transition-colors"
                            >
                                Restaurar
                            </button>
                            <button
                                onClick={() => onDelete(outfit.id)}
                                className="w-full bg-transparent hover:bg-red-950/40 text-white hover:text-red-400 text-[9px] font-bold py-2 rounded uppercase tracking-widest border border-[#27272a] transition-all"
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
