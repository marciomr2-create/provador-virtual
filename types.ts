export interface ImageData {
  file?: File; // Optional for loaded outfits
  url: string;
}

export type AppTab = 'dressingRoom' | 'imageGenerator';

export interface SavedOutfit {
  id: number;
  // Store full data URLs for persistence
  clientImageUrl: string;
  topImageUrl: string | null;
  bottomImageUrl: string | null;
  generatedLookUrl: string;
  // Store raw base64 for API calls (e.g., re-editing)
  generatedLookBase64: string;
}
