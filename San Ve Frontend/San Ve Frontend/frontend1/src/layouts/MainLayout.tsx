import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function MainLayout() {
  return (
    <div className="relative min-h-screen flex flex-col bg-background text-on-surface font-body-md text-body-md">
      {/* Ánh neon nền — thuần trang trí */}
      <div
        aria-hidden
        className="pointer-events-none fixed top-[-15%] left-[-10%] w-[45%] h-[45%] bg-primary rounded-full mix-blend-screen blur-[120px] opacity-[0.12]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed bottom-[-15%] right-[-10%] w-[45%] h-[45%] bg-secondary rounded-full mix-blend-screen blur-[120px] opacity-[0.12]"
      />

      <Navbar />
      <main className="flex-1 relative z-10">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
