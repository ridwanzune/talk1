import { useState, useEffect, useRef } from 'react';

export const useAudioLevel = (stream: MediaStream | null): number => {
  const [audioLevel, setAudioLevel] = useState(0);
  const animationFrameId = useRef<number | null>(null);
  const levelRef = useRef(0); // For smoothing

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
        // A larger FFT size can help capture a more stable peak.
        analyser.fftSize = 512;
        
        source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        const bufferLength = analyser.fftSize;
        const dataArray = new Uint8Array(bufferLength);
        
        const animate = () => {
          if (isCancelled) return;
          
          analyser.getByteTimeDomainData(dataArray);
          
          let peak = 0.0;
          for (let i = 0; i < bufferLength; i++) {
            // The samples are unsigned 8-bit integers, from 0 to 255.
            // 128 is the 'zero' point (silence).
            // We find the absolute distance from zero for each sample.
            const value = Math.abs(dataArray[i] - 128);
            if (value > peak) {
              peak = value;
            }
          }
          
          // Normalize the peak to a 0-1 range (peak can be max 128).
          const rawLevel = peak / 128.0;
          
          // Apply smoothing to prevent the meter from being too jittery.
          // A lower smoothing factor means more responsive/less smooth.
          const smoothingFactor = 0.6;
          const smoothedLevel = (levelRef.current * smoothingFactor) + (rawLevel * (1 - smoothingFactor));
          levelRef.current = smoothedLevel;
          
          setAudioLevel(smoothedLevel);
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
