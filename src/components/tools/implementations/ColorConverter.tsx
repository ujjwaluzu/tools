"use client";

import { useMemo, useState } from "react";
import { CopyButton, ErrorState } from "@/components/tools/primitives";

type Rgb = { r: number; g: number; b: number };

function parseHex(value: string): Rgb | null {
  const raw = value.trim().replace(/^#/, "");
  if (!/^(?:[\da-f]{3}|[\da-f]{6})$/i.test(raw)) return null;
  const hex = raw.length === 3 ? raw.split("").map((char) => char + char).join("") : raw;
  return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16) };
}

function parseRgb(value: string): Rgb | null {
  const match = value.trim().match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
  if (!match) return null;
  const values = match.slice(1).map(Number);
  if (values.some((channel) => channel < 0 || channel > 255)) return null;
  return { r: values[0], g: values[1], b: values[2] };
}

function parseHsl(value: string): Rgb | null {
  const match = value.trim().match(/^hsla?\(\s*(-?\d+(?:\.\d+)?)\s*,?\s*(\d+(?:\.\d+)?)%\s*,?\s*(\d+(?:\.\d+)?)%\s*\)$/i);
  if (!match) return null;
  const h = ((Number(match[1]) % 360) + 360) % 360 / 360;
  const s = Number(match[2]) / 100;
  const l = Number(match[3]) / 100;
  if (s > 1 || l > 1) return null;
  const hue = (n: number) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return { r: Math.round(hue(0) * 255), g: Math.round(hue(8) * 255), b: Math.round(hue(4) * 255) };
}

function toHex({ r, g, b }: Rgb): string { return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("").toUpperCase()}`; }
function toHsl({ r, g, b }: Rgb): string {
  const red = r / 255, green = g / 255, blue = b / 255;
  const max = Math.max(red, green, blue), min = Math.min(red, green, blue);
  const delta = max - min;
  const lightness = (max + min) / 2;
  let hue = 0, saturation = 0;
  if (delta) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));
    switch (max) {
      case red: hue = ((green - blue) / delta) % 6; break;
      case green: hue = (blue - red) / delta + 2; break;
      default: hue = (red - green) / delta + 4;
    }
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  return `hsl(${Math.round(hue)} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%)`;
}

export function ColorConverter() {
  const [format, setFormat] = useState<"HEX" | "RGB" | "HSL">("HEX");
  const [input, setInput] = useState("#5B65D8");
  const color = useMemo(() => format === "HEX" ? parseHex(input) : format === "RGB" ? parseRgb(input) : parseHsl(input), [format, input]);
  const values = color ? { HEX: toHex(color), RGB: `rgb(${color.r}, ${color.g}, ${color.b})`, HSL: toHsl(color) } : null;
  return <div className="tool-workspace">
    <div className="color-input-row"><div className="field-group color-format-field"><label className="field-label" htmlFor="color-format">Input format</label><select id="color-format" className="text-input" value={format} onChange={(event) => setFormat(event.target.value as "HEX" | "RGB" | "HSL")}><option>HEX</option><option>RGB</option><option>HSL</option></select></div><div className="field-group color-value-field"><label className="field-label" htmlFor="color-value">Color value</label><input id="color-value" className="text-input" value={input} onChange={(event) => setInput(event.target.value)} placeholder={format === "HEX" ? "#5B65D8" : format === "RGB" ? "rgb(91, 101, 216)" : "hsl(236 62% 60%)"} spellCheck={false} /></div></div>
    {input && !color && <ErrorState>That {format} value doesn’t look right. Check the format and try again.</ErrorState>}
    {values && color && <div className="color-preview-card"><div className="color-swatch" style={{ backgroundColor: values.HEX }}><span>Preview</span></div><div className="color-values">{(Object.entries(values) as [keyof typeof values, string][]).map(([label, value]) => <div className="color-value-row" key={label}><span><small>{label}</small><code>{value}</code></span><CopyButton value={value} label="Copy" /></div>)}</div></div>}
    {!input && <div className="empty-state">Enter a color value to see its conversions.</div>}
  </div>;
}
