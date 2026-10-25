import type { ReactNode } from "react";

export function LegalPage({ title, summary, children }: { title: string; summary: string; children: ReactNode }) {
  return (
    <main className="page-width legal-page">
      <header className="legal-heading">
        <span className="eyebrow">Ujjwal Tools · Legal</span>
        <h1>{title}</h1>
        <p>{summary}</p>
        <span className="legal-updated">Last updated October 25, 2026</span>
      </header>
      <article className="legal-content">{children}</article>
    </main>
  );
}
