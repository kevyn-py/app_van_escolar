"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui";

/** Error Boundary das rotas autenticadas (Seção 21). */
export default function ErrorPage() {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <div className="max-w-sm rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
        <TriangleAlert className="mx-auto mb-3 size-10 text-amber-600" aria-hidden />
        <h1 className="mb-2 text-xl font-bold">Algo deu errado</h1>
        <p className="mb-5 text-[15px] text-slate-700">Ocorreu um erro inesperado ao exibir esta tela. Seus registros salvos não foram afetados.</p>
        <Button size="lg" className="w-full" onClick={() => window.location.reload()}>
          <RotateCcw className="size-5" aria-hidden />
          Recarregar página
        </Button>
      </div>
    </div>
  );
}
