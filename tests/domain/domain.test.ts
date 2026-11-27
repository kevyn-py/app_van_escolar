import { describe, expect, it } from "vitest";
import { formatDateLong, formatTime, isPastDateKey, isValidDateKey, toDateKey } from "@/domain/dateKey";
import {
  applyStatus,
  buildDayStudents,
  computeSummary,
  createDayEntry,
  deactivationOutcome,
  initialEvents,
  isAwaitingDropoff,
  progress,
} from "@/domain/day";
import { nextDayEntry } from "@/domain/membership";
import { filterAndSortEntries, hasDuplicateActiveName, matchesSearch, validateStudentName } from "@/domain/text";
import type { DayStudents, EventKey, Student } from "@/domain/types";

const mk = (id: string, name: string, extra: Partial<Student> = {}): Student => ({
  id,
  name,
  active: true,
  avatarIcon: "star",
  avatarColor: "sky",
  routeProfile: "ida_e_volta",
  createdAt: null,
  updatedAt: null,
  ...extra,
});

describe("dateKey no fuso local (RNF-09)", () => {
  it("usa a data local perto da virada do dia", () => {
    expect(toDateKey(new Date(2026, 10, 26, 23, 55))).toBe("2026-11-26");
    expect(toDateKey(new Date(2026, 10, 27, 0, 5))).toBe("2026-11-27");
    expect(toDateKey(new Date(2026, 0, 1, 0, 0))).toBe("2026-01-01");
  });

  it("valida formato e datas reais", () => {
    expect(isValidDateKey("2026-11-26")).toBe(true);
    expect(isValidDateKey("2026-02-30")).toBe(false);
    expect(isValidDateKey("26/11/2026")).toBe(false);
  });

  it("identifica datas anteriores como imutáveis", () => {
    expect(isPastDateKey("2026-11-25", "2026-11-26")).toBe(true);
    expect(isPastDateKey("2026-11-26", "2026-11-26")).toBe(false);
    expect(isPastDateKey("2025-12-31", "2026-01-01")).toBe(true);
  });

  it("formata em pt-BR", () => {
    expect(formatDateLong("2026-11-26")).toBe("Quinta-feira, 26/11/2026");
    expect(formatTime(new Date(2026, 10, 26, 7, 2))).toBe("07:02");
  });
});

describe("inicialização do dia (RN-04 / RN-06)", () => {
  it("respeita o perfil de trajeto", () => {
    const ida = initialEvents("somente_ida");
    expect(ida.embarque_escola.status).toBe("pendente");
    expect(ida.desembarque_escola.status).toBe("pendente");
    expect(ida.embarque_casa).toEqual({ status: "nao_se_aplica", updatedAt: null });
    expect(ida.desembarque_casa.status).toBe("nao_se_aplica");

    const volta = initialEvents("somente_volta");
    expect(volta.embarque_escola.status).toBe("nao_se_aplica");
    expect(volta.embarque_casa.status).toBe("pendente");

    expect(Object.values(initialEvents("ida_e_volta")).every((e) => e.status === "pendente")).toBe(true);
  });

  it("ignora alunos inativos e guarda snapshot", () => {
    const day = buildDayStudents([mk("a", "Arthur"), mk("b", "Beatriz", { active: false })]);
    expect(Object.keys(day)).toEqual(["a"]);
    expect(day.a?.nameSnapshot).toBe("Arthur");
    expect(day.a?.routeProfileSnapshot).toBe("ida_e_volta");
  });
});

describe("contadores (RN-05 / CA-05)", () => {
  it("10 alunos, 10 confirmados no embarque e 1 falta no desembarque", () => {
    const students = Array.from({ length: 10 }, (_, i) => mk(`s${i}`, `Aluno ${i}`));
    const day = buildDayStudents(students);
    for (const s of students) day[s.id]!.events.embarque_escola = applyStatus("confirmado");
    day.s0!.events.desembarque_escola = applyStatus("nao_compareceu");
    const sum = computeSummary(day);
    expect(sum.total).toEqual({ confirmed: 10, pending: 29, absent: 1, notApplicable: 0 });
    expect(sum.events.embarque_escola.confirmed).toBe(10);
    expect(sum.events.desembarque_escola).toEqual({ confirmed: 0, pending: 9, absent: 1, notApplicable: 0 });
    expect(progress(sum.total)).toEqual({ done: 11, total: 40, percent: 28 });
  });

  it("não conta 'não se aplica' como pendência", () => {
    const day = buildDayStudents([
      ...Array.from({ length: 13 }, (_, i) => mk(`v${i}`, `V ${i}`)),
      mk("x", "X", { routeProfile: "somente_ida" }),
      mk("y", "Y", { routeProfile: "somente_ida" }),
    ]);
    const c = computeSummary(day).events.embarque_casa;
    expect(c.pending).toBe(13);
    expect(c.notApplicable).toBe(2);
  });

  it("exclui alunos removidos hoje da base operacional", () => {
    const day: DayStudents = buildDayStudents([mk("a", "A"), mk("b", "B")]);
    day.b = { ...day.b!, removed: true };
    expect(computeSummary(day).total.pending).toBe(4);
  });
});

