"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Bus, History, House, ListChecks, Settings, TriangleAlert, Users, WifiOff, type LucideIcon } from "lucide-react";
import { useOnline } from "@/hooks/useOnline";
import { useAppData } from "@/hooks/useAppData";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Início", icon: House },
  { href: "/eventos", label: "Eventos", icon: ListChecks },
  { href: "/alunos", label: "Alunos", icon: Users },
  { href: "/historico", label: "Histórico", icon: History },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const online = useOnline();
  const { loadError } = useAppData();

  return (
    <div className="min-h-dvh md:pl-64">
      {/* Sidebar: tablet/desktop (≥768px) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex size-10 items-center justify-center rounded-xl bg-blue-700 text-white">
            <Bus className="size-6" aria-hidden />
          </span>
          <div className="leading-tight">
            <p className="font-bold text-slate-900">Van Escolar</p>
            <p className="text-xs text-slate-600">Embarque e desembarque</p>
          </div>
        </div>
        <nav aria-label="Navegação principal" className="flex flex-col gap-1 px-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold transition-colors ${
                  active ? "bg-blue-700 text-white" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Icon className="size-5" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {(!online || loadError) && (
        <div role="alert" className="flex items-center gap-2 bg-red-700 px-4 py-2.5 text-sm font-semibold text-white">
          {!online ? <WifiOff className="size-4 shrink-0" aria-hidden /> : <TriangleAlert className="size-4 shrink-0" aria-hidden />}
          {!online ? "Sem conexão com a internet. Verifique seu sinal para registrar eventos." : loadError}
        </div>
      )}

      <main className="mx-auto w-full max-w-5xl px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4 md:px-8 md:pb-10 md:pt-8">
        {children}
      </main>

      {/* Bottom navigation: celular (<768px) */}
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="grid grid-cols-5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-16 flex-col items-center justify-center gap-1 px-0.5 text-[10.5px] font-semibold leading-none tracking-tight ${
                    active ? "text-blue-700" : "text-slate-600"
                  }`}
                >
                  <span className={`flex h-8 w-12 items-center justify-center rounded-full ${active ? "bg-blue-100" : ""}`}>
                    <Icon className="size-5.5" strokeWidth={active ? 2.5 : 2} aria-hidden />
                  </span>
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
