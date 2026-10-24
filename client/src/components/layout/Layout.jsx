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

  const adminSlug = String(import.meta.env.VITE_ADMIN_PANEL_SLUG || '').replace(/^\/+|\/+$/g, '');
  const isShopDesk = Boolean(adminSlug) && (pathname === `/${adminSlug}` || pathname.startsWith(`/${adminSlug}/`));

  return (
    <div className="min-h-screen flex flex-col">
      {!isShopDesk && <Navbar />}
      <main className="flex-1">
        <Outlet />
      </main>
      {!isShopDesk && <Footer />}
      {!isShopDesk && <MobileBar />}
      {!isShopDesk && <CartDrawer />}
      {!isShopDesk && <div className="relative z-10 h-16 bg-cream-50 lg:hidden" />}
    </div>
  );
}
