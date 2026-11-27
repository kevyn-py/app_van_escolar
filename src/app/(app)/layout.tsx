"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { AppDataProvider } from "@/hooks/useAppData";
import { AppShell } from "@/components/AppShell";
import { Spinner } from "@/components/ui";
import { NotConfigured } from "@/components/NotConfigured";

/** AuthGuard: protege as cinco áreas internas (RF-03 / CA-01). */
export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const { user, loading, configured } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (configured && !loading && !user) router.replace("/login");
  }, [configured, loading, user, router]);

  if (!configured) return <NotConfigured />;
  if (loading || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner label="Verificando sessão…" />
      </div>
    );
  }

  return (
    <AppDataProvider>
      <AppShell>{children}</AppShell>
    </AppDataProvider>
  );
}
