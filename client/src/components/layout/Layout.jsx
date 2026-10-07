import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import MobileBar from './MobileBar';
import CartDrawer from './CartDrawer';
import { useAuthStore } from '../../store/authStore';

export default function Layout() {
  const { pathname } = useLocation();
  const loadUser = useAuthStore((state) => state.load);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <MobileBar />
      <CartDrawer />
      {/* Spacer for mobile bottom bar */}
      <div className="relative z-10 h-16 bg-cream-50 lg:hidden" />
    </div>
  );
}
