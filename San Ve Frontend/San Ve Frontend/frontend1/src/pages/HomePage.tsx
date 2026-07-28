import { useMemo, useState } from 'react';
import HeroBanner from '../components/HeroBanner';
import MovieSection from '../components/MovieSection';
import RecommendedMovies from '../components/RecommendedMovies';
import { useMovies } from '../hooks/useMovies';
import { useTheme } from '../context/useTheme';

type Tab = 'NOW_SHOWING' | 'COMING_SOON' | 'SPECIAL';
const HERO_COUNT = 5;

export default function HomePage() {
  const { darkMode } = useTheme();
  const { movies, loading, error, fetchMovies } = useMovies();
  const [activeTab, setActiveTab] = useState<Tab>('NOW_SHOWING');

  const visible = useMemo(
    () =>
      movies.filter(
        (movie) =>
          movie.status === 'NOW_SHOWING' || movie.status === 'COMING_SOON',
      ),
    [movies],
  );

  const nowShowing = useMemo(
    () => visible.filter((movie) => movie.status === 'NOW_SHOWING'),
    [visible],
  );
  const comingSoon = useMemo(
    () => visible.filter((movie) => movie.status === 'COMING_SOON'),
    [visible],
  );
  const heroMovies = useMemo(
    () => (nowShowing.length > 0 ? nowShowing : visible).slice(0, HERO_COUNT),
    [nowShowing, visible],
  );

  const filtered =
    activeTab === 'NOW_SHOWING'
      ? nowShowing
      : activeTab === 'COMING_SOON'
        ? comingSoon
        : visible;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'NOW_SHOWING', label: 'PHIM ĐANG CHIẾU' },
    { key: 'COMING_SOON', label: 'PHIM SẮP CHIẾU' },
    { key: 'SPECIAL', label: 'SUẤT CHIẾU ĐẶC BIỆT' },
  ];

  if (loading) {
    return (
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-20">
        <div className="h-80 rounded-xl glass-panel animate-pulse mb-10" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-gutter-desktop">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="aspect-[2/3] rounded-lg glass-panel animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto text-center px-margin-mobile py-24">
        <span className="material-symbols-outlined text-[48px] text-error">
          error
        </span>
        <p className="font-headline-lg text-headline-lg-mobile text-error mt-3 mb-2">
          Không tải được danh sách phim
        </p>
        <p className="font-body-md text-on-surface-variant mb-8">{error}</p>
        <button
          onClick={() => void fetchMovies()}
          className="btn-primary px-6 py-3 rounded-lg font-title-md text-title-md uppercase inline-flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[20px]">refresh</span>
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div>
      <HeroBanner movies={heroMovies} />
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12">
        <RecommendedMovies />

        <div className="flex justify-center border-b border-white/10 mb-10 overflow-x-auto overflow-y-hidden hide-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-6 md:px-10 py-4 -mb-px whitespace-nowrap border-b-2 font-label-sm text-label-sm uppercase tracking-wider transition-all duration-300 ${
                activeTab === tab.key
                  ? 'border-primary text-primary nav-glow drop-shadow-[0_0_10px_rgba(221,183,255,0.8)]'
                  : 'border-transparent text-on-surface-variant hover:text-secondary hover:drop-shadow-[0_0_8px_rgba(76,215,246,0.8)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <MovieSection
          title={
            activeTab === 'NOW_SHOWING'
              ? 'Phim đang chiếu'
              : activeTab === 'COMING_SOON'
                ? 'Phim sắp chiếu'
                : 'Suất chiếu đặc biệt'
          }
          movies={filtered}
          darkMode={darkMode}
        />
      </div>
    </div>
  );
}
