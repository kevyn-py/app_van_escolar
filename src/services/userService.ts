import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc, type Unsubscribe } from "firebase/firestore";
import { updateProfile, type User } from "firebase/auth";
import { firestore } from "@/lib/firebase";
import { SORT_PREFERENCES, type SortPreference, type UserProfile } from "@/domain/types";

function userRef(uid: string) {
  return doc(firestore(), "users", uid);
}

/** Cria o documento do operador caso ainda não exista (ex.: conta criada no console). */
export async function ensureUserProfile(user: User, displayName?: string): Promise<void> {
  const ref = userRef(user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;
  await setDoc(ref, {
    displayName: (displayName ?? user.displayName ?? "").trim() || "Operador",
    email: user.email ?? "",
    preferences: { defaultEventSort: "pending_first" },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function subscribeProfile(
  uid: string,
  onData: (profile: UserProfile | null) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    userRef(uid),
    (snap) => {
      if (!snap.exists()) return onData(null);
      const d = snap.data();
      const sort = d.preferences?.defaultEventSort;
      onData({
        displayName: String(d.displayName ?? ""),
        email: String(d.email ?? ""),
        preferences: {
          defaultEventSort: (SORT_PREFERENCES as readonly string[]).includes(sort) ? sort : "pending_first",
        },
      });
    },
    onError,
  );
}

export async function updateDisplayName(user: User, displayName: string): Promise<void> {
  const name = displayName.replace(/\s+/g, " ").trim();
  await updateProfile(user, { displayName: name });
  await updateDoc(userRef(user.uid), { displayName: name, updatedAt: serverTimestamp() });
}

export async function updateSortPreference(uid: string, sort: SortPreference): Promise<void> {
  await updateDoc(userRef(uid), { "preferences.defaultEventSort": sort, updatedAt: serverTimestamp() });
}
