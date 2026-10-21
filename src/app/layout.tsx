import type { Metadata, Viewport } from "next";
import { DM_Mono, Instrument_Sans } from "next/font/google";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const dmMono = DM_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://tools.ujjwaluzu.in"),
  title: { default: "Ujjwal Tools — Tiny tools for annoying tasks", template: "%s — Ujjwal Tools" },
  description: "Small, useful tools for everyday, developer, document, and creative tasks. Private by default, with local processing whenever possible.",
  applicationName: "Ujjwal Tools",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    other: [{ rel: "shortcut icon", url: "/favicon.ico", type: "image/x-icon" }],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    siteName: "Ujjwal Tools",
    title: "Ujjwal Tools — Tiny tools for annoying tasks",
    description: "Small tools for annoying tasks, processed locally whenever possible.",
    url: "https://tools.ujjwaluzu.in/tools",
  },
};

export const viewport: Viewport = { themeColor: "#ffffff" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${instrumentSans.variable} ${dmMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try { var theme = localStorage.getItem("ujjwal-tools-theme"); if (theme !== "light" && theme !== "dark") theme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"; document.documentElement.dataset.theme = theme; } catch (_) { document.documentElement.dataset.theme = "light"; }` }} />
      </head>
      <body>
        <header className="site-header">
          <div className="header-inner">
            <Link className="brand" href="/tools" aria-label="Ujjwal Tools home">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 3v6a4 4 0 0 0 8 0V3" /></svg>
            </Link>
            <div className="header-actions">
              <nav className="header-nav" aria-label="Main navigation">
                <Link href="/tools">All tools</Link>
                <Link href="/tools#categories">Categories</Link>
              </nav>
              <ThemeToggle />
            </div>
          </div>
        </header>
        <div className="site-frame">
          <div className="frame-center">{children}</div>
        </div>
        <footer className="site-footer">
          <div className="footer-inner">
            <span>Small tools for annoying tasks.</span>
            <nav className="footer-links" aria-label="External links">
              <a href="https://ujjwaluzu.in" target="_blank" rel="noopener noreferrer">Portfolio</a>
              <a href="https://blog.ujjwaluzu.in" target="_blank" rel="noopener noreferrer">Blog</a>
              <a href="https://status.ujjwaluzu.in" target="_blank" rel="noopener noreferrer">Status</a>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
