'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { cartApi } from '@/lib/api';
import type { CartView } from '@/lib/types';
import { MUTATION_EVENT, notifyError, type MutationEvent } from '@/lib/feedback';

const empty: CartView = { items: [], subtotal: 0 };
const CartContext = createContext({ cart: empty, quantity: 0, refresh: async () => {} });
export const useCart = () => useContext(CartContext);
export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartView>(empty);
  const version = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++version.current;
    if (user?.role !== 'User') { setCart(empty); return; }
    try {
      const next = await cartApi.getCart();
      if (request === version.current) setCart(next);
    } catch (error) { if (request === version.current) notifyError(error); }
  }, [user]);
  useEffect(() => { const requests = version; void refresh(); return () => { ++requests.current; }; }, [refresh]);
  useEffect(() => {
    const onMutation = (event: Event) => {
      if (user?.role !== 'User') return;
      const { endpoint, result } = (event as CustomEvent<MutationEvent>).detail;
      if (endpoint.startsWith('/api/cart/items')) setCart(result as CartView);
      else if (endpoint === '/api/orders') setCart(empty);
      else return;
      void refresh();
    };
    window.addEventListener(MUTATION_EVENT, onMutation);
    return () => window.removeEventListener(MUTATION_EVENT, onMutation);
  }, [refresh, user]);
  const visible = user?.role === 'User' ? cart : empty;
  return <CartContext.Provider value={{ cart: visible, quantity: visible.items.reduce((sum, item) => sum + item.quantity, 0), refresh }}>{children}</CartContext.Provider>;
}
