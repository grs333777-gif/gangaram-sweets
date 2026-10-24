import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { toMenuProduct } from '../lib/catalog';

export function useLiveMenu(fallback) {
  const [products, setProducts] = useState(fallback);

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      api.catalog()
        .then((data) => {
          if (cancelled || !Array.isArray(data.data) || data.data.length === 0) return;
          setProducts(data.data.map(toMenuProduct));
        })
        .catch(() => {
          if (!cancelled) setProducts(fallback);
        });
    };

    load();
    const onShow = () => {
      if (document.visibilityState === 'visible') load();
    };
    window.addEventListener('focus', load);
    document.addEventListener('visibilitychange', onShow);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', load);
      document.removeEventListener('visibilitychange', onShow);
    };
  }, [fallback]);

  return products;
}
