// src/App.jsx (cập nhật routing)
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MyTicketsPage from './pages/MyTicketsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/my-tickets" element={<MyTicketsPage />} />
        {/* ... các routes khác */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;