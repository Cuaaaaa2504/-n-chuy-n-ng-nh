import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import './styles/home.css';

function MovieDetailPlaceholder() {
  return <main className="container"><h1>Chi tiết phim</h1><p>Đã điều hướng thành công từ nút Xem chi tiết.</p><Link to="/">Quay lại</Link></main>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/movies/:movieId" element={<MovieDetailPlaceholder />} />
      </Routes>
    </BrowserRouter>
  );
}
