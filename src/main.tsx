import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Route, Routes, Navigate } from 'react-router-dom';
import './index.css';
import App from './App';
import Landing from './pages/Landing';
import WarMap from './pages/WarMap';
import Barracks from './pages/Barracks';
import Battle from './pages/Battle';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route element={<App />}>
          <Route path="/" element={<Landing />} />
          <Route path="/warmap" element={<WarMap />} />
          <Route path="/barracks" element={<Barracks />} />
          <Route path="/battle/:sectorIndex" element={<Battle />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
