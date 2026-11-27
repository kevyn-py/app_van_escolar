"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAppData } from "@/hooks/useAppData";
import { useToast } from "@/hooks/useToast";
import type { SortPreference } from "@/domain/types";
import { updateDisplayName, updateSortPreference } from "@/services/userService";
import { Button, Card, ConfirmDialog, PageHeader, TextField } from "@/components/ui";

const SORT_OPTIONS: { value: SortPreference; label: string; hint: string }[] = [
  { value: "pending_first", label: "Pendentes no topo", hint: "Quem falta conferir aparece primeiro." },
  { value: "alphabetical", label: "Ordem alfabética", hint: "Lista sempre em ordem de nome." },
];

export default function ConfiguracoesPage() {
  const { user, signOut, refreshUser } = useAuth();
  const { uid, profile } = useAppData();
  const toast = useToast();
  const router = useRouter();

  const [name, setName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const currentName = profile?.displayName ?? user?.displayName ?? "";
  const value = name ?? currentName;
  const nameError = value.trim().length < 2 ? "Informe pelo menos 2 caracteres." : value.trim().length > 60 ? "Máximo de 60 caracteres." : null;
  const sort = profile?.preferences.defaultEventSort ?? "pending_first";

  async function saveName(e: FormEvent) {
    e.preventDefault();
    if (!user || nameError) return;
    setSaving(true);
    try {
      await updateDisplayName(user, value);
      refreshUser();
      setName(null);
      toast.show({ tone: "success", message: "Nome atualizado." });
    } catch {
      toast.show({ tone: "error", message: "Não foi possível salvar o nome. Tente novamente." });
    } finally {
      setSaving(false);
    }
  }

  async function changeSort(next: SortPreference) {
    try {
      await updateSortPreference(uid, next);
    } catch {
      toast.show({ tone: "error", message: "Não foi possível salvar a preferência." });
    }
  }

  async function logout() {
    setLeaving(true);
    try {
      await signOut();
      router.replace("/login");
    } catch {
      setLeaving(false);
      toast.show({ tone: "error", message: "Não foi possível encerrar a sessão. Tente novamente." });
    }
  }

  return (
    <>
      <PageHeader title="Configurações" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-lg font-bold">Conta</h2>
          <form onSubmit={saveName} className="flex flex-col gap-4">
            <TextField label="E-mail" value={user?.email ?? ""} readOnly disabled hint="O e-mail não pode ser alterado aqui." />
            <TextField
              label="Nome de exibição"
              value={value}
              maxLength={60}
              autoComplete="name"
              onChange={(e) => setName(e.target.value)}
              error={name !== null ? nameError : null}
            />
            <Button type="submit" loading={saving} disabled={name === null || value.trim() === currentName || Boolean(nameError)}>
              Salvar
            </Button>
          </form>
        </Card>

        <Card>
          <h2 className="mb-1 text-lg font-bold">Preferências</h2>
          <p className="mb-3 text-sm text-slate-600">Ordenação padrão da lista em Controle dos Eventos.</p>
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="Ordenação padrão">
            {SORT_OPTIONS.map((o) => (
              <label
                key={o.value}
                className={`flex min-h-13 cursor-pointer items-center gap-3 rounded-xl px-4 py-2 ring-1 ring-inset ${
                  sort === o.value ? "bg-blue-50 ring-2 ring-blue-700" : "bg-white ring-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="sort"
                  checked={sort === o.value}
                  onChange={() => changeSort(o.value)}
                  className="size-5 accent-blue-700"
                />
                <span>
                  <span className="block font-semibold">{o.label}</span>
                  <span className="block text-sm text-slate-600">{o.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-bold">
            <ShieldCheck className="size-5 text-emerald-700" aria-hidden /> Privacidade e LGPD
          </h2>
          <ul className="list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-slate-700">
            <li>O aplicativo armazena apenas dados mínimos: nome operacional do aluno, avatar ilustrativo, perfil de trajeto e os registros de embarque e desembarque.</li>
            <li>Não são coletadas fotos, documentos, endereços, telefones, nome de escola nem localização.</li>
            <li>Os dados são usados exclusivamente para a segurança do transporte e só podem ser acessados pela sua conta.</li>
            <li>
              Como responsável pelo tratamento perante as famílias, informe os pais ou responsáveis legais e obtenha a ciência e o consentimento deles
              para o controle digital de presença (LGPD, Art. 14, §1º). A exclusão do cadastro de um aluno pode ser feita a qualquer momento.
            </li>
          </ul>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-1 text-lg font-bold">Sessão</h2>
          <p className="mb-3 text-sm text-slate-600">Encerre a sessão ao terminar de usar um dispositivo compartilhado.</p>
          <Button variant="danger" size="lg" className="w-full sm:w-auto" onClick={() => setConfirmLogout(true)}>
            <LogOut className="size-5" aria-hidden /> Encerrar sessão
          </Button>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmLogout}
        title="Sair da conta?"
        description="Você precisará entrar novamente com e-mail e senha."
        confirmLabel="Sair"
        tone="danger"
        loading={leaving}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={logout}
      />
    </>
  );
}
