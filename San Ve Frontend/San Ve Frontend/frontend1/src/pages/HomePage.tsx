import { useMemo, useState } from 'react';
import HeroBanner from '../components/HeroBanner';
import MovieSection from '../components/MovieSection';
import RecommendedMovies from '../components/RecommendedMovies';
import { useMovies } from '../hooks/useMovies';

type Tab = 'NOW_SHOWING' | 'COMING_SOON';
const HERO_COUNT = 5;

export default function HomePage() {
  const { movies, loading, error, fetchMovies } = useMovies();
  const [activeTab, setActiveTab] = useState<Tab>('NOW_SHOWING');

  const visible = useMemo(
    () => movies.filter((movie) => movie.status === 'NOW_SHOWING' || movie.status === 'COMING_SOON'),
    [movies],
  );
  const nowShowing = useMemo(() => visible.filter((movie) => movie.status === 'NOW_SHOWING'), [visible]);
  const comingSoon = useMemo(() => visible.filter((movie) => movie.status === 'COMING_SOON'), [visible]);
  const heroMovies = useMemo(() => (nowShowing.length ? nowShowing : visible).slice(0, HERO_COUNT), [nowShowing, visible]);
  const selectedMovies = activeTab === 'NOW_SHOWING' ? nowShowing : comingSoon;

  if (loading) {
    return (
      <div className="stitch-container py-16">
        <div className="stitch-card h-[650px] animate-pulse mb-12" />
        <div className="stitch-movie-grid">
          {[1,2,3,4].map((item) => <div key={item} className="stitch-card aspect-[2/3] animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <section className="stitch-page grid place-items-center">
        <div className="stitch-card p-10 text-center max-w-lg mx-auto">
          <span className="material-symbols-outlined text-[54px]" style={{ color: 'var(--st-danger)' }}>error</span>
          <h1 className="text-2xl font-bold mt-3">Không tải được danh sách phim</h1>
          <p className="stitch-muted mt-3 mb-7">{error}</p>
          <button className="stitch-btn stitch-btn-primary" onClick={() => void fetchMovies()}>Thử lại</button>
        </div>
      </section>
    );
  }

  return (
    <div>
      <HeroBanner movies={heroMovies} />
      <section className="stitch-container py-20">
        <RecommendedMovies limit={8} fallbackMovies={movies} />

        <div className="stitch-tabs justify-center mb-12">
          <button onClick={() => setActiveTab('NOW_SHOWING')} className={`stitch-tab ${activeTab === 'NOW_SHOWING' ? 'active' : ''}`}>Phim đang chiếu</button>
          <button onClick={() => setActiveTab('COMING_SOON')} className={`stitch-tab ${activeTab === 'COMING_SOON' ? 'active' : ''}`}>Phim sắp chiếu</button>
        </div>
        <MovieSection title={activeTab === 'NOW_SHOWING' ? 'Phim đang chiếu' : 'Phim sắp chiếu'} movies={selectedMovies} />
      </section>
    </div>
  );
}
