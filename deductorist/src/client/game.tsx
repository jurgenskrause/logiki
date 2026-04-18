/**
 * Entry point for the Deductorist Web Client.
 *
 * This file scaffolds the React application and establishes client-side routing
 * using MemoryRouter (as Devvit environments might not natively support browser history).
 * It mounts three principal views:
 *   - The main game interface ("/")
 *   - An audit and testing dashboard ("/test")
 *   - A development tooling view for binary payload loading ("/binloader")
 */

// --- Vendor / Framework Imports ---
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// --- Global Styles ---
import './index.css';

// --- Application Components ---
import { GamePage } from './components/game/GamePage';
import { BinLoaderPage } from './components/tools/BinLoaderPage';
import AuditApp from './AuditApp';

// Mount the React Application tree
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Using MemoryRouter to avoid history-based routing issues inside Devvit's webview */}
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        {/* Primary Deductorist Game Experience */}
        <Route path="/" element={<GamePage />} />
        
        {/* Developer Sandbox for Engine Audits and Structural Validation */}
        <Route path="/test" element={<AuditApp />} />
        
        {/* Tooling for deserializing and inspecting static puzzle manifests */}
        <Route path="/binloader" element={<BinLoaderPage />} />
      </Routes>
    </MemoryRouter>
  </StrictMode>
);
