export type UnitCategory = "length" | "mass" | "temperature";
export type RgbColor = { r: number; g: number; b: number };
export function parseColor(value: string, format: "HEX" | "RGB" | "HSL"): RgbColor {
  const hex = value.trim().replace(/^#/, "");
  if (format === "HEX") {
    if (!/^(?:[\da-f]{3}|[\da-f]{6})$/i.test(hex)) throw new Error("Use a 3- or 6-digit HEX value.");
    const full = hex.length === 3 ? hex.split("").map((x) => x + x).join("") : hex;
    return { r: parseInt(full.slice(0, 2), 16), g: parseInt(full.slice(2, 4), 16), b: parseInt(full.slice(4, 6), 16) };
  }
  if (format === "RGB") {
    const m = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i.exec(value.trim());
    if (!m || m.slice(1).some((n) => +n > 255)) throw new Error("Use rgb(r, g, b) with channels from 0 to 255.");
    return { r: +m[1], g: +m[2], b: +m[3] };
  }
  const m = /^hsla?\(\s*(-?\d+(?:\.\d+)?)\s*,?\s*(\d+(?:\.\d+)?)%\s*,?\s*(\d+(?:\.\d+)?)%\s*\)$/i.exec(value.trim());
  if (!m || +m[2] > 100 || +m[3] > 100) throw new Error("Use hsl(h, s%, l%) with saturation and lightness from 0% to 100%.");
  const h = ((+m[1] % 360) + 360) % 360 / 360, s = +m[2] / 100, l = +m[3] / 100;
  const channel = (n: number) => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return Math.round((l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255); };
  return { r: channel(0), g: channel(8), b: channel(4) };
}
export function colorFormats({ r, g, b }: RgbColor) {
  const hex = `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
  const red = r / 255, green = g / 255, blue = b / 255, max = Math.max(red, green, blue), min = Math.min(red, green, blue), delta = max - min, l = (max + min) / 2;
  let h = 0, s = 0;
  if (delta) { s = delta / (1 - Math.abs(2 * l - 1)); h = max === red ? ((green - blue) / delta) % 6 : max === green ? (blue - red) / delta + 2 : (red - green) / delta + 4; h = (h * 60 + 360) % 360; }
  return { HEX: hex, RGB: `rgb(${r}, ${g}, ${b})`, HSL: `hsl(${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)` };
}

export function pxToRem(px: number, rootPx: number) { if (!Number.isFinite(px) || !Number.isFinite(rootPx) || rootPx <= 0) throw new Error("Use finite values and a positive root size."); return px / rootPx; }
export function remToEm(rem: number, rootPx: number, parentPx: number) { if (![rem, rootPx, parentPx].every(Number.isFinite) || rootPx <= 0 || parentPx <= 0) throw new Error("Use finite values and positive font sizes."); return rem * rootPx / parentPx; }
export function convertStorage(value: number, from: string, to: string) {
  const factors: Record<string, number> = { B: 1, kB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12, KiB: 1024, MiB: 1024 ** 2, GiB: 1024 ** 3, TiB: 1024 ** 4 };
  if (!Number.isFinite(value) || !factors[from] || !factors[to]) throw new Error("Choose a finite value and supported storage units.");
  return value * factors[from] / factors[to];
}
export function convertDuration(value: number, from: string, to: string) {
  const factors: Record<string, number> = { milliseconds: 1, seconds: 1e3, minutes: 6e4, hours: 36e5, days: 864e5 };
  if (!Number.isFinite(value) || !factors[from] || !factors[to]) throw new Error("Choose a finite value and supported time units.");
  return value * factors[from] / factors[to];
}

const linearUnits: Record<Exclude<UnitCategory, "temperature">, Record<string, number>> = {
  length: { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344 },
  mass: { mg: 0.000001, g: 0.001, kg: 1, t: 1000, oz: 0.028349523125, lb: 0.45359237, st: 6.35029318 },
};

export function convertUnits(value: number, category: UnitCategory, from: string, to: string): number {
  if (!Number.isFinite(value)) throw new Error("Enter a finite number.");
  if (category === "temperature") {
    const celsius = from === "C" ? value : from === "F" ? (value - 32) * 5 / 9 : from === "K" ? value - 273.15 : NaN;
    if (!Number.isFinite(celsius) || !["C", "F", "K"].includes(to)) throw new Error("Choose a supported temperature unit.");
    if (celsius < -273.15) throw new Error("Temperature is below absolute zero.");
    return to === "C" ? celsius : to === "F" ? celsius * 9 / 5 + 32 : celsius + 273.15;
  }
  const table = linearUnits[category];
  if (!(from in table) || !(to in table)) throw new Error("Choose units from the selected category.");
  return value * table[from] / table[to];
}

export function convertCssLength(value: number, from: string, to: string, context: { rootPx?: number; parentPx?: number; viewportWidth?: number; viewportHeight?: number }): { value: number; exact: boolean } {
  if (!Number.isFinite(value)) throw new Error("Enter a finite number.");
  const absolute: Record<string, number> = { px: 1, cm: 96 / 2.54, mm: 96 / 25.4, in: 96, pt: 96 / 72, pc: 16 };
  const toPx = (n: number, unit: string): { value: number; exact: boolean } => {
    if (absolute[unit]) return { value: n * absolute[unit], exact: true };
    if (unit === "rem" && context.rootPx) return { value: n * context.rootPx, exact: false };
    if (unit === "em" && context.parentPx) return { value: n * context.parentPx, exact: false };
    if (unit === "%") throw new Error("Percent needs a reference dimension; choose a concrete unit first.");
    if (unit === "vw" && context.viewportWidth) return { value: n * context.viewportWidth / 100, exact: false };
    if (unit === "vh" && context.viewportHeight) return { value: n * context.viewportHeight / 100, exact: false };
    if (unit === "vmin" && context.viewportWidth && context.viewportHeight) return { value: n * Math.min(context.viewportWidth, context.viewportHeight) / 100, exact: false };
    if (unit === "vmax" && context.viewportWidth && context.viewportHeight) return { value: n * Math.max(context.viewportWidth, context.viewportHeight) / 100, exact: false };
    throw new Error(`${unit} needs its matching font-size or viewport context.`);
  };
  const px = toPx(value, from);
  if (to === "%") throw new Error("Percent needs a reference dimension; choose a concrete unit first.");
  const one = toPx(1, to);
  return { value: px.value / one.value, exact: px.exact && one.exact };
}

export function jsonToQuery(input: string): string {
  const value: unknown = JSON.parse(input);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Enter a JSON object.");
  const params = new URLSearchParams();
  for (const [key, item] of Object.entries(value)) {
    const values = Array.isArray(item) ? item : [item];
    for (const entry of values) {
      if (entry !== null && typeof entry === "object") throw new Error("Nested objects and arrays are not supported. Use flat values or repeated keys for arrays.");
      params.append(key, entry == null ? "" : String(entry));
    }
  }
  return params.toString();
}

export function queryToJson(input: string): string {
  const source = input.trim().replace(/^\?/, "");
  try { decodeURIComponent(source.replace(/\+/gu, "%20")); } catch { throw new Error("The query string contains malformed percent encoding."); }
  const params = new URLSearchParams(source);
  const result: Record<string, string | string[]> = Object.create(null) as Record<string, string | string[]>;
  for (const [key, value] of params) {
    if (!Object.hasOwn(result, key)) result[key] = value;
    else if (Array.isArray(result[key])) result[key].push(value);
    else result[key] = [result[key] as string, value];
  }
  return JSON.stringify(result, null, 2);
}

const CRON_BOUNDS = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 7]] as const;
const CRON_NAMES = ["minute", "hour", "day of month", "month", "day of week"];
export function parseCron(input: string) {
  const fields = input.trim().split(/\s+/);
  if (fields.length !== 5) throw new Error("Cron uses exactly five fields: minute hour day-of-month month day-of-week.");
  const breakdown = fields.map((field, i) => {
    const [min, max] = CRON_BOUNDS[i];
    for (const segment of field.split(",")) {
      const m = /^(\*|\d+(?:-\d+)?)(?:\/(\d+))?$/.exec(segment);
      if (!m) throw new Error(`Unsupported ${CRON_NAMES[i]} syntax: ${segment}`);
      if (m[2] && Number(m[2]) < 1) throw new Error("Step values must be 1 or greater.");
      const range = m[1] === "*" ? [min, max] : m[1].split("-").map(Number);
      if (range.some((n) => n < min || n > max) || range[0] > range[range.length - 1]) throw new Error(`${CRON_NAMES[i]} must be between ${min} and ${max}, with ranges in ascending order.`);
    }
    return { name: CRON_NAMES[i], value: field };
  });
  return { fields, breakdown, summary: fields.every((f) => f === "*") ? "Runs every minute." : `Runs when minute ${fields[0]}, hour ${fields[1]}, day of month ${fields[2]}, month ${fields[3]}, and day of week ${fields[4]} match.` };
}

export function dateDifference(startInput: string, endInput: string, inclusive = false) {
  const parse = (s: string) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s); if (!m) throw new Error("Enter dates as YYYY-MM-DD."); const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); if (d.toISOString().slice(0, 10) !== s) throw new Error("Enter valid calendar dates."); return d; };
  const start = parse(startInput), end = parse(endInput), reversed = end < start;
  const a = reversed ? end : start, b = reversed ? start : end;
  const days = Math.floor((b.getTime() - a.getTime()) / 86400000) + (inclusive ? 1 : 0);
  let years = b.getUTCFullYear() - a.getUTCFullYear(), months = b.getUTCMonth() - a.getUTCMonth(), day = b.getUTCDate() - a.getUTCDate();
  if (day < 0) { months--; day += new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), 0)).getUTCDate(); }
  if (months < 0) { years--; months += 12; }
  return { days, weeks: Math.floor(days / 7), remainingDays: days % 7, years, months, calendarDays: day, reversed };
}

export function zonedDateTimeToUtc(date: string, time: string, zone: string): { instant: Date; ambiguous: boolean; nonexistent: boolean } {
  const [year, month, day] = date.split("-").map(Number), [hour, minute] = time.split(":").map(Number);
  if (![year, month, day, hour, minute].every(Number.isFinite) || month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) throw new Error("Enter a valid date and time.");
  const target = Date.UTC(year, month - 1, day, hour, minute);
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const match = (ts: number) => { const p = Object.fromEntries(fmt.formatToParts(new Date(ts)).map((x) => [x.type, x.value])); return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute); };
  const candidates: number[] = [];
  for (let ts = target - 15 * 3600000; ts <= target + 15 * 3600000; ts += 60000) if (match(ts) === target) candidates.push(ts);
  if (!candidates.length) return { instant: new Date(NaN), ambiguous: false, nonexistent: true };
  return { instant: new Date(candidates[0]), ambiguous: candidates.length > 1, nonexistent: false };
}

export function timestampFromDate(value: string): number {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms) || Math.abs(ms) > 8.64e15) throw new Error("Enter a valid date within the supported range.");
  return ms;
}

export function timestampToDate(value: number, unit: "seconds" | "milliseconds"): Date {
  if (!Number.isFinite(value)) throw new Error("Enter a finite timestamp.");
  const ms = unit === "seconds" ? value * 1000 : value;
  if (!Number.isFinite(ms) || Math.abs(ms) > 8.64e15) throw new Error("Timestamp is outside the supported date range.");
  return new Date(ms);
}

export function parseCurrencyRate(value: unknown, base: string, quote: string) {
  if (!value || typeof value !== "object") throw new Error("The rate provider returned malformed data.");
  const row = value as Record<string, unknown>;
  if (row.base !== base || row.quote !== quote || typeof row.rate !== "number" || !Number.isFinite(row.rate) || row.rate <= 0 || typeof row.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) throw new Error("A valid rate was not available for this currency pair.");
  return { base, quote, rate: row.rate, date: row.date };
}
