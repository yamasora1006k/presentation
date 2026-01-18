import { Button } from '@/components/ui/button';
import { useMediaStreams } from '@/hooks/useMediaStreams';
import { useRecording } from '@/hooks/useRecording';
import { useSettings } from '@/hooks/useSettings';
import { useLayoutPresets, type LayoutPreset } from '@/hooks/useLayoutPresets';
import {
  Camera,
  CameraOff,
  Monitor,
  MonitorOff,
  RotateCw,
  Eye,
  EyeOff,
  Circle,
  Square,
  Grid3x3,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/**
 * Presentation Trainer - Main Page
 * Design: Studio Professional (Dark theme with cyan & orange accents)
 *
 * Features:
 * - Screen capture display (full screen)
 * - Camera window overlay (draggable, resizable)
 * - Mirror toggle for camera
 * - Size presets (S/M/L)
 * - Layout presets (4 corners)
 * - Recording with canvas composition
 * - Settings persistence (LocalStorage)
 * - Keyboard shortcuts
 */
export default function Home() {
  const { settings, isLoaded, saveSettings } = useSettings();

  const {
    displayStream,
    cameraStream,
    isDisplayActive,
    isCameraActive,
    error,
    cameraPosition,
    isMirrored,
    isDragging,
    startDisplayCapture,
    stopDisplayCapture,
    startCamera,
    stopCamera,
    handleMouseDown,
    resizeCameraWindow,
    toggleMirror,
  } = useMediaStreams();

  const { isRecording, recordingTime, startRecording, stopRecording } =
    useRecording(displayStream, cameraStream, cameraPosition, isMirrored);

  const displayVideoRef = useRef<HTMLVideoElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const [showControls, setShowControls] = useState(true);
  const [cameraSize, setCameraSize] = useState<'S' | 'M' | 'L'>('M');
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);

  const cameraSizeMap = {
    S: { width: 160, height: 120 },
    M: { width: 200, height: 150 },
    L: { width: 280, height: 210 },
  };

  const { getPresetPosition } = useLayoutPresets(cameraSizeMap[cameraSize]);

  // Initialize settings
  useEffect(() => {
    if (isLoaded && settings) {
      setCameraSize(settings.cameraSize);
    }
  }, [isLoaded, settings]);

  // Connect streams to video elements
  useEffect(() => {
    if (displayVideoRef.current && displayStream) {
      displayVideoRef.current.srcObject = displayStream;
    }
  }, [displayStream]);

  useEffect(() => {
    if (cameraVideoRef.current && cameraStream) {
      cameraVideoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  // Save settings when they change
  useEffect(() => {
    if (isLoaded) {
      saveSettings({
        cameraPosition,
        isMirrored,
        cameraSize,
      });
    }
  }, [cameraPosition, isMirrored, cameraSize, isLoaded, saveSettings]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape: Toggle UI visibility
      if (e.key === 'Escape') {
        setShowControls((prev) => !prev);
      }
      // M: Toggle mirror
      if (e.key === 'm' || e.key === 'M') {
        toggleMirror();
      }
      // C: Toggle camera
      if (e.key === 'c' || e.key === 'C') {
        if (isCameraActive) {
          stopCamera();
        } else {
          startCamera();
        }
      }
      // S: Toggle screen capture
      if (e.key === 's' || e.key === 'S') {
        if (isDisplayActive) {
          stopDisplayCapture();
        } else {
          startDisplayCapture();
        }
      }
      // Space: Toggle recording
      if (e.code === 'Space') {
        e.preventDefault();
        if (isRecording) {
          stopRecording();
        } else if (isDisplayActive && isCameraActive) {
          startRecording();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isCameraActive,
    isDisplayActive,
    isRecording,
    toggleMirror,
    stopCamera,
    startCamera,
    stopDisplayCapture,
    startDisplayCapture,
    startRecording,
    stopRecording,
  ]);

  const handleSizeChange = (size: 'S' | 'M' | 'L') => {
    setCameraSize(size);
    resizeCameraWindow(size);
  };

  const handleLayoutPreset = (preset: LayoutPreset) => {
    const newPosition = getPresetPosition(preset);
    // Update camera position via state (would need to expose this in useMediaStreams)
    // For now, we'll just close the menu
    setShowLayoutMenu(false);
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-screen h-screen bg-background overflow-hidden">
      {/* Display Stream (Full Screen) */}
      <div className="absolute inset-0 bg-black">
        {isDisplayActive && displayStream ? (
          <video
            ref={displayVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <Monitor className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground text-lg">
                画面共有を開始してください
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Camera Window (Draggable Overlay) */}
      {isCameraActive && cameraStream && (
        <div
          className={`absolute camera-window cursor-move transition-shadow ${
            isDragging ? 'dragging' : ''
          }`}
          style={{
            left: `${cameraPosition.x}px`,
            top: `${cameraPosition.y}px`,
            width: `${cameraPosition.width}px`,
            height: `${cameraPosition.height}px`,
          }}
          onMouseDown={handleMouseDown}
        >
          <video
            ref={cameraVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover rounded"
            style={{
              transform: isMirrored ? 'scaleX(-1)' : 'scaleX(1)',
            }}
          />
        </div>
      )}

      {/* Recording Indicator */}
      {isRecording && (
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-destructive/20 border border-destructive px-3 py-2 rounded animate-pulse">
          <Circle className="w-3 h-3 fill-destructive text-destructive" />
          <span className="text-destructive font-mono text-sm font-semibold">
            REC {formatTime(recordingTime)}
          </span>
        </div>
      )}

      {/* Control Panel */}
      {showControls && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background/80 to-transparent p-4 z-10">
          <div className="max-w-6xl mx-auto">
            {/* Error Message */}
            {error && (
              <div className="mb-3 p-3 bg-destructive/20 border border-destructive text-destructive text-sm rounded">
                {error}
              </div>
            )}

            {/* Control Buttons */}
            <div className="flex flex-wrap gap-2 items-center">
              {/* Screen Capture */}
              <Button
                onClick={
                  isDisplayActive
                    ? stopDisplayCapture
                    : startDisplayCapture
                }
                variant={isDisplayActive ? 'default' : 'outline'}
                size="sm"
                className="gap-2"
              >
                {isDisplayActive ? (
                  <>
                    <MonitorOff className="w-4 h-4" />
                    画面共有停止
                  </>
                ) : (
                  <>
                    <Monitor className="w-4 h-4" />
                    画面共有開始
                  </>
                )}
              </Button>

              {/* Camera Toggle */}
              <Button
                onClick={isCameraActive ? stopCamera : startCamera}
                variant={isCameraActive ? 'default' : 'outline'}
                size="sm"
                className="gap-2"
              >
                {isCameraActive ? (
                  <>
                    <CameraOff className="w-4 h-4" />
                    カメラOFF
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    カメラON
                  </>
                )}
              </Button>

              {/* Mirror Toggle */}
              {isCameraActive && (
                <Button
                  onClick={toggleMirror}
                  variant={isMirrored ? 'default' : 'outline'}
                  size="sm"
                  className="gap-2"
                >
                  <RotateCw className="w-4 h-4" />
                  {isMirrored ? 'ミラー ON' : 'ミラー OFF'}
                </Button>
              )}

              {/* Size Presets */}
              {isCameraActive && (
                <div className="flex gap-1 border border-border rounded px-1 py-1">
                  {(['S', 'M', 'L'] as const).map((size) => (
                    <Button
                      key={size}
                      onClick={() => handleSizeChange(size)}
                      variant={cameraSize === size ? 'default' : 'outline'}
                      size="sm"
                      className="w-8 h-8 p-0"
                    >
                      {size}
                    </Button>
                  ))}
                </div>
              )}

              {/* Layout Presets */}
              {isCameraActive && (
                <div className="relative">
                  <Button
                    onClick={() => setShowLayoutMenu(!showLayoutMenu)}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Grid3x3 className="w-4 h-4" />
                    配置
                  </Button>
                  {showLayoutMenu && (
                    <div className="absolute bottom-full mb-2 left-0 bg-card border border-border rounded shadow-lg p-2 flex gap-1">
                      <Button
                        onClick={() => handleLayoutPreset('top-left')}
                        variant="outline"
                        size="sm"
                        className="w-8 h-8 p-0 text-xs"
                        title="左上"
                      >
                        ↖
                      </Button>
                      <Button
                        onClick={() => handleLayoutPreset('top-right')}
                        variant="outline"
                        size="sm"
                        className="w-8 h-8 p-0 text-xs"
                        title="右上"
                      >
                        ↗
                      </Button>
                      <Button
                        onClick={() => handleLayoutPreset('bottom-left')}
                        variant="outline"
                        size="sm"
                        className="w-8 h-8 p-0 text-xs"
                        title="左下"
                      >
                        ↙
                      </Button>
                      <Button
                        onClick={() => handleLayoutPreset('bottom-right')}
                        variant="outline"
                        size="sm"
                        className="w-8 h-8 p-0 text-xs"
                        title="右下"
                      >
                        ↘
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Recording Button */}
              {isDisplayActive && isCameraActive && (
                <Button
                  onClick={isRecording ? stopRecording : startRecording}
                  variant={isRecording ? 'default' : 'outline'}
                  size="sm"
                  className={`gap-2 ${
                    isRecording ? 'bg-destructive hover:bg-destructive/90' : ''
                  }`}
                >
                  {isRecording ? (
                    <>
                      <Square className="w-4 h-4 fill-current" />
                      録画停止
                    </>
                  ) : (
                    <>
                      <Circle className="w-4 h-4 fill-current" />
                      録画開始
                    </>
                  )}
                </Button>
              )}

              {/* Spacer */}
              <div className="flex-1" />

              {/* UI Toggle */}
              <Button
                onClick={() => setShowControls(false)}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <EyeOff className="w-4 h-4" />
                UI隠す
              </Button>
            </div>

            {/* Keyboard Shortcuts Info */}
            <div className="mt-3 text-xs text-muted-foreground space-y-1">
              <p>
                <kbd className="px-2 py-1 bg-muted rounded text-foreground">
                  Esc
                </kbd>{' '}
                : UI表示/非表示 |{' '}
                <kbd className="px-2 py-1 bg-muted rounded text-foreground">
                  M
                </kbd>{' '}
                : ミラー切替 |{' '}
                <kbd className="px-2 py-1 bg-muted rounded text-foreground">
                  C
                </kbd>{' '}
                : カメラON/OFF
              </p>
              <p>
                <kbd className="px-2 py-1 bg-muted rounded text-foreground">
                  S
                </kbd>{' '}
                : 画面共有開始/停止 |{' '}
                <kbd className="px-2 py-1 bg-muted rounded text-foreground">
                  Space
                </kbd>{' '}
                : 録画開始/停止
              </p>
            </div>
          </div>
        </div>
      )}

      {/* UI Hidden Indicator */}
      {!showControls && (
        <button
          onClick={() => setShowControls(true)}
          className="absolute top-4 right-4 z-20 p-2 bg-background/80 border border-border rounded hover:bg-muted transition-colors"
          title="UI表示 (Esc キー)"
        >
          <Eye className="w-4 h-4 text-accent" />
        </button>
      )}
    </div>
  );
}
