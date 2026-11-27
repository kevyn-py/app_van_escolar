"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bus, Eye, EyeOff, Mail, TriangleAlert } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { authErrorMessage, resetPassword, signIn, signUp } from "@/services/authService";
import { Button, Spinner, TextField } from "@/components/ui";
import { NotConfigured } from "@/components/NotConfigured";

type Mode = "entrar" | "criar" | "recuperar";

export default function LoginPage() {
  const { user, loading, configured } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("entrar");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  if (!configured) return <NotConfigured />;
  if (loading || user) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner />
      </div>
    );
  }

  function switchMode(m: Mode) {
    setMode(m);
    setError(null);
    setInfo(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (mode === "criar" && name.trim().length < 2) {
      setError("Informe seu nome (mínimo 2 caracteres).");
      return;
    }
    if (mode === "criar" && password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "entrar") await signIn(email, password);
      else if (mode === "criar") await signUp(name, email, password);
      else {
        await resetPassword(email);
        setInfo("Se houver uma conta com este e-mail, você receberá um link para redefinir a senha.");
      }
    } catch (err) {
      // Mesmo texto para conta inexistente na recuperação, para não expor quem tem conta.
      if (mode === "recuperar" && (err as { code?: string }).code === "auth/user-not-found") {
        setInfo("Se houver uma conta com este e-mail, você receberá um link para redefinir a senha.");
      } else {
        setError(authErrorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "entrar" ? "Entrar" : mode === "criar" ? "Criar conta" : "Recuperar senha";

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-blue-700 to-blue-900 px-4 py-8">
      <div className="mb-6 flex flex-col items-center text-center text-white">
        <span className="mb-3 flex size-16 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-lg">
          <Bus className="size-9" aria-hidden />
        </span>
        <h1 className="text-2xl font-bold">Van Escolar</h1>
        <p className="text-blue-100">Controle de embarque e desembarque</p>
      </div>

      <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl sm:p-6">
        {mode !== "recuperar" ? (
          <div role="tablist" aria-label="Acesso" className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
            {(["entrar", "criar"] as const).map((m) => (
              <button
                key={m}
                role="tab"
                type="button"
                aria-selected={mode === m}
                onClick={() => switchMode(m)}
                className={`min-h-11 rounded-lg text-[15px] font-semibold ${
                  mode === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
                }`}
              >
                {m === "entrar" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => switchMode("entrar")}
            className="mb-3 -ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 font-semibold text-blue-700 hover:bg-blue-50"
          >
            <ArrowLeft className="size-5" aria-hidden /> Voltar
          </button>
        )}

        <h2 className="sr-only">{title}</h2>
        {mode === "recuperar" && (
          <p className="mb-4 text-[15px] text-slate-700">Informe o e-mail da sua conta para receber o link de redefinição.</p>
        )}

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          {mode === "criar" && (
            <TextField label="Seu nome" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} />
          )}
          <TextField
            label="E-mail"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {mode !== "recuperar" && (
            <TextField
              label="Senha"
              type={showPassword ? "text" : "password"}
              autoComplete={mode === "criar" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              hint={mode === "criar" ? "Mínimo de 6 caracteres." : undefined}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  className="flex size-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
                >
                  {showPassword ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
                </button>
              }
            />
          )}

          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-800">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              {error}
            </p>
          )}
          {info && (
            <p role="status" className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-900">
              <Mail className="mt-0.5 size-4 shrink-0" aria-hidden />
              {info}
            </p>
          )}

          <Button type="submit" size="lg" loading={busy} className="w-full">
            {mode === "entrar" ? "Entrar" : mode === "criar" ? "Criar conta" : "Enviar link"}
          </Button>
        </form>

        {mode === "entrar" && (
          <button
            type="button"
            onClick={() => switchMode("recuperar")}
            className="mt-3 min-h-11 w-full rounded-lg text-[15px] font-semibold text-blue-700 hover:bg-blue-50"
          >
            Esqueci minha senha
          </button>
        )}
      </div>
    </div>
  );
}
