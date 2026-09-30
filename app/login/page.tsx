"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "password" | "email" | "code";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(params.get("e") === "correo" ? "Ese correo no tiene acceso a esta app." : "");

  const cleanEmail = () => email.trim().toLowerCase();
  const validEmail = () => /^\S+@\S+\.\S+$/.test(email.trim());

  function done() {
    router.replace("/");
    router.refresh();
  }

  async function withPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!validEmail()) return setErr("Escribe un correo válido.");
    if (!password) return setErr("Escribe tu contraseña.");
    setBusy(true);
    setErr("");
    const { error } = await createClient().auth.signInWithPassword({ email: cleanEmail(), password });
    setBusy(false);
    if (error) return setErr("Correo o contraseña incorrectos.");
    done();
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!validEmail()) return setErr("Escribe un correo válido.");
    setBusy(true);
    setErr("");
    const { error } = await createClient().auth.signInWithOtp({ email: cleanEmail(), options: { shouldCreateUser: false } });
    setBusy(false);
    if (error) {
      if (/rate limit|security purposes|seconds/i.test(error.message))
        return setErr("Ya se mandaron varios códigos hace poco. Usa el último que te llegó o entra con contraseña.");
      if (/sending/i.test(error.message))
        return setErr("Supabase no pudo mandar el correo. Revisa la configuración SMTP o entra con contraseña.");
      return setErr(error.message);
    }
    setMode("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    const token = code.replace(/\D/g, "");
    if (token.length < 6) return setErr("El código tiene al menos 6 dígitos.");
    setBusy(true);
    setErr("");
    const { error } = await createClient().auth.verifyOtp({ email: cleanEmail(), token, type: "email" });
    setBusy(false);
    if (error) return setErr("Código incorrecto o vencido.");
    done();
  }

  const go = (m: Mode) => {
    setErr("");
    setMode(m);
  };

  const emailField = (
    <div className="field">
      <label htmlFor="email">Correo</label>
      <input id="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" />
    </div>
  );

  return (
    <div className="login">
      <div className="mark">1%</div>
      <h1 className="title">Uno por Ciento</h1>

      {mode === "password" && (
        <form onSubmit={withPassword} noValidate>
          <p>Entra con tu correo y contraseña.</p>
          {emailField}
          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: "100%", font: "inherit", fontSize: 16, padding: "11px 12px", borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--fg)" }} />
          </div>
          <div className="err" role="alert">{err}</div>
          <button className="btn primary" style={{ width: "100%" }} disabled={busy}>{busy ? "Entrando…" : "Entrar"}</button>
          <button type="button" className="back" style={{ marginTop: 16 }} onClick={() => go("email")}>
            Prefiero un código por correo
          </button>
        </form>
      )}

      {mode === "email" && (
        <form onSubmit={sendCode} noValidate>
          <p>Te mando un código a tu correo para entrar.</p>
          {emailField}
          <div className="err" role="alert">{err}</div>
          <button className="btn primary" style={{ width: "100%" }} disabled={busy}>{busy ? "Enviando…" : "Enviarme el código"}</button>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 16 }}>
            <button type="button" className="back" onClick={() => (validEmail() ? go("code") : setErr("Escribe primero tu correo."))}>Ya tengo un código</button>
            <button type="button" className="back" onClick={() => go("password")}>Usar contraseña</button>
          </div>
        </form>
      )}

      {mode === "code" && (
        <form onSubmit={verify} noValidate>
          <p>Escribe el código que llegó a <b>{email}</b>.</p>
          <div className="field">
            <label htmlFor="code">Código</label>
            <input id="code" className="otp" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={code} onChange={(e) => setCode(e.target.value)} autoFocus />
          </div>
          <div className="err" role="alert">{err}</div>
          <button className="btn primary" style={{ width: "100%" }} disabled={busy}>{busy ? "Entrando…" : "Entrar"}</button>
          <button type="button" className="back" style={{ marginTop: 16 }} onClick={() => go("password")}>Usar contraseña</button>
        </form>
      )}

      <p className="hint" style={{ marginTop: 28, textAlign: "center" }}>v1.1</p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
