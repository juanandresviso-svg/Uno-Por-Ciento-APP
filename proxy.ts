import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = ["/login", "/api/cron"];

function configProblem() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const missing = [
    !url && "NEXT_PUBLIC_SUPABASE_URL",
    !key && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    !process.env.SUPABASE_SERVICE_ROLE_KEY && "SUPABASE_SERVICE_ROLE_KEY",
  ].filter(Boolean);
  if (missing.length) return `Faltan estas variables en Vercel: ${missing.join(", ")}.`;
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url!.trim()))
    return `NEXT_PUBLIC_SUPABASE_URL debe verse así: https://xxxxxxxx.supabase.co (sin nada después). Ahora dice: ${url}`;
  if (url !== url!.trim() || key !== key!.trim()) return "Alguna clave de Supabase tiene espacios o saltos de línea al inicio o al final.";
  return null;
}

function problemPage(msg: string) {
  const html = `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Falta configurar</title><body style="font-family:system-ui;max-width:520px;margin:40px auto;padding:0 18px;line-height:1.5">
<h1 style="font-size:22px">La app no está configurada todavía</h1><p>${msg.replace(/</g, "&lt;")}</p>
<p>Corrígelo en Vercel → Settings → Environment Variables y luego haz <b>Redeploy</b>.</p></body></html>`;
  return new NextResponse(html, { status: 500, headers: { "content-type": "text/html; charset=utf-8" } });
}

export async function proxy(request: NextRequest) {
  const problem = configProblem();
  if (problem) return problemPage(problem);

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"] = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    user = data.user;
    if (error && !/session/i.test(error.message)) console.error("auth", error.message);
  } catch (e) {
    return problemPage(`No se pudo conectar con Supabase: ${(e as Error).message}. Revisa que la URL y la anon key sean del mismo proyecto.`);
  }

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC.some((p) => path.startsWith(p));

  const allowed = process.env.ALLOWED_EMAIL?.toLowerCase();
  const blocked = user && allowed && user.email?.toLowerCase() !== allowed;
  if (blocked) {
    await supabase.auth.signOut();
  }

  if ((!user || blocked) && !isPublic) {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    if (blocked) url.searchParams.set("e", "correo");
    return NextResponse.redirect(url);
  }

  if (user && !blocked && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|sw.js|manifest.webmanifest).*)"],
};
