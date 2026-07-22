// src/components/showtime/EmptyShowtime.tsx
// FIX: các class `empty-showtime-container`, `empty-icon`, `empty-actions`,
// `back-btn`, `home-btn` không được định nghĩa ở bất kỳ file CSS nào trong dự án
// (index.css chỉ có `@import "tailwindcss"`), nên component hiện ra dưới dạng
// text trần không định dạng. Sau khi bỏ suất chiếu mock (Lỗi 3), đây là trạng
// thái người dùng gặp thường xuyên nên càng phải hiển thị tử tế.
import React from 'react';
import { useNavigate } from 'react-router-dom';

const EmptyShowtime: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="rounded-2xl border border-dashed border-gray-700 px-6 py-14 text-center">
      <p className="text-5xl mb-4">🎬</p>
      <h3 className="text-lg font-bold mb-2">Phim hiện chưa có lịch chiếu</h3>
      <p className="text-sm text-gray-400 mb-7">
        Vui lòng quay lại sau để xem các suất chiếu mới nhất.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="px-5 py-2.5 rounded-xl border border-gray-600 text-gray-300 hover:bg-gray-800 text-sm font-semibold transition"
        >
          ← Quay lại
        </button>
        <button
          onClick={() => navigate('/schedule')}
          className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-950 text-sm font-semibold transition"
        >
          📅 Xem lịch chiếu
        </button>
        <button
          onClick={() => navigate('/')}
          className="px-5 py-2.5 rounded-xl border border-gray-600 text-gray-300 hover:bg-gray-800 text-sm font-semibold transition"
        >
          🏠 Trang chủ
        </button>
      </div>
    </div>
  );
};

export default EmptyShowtime;
