import { eventsForProfile } from "./events";
import {
  EVENT_KEYS,
  type Counts,
  type DayEvents,
  type DayStudentEntry,
  type DayStudents,
  type DaySummary,
  type EventEntry,
  type EventKey,
  type EventStatus,
  type RouteProfile,
  type Student,
} from "./types";

/** Eventos iniciais: pendente para os do perfil, não se aplica (sem horário) para os demais (RN-04). */
export function initialEvents(profile: RouteProfile): DayEvents {
  const included = new Set(eventsForProfile(profile));
  const events = {} as DayEvents;
  for (const key of EVENT_KEYS) {
    events[key] = { status: included.has(key) ? "pendente" : "nao_se_aplica", updatedAt: null };
  }
  return events;
}

/** Cria a entrada do aluno no dia com snapshot dos dados de identificação (RN-10). */
export function createDayEntry(student: Pick<Student, "id" | "name" | "avatarIcon" | "avatarColor" | "routeProfile">): DayStudentEntry {
  return {
    studentId: student.id,
    nameSnapshot: student.name,
    avatarIconSnapshot: student.avatarIcon,
    avatarColorSnapshot: student.avatarColor,
    routeProfileSnapshot: student.routeProfile,
    events: initialEvents(student.routeProfile),
  };
}

/** Apenas alunos ativos entram na operação do dia (RN-06). */
export function buildDayStudents(students: Student[]): DayStudents {
  const map: DayStudents = {};
  for (const s of students) {
    if (s.active) map[s.id] = createDayEntry(s);
  }
  return map;
}

/** Novo estado do evento. Reverter para pendente limpa o horário (RN-12). */
export function applyStatus(status: EventStatus, now: Date = new Date()): EventEntry {
  return { status, updatedAt: status === "pendente" ? null : now };
}

export function emptyCounts(): Counts {
  return { confirmed: 0, pending: 0, absent: 0, notApplicable: 0 };
}

function addStatus(c: Counts, status: EventStatus): void {
  if (status === "confirmado") c.confirmed++;
  else if (status === "pendente") c.pending++;
  else if (status === "nao_compareceu") c.absent++;
  else c.notApplicable++;
}

/** Entradas que fazem parte da operação (exclui alunos removidos hoje). */
export function operationalEntries(students: DayStudents): DayStudentEntry[] {
  return Object.values(students).filter((e) => !e.removed);
}

export function countEvent(entries: DayStudentEntry[], key: EventKey): Counts {
  const c = emptyCounts();
  for (const e of entries) addStatus(c, e.events[key].status);
  return c;
}

/**
 * Totais do dia e por evento. Alunos removidos hoje não entram na base da operação,
 * mas continuam no documento para rastreabilidade (RN-08).
 */
export function computeSummary(students: DayStudents): DaySummary {
  const entries = operationalEntries(students);
  const total = emptyCounts();
  const events = {} as Record<EventKey, Counts>;
  for (const key of EVENT_KEYS) {
    const c = countEvent(entries, key);
    events[key] = c;
    total.confirmed += c.confirmed;
    total.pending += c.pending;
    total.absent += c.absent;
    total.notApplicable += c.notApplicable;
  }
  return { total, events };
}

/** Total aplicável: confirmado + pendente + não compareceu (RN-05). */
export function applicable(c: Counts): number {
  return c.confirmed + c.pending + c.absent;
}

/** Verificações concluídas = confirmados + não compareceu. */
export function progress(c: Counts): { done: number; total: number; percent: number } {
  const total = applicable(c);
  const done = c.confirmed + c.absent;
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

/** RN-14 / RF-24: embarcado e ainda pendente no desembarque correspondente. */
export function isAwaitingDropoff(entry: DayStudentEntry, key: EventKey): boolean {
  if (key === "desembarque_escola") {
    return entry.events.embarque_escola.status === "confirmado" && entry.events.desembarque_escola.status === "pendente";
  }
  if (key === "desembarque_casa") {
    return entry.events.embarque_casa.status === "confirmado" && entry.events.desembarque_casa.status === "pendente";
  }
  return false;
}

/** Possui ao menos um evento com registro efetivo (confirmado ou não compareceu). */
export function hasEffectiveRecord(entry: DayStudentEntry): boolean {
  return EVENT_KEYS.some((k) => {
    const s = entry.events[k].status;
    return s === "confirmado" || s === "nao_compareceu";
  });
}

/** Nenhum evento foi tocado pelo operador (todos sem horário). */
export function isPristine(entry: DayStudentEntry): boolean {
  return EVENT_KEYS.every((k) => entry.events[k].updatedAt === null);
}

export type DeactivationOutcome = "remove" | "keep_marked";

/** RN-08: ao desativar/excluir hoje, remove se não houver registro efetivo; senão mantém marcado. */
export function deactivationOutcome(entry: DayStudentEntry): DeactivationOutcome {
  return hasEffectiveRecord(entry) ? "keep_marked" : "remove";
}
