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
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<GameRouteWrapper />} />
        <Route path="/test" element={<App />} />
        <Route path="/binloader" element={<BinLoaderRouteWrapper />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
