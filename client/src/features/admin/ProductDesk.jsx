import { useEffect, useMemo, useState } from 'react';
import categories from '../../data/categories';
import { api } from '../../lib/api';
import { categoryName } from '../../lib/catalog';

function priceInput(paise) {
  if (!Number.isFinite(paise) || paise <= 0) return '';
  return paise % 100 === 0 ? String(paise / 100) : (paise / 100).toFixed(2);
}

function draftKey(productId, variantId) {
  return `${productId}:${variantId}`;
}

export default function ProductDesk() {
  const [products, setProducts] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState('');
  const [confirm, setConfirm] = useState(null);

  const load = async () => {
    setLoadError('');
    try {
      const data = await api.deskProducts();
      const items = Array.isArray(data.data) ? data.data : [];
      setProducts(items);
      const nextDrafts = {};
      items.forEach((product) => {
        (product.variants || []).forEach((variant) => {
          nextDrafts[draftKey(product._id, variant.variantId)] = priceInput(variant.pricePaise);
        });
      });
      setDrafts(nextDrafts);
    } catch (err) {
      setLoadError(err.message || 'Could not load the menu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...products]
      .filter((product) => {
        if (category && product.category !== category) return false;
        if (!query) return true;
        return (
          product.name.toLowerCase().includes(query)
          || categoryName(product.category).toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        const categoryOrder = categoryName(a.category).localeCompare(categoryName(b.category));
        return categoryOrder || a.name.localeCompare(b.name);
      });
  }, [products, search, category]);

  const savePrice = async (product, variant) => {
    const key = draftKey(product._id, variant.variantId);
    const rupees = Number(drafts[key]);
    if (!Number.isFinite(rupees) || rupees <= 0) {
      setNotice('');
      setLoadError('Enter a price greater than 0.');
      return;
    }
    const pricePaise = Math.round(rupees * 100);
    setSavingKey(key);
    setNotice('');
    setLoadError('');
    try {
      const data = await api.deskUpdatePrice(product._id, variant.variantId, pricePaise);
      const updated = data.data;
      setProducts((current) => current.map((item) => (item._id === product._id ? updated : item)));
      setDrafts((current) => ({ ...current, [key]: priceInput(pricePaise) }));
      setNotice(`${product.name} is now ₹${priceInput(pricePaise)}.`);
    } catch (err) {
      setLoadError(err.message || 'Could not save that price');
    } finally {
      setSavingKey('');
    }
  };

  const removeProduct = async () => {
    if (!confirm) return;
    setSavingKey(confirm.productId);
    setNotice('');
    setLoadError('');
    try {
      await api.deskRemoveProduct(confirm.productId);
      setProducts((current) => current.filter((item) => item._id !== confirm.productId));
      setNotice(`${confirm.name} removed from the menu.`);
      setConfirm(null);
    } catch (err) {
      setLoadError(err.message || 'Could not remove that product');
      setConfirm(null);
    } finally {
      setSavingKey('');
    }
  };

  return (
    <>
      <p className="mb-4 text-sm text-muted">
        Change a price or remove a dish. The menu and checkout both use the price you save here.
      </p>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search dishes"
          className="w-full rounded-2xl border border-cream-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
        />
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="rounded-2xl border border-cream-200 bg-white px-4 py-2.5 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-gold-400 sm:w-64"
        >
          <option value="">All categories</option>
          {categories.map((item) => (
            <option key={item._id} value={item._id}>{item.name}</option>
          ))}
        </select>
      </div>
      {notice && <p className="mb-4 text-sm text-emerald-800">{notice}</p>}
      {loadError && <p className="mb-4 text-sm text-red-700">{loadError}</p>}
      {loading ? (
        <p className="text-sm text-muted">Loading menu…</p>
      ) : (
        <div className="space-y-3">
          {visible.map((product) => (
            <article key={product._id} className="rounded-3xl border border-cream-100 bg-white p-4 shadow-card sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-600">
                    {categoryName(product.category)}
                  </p>
                  <h2 className="font-heading text-xl font-bold text-navy-900">{product.name}</h2>
                  {!product.isActive && (
                    <p className="mt-1 text-xs text-muted">No fixed price yet. Set one to put it on sale.</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setConfirm({ productId: product._id, name: product.name })}
                  className="cursor-pointer rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700"
                >
                  Remove
                </button>
              </div>
              <div className="mt-4 space-y-2">
                {(product.variants || []).map((variant) => {
                  const key = draftKey(product._id, variant.variantId);
                  const busy = savingKey === key;
                  return (
                    <form
                      key={variant.variantId}
                      className="flex flex-wrap items-center gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        savePrice(product, variant);
                      }}
                    >
                      {(product.variants || []).length > 1 && (
                        <span className="w-24 text-sm text-navy-800">{variant.name}</span>
                      )}
                      <label className="flex items-center rounded-xl border border-cream-200 bg-cream-50 px-3">
                        <span className="text-sm font-semibold text-navy-900">₹</span>
                        <input
                          inputMode="decimal"
                          aria-label={`Price for ${product.name}${variant.name ? `, ${variant.name}` : ''}`}
                          value={drafts[key] ?? ''}
                          placeholder="Price"
                          onChange={(event) => setDrafts((current) => ({ ...current, [key]: event.target.value }))}
                          className="w-24 bg-transparent px-2 py-2 text-sm font-semibold text-navy-900 focus:outline-none"
                        />
                      </label>
                      <button
                        type="submit"
                        disabled={busy}
                        className="cursor-pointer rounded-full bg-navy-900 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {busy ? 'Saving…' : 'Save price'}
                      </button>
                    </form>
                  );
                })}
              </div>
            </article>
          ))}
          {visible.length === 0 && (
            <p className="text-sm text-muted">{products.length === 0 ? 'No products yet.' : 'No dishes match that search.'}</p>
          )}
        </div>
      )}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 px-4" onClick={() => !savingKey && setConfirm(null)}>
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-card" onClick={(event) => event.stopPropagation()}>
            <h2 className="font-heading text-2xl font-bold text-navy-900">Remove this product?</h2>
            <p className="mt-2 text-sm text-muted">{confirm.name} will disappear from the menu. Past orders stay as they are.</p>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                disabled={Boolean(savingKey)}
                onClick={() => setConfirm(null)}
                className="flex-1 cursor-pointer rounded-full border border-navy-900/15 py-2.5 text-sm font-semibold text-navy-900 disabled:cursor-not-allowed"
              >
                Keep it
              </button>
              <button
                type="button"
                disabled={Boolean(savingKey)}
                onClick={removeProduct}
                className="flex-1 cursor-pointer rounded-full bg-red-700 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingKey ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
