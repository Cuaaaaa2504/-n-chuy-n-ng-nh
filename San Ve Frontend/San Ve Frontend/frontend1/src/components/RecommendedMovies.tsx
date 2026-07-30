import { startTransition, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Booking } from '../types/booking';
import type { Movie } from '../types/movie';
import type {
  RecommendationDebug,
  RecommendationSource,
} from '../types/recommendation';
import { getMyBookings } from '../api/bookingApi';
import { useAuth } from '../context/AuthContext';
import { useRecommendations } from '../hooks/useRecommendations';
import {
  FAVORITE_GENRES_CHANGED_EVENT,
  readFavoriteGenres,
} from '../utils/moviePreferences';
import { rankPersonalizedMovies } from '../utils/recommendationRanking';
import MovieCard from './MovieCard';
import {
  RECOMMENDATION_DEFAULT_LIMIT,
  UPSTREAM_LABELS,
} from '../types/recommendation';

function DebugBadge({ debug }: { debug: RecommendationDebug | null }) {
  if (!import.meta.env.DEV || !debug) return null;

  const meta = UPSTREAM_LABELS[debug.upstreamSource];
  const isHealthy = debug.upstreamSource === 'MODEL';

  return (
    <span
      title={`${meta.hint}\nService: ${debug.serviceUrl || 'không rõ'}\nSố id nhận được: ${debug.upstreamCount}`}
      className="stitch-recommendation-note"
      style={{
        color: isHealthy ? 'var(--st-success)' : 'var(--st-gold)',
        borderColor: isHealthy
          ? 'color-mix(in srgb,var(--st-success) 35%,transparent)'
          : 'color-mix(in srgb,var(--st-gold) 35%,transparent)',
      }}
    >
      <span className="material-symbols-outlined text-[14px]">
        {isHealthy ? 'check_circle' : 'info'}
      </span>
      {meta.label}
      {debug.modelVersion ? ` · ${debug.modelVersion}` : ''}
    </span>
  );
}

interface Props {
  limit?: number;
  /** Toàn bộ phim công khai để xếp hạng thêm theo sở thích và lịch sử vé. */
  fallbackMovies?: Movie[];
}

function headingFor({
  source,
  usingFallback,
  favoriteGenres,
  historyGenres,
}: {
  source: RecommendationSource;
  usingFallback: boolean;
  favoriteGenres: string[];
  historyGenres: string[];
}) {
  const signals = Array.from(new Set([...favoriteGenres, ...historyGenres])).slice(0, 4);

  if (signals.length > 0) {
    return {
      title: 'Gợi ý dành riêng cho bạn',
      subtitle: `Ưu tiên theo gu ${signals.join(', ')} và lịch sử vé của tài khoản.`,
      icon: 'auto_awesome',
    };
  }

  if (!usingFallback && source === 'MODEL') {
    return {
      title: 'Gợi ý riêng cho bạn',
      subtitle: 'Dựa trên lịch sử đặt vé và dữ liệu cá nhân hóa từ hệ thống.',
      icon: 'auto_awesome',
    };
  }

  return {
    title: 'Có thể bạn sẽ thích',
    subtitle: usingFallback
      ? 'Tạm hiển thị các phim nổi bật trong khi hệ thống hoàn thiện gợi ý cá nhân.'
      : 'Những phim đang được nhiều khán giả quan tâm.',
    icon: 'local_fire_department',
  };
}

function SectionShell({
  title,
  subtitle,
  icon,
  debug,
  fallback,
  signals,
  children,
}: {
  title: string;
  subtitle: string;
  icon: string;
  debug?: RecommendationDebug | null;
  fallback?: boolean;
  signals?: string[];
  children: ReactNode;
}) {
  return (
    <section className="stitch-recommendation-section" aria-labelledby="recommendation-title">
      <div className="stitch-section-heading">
        <div>
          <p className="stitch-kicker mb-3">Personalized cinema</p>
          <h2 id="recommendation-title" className="stitch-section-title">
            <span className="material-symbols-outlined">{icon}</span>
            {title}
          </h2>
          <p className="stitch-muted mt-2">{subtitle}</p>
          {signals && signals.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {signals.slice(0, 4).map((signal) => (
                <span key={signal} className="stitch-recommendation-note">
                  {signal}
                </span>
              ))}
            </div>
          )}
          {fallback && (
            <span className="stitch-recommendation-note">
              <span className="material-symbols-outlined text-[14px]">bolt</span>
              Danh sách dự phòng
            </span>
          )}
        </div>
        <DebugBadge debug={debug ?? null} />
      </div>
      {children}
    </section>
  );
}

