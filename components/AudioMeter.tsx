
import React from 'react';
import { useAudioLevel } from '../hooks/useAudioLevel';

interface AudioMeterProps {
  stream: MediaStream | null;
}

const AudioMeter: React.FC<AudioMeterProps> = ({ stream }) => {
  const level = useAudioLevel(stream);
  const barCount = 16;

  return (
    <div className="w-full h-6 bg-gray-700 rounded-full flex items-center px-1 overflow-hidden">
      {Array.from({ length: barCount }).map((_, i) => {
        const isActive = level * barCount > i;
        return (
          <div
            key={i}
            className="h-4 flex-1 mx-0.5 rounded-sm transition-colors duration-75"
            style={{
              backgroundColor: isActive ? '#22d3ee' : '#4b5563', // cyan-400, gray-600
            }}
          />
        );
      })}
    </div>
  );
};

export default AudioMeter;
