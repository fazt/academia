"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { api, call, errorMessage } from "@/lib/api";
import { useSession } from "@/lib/auth-client";

export type CartSummary = InferResponseType<typeof api.cart.$get, 200>;
export type CartItem = CartSummary["items"][number];

const GUEST_KEY = "academia:cart";

/* Carrito de invitado en localStorage, expuesto como store externo (useSyncExternalStore). */

const listeners = new Set<() => void>();

function subscribeGuestCart(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function guestCartSnapshot() {
  try {
    return localStorage.getItem(GUEST_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

const serverSnapshot = () => "[]";

function parseGuestCart(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeGuestCart(ids: string[]) {
  try {
    if (ids.length) localStorage.setItem(GUEST_KEY, JSON.stringify(ids));
    else localStorage.removeItem(GUEST_KEY);
  } catch {
    // Modo privado o almacenamiento bloqueado: el carrito de invitado no persiste.
  }
  for (const listener of listeners) listener();
}

interface CartContextValue {
  isGuest: boolean;
  isLoading: boolean;
  summary: CartSummary | null;
  count: number;
  has: (courseId: string) => boolean;
  add: (courseId: string) => Promise<boolean>;
  remove: (courseId: string) => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { data: session, isPending: sessionPending } = useSession();
  const userId = session?.user.id;
  const guestRaw = useSyncExternalStore(subscribeGuestCart, guestCartSnapshot, serverSnapshot);
  const guestIds = useMemo(() => parseGuestCart(guestRaw), [guestRaw]);
  const merging = useRef(false);

  const serverCart = useQuery({
    queryKey: ["cart", userId],
    queryFn: () => call(api.cart.$get()),
    enabled: !!userId,
  });

  const guestCart = useQuery({
    queryKey: ["guest-cart", guestIds],
    queryFn: async (): Promise<CartSummary> => {
      const { items } = await call(api.courses["by-ids"].$get({ query: { ids: guestIds.join(",") } }));
      const ordered = guestIds
        .map((id) => items.find((i) => i.id === id))
        .filter((i): i is (typeof items)[number] => !!i && i.priceCents > 0);
      const subtotal = ordered.reduce((sum, i) => sum + i.priceCents, 0);
      return {
        items: ordered.map((i) => ({ ...i, discountCents: 0, totalCents: i.priceCents })),
        subtotalCents: subtotal,
        discountCents: 0,
        totalCents: subtotal,
        couponCode: null,
        currency: ordered[0]?.currency ?? "USD",
      };
    },
    enabled: !userId && !sessionPending && guestIds.length > 0,
  });

  // Al iniciar sesión, el carrito de invitado se fusiona con el del servidor.
  useEffect(() => {
    if (!userId || merging.current) return;
    const ids = parseGuestCart(guestCartSnapshot());
    if (!ids.length) return;
    merging.current = true;
    call(api.cart.merge.$post({ json: { courseIds: ids } }))
      .then((summary) => {
        queryClient.setQueryData(["cart", userId], summary);
        writeGuestCart([]);
      })
      .catch(() => undefined)
      .finally(() => {
        merging.current = false;
      });
  }, [userId, queryClient]);

  const setServerCart = useCallback(
    (summary: CartSummary) => {
      queryClient.setQueryData(["cart", userId], summary);
      void queryClient.invalidateQueries({ queryKey: ["library"] });
    },
    [queryClient, userId],
  );

  const add = useCallback(
    async (courseId: string) => {
      if (userId) {
        try {
          setServerCart(await call(api.cart.$post({ json: { courseId } })));
          return true;
        } catch (error) {
          toast.error(errorMessage(error));
          return false;
        }
      }
      writeGuestCart([...new Set([...guestIds, courseId])]);
      return true;
    },
    [userId, guestIds, setServerCart],
  );

  const remove = useCallback(
    async (courseId: string) => {
      if (userId) {
        try {
          setServerCart(await call(api.cart[":courseId"].$delete({ param: { courseId } })));
        } catch (error) {
          toast.error(errorMessage(error));
        }
        return;
      }
      writeGuestCart(guestIds.filter((id) => id !== courseId));
    },
    [userId, guestIds, setServerCart],
  );

  const value = useMemo<CartContextValue>(() => {
    const summary = userId ? (serverCart.data ?? null) : guestIds.length ? (guestCart.data ?? null) : null;
    const ids = userId ? (serverCart.data?.items.map((i) => i.id) ?? []) : guestIds;
    return {
      isGuest: !userId,
      isLoading: sessionPending || (userId ? serverCart.isLoading : guestCart.isLoading),
      summary,
      count: ids.length,
      has: (courseId) => ids.includes(courseId),
      add,
      remove,
    };
  }, [userId, sessionPending, serverCart.data, serverCart.isLoading, guestCart.data, guestCart.isLoading, guestIds, add, remove]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
}
