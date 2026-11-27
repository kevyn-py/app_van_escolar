import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  startAfter,
  Timestamp,
  type DocumentReference,
  type Transaction,
  type Unsubscribe,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { buildDayStudents, computeSummary } from "@/domain/day";
import type { DailyRecord, DayStudentEntry, DayStudents, EventEntry, EventKey, Student } from "@/domain/types";
import { dailyRecordFromDoc, entryToDoc, studentsToDoc } from "./converters";

export function dayRef(uid: string, dateKey: string): DocumentReference {
  return doc(firestore(), "users", uid, "dailyRecords", dateKey);
}

export function subscribeDay(
  uid: string,
  dateKey: string,
  onData: (record: DailyRecord | null) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    dayRef(uid, dateKey),
    (snap) => onData(snap.exists() ? dailyRecordFromDoc(snap.data()) : null),
    onError,
  );
}

/** Cria o registro do dia a partir dos alunos ativos, somente se ainda não existir (RN-07). */
export async function ensureDay(uid: string, dateKey: string, students: Student[]): Promise<void> {
  const ref = dayRef(uid, dateKey);
  const dayStudents = buildDayStudents(students);
  if (Object.keys(dayStudents).length === 0) return; // sem alunos ativos não gera registro vazio
  await runTransaction(firestore(), async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists()) return;
    tx.set(ref, {
      date: dateKey,
      studentCount: Object.keys(dayStudents).length,
      summary: computeSummary(dayStudents),
      students: studentsToDoc(dayStudents),
      lastChangedStudentId: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
}

/**
 * Grava, dentro de uma transação já iniciada, a alteração de UM aluno no documento do dia.
 * Usa caminho pontual (students.{id}) para não sobrescrever outros alunos (RNF-04) e
 * recalcula o resumo com base no estado lido do servidor.
 */
export function writeEntryChange(
  tx: Transaction,
  ref: DocumentReference,
  current: DayStudents,
  studentId: string,
  next: DayStudentEntry | null,
): void {
  const students: DayStudents = { ...current };
  if (next) students[studentId] = next;
  else delete students[studentId];
  tx.update(ref, {
    [`students.${studentId}`]: next ? entryToDoc(next) : deleteField(),
    studentCount: Object.keys(students).length,
    summary: computeSummary(students),
    lastChangedStudentId: studentId,
    updatedAt: serverTimestamp(),
  });
}

export class DayWriteError extends Error {}

/** Altera o status de um único evento de um aluno no dia (RF-20/RF-21). */
export async function setEventEntry(
  uid: string,
  dateKey: string,
  studentId: string,
  eventKey: EventKey,
  entry: EventEntry,
): Promise<void> {
  const ref = dayRef(uid, dateKey);
  await runTransaction(firestore(), async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new DayWriteError("Registro do dia não encontrado.");
    const record = dailyRecordFromDoc(snap.data());
    const current = record.students[studentId];
    if (!current || current.removed) throw new DayWriteError("Aluno não está na operação de hoje.");
    const students: DayStudents = {
      ...record.students,
      [studentId]: { ...current, events: { ...current.events, [eventKey]: entry } },
    };
    tx.update(ref, {
      [`students.${studentId}.events.${eventKey}`]: {
        status: entry.status,
        updatedAt: entry.updatedAt ? Timestamp.fromDate(entry.updatedAt) : null,
      },
      summary: computeSummary(students),
      lastChangedStudentId: studentId,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function getDay(uid: string, dateKey: string): Promise<DailyRecord | null> {
  const snap = await getDoc(dayRef(uid, dateKey));
  return snap.exists() ? dailyRecordFromDoc(snap.data()) : null;
}

export const HISTORY_PAGE_SIZE = 15;

export async function listDays(
  uid: string,
  afterDate?: string,
): Promise<{ records: DailyRecord[]; hasMore: boolean }> {
  const col = collection(firestore(), "users", uid, "dailyRecords");
  const q = afterDate
    ? query(col, orderBy("date", "desc"), startAfter(afterDate), limit(HISTORY_PAGE_SIZE))
    : query(col, orderBy("date", "desc"), limit(HISTORY_PAGE_SIZE));
  const snap = await getDocs(q);
  return {
    records: snap.docs.map((d) => dailyRecordFromDoc(d.data())),
    hasMore: snap.docs.length === HISTORY_PAGE_SIZE,
  };
}
