import { useState } from "react";
import Navbar from "../components/Navbar";
import HeroBanner from "../components/HeroBanner";
import MovieSection from "../components/MovieSection";
import { mockMovies } from "../data/mockMovies";
import { useTheme } from "../context/ThemeContext";

type Tab = "NOW_SHOWING" | "COMING_SOON" | "SPECIAL";

export default function HomePage() {
  const { darkMode } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>("NOW_SHOWING");

  const nowShowing = mockMovies.filter((m) => m.status === "NOW_SHOWING");
  const comingSoon = mockMovies.filter((m) => m.status === "COMING_SOON");

  const filtered =
    activeTab === "NOW_SHOWING"
      ? nowShowing
      : activeTab === "COMING_SOON"
      ? comingSoon
      : mockMovies;

  const tabs: { key: Tab; label: string }[] = [
    { key: "NOW_SHOWING", label: "PHIM ĐANG CHIẾU" },
    { key: "COMING_SOON", label: "PHIM SẮP CHIẾU" },
    { key: "SPECIAL", label: "SUẤT CHIẾU ĐẶC BIỆT" },
  ];

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        darkMode ? "bg-gray-950 text-white" : "bg-gray-100 text-gray-900"
      }`}
    >
      <Navbar />
      <HeroBanner movies={mockMovies} />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div
          className={`flex justify-center border-b mb-6 overflow-x-auto overflow-y-hidden hide-scrollbar ${
            darkMode ? "border-gray-700" : "border-gray-300"
          }`}
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-6 md:px-10 py-4 text-sm md:text-base font-bold tracking-wide transition border-b-2 -mb-px whitespace-nowrap ${
                activeTab === tab.key
                  ? "border-blue-500 text-blue-500"
                  : `border-transparent ${
                      darkMode ? "text-white hover:text-blue-400" : "text-gray-900 hover:text-blue-500"
                    }`
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <MovieSection
          title={
            activeTab === "NOW_SHOWING"
              ? "Phim đang chiếu"
              : activeTab === "COMING_SOON"
              ? "Phim sắp chiếu"
              : "Suất chiếu đặc biệt"
          }
          movies={filtered}
          darkMode={darkMode}
        />
      </div>

      <footer
        className={`mt-8 border-t py-10 ${
          darkMode
            ? "bg-gray-900 border-gray-700 text-gray-400"
            : "bg-white border-gray-200 text-gray-500"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
          <div>
            <p className="font-extrabold text-blue-500 text-xl mb-2">🎬 CMC Cinema</p>
            <p>
              Hotline: <strong>1900 636807</strong>
            </p>
            <p>Email: support@cmccinema.vn</p>
            <p className="mt-2">Địa chỉ: 123 Nguyễn Trãi, Hà Nội</p>
          </div>

          <div>
            <p className="font-bold mb-3 uppercase tracking-wide">Hỗ trợ</p>
            <p className="hover:text-blue-500 cursor-pointer mb-1">Hướng dẫn đặt vé online</p>
            <p className="hover:text-blue-500 cursor-pointer mb-1">Điều khoản sử dụng</p>
            <p className="hover:text-blue-500 cursor-pointer mb-1">Chính sách hoàn vé</p>
            <p className="hover:text-blue-500 cursor-pointer mb-1">F.A.Q</p>
          </div>

          <div>
            <p className="font-bold mb-3 uppercase tracking-wide">Về chúng tôi</p>
            <p className="hover:text-blue-500 cursor-pointer mb-1">Giới thiệu</p>
            <p className="hover:text-blue-500 cursor-pointer mb-1">Tuyển dụng</p>
            <p className="hover:text-blue-500 cursor-pointer mb-1">Nhượng quyền</p>
            <p className="hover:text-blue-500 cursor-pointer mb-1">Liên hệ quảng cáo</p>
          </div>
        </div>

        <div
          className={`max-w-6xl mx-auto px-4 mt-8 pt-6 border-t text-xs text-center ${
            darkMode ? "border-gray-700" : "border-gray-200"
          }`}
        >
          © 2026 CMC Cinema. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
