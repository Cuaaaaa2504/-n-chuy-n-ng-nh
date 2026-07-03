import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../api/axiosClient";

function MoviesPage() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const data = await axiosClient.get("/movies");
        setMovies(data);
      } catch (error) {
        console.error("Lỗi khi lấy danh sách phim:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, []);

  if (loading) {
    return <p>Đang tải danh sách phim...</p>;
  }

  return (
    <section>
      <h1>Danh sách phim</h1>

      {movies.length === 0 ? (
        <p>Chưa có phim nào.</p>
      ) : (
        <div className="movie-grid">
          {movies.map((movie) => (
            <div key={movie.id} className="movie-card">
              <h3>{movie.title || movie.name}</h3>
              <p>{movie.description || "Chưa có mô tả."}</p>
              <Link to={`/movies/${movie.id}`}>Xem chi tiết</Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default MoviesPage;
