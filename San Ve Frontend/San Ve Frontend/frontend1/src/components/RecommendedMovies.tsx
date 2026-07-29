// src/components/RecommendedMovies.tsx
//
// VÁ MỤC #4 CỦA BÁO CÁO — "Frontend chưa có component/page hiển thị recommendation".
//
// Xử lý đủ 4 trạng thái mà báo cáo chỉ ra là còn thiếu: loading / error /
// empty / có dữ liệu. Không dùng lại `MovieSection` vì component đó luôn kèm
// nút "Xem tất cả" trỏ về `/movies` — với gợi ý cá nhân hoá thì không có
// trang "tất cả" nào để xem, bấm vào chỉ dẫn người dùng sang danh sách phim
// thường và làm hỏng ý nghĩa của section.

import type { Movie } from '../types/movie';
import type {
  RecommendationDebug,
  RecommendationSource,
} from '../types/recommendation';
import MovieCard from './MovieCard';
import { useRecommendations } from '../hooks/useRecommendations';
import {
  RECOMMENDATION_DEFAULT_LIMIT,
  UPSTREAM_LABELS,
} from '../types/recommendation';

/**
 * FIX REC-06 — badge kỹ thuật phân biệt MODEL / CACHE / POPULARITY / SERVICE OFF.
 *
 * Bốn trạng thái này cho ra bốn danh sách rất khác nhau nhưng hiện lên GIỐNG HỆT
 * nhau — chính vì vậy không ai trong nhóm phát hiện ra model chưa từng chạy.
 * Badge chỉ render ở chế độ dev (`import.meta.env.DEV`), nên bản build cho người
 * dùng cuối không hề thay đổi.
 *
 * Đặt ngay cạnh tiêu đề section thay vì chỉ log ra console: khi đang so tay hai
 * tài khoản xem gợi ý có khác nhau không, mở DevTools rồi cuộn tìm log là quá
 * chậm — thông tin phải nằm cùng chỗ với dữ liệu nó mô tả.
 */
function DebugBadge({ debug }: { debug: RecommendationDebug | null }) {
  if (!import.meta.env.DEV || !debug) return null;

  const meta = UPSTREAM_LABELS[debug.upstreamSource];
  const isHealthy = debug.upstreamSource === 'MODEL';

  return (
    <span
      title={`${meta.hint}\nService: ${debug.serviceUrl || 'không rõ'}\nSố id nhận được: ${debug.upstreamCount}`}
      className={[
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border',
        'font-label-sm text-label-sm uppercase tracking-wider cursor-help',
        isHealthy
          ? 'border-secondary/50 text-secondary bg-secondary/10'
          : 'border-error/50 text-error bg-error/10',
      ].join(' ')}
    >
      <span className="material-symbols-outlined text-[14px]">
        {isHealthy ? 'check_circle' : 'warning'}
      </span>
      {meta.label}
      {debug.modelVersion ? ` · ${debug.modelVersion}` : ''}
      {debug.fellBackAfterFilter ? ' · đã lọc hết' : ''}
    </span>
  );
}

interface Props {
  /** Số phim hiển thị. Backend chặn trần 30. */
  limit?: number;
}

/**
 * Tiêu đề phụ thuộc nguồn dữ liệu.
 *
 * FALLBACK nghĩa là danh sách này GIỐNG NHAU với mọi người dùng (cold start,
 * hoặc Python service không phản hồi). Vẫn đề "Gợi ý riêng cho bạn" lúc đó là
 * nói dối, và đó cũng chính là lý do không ai trong nhóm phát hiện ra model
 * chưa từng chạy — giao diện trông y hệt nhau ở cả hai trường hợp.
 */
function headingFor(source: RecommendationSource): {
  title: string;
  subtitle: string;
  icon: string;
} {
  if (source === 'MODEL') {
    return {
      title: 'Gợi ý riêng cho bạn',
      subtitle: 'Dựa trên những phim bạn đã đặt vé',
      icon: 'auto_awesome',
    };
  }
  return {
    title: 'Có thể bạn sẽ thích',
    subtitle: 'Những phim đang được đặt nhiều nhất',
    icon: 'local_fire_department',
  };
}

function SectionShell({
  title,
  subtitle,
  icon,
  debug,
  children,
}: {
  title: string;
  subtitle: string;
  icon: string;
  debug?: RecommendationDebug | null;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-14">
      <div className="flex items-center gap-3 mb-6">
        <span className="w-1 h-8 rounded-full bg-primary-container shadow-[0_0_12px_rgba(221,183,255,0.6)]" />
        <div>
          <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface flex items-center gap-2 flex-wrap">
            <span className="material-symbols-outlined text-[24px] text-primary-container">
              {icon}
            </span>
            {title}
            <DebugBadge debug={debug ?? null} />
          </h2>
          <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">
            {subtitle}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

export default function RecommendedMovies({
  limit = RECOMMENDATION_DEFAULT_LIMIT,
}: Props) {
  const { movies, source, debug, loading, error, isLoggedIn, refetch } =
    useRecommendations({ limit });

  // 1) Chưa đăng nhập -> ẩn hoàn toàn.
  //    Không hiện "Đăng nhập để xem gợi ý": trang chủ đã có nút đăng nhập ở
  //    Navbar, thêm một lời mời nữa chỉ làm loãng trang.
  if (!isLoggedIn) return null;

  const { title, subtitle, icon } = headingFor(source);

  // 2) Loading — skeleton đúng bằng số ô sẽ hiện, để layout không nhảy khi
  //    dữ liệu về (tránh cumulative layout shift).
  if (loading) {
    return (
      <SectionShell title={title} subtitle={subtitle} icon={icon} debug={debug}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-gutter-mobile md:gap-gutter-desktop">
          {Array.from({ length: Math.min(limit, 4) }).map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] rounded-lg glass-panel animate-pulse"
            />
          ))}
        </div>
      </SectionShell>
    );
  }

  // 3) Lỗi — KHÔNG chiếm chỗ bằng khối báo lỗi to đùng.
  //    Gợi ý phim hỏng không phải là chuyện người dùng cần biết hay xử lý; họ
  //    vẫn đặt vé bình thường được. Chỉ để một dòng nhỏ kèm nút thử lại.
  if (error) {
    return (
      <SectionShell title={title} subtitle={subtitle} icon={icon} debug={debug}>
        <div className="glass-panel rounded-xl py-8 px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-body-md text-on-surface-variant">
            Chưa tải được danh sách gợi ý.
          </p>
          <button
            onClick={() => void refetch()}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-secondary/40 font-label-sm text-label-sm uppercase tracking-wider text-secondary hover:bg-secondary/10 transition-all duration-300"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            Thử lại
          </button>
        </div>
      </SectionShell>
    );
  }

  // 4) Rỗng -> ẩn section.
  //    Đây là quyết định có chủ ý, khác với `MovieSection` (hiện "Không có phim
  //    nào"). Một section gợi ý trống rỗng chỉ nói với người dùng rằng hệ thống
  //    không hiểu họ — thà đừng hiện còn hơn.
  if (movies.length === 0) return null;

  return (
    <SectionShell title={title} subtitle={subtitle} icon={icon} debug={debug}>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-gutter-mobile md:gap-gutter-desktop">
        {movies.map((movie: Movie) => (
          <MovieCard key={movie.movie_id} movie={movie} />
        ))}
      </div>
    </SectionShell>
  );
}
