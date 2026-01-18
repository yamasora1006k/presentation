import { useEffect, useState } from 'react';
import { CameraPosition } from './useMediaStreams';

export interface AppSettings {
  cameraPosition: CameraPosition;
  isMirrored: boolean;
  cameraSize: 'S' | 'M' | 'L';
}

const STORAGE_KEY = 'presentation-trainer-settings';

const defaultSettings: AppSettings = {
  cameraPosition: {
    x: 16,
    y: window.innerHeight - 216,
    width: 200,
    height: 150,
  },
  isMirrored: true,
  cameraSize: 'M',
};

export const useSettings = () => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings((prev) => ({
          ...prev,
          ...parsed,
        }));
      } catch (err) {
        console.error('Failed to parse settings:', err);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save settings to localStorage
  const saveSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  // Reset settings
  const resetSettings = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSettings(defaultSettings);
  };

  return {
    settings,
    isLoaded,
    saveSettings,
    resetSettings,
  };
};
