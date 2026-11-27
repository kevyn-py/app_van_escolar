"use client";

import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { EVENTS, STATUS_LABELS } from "@/domain/events";
import { EVENT_STATUSES, type DayStudentEntry, type EventKey, type EventStatus } from "@/domain/types";
import { Avatar, STATUS_STYLE, StatusBadge } from "./domainUi";
import { Button, Modal } from "./ui";

const OPTION_LABELS: Record<EventStatus, string> = {
  confirmado: "Confirmar",
  nao_compareceu: "Não compareceu",
  nao_se_aplica: "Não se aplica hoje",
  pendente: "Voltar para Pendente",
};

const ORDER: EventStatus[] = ["confirmado", "nao_compareceu", "nao_se_aplica", "pendente"];

/** Menu de ajuste de status. Reverter um "Confirmado" exige confirmação leve (RN-11). */
export function StatusMenu({
  entry,
  eventKey,
  onClose,
  onSelect,
}: {
  entry: DayStudentEntry | null;
  eventKey: EventKey;
  onClose: () => void;
  onSelect: (entry: DayStudentEntry, status: EventStatus) => void;
}) {
  const [confirming, setConfirming] = useState<EventStatus | null>(null);
  const current = entry?.events[eventKey];

  function close() {
    setConfirming(null);
    onClose();
  }

  function choose(status: EventStatus) {
    if (!entry || !current) return;
    if (current.status === "confirmado" && status !== "confirmado" && confirming !== status) {
      setConfirming(status);
      return;
    }
    setConfirming(null);
    onSelect(entry, status);
  }

  return (
    <Modal open={Boolean(entry)} onClose={close} title="Ajustar status">
      {entry && current && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Avatar icon={entry.avatarIconSnapshot} color={entry.avatarColorSnapshot} />
            <div className="min-w-0">
              <p className="truncate text-base font-bold">{entry.nameSnapshot}</p>
              <p className="text-sm text-slate-600">{EVENTS[eventKey].label}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-700">
            Status atual: <StatusBadge entry={current} size="sm" />
          </div>

          {confirming ? (
            <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-300">
              <p className="mb-3 flex items-start gap-2 text-[15px] font-semibold text-amber-950">
                <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
                Alterar de “Confirmado” para “{STATUS_LABELS[confirming]}”?
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setConfirming(null)}>
                  Manter
                </Button>
                <Button className="flex-1" onClick={() => choose(confirming)}>
                  Sim, alterar
                </Button>
              </div>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {ORDER.filter((s) => EVENT_STATUSES.includes(s) && s !== current.status).map((s) => {
                const Icon = STATUS_STYLE[s].icon;
                return (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => choose(s)}
                      className={`flex min-h-13 w-full items-center gap-3 rounded-xl px-4 text-left text-base font-semibold ring-1 ring-inset ${STATUS_STYLE[s].cls} hover:brightness-95`}
                    >
                      <Icon className="size-5 shrink-0" aria-hidden />
                      {OPTION_LABELS[s]}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
}
