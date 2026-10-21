"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CopyButton, ErrorState, ResetButton } from "@/components/tools/primitives";
import { convertCssLength, convertDuration, convertStorage, convertUnits, dateDifference, jsonToQuery, parseCron, parseCurrencyRate, pxToRem, queryToJson, remToEm, timestampFromDate, timestampToDate, zonedDateTimeToUtc } from "@/lib/tools/converters";

export type ConverterMode = "px-rem" | "rem-em" | "bytes" | "milliseconds" | "unit-converter" | "unix-timestamp" | "timezone-converter" | "date-difference" | "json-query-string" | "cron-generator" | "cron-explainer" | "css-units" | "currency";
const field = "field-group";
const input = "text-input";
const select = "text-input";

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) { return <label className={field} htmlFor={id}><span className="field-label">{label}</span>{children}</label>; }
function Num({ id, value, onChange, min, max, step = "any" }: { id: string; value: string; onChange: (v: string) => void; min?: number; max?: number; step?: string }) { return <input id={id} className={input} type="number" value={value} min={min} max={max} step={step} onChange={(e) => onChange(e.target.value)} placeholder={`e.g. ${value || "16"}`} />; }
function Select({ id, value, onChange, options }: { id: string; value: string; onChange: (v: string) => void; options: string[] }) { return <select id={id} className={select} value={value} onChange={(e) => onChange(e.target.value)}>{options.map((o) => <option key={o}>{o}</option>)}</select>; }
function Row({ children }: { children: React.ReactNode }) { return <div className="converter-row">{children}</div>; }
function Output({ label, value }: { label: string; value: string }) { return <div className="converter-output"><div><small>{label}</small><output>{value}</output></div><CopyButton value={value} /></div>; }

const units: Record<string, string[]> = { length: ["mm", "cm", "m", "km", "in", "ft", "yd", "mi"], mass: ["mg", "g", "kg", "t", "oz", "lb", "st"], temperature: ["C", "F", "K"] };
const currencyCodes = ["USD", "EUR", "GBP", "INR", "JPY", "CAD", "AUD", "CHF", "CNY", "NZD", "SGD", "ZAR", "BRL", "MXN", "SEK", "NOK", "DKK", "KRW", "HKD", "THB"];

