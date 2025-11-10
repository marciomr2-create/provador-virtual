import React, { useState } from 'react';

interface EditImageModalProps {
    imageUrl: string;
    onClose: () => void;
    onEdit: (prompt: string) => Promise<void>;
    isEditing: boolean;
}

export const EditImageModal: React.FC<EditImageModalProps> = ({ imageUrl, onClose, onEdit, isEditing }) => {
    const [prompt, setPrompt] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (prompt.trim()) {
            onEdit(prompt.trim());
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 border-2 border-amber-500 rounded-xl shadow-2xl w-full max-w-2xl transform transition-all">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-amber-400">Edit Image with AI</h2>
                        <button onClick={onClose} disabled={isEditing} className="text-gray-500 hover:text-gray-200 text-4xl font-bold">&times;</button>
                    </div>
                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="md:w-1/2">
                            <img src={imageUrl} alt="Image to edit" className="rounded-lg w-full h-auto object-contain" />
                        </div>
                        <form onSubmit={handleSubmit} className="md:w-1/2 flex flex-col gap-4 justify-center">
                            <p className="text-gray-300">Describe the change you want to make. For example, "Add a retro filter" or "Make the sky look like a sunset".</p>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="e.g., Change the shirt color to red"
                                className="w-full p-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-shadow resize-none"
                                rows={4}
                                disabled={isEditing}
                            />
                            <button
                                type="submit"
                                className="btn-primary w-full"
                                disabled={!prompt.trim() || isEditing}
                            >
                                {isEditing ? 'Applying Edit...' : 'Apply Edit'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};