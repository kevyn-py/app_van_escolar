"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, UserPlus } from "lucide-react";
import { useAppData, OfflineError } from "@/hooks/useAppData";
import { useToast } from "@/hooks/useToast";
import { countEvent } from "@/domain/day";
import { formatDateLong } from "@/domain/dateKey";
import { EVENT_LIST, EVENTS, ROUTE_LABELS, STATUS_LABELS, isEventKey, type Route } from "@/domain/events";
import { filterAndSortEntries } from "@/domain/text";
import type { DayStudentEntry, EventFilter, EventKey, EventStatus } from "@/domain/types";
import { Chip, EmptyState, Spinner } from "@/components/ui";
import { CountersRow, EVENT_STYLE } from "@/components/domainUi";
import { StudentEventCard } from "@/components/StudentEventCard";
import { StatusMenu } from "@/components/StatusMenu";

export default function EventosPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <EventosContent />
    </Suspense>
  );
}

function EventosContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { todayKey, todayEntries, todayLoaded, studentsLoaded, profile, setStatus, restoreEntry } = useAppData();
  const toast = useToast();

  const [filter, setFilter] = useState<EventFilter>("todos");
  const [query, setQuery] = useState("");
  const [menuEntry, setMenuEntry] = useState<DayStudentEntry | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const param = params.get("evento");
  const eventKey: EventKey = isEventKey(param) ? param : "embarque_escola";

  const selectEvent = useCallback(
    (key: EventKey) => router.replace(`/eventos?evento=${key}`, { scroll: false }),
    [router],
  );

  // Sem parâmetro na URL: posiciona uma única vez no primeiro evento com pendências.
  useEffect(() => {
    if (isEventKey(param) || !todayLoaded || todayEntries.length === 0) return;
    selectEvent(EVENT_LIST.find((e) => countEvent(todayEntries, e.key).pending > 0)?.key ?? "embarque_escola");
  }, [param, todayLoaded, todayEntries, selectEvent]);

  const counts = useMemo(() => countEvent(todayEntries, eventKey), [todayEntries, eventKey]);
  const list = useMemo(
    () =>
      filterAndSortEntries(todayEntries, eventKey, {
        filter,
        query,
        sort: profile?.preferences.defaultEventSort ?? "pending_first",
      }),
    [todayEntries, eventKey, filter, query, profile?.preferences.defaultEventSort],
  );

  const markBusy = (id: string, on: boolean) =>
    setBusyIds((cur) => {
      const next = new Set(cur);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const change = useCallback(
    async (entry: DayStudentEntry, status: EventStatus) => {
      const id = entry.studentId;
      const key = eventKey;
      markBusy(id, true);
      try {
        const previous = await setStatus(id, key, status);
        const verb = status === "confirmado" ? "confirmado(a)" : `marcado(a) como “${STATUS_LABELS[status]}”`;
        toast.show({
          message: `${entry.nameSnapshot} ${verb}.`,
          tone: "success",
          actionLabel: "Desfazer",
          onAction: () => {
            restoreEntry(id, key, previous).catch((err) =>
              toast.show({ tone: "error", message: err instanceof OfflineError ? "Sem conexão. Não foi possível desfazer." : "Não foi possível desfazer. Tente novamente." }),
            );
          },
        });
      } catch (err) {
        toast.show({
          tone: "error",
          message:
            err instanceof OfflineError
              ? "Sem conexão com a internet. A alteração não foi salva."
              : "Não foi possível salvar a alteração. Tente novamente.",
        });
      } finally {
        markBusy(id, false);
      }
    },
    [eventKey, setStatus, restoreEntry, toast],
  );

  const onConfirm = useCallback((entry: DayStudentEntry) => void change(entry, "confirmado"), [change]);
  const onOpenMenu = useCallback((entry: DayStudentEntry) => setMenuEntry(entry), []);

  const ev = EVENTS[eventKey];
  const style = EVENT_STYLE[eventKey];
  const EvIcon = style.icon;
  const loading = !todayLoaded || !studentsLoaded;

  return (
    <>
      {/* Seletor fixo dos 4 eventos (RN-13) */}
      <div className="sticky top-0 z-20 -mx-4 mb-3 border-b border-slate-200 bg-slate-100/95 px-4 pb-3 pt-1 backdrop-blur md:-mx-8 md:px-8">
        <div className="grid gap-2 md:grid-cols-2">
          {(["ida", "volta"] as Route[]).map((route) => (
            <div key={route} role="group" aria-label={ROUTE_LABELS[route]}>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-600">{ROUTE_LABELS[route]}</p>
              <div className="grid grid-cols-2 gap-2">
                {EVENT_LIST.filter((e) => e.route === route).map((e) => {
                  const active = e.key === eventKey;
                  const s = EVENT_STYLE[e.key];
                  const Icon = s.icon;
                  const pending = countEvent(todayEntries, e.key).pending;
                  return (
                    <button
                      key={e.key}
                      type="button"
                      aria-pressed={active}
                      onClick={() => selectEvent(e.key)}
                      className={`relative flex min-h-12 items-center gap-1.5 rounded-xl px-2 text-left text-[13px] font-bold leading-tight transition-colors sm:text-sm ${
                        active ? `${s.solid} text-white shadow` : `bg-white ${s.text} ring-1 ring-inset ring-slate-300`
                      }`}
                    >
                      <Icon className="size-5 shrink-0" aria-hidden />
                      <span className="min-w-0 flex-1">
                        {e.order}. {e.shortLabel}
                      </span>
                      {pending > 0 && (
                        <span
                          aria-label={`${pending} pendentes`}
                          className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[11px] font-bold text-amber-950 ring-2 ring-slate-100"
                        >
                          {pending}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : todayEntries.length === 0 ? (
        <EmptyState
          icon={<UserPlus className="size-7" aria-hidden />}
          title="Nenhum aluno ativo hoje"
          description="Cadastre ou reative alunos para registrar os eventos do dia."
          action={
            <Link href="/alunos" className="mt-1 inline-flex min-h-12 items-center rounded-xl bg-blue-700 px-5 font-semibold text-white hover:bg-blue-800">
              Ir para Alunos
            </Link>
          }
        />
      ) : (
        <>
          {/* Resumo do evento ativo */}
          <section className={`mb-3 rounded-2xl p-4 ring-2 ${style.soft} ${style.ring}`} aria-live="polite">
            <div className="mb-3 flex items-center gap-3">
              <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl text-white ${style.solid}`}>
                <EvIcon className="size-6" aria-hidden />
              </span>
              <div className="min-w-0">
                <h1 className={`text-xl font-bold leading-tight ${style.text}`}>{ev.label}</h1>
                <p className="text-sm text-slate-700">
                  {ROUTE_LABELS[ev.route]} · {formatDateLong(todayKey)}
                </p>
              </div>
            </div>
            <CountersRow counts={counts} />
          </section>

          {/* Filtros e busca */}
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex gap-2 overflow-x-auto pb-0.5">
              <Chip active={filter === "todos"} onClick={() => setFilter("todos")}>
                Todos
              </Chip>
              <Chip active={filter === "pendentes"} onClick={() => setFilter("pendentes")} count={counts.pending}>
                Pendentes
              </Chip>
              <Chip active={filter === "concluidos"} onClick={() => setFilter("concluidos")}>
                Concluídos
              </Chip>
            </div>
            <label className="relative sm:ml-auto sm:w-64">
              <span className="sr-only">Buscar aluno</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-500" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar aluno"
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </label>
          </div>

          {list.length === 0 ? (
            <p className="rounded-2xl bg-white p-6 text-center text-[15px] text-slate-600 ring-1 ring-slate-200">
              {filter === "pendentes" && !query ? "Nenhum aluno pendente neste evento. 🎉" : "Nenhum aluno encontrado."}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {list.map((entry) => (
                <StudentEventCard
                  key={entry.studentId}
                  entry={entry}
                  eventKey={eventKey}
                  busy={busyIds.has(entry.studentId)}
                  onConfirm={onConfirm}
                  onOpenMenu={onOpenMenu}
                />
              ))}
            </ul>
          )}
        </>
      )}

      <StatusMenu
        entry={menuEntry ? todayEntries.find((e) => e.studentId === menuEntry.studentId) ?? null : null}
        eventKey={eventKey}
        onClose={() => setMenuEntry(null)}
        onSelect={(entry, status) => {
          setMenuEntry(null);
          void change(entry, status);
        }}
      />
    </>
  );
}
