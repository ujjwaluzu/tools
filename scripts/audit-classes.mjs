import fs from "node:fs";
import path from "node:path";

const css = fs.readFileSync("src/app/globals.css", "utf8");
const cssClasses = new Set([...css.matchAll(/\.([a-z][\w-]*)/gi)].map((m) => m[1]));

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.name.endsWith(".tsx")) out.push(p);
  }
  return out;
}

const used = new Map();
for (const file of walk("src")) {
  const text = fs.readFileSync(file, "utf8");
  for (const m of text.matchAll(/className="([^"]*)"/g)) {
    for (const cls of m[1].split(/\s+/)) if (cls) (used.get(cls) ?? used.set(cls, []).get(cls)).push(file);
  }
  for (const m of text.matchAll(/className=\{`([^`]+)`\}/g)) {
    for (const cls of m[1].replace(/\$\{[^}]*\}/g, " ").split(/\s+/)) {
      if (cls && !cls.includes("$")) (used.get(cls) ?? used.set(cls, []).get(cls)).push(file);
    }
  }
  for (const m of text.matchAll(/"([a-z]+-[a-z-]+)"/g)) { /* static strings in conditionals */ }
}

const missing = [...used.keys()].filter((cls) => !cssClasses.has(cls)).sort();
console.log("classes used:", used.size, "| missing from CSS:", missing.length);
for (const cls of missing) console.log("  -", cls, "->", [...new Set(used.get(cls))].join(", "));

// reverse: dead CSS classes (informational)
const dead = [...cssClasses].filter((cls) => !used.has(cls)).sort();
console.log("CSS classes not found in TSX (may be dynamic/state):", dead.join(", "));
