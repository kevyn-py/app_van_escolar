"use client";

import Link from "next/link";
import { ChevronRight, CircleCheck, Clock, UserPlus, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAppData } from "@/hooks/useAppData";
import { computeSummary, progress } from "@/domain/day";
import { formatDateLong } from "@/domain/dateKey";
import { EVENT_LIST, ROUTE_LABELS, type Route } from "@/domain/events";
import { Card, EmptyState, Spinner } from "@/components/ui";
import { CountersRow, EVENT_STYLE, ProgressBar } from "@/components/domainUi";

export default function InicioPage() {
  const { user } = useAuth();
  const { profile, todayKey, today, todayEntries, students, studentsLoaded, todayLoaded } = useAppData();

  const name = (profile?.displayName || user?.displayName || "").split(" ")[0];
  const activeCount = students.filter((s) => s.active).length;
  const summary = today ? computeSummary(today.students) : null;
  const overall = summary ? progress(summary.total) : { done: 0, total: 0, percent: 0 };

  return (
    <>
      <header className="mb-4">
        <p className="text-[15px] text-slate-600">{name ? `Olá, ${name}` : "Olá"}</p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{formatDateLong(todayKey)}</h1>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-900">
            <Users className="size-4" aria-hidden />
            {activeCount} {activeCount === 1 ? "aluno ativo" : "alunos ativos"}
          </span>
        </div>
      </header>

      {!studentsLoaded || !todayLoaded ? (
        <Spinner />
      ) : todayEntries.length === 0 || !summary ? (
        <EmptyState
          icon={<UserPlus className="size-7" aria-hidden />}
          title={students.length === 0 ? "Cadastre o primeiro aluno" : "Nenhum aluno ativo hoje"}
          description={
            students.length === 0
              ? "Para começar a operação do dia, cadastre as crianças transportadas."
              : "Ative ou cadastre alunos para que apareçam na operação de hoje."
          }
          action={
            <Link
              href="/alunos"
              className="mt-1 inline-flex min-h-12 items-center rounded-xl bg-blue-700 px-5 font-semibold text-white hover:bg-blue-800"
            >
              Ir para Alunos
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-5">
          <Card>
            <ProgressBar
              done={overall.done}
              total={overall.total}
              label={`${overall.done} de ${overall.total} verificações concluídas`}
            />
            <div className="mt-4">
              <CountersRow counts={summary.total} />
            </div>
          </Card>

          {(["ida", "volta"] as Route[]).map((route) => (
            <section key={route} aria-labelledby={`route-${route}`}>
              <h2 id={`route-${route}`} className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-600">
                {ROUTE_LABELS[route]}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {EVENT_LIST.filter((e) => e.route === route).map((ev) => {
                  const c = summary.events[ev.key];
                  const style = EVENT_STYLE[ev.key];
                  const Icon = style.icon;
                  const applicableTotal = c.confirmed + c.pending + c.absent;
                  return (
                    <Link
                      key={ev.key}
                      href={`/eventos?evento=${ev.key}`}
                      className={`group block rounded-2xl bg-white p-4 shadow-sm ring-1 transition hover:shadow-md ${
                        c.pending > 0 ? "ring-2 ring-amber-400" : "ring-slate-200"
                      }`}
                    >
                      <div className="mb-3 flex items-center gap-3">
                        <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl text-white ${style.solid}`}>
                          <Icon className="size-6" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-500">{ev.order}º evento</p>
                          <h3 className="truncate text-[17px] font-bold text-slate-900">{ev.label}</h3>
                        </div>
                        <ChevronRight className="size-6 shrink-0 text-slate-400 group-hover:text-slate-700" aria-hidden />
                      </div>
                      <div className="mb-3">
                        {applicableTotal === 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-sm font-semibold text-slate-700">
                            Sem alunos neste evento
                          </span>
                        ) : c.pending === 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-sm font-semibold text-emerald-900">
                            <CircleCheck className="size-4" aria-hidden /> Concluído
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-sm font-semibold text-amber-900">
                            <Clock className="size-4" aria-hidden /> {c.pending} {c.pending === 1 ? "pendente" : "pendentes"}
                          </span>
                        )}
                      </div>
                      <CountersRow counts={c} compact />
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
