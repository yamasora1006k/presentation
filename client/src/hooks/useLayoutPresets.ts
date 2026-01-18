import { useCallback } from 'react';
import { CameraPosition } from './useMediaStreams';

export type LayoutPreset = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';

export const useLayoutPresets = (cameraSize: { width: number; height: number }) => {
  const getPresetPosition = useCallback(
    (preset: LayoutPreset): CameraPosition => {
      const padding = 16;

      switch (preset) {
        case 'bottom-left':
          return {
            x: padding,
            y: window.innerHeight - cameraSize.height - padding,
            width: cameraSize.width,
            height: cameraSize.height,
          };
        case 'bottom-right':
          return {
            x: window.innerWidth - cameraSize.width - padding,
            y: window.innerHeight - cameraSize.height - padding,
            width: cameraSize.width,
            height: cameraSize.height,
          };
        case 'top-left':
          return {
            x: padding,
            y: padding,
            width: cameraSize.width,
            height: cameraSize.height,
          };
        case 'top-right':
          return {
            x: window.innerWidth - cameraSize.width - padding,
            y: padding,
            width: cameraSize.width,
            height: cameraSize.height,
          };
        default:
          return {
            x: padding,
            y: window.innerHeight - cameraSize.height - padding,
            width: cameraSize.width,
            height: cameraSize.height,
          };
      }
    },
    [cameraSize]
  );

  return { getPresetPosition };
};
