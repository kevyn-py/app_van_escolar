/** Tipos centrais do domínio. Independentes do Firebase e do React. */

export const EVENT_KEYS = [
  "embarque_escola",
  "desembarque_escola",
  "embarque_casa",
  "desembarque_casa",
] as const;
export type EventKey = (typeof EVENT_KEYS)[number];

export const EVENT_STATUSES = ["pendente", "confirmado", "nao_compareceu", "nao_se_aplica"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const ROUTE_PROFILES = ["ida_e_volta", "somente_ida", "somente_volta"] as const;
export type RouteProfile = (typeof ROUTE_PROFILES)[number];

export const SORT_PREFERENCES = ["pending_first", "alphabetical"] as const;
export type SortPreference = (typeof SORT_PREFERENCES)[number];

export type EventFilter = "todos" | "pendentes" | "concluidos";

export interface Student {
  id: string;
  name: string;
  active: boolean;
  avatarIcon: string;
  avatarColor: string;
  routeProfile: RouteProfile;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export type StudentInput = Pick<Student, "name" | "active" | "avatarIcon" | "avatarColor" | "routeProfile">;

export interface EventEntry {
  status: EventStatus;
  /** null quando pendente ou quando "não se aplica" foi pré-definido pelo perfil. */
  updatedAt: Date | null;
}

export type DayEvents = Record<EventKey, EventEntry>;

export interface DayStudentEntry {
  studentId: string;
  nameSnapshot: string;
  avatarIconSnapshot: string;
  avatarColorSnapshot: string;
  routeProfileSnapshot: RouteProfile;
  /** true quando o aluno foi desativado/excluído hoje após já ter registro efetivo (RN-08). */
  removed?: boolean;
  events: DayEvents;
}

export type DayStudents = Record<string, DayStudentEntry>;

export interface Counts {
  confirmed: number;
  pending: number;
  absent: number;
  notApplicable: number;
}

export interface DaySummary {
  total: Counts;
  events: Record<EventKey, Counts>;
}

export interface DailyRecord {
  date: string;
  studentCount: number;
  summary: DaySummary;
  students: DayStudents;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface UserProfile {
  displayName: string;
  email: string;
  preferences: { defaultEventSort: SortPreference };
}
