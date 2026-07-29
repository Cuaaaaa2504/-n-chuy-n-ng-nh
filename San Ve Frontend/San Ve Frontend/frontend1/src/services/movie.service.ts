import api from './api';

export type Movie = {
  id: number | string;
  title: string;
  description?: string;
  posterUrl?: string;
  backdropUrl?: string;
  duration?: number;
  releaseDate?: string;
  ageRating?: string;
  status?: string;
};

export async function getMovies(): Promise<Movie[]> {
  const response = await api.get('/movies');

  const data = response.data;

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  return [];
}

export async function getMovieById(
  id: string | number,
): Promise<Movie> {
  const response = await api.get(`/movies/${id}`);
  return response.data?.data ?? response.data;
}
