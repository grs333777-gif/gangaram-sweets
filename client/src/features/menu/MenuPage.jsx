import { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Search, SlidersHorizontal, X, Plus, Minus, Eye } from 'lucide-react';
import brand from '../../config/brand.config';
import products from '../../data/products';
import categories from '../../data/categories';
import useCartStore from '../../store/cartStore';
import { useDebounce } from '../../hooks/useScrollAnimation';

export default function MenuPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('popularity');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    veg: false,
    bestseller: false,
    sugarFree: false,
    priceRange: 'all',
  });
  const [selectedProduct, setSelectedProduct] = useState(null);

  const debouncedSearch = useDebounce(search, 300);
  const activeCategory = searchParams.get('category') || 'all';
  const addToCart = useCartStore((s) => s.addToCart);

  // Filtered & sorted products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Category
    if (activeCategory !== 'all') {
      const cat = categories.find((c) => c.slug === activeCategory);
      if (cat) result = result.filter((p) => p.category === cat._id);
    }

    // Search
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.categoryName.toLowerCase().includes(q)
      );
    }

    // Filters
    if (filters.veg) result = result.filter((p) => p.isVeg);
    if (filters.bestseller) result = result.filter((p) => p.isBestseller);
    if (filters.sugarFree) result = result.filter((p) => p.tags?.includes('sugar-free'));
    if (filters.priceRange === 'under200') result = result.filter((p) => p.variants[0].price < 200);
    if (filters.priceRange === '200to500') result = result.filter((p) => p.variants[0].price >= 200 && p.variants[0].price <= 500);
    if (filters.priceRange === 'above500') result = result.filter((p) => p.variants[0].price > 500);

    // Sort
    if (sortBy === 'priceLow') result.sort((a, b) => a.variants[0].price - b.variants[0].price);
    if (sortBy === 'priceHigh') result.sort((a, b) => b.variants[0].price - a.variants[0].price);
    if (sortBy === 'name') result.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === 'popularity') result.sort((a, b) => (b.isBestseller ? 1 : 0) - (a.isBestseller ? 1 : 0));

    return result;
  }, [activeCategory, debouncedSearch, filters, sortBy]);

  const setCategory = (slug) => {
    if (slug === 'all') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', slug);
    }
    setSearchParams(searchParams);
  };

  return (
    <>
      <Helmet>
        <title>Menu — {brand.name} | Order Sweets Online</title>
        <meta name="description" content={`Browse our menu of ${products.length}+ authentic sweets, namkeen & snacks. Order online from ${brand.name}, ${brand.city}.`} />
      </Helmet>

      {/* Header */}
      <div className="bg-cream-50 px-4 pb-6 pt-28 text-center sm:px-6">
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.32em] text-gold-600">
          Gangaram
        </p>
        <h1 className="font-heading text-5xl text-navy-900 sm:text-6xl">
          Our Menu
        </h1>
        <p className="mt-3 text-sm font-light text-muted">
          Handcrafted with pure desi ghee
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category tabs – sticky */}
        <div className="sticky top-20 z-30 bg-cream-50 pt-2 pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
            <button
              onClick={() => setCategory('all')}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                activeCategory === 'all'
                  ? 'bg-navy-900 text-white'
                  : 'bg-white text-muted hover:bg-cream-100 border border-cream-200'
              }`}
            >
              All ({products.length})
            </button>
            {categories.map((cat) => {
              const count = products.filter((p) => p.category === cat._id).length;
              return (
                <button
                  key={cat._id}
                  onClick={() => setCategory(cat.slug)}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    activeCategory === cat.slug
                      ? 'bg-navy-900 text-white'
                      : 'bg-white text-muted hover:bg-cream-100 border border-cream-200'
                  }`}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Search & controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="search"
              placeholder="Search sweets, namkeen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-cream-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-transparent"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-navy-900"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-cream-200 bg-white text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-gold-400"
          >
            <option value="popularity">Sort: Popular</option>
            <option value="priceLow">Price: Low to High</option>
            <option value="priceHigh">Price: High to Low</option>
            <option value="name">Name: A-Z</option>
          </select>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
              showFilters ? 'bg-navy-900 text-white border-navy-900' : 'bg-white text-muted border-cream-200 hover:bg-cream-100'
            }`}
          >
            <SlidersHorizontal size={16} />
            Filters
          </button>
        </div>

        {/* Filter panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-6"
            >
              <div className="bg-white rounded-2xl border border-cream-200 p-4 flex flex-wrap gap-3">
                <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-cream-200 text-sm cursor-pointer hover:bg-cream-50">
                  <input type="checkbox" checked={filters.veg} onChange={(e) => setFilters({ ...filters, veg: e.target.checked })} className="accent-success" />
                  <span className="veg-badge scale-75" /> Veg Only
                </label>
                <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-cream-200 text-sm cursor-pointer hover:bg-cream-50">
                  <input type="checkbox" checked={filters.bestseller} onChange={(e) => setFilters({ ...filters, bestseller: e.target.checked })} className="accent-magenta-500" />
                  ★ Bestsellers
                </label>
                <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-cream-200 text-sm cursor-pointer hover:bg-cream-50">
                  <input type="checkbox" checked={filters.sugarFree} onChange={(e) => setFilters({ ...filters, sugarFree: e.target.checked })} className="accent-gold-600" />
                  Sugar Free
                </label>
                <select
                  value={filters.priceRange}
                  onChange={(e) => setFilters({ ...filters, priceRange: e.target.value })}
                  className="px-3 py-1.5 rounded-lg border border-cream-200 text-sm bg-white"
                >
                  <option value="all">All Prices</option>
                  <option value="under200">Under ₹200</option>
                  <option value="200to500">₹200 – ₹500</option>
                  <option value="above500">Above ₹500</option>
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results count */}
        <p className="text-sm text-muted mb-4">
          Showing {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'}
          {activeCategory !== 'all' && ` in ${categories.find((c) => c.slug === activeCategory)?.name || activeCategory}`}
        </p>

        {/* Product Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-6xl mb-4">🍬</p>
            <h3 className="font-heading text-xl font-semibold text-navy-900 mb-2">
              No items found
            </h3>
            <p className="text-muted text-sm">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {filteredProducts.map((product, i) => (
              <ProductCard
                key={product._id}
                product={product}
                index={i}
                onQuickView={() => setSelectedProduct(product)}
                onAddToCart={(variant) => addToCart(product, variant)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Quick View Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <ProductModal
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ─── Product Card ─── */
function ProductCard({ product, index, onQuickView, onAddToCart }) {
  const [selectedVariant, setSelectedVariant] = useState(0);
  const variant = product.variants[selectedVariant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
      className="group bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden border border-cream-100"
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden">
        <img
          src={product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          decoding="async"
          width="300"
          height="300"
        />
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.isBestseller && (
            <span className="bg-white/95 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-navy-900">
              Bestseller
            </span>
          )}
        </div>
        {product.isVeg && (
          <span className="absolute top-2 right-2 veg-badge bg-white" />
        )}
        {/* Quick view overlay */}
        <button
          onClick={onQuickView}
          className="absolute inset-0 bg-navy-900/0 group-hover:bg-navy-900/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
          aria-label={`Quick view ${product.name}`}
        >
          <span className="bg-white text-navy-900 text-xs font-medium px-3 py-1.5 rounded-lg shadow-md flex items-center gap-1">
            <Eye size={14} /> Quick View
          </span>
        </button>
      </div>

      {/* Info */}
      <div className="p-3 sm:p-4">
        <p className="text-[11px] text-gold-600 font-medium mb-0.5">{product.categoryName}</p>
        <h3 className="font-heading text-sm sm:text-base font-bold text-navy-900 mb-1 truncate">
          {product.name}
        </h3>
        <p className="text-xs text-muted line-clamp-2 mb-2.5 leading-relaxed hidden sm:block">
          {product.description}
        </p>

        {/* Variant selector */}
        {product.variants.length > 1 && (
          <div className="flex flex-wrap gap-1 mb-2.5">
            {product.variants.map((v, vi) => (
              <button
                key={vi}
                onClick={() => setSelectedVariant(vi)}
                className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors ${
                  selectedVariant === vi
                    ? 'bg-navy-900 text-white border-navy-900'
                    : 'border-cream-200 text-muted hover:border-navy-300'
                }`}
              >
                {v.weight}
              </button>
            ))}
          </div>
        )}

        {/* Price + Add */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-base sm:text-lg font-bold text-navy-900">
              ₹{variant.price}
            </span>
            <span className="text-[10px] text-muted ml-1 hidden sm:inline">
              / {variant.weight}
            </span>
          </div>
          <button
            onClick={() => onAddToCart(variant)}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-navy-900 text-white flex items-center justify-center hover:bg-gold-600 transition-colors duration-200"
            aria-label={`Add ${product.name} to cart`}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Product Quick View Modal ─── */
function ProductModal({ product, onClose }) {
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const addToCart = useCartStore((s) => s.addToCart);
  const variant = product.variants[selectedVariant];

  const handleAdd = () => {
    addToCart(product, variant, quantity);
    onClose();
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-50"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-2xl sm:w-full bg-white rounded-2xl z-50 overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-navy-900 hover:bg-cream-100 transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col sm:flex-row overflow-y-auto">
          {/* Image */}
          <div className="sm:w-1/2 aspect-square sm:aspect-auto sm:min-h-[400px] relative shrink-0">
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover"
              width="400"
              height="400"
            />
            {product.isBestseller && (
              <span className="absolute top-3 left-3 bg-magenta-500 text-white text-xs font-bold px-3 py-1 rounded-lg">
                ★ Bestseller
              </span>
            )}
          </div>

          {/* Details */}
          <div className="sm:w-1/2 p-5 sm:p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-gold-600 font-medium">{product.categoryName}</span>
              {product.isVeg && <span className="veg-badge scale-75" />}
            </div>

            <h2 className="font-heading text-xl sm:text-2xl font-bold text-navy-900 mb-2">
              {product.name}
            </h2>

            <p className="text-sm text-muted leading-relaxed mb-4">
              {product.description}
            </p>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
              {product.ingredients && (
                <div className="col-span-2">
                  <span className="font-semibold text-navy-900">Ingredients: </span>
                  <span className="text-muted">{product.ingredients}</span>
                </div>
              )}
              {product.shelfLife && (
                <div>
                  <span className="font-semibold text-navy-900">Shelf Life: </span>
                  <span className="text-muted">{product.shelfLife}</span>
                </div>
              )}
            </div>

            {/* Variants */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-navy-900 mb-2">Select Size</p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v, vi) => (
                  <button
                    key={vi}
                    onClick={() => setSelectedVariant(vi)}
                    className={`text-sm px-4 py-2 rounded-xl border transition-colors ${
                      selectedVariant === vi
                        ? 'bg-navy-900 text-white border-navy-900'
                        : 'border-cream-200 text-muted hover:border-navy-300'
                    }`}
                  >
                    {v.weight} — ₹{v.price}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity + Price */}
            <div className="mt-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 bg-cream-50 rounded-xl border border-cream-200 p-1">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white transition-colors" aria-label="Decrease quantity">
                    <Minus size={16} />
                  </button>
                  <span className="w-8 text-center font-semibold text-navy-900">{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white transition-colors" aria-label="Increase quantity">
                    <Plus size={16} />
                  </button>
                </div>
                <p className="text-2xl font-bold text-navy-900">
                  ₹{(variant.price * quantity).toLocaleString('en-IN')}
                </p>
              </div>
              <button
                onClick={handleAdd}
                className="btn-gold-shimmer w-full flex items-center justify-center gap-2 text-white font-semibold py-3 rounded-xl"
              >
                <Plus size={18} />
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
