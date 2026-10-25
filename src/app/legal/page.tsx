import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Legal Notice",
  description: "Legal information about Ujjwal Tools, its content, and third-party services.",
  alternates: { canonical: "/legal" },
};

export default function LegalNoticePage() {
  return (
    <LegalPage title="Legal Notice" summary="Important information about the site and its tools.">
      <section>
        <h2>Service information</h2>
        <p>Ujjwal Tools provides small browser-based utilities and related informational content. The tools are general-purpose and are not a substitute for professional advice or independent verification.</p>
      </section>
      <section>
        <h2>Content and software</h2>
        <p>Unless otherwise stated, the site’s original design, text, and software are provided by the site operator. You may use the tools to process your own material, but this does not transfer ownership of the site or grant rights to third-party content, brands, or software used by the tools.</p>
      </section>
      <section>
        <h2>Third-party services</h2>
        <p>Some tools rely on outside services, including Frankfurter for reference exchange rates and jsDelivr for OCR software delivery. External websites and services are independent of Ujjwal Tools and may have separate terms, privacy practices, and availability.</p>
      </section>
      <section>
        <h2>Related pages</h2>
        <p>Read the <Link href="/terms">Terms of Use</Link> and <Link href="/privacy">Privacy Policy</Link> for more information about using the site and how tools handle data.</p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>For site-related questions, use the contact options on the <a href="https://ujjwaluzu.in" target="_blank" rel="noopener noreferrer">portfolio site</a>.</p>
      </section>
    </LegalPage>
  );
}
