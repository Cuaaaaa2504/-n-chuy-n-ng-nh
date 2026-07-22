// src/pages/HomePage.tsx
//
// FIX Lỗi 2: trang chủ import `mockMovies` và không hề gọi API. Admin thêm/sửa/xoá
// phim thì trang chủ không bao giờ phản ánh — banner và cả 2 tab đều là dữ liệu
// giả cứng. Nay toàn bộ dữ liệu đến từ `GET /movies` qua hook `useMovies()`.
//
// FIX Lỗi 6: banner trước đây dựa vào `featured` — field KHÔNG tồn tại trong
// entity/DTO/bảng `movies` của backend, nên với dữ liệu thật nó luôn undefined.
// Nay banner lấy các phim đang chiếu mới nhất, tiêu chí có thật trong DB.
import { useMemo, useState } from 'react';
import HeroBanner from '../components/HeroBanner';
import MovieSection from '../components/MovieSection';
import { useMovies } from '../hooks/useMovies';
import { useTheme } from '../context/useTheme';

type Tab = 'NOW_SHOWING' | 'COMING_SOON' | 'SPECIAL';

const HERO_COUNT = 5;

export default function HomePage() {
  const { darkMode } = useTheme();
  const { movies, loading, error, fetchMovies } = useMovies();
  const [activeTab, setActiveTab] = useState<Tab>('NOW_SHOWING');

  // Không bao giờ hiển thị phim đã ẩn / đã kết thúc ra trang công khai
  const visible = useMemo(
    () => movies.filter((m) => m.status === 'NOW_SHOWING' || m.status === 'COMING_SOON'),
    [movies],
  );

  const nowShowing = useMemo(
    () => visible.filter((m) => m.status === 'NOW_SHOWING'),
    [visible],
  );
  const comingSoon = useMemo(
    () => visible.filter((m) => m.status === 'COMING_SOON'),
    [visible],
  );

  const heroMovies = useMemo(
    () => (nowShowing.length > 0 ? nowShowing : visible).slice(0, HERO_COUNT),
    [nowShowing, visible],
  );

  const filtered =
    activeTab === 'NOW_SHOWING' ? nowShowing : activeTab === 'COMING_SOON' ? comingSoon : visible;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'NOW_SHOWING', label: 'PHIM ĐANG CHIẾU' },
    { key: 'COMING_SOON', label: 'PHIM SẮP CHIẾU' },
    { key: 'SPECIAL', label: 'SUẤT CHIẾU ĐẶC BIỆT' },
  ];

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20">
        <div className="h-72 rounded-2xl bg-gray-800/40 animate-pulse mb-10" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-[2/3] rounded-2xl bg-gray-800/40 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto text-center px-4 py-24">
        <p className="text-4xl mb-3">⚠️</p>
        <p className="text-red-500 mb-2 font-semibold">Không tải được danh sách phim</p>
        <p className={`text-sm mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{error}</p>
        <button
          onClick={() => void fetchMovies()}
          className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div>
      <HeroBanner movies={heroMovies} />

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
