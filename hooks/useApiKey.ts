
import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'vofy_gemini_api_key';

export const useApiKey = () => {
  const [isKeySelected, setIsKeySelected] = useState<boolean>(false);
  const [isCheckingKey, setIsCheckingKey] = useState<boolean>(true);
  const [apiKey, setApiKey] = useState<string | null>(null);

  useEffect(() => {
    const savedKey = localStorage.getItem(STORAGE_KEY);
    if (savedKey) {
      setApiKey(savedKey);
      setIsKeySelected(true);
    }
    setIsCheckingKey(false);
  }, []);

  const selectKey = useCallback(async (manualKey?: string) => {
    if (manualKey) {
      localStorage.setItem(STORAGE_KEY, manualKey);
      setApiKey(manualKey);
      setIsKeySelected(true);
    }
  }, []);
  
  const resetKeySelection = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setApiKey(null);
    setIsKeySelected(false);
  }, []);

  return { isKeySelected, isCheckingKey, selectKey, resetKeySelection, apiKey };
};
