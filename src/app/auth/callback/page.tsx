"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.exchangeCodeForSession(window.location.href).then(({ data, error }) => {
      if (error || !data.session) {
        console.error("Auth callback error:", error?.message);
        router.replace("/login");
        return;
      }

      // Session is set — wait for auth state to propagate then redirect
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_IN") {
          subscription.unsubscribe();
          router.replace("/");
        }
      });

      // Fallback: redirect after 1s even if event doesn't fire
      setTimeout(() => {
        subscription.unsubscribe();
        router.replace("/");
      }, 1000);
    });
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <p className="text-sm text-zinc-500">Signing you in…</p>
    </div>
  );
}
