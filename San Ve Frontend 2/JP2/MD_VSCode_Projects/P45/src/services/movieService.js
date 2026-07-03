import axiosClient from '../api/axiosClient';

function normalizeMovies(payload) {
  const raw = Array.isArray(payload) ? payload : payload?.data || payload?.items || payload?.data?.items || [];
  return Array.isArray(raw) ? raw : [];
}

export async function getMovies({ keyword = '', status = 'ALL', page = 1, limit = 8 }) {
  const params = { page, limit };
  if (keyword.trim()) params.search = keyword.trim();
  if (status !== 'ALL') params.status = status;
  const payload = await axiosClient.get('/movies', { params });
  const movies = normalizeMovies(payload);
  const total = payload?.total || payload?.data?.total || movies.length;
  return { movies, total };
}
