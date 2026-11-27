/**
 * Testes das Firestore Security Rules no Firebase Emulator.
 * Executar com: npm run test:rules (requer Java para o emulador).
 */
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, Timestamp, updateDoc } from "firebase/firestore";

let env: RulesTestEnvironment;

const utcKey = (offsetDays: number) => {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return d.toISOString().slice(0, 10);
};
const TODAY = utcKey(0);
const PAST = utcKey(-10);
const FUTURE = utcKey(5);

const counts = { confirmed: 0, pending: 4, absent: 0, notApplicable: 0 };
const summary = {
  total: counts,
  events: { embarque_escola: counts, desembarque_escola: counts, embarque_casa: counts, desembarque_casa: counts },
};

const ev = (status = "pendente") => ({ status, updatedAt: null });
const entry = (id: string) => ({
  studentId: id,
  nameSnapshot: "Arthur",
  avatarIconSnapshot: "star",
  avatarColorSnapshot: "sky",
  routeProfileSnapshot: "ida_e_volta",
  removed: false,
  events: { embarque_escola: ev(), desembarque_escola: ev(), embarque_casa: ev(), desembarque_casa: ev() },
});

const dayDoc = (date: string) => ({
  date,
  studentCount: 2,
  summary,
  students: { s1: entry("s1"), s2: entry("s2") },
  lastChangedStudentId: null,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});

const student = {
  name: "Lucas Mendes",
  active: true,
  avatarIcon: "star",
  avatarColor: "sky",
  routeProfile: "somente_ida",
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
};

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-van-escolar",
    firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
});

const alice = () => env.authenticatedContext("alice").firestore();
const bob = () => env.authenticatedContext("bob").firestore();
const anon = () => env.unauthenticatedContext().firestore();

async function seed(path: string, data: Record<string, unknown>) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), path), data);
  });
}

describe("isolamento por usuário", () => {
  it("bloqueia usuário não autenticado", async () => {
    await assertFails(getDoc(doc(anon(), "users/alice")));
    await assertFails(setDoc(doc(anon(), "users/alice/students/x"), student));
    await assertFails(getDoc(doc(anon(), `users/alice/dailyRecords/${TODAY}`)));
  });

  it("usuário A não lê nem escreve dados do usuário B", async () => {
    await seed("users/alice/students/s1", { ...student, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
    await assertFails(getDoc(doc(bob(), "users/alice/students/s1")));
    await assertFails(setDoc(doc(bob(), "users/alice/students/s2"), student));
    await assertSucceeds(getDoc(doc(alice(), "users/alice/students/s1")));
  });

  it("bloqueia caminhos fora de users/{uid}", async () => {
    await assertFails(setDoc(doc(alice(), "outros/x"), { a: 1 }));
  });
});

describe("perfil do operador", () => {
  it("valida estrutura", async () => {
    const base = { displayName: "Maria", email: "m@ex.com", createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    await assertSucceeds(setDoc(doc(alice(), "users/alice"), { ...base, preferences: { defaultEventSort: "alphabetical" } }));
    await assertFails(setDoc(doc(alice(), "users/alice"), { ...base, preferences: { defaultEventSort: "x" } }));
    await assertFails(setDoc(doc(alice(), "users/alice"), { ...base, telefone: "123" }));
  });
});

describe("cadastro de alunos", () => {
  it("aceita cadastro válido e exclusão", async () => {
    await assertSucceeds(setDoc(doc(alice(), "users/alice/students/s1"), student));
    await assertSucceeds(deleteDoc(doc(alice(), "users/alice/students/s1")));
  });

  it("rejeita perfil inválido, nome curto e campos extras (ex.: foto)", async () => {
    await assertFails(setDoc(doc(alice(), "users/alice/students/s1"), { ...student, routeProfile: "manha" }));
    await assertFails(setDoc(doc(alice(), "users/alice/students/s1"), { ...student, name: "A" }));
    await assertFails(setDoc(doc(alice(), "users/alice/students/s1"), { ...student, photoUrl: "http://x" }));
  });
});

describe("registros diários", () => {
  it("permite criar o dia atual e rejeita data passada, futura ou formato inválido", async () => {
    await assertSucceeds(setDoc(doc(alice(), `users/alice/dailyRecords/${TODAY}`), dayDoc(TODAY)));
    await assertFails(setDoc(doc(alice(), `users/alice/dailyRecords/${PAST}`), dayDoc(PAST)));
    await assertFails(setDoc(doc(alice(), `users/alice/dailyRecords/${FUTURE}`), dayDoc(FUTURE)));
    await assertFails(setDoc(doc(alice(), "users/alice/dailyRecords/26-11-2026"), dayDoc("26-11-2026")));
  });

  it("rejeita date diferente do ID do documento", async () => {
    await assertFails(setDoc(doc(alice(), `users/alice/dailyRecords/${TODAY}`), dayDoc(PAST)));
  });

  it("aceita alteração pontual válida de status no dia atual", async () => {
    await assertSucceeds(setDoc(doc(alice(), `users/alice/dailyRecords/${TODAY}`), dayDoc(TODAY)));
    await assertSucceeds(
      updateDoc(doc(alice(), `users/alice/dailyRecords/${TODAY}`), {
        "students.s1.events.embarque_escola": { status: "confirmado", updatedAt: Timestamp.now() },
        lastChangedStudentId: "s1",
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("rejeita status inválido", async () => {
    await assertSucceeds(setDoc(doc(alice(), `users/alice/dailyRecords/${TODAY}`), dayDoc(TODAY)));
    await assertFails(
      updateDoc(doc(alice(), `users/alice/dailyRecords/${TODAY}`), {
        "students.s1.events.embarque_escola": { status: "ausente", updatedAt: null },
        lastChangedStudentId: "s1",
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("rejeita alteração de um aluno diferente do declarado", async () => {
    await assertSucceeds(setDoc(doc(alice(), `users/alice/dailyRecords/${TODAY}`), dayDoc(TODAY)));
    await assertFails(
      updateDoc(doc(alice(), `users/alice/dailyRecords/${TODAY}`), {
        "students.s2.events.embarque_escola": { status: "confirmado", updatedAt: Timestamp.now() },
        lastChangedStudentId: "s1",
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("bloqueia edição e exclusão de dias anteriores (RN-09)", async () => {
    await seed(`users/alice/dailyRecords/${PAST}`, { ...dayDoc(PAST), createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
    await assertSucceeds(getDoc(doc(alice(), `users/alice/dailyRecords/${PAST}`)));
    await assertFails(
      updateDoc(doc(alice(), `users/alice/dailyRecords/${PAST}`), {
        "students.s1.events.embarque_escola": { status: "confirmado", updatedAt: Timestamp.now() },
        lastChangedStudentId: "s1",
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(deleteDoc(doc(alice(), `users/alice/dailyRecords/${PAST}`)));
  });

  it("nunca permite apagar o registro do dia atual", async () => {
    await assertSucceeds(setDoc(doc(alice(), `users/alice/dailyRecords/${TODAY}`), dayDoc(TODAY)));
    await assertFails(deleteDoc(doc(alice(), `users/alice/dailyRecords/${TODAY}`)));
  });
});
