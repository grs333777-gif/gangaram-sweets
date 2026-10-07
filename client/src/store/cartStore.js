import { create } from 'zustand';
import toast from 'react-hot-toast';

const CART_KEY = 'gangaram-cart';

function savedItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item && (item.productId || item.id) && item.name && Number(item.quantity) > 0)
    .map((item) => ({
      productId: item.productId || item.id,
      name: item.name,
      image: item.image || '',
      weight: item.weight || 'Plate',
      price: item.price ?? null,
      quantity: Number(item.quantity),
      isVeg: item.isVeg !== false,
    }));
}

function readCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed) ? parsed : parsed?.state?.items || parsed?.items;
    return savedItems(items);
  } catch {
    return [];
  }
}

function writeCart(items) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(savedItems(items)));
  } catch {
    // Storage can be unavailable in private mode. The cart still works for this visit.
  }
}

const useCartStore = create((set, get) => ({
      items: readCart(),
      isCartOpen: false,

      // ─── Derived ───
      get totalItems() {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      getTotalItems: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );
      },

      // ─── Actions ───
      addToCart: (product, variant, quantity = 1) => {
        set((state) => {
          const existingIndex = state.items.findIndex(
            (item) =>
              item.productId === product._id && item.weight === variant.weight
          );

          if (existingIndex > -1) {
            const updatedItems = state.items.map((item, index) =>
              index === existingIndex ? { ...item, quantity: item.quantity + quantity } : item,
            );
            toast.success(`Updated ${product.name} quantity`);
            return { items: updatedItems };
          }

          toast.success(`${product.name} added to cart!`);
          return {
            items: [
              ...state.items,
              {
                productId: product._id,
                name: product.name,
                image: Array.isArray(product.images) ? product.images[0] : product.image,
                weight: variant.weight,
                price: variant.price,
                quantity,
                isVeg: product.isVeg,
              },
            ],
          };
        });
      },

      removeFromCart: (productId, weight) => {
        set((state) => ({
          items: state.items.filter(
            (item) =>
              !(item.productId === productId && item.weight === weight)
          ),
        }));
        toast.success('Removed from cart');
      },

      updateQuantity: (productId, weight, quantity) => {
        if (quantity < 1) return;
        set((state) => ({
          items: state.items.map((item) =>
            item.productId === productId && item.weight === weight
              ? { ...item, quantity }
              : item
          ),
        }));
      },

      clearCart: () => {
        set({ items: [] });
        toast.success('Cart cleared');
      },

      toggleCart: () => {
        set((state) => ({ isCartOpen: !state.isCartOpen }));
      },

      openCart: () => set({ isCartOpen: true }),
      closeCart: () => set({ isCartOpen: false }),
}));

useCartStore.subscribe((state, previous) => {
  if (state.items !== previous.items) writeCart(state.items);
});

export default useCartStore;
