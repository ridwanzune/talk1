
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Landing: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const newRoomId = Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
    navigate(`/${newRoomId}`);
  }, [navigate]);

  return (
    <div className="text-center">
      <h1 className="text-3xl font-bold mb-4">Welcome to Voice Chat</h1>
      <p className="text-lg text-gray-400">Creating a new room for you...</p>
       <div className="mt-8">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-400 mx-auto"></div>
      </div>
    </div>
  );
};

export default Landing;