export default function RecommendedMovies({
  limit = RECOMMENDATION_DEFAULT_LIMIT,
  fallbackMovies = [],
}: Props) {
  const { user, isLoggedIn } = useAuth();
  const { movies, source, debug, loading, error, refetch } =
    useRecommendations({ limit });
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [favoriteGenres, setFavoriteGenres] = useState<string[]>(() =>
    readFavoriteGenres(user?.id),
  );

  useEffect(() => {
    startTransition(() => {
      setFavoriteGenres(readFavoriteGenres(user?.id));
    });
  }, [user?.id]);

  useEffect(() => {
    const handlePreferencesChanged = () => {
      setFavoriteGenres(readFavoriteGenres(user?.id));
    };
    window.addEventListener(FAVORITE_GENRES_CHANGED_EVENT, handlePreferencesChanged);
    return () => {
      window.removeEventListener(FAVORITE_GENRES_CHANGED_EVENT, handlePreferencesChanged);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!isLoggedIn) {
      startTransition(() => {
        setBookings([]);
      });
      return;
    }

    let cancelled = false;
    void getMyBookings({ page: 1, limit: 50 })
      .then((result) => {
        if (!cancelled) setBookings(result.items);
      })
      .catch((historyError) => {
        console.warn('[recommendations] Không đọc được lịch sử vé:', historyError);
        if (!cancelled) setBookings([]);
      });

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  const publicFallback = useMemo(
    () => fallbackMovies.filter((movie) => movie.status !== 'HIDDEN' && movie.status !== 'ENDED'),
    [fallbackMovies],
  );

  const ranked = useMemo(
    () =>
      rankPersonalizedMovies({
        recommendationMovies: movies,
        allMovies: fallbackMovies,
        bookings,
        favoriteGenres,
        limit,
      }),
    [bookings, fallbackMovies, favoriteGenres, limit, movies],
  );

  if (!isLoggedIn) return null;

  const usingFallback = movies.length === 0 && publicFallback.length > 0;
  const displayMovies = ranked.movies;
  const signals = Array.from(
    new Set([...favoriteGenres, ...ranked.profile.historyGenreLabels]),
  );
  const { title, subtitle, icon } = headingFor({
    source,
    usingFallback,
    favoriteGenres,
    historyGenres: ranked.profile.historyGenreLabels,
  });

  if (loading && displayMovies.length === 0) {
    return (
      <SectionShell
        title="Đang tạo gợi ý cho bạn"
        subtitle="Hệ thống đang phân tích sở thích và lịch sử vé."
        icon="auto_awesome"
        debug={debug}
      >
        <div className="stitch-movie-grid">
          {Array.from({ length: Math.min(limit, 4) }).map((_, index) => (
            <div key={index} className="stitch-card aspect-[2/3] animate-pulse" />
          ))}
        </div>
      </SectionShell>
    );
  }

  if (displayMovies.length === 0) {
    return (
      <SectionShell
        title="Gợi ý dành cho bạn"
        subtitle="Chưa có đủ dữ liệu phim để tạo danh sách phù hợp."
        icon="auto_awesome"
        debug={debug}
      >
        <div className="stitch-card p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="stitch-muted">Danh sách gợi ý đang được cập nhật.</p>
          <button type="button" onClick={() => void refetch()} className="stitch-btn stitch-btn-outline">
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Thử lại
          </button>
        </div>
      </SectionShell>
    );
  }

  return (
    <SectionShell
      title={title}
      subtitle={subtitle}
      icon={icon}
      debug={debug}
      fallback={usingFallback || Boolean(error)}
      signals={signals}
    >
      <div className="stitch-movie-grid">
        {displayMovies.map((movie) => (
          <MovieCard key={movie.movie_id} movie={movie} />
        ))}
      </div>
    </SectionShell>
  );
}
