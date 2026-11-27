import { createDayEntry, deactivationOutcome, initialEvents, isPristine } from "./day";
import type { DayStudentEntry, Student } from "./types";

/**
 * Calcula a nova entrada do aluno no dia atual conforme RN-08 / Decisões 3 e 6.
 * Retorna undefined quando nada deve mudar no registro do dia.
 */
export function nextDayEntry(
  current: DayStudentEntry | undefined,
  student: Pick<Student, "id" | "name" | "avatarIcon" | "avatarColor" | "routeProfile">,
  active: boolean,
): DayStudentEntry | null | undefined {
  if (!active) {
    if (!current) return undefined;
    if (current.removed) return undefined;
    return deactivationOutcome(current) === "remove" ? null : { ...current, removed: true };
  }
  if (!current) return createDayEntry(student);
  const profileChanged = current.routeProfileSnapshot !== student.routeProfile;
  return {
    ...current,
    removed: false,
    nameSnapshot: student.name,
    avatarIconSnapshot: student.avatarIcon,
    avatarColorSnapshot: student.avatarColor,
    // Só reinicializa os eventos se o operador ainda não registrou nada hoje.
    ...(profileChanged && isPristine(current)
      ? { routeProfileSnapshot: student.routeProfile, events: initialEvents(student.routeProfile) }
      : {}),
  };
}
