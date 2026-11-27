import type { DayStudentEntry, EventFilter, EventKey, SortPreference, Student } from "./types";

/** Normaliza para busca insensível a maiúsculas e acentos (RF-10). */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function matchesSearch(name: string, query: string): boolean {
  const q = normalizeText(query);
  return q === "" || normalizeText(name).includes(q);
}

export function compareNames(a: string, b: string): number {
  return a.localeCompare(b, "pt-BR", { sensitivity: "base" });
}

export const NAME_MIN = 2;
export const NAME_MAX = 80;

export function cleanName(name: string): string {
  return name.replace(/\s+/g, " ").trim();
}

/** Retorna mensagem de erro ou null. */
export function validateStudentName(name: string): string | null {
  const n = cleanName(name);
  if (n.length === 0) return "Informe o nome do aluno.";
  if (n.length < NAME_MIN) return `O nome deve ter pelo menos ${NAME_MIN} caracteres.`;
  if (n.length > NAME_MAX) return `O nome deve ter no máximo ${NAME_MAX} caracteres.`;
  return null;
}

/** Aviso não bloqueante de nome duplicado entre alunos ativos. */
export function hasDuplicateActiveName(students: Student[], name: string, excludeId?: string): boolean {
  const n = normalizeText(name);
  return students.some((s) => s.active && s.id !== excludeId && normalizeText(s.name) === n);
}

export function filterAndSortEntries(
  entries: DayStudentEntry[],
  key: EventKey,
  options: { filter: EventFilter; query: string; sort: SortPreference },
): DayStudentEntry[] {
  const filtered = entries.filter((e) => {
    if (!matchesSearch(e.nameSnapshot, options.query)) return false;
    const status = e.events[key].status;
    if (options.filter === "pendentes") return status === "pendente";
    if (options.filter === "concluidos") return status !== "pendente";
    return true;
  });
  return filtered.sort((a, b) => {
    if (options.sort === "pending_first") {
      const pa = a.events[key].status === "pendente" ? 0 : 1;
      const pb = b.events[key].status === "pendente" ? 0 : 1;
      if (pa !== pb) return pa - pb;
    }
    return compareNames(a.nameSnapshot, b.nameSnapshot);
  });
}
