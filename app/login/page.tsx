"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(params.get("e") === "correo" ? "Ese correo no tiene acceso a esta app." : "");
  const supabase = createClient();

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr("Escribe un correo válido.");
    setBusy(true);
    setErr("");
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) return setErr(error.message);
    setStep("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    const token = code.replace(/\D/g, "");
    if (token.length < 6) return setErr("El código tiene al menos 6 dígitos.");
    setBusy(true);
    setErr("");
    const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token, type: "email" });
    setBusy(false);
    if (error) return setErr("Código incorrecto o vencido. Pide uno nuevo.");
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="login">
      <div className="mark">1%</div>
      <h1 className="title">Uno por Ciento</h1>
      {step === "email" ? (
        <form onSubmit={sendCode} noValidate>
          <p>Te mando un código a tu correo para entrar. Sin contraseñas.</p>
          <div className="field">
            <label htmlFor="email">Correo</label>
            <input id="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" />
          </div>
          <div className="err" role="alert">{err}</div>
          <button className="btn primary" style={{ width: "100%" }} disabled={busy}>{busy ? "Enviando…" : "Enviarme el código"}</button>
        </form>
      ) : (
        <form onSubmit={verify} noValidate>
          <p>Escribe el código que llegó a <b>{email}</b>.</p>
          <div className="field">
            <label htmlFor="code">Código</label>
            <input id="code" className="otp" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={code} onChange={(e) => setCode(e.target.value)} autoFocus />
          </div>
          <div className="err" role="alert">{err}</div>
          <button className="btn primary" style={{ width: "100%" }} disabled={busy}>{busy ? "Entrando…" : "Entrar"}</button>
          <button type="button" className="back" style={{ marginTop: 16 }} onClick={() => { setStep("email"); setCode(""); setErr(""); }}>
            Usar otro correo o reenviar
          </button>
        </form>
      )}
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
