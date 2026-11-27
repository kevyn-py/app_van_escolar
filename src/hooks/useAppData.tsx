"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { applyStatus, operationalEntries } from "@/domain/day";
import { toDateKey } from "@/domain/dateKey";
import type { DailyRecord, DayStudentEntry, EventEntry, EventKey, EventStatus, Student, UserProfile } from "@/domain/types";
import { ensureDay, setEventEntry, subscribeDay } from "@/services/dailyRecordsService";
import { subscribeStudents } from "@/services/studentsService";
import { ensureUserProfile, subscribeProfile } from "@/services/userService";
import { useAuth } from "./useAuth";

interface AppData {
  uid: string;
  todayKey: string;
  profile: UserProfile | null;
  students: Student[];
  studentsLoaded: boolean;
  /** Registro de hoje com ajustes otimistas aplicados. */
  today: DailyRecord | null;
  todayLoaded: boolean;
  /** Alunos da operação de hoje (sem os removidos). */
  todayEntries: DayStudentEntry[];
  loadError: string | null;
  /** Altera o status e devolve o estado anterior (para "Desfazer"). */
  setStatus: (studentId: string, key: EventKey, status: EventStatus) => Promise<EventEntry>;
  /** Restaura exatamente um estado anterior (usado pelo "Desfazer"). */
  restoreEntry: (studentId: string, key: EventKey, entry: EventEntry) => Promise<void>;
}

const AppDataContext = createContext<AppData | null>(null);

interface Override {
  entry: EventEntry;
  committed: boolean;
  at: number;
}

const overrideKey = (sid: string, key: EventKey) => `${sid}|${key}`;

function sameEntry(a: EventEntry, b: EventEntry): boolean {
  return a.status === b.status && (a.updatedAt?.getTime() ?? null) === (b.updatedAt?.getTime() ?? null);
}

/** Descarta ajustes otimistas já refletidos (ou superados) no servidor. */
function pruneOverrides(cur: Record<string, Override>, record: DailyRecord): Record<string, Override> {
  let changed = false;
  const next: Record<string, Override> = {};
  for (const [k, o] of Object.entries(cur)) {
    const [sid, key] = k.split("|") as [string, EventKey];
    const server = record.students[sid]?.events[key];
    if (o.committed && (!server || sameEntry(server, o.entry) || Date.now() - o.at > 3000)) {
      changed = true;
      continue;
    }
    next[k] = o;
  }
  return changed ? next : cur;
}

export class OfflineError extends Error {
  constructor() {
    super("Sem conexão com a internet.");
  }
}

function useTodayKey(): string {
  const [key, setKey] = useState(() => toDateKey());
  useEffect(() => {
    // Virada de meia-noite com o app aberto (Seção 21).
    const check = () => setKey((cur) => (cur === toDateKey() ? cur : toDateKey()));
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    const id = setInterval(check, 30_000);
    return () => {
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
      clearInterval(id);
    };
  }, []);
  return key;
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { user, signingOut } = useAuth();
  const uid = user && !signingOut ? user.uid : null;
  const todayKey = useTodayKey();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoaded, setStudentsLoaded] = useState(false);
  const [rawToday, setRawToday] = useState<{ key: string; record: DailyRecord | null } | null>(null);
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const ensuring = useRef<string | null>(null);
  const ensuredProfile = useRef(false);

  const onError = useCallback((err: Error) => {
    console.error(err.name);
    setLoadError("Não foi possível carregar os dados. Verifique sua conexão.");
  }, []);

  // Perfil do operador
  useEffect(() => {
    if (!uid || !user) return;
    return subscribeProfile(
      uid,
      (p) => {
        setProfile(p);
        if (!p && !ensuredProfile.current) {
          ensuredProfile.current = true;
          void ensureUserProfile(user).catch(onError);
        }
      },
      onError,
    );
  }, [uid, user, onError]);

  // Cadastro de alunos em tempo real
  useEffect(() => {
    if (!uid) return;
    return subscribeStudents(
      uid,
      (list) => {
        setStudents(list);
        setStudentsLoaded(true);
        setLoadError(null);
      },
      onError,
    );
  }, [uid, onError]);

  // Registro do dia atual em tempo real
  useEffect(() => {
    if (!uid) return;
    return subscribeDay(
      uid,
      todayKey,
      (record) => {
        setRawToday({ key: todayKey, record });
        if (record) setOverrides((cur) => pruneOverrides(cur, record));
      },
      onError,
    );
  }, [uid, todayKey, onError]);

  const todayLoaded = rawToday?.key === todayKey;
  const rawRecord = todayLoaded ? rawToday.record : null;

  // Inicialização automática do dia (RN-07)
  useEffect(() => {
    if (!uid || !studentsLoaded || !todayLoaded || rawRecord) return;
    const active = students.filter((s) => s.active);
    if (active.length === 0 || ensuring.current === todayKey) return;
    ensuring.current = todayKey;
    ensureDay(uid, todayKey, active).catch((err: Error) => {
      ensuring.current = null;
      onError(err);
    });
  }, [uid, studentsLoaded, todayLoaded, rawRecord, students, todayKey, onError]);

  const today = useMemo<DailyRecord | null>(() => {
    if (!rawRecord) return null;
    const keys = Object.keys(overrides);
    if (keys.length === 0) return rawRecord;
    const studentsMap = { ...rawRecord.students };
    for (const k of keys) {
      const [sid, key] = k.split("|") as [string, EventKey];
      const entry = studentsMap[sid];
      const o = overrides[k];
      if (entry && o) studentsMap[sid] = { ...entry, events: { ...entry.events, [key]: o.entry } };
    }
    return { ...rawRecord, students: studentsMap };
  }, [rawRecord, overrides]);

  const todayEntries = useMemo(() => (today ? operationalEntries(today.students) : []), [today]);

  const todayRef = useRef(today);
  useEffect(() => {
    todayRef.current = today;
  }, [today]);

  const write = useCallback(
    async (studentId: string, key: EventKey, entry: EventEntry) => {
      if (!uid) throw new Error("Sessão encerrada.");
      if (typeof navigator !== "undefined" && !navigator.onLine) throw new OfflineError();
      const k = overrideKey(studentId, key);
      // Feedback visual imediato (RNF-03); revertido em caso de falha.
      setOverrides((cur) => ({ ...cur, [k]: { entry, committed: false, at: Date.now() } }));
      try {
        await setEventEntry(uid, todayKey, studentId, key, entry);
        setOverrides((cur) => (cur[k] ? { ...cur, [k]: { ...cur[k], committed: true, at: Date.now() } } : cur));
      } catch (err) {
        setOverrides((cur) => {
          const next = { ...cur };
          delete next[k];
          return next;
        });
        throw err;
      }
    },
    [uid, todayKey],
  );

  const setStatus = useCallback(
    async (studentId: string, key: EventKey, status: EventStatus) => {
      const previous = todayRef.current?.students[studentId]?.events[key];
      if (!previous) throw new Error("Aluno não encontrado no dia.");
      await write(studentId, key, applyStatus(status));
      return previous;
    },
    [write],
  );

  const value = useMemo<AppData>(
    () => ({
      uid: uid ?? "",
      todayKey,
      profile,
      students,
      studentsLoaded,
      today,
      todayLoaded,
      todayEntries,
      loadError,
      setStatus,
      restoreEntry: write,
    }),
    [uid, todayKey, profile, students, studentsLoaded, today, todayLoaded, todayEntries, loadError, setStatus, write],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppData {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData deve ser usado dentro de AppDataProvider");
  return ctx;
}
