
import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ChatRoom from './ChatRoom';

const ChatRoomLoader: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [username, setUsername] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      setUsername(nameInput.trim());
    }
  };

  if (!roomId) {
    return <div>Error: No Room ID provided.</div>;
  }

  if (!username) {
    return (
      <div className="w-full max-w-md p-8 bg-gray-800 rounded-2xl shadow-lg text-center">
        <h1 className="text-2xl font-bold mb-2">Join Room</h1>
        <p className="text-sm text-gray-400 mb-6 font-mono break-all">ID: {roomId}</p>
        <form onSubmit={handleNameSubmit}>
          <label htmlFor="username" className="block text-left text-gray-300 mb-2">
            Enter your name:
          </label>
          <input
            id="username"
            ref={inputRef}
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
            placeholder="Your Name"
          />
          <button
            type="submit"
            disabled={!nameInput.trim()}
            className="w-full mt-6 py-3 px-4 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 rounded-lg font-bold transition-colors"
          >
            Join Voice Chat
          </button>
        </form>
      </div>
    );
  }

  return <ChatRoom roomId={roomId} localUsername={username} />;
};

export default ChatRoomLoader;
