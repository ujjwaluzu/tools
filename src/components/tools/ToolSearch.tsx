"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { categories, tools } from "@/lib/tools/registry";

export function ToolSearch() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return [];
    return tools.filter((tool) => {
      const category = categories.find((item) => item.slug === tool.category)?.name ?? "";
      return [tool.title, tool.description, category, ...tool.keywords].join(" ").toLocaleLowerCase().includes(normalized);
    });
  }, [query]);

  return (
    <div className="search-wrap">
      <label className="search-box" htmlFor="tool-search">
        <span className="search-glyph" aria-hidden="true">⌕</span>
        <input
          id="tool-search" type="search" role="combobox" aria-autocomplete="list" aria-haspopup="listbox"
          value={query} onChange={(event) => setQuery(event.target.value)}
          placeholder="Search tools…" autoComplete="off" aria-controls="tool-search-results" aria-expanded={query.trim().length > 0}
          onKeyDown={(event) => {
            if (event.key === "Escape") setQuery("");
            if (event.key === "Enter" && results[0]) window.location.assign(results[0].href);
          }}
        />
        <kbd>Enter</kbd>
        {query && <button className="search-clear" type="button" aria-label="Clear search" onClick={() => setQuery("")}>×</button>}
      </label>
      {query.trim() && (
        <div className="search-results" id="tool-search-results" role="listbox" aria-label="Tool search results">
          {results.length ? results.map((tool) => (
            <Link role="option" aria-selected="false" href={tool.href} className="search-result" key={tool.href} onClick={() => setQuery("")}>
              <span className="tool-icon small-icon" aria-hidden="true">{tool.icon}</span>
              <span><strong>{tool.title}</strong><small>{tool.description}</small></span>
              <span aria-hidden="true">↗</span>
            </Link>
          )) : <p className="search-empty">No tools found. Try a shorter search.</p>}
        </div>
      )}
    </div>
  );
}
