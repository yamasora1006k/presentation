import { useCallback, useEffect, useRef, useState } from 'react';

export interface CameraPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const useMediaStreams = () => {
  const [displayStream, setDisplayStream] = useState<MediaStream | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [isDisplayActive, setIsDisplayActive] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isAudioActive, setIsAudioActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraPosition, setCameraPosition] = useState<CameraPosition>({
    x: 16,
    y: window.innerHeight - 216,
    width: 200,
    height: 150,
  });
  const [isMirrored, setIsMirrored] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // Start screen capture
  const startDisplayCapture = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      } as DisplayMediaStreamOptions);
      setDisplayStream(stream);
      setIsDisplayActive(true);

      // Handle stream stop (user clicked stop in browser UI)
      stream.getVideoTracks()[0].onended = () => {
        setDisplayStream(null);
        setIsDisplayActive(false);
      };
    } catch (err) {
      if ((err as DOMException).name !== 'NotAllowedError') {
        setError(`画面キャプチャエラー: ${(err as Error).message}`);
      }
    }
  }, []);

  // Stop screen capture
  const stopDisplayCapture = useCallback(() => {
    if (displayStream) {
      displayStream.getTracks().forEach((track) => track.stop());
      setDisplayStream(null);
      setIsDisplayActive(false);
    }
  }, [displayStream]);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      setCameraStream(stream);
      setIsCameraActive(true);
    } catch (err) {
      setError(`カメラエラー: ${(err as Error).message}`);
    }
  }, []);

  // Start audio (microphone)
  const startAudio = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      setAudioStream(stream);
      setIsAudioActive(true);
    } catch (err) {
      setError(`マイクエラー: ${(err as Error).message}`);
    }
  }, []);

  // Stop audio
  const stopAudio = useCallback(() => {
    if (audioStream) {
      audioStream.getTracks().forEach((track) => track.stop());
      setAudioStream(null);
      setIsAudioActive(false);
    }
  }, [audioStream]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
      setIsCameraActive(false);
    }
  }, [cameraStream]);

  // Handle camera window drag
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      setIsDragging(true);
      dragOffsetRef.current = {
        x: e.clientX - cameraPosition.x,
        y: e.clientY - cameraPosition.y,
      };
    },
    [cameraPosition.x, cameraPosition.y]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      let newX = e.clientX - dragOffsetRef.current.x;
      let newY = e.clientY - dragOffsetRef.current.y;

      // Boundary constraints
      newX = Math.max(0, Math.min(newX, window.innerWidth - cameraPosition.width));
      newY = Math.max(0, Math.min(newY, window.innerHeight - cameraPosition.height));

      setCameraPosition((prev) => ({
        ...prev,
        x: newX,
        y: newY,
      }));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, cameraPosition.width, cameraPosition.height]);

  // Resize camera window
  const resizeCameraWindow = useCallback((size: 'S' | 'M' | 'L') => {
    const sizes = {
      S: { width: 160, height: 120 },
      M: { width: 200, height: 150 },
      L: { width: 280, height: 210 },
    };
    setCameraPosition((prev) => ({
      ...prev,
      ...sizes[size],
    }));
  }, []);

  // Toggle mirror
  const toggleMirror = useCallback(() => {
    setIsMirrored((prev) => !prev);
  }, []);

  return {
    displayStream,
    cameraStream,
    audioStream,
    isDisplayActive,
    isCameraActive,
    isAudioActive,
    error,
    cameraPosition,
    isMirrored,
    isDragging,
    startDisplayCapture,
    stopDisplayCapture,
    startCamera,
    stopCamera,
    startAudio,
    stopAudio,
    handleMouseDown,
    resizeCameraWindow,
    toggleMirror,
  };
};
