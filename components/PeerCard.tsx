
import React, { useRef, useEffect } from 'react';
import AudioMeter from './AudioMeter';
import { MicIcon, MicOffIcon } from './icons';

interface PeerCardProps {
  name: string;
  stream: MediaStream | null;
  isMuted: boolean;
  isLocal: boolean;
  onMuteToggle?: () => void;
}

const PeerCard: React.FC<PeerCardProps> = ({ name, stream, isMuted, isLocal, onMuteToggle }) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current && stream) {
      audioRef.current.srcObject = stream;
    }
  }, [stream]);

  const MuteButton = () => (
    <button
      onClick={onMuteToggle}
      className={`p-3 rounded-full transition-colors ${
        isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-500'
      }`}
      aria-label={isMuted ? 'Unmute' : 'Mute'}
    >
      {isMuted ? <MicOffIcon className="w-6 h-6" /> : <MicIcon className="w-6 h-6" />}
    </button>
  );

  return (
    <div className="bg-gray-800 p-6 rounded-2xl shadow-lg flex flex-col gap-4 w-full">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold truncate">
          {name} {isLocal && <span className="text-sm text-cyan-400 font-normal">(You)</span>}
        </h3>
        {isLocal && <MuteButton />}
      </div>
      <AudioMeter stream={isMuted ? null : stream} />
      {!isLocal && stream && <audio ref={audioRef} autoPlay playsInline />}
    </div>
  );
};

export default PeerCard;
