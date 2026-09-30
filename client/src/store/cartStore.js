import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import toast from 'react-hot-toast';

/**
 * Cart Store – Zustand with localStorage persistence
 * Handles: add, remove, update quantity, clear, selected variant tracking
 */
const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
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
            const updatedItems = [...state.items];
            updatedItems[existingIndex].quantity += quantity;
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
                image: product.images[0],
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
    }),
    {
      name: 'gangaram-cart',
      partialize: (state) => ({ items: state.items }),
    }
  )
);

export default useCartStore;
