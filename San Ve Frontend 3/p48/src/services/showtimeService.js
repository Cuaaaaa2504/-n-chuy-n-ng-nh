import axios from 'axios';

const API_URL = '/api/showtimes';

// Mock data for development
const MOCK_SHOWTIMES = [
  {
    showtimeId: 1,
    movieId: 10,
    movieTitle: 'Avengers Endgame',
    cinemaName: 'CGV Vincom',
    roomName: 'Phòng 01',
    startTime: new Date(Date.now() + 3600000).toISOString(),
    endTime: new Date(Date.now() + 10800000).toISOString()
  },
  {
    showtimeId: 2,
    movieId: 10,
    movieTitle: 'Avengers Endgame',
    cinemaName: 'CGV Vincom',
    roomName: 'Phòng 02',
    startTime: new Date(Date.now() + 7200000).toISOString(),
    endTime: new Date(Date.now() + 14400000).toISOString()
  },
  {
    showtimeId: 3,
    movieId: 10,
    movieTitle: 'Avengers Endgame',
    cinemaName: 'Lotte Cinema',
    roomName: 'Phòng 03',
    startTime: new Date(Date.now() + 10800000).toISOString(),
    endTime: new Date(Date.now() + 18000000).toISOString()
  },
  {
    showtimeId: 4,
    movieId: 10,
    movieTitle: 'Avengers Endgame',
    cinemaName: 'Lotte Cinema',
    roomName: 'Phòng 04',
    startTime: new Date(Date.now() + 14400000).toISOString(),
    endTime: new Date(Date.now() + 21600000).toISOString()
  },
  {
    showtimeId: 5,
    movieId: 10,
    movieTitle: 'Avengers Endgame',
    cinemaName: 'Galaxy Cinema',
    roomName: 'Phòng 05',
    startTime: new Date(Date.now() + 18000000).toISOString(),
    endTime: new Date(Date.now() + 25200000).toISOString()
  }
];

// Get movie showtimes
export const getMovieShowtimes = async (movieId) => {
  try {
    // Uncomment this when API is ready
    // const response = await axios.get(API_URL, {
    //   params: { movieId }
    // });
    // return response.data;

    // Using mock data for development
    return new Promise((resolve) => {
      setTimeout(() => {
        // Filter mock data by movieId
        const filtered = MOCK_SHOWTIMES.filter(st => st.movieId === parseInt(movieId));
        resolve(filtered);
      }, 800);
    });
  } catch (error) {
    console.error('Error fetching showtimes:', error);
    throw new Error('Không thể tải danh sách suất chiếu');
  }
};

// Get showtime detail
export const getShowtimeDetail = async (showtimeId) => {
  try {
    // Uncomment this when API is ready
    // const response = await axios.get(`${API_URL}/${showtimeId}`);
    // return response.data;

    // Using mock data for development
    return new Promise((resolve) => {
      setTimeout(() => {
        const showtime = MOCK_SHOWTIMES.find(st => st.showtimeId === parseInt(showtimeId));
        resolve(showtime || null);
      }, 500);
    });
  } catch (error) {
    console.error('Error fetching showtime detail:', error);
    throw new Error('Không thể tải thông tin suất chiếu');
  }
};

// Book seats
export const bookSeats = async (showtimeId, seatIds) => {
  try {
    const response = await axios.post(`${API_URL}/${showtimeId}/book`, { seatIds });
    return response.data;
  } catch (error) {
    console.error('Error booking seats:', error);
    throw new Error('Không thể đặt vé. Vui lòng thử lại.');
  }
};