import { useEffect, useState } from 'react';

// Dùng để render MỘT bảng duy nhất thay vì render 2 lần rồi ẩn bằng CSS
// (DOM nặng gấp đôi, screen reader đọc trùng).
export default function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
