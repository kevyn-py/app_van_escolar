import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { firebaseAuth as auth } from "@/lib/firebase";
import { ensureUserProfile } from "./userService";

export async function signIn(email: string, password: string): Promise<void> {
  const cred = await signInWithEmailAndPassword(auth(), email.trim(), password);
  await ensureUserProfile(cred.user);
}

export async function signUp(displayName: string, email: string, password: string): Promise<void> {
  const cred = await createUserWithEmailAndPassword(auth(), email.trim(), password);
  await updateProfile(cred.user, { displayName: displayName.trim() });
  await ensureUserProfile(cred.user, displayName.trim());
  try {
    auth().languageCode = "pt-BR";
    await sendEmailVerification(cred.user);
  } catch {
    // Verificação é complementar; falha no envio não impede o uso.
  }
}

export async function resetPassword(email: string): Promise<void> {
  auth().languageCode = "pt-BR";
  await sendPasswordResetEmail(auth(), email.trim());
}

export async function signOut(): Promise<void> {
  await fbSignOut(auth());
}

/** Traduz códigos do Firebase Auth para mensagens amigáveis em português. */
export function authErrorMessage(err: unknown): string {
  const code = err instanceof FirebaseError ? err.code : "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-login-credentials":
      return "E-mail ou senha incorretos.";
    case "auth/invalid-email":
      return "Informe um e-mail válido.";
    case "auth/user-disabled":
      return "Esta conta está desativada.";
    case "auth/too-many-requests":
      return "Muitas tentativas seguidas. Aguarde alguns instantes.";
    case "auth/network-request-failed":
      return "Falha de conexão. Verifique sua internet e tente novamente.";
    case "auth/email-already-in-use":
      return "Já existe uma conta com este e-mail.";
    case "auth/weak-password":
    case "auth/password-does-not-meet-requirements":
      return "A senha deve ter pelo menos 6 caracteres.";
    case "auth/missing-password":
      return "Informe a senha.";
    case "auth/requires-recent-login":
      return "Por segurança, entre novamente para concluir esta ação.";
    default:
      return "Não foi possível concluir. Tente novamente.";
  }
}
