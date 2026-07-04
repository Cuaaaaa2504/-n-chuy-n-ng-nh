import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MovieShowtimesPage from './pages/MovieShowtimesPage';
import SeatSelectionPage from './pages/SeatSelectionPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Navigate to="/movies/10/showtimes" replace />} />
          <Route path="/movies/:movieId/showtimes" element={<MovieShowtimesPage />} />
          <Route path="/booking/seats/:showtimeId" element={<SeatSelectionPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;