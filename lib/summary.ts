import { DOW, addDays, longDate, weekday } from "./dates";
import { avg, bestStreak, cellState, dayRatio, isDone, isScheduled, missedLast, streak } from "./habits";
import type { Habit, LogMap } from "./types";

const APP = () => process.env.NEXT_PUBLIC_APP_URL || "";
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const shell = (title: string, inner: string) => `<!doctype html><html lang="es"><body style="margin:0;background:#eef1ef;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#13201c">
<div style="max-width:480px;margin:0 auto;padding:24px 16px">
<div style="font-family:Menlo,monospace;font-size:12px;color:#0b7a63;letter-spacing:.08em;text-transform:uppercase">Uno por Ciento</div>
<h1 style="font-size:26px;line-height:1.15;margin:6px 0 18px">${title}</h1>
<div style="background:#fff;border:1px solid #d3dad6;border-radius:14px;padding:16px">${inner}</div>
${APP() ? `<p style="text-align:center;margin:20px 0"><a href="${APP()}" style="display:inline-block;background:#0b7a63;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:12px">Abrir la app</a></p>` : ""}
<p style="font-size:12px;color:#5c6b66;text-align:center">Puedes cambiar estos correos en Ajustes.</p>
</div></body></html>`;

const row = (left: string, right: string, muted = false) =>
  `<tr><td style="padding:7px 0;border-bottom:1px solid #eef1ef;${muted ? "color:#5c6b66" : ""}">${left}</td><td style="padding:7px 0;border-bottom:1px solid #eef1ef;text-align:right;font-family:Menlo,monospace;font-size:13px;${muted ? "color:#5c6b66" : ""}">${right}</td></tr>`;

export function dailySummary(habits: Habit[], logs: LogMap, today: string) {
  const todays = habits.filter((h) => isScheduled(h, today) && today >= h.start_date);
  const done = todays.filter((h) => isDone(logs, h, today));
  const pending = todays.filter((h) => !isDone(logs, h, today));
  const risk = pending.filter((h) => missedLast(logs, h, today));
  const top = [...habits].sort((a, b) => streak(logs, b, today) - streak(logs, a, today))[0];

  const subject = `Hoy: ${done.length} de ${todays.length} hábitos`;
  let inner = `<p style="margin:0 0 10px;color:#5c6b66">${esc(longDate(today))}</p><table style="width:100%;border-collapse:collapse;font-size:15px">`;
  inner += done.map((h) => row(`✓ ${esc(h.name)}`, `${streak(logs, h, today)} d`)).join("");
  inner += pending.map((h) => row(`○ ${esc(h.name)}`, "pendiente", true)).join("");
  inner += `</table>`;
  if (risk.length)
    inner += `<p style="margin:14px 0 0;padding:10px 12px;background:#fbe3dd;border-radius:10px;color:#c8462f"><b>Nunca falles dos veces:</b> ${risk.map((h) => esc(h.name)).join(", ")} ya se quedó ayer. Todavía estás a tiempo.</p>`;
  if (top && streak(logs, top, today) > 0)
    inner += `<p style="margin:14px 0 0;color:#5c6b66">Tu racha más larga: ${esc(top.name)}, ${streak(logs, top, today)} días seguidos.</p>`;
  const title = pending.length === 0 && todays.length ? "Cumpliste todo hoy" : subject;
  return { subject, html: shell(title, inner) };
}

export function weeklySummary(habits: Habit[], logs: LogMap, today: string) {
  const days = [...Array(7)].map((_, i) => addDays(today, i - 6));
  const prev = [...Array(7)].map((_, i) => addDays(today, i - 13));
  const cur = Math.round(avg(days.map((d) => dayRatio(logs, habits, d))) * 100);
  const prv = Math.round(avg(prev.map((d) => dayRatio(logs, habits, d))) * 100);
  const dl = cur - prv;
  const subject = `Tu semana: ${cur}% cumplido`;
  const dot = (c: string) =>
    c === "d" ? "●" : c === "p" ? "◐" : c === "n" || c === "f" ? "·" : "○";
  let inner = `<p style="margin:0 0 4px;font-size:40px;font-weight:800;letter-spacing:-.02em">${cur}%</p><p style="margin:0 0 14px;color:${dl >= 0 ? "#0b7a63" : "#c8462f"}">${dl >= 0 ? "+" : ""}${dl} puntos vs. la semana anterior</p>`;
  inner += `<table style="width:100%;border-collapse:collapse;font-size:14px"><tr><td></td><td style="text-align:right;font-family:Menlo,monospace;font-size:11px;color:#5c6b66;letter-spacing:.35em">${days.map((d) => DOW[weekday(d)]).join("")}</td></tr>`;
  inner += habits
    .map((h) => row(`${esc(h.name)}<br><span style="font-size:12px;color:#5c6b66">racha ${streak(logs, h, today)} · mejor ${bestStreak(logs, h, today)}</span>`, `<span style="letter-spacing:.2em">${days.map((d) => dot(cellState(logs, h, d, today))).join("")}</span>`))
    .join("");
  inner += `</table><p style="margin:14px 0 0;color:#5c6b66;font-size:13px">● cumplido · ◐ a medias · ○ fallado · no tocaba</p>`;
  return { subject, html: shell("Revisión semanal", inner) };
}
