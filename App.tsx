
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './components/Landing';
import ChatRoomLoader from './components/ChatRoomLoader';

const App: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-900 text-gray-100">
      <HashRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/:roomId" element={<ChatRoomLoader />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </HashRouter>
    </div>
  );
};

export default App;
