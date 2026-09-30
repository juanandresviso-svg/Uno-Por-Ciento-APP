// Fechas como texto "YYYY-MM-DD". La aritmética se hace en UTC para que
// ningún huso horario mueva los días.

export const DOW = ["D", "L", "M", "X", "J", "V", "S"];
export const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0];
export const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const DIA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

const toUTC = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const fromUTC = (d: Date) => d.toISOString().slice(0, 10);

export const addDays = (key: string, n: number) => {
  const d = toUTC(key);
  d.setUTCDate(d.getUTCDate() + n);
  return fromUTC(d);
};
export const weekday = (key: string) => toUTC(key).getUTCDay();
export const dayOfMonth = (key: string) => toUTC(key).getUTCDate();
export const monthIdx = (key: string) => toUTC(key).getUTCMonth();

/** Fecha y minutos del día actuales en un huso horario. */
export function nowIn(tz: string, at: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const key = `${get("year")}-${get("month")}-${get("day")}`;
  const minutes = Number(get("hour")) * 60 + Number(get("minute"));
  return { key, minutes };
}

/** Hoy en el huso del navegador. */
export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const toMinutes = (t: string | null | undefined) => {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

export const hhmm = (t: string | null | undefined) => (t ? t.slice(0, 5) : "");

export function fmtTime(t: string | null | undefined) {
  if (!t) return "";
  let [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${ap}`;
}

export const longDate = (key: string) => `${DIA[weekday(key)]} ${dayOfMonth(key)} ${MES[monthIdx(key)]}`;
