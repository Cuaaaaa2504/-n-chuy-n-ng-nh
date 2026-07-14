import { useState } from 'react';
import HeroBanner from '../components/HeroBanner';
import MovieSection from '../components/MovieSection';
import { mockMovies } from '../data/mockMovies';
import { useTheme } from '../context/useTheme';

type Tab = 'NOW_SHOWING' | 'COMING_SOON' | 'SPECIAL';

export default function HomePage() {
  const { darkMode } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('NOW_SHOWING');

  const nowShowing = mockMovies.filter((m) => m.status === 'NOW_SHOWING');
  const comingSoon = mockMovies.filter((m) => m.status === 'COMING_SOON');

  const filtered =
    activeTab === 'NOW_SHOWING'
      ? nowShowing
      : activeTab === 'COMING_SOON'
      ? comingSoon
      : mockMovies;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'NOW_SHOWING', label: 'PHIM ĐANG CHIẾU' },
    { key: 'COMING_SOON', label: 'PHIM SẮP CHIẾU' },
    { key: 'SPECIAL', label: 'SUẤT CHIẾU ĐẶC BIỆT' },
  ];

  return (
    <div>
      <HeroBanner movies={mockMovies} />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div
          className={`flex justify-center border-b mb-6 overflow-x-auto overflow-y-hidden hide-scrollbar ${
            darkMode ? 'border-gray-700' : 'border-gray-300'
          }`}
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-6 md:px-10 py-4 text-sm md:text-base font-bold tracking-wide transition border-b-2 -mb-px whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-500'
                  : `border-transparent ${
                      darkMode
                        ? 'text-white hover:text-blue-400'
                        : 'text-gray-900 hover:text-blue-500'
                    }`
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
