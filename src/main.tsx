import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import './index.css';
import App from './App.tsx';
import { GamePage } from './components/game/GamePage';

const GameRouteWrapper = () => {
  const navigate = useNavigate();
  return <GamePage onBack={() => navigate('/')} />;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/game" element={<GameRouteWrapper />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
