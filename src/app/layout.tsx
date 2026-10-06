import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://tools.ujjwaluzu.in"),
  title: { default: "Ujjwal Tools — Tiny tools for annoying tasks", template: "%s — Ujjwal Tools" },
  description: "Small, useful tools for everyday, developer, document, and creative tasks. Private by default, with local processing whenever possible.",
  applicationName: "Ujjwal Tools",
  openGraph: {
    type: "website",
    siteName: "Ujjwal Tools",
    title: "Ujjwal Tools — Tiny tools for annoying tasks",
    description: "Small tools for annoying tasks, processed locally whenever possible.",
    url: "https://tools.ujjwaluzu.in/tools",
  },
};

export const viewport: Viewport = { themeColor: "#f7f7f3" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="header-inner">
            <Link className="brand" href="/tools" aria-label="Ujjwal Tools home">
              <span className="brand-mark" aria-hidden="true">u.</span>
              <span>Ujjwal Tools</span>
            </Link>
            <nav className="header-nav" aria-label="Main navigation">
              <Link href="/tools">All tools</Link>
              <Link href="/tools#categories">Categories</Link>
            </nav>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <div className="footer-inner">
            <span>Small tools for annoying tasks.</span>
            <span>Made to be useful. Private by default.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
