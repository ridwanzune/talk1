import { useState, useEffect, useRef } from 'react';

export const useAudioLevel = (stream: MediaStream | null): number => {
  const [audioLevel, setAudioLevel] = useState(0);
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    if (!stream || stream.getAudioTracks().length === 0) {
      setAudioLevel(0);
      return;
    }

    let audioContext: AudioContext;
    let analyser: AnalyserNode;
    let source: MediaStreamAudioSourceNode;
    let isCancelled = false;

    const setupAudioAnalysis = async () => {
      try {
        audioContext = new AudioContext();
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }

        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;

        source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        const animate = () => {
          if (isCancelled) return;
          
          // Use time-domain data which is more direct for volume
          analyser.getByteTimeDomainData(dataArray);
          
          let sumSquares = 0.0;
          for (const amplitude of dataArray) {
            // Samples are 0-255, 128 is the zero point. Normalize to -1.0 to 1.0.
            const normalizedSample = (amplitude / 128.0) - 1.0;
            sumSquares += normalizedSample * normalizedSample;
          }
          
          // Calculate Root Mean Square and scale for better visualization
          const rms = Math.sqrt(sumSquares / dataArray.length);
          const level = Math.min(1.0, rms * 5);
          
          setAudioLevel(level);
          animationFrameId.current = requestAnimationFrame(animate);
        };

        animate();
      } catch (e) {
        console.error("Error setting up audio analysis:", e);
      }
    };

    setupAudioAnalysis();

    return () => {
      isCancelled = true;
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      source?.disconnect();
      analyser?.disconnect();
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(console.error);
      }
    };
  }, [stream]);

  return audioLevel;
};
