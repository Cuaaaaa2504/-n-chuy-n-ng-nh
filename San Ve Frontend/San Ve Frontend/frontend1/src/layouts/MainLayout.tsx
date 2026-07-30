import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function MainLayout() {
  return (
    <div className="stitch-app min-h-screen flex flex-col">
      <Navbar />
      <main className="stitch-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
