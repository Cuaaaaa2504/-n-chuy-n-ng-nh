import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getMovieShowtimes } from '../services/showtimeService';
import ShowtimeDateTabs from '../components/ShowtimeDateTabs';
import ShowtimeCinemaCard from '../components/ShowtimeCinemaCard';
import EmptyShowtime from '../components/EmptyShowtime';
import { formatTime, formatDate, getAvailableDates, filterShowtimesByDate } from '../utils/dateUtils';
import '../styles/MovieShowtimesPage.css';

const MovieShowtimesPage = () => {
  const { movieId } = useParams();
  const navigate = useNavigate();
  
  const [showtimes, setShowtimes] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchShowtimes = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await getMovieShowtimes(movieId);
        setShowtimes(data);
        
        if (data.length > 0) {
          const firstDate = data[0].startTime.split('T')[0];
          setSelectedDate(firstDate);
        }
      } catch (err) {
        setError(err.message || 'Không thể tải lịch chiếu. Vui lòng thử lại sau.');
        console.error('Error fetching showtimes:', err);
      } finally {
        setLoading(false);
      }
    };

    if (movieId) {
      fetchShowtimes();
    }
  }, [movieId]);

  const handleSelectShowtime = (showtimeId) => {
    navigate(`/booking/seats/${showtimeId}`);
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
  };

  const availableDates = getAvailableDates(showtimes);
  const filteredShowtimes = filterShowtimesByDate(showtimes, selectedDate);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Đang tải lịch chiếu...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-icon">⚠️</div>
        <h3>Đã xảy ra lỗi</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className="retry-btn">
          Thử lại
        </button>
      </div>
    );
  }

  if (!loading && showtimes.length === 0) {
    return <EmptyShowtime />;
  }

  // Nhóm showtimes theo cinema
  const groupedShowtimes = filteredShowtimes.reduce((groups, showtime) => {
    const key = showtime.cinemaName;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(showtime);
    return groups;
  }, {});

  return (
    <div className="movie-showtimes-page">
      <div className="page-header">
        <h2>Chọn suất chiếu</h2>
        <p className="movie-title">
          {showtimes[0]?.movieTitle || 'Phim'}
        </p>
        <p className="movie-id">Mã phim: {movieId}</p>
      </div>

      <ShowtimeDateTabs
        dates={availableDates}
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
        formatDate={formatDate}
      />

      <div className="showtimes-list">
        {filteredShowtimes.length === 0 && selectedDate && (
          <div className="no-showtimes-date">
            <p>Không có suất chiếu nào trong ngày này</p>
          </div>
        )}
        
        {filteredShowtimes.length > 0 && (
          <div className="cinema-group">
            {Object.entries(groupedShowtimes).map(([cinemaName, cinemaShowtimes]) => (
              <div key={cinemaName} className="cinema-group-container">
                <h3 className="cinema-group-title">{cinemaName}</h3>
                {cinemaShowtimes.map((showtime) => (
                  <ShowtimeCinemaCard
                    key={showtime.showtimeId}
                    showtime={showtime}
                    formatTime={formatTime}
                    onSelect={handleSelectShowtime}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MovieShowtimesPage;