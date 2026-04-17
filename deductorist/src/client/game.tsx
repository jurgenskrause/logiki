import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import AuditApp from './AuditApp';
import { GamePage } from './components/game/GamePage';
import { BinLoaderPage } from './components/tools/BinLoaderPage';

// eslint-disable-next-line react-refresh/only-export-components
const GameRouteWrapper = () => {
  return <GamePage />;
};

// eslint-disable-next-line react-refresh/only-export-components
const BinLoaderRouteWrapper = () => {
  return <BinLoaderPage />;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<GameRouteWrapper />} />
        <Route path="/test" element={<AuditApp />} />
        <Route path="/binloader" element={<BinLoaderRouteWrapper />} />
      </Routes>
    </MemoryRouter>
  </StrictMode>
);
