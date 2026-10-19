import fs from "node:fs";
import ts from "typescript";

const src = fs.readFileSync("src/lib/tools/registry.ts", "utf8");
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const mod = { exports: {} };
new Function("exports", "module", "require", js)(mod.exports, mod, (id) => import(id));
const { tools, categories } = mod.exports;

const byHref = new Map();
const bySlug = new Map();
for (const t of tools) {
  byHref.set(t.href, (byHref.get(t.href) ?? 0) + 1);
  bySlug.set(t.slug, (bySlug.get(t.slug) ?? 0) + 1);
}
console.log("total tools:", tools.length);
console.log("unique hrefs:", byHref.size, "| dup hrefs:", [...byHref].filter(([, n]) => n > 1));
console.log("unique slugs:", bySlug.size, "| dup slugs:", [...bySlug].filter(([, n]) => n > 1));
console.log("popular:", tools.filter((t) => t.popular).map((t) => t.title));
console.log("per-category:", categories.map((c) => `${c.slug}=${tools.filter((t) => t.category === c.slug).length}`).join(" "));
console.log("zero-tool categories:", categories.filter((c) => !tools.some((t) => t.category === c.slug)).map((c) => c.slug));
console.log("missing category refs:", [...new Set(tools.map((t) => t.category))].filter((c) => !categories.some((x) => x.slug === c)));
