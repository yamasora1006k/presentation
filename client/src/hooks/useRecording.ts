import { useCallback, useRef, useState } from 'react';
import { useFFmpeg } from './useFFmpeg';

export const useRecording = (
  displayStream: MediaStream | null,
  cameraStream: MediaStream | null,
  audioStream: MediaStream | null,
  cameraPosition: { x: number; y: number; width: number; height: number },
  isMirrored: boolean,
  outputFormat: 'webm' | 'mp4' = 'webm'
) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { isFFmpegReady, isConverting, conversionProgress, convertWebMToMP4 } = useFFmpeg();

  const startRecording = useCallback(async () => {
    if (!displayStream || !cameraStream) {
      console.error('Display stream or camera stream not available');
      return;
    }

    try {
      // Create canvas for compositing
      const canvas = document.createElement('canvas');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      canvasRef.current = canvas;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('Failed to get canvas context');
        return;
      }

      // Create video elements for streams
      const displayVideo = document.createElement('video');
      displayVideo.srcObject = displayStream;
      displayVideo.play();

      const cameraVideo = document.createElement('video');
      cameraVideo.srcObject = cameraStream;
      cameraVideo.play();

      // Composite function
      const composite = () => {
        // Draw display stream (background)
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (displayVideo.readyState === displayVideo.HAVE_ENOUGH_DATA) {
          const displayAspect = displayVideo.videoWidth / displayVideo.videoHeight;
          const canvasAspect = canvas.width / canvas.height;

          let drawWidth = canvas.width;
          let drawHeight = canvas.height;
          let drawX = 0;
          let drawY = 0;

          if (displayAspect > canvasAspect) {
            drawHeight = canvas.width / displayAspect;
            drawY = (canvas.height - drawHeight) / 2;
          } else {
            drawWidth = canvas.height * displayAspect;
            drawX = (canvas.width - drawWidth) / 2;
          }

          ctx.drawImage(displayVideo, drawX, drawY, drawWidth, drawHeight);
        }

        // Draw camera stream (overlay)
        if (cameraVideo.readyState === cameraVideo.HAVE_ENOUGH_DATA) {
          ctx.save();

          // Apply mirror if needed
          if (isMirrored) {
            ctx.translate(cameraPosition.x + cameraPosition.width, cameraPosition.y);
            ctx.scale(-1, 1);
            ctx.drawImage(
              cameraVideo,
              0,
              0,
              cameraPosition.width,
              cameraPosition.height
            );
          } else {
            ctx.drawImage(
              cameraVideo,
              cameraPosition.x,
              cameraPosition.y,
              cameraPosition.width,
              cameraPosition.height
            );
          }

          ctx.restore();
        }

        animationFrameRef.current = requestAnimationFrame(composite);
      };

      // Start compositing
      composite();

      // Get canvas stream and create MediaRecorder
      const canvasStream = canvas.captureStream(30); // 30 FPS

      // Add audio tracks if available
      if (audioStream) {
        const audioTracks = audioStream.getAudioTracks();
        audioTracks.forEach((track) => {
          canvasStream.addTrack(track);
        });
      }

      recordedChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(canvasStream, {
        mimeType: 'video/webm;codecs=vp9',
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Recording error:', err);
    }
  }, [displayStream, cameraStream, audioStream, cameraPosition, isMirrored]);

  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current) return;

    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.onstop = async () => {
      const webmBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      
      if (outputFormat === 'mp4') {
        // Convert to MP4
        try {
          console.log('MP4 conversion started, FFmpeg ready:', isFFmpegReady);
          const mp4Blob = await convertWebMToMP4(webmBlob);
          if (mp4Blob) {
            console.log('MP4 conversion completed, downloading...');
            const url = URL.createObjectURL(mp4Blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `presentation-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.mp4`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 100);
          } else {
            console.error('MP4 conversion failed, downloading as WebM instead');
            const url = URL.createObjectURL(webmBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `presentation-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 100);
          }
        } catch (err) {
          console.error('MP4 conversion error:', err);
          // Fallback to WebM
          const url = URL.createObjectURL(webmBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `presentation-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 100);
        }
      } else {
        // Download as WebM
        const url = URL.createObjectURL(webmBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `presentation-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);
      }
    };

    setIsRecording(false);

    // Cleanup
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
  }, [outputFormat, convertWebMToMP4, isFFmpegReady]);

  return {
    isRecording,
    recordingTime,
    startRecording,
    stopRecording,
    isConverting,
    conversionProgress,
  };
};
