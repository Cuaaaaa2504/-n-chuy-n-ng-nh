import {
  useEffect,
  useState,
  type FocusEvent,
  type MouseEvent,
  type SyntheticEvent,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getMovieRating,
  submitMovieRating,
  type MovieRatingSummary,
} from '../api/movieRatingApi';

interface InteractiveMovieRatingProps {
  movieId: number;
  score?: number | string | null;
  fallbackScore?: number;
  suffix?: string;
  className?: string;
}

const STARS = [1, 2, 3, 4, 5] as const;
const RATING_EVENT = 'cinehunt-movie-rating-updated';

type RatingEventDetail = MovieRatingSummary;

function normalizeInitialScore(
  score: number | string | null | undefined,
  fallback: number,
) {
  const value = Number(score);
  if (!Number.isFinite(value)) return fallback;

  const scoreOnTen = value <= 5 ? value * 2 : value;
  return Math.min(10, Math.max(0, scoreOnTen));
}

export default function InteractiveMovieRating({
  movieId,
  score,
  fallbackScore = 0,
  suffix = '/10',
  className = '',
}: InteractiveMovieRatingProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn } = useAuth();

  const initialScore = normalizeInitialScore(score, fallbackScore);
  const [summary, setSummary] = useState<MovieRatingSummary>({
    movieId,
    averageStars: initialScore / 2,
    averageScore: initialScore,
    ratingCount: 0,
    myRating: null,
  });
  const [open, setOpen] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [closedAfterRating, setClosedAfterRating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const savedRating = summary.myRating ?? 0;
  const activeStars = hoveredStar || savedRating;
  const scoreText = summary.averageScore.toFixed(1);

  useEffect(() => {
    let cancelled = false;

    getMovieRating(movieId, isLoggedIn)
      .then((nextSummary) => {
        if (!cancelled) setSummary(nextSummary);
      })
      .catch((error: Error) => {
        if (!cancelled) setErrorMessage(error.message);
      });

    const handleRatingUpdated = (event: Event) => {
      const detail = (event as CustomEvent<RatingEventDetail>).detail;
      if (detail?.movieId === movieId) {
        setSummary((current) => ({
          ...detail,
          myRating: isLoggedIn ? detail.myRating : current.myRating,
        }));
      }
    };

    window.addEventListener(RATING_EVENT, handleRatingUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener(RATING_EVENT, handleRatingUpdated);
    };
  }, [isLoggedIn, movieId]);

  const stopParentNavigation = (event: SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const showRatingPanel = () => {
    if (!closedAfterRating) setOpen(true);
  };

  const closeRatingPanel = () => {
    setOpen(false);
    setHoveredStar(0);
    setClosedAfterRating(false);
    setErrorMessage('');
  };

  const handleBlur = (event: FocusEvent<HTMLSpanElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      closeRatingPanel();
    }
  };

  const handleRate = async (
    event: MouseEvent<HTMLButtonElement>,
    stars: number,
  ) => {
    stopParentNavigation(event);

    if (!isLoggedIn) {
      navigate('/login', {
        state: {
          from: `${location.pathname}${location.search}${location.hash}`,
        },
      });
      return;
    }

    if (saving) return;

    setSaving(true);
    setErrorMessage('');
    try {
      const nextSummary = await submitMovieRating(movieId, stars);
      setSummary(nextSummary);
      window.dispatchEvent(
        new CustomEvent<RatingEventDetail>(RATING_EVENT, {
          detail: nextSummary,
        }),
      );
      setHoveredStar(0);
      setOpen(false);
      setClosedAfterRating(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Không lưu được đánh giá',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <span
      className={`relative inline-flex min-h-7 items-center ${className}`}
      onMouseEnter={showRatingPanel}
      onMouseLeave={closeRatingPanel}
      onFocus={showRatingPanel}
      onBlur={handleBlur}
      onClick={stopParentNavigation}
    >
      <button
        type="button"
        className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-1 py-0.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/70"
        style={{ color: 'var(--st-gold)' }}
        title={
          savedRating
            ? `Điểm trung bình ${scoreText}/10 từ ${summary.ratingCount} lượt. Bạn đã đánh giá ${savedRating}/5 sao.`
            : `Điểm trung bình ${scoreText}/10 từ ${summary.ratingCount} lượt đánh giá.`
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={(event) => {
          stopParentNavigation(event);
          setClosedAfterRating(false);
          setOpen((value) => !value);
        }}
      >
        <span aria-hidden="true" className="text-[19px] leading-none">
          ★
        </span>
        <span>
          {scoreText}
          {suffix}
        </span>
        <span className="text-[11px] opacity-75">({summary.ratingCount})</span>
      </button>

      {open && !closedAfterRating && (
        <span
          className="absolute left-0 top-full z-[100] block pt-2"
          role="radiogroup"
          aria-label="Đánh giá phim từ 1 đến 5 sao"
        >
          <span className="inline-flex min-w-max flex-col rounded-xl border border-white/20 bg-black/90 px-3 py-2 shadow-2xl backdrop-blur-md">
            <span className="inline-flex items-center gap-1">
              {STARS.map((stars) => {
                const filled = stars <= activeStars;

                return (
                  <button
                    key={stars}
                    type="button"
                    role="radio"
                    aria-checked={savedRating === stars}
                    aria-label={`${stars} sao`}
                    title={`Đánh giá ${stars} sao`}
                    disabled={saving}
                    className="grid h-8 w-8 place-items-center rounded-md text-[27px] leading-none transition-transform hover:scale-125 focus-visible:scale-125 focus-visible:outline-none disabled:cursor-wait disabled:opacity-60"
                    style={{
                      color: filled ? '#f6b800' : 'rgba(255,255,255,.38)',
                      textShadow: filled
                        ? '0 0 10px rgba(246,184,0,.45)'
                        : 'none',
                    }}
                    onMouseEnter={() => setHoveredStar(stars)}
                    onMouseLeave={() => setHoveredStar(0)}
                    onFocus={() => setHoveredStar(stars)}
                    onClick={(event) => void handleRate(event, stars)}
                  >
                    ★
                  </button>
                );
              })}
            </span>

            <span className="mt-1 text-center text-[11px] text-white/65">
              {saving
                ? 'Đang lưu...'
                : savedRating
                  ? `Bạn đã chấm ${savedRating}/5 sao`
                  : 'Chọn số sao của bạn'}
            </span>

            {errorMessage && (
              <span className="mt-1 max-w-52 text-center text-[11px] text-red-300">
                {errorMessage}
              </span>
            )}
          </span>
        </span>
      )}
    </span>
  );
}
