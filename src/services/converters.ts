import { Timestamp } from "firebase/firestore";
import { EVENT_KEYS, ROUTE_PROFILES, type DayEvents, type DayStudentEntry, type DayStudents, type DailyRecord, type RouteProfile, type Student } from "@/domain/types";
import { computeSummary } from "@/domain/day";

/* Conversões entre os documentos do Firestore e os tipos de domínio. */

export function toDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return null;
}

function asRouteProfile(value: unknown): RouteProfile {
  return (ROUTE_PROFILES as readonly string[]).includes(value as string) ? (value as RouteProfile) : "ida_e_volta";
}

export function studentFromDoc(id: string, data: Record<string, unknown>): Student {
  return {
    id,
    name: String(data.name ?? ""),
    active: data.active === true,
    avatarIcon: String(data.avatarIcon ?? "star"),
    avatarColor: String(data.avatarColor ?? "sky"),
    routeProfile: asRouteProfile(data.routeProfile),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function entryFromDoc(id: string, raw: Record<string, unknown>): DayStudentEntry {
  const rawEvents = (raw.events ?? {}) as Record<string, { status?: string; updatedAt?: unknown }>;
  const events = {} as DayEvents;
  for (const key of EVENT_KEYS) {
    const ev = rawEvents[key];
    events[key] = {
      status: (ev?.status as DayEvents[typeof key]["status"]) ?? "pendente",
      updatedAt: toDate(ev?.updatedAt),
    };
  }
  return {
    studentId: String(raw.studentId ?? id),
    nameSnapshot: String(raw.nameSnapshot ?? ""),
    avatarIconSnapshot: String(raw.avatarIconSnapshot ?? "star"),
    avatarColorSnapshot: String(raw.avatarColorSnapshot ?? "sky"),
    routeProfileSnapshot: asRouteProfile(raw.routeProfileSnapshot),
    removed: raw.removed === true,
    events,
  };
}

export function dailyRecordFromDoc(data: Record<string, unknown>): DailyRecord {
  const rawStudents = (data.students ?? {}) as Record<string, Record<string, unknown>>;
  const students: DayStudents = {};
  for (const [id, raw] of Object.entries(rawStudents)) students[id] = entryFromDoc(id, raw);
  // O resumo persistido serve à listagem; aqui garantimos coerência com o mapa carregado.
  return {
    date: String(data.date ?? ""),
    studentCount: Object.keys(students).length,
    summary: computeSummary(students),
    students,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export function entryToDoc(entry: DayStudentEntry): Record<string, unknown> {
  const events: Record<string, unknown> = {};
  for (const key of EVENT_KEYS) {
    const ev = entry.events[key];
    events[key] = { status: ev.status, updatedAt: ev.updatedAt ? Timestamp.fromDate(ev.updatedAt) : null };
  }
  return {
    studentId: entry.studentId,
    nameSnapshot: entry.nameSnapshot,
    avatarIconSnapshot: entry.avatarIconSnapshot,
    avatarColorSnapshot: entry.avatarColorSnapshot,
    routeProfileSnapshot: entry.routeProfileSnapshot,
    removed: entry.removed === true,
    events,
  };
}

export function studentsToDoc(students: DayStudents): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [id, e] of Object.entries(students)) out[id] = entryToDoc(e);
  return out;
}
