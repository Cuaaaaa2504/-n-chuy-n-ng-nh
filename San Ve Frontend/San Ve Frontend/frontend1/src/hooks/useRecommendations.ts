// src/hooks/useRecommendations.ts
//
// Cùng khuôn với `useMovies.ts` để call-site không phải học thêm gì mới.
//
// KHÁC BIỆT DUY NHẤT SO VỚI useMovies — và là điểm quan trọng nhất của file:
// gợi ý phim là tính năng "CÓ THÌ TỐT". Nó KHÔNG BAO GIỜ được phép làm hỏng
// trang chủ. Backend đã theo nguyên tắc này (`recommendation.service.ts` nuốt
// mọi lỗi của Python service và trả về FALLBACK); phía frontend cũng phải giữ
// đúng như vậy: hook này không bao giờ ném ra ngoài, chỉ set `error` rồi để
// component tự quyết định ẩn section đi.

import { useCallback, useEffect, useState } from 'react';
import { getRecommendations } from '../api/recommendationApi';
import type { Movie } from '../types/movie';
import type {
  RecommendationDebug,
  RecommendationSource,
} from '../types/recommendation';
import { RECOMMENDATION_DEFAULT_LIMIT } from '../types/recommendation';
import { useAuth } from '../context/AuthContext';

export interface UseRecommendationsOptions {
  /** Số phim muốn lấy (backend chặn trần 30). */
  limit?: number;
  /** Tự gọi API khi mount. Mặc định true. */
  autoFetch?: boolean;
}

export function useRecommendations(options: UseRecommendationsOptions = {}) {
  const { limit = RECOMMENDATION_DEFAULT_LIMIT, autoFetch = true } = options;

  // `isLoggedIn` chứ không phải `user`: endpoint xác định người dùng bằng JWT
  // trong header, không cần object user. Gọi API khi chưa đăng nhập chỉ tạo ra
  // một request 401 vô ích — và tệ hơn, interceptor 401 của `axiosClient` sẽ
  // thử refresh token rồi đá thẳng người dùng sang `/login?expired=1`. Khách
  // vãng lai vào xem trang chủ mà bị đẩy sang trang đăng nhập là bug nghiêm
  // trọng, và nó bắt nguồn từ đúng một dòng thiếu kiểm tra ở đây.
  const { isLoggedIn, loading: authLoading } = useAuth();

  const [movies, setMovies] = useState<Movie[]>([]);
  const [source, setSource] = useState<RecommendationSource>('FALLBACK');
  // FIX REC-06: giữ nguyên khối debug để component hiện badge kỹ thuật.
  const [debug, setDebug] = useState<RecommendationDebug | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async () => {
    if (!isLoggedIn) {
      setMovies([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await getRecommendations({ limit });
      setMovies(result.items);
      setSource(result.source);
      setDebug(result.debug);
    } catch (err) {
      // Không hiện thông báo lỗi đỏ chói ở trang chủ chỉ vì service gợi ý chết.
      // Section sẽ tự ẩn; các phần khác của trang không bị ảnh hưởng.
      const message =
        (err as { message?: string })?.message ?? 'Không tải được phim gợi ý';
      console.warn('[recommendations]', message);
      setError(message);
      setMovies([]);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, limit]);

  useEffect(() => {
    if (!autoFetch) return;
    // Đợi AuthContext hydrate xong. Gọi trong lúc `authLoading` còn true thì
    // `isLoggedIn` có thể vẫn là false dù người dùng đã đăng nhập -> section
    // gợi ý không bao giờ xuất hiện sau khi F5.
    if (authLoading) return;

    const timer = window.setTimeout(() => {
      void fetchRecommendations();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [autoFetch, authLoading, fetchRecommendations]);

  return {
    movies,
    source,
    debug,
    loading,
    error,
    isLoggedIn,
    refetch: fetchRecommendations,
  };
}

export default useRecommendations;
