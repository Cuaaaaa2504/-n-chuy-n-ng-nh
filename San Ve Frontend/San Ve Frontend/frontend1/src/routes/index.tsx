import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "../pages/HomePage";
import MovieDetailPage from "../pages/MovieDetailPage";
import ShowtimeSelectPage from "../pages/ShowtimeSelectPage";
import SeatBookingPage from "../pages/SeatBookingPage";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/movies/:id" element={<MovieDetailPage />} />
        <Route path="/showtimes/:movieId" element={<ShowtimeSelectPage />} />
        <Route path="/booking/:id" element={<SeatBookingPage />} />
      </Routes>
    </BrowserRouter>
  );
}
