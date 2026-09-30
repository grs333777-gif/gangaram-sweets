import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import MobileBar from './MobileBar';
import CartDrawer from './CartDrawer';

export default function Layout() {
  const { pathname } = useLocation();

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
      <div className="h-16 lg:hidden" />
    </div>
  );
}
