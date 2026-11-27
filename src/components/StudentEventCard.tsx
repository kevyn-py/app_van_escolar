"use client";

import { memo } from "react";
import { BusFront, Check, EllipsisVertical } from "lucide-react";
import { isAwaitingDropoff } from "@/domain/day";
import type { DayStudentEntry, EventKey } from "@/domain/types";
import { Avatar, StatusBadge } from "./domainUi";

interface Props {
  entry: DayStudentEntry;
  eventKey: EventKey;
  busy: boolean;
  onConfirm: (entry: DayStudentEntry) => void;
  onOpenMenu: (entry: DayStudentEntry) => void;
}

export const StudentEventCard = memo(function StudentEventCard({ entry, eventKey, busy, onConfirm, onOpenMenu }: Props) {
  const ev = entry.events[eventKey];
  const awaiting = isAwaitingDropoff(entry, eventKey);
  const pending = ev.status === "pendente";

  const confirmButton = (cls: string) => (
    <button
      type="button"
      onClick={() => onConfirm(entry)}
      disabled={busy}
      aria-label={`Confirmar ${entry.nameSnapshot}`}
      className={`flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-base font-bold text-white shadow-sm hover:bg-emerald-800 active:scale-[0.98] active:bg-emerald-900 disabled:opacity-60 ${cls}`}
    >
      <Check className="size-5" strokeWidth={3} aria-hidden />
      Confirmar
    </button>
  );

  const menuButton = (
    <button
      type="button"
      onClick={() => onOpenMenu(entry)}
      disabled={busy}
      aria-label={`Ajustar status de ${entry.nameSnapshot}`}
      className="flex size-12 shrink-0 items-center justify-center rounded-xl text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-100 disabled:opacity-60"
    >
      <EllipsisVertical className="size-5" aria-hidden />
    </button>
  );

  return (
    <li
      className={`rounded-2xl bg-white p-3 shadow-sm ring-1 ${
        awaiting ? "ring-2 ring-amber-500" : pending ? "ring-slate-300" : "ring-slate-200"
      } ${ev.status === "nao_se_aplica" ? "opacity-80" : ""}`}
    >
      <div className="flex items-center gap-3">
        <Avatar icon={entry.avatarIconSnapshot} color={entry.avatarColorSnapshot} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-bold text-slate-900">{entry.nameSnapshot}</p>
          <div className="mt-1">
            <StatusBadge entry={ev} size="sm" />
          </div>
        </div>
        {/* Tablet/desktop: ações na mesma linha */}
        {pending && confirmButton("hidden sm:flex")}
        <span className={pending ? "hidden sm:block" : ""}>{menuButton}</span>
      </div>

      {awaiting && (
        <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-400 px-2.5 py-1.5 text-sm font-bold text-amber-950">
          <BusFront className="size-4 shrink-0" aria-hidden />
          Na van — aguardando desembarque
        </p>
      )}

      {/* Celular: botão largo para uso com uma mão */}
      {pending && (
        <div className="mt-2.5 flex gap-2 sm:hidden">
          {confirmButton("flex-1")}
          {menuButton}
        </div>
      )}
    </li>
  );
});
