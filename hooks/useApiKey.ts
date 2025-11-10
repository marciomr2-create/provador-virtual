
import { useState, useEffect, useCallback } from 'react';

export const useApiKey = () => {
  const [isKeySelected, setIsKeySelected] = useState<boolean>(false);
  const [isCheckingKey, setIsCheckingKey] = useState<boolean>(true);

  const checkKey = useCallback(async () => {
    setIsCheckingKey(true);
    try {
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setIsKeySelected(hasKey);
      } else {
        setIsKeySelected(false);
      }
    } catch (error) {
      console.error("Error checking for API key:", error);
      setIsKeySelected(false);
    } finally {
      setIsCheckingKey(false);
    }
  }, []);

  useEffect(() => {
    checkKey();
  }, [checkKey]);

  const selectKey = useCallback(async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
      // Assume success to avoid race condition and re-enable UI immediately
      setIsKeySelected(true);
    } else {
      alert("API Key selection utility is not available.");
    }
  }, []);
  
  const resetKeySelection = useCallback(() => {
    setIsKeySelected(false);
  }, []);

  return { isKeySelected, isCheckingKey, selectKey, resetKeySelection };
};
