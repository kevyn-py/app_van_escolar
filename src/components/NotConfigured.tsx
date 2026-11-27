import { TriangleAlert } from "lucide-react";

export function NotConfigured() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="max-w-md rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
        <TriangleAlert className="mx-auto mb-3 size-10 text-amber-600" aria-hidden />
        <h1 className="mb-2 text-xl font-bold">Configuração pendente</h1>
        <p className="text-[15px] text-slate-700">
          As variáveis de ambiente do Firebase não foram definidas. Configure as chaves <code>NEXT_PUBLIC_FIREBASE_*</code> na
          Vercel (ou em <code>.env.local</code>) e publique novamente.
        </p>
      </div>
    </div>
  );
}
