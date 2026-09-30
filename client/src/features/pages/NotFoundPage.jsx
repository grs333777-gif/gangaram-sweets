import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft } from 'lucide-react';
import brand from '../../config/brand.config';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <p className="text-8xl mb-4">🍬</p>
        <h1 className="font-heading text-5xl font-bold text-navy-900 mb-2">404</h1>
        <p className="font-heading text-xl text-navy-700 mb-2">Page Not Found</p>
        <p className="text-muted mb-8">
          Oops! This page seems to have melted away like a hot gulab jamun.
          Let&apos;s get you back on track.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="btn-gold-shimmer inline-flex items-center justify-center gap-2 text-white font-semibold px-6 py-2.5 rounded-xl text-sm"
          >
            <Home size={16} />
            Go Home
          </Link>
          <Link
            to="/menu"
            className="inline-flex items-center justify-center gap-2 text-navy-900 font-medium px-6 py-2.5 rounded-xl text-sm border border-cream-200 hover:bg-cream-100 transition-colors"
          >
            <ArrowLeft size={16} />
            Browse Menu
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
