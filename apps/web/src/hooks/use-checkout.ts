"use client";

import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { api, call, errorMessage } from "@/lib/api";
import { useSession } from "@/lib/auth-client";

/**
 * Inicia el checkout. Si el total es 0 (curso gratis o cupón del 100 %) la API
 * matricula directamente; si no, devuelve la URL de Stripe Checkout.
 */
export function useCheckout() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [pending, setPending] = useState(false);

  const checkout = async (input: { courseId?: string; couponCode?: string }) => {
    if (!session) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    setPending(true);
    try {
      const result = await call(api.checkout.$post({ json: input }));
      if (result.type === "redirect" && result.url) {
        window.location.assign(result.url);
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["library"] }),
        queryClient.invalidateQueries({ queryKey: ["cart"] }),
      ]);
      toast.success("¡Listo! Ya tienes acceso al curso.");
      const [slug] = result.courseSlugs;
      router.push(result.courseSlugs.length === 1 && slug ? `/aprender/${slug}` : "/mis-cursos");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  };

  return { checkout, pending };
}
