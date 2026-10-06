import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page-width not-found-page">
      <span className="eyebrow">404 · Nothing in this drawer</span>
      <h1>We couldn’t find that tool.</h1>
      <p>It may have moved, or the address may be slightly off.</p>
      <Link className="button button-primary" href="/tools">Browse all tools</Link>
    </main>
  );
}
