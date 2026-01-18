import { useEffect, useRef, useState } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

export const useFFmpeg = () => {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [isFFmpegReady, setIsFFmpegReady] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Initialize FFmpeg
  useEffect(() => {
    const initFFmpeg = async () => {
      try {
        const ffmpeg = new FFmpeg();

        ffmpeg.on('progress', ({ progress }: { progress: number }) => {
          setConversionProgress(Math.round(progress * 100));
        });

        ffmpeg.on('log', ({ message }: { message: string }) => {
          console.log('[FFmpeg]', message);
        });

        await ffmpeg.load({
          coreURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js',
        });

        ffmpegRef.current = ffmpeg;
        setIsFFmpegReady(true);
      } catch (err) {
        setError(`FFmpeg 初期化エラー: ${(err as Error).message}`);
      }
    };

    initFFmpeg();

    return () => {
      // Cleanup
      if (ffmpegRef.current) {
        ffmpegRef.current.terminate();
      }
    };
  }, []);

  // Convert WebM to MP4
  const convertWebMToMP4 = async (webmBlob: Blob): Promise<Blob | null> => {
    if (!ffmpegRef.current || !isFFmpegReady) {
      setError('FFmpeg がまだ準備できていません');
      return null;
    }

    try {
      setIsConverting(true);
      setError(null);
      setConversionProgress(0);

      const ffmpeg = ffmpegRef.current;

      // Write WebM file to FFmpeg filesystem
      const inputFileName = 'input.webm';
      const outputFileName = 'output.mp4';

      await ffmpeg.writeFile(inputFileName, await fetchFile(webmBlob));

      // Run FFmpeg conversion
      // Using libx264 codec for MP4 with reasonable quality and speed
      await ffmpeg.exec([
        '-i',
        inputFileName,
        '-c:v',
        'libx264',
        '-preset',
        'fast', // fast, medium, slow - faster = lower quality
        '-crf',
        '23', // 0-51, lower = better quality, 23 is default
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        outputFileName,
      ]);

      // Read output file
      const data = await ffmpeg.readFile(outputFileName);
      const mp4Blob = new Blob([data], { type: 'video/mp4' });

      // Clean up files
      await ffmpeg.deleteFile(inputFileName);
      await ffmpeg.deleteFile(outputFileName);

      setIsConverting(false);
      setConversionProgress(0);

      return mp4Blob;
    } catch (err) {
      const errorMsg = `MP4 変換エラー: ${(err as Error).message}`;
      setError(errorMsg);
      setIsConverting(false);
      setConversionProgress(0);
      return null;
    }
  };

  return {
    isFFmpegReady,
    isConverting,
    conversionProgress,
    error,
    convertWebMToMP4,
  };
};
