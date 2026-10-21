export function evaluateExpression(input: string): number {
  if (input.length > 240) throw new Error("Expression is too long (240 characters maximum).");
  const tokens = input.match(/\d+(?:\.\d*)?(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?|[()+\-*/%]/g) ?? [];
  if (tokens.join("") !== input.replace(/\s/g, "")) throw new Error("Use numbers, +, −, ×, ÷, %, and parentheses only.");
  let position = 0;
  const parse = (minBinding: number, depth: number): number => {
    if (depth > 32) throw new Error("Expression is nested too deeply.");
    const token = tokens[position++];
    if (!token) throw new Error("Enter a complete expression.");
    let left: number;
    if (token === "+" || token === "-") left = (token === "-" ? -1 : 1) * parse(25, depth + 1);
    else if (token === "(") { left = parse(0, depth + 1); if (tokens[position++] !== ")") throw new Error("Add a closing parenthesis."); }
    else if (/^(?:\d|\.)/.test(token)) left = Number(token);
    else throw new Error("Expression starts with an unexpected operator.");
    while (position < tokens.length) {
      const op = tokens[position];
      if (op === "%") { if (30 < minBinding) break; position++; left /= 100; continue; }
      const binding = op === "+" || op === "-" ? 10 : op === "*" || op === "/" ? 20 : -1;
      if (binding < minBinding) break;
      position++;
      const right = parse(binding + 1, depth + 1);
      if (op === "+") left += right;
      else if (op === "-") left -= right;
      else if (op === "*") left *= right;
      else { if (right === 0) throw new Error("Cannot divide by zero."); left /= right; }
    }
    if (!Number.isFinite(left)) throw new Error("Result is outside the supported number range.");
    return left;
  };
  if (!tokens.length) throw new Error("Enter a calculation.");
  const result = parse(0, 0);
  if (position !== tokens.length) throw new Error("Check the expression for missing operators or extra characters.");
  return result;
}

export function percentage(mode: "of" | "reverse" | "change" | "adjust", x: number, y: number) {
  if (![x, y].every(Number.isFinite)) throw new Error("Enter finite numbers.");
  if (mode === "of") return { value: x * y / 100, explanation: `${x}% × ${y} = ${x * y / 100}` };
  if (mode === "reverse") { if (y === 0) throw new Error("The reference value cannot be zero."); return { value: x / y * 100, explanation: `${x} ÷ ${y} × 100` }; }
  if (mode === "change") { if (x === 0) throw new Error("The original value cannot be zero."); return { value: (y - x) / Math.abs(x) * 100, explanation: `(${y} − ${x}) ÷ |${x}| × 100` }; }
  const value = x * (1 + y / 100);
  return { value, explanation: `${x} × (1 ${y < 0 ? "−" : "+"} ${Math.abs(y)}%)` };
}

export function tipCalculation(bill: number, rate: number, people: number) {
  if (![bill, rate, people].every(Number.isFinite) || bill < 0 || rate < 0 || people < 1 || !Number.isInteger(people)) throw new Error("Enter a nonnegative bill and tip, and a whole number of people (at least 1).");
  const tip = bill * rate / 100, total = bill + tip;
  return { tip, total, perPerson: total / people };
}

export function gstCalculation(amount: number, rate: number, inclusive: boolean) {
  if (![amount, rate].every(Number.isFinite) || amount < 0 || rate < 0) throw new Error("Enter nonnegative finite amounts and a rate.");
  const base = inclusive ? amount / (1 + rate / 100) : amount;
  const gst = inclusive ? amount - base : amount * rate / 100;
  return { base, gst, total: base + gst };
}

export function loanCalculation(principal: number, annualRate: number, months: number) {
  if (![principal, annualRate, months].every(Number.isFinite) || principal <= 0 || annualRate < 0 || months <= 0 || !Number.isInteger(months) || months > 1200) throw new Error("Enter a positive principal, nonnegative rate, and a term from 1 to 1,200 months.");
  const r = annualRate / 1200;
  const payment = r === 0 ? principal / months : principal * r / (1 - (1 + r) ** -months);
  return { payment, total: payment * months, interest: payment * months - principal, schedule: Array.from({ length: months }, (_, i) => { const balance = principal * (1 + r) ** (i + 1) - payment * (((1 + r) ** (i + 1) - 1) / (r || 1)); return { period: i + 1, balance: Math.max(0, r === 0 ? principal - payment * (i + 1) : balance) }; }) };
}

export type CalendarDate = { year: number; month: number; day: number };
export function parseCalendarDate(value: string): CalendarDate {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) throw new Error("Enter a valid date.");
  const date = { year: +m[1], month: +m[2], day: +m[3] };
  if (date.month < 1 || date.month > 12 || date.day < 1 || date.day > daysInMonth(date.year, date.month)) throw new Error("That date does not exist.");
  return date;
}
export function daysInMonth(year: number, month: number) { return new Date(Date.UTC(year, month, 0)).getUTCDate(); }
export function dateString({ year, month, day }: CalendarDate) { return `${year.toString().padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`; }
const dateNumber = (d: CalendarDate) => Date.UTC(d.year, d.month - 1, d.day) / 86400000;
export function addCalendarMonths(d: CalendarDate, count: number): CalendarDate {
  const total = d.year * 12 + d.month - 1 + count, year = Math.floor(total / 12), month = ((total % 12) + 12) % 12 + 1;
  return { year, month, day: Math.min(d.day, daysInMonth(year, month)) };
}
export function addCalendarDate(d: CalendarDate, amount: number, unit: "days" | "weeks" | "months" | "years"): CalendarDate {
  if (!Number.isInteger(amount) || Math.abs(amount) > 100000) throw new Error("Enter a whole adjustment within 100,000.");
  if (unit === "months" || unit === "years") return addCalendarMonths(d, amount * (unit === "years" ? 12 : 1));
  const dt = new Date(Date.UTC(d.year, d.month - 1, d.day + amount * (unit === "weeks" ? 7 : 1)));
  return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate() };
}
export function ageBetween(birth: CalendarDate, asOf: CalendarDate) {
  if (dateNumber(birth) > dateNumber(asOf)) throw new Error("Date of birth cannot be in the future.");
  const anniversaryDay = Math.min(birth.day, daysInMonth(asOf.year, birth.month));
  let years = asOf.year - birth.year;
  if (asOf.month < birth.month || (asOf.month === birth.month && asOf.day < anniversaryDay)) years--;
  const last = addCalendarMonths({ ...birth, year: birth.year + years }, 0);
  const monthsTotal = (asOf.year - last.year) * 12 + asOf.month - last.month - (asOf.day < last.day ? 1 : 0);
  const monthAnchor = addCalendarMonths(last, Math.max(0, monthsTotal));
  return { years, months: Math.max(0, monthsTotal), days: dateNumber(asOf) - dateNumber(monthAnchor), totalDays: dateNumber(asOf) - dateNumber(birth) };
}
export function dateDifference(start: CalendarDate, end: CalendarDate, inclusive = false) {
  const reversed = dateNumber(end) < dateNumber(start), a = reversed ? end : start, b = reversed ? start : end;
  const elapsedDays = dateNumber(b) - dateNumber(a), days = elapsedDays + (inclusive ? 1 : 0);
  let years = b.year - a.year, months = b.month - a.month, dayCount = b.day - a.day;
  if (dayCount < 0) { months--; dayCount += daysInMonth(b.year, b.month - 1 || 12); }
  if (months < 0) { years--; months += 12; }
  return { days, weeks: Math.floor(days / 7), remainingDays: days % 7, years, months, calendarDays: dayCount, reversed };
}
export function dateUtility(d: CalendarDate, operation: string, amount = 0, unit: "days" | "weeks" | "months" | "years" = "days") {
  if (operation === "add" || operation === "subtract") return addCalendarDate(d, operation === "subtract" ? -amount : amount, unit);
  if (operation === "start-month") return { ...d, day: 1 };
  if (operation === "end-month") return { ...d, day: daysInMonth(d.year, d.month) };
  if (operation === "start-year") return { ...d, month: 1, day: 1 };
  if (operation === "end-year") return { ...d, month: 12, day: 31 };
  return d;
}
export function timestampToDate(value: number, unit: "seconds" | "milliseconds") {
  if (!Number.isFinite(value)) throw new Error("Enter a finite timestamp.");
  const ms = unit === "seconds" ? value * 1000 : value;
  const date = new Date(ms);
  if (!Number.isFinite(date.getTime())) throw new Error("Timestamp is outside the supported date range.");
  return date;
}
export function parseRateResponse(value: unknown, base: string, quote: string) {
  if (!value || typeof value !== "object") throw new Error("Rate provider returned malformed data.");
  const row = value as Record<string, unknown>;
  if (row.base !== base || row.quote !== quote || typeof row.rate !== "number" || !Number.isFinite(row.rate) || row.rate <= 0 || typeof row.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) throw new Error("No valid rate was available for this currency pair.");
  return { base, quote, rate: row.rate, date: row.date };
}
export function randomInteger(min: number, max: number, randomUint32: () => number) {
  if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || max < min || max - min >= 0x100000000) throw new Error("Enter whole-number bounds with a range under 2³².");
  const range = max - min + 1, limit = Math.floor(0x100000000 / range) * range;
  let value: number;
  do { value = randomUint32() >>> 0; } while (value >= limit);
  return min + value % range;
}
export function shuffle<T>(items: T[], randomIndex: (max: number) => number) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) { const j = randomIndex(i + 1); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}

