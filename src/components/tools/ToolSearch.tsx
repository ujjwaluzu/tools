"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { categories, tools } from "@/lib/tools/registry";

// href is the catalogue identity; a few registry entries share a slug across categories.
const uniqueTools = Array.from(new Map(tools.map((tool) => [tool.href, tool])).values());

export function ToolSearch() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return [];
    return uniqueTools.filter((tool) => {
      const category = categories.find((item) => item.slug === tool.category)?.name ?? "";
      return [tool.title, tool.description, category, ...tool.keywords].join(" ").toLocaleLowerCase().includes(normalized);
    });
  }, [query]);

  return (
    <div className="search-wrap">
      <label className="search-box" htmlFor="tool-search">
        <input
          id="tool-search" type="search" role="combobox" aria-autocomplete="list" aria-haspopup="listbox"
          value={query} onChange={(event) => setQuery(event.target.value)}
          placeholder="Search tools…" autoComplete="off" aria-controls="tool-search-results" aria-expanded={query.trim().length > 0}
          onKeyDown={(event) => {
            if (event.key === "Escape") setQuery("");
            if (event.key === "Enter" && results[0]) window.location.assign(results[0].href);
          }}
        />
        {query && <button className="search-clear" type="button" aria-label="Clear search" onClick={() => setQuery("")}>×</button>}
        <button className="search-submit" type="button" onClick={() => results[0] && window.location.assign(results[0].href)}>Search</button>
      </label>
      {query.trim() && (
        <div className="search-results" id="tool-search-results" role="listbox" aria-label="Tool search results">
          {results.length ? results.map((tool) => (
            <Link role="option" aria-selected="false" href={tool.href} className="search-result" key={tool.href} onClick={() => setQuery("")}>
              <span><strong>{tool.title}</strong><small>{tool.description}</small></span>
              <span aria-hidden="true">↗</span>
            </Link>
          )) : <p className="search-empty">No tools found. Try a shorter search.</p>}
        </div>
      )}
    </div>
  );
}
