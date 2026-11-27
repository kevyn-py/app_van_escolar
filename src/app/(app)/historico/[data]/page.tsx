"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarDays, ChevronDown, Lock, Search } from "lucide-react";
import { useAppData } from "@/hooks/useAppData";
import { formatDateLong, formatTime, isValidDateKey } from "@/domain/dateKey";
import { EVENT_LIST, ROUTE_PROFILE_LABELS, STATUS_LABELS } from "@/domain/events";
import { compareNames, matchesSearch } from "@/domain/text";
import type { DailyRecord } from "@/domain/types";
import { getDay } from "@/services/dailyRecordsService";
import { Card, EmptyState, Spinner } from "@/components/ui";
import { Avatar, CountersRow, EVENT_STYLE, STATUS_STYLE } from "@/components/domainUi";

export default function HistoricoDetalhePage() {
  const params = useParams<{ data: string }>();
  const dateKey = params.data;
  const { uid, todayKey, today, todayLoaded } = useAppData();
  const isToday = dateKey === todayKey;
  const valid = isValidDateKey(dateKey);

  const [past, setPast] = useState<{ key: string; record: DailyRecord | null } | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!uid || !valid || isToday) return;
    let alive = true;
    // Registros passados são imutáveis: leitura única, sem listener (economia de leituras).
    getDay(uid, dateKey)
      .then((record) => alive && setPast({ key: dateKey, record }))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [uid, dateKey, valid, isToday]);

  const record = isToday ? today : past?.key === dateKey ? past.record : null;
  const loading = valid && !error && (isToday ? !todayLoaded : past?.key !== dateKey);

  const entries = useMemo(
    () =>
      record
        ? Object.values(record.students)
            .filter((e) => matchesSearch(e.nameSnapshot, query))
            .sort((a, b) => compareNames(a.nameSnapshot, b.nameSnapshot))
        : [],
    [record, query],
  );

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link
          href="/historico"
          aria-label="Voltar para o Histórico"
          className="flex size-11 items-center justify-center rounded-xl bg-white text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{valid ? formatDateLong(dateKey) : "Data inválida"}</h1>
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-800">
            <Lock className="size-3.5" aria-hidden />
            {isToday ? "Hoje — Em andamento (somente leitura)" : "Registro Histórico (Somente leitura)"}
          </span>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : error ? (
        <p role="alert" className="rounded-2xl bg-red-50 p-4 text-[15px] font-medium text-red-800 ring-1 ring-red-200">
          Não foi possível carregar este dia. Verifique sua conexão.
        </p>
      ) : !record ? (
        <EmptyState
          icon={<CalendarDays className="size-7" aria-hidden />}
          title="Não há registros para esta data"
          description="Nenhum registro encontrado para esta data."
          action={
            <Link href="/historico" className="mt-1 inline-flex min-h-12 items-center rounded-xl bg-blue-700 px-5 font-semibold text-white hover:bg-blue-800">
              Voltar ao Histórico
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid gap-2 sm:grid-cols-2">
            {EVENT_LIST.map((ev) => {
              const s = EVENT_STYLE[ev.key];
              const Icon = s.icon;
              return (
                <Card key={ev.key} className="!p-3">
                  <p className={`mb-2 flex items-center gap-2 text-[15px] font-bold ${s.text}`}>
                    <span className={`flex size-7 items-center justify-center rounded-lg text-white ${s.solid}`}>
                      <Icon className="size-4" aria-hidden />
                    </span>
                    {ev.label}
                  </p>
                  <CountersRow counts={record.summary.events[ev.key]} compact />
                </Card>
              );
            })}
          </div>

          <label className="relative">
            <span className="sr-only">Buscar aluno neste dia</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-500" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar aluno neste dia"
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </label>

          {entries.length === 0 ? (
            <p className="rounded-2xl bg-white p-6 text-center text-[15px] text-slate-600 ring-1 ring-slate-200">Nenhum aluno encontrado.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {entries.map((e) => {
                const expanded = open === e.studentId;
                return (
                  <li key={e.studentId} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
                    <button
                      type="button"
                      aria-expanded={expanded}
                      onClick={() => setOpen(expanded ? null : e.studentId)}
                      className="flex min-h-16 w-full items-center gap-3 p-3 text-left hover:bg-slate-50"
                    >
                      <Avatar icon={e.avatarIconSnapshot} color={e.avatarColorSnapshot} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-bold text-slate-900">{e.nameSnapshot}</p>
                        <div className="mt-1 flex items-center gap-1.5">
                          {EVENT_LIST.map((ev) => {
                            const st = STATUS_STYLE[e.events[ev.key].status];
                            const Icon = st.icon;
                            return (
                              <span
                                key={ev.key}
                                title={`${ev.label}: ${STATUS_LABELS[e.events[ev.key].status]}`}
                                className={`flex size-7 items-center justify-center rounded-md ring-1 ring-inset ${st.cls}`}
                              >
                                <Icon className="size-4" aria-hidden />
                                <span className="sr-only">
                                  {ev.label}: {STATUS_LABELS[e.events[ev.key].status]}
                                </span>
                              </span>
                            );
                          })}
                          {e.removed && (
                            <span className="ml-1 rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-700">Cadastro desativado/removido</span>
                          )}
                        </div>
                      </div>
                      <ChevronDown className={`size-5 shrink-0 text-slate-500 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden />
                    </button>
                    {expanded && (
                      <div className="border-t border-slate-200 bg-slate-50 p-3">
                        <p className="mb-2 text-sm text-slate-600">Perfil no dia: {ROUTE_PROFILE_LABELS[e.routeProfileSnapshot]}</p>
                        <dl className="grid gap-2 sm:grid-cols-2">
                          {EVENT_LIST.map((ev) => {
                            const entry = e.events[ev.key];
                            const st = STATUS_STYLE[entry.status];
                            const Icon = st.icon;
                            const EvIcon = EVENT_STYLE[ev.key].icon;
                            return (
                              <div key={ev.key} className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                                <dt className={`mb-1.5 flex items-center gap-1.5 text-sm font-bold ${EVENT_STYLE[ev.key].text}`}>
                                  <EvIcon className="size-4" aria-hidden />
                                  {ev.order}. {ev.label}
                                </dt>
                                <dd className="flex items-center justify-between gap-2">
                                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold ring-1 ring-inset ${st.cls}`}>
                                    <Icon className="size-4" aria-hidden />
                                    {STATUS_LABELS[entry.status]}
                                  </span>
                                  <span className="text-base font-bold tabular-nums text-slate-800">
                                    {entry.updatedAt ? formatTime(entry.updatedAt) : "—"}
                                  </span>
                                </dd>
                              </div>
                            );
                          })}
                        </dl>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </>
  );
}
