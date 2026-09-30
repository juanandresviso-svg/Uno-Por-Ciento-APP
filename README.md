# Uno por Ciento

App personal de hábitos, tareas y finanzas. Es una PWA: se instala en el teléfono desde el navegador.

- **Fase 1 · Hábitos**: registro diario, rachas, la regla de nunca fallar dos veces, recordatorios push y resumen por correo.
- **Fase 2 · Tareas**: bandeja, Hoy / Próximas / Algún día, proyectos, prioridad, subtareas, aviso a una hora puntual, resumen de la mañana y tareas en el correo diario. Las tareas de hoy también salen en la pantalla Hoy.

Stack: Next.js 16 · Supabase (auth + base de datos + cron) · Vercel · Web Push · Resend.

---

## Puesta en marcha (unos 30 minutos)

### 1. GitHub
```bash
cd uno-por-ciento
git init && git add . && git commit -m "Fase 1: hábitos"
gh repo create uno-por-ciento --private --source=. --push
```
Si no usas `gh`, crea el repo privado en github.com y sigue las instrucciones de "push an existing repository".

### 2. Supabase
1. Crea un proyecto nuevo en supabase.com (región: `us-east-1` es la más cercana a Caracas).
2. **SQL Editor → New query**: pega `supabase/migrations/0001_habitos.sql` y dale **Run**.
3. **Authentication → Sign In / Providers → Email**: deja Email activado.
4. **Authentication → Emails → Magic Link**: cambia el template para que mande el código. Por ejemplo:
   ```html
   <h2>Tu código para entrar</h2>
   <p style="font-size:28px;letter-spacing:6px"><b>{{ .Token }}</b></p>
   <p>Vence en 1 hora.</p>
   ```
   Se usa código en vez de link porque en iPhone la app instalada no comparte sesión con Safari.
5. **Project Settings → API**: copia `Project URL`, `anon public` y `service_role`.

> Después de entrar por primera vez, ve a **Authentication → Sign In / Providers** y apaga **Allow new users to sign up**. Así nadie más puede crear cuenta. La app además rechaza cualquier correo distinto a `ALLOWED_EMAIL`.

### 3. Claves de notificaciones (VAPID)
```bash
npm install
npm run vapid
```
Te da una *Public Key* y una *Private Key*.

### 4. Resend
1. Crea cuenta en resend.com → **API Keys → Create**.
2. Mientras no verifiques un dominio, usa `EMAIL_FROM="Uno por Ciento <onboarding@resend.dev>"`. Solo puede mandar al correo con el que te registraste en Resend, que para uso personal basta.
3. Cuando quieras, verifica un dominio (por ejemplo `hawaiira.com`) y cambia `EMAIL_FROM` a `hola@tudominio.com`.

### 5. Vercel
1. **Add New → Project** → importa el repo de GitHub.
2. En **Environment Variables** pega todo lo de `.env.example` con tus valores reales. Genera `CRON_SECRET` con `openssl rand -hex 32`.
3. **Deploy**. Cuando termine, copia la URL (por ejemplo `https://uno-por-ciento.vercel.app`) y ponla en `NEXT_PUBLIC_APP_URL`. Luego haz **Redeploy**.
4. En Supabase → **Authentication → URL Configuration** pon esa URL como *Site URL*.

### 5b. Migración de tareas (Fase 2)
En Supabase → **SQL Editor**, pega `supabase/migrations/0002_tareas.sql` y dale **Run**. Crea las tablas `projects`, `tasks` y `subtasks` y agrega los ajustes del resumen de tareas.

### 6. Cron de recordatorios
Vercel Hobby solo deja correr crons una vez al día, así que el reloj lo pone Supabase:
1. Abre `supabase/cron.sql`, reemplaza `TU-APP` y `TU_CRON_SECRET`.
2. Pégalo en el **SQL Editor** y dale **Run**.

Corre cada 5 minutos y:
- manda el recordatorio de cada hábito a su hora si todavía no lo marcaste (hasta 90 min después; "En 30 min" lo pospone);
- manda el resumen del día a la hora que elijas en Ajustes;
- manda el aviso de cada tarea que tenga hora y "Recordarme" activado;
- a la hora del resumen de la mañana (8:00 am por defecto) manda cuántas tareas vencen hoy y cuántas están atrasadas;
- los domingos a las 6:00 pm manda la revisión semanal.

### 7. En el teléfono
- **iPhone (iOS 16.4 o más)**: abre la URL en Safari → Compartir → **Agregar a inicio**. Abre la app desde el ícono, entra con tu correo y en **Ajustes** activa **Avisos en este teléfono**.
- **Android**: abre en Chrome → menú → **Instalar app**. Luego lo mismo en Ajustes.
- Toca **Enviar un aviso de prueba** para confirmar.

---

## Desarrollo local
```bash
cp .env.example .env.local   # y completa los valores
npm run dev                  # http://localhost:3000
```
Para probar el cron en local:
```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/tick
```

## Estructura
```
app/
  (app)/page.tsx            Hoy
  (app)/habito/[id]/        Detalle, calendario y rachas
  (app)/progreso/           Semana y regla del 1%
  (app)/ajustes/            Avisos, correos, sesión
  (app)/tareas/             Tareas: vistas, proyectos, captura rápida
  (app)/tareas/[id]/        Detalle de tarea con notas y subtareas
  login/                    Entrada con código por correo
  api/cron/tick/            Recordatorios y correos (lo llama Supabase)
  api/push/*                Registrar teléfono, prueba, botones de la notificación
  api/email/test/           Mandar el resumen ahora
components/                 Provider de datos, filas, formulario, barra de pestañas
lib/                        Lógica de rachas, fechas, push, correo, Supabase
public/sw.js                Service worker (notificaciones)
supabase/                   Esquema SQL y cron
```

## Modelo de datos
| Tabla | Para qué |
|---|---|
| `habits` | Cada hábito: nombre, señal, tipo (sí/no o cantidad), días, hora, color |
| `habit_logs` | Un registro por hábito y día con su valor |
| `user_settings` | Zona horaria, avisos, silencio nocturno, correos |
| `push_subscriptions` | Los teléfonos que reciben avisos |
| `notification_log` | Qué se mandó cada día, para no repetir |
| `projects` | Proyectos o áreas con color |
| `tasks` | Tareas: proyecto, prioridad, fecha, hora, aviso, algún día, hecha |
| `subtasks` | Pasos dentro de una tarea |

Todas las tablas tienen RLS: cada usuario solo ve sus filas.

## Próximas fases
- **Fase 3 · Finanzas**: gastos e ingresos en USD/Bs, categorías, presupuesto mensual.
- **Brevo**: queda para listas de correo o WhatsApp si hace falta más adelante.
