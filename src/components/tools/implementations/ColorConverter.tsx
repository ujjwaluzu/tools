"use client";

import { useMemo, useState } from "react";
import { CopyButton, ErrorState } from "@/components/tools/primitives";
import { colorFormats, parseColor } from "@/lib/tools/converters";

export function ColorConverter() {
  const [format, setFormat] = useState<"HEX" | "RGB" | "HSL">("HEX");
  const [input, setInput] = useState("#5B65D8");
  const converted = useMemo(() => { try { return { values: colorFormats(parseColor(input, format)), error: "" }; } catch (e) { return { values: null, error: e instanceof Error ? e.message : "Check the color value." }; } }, [format, input]);
  return <div className="tool-workspace">
    <div className="color-input-row"><div className="field-group color-format-field"><label className="field-label" htmlFor="color-format">Input format</label><select id="color-format" className="text-input" value={format} onChange={(event) => setFormat(event.target.value as "HEX" | "RGB" | "HSL")}><option>HEX</option><option>RGB</option><option>HSL</option></select></div><div className="field-group color-value-field"><label className="field-label" htmlFor="color-value">Color value</label><input id="color-value" className="text-input" value={input} onChange={(event) => setInput(event.target.value)} placeholder={format === "HEX" ? "#5B65D8" : format === "RGB" ? "rgb(91, 101, 216)" : "hsl(236 62% 60%)"} spellCheck={false} /></div></div>
    {input && converted.error && <ErrorState>{converted.error}</ErrorState>}
    {converted.values && <div className="color-preview-card"><div className="color-swatch" style={{ backgroundColor: converted.values.HEX }}><span>Preview: {converted.values.HEX}</span></div><div className="color-values">{(Object.entries(converted.values) as [keyof typeof converted.values, string][]).map(([label, value]) => <div className="color-value-row" key={label}><span><small>{label}</small><code>{value}</code></span><CopyButton value={value} label="Copy" /></div>)}</div></div>}
    {!input && <div className="empty-state">Enter a color value to see its conversions.</div>}
  </div>;
}