const unitFactors: Record<string, Record<string, number>> = {
  length: { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344 },
  mass: { mg: 0.000001, g: 0.001, kg: 1, t: 1000, oz: 0.028349523125, lb: 0.45359237, st: 6.35029318 },
};
export function convertUnits(value: number, category: "length" | "mass" | "temperature", from: string, to: string) {
  if (!Number.isFinite(value)) throw new Error("Enter a finite number.");
  if (category === "temperature") {
    const c = from === "C" ? value : from === "F" ? (value - 32) * 5 / 9 : from === "K" ? value - 273.15 : NaN;
    if (!Number.isFinite(c) || !["C", "F", "K"].includes(to)) throw new Error("Choose supported temperature units.");
    if (c < -273.15) throw new Error("Temperature is below absolute zero.");
    return to === "C" ? c : to === "F" ? c * 9 / 5 + 32 : c + 273.15;
  }
  const table = unitFactors[category];
  if (!table || !Object.hasOwn(table, from) || !Object.hasOwn(table, to)) throw new Error("Choose units from the selected category.");
  return value * table[from] / table[to];
}

export function zonedDateTimeToUtc(date: string, time: string, zone: string) {
  const calendar = parseCalendarDate(date);
  if (!/^\d{2}:\d{2}$/.test(time)) throw new Error("Enter a valid time.");
  const [hour, minute] = time.split(":").map(Number);
  if (hour > 23 || minute > 59) throw new Error("Enter a valid time.");
  const target = Date.UTC(calendar.year, calendar.month - 1, calendar.day, hour, minute);
  const format = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const wallTime = (ms: number) => {
    const parts = Object.fromEntries(format.formatToParts(new Date(ms)).map((part) => [part.type, part.value]));
    return Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
  };
  const candidates: number[] = [];
  for (let ms = target - 15 * 3600000; ms <= target + 15 * 3600000; ms += 60000) if (wallTime(ms) === target) candidates.push(ms);
  if (!candidates.length) return { instant: new Date(NaN), ambiguous: false, nonexistent: true };
  return { instant: new Date(candidates[0]), ambiguous: candidates.length > 1, nonexistent: false };
}
