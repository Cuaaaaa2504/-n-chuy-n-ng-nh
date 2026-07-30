const STORAGE_PREFIX = 'cmc-cinema:favorite-genres';

export const FAVORITE_GENRES_CHANGED_EVENT = 'cmc-favorite-genres-changed';

const GENRE_ALIASES: Record<string, string> = {
  action: 'hanh dong',
  'hanh dong': 'hanh dong',
  horror: 'kinh di',
  'kinh di': 'kinh di',
  animation: 'hoat hinh',
  'hoat hinh': 'hoat hinh',
  drama: 'tam ly',
  'tam ly': 'tam ly',
  thriller: 'hoi hop',
  'hoi hop': 'hoi hop',
  comedy: 'hai',
  'hai huoc': 'hai',
  'hai': 'hai',
  romance: 'tinh cam',
  'tinh cam': 'tinh cam',
  'science fiction': 'khoa hoc vien tuong',
  'sci fi': 'khoa hoc vien tuong',
  scifi: 'khoa hoc vien tuong',
  'khoa hoc vien tuong': 'khoa hoc vien tuong',
  fantasy: 'than thoai',
  'than thoai': 'than thoai',
  adventure: 'phieu luu',
  'phieu luu': 'phieu luu',
};

function storageKey(userId: string | number | null | undefined) {
  return `${STORAGE_PREFIX}:${userId ?? 'guest'}`;
}

export function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLocaleLowerCase('vi')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function canonicalGenreKey(value: string) {
  const normalized = normalizeText(value);
  return GENRE_ALIASES[normalized] ?? normalized;
}

export function sameGenre(left: string, right: string) {
  return canonicalGenreKey(left) === canonicalGenreKey(right);
}

export function readFavoriteGenres(userId: string | number | null | undefined): string[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    const unique = new Map<string, string>();
    parsed.forEach((item) => {
      if (typeof item !== 'string' || !item.trim()) return;
      unique.set(canonicalGenreKey(item), item.trim());
    });
    return Array.from(unique.values());
  } catch {
    return [];
  }
}

export function writeFavoriteGenres(
  userId: string | number | null | undefined,
  genres: string[],
) {
  if (typeof window === 'undefined') return;

  const unique = new Map<string, string>();
  genres.forEach((genre) => {
    if (!genre.trim()) return;
    unique.set(canonicalGenreKey(genre), genre.trim());
  });

  const value = Array.from(unique.values());
  window.localStorage.setItem(storageKey(userId), JSON.stringify(value));
  window.dispatchEvent(
    new CustomEvent(FAVORITE_GENRES_CHANGED_EVENT, {
      detail: { userId: userId ?? 'guest', genres: value },
    }),
  );
}
