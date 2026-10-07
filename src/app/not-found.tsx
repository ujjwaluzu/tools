import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page-width not-found-page">
      <section className="not-found-card" aria-labelledby="not-found-title">
        <div className="not-found-number" aria-hidden="true">404</div>
        <div className="not-found-copy">
          <span className="eyebrow"><span className="status-dot" />Lost in the toolbox</span>
          <h1 id="not-found-title">That page isn’t here.</h1>
          <p>The link may be out of date, or the address may have a typo. Head back to the toolbox and find what you need.</p>
          <div className="not-found-actions">
            <Link className="button button-primary" href="/tools">Browse all tools</Link>
            <Link className="button button-secondary" href="/tools#categories">Browse categories</Link>
          </div>
          <span className="not-found-footnote">Your next useful tool is a few clicks away.</span>
        </div>
      </section>
    </main>
  );
}
