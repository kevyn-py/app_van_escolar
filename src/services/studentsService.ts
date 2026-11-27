import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { nextDayEntry } from "@/domain/membership";
import { cleanName } from "@/domain/text";
import type { Student, StudentInput } from "@/domain/types";
import { dailyRecordFromDoc, studentFromDoc } from "./converters";
import { dayRef, writeEntryChange } from "./dailyRecordsService";

function studentsCol(uid: string) {
  return collection(firestore(), "users", uid, "students");
}

export function subscribeStudents(
  uid: string,
  onData: (students: Student[]) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    studentsCol(uid),
    (snap) => onData(snap.docs.map((d) => studentFromDoc(d.id, d.data()))),
    onError,
  );
}

function sanitize(input: StudentInput): StudentInput {
  // Somente os campos permitidos do cadastro (minimização de dados — LGPD).
  return {
    name: cleanName(input.name),
    active: input.active,
    avatarIcon: input.avatarIcon,
    avatarColor: input.avatarColor,
    routeProfile: input.routeProfile,
  };
}

export async function createStudent(uid: string, input: StudentInput, todayKey: string): Promise<string> {
  const data = sanitize(input);
  const ref = doc(studentsCol(uid));
  const today = dayRef(uid, todayKey);
  await runTransaction(firestore(), async (tx) => {
    const daySnap = await tx.get(today);
    tx.set(ref, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    if (daySnap.exists() && data.active) {
      const record = dailyRecordFromDoc(daySnap.data());
      const next = nextDayEntry(record.students[ref.id], { id: ref.id, ...data }, true);
      if (next !== undefined) writeEntryChange(tx, today, record.students, ref.id, next);
    }
  });
  return ref.id;
}

export async function updateStudent(uid: string, id: string, input: StudentInput, todayKey: string): Promise<void> {
  const data = sanitize(input);
  const ref = doc(studentsCol(uid), id);
  const today = dayRef(uid, todayKey);
  await runTransaction(firestore(), async (tx) => {
    const daySnap = await tx.get(today);
    tx.update(ref, { ...data, updatedAt: serverTimestamp() });
    if (daySnap.exists()) {
      const record = dailyRecordFromDoc(daySnap.data());
      const next = nextDayEntry(record.students[id], { id, ...data }, data.active);
      if (next !== undefined) writeEntryChange(tx, today, record.students, id, next);
    }
  });
}

/** Exclui o cadastro. Registros de dias anteriores permanecem intactos (RF-09 / RN-10). */
export async function deleteStudent(uid: string, student: Student, todayKey: string): Promise<void> {
  const ref = doc(studentsCol(uid), student.id);
  const today = dayRef(uid, todayKey);
  await runTransaction(firestore(), async (tx) => {
    const daySnap = await tx.get(today);
    if (daySnap.exists()) {
      const record = dailyRecordFromDoc(daySnap.data());
      const next = nextDayEntry(record.students[student.id], student, false);
      if (next !== undefined) writeEntryChange(tx, today, record.students, student.id, next);
    }
    tx.delete(ref);
  });
}
