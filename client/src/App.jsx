import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';
import Layout from './components/layout/Layout';
import HomePage from './features/home/HomePage';

// Code-split less critical routes
const MenuPage = lazy(() => import('./features/menu/MenuPage'));
const AboutPage = lazy(() => import('./features/about/AboutPage'));
const ContactPage = lazy(() => import('./features/contact/ContactPage'));
const CartPage = lazy(() => import('./features/cart/CartPage'));
const CheckoutPage = lazy(() => import('./features/checkout/CheckoutPage'));
const LoginPage = lazy(() => import('./features/auth/LoginPage'));
const SignupPage = lazy(() => import('./features/auth/SignupPage'));
const ProfilePage = lazy(() => import('./features/account/ProfilePage'));
const AdminDeskPage = lazy(() => import('./features/admin/AdminDeskPage'));
const OrderSuccessPage = lazy(() => import('./features/order/OrderSuccessPage'));
const TrackOrderPage = lazy(() => import('./features/order/TrackOrderPage'));
const NotFoundPage = lazy(() => import('./features/pages/NotFoundPage'));
const PolicyPage = lazy(() => import('./features/pages/PolicyPage'));

// Loading fallback
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-cream-50">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full border-4 border-gold-200 border-t-gold-600 animate-spin" />
        <p className="text-sm text-muted">Loading...</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 2500,
            style: {
              background: '#1B2A63',
              color: '#fff',
              borderRadius: '12px',
              fontSize: '14px',
              padding: '10px 16px',
            },
            success: {
              iconTheme: { primary: '#D4A96A', secondary: '#fff' },
            },
          }}
        />
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="menu" element={<Suspense fallback={<PageLoader />}><MenuPage /></Suspense>} />
            <Route path="about" element={<Suspense fallback={<PageLoader />}><AboutPage /></Suspense>} />
            <Route path="contact" element={<Suspense fallback={<PageLoader />}><ContactPage /></Suspense>} />
            <Route path="cart" element={<Suspense fallback={<PageLoader />}><CartPage /></Suspense>} />
            <Route path="checkout" element={<Suspense fallback={<PageLoader />}><CheckoutPage /></Suspense>} />
            <Route path="login" element={<Suspense fallback={<PageLoader />}><LoginPage /></Suspense>} />
            <Route path="signup" element={<Suspense fallback={<PageLoader />}><SignupPage /></Suspense>} />
            <Route path="account" element={<Suspense fallback={<PageLoader />}><ProfilePage /></Suspense>} />
            {import.meta.env.VITE_ADMIN_PANEL_SLUG && (
              <Route path={import.meta.env.VITE_ADMIN_PANEL_SLUG} element={<Suspense fallback={<PageLoader />}><AdminDeskPage /></Suspense>} />
            )}
            <Route path="order-success" element={<Suspense fallback={<PageLoader />}><OrderSuccessPage /></Suspense>} />
            <Route path="track-order" element={<Suspense fallback={<PageLoader />}><TrackOrderPage /></Suspense>} />
            <Route path="terms" element={<Suspense fallback={<PageLoader />}><PolicyPage type="terms" /></Suspense>} />
            <Route path="privacy" element={<Suspense fallback={<PageLoader />}><PolicyPage type="privacy" /></Suspense>} />
            <Route path="refund-shipping" element={<Suspense fallback={<PageLoader />}><PolicyPage type="refund-shipping" /></Suspense>} />
            <Route path="*" element={<Suspense fallback={<PageLoader />}><NotFoundPage /></Suspense>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </HelmetProvider>
  );
}
