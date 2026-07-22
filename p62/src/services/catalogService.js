import api from '../config/api';

const catalogService = {
  getCinemas: (signal) => api.get('/cinemas', { signal }).then((r) => r.data),
  getRooms: (cinemaId, signal) =>
    api.get('/rooms', { params: { cinemaId }, signal }).then((r) => r.data),
  getMovies: (signal) =>
    api.get('/movies', { params: { status: 'SHOWING,UPCOMING' }, signal }).then((r) => r.data),
};

export default catalogService;
