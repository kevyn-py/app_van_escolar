"use client";

import {
  Bird,
  BookOpen,
  BusFront,
  CircleCheck,
  CircleMinus,
  Clock,
  Cloud,
  Fish,
  Flower2,
  Heart,
  House,
  Leaf,
  Music,
  Rocket,
  School,
  Smile,
  Star,
  Sun,
  Sunrise,
  UserX,
  type LucideIcon,
} from "lucide-react";
import type { AvatarColor, AvatarIcon } from "@/domain/avatars";
import { formatTime } from "@/domain/dateKey";
import { STATUS_LABELS } from "@/domain/events";
import type { Counts, EventEntry, EventKey, EventStatus } from "@/domain/types";

export const AVATAR_ICON_COMPONENTS: Record<AvatarIcon, LucideIcon> = {
  star: Star,
  rocket: Rocket,
  sun: Sun,
  book: BookOpen,
  heart: Heart,
  cloud: Cloud,
  leaf: Leaf,
  music: Music,
  fish: Fish,
  bird: Bird,
  flower: Flower2,
  smile: Smile,
};

export const AVATAR_COLOR_CLASSES: Record<AvatarColor, string> = {
  sky: "bg-sky-100 text-sky-800",
  emerald: "bg-emerald-100 text-emerald-800",
  amber: "bg-amber-100 text-amber-800",
  rose: "bg-rose-100 text-rose-800",
  violet: "bg-violet-100 text-violet-800",
  teal: "bg-teal-100 text-teal-800",
  orange: "bg-orange-100 text-orange-800",
  indigo: "bg-indigo-100 text-indigo-800",
  lime: "bg-lime-100 text-lime-800",
  pink: "bg-pink-100 text-pink-800",
};

export const AVATAR_SWATCH: Record<AvatarColor, string> = {
  sky: "bg-sky-400",
  emerald: "bg-emerald-400",
  amber: "bg-amber-400",
  rose: "bg-rose-400",
  violet: "bg-violet-400",
  teal: "bg-teal-400",
  orange: "bg-orange-400",
  indigo: "bg-indigo-400",
  lime: "bg-lime-400",
  pink: "bg-pink-400",
};

export function Avatar({ icon, color, size = "md" }: { icon: string; color: string; size?: "sm" | "md" | "lg" }) {
  const Icon = AVATAR_ICON_COMPONENTS[icon as AvatarIcon] ?? Star;
  const colorCls = AVATAR_COLOR_CLASSES[color as AvatarColor] ?? AVATAR_COLOR_CLASSES.sky;
  const dims = size === "sm" ? "size-9" : size === "lg" ? "size-14" : "size-12";
  const iconDims = size === "sm" ? "size-5" : size === "lg" ? "size-7" : "size-6";
  return (
    <span aria-hidden className={`flex shrink-0 items-center justify-center rounded-full ${dims} ${colorCls}`}>
      <Icon className={iconDims} strokeWidth={2.2} />
    </span>
  );
}

/** Identidade visual de cada evento (RN-13): cor + ícone distintos. */
export const EVENT_STYLE: Record<EventKey, { icon: LucideIcon; solid: string; soft: string; text: string; ring: string }> = {
  embarque_escola: { icon: Sunrise, solid: "bg-sky-700", soft: "bg-sky-50", text: "text-sky-800", ring: "ring-sky-700" },
  desembarque_escola: { icon: School, solid: "bg-indigo-700", soft: "bg-indigo-50", text: "text-indigo-800", ring: "ring-indigo-700" },
  embarque_casa: { icon: BusFront, solid: "bg-orange-700", soft: "bg-orange-50", text: "text-orange-800", ring: "ring-orange-700" },
  desembarque_casa: { icon: House, solid: "bg-fuchsia-800", soft: "bg-fuchsia-50", text: "text-fuchsia-900", ring: "ring-fuchsia-800" },
};

export const STATUS_STYLE: Record<EventStatus, { icon: LucideIcon; cls: string; dot: string }> = {
  pendente: { icon: Clock, cls: "bg-amber-100 text-amber-900 ring-amber-300", dot: "bg-amber-500" },
  confirmado: { icon: CircleCheck, cls: "bg-emerald-100 text-emerald-900 ring-emerald-300", dot: "bg-emerald-600" },
  nao_compareceu: { icon: UserX, cls: "bg-red-100 text-red-900 ring-red-300", dot: "bg-red-600" },
  nao_se_aplica: { icon: CircleMinus, cls: "bg-slate-100 text-slate-700 ring-slate-300", dot: "bg-slate-400" },
};

/** Status por cor + ícone + texto (RNF-02). */
export function StatusBadge({ entry, size = "md" }: { entry: EventEntry; size?: "sm" | "md" }) {
  const s = STATUS_STYLE[entry.status];
  const Icon = s.icon;
  const time = entry.status !== "pendente" ? formatTime(entry.updatedAt) : "";
  const label = entry.status === "confirmado" && time ? `Confirmado às ${time}` : STATUS_LABELS[entry.status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ring-1 ring-inset ${s.cls} ${
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"
      }`}
    >
      <Icon className={size === "sm" ? "size-3.5" : "size-4"} aria-hidden />
      {label}
      {entry.status !== "confirmado" && entry.status !== "pendente" && time && <span className="font-normal">· {time}</span>}
    </span>
  );
}

/** Três contadores Confirmados / Pendentes / Não compareceu. */
export function CountersRow({ counts, compact }: { counts: Counts; compact?: boolean }) {
  const items = [
    { label: "Confirmados", value: counts.confirmed, s: STATUS_STYLE.confirmado },
    { label: "Pendentes", value: counts.pending, s: STATUS_STYLE.pendente },
    { label: "Não compareceu", value: counts.absent, s: STATUS_STYLE.nao_compareceu },
  ];
  return (
    <dl className="grid grid-cols-3 gap-2">
      {items.map(({ label, value, s }) => {
        const Icon = s.icon;
        return (
          <div key={label} className={`flex flex-col rounded-xl ring-1 ring-inset ${s.cls} ${compact ? "px-2 py-1.5" : "px-2.5 py-2"}`}>
            <dd className={`flex items-center gap-1 font-bold tabular-nums leading-none ${compact ? "text-lg" : "text-2xl"}`}>
              <Icon className={compact ? "size-3.5 shrink-0" : "size-4 shrink-0"} aria-hidden />
              {value}
            </dd>
            <dt className={`order-last mt-1 font-semibold leading-tight ${compact ? "text-[11px]" : "text-xs"}`}>{label}</dt>
          </div>
        );
      })}
    </dl>
  );
}

export function ProgressBar({ done, total, label }: { done: number; total: number; label: string }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-[15px] font-semibold text-slate-800">{label}</span>
        <span className="text-sm font-bold tabular-nums text-slate-700">{pct}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-label={label}
        className="h-3 w-full overflow-hidden rounded-full bg-slate-200"
      >
        <div className="h-full rounded-full bg-emerald-600 transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