export function ConvertersSuite({ mode }: { mode: ConverterMode }) {
  const [value, setValue] = useState("16");
  const [root, setRoot] = useState("16");
  const [parent, setParent] = useState("20");
  const [from, setFrom] = useState(mode === "milliseconds" ? "milliseconds" : mode === "bytes" ? "B" : mode === "css-units" ? "px" : "mm");
  const [to, setTo] = useState(mode === "milliseconds" ? "seconds" : mode === "bytes" ? "KiB" : mode === "css-units" ? "rem" : "cm");
  const [category, setCategory] = useState("length");
  const [precision, setPrecision] = useState("4");
  const [text, setText] = useState('{"tag":["one","two"],"empty":"","q":"a & b"}');
  const [cron, setCron] = useState("*/5 * * * *");
  const [preset, setPreset] = useState("Every 5 minutes");
  const [date, setDate] = useState("2024-01-01T00:00:00Z");
  const [timestampInput, setTimestampInput] = useState("1704067200");
  const [timestampUnit, setTimestampUnit] = useState("seconds");
  const [currentTimestamp, setCurrentTimestamp] = useState<number | null>(null);
  const [start, setStart] = useState("2024-01-01");
  const [end, setEnd] = useState("2024-01-31");
  const [inclusive, setInclusive] = useState(false);
  const [zoneA, setZoneA] = useState("Asia/Kolkata");
  const [zoneB, setZoneB] = useState("Australia/Melbourne");
  const [time, setTime] = useState("12:00");
  const [amount, setAmount] = useState("1");
  const [base, setBase] = useState("USD");
  const [quote, setQuote] = useState("EUR");
  const [currencyResult, setCurrencyResult] = useState<{ rate: number; date: string; converted: number; refreshed: string } | null>(null);
  const [currencyState, setCurrencyState] = useState("");
  const [loading, setLoading] = useState(false);

  const computed = useMemo(() => {
    try {
      const output = (() => {
      const n = Number(value);
      if (mode === "px-rem") return `${pxToRem(n, +root).toFixed(+precision)} rem`;
      if (mode === "rem-em") return `${remToEm(n, +root, +parent).toFixed(+precision)} em`;
      if (mode === "bytes") return `${convertStorage(n, from, to).toFixed(+precision)} ${to}`;
      if (mode === "milliseconds") return `${convertDuration(n, from, to).toFixed(+precision)} ${to}`;
      if (mode === "unit-converter") return `${convertUnits(n, category as "length" | "mass" | "temperature", from, to).toFixed(+precision)} ${to}`;
      if (mode === "css-units") { const converted = convertCssLength(n, from, to, { rootPx: +root || undefined, parentPx: +parent || undefined, viewportWidth: 1280, viewportHeight: 800 }); return `${Number(converted.value.toFixed(+precision))} ${to}${converted.exact ? " (exact CSS unit ratio)" : " (context-dependent)"}`; }
      if (mode === "json-query-string") return text.trim().startsWith("?") ? queryToJson(text) : jsonToQuery(text);
      if (mode === "cron-explainer") { const parsed = parseCron(cron); return `${parsed.summary}\n\n${parsed.breakdown.map((f) => `${f.name}: ${f.value}`).join("\n")}`; }
      if (mode === "cron-generator") { parseCron(cron); return cron; }
      if (mode === "date-difference") { const d = dateDifference(start, end, inclusive); return `${d.days} days · ${d.weeks} weeks ${d.remainingDays} days · ${d.years} years ${d.months} months ${d.calendarDays} days${d.reversed ? " · end precedes start" : ""}`; }
      if (mode === "unix-timestamp") { const ms = timestampFromDate(date); const d = new Date(ms); return `Seconds: ${Math.floor(ms / 1000)}\nMilliseconds: ${ms}\nUTC: ${d.toISOString()}\nLocal: ${d.toLocaleString()} (${Intl.DateTimeFormat().resolvedOptions().timeZone})`; }
      if (mode === "timezone-converter") { const converted = zonedDateTimeToUtc(date.slice(0, 10), time, zoneA); if (converted.nonexistent) throw Error("That wall-clock time does not exist because of a daylight-saving transition."); return `${new Intl.DateTimeFormat(undefined, { dateStyle: "full", timeStyle: "long", timeZone: zoneB }).format(converted.instant)}${converted.ambiguous ? " · Source time is ambiguous during a daylight-saving transition; earlier occurrence shown." : ""}\nUTC: ${converted.instant.toISOString()}`; }
      return "";
      })();
      return { value: output, error: "" };
    } catch (e) { return { value: "", error: e instanceof Error ? e.message : "Check the input values." }; }
  }, [mode, value, root, parent, from, to, category, precision, text, cron, date, start, end, inclusive, zoneA, zoneB, time]);
  const result = computed.value;
  const error = computed.error;

  async function refreshCurrency() {
    setLoading(true); setCurrencyState("");
    try {
      if (!Number.isFinite(+amount) || +amount < 0) throw Error("Enter a valid non-negative amount.");
      const response = await fetch(`https://api.frankfurter.dev/v2/rate/${encodeURIComponent(base.toLowerCase())}/${encodeURIComponent(quote.toLowerCase())}`, { cache: "no-store" });
      if (!response.ok) throw Error(response.status === 422 ? "The provider does not support this currency pair." : `Rate provider returned HTTP ${response.status}.`);
      const data = parseCurrencyRate(await response.json(), base, quote);
      setCurrencyResult({ ...data, converted: +amount * data.rate, refreshed: new Date().toLocaleString() }); setCurrencyState("Rate refreshed from Frankfurter.");
    } catch (e) { setCurrencyState(`${e instanceof Error ? e.message : "Rate request failed."}${currencyResult ? " Last successful result is stale." : " No rate is available yet."}`); }
    finally { setLoading(false); }
  }

  function reset() { setValue("16"); setRoot("16"); setParent("20"); setText('{"tag":["one","two"],"empty":"","q":"a & b"}'); }
  function useCurrentTime() { const now = Date.now(); setCurrentTimestamp(now); setDate(new Date(now).toISOString()); }

  if (mode === "currency") return <div className="tool-workspace"><Row><Field label="Amount" id="amount"><Num id="amount" value={amount} onChange={setAmount} min={0} /></Field><Field label="From" id="base"><Select id="base" value={base} onChange={setBase} options={currencyCodes} /></Field><button className="button button-secondary" type="button" onClick={() => { setBase(quote); setQuote(base); }}>Swap</button><Field label="To" id="quote"><Select id="quote" value={quote} onChange={setQuote} options={currencyCodes} /></Field></Row><button className="button button-primary" onClick={refreshCurrency} disabled={loading}>{loading ? "Loading rate…" : "Fetch current rate"}</button>{currencyState && <p role="status">{currencyState}</p>}{currencyResult && <section className="converter-result"><Output label={`${amount} ${base} → ${quote}`} value={`${currencyResult.converted.toFixed(2)} ${quote}`} /><p>Rate: 1 {base} = {currencyResult.rate} {quote}</p><p>Source rate date: {currencyResult.date}. Last successful refresh: {currencyResult.refreshed}.</p></section>}<p className="field-help">Indicative daily reference rates from <a href="https://frankfurter.dev/" target="_blank" rel="noreferrer">Frankfurter API documentation</a>. Rates update daily and may differ from bank or payment provider rates. Requests happen only when you select refresh; rates are not cached.</p></div>;

  return <div className="tool-workspace">
    {mode === "px-rem" && <><Row><Field label="Pixels (px)" id="value"><Num id="value" value={value} onChange={setValue} /></Field><Field label="Root font size (px)" id="root"><Num id="root" value={root} onChange={setRoot} min={0.01} /></Field><Field label="Precision" id="precision"><Select id="precision" value={precision} onChange={setPrecision} options={["2", "3", "4", "6"]} /></Field></Row><Output label="Equivalent rem" value={result} /><p className="field-help">rem = px ÷ root font size. Conversion depends on the configured root size.</p></>}
    {mode === "rem-em" && <><Row><Field label="rem value" id="value"><Num id="value" value={value} onChange={setValue} /></Field><Field label="Root font size (px)" id="root"><Num id="root" value={root} onChange={setRoot} min={0.01} /></Field><Field label="Parent/context font size (px)" id="parent"><Num id="parent" value={parent} onChange={setParent} min={0.01} /></Field></Row><Output label="Equivalent em" value={result} /><p className="field-help">Assumption: rem value × root size ÷ parent size. rem is root-relative; em is relative to the current element&apos;s parent/context size.</p></>}
    {mode === "bytes" && <><Row><Field label="Value" id="value"><Num id="value" value={value} onChange={setValue} /></Field><Field label="From unit" id="from"><Select id="from" value={from} onChange={setFrom} options={["B", "kB", "MB", "GB", "TB", "KiB", "MiB", "GiB", "TiB"]} /></Field><Field label="To unit" id="to"><Select id="to" value={to} onChange={setTo} options={["B", "kB", "MB", "GB", "TB", "KiB", "MiB", "GiB", "TiB"]} /></Field><Field label="Precision" id="precision"><Select id="precision" value={precision} onChange={setPrecision} options={["0", "2", "4", "6"]} /></Field></Row><Output label="Converted storage size" value={result} /><p className="field-help">Decimal kB/MB/GB/TB use powers of 1000. Binary KiB/MiB/GiB/TiB use powers of 1024.</p></>}
    {mode === "milliseconds" && <><Row><Field label="Value" id="value"><Num id="value" value={value} onChange={setValue} /></Field><Field label="From" id="from"><Select id="from" value={from} onChange={setFrom} options={["milliseconds", "seconds", "minutes", "hours", "days"]} /></Field><Field label="To" id="to"><Select id="to" value={to} onChange={setTo} options={["milliseconds", "seconds", "minutes", "hours", "days"]} /></Field><Field label="Precision" id="precision"><Select id="precision" value={precision} onChange={setPrecision} options={["0", "2", "4", "6"]} /></Field></Row><Output label="Converted duration" value={result} /></>}
    {mode === "unit-converter" && <><Row><Field label="Category" id="category"><Select id="category" value={category} onChange={(v) => { setCategory(v); setFrom(units[v][0]); setTo(units[v][1]); }} options={Object.keys(units)} /></Field><Field label="Value" id="value"><Num id="value" value={value} onChange={setValue} /></Field><Field label="From" id="from"><Select id="from" value={from} onChange={setFrom} options={units[category]} /></Field><button className="button button-secondary" type="button" onClick={() => { setFrom(to); setTo(from); }}>Swap</button><Field label="To" id="to"><Select id="to" value={to} onChange={setTo} options={units[category]} /></Field><Field label="Precision" id="precision"><Select id="precision" value={precision} onChange={setPrecision} options={["2", "4", "6"]} /></Field></Row><Output label="Converted value" value={result} /><p className="field-help">Temperature uses affine formulas. Kelvin values below absolute zero are rejected.</p></>}
    {mode === "unix-timestamp" && <><Row><Field label="ISO 8601 date/time" id="date"><input id="date" className={input} type="datetime-local" value={date.slice(0, 16)} onChange={(e) => setDate(e.target.value)} /></Field><button className="button button-secondary" onClick={useCurrentTime}>Use current time</button></Row><Output label="Unix seconds, milliseconds, UTC, and local time" value={result} /><Row><Field label="Timestamp value" id="timestamp-input"><Num id="timestamp-input" value={timestampInput} onChange={setTimestampInput} /></Field><Field label="Timestamp unit (explicit)" id="timestamp-unit"><Select id="timestamp-unit" value={timestampUnit} onChange={setTimestampUnit} options={["seconds", "milliseconds"]} /></Field></Row><TimestampOutput value={timestampInput} unit={timestampUnit} /><p className="field-help">Timestamp units are selected explicitly. ISO date/time input without a timezone is interpreted using your browser&apos;s local timezone. {currentTimestamp === null ? "Select Use current time to display the current timestamp." : `Current Unix time: ${Math.floor(currentTimestamp / 1000)} seconds / ${currentTimestamp} milliseconds.`}</p></>}
    {mode === "timezone-converter" && <><Row><Field label="Date" id="date"><input className={input} id="date" type="date" value={date.slice(0, 10)} onChange={(e) => setDate(e.target.value)} /></Field><Field label="Time" id="time"><input className={input} id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field><Field label="Source IANA timezone" id="zoneA"><input className={input} id="zoneA" value={zoneA} onChange={(e) => setZoneA(e.target.value)} list="timezones" placeholder="e.g. Asia/Kolkata" /></Field><Field label="Destination IANA timezone" id="zoneB"><input className={input} id="zoneB" value={zoneB} onChange={(e) => setZoneB(e.target.value)} list="timezones" placeholder="e.g. Australia/Melbourne" /></Field><datalist id="timezones">{["Australia/Melbourne", "Asia/Kolkata", "Europe/London", "America/New_York", "UTC", "Asia/Tokyo", "Pacific/Auckland"].map((z) => <option key={z} />)}</datalist><button className="button button-secondary" onClick={() => { setZoneA(zoneB); setZoneB(zoneA); }}>Swap</button></Row><Output label="Destination local time" value={result} /><p className="field-help">IANA timezone rules are provided by your browser&apos;s Intl database. DST gaps and repeated local times are detected; earlier occurrence is selected for an ambiguous time.</p></>}
    {mode === "date-difference" && <><Row><Field label="Start date" id="start"><input id="start" className={input} type="date" value={start} onChange={(e) => setStart(e.target.value)} /></Field><Field label="End date" id="end"><input id="end" className={input} type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></Field><label className="inline-check"><input type="checkbox" checked={inclusive} onChange={(e) => setInclusive(e.target.checked)} /> Count both calendar dates (inclusive)</label></Row><Output label="Date difference" value={result} /><p className="field-help">Date-only inputs are calendar dates (UTC calendar arithmetic), not instants. Elapsed days and calendar years/months/days are different measures.</p></>}
    {mode === "json-query-string" && <><Field label="JSON object or query string (start query input with ?)" id="text"><textarea id="text" className="code-input" value={text} onChange={(e) => setText(e.target.value)} rows={7} placeholder={text.trim().startsWith("?") ? "?tag=one&tag=two&q=hello" : '{"name":"Ada","tag":["writer","editor"]}'} /></Field><Output label="Converted output" value={result} /><p className="field-help">Flat JSON only. Arrays serialize as repeated keys; query duplicates parse back as arrays. Nested values are rejected because URL query nesting has no universal convention; empty strings remain empty values.</p></>}
    {mode === "cron-generator" && <><Field label="Schedule preset" id="preset"><Select id="preset" value={preset} onChange={(v) => { setPreset(v); setCron(({ "Every minute": "* * * * *", "Every 5 minutes": "*/5 * * * *", Hourly: "0 * * * *", Daily: "0 0 * * *", Weekdays: "0 9 * * 1-5", Weekly: "0 0 * * 0", Monthly: "0 0 1 * *" } as Record<string, string>)[v]); }} options={["Every minute", "Every 5 minutes", "Hourly", "Daily", "Weekdays", "Weekly", "Monthly"]} /></Field><Field label="Five-field expression" id="cron"><input id="cron" className={input} value={cron} onChange={(e) => setCron(e.target.value)} placeholder="e.g. 0 9 * * 1-5" /></Field><Output label="Cron expression" value={result ? cron : ""} /><p className="field-help">Five-field numeric dialect. Day-of-month and day-of-week semantics vary between cron implementations; confirm your scheduler&apos;s behavior.</p></>}
    {mode === "cron-explainer" && <><Field label="Five-field cron expression" id="cron"><input id="cron" className={input} value={cron} onChange={(e) => setCron(e.target.value)} placeholder="*/5 9-17 * * 1-5" /></Field><Output label="Explanation" value={result} /><p className="field-help">Supports *, numeric values, comma lists, ascending ranges and positive steps. No names, ?, L, W, #, seconds, or year field. This is a standard five-field dialect, not Quartz/systemd.</p></>}
    {mode === "css-units" && <><Row><Field label="Value" id="value"><Num id="value" value={value} onChange={setValue} /></Field><Field label="From" id="from"><Select id="from" value={from} onChange={setFrom} options={["px", "rem", "em", "vw", "vh", "vmin", "vmax", "cm", "mm", "in", "pt", "pc"]} /></Field><button className="button button-secondary" onClick={() => { setFrom(to); setTo(from); }}>Swap</button><Field label="To" id="to"><Select id="to" value={to} onChange={setTo} options={["px", "rem", "em", "vw", "vh", "vmin", "vmax", "cm", "mm", "in", "pt", "pc"]} /></Field></Row><Row><Field label="Root font size (px)" id="root"><Num id="root" value={root} onChange={setRoot} min={0.01} /></Field><Field label="Parent font size (px)" id="parent"><Num id="parent" value={parent} onChange={setParent} min={0.01} /></Field><p>Assumed viewport: 1280 × 800 px</p></Row><Output label="CSS length" value={result} /><p className="field-help">rem/em use supplied font sizes; viewport units use the displayed viewport assumption. Physical CSS units follow 96 px per inch. Percentages need a reference dimension and are intentionally not guessed. For px ↔ rem, see <Link href="/tools/converters/px-rem">PX to REM Converter</Link>.</p></>}
    {error && <ErrorState>{error}</ErrorState>}<div className="workspace-actions"><ResetButton onClick={reset} /></div>
  </div>;
}

function TimestampOutput({ value, unit }: { value: string; unit: string }) {
  const converted = useMemo(() => {
    try {
      if (!value.trim()) throw new Error("Enter a timestamp.");
      const date = timestampToDate(Number(value), unit as "seconds" | "milliseconds");
      return { text: `UTC: ${date.toISOString()}\nLocal: ${date.toLocaleString()} (${Intl.DateTimeFormat().resolvedOptions().timeZone})`, error: "" };
    } catch (error) { return { text: "", error: error instanceof Error ? error.message : "Enter a valid timestamp." }; }
  }, [value, unit]);
  return converted.error ? <ErrorState>{converted.error}</ErrorState> : <Output label={`Readable date from ${unit}`} value={converted.text} />;
}
