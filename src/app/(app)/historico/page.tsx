"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronRight, History } from "lucide-react";
import { useAppData } from "@/hooks/useAppData";
import { useToast } from "@/hooks/useToast";
import { applicable } from "@/domain/day";
import { formatDateShort, formatWeekday, isValidDateKey } from "@/domain/dateKey";
import { EVENT_LIST } from "@/domain/events";
import type { DailyRecord } from "@/domain/types";
import { listDays } from "@/services/dailyRecordsService";
import { Button, Card, EmptyState, PageHeader, Spinner } from "@/components/ui";
import { CountersRow, EVENT_STYLE } from "@/components/domainUi";

export default function HistoricoPage() {
  const { uid, todayKey } = useAppData();
  const router = useRouter();
  const toast = useToast();
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState("");

  useEffect(() => {
    if (!uid) return;
    let alive = true;
    listDays(uid)
      .then((page) => {
        if (!alive) return;
        setRecords(page.records);
        setHasMore(page.hasMore);
      })
      .catch(() => alive && setError("Não foi possível carregar o histórico. Verifique sua conexão."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [uid]);

  async function loadMore() {
    const last = records.at(-1);
    if (!last) return;
    setLoadingMore(true);
    try {
      const page = await listDays(uid, last.date);
      setRecords((cur) => [...cur, ...page.records]);
      setHasMore(page.hasMore);
    } catch {
      toast.show({ tone: "error", message: "Não foi possível carregar mais dias." });
    } finally {
      setLoadingMore(false);
    }
  }

  function goToDate(e: FormEvent) {
    e.preventDefault();
    if (isValidDateKey(date)) router.push(`/historico/${date}`);
  }

  return (
    <>
      <PageHeader title="Histórico" subtitle="Consulta dos registros diários (somente leitura)." />

      <Card className="mb-4">
        <form onSubmit={goToDate} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex-1">
            <span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
              <CalendarDays className="size-4" aria-hidden /> Ir para uma data
            </span>
            <input
              type="date"
              value={date}
              max={todayKey}
              onChange={(e) => setDate(e.target.value)}
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </label>
          <div className="flex gap-2">
            <Button type="submit" disabled={!isValidDateKey(date)} className="flex-1 sm:flex-none">
              Consultar
            </Button>
            <Button variant="secondary" onClick={() => setDate("")} disabled={!date} className="flex-1 sm:flex-none">
              Limpar filtro
            </Button>
          </div>
        </form>
      </Card>

      {loading ? (
        <Spinner />
      ) : error ? (
        <p role="alert" className="rounded-2xl bg-red-50 p-4 text-[15px] font-medium text-red-800 ring-1 ring-red-200">
          {error}
        </p>
      ) : records.length === 0 ? (
        <EmptyState
          icon={<History className="size-7" aria-hidden />}
          title="Nenhum registro ainda"
          description="Os dias operados aparecerão aqui automaticamente."
        />
      ) : (
        <>
          <ul className="grid gap-3 lg:grid-cols-2">
            {records.map((r) => {
              const isToday = r.date === todayKey;
              return (
                <li key={r.date}>
                  <Link
                    href={`/historico/${r.date}`}
                    className={`group block rounded-2xl bg-white p-4 shadow-sm ring-1 hover:shadow-md ${
                      isToday ? "ring-2 ring-blue-600" : "ring-slate-200"
                    }`}
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-lg font-bold text-slate-900">{formatDateShort(r.date)}</p>
                        <p className="text-sm text-slate-600">
                          {formatWeekday(r.date)} · {r.studentCount} {r.studentCount === 1 ? "aluno" : "alunos"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {isToday && (
                          <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-900">Hoje — Em andamento</span>
                        )}
                        <ChevronRight className="size-6 text-slate-400 group-hover:text-slate-700" aria-hidden />
                      </div>
                    </div>
                    <CountersRow counts={r.summary.total} compact />
                    <div className="mt-3 grid grid-cols-4 gap-1.5">
                      {EVENT_LIST.map((ev) => {
                        const c = r.summary.events[ev.key];
                        const s = EVENT_STYLE[ev.key];
                        const Icon = s.icon;
                        return (
                          <div
                            key={ev.key}
                            title={ev.label}
                            className={`flex items-center justify-center gap-1 rounded-lg py-1 text-xs font-bold ${s.soft} ${s.text}`}
                          >
                            <Icon className="size-3.5" aria-hidden />
                            <span className="sr-only">{ev.label}: </span>
                            {c.confirmed}/{applicable(c)}
                          </div>
                        );
                      })}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
          {hasMore && (
            <div className="mt-4 flex justify-center">
              <Button variant="secondary" onClick={loadMore} loading={loadingMore}>
                Carregar dias anteriores
              </Button>
            </div>
          )}
        </>
      )}
    </>
  );
}
