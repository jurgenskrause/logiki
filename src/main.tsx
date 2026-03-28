import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import App from './App.tsx';
import { GamePage } from './components/game/GamePage';
import { BinLoaderPage } from './components/tools/BinLoaderPage';

const GameRouteWrapper = () => {
  return <GamePage />;
};

const BinLoaderRouteWrapper = () => {
  return <BinLoaderPage />;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/game" element={<GameRouteWrapper />} />
        <Route path="/binloader" element={<BinLoaderRouteWrapper />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
