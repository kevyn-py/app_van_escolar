"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Power, Search, Trash2, UserPlus } from "lucide-react";
import { useAppData } from "@/hooks/useAppData";
import { useToast } from "@/hooks/useToast";
import { ROUTE_PROFILE_LABELS } from "@/domain/events";
import { compareNames, matchesSearch } from "@/domain/text";
import type { Student, StudentInput } from "@/domain/types";
import { createStudent, deleteStudent, updateStudent } from "@/services/studentsService";
import { Button, Chip, ConfirmDialog, EmptyState, PageHeader, Spinner } from "@/components/ui";
import { Avatar } from "@/components/domainUi";
import { StudentFormModal } from "@/components/StudentForm";

type Filter = "todos" | "ativos" | "inativos";

export default function AlunosPage() {
  const { uid, students, studentsLoaded, todayKey } = useAppData();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");
  const [editing, setEditing] = useState<Student | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const activeCount = students.filter((s) => s.active).length;
  const list = useMemo(
    () =>
      students
        .filter((s) => (filter === "ativos" ? s.active : filter === "inativos" ? !s.active : true))
        .filter((s) => matchesSearch(s.name, query))
        .sort((a, b) => (a.active === b.active ? compareNames(a.name, b.name) : a.active ? -1 : 1)),
    [students, filter, query],
  );

  const fail = () => toast.show({ tone: "error", message: "Não foi possível salvar. Verifique sua conexão e tente novamente." });

  async function save(input: StudentInput) {
    try {
      if (editing) {
        await updateStudent(uid, editing.id, input, todayKey);
        toast.show({ tone: "success", message: "Aluno atualizado." });
      } else {
        await createStudent(uid, input, todayKey);
        toast.show({ tone: "success", message: "Aluno cadastrado." });
      }
      setFormOpen(false);
      setEditing(null);
    } catch {
      fail();
    }
  }

  async function toggleActive(s: Student) {
    setBusyId(s.id);
    try {
      await updateStudent(uid, s.id, { ...s, active: !s.active }, todayKey);
      toast.show({ tone: "success", message: s.active ? `${s.name} desativado(a).` : `${s.name} reativado(a).` });
    } catch {
      fail();
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteStudent(uid, toDelete, todayKey);
      toast.show({ tone: "success", message: "Aluno excluído. O histórico foi preservado." });
      setToDelete(null);
    } catch {
      fail();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Alunos"
        subtitle={`${activeCount} ${activeCount === 1 ? "ativo" : "ativos"} de ${students.length} cadastrados`}
        action={
          <Button
            size="lg"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-5" strokeWidth={3} aria-hidden />
            Novo aluno
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Buscar por nome</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-500" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome"
            className="min-h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </label>
        <div className="flex gap-2">
          {(["todos", "ativos", "inativos"] as Filter[]).map((f) => (
            <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
              {f === "todos" ? "Todos" : f === "ativos" ? "Ativos" : "Inativos"}
            </Chip>
          ))}
        </div>
      </div>

      {!studentsLoaded ? (
        <Spinner />
      ) : students.length === 0 ? (
        <EmptyState
          icon={<UserPlus className="size-7" aria-hidden />}
          title="Nenhum aluno cadastrado"
          description="Cadastre as crianças transportadas informando apenas o nome, um avatar ilustrativo e o perfil de trajeto."
          action={
            <Button size="lg" onClick={() => setFormOpen(true)}>
              <Plus className="size-5" aria-hidden /> Cadastrar primeiro aluno
            </Button>
          }
        />
      ) : list.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-[15px] text-slate-600 ring-1 ring-slate-200">Nenhum aluno encontrado.</p>
      ) : (
        <ul className="grid gap-2 lg:grid-cols-2">
          {list.map((s) => (
            <li
              key={s.id}
              className={`flex flex-col gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 min-[480px]:flex-row min-[480px]:items-center ${
                s.active ? "" : "bg-slate-50"
              }`}
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className={s.active ? "" : "opacity-50 grayscale"}>
                  <Avatar icon={s.avatarIcon} color={s.avatarColor} />
                </span>
                <div className="min-w-0">
                  <p className={`truncate text-base font-bold ${s.active ? "text-slate-900" : "text-slate-600"}`}>{s.name}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-900 ring-1 ring-inset ring-blue-200">
                      {ROUTE_PROFILE_LABELS[s.routeProfile]}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ring-1 ring-inset ${
                        s.active ? "bg-emerald-50 text-emerald-900 ring-emerald-300" : "bg-slate-200 text-slate-700 ring-slate-300"
                      }`}
                    >
                      {s.active ? "● Ativo" : "○ Inativo"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1.5 self-end min-[480px]:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(s);
                    setFormOpen(true);
                  }}
                  aria-label={`Editar ${s.name}`}
                  className="flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-slate-800 ring-1 ring-inset ring-slate-300 hover:bg-slate-100"
                >
                  <Pencil className="size-4" aria-hidden /> Editar
                </button>
                <button
                  type="button"
                  onClick={() => toggleActive(s)}
                  disabled={busyId === s.id}
                  aria-label={s.active ? `Desativar ${s.name}` : `Ativar ${s.name}`}
                  className="flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-slate-800 ring-1 ring-inset ring-slate-300 hover:bg-slate-100 disabled:opacity-50"
                >
                  <Power className="size-4" aria-hidden /> {s.active ? "Desativar" : "Ativar"}
                </button>
                <button
                  type="button"
                  onClick={() => setToDelete(s)}
                  aria-label={`Excluir ${s.name}`}
                  className="flex size-11 items-center justify-center rounded-xl text-red-700 ring-1 ring-inset ring-red-200 hover:bg-red-50"
                >
                  <Trash2 className="size-5" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <StudentFormModal
        open={formOpen}
        student={editing}
        students={students}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSave={save}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Excluir aluno?"
        tone="danger"
        confirmLabel="Excluir"
        loading={deleting}
        onCancel={() => setToDelete(null)}
        onConfirm={confirmDelete}
        description={
          <>
            <p className="mb-2">
              <strong>{toDelete?.name}</strong> será removido(a) da lista de alunos e não aparecerá mais nas próximas operações.
            </p>
            <p>Os registros históricos de dias anteriores serão preservados integralmente. Se quiser apenas pausar o transporte, use “Desativar”.</p>
          </>
        }
      />
    </>
  );
}
