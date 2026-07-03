import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(localStorage.getItem('accessToken')));

  useEffect(() => {
    const syncAuth = () => setIsLoggedIn(Boolean(localStorage.getItem('accessToken')));
    window.addEventListener('storage', syncAuth);
    window.addEventListener('auth-changed', syncAuth);
    return () => {
      window.removeEventListener('storage', syncAuth);
      window.removeEventListener('auth-changed', syncAuth);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('auth-changed'));
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div className="navbar-container">
        <NavLink to="/" className="logo">CMC Cinema</NavLink>
        <nav className="nav-links">
          <NavLink to="/">Trang chủ</NavLink>
          <NavLink to="/movies">Phim</NavLink>
          {isLoggedIn && <NavLink to="/my-tickets">Vé của tôi</NavLink>}
          {!isLoggedIn ? (
            <>
              <NavLink to="/login">Đăng nhập</NavLink>
              <NavLink to="/register">Đăng ký</NavLink>
            </>
          ) : (
            <button className="link-button" onClick={handleLogout}>Đăng xuất</button>
          )}
        </nav>
      </div>
    </header>
  );
}