describe("status e independência dos eventos (RN-01 / RN-12)", () => {
  it("registra horário e limpa ao voltar para pendente", () => {
    const now = new Date(2026, 10, 26, 7, 12);
    expect(applyStatus("confirmado", now)).toEqual({ status: "confirmado", updatedAt: now });
    expect(applyStatus("pendente", now)).toEqual({ status: "pendente", updatedAt: null });
  });

  it("confirmar um evento não altera os demais", () => {
    const entry = createDayEntry(mk("a", "Beatriz"));
    const next = { ...entry, events: { ...entry.events, embarque_escola: applyStatus("confirmado") } };
    for (const k of ["desembarque_escola", "embarque_casa", "desembarque_casa"] as EventKey[]) {
      expect(next.events[k]).toEqual(entry.events[k]);
    }
  });

  it("alerta de embarcado aguardando desembarque (RN-14)", () => {
    const entry = createDayEntry(mk("a", "Arthur"));
    entry.events.embarque_escola = applyStatus("confirmado");
    expect(isAwaitingDropoff(entry, "desembarque_escola")).toBe(true);
    expect(isAwaitingDropoff(entry, "embarque_escola")).toBe(false);
    expect(isAwaitingDropoff(entry, "desembarque_casa")).toBe(false);
    entry.events.desembarque_escola = applyStatus("confirmado");
    expect(isAwaitingDropoff(entry, "desembarque_escola")).toBe(false);
    entry.events.embarque_casa = applyStatus("confirmado");
    expect(isAwaitingDropoff(entry, "desembarque_casa")).toBe(true);
  });
});

describe("sincronização do cadastro com o dia atual (RN-08)", () => {
  it("desativação sem registro efetivo remove; com registro mantém marcado", () => {
    const clean = createDayEntry(mk("a", "A"));
    expect(deactivationOutcome(clean)).toBe("remove");
    expect(nextDayEntry(clean, mk("a", "A"), false)).toBeNull();

    const used = createDayEntry(mk("a", "A"));
    used.events.embarque_escola = applyStatus("confirmado");
    expect(nextDayEntry(used, mk("a", "A"), false)).toMatchObject({ removed: true });

    const absent = createDayEntry(mk("a", "A"));
    absent.events.embarque_escola = applyStatus("nao_compareceu");
    expect(deactivationOutcome(absent)).toBe("keep_marked");
  });

  it("novo aluno ativo entra no dia; inativo sem entrada não muda nada", () => {
    expect(nextDayEntry(undefined, mk("n", "Novo", { routeProfile: "somente_volta" }), true)?.events.embarque_escola.status).toBe(
      "nao_se_aplica",
    );
    expect(nextDayEntry(undefined, mk("n", "Novo"), false)).toBeUndefined();
  });

  it("edição atualiza snapshot de hoje e só reinicia eventos se nada foi registrado", () => {
    const entry = createDayEntry(mk("a", "Arthur"));
    const renamed = nextDayEntry(entry, mk("a", "Arthur Silva", { routeProfile: "somente_ida" }), true);
    expect(renamed?.nameSnapshot).toBe("Arthur Silva");
    expect(renamed?.events.embarque_casa.status).toBe("nao_se_aplica");

    entry.events.embarque_escola = applyStatus("confirmado");
    const kept = nextDayEntry(entry, mk("a", "Arthur", { routeProfile: "somente_volta" }), true);
    expect(kept?.events.embarque_escola.status).toBe("confirmado");
    expect(kept?.routeProfileSnapshot).toBe("ida_e_volta");
  });

  it("reativação desfaz a marcação de removido", () => {
    const entry = { ...createDayEntry(mk("a", "A")), removed: true };
    expect(nextDayEntry(entry, mk("a", "A"), true)?.removed).toBe(false);
  });
});

describe("busca, validação e ordenação", () => {
  it("busca insensível a acentos e maiúsculas", () => {
    expect(matchesSearch("João Conceição", "joao conceicao")).toBe(true);
    expect(matchesSearch("Beatriz", "BEA")).toBe(true);
    expect(matchesSearch("Beatriz", "lu")).toBe(false);
  });

  it("valida nome", () => {
    expect(validateStudentName("   ")).not.toBeNull();
    expect(validateStudentName("A")).not.toBeNull();
    expect(validateStudentName("Lucas Mendes")).toBeNull();
    expect(validateStudentName("x".repeat(81))).not.toBeNull();
  });

  it("detecta nome duplicado entre ativos", () => {
    const list = [mk("a", "Lucas"), mk("b", "Ana", { active: false })];
    expect(hasDuplicateActiveName(list, "lúcas")).toBe(true);
    expect(hasDuplicateActiveName(list, "Ana")).toBe(false);
    expect(hasDuplicateActiveName(list, "Lucas", "a")).toBe(false);
  });

  it("pendentes no topo, depois ordem alfabética; filtros", () => {
    const day = buildDayStudents([mk("a", "Carlos"), mk("b", "Ana"), mk("c", "Bruno")]);
    day.b!.events.embarque_escola = applyStatus("confirmado");
    const entries = Object.values(day);
    const pf = filterAndSortEntries(entries, "embarque_escola", { filter: "todos", query: "", sort: "pending_first" });
    expect(pf.map((e) => e.nameSnapshot)).toEqual(["Bruno", "Carlos", "Ana"]);
    const al = filterAndSortEntries(entries, "embarque_escola", { filter: "todos", query: "", sort: "alphabetical" });
    expect(al.map((e) => e.nameSnapshot)).toEqual(["Ana", "Bruno", "Carlos"]);
    expect(filterAndSortEntries(entries, "embarque_escola", { filter: "concluidos", query: "", sort: "alphabetical" })).toHaveLength(1);
    expect(filterAndSortEntries(entries, "embarque_escola", { filter: "pendentes", query: "", sort: "alphabetical" })).toHaveLength(2);
  });
});
