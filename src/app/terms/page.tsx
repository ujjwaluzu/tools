import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Terms for using Ujjwal Tools.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use" summary="The terms for using the tools and information on this site.">
      <section>
        <h2>Using the site</h2>
        <p>By using Ujjwal Tools, you agree to these terms. If you do not agree, do not use the site. You must use the tools lawfully and avoid disrupting the site, trying to gain unauthorized access, or using the tools to violate another person’s rights.</p>
      </section>
      <section>
        <h2>Your content</h2>
        <p>You keep your rights to the text and files you provide and to the results you create. Most tools process data in your browser. A few features make requests to outside services, as described in the <Link href="/privacy">Privacy Policy</Link> and in the relevant tool. You are responsible for having the rights and permissions needed to use your inputs and outputs.</p>
      </section>
      <section>
        <h2>Results and availability</h2>
        <p>The tools are provided for general convenience. Results may be incomplete, inaccurate, or unsuitable for a particular purpose. Check important results before relying on them. The site may change, be interrupted, or become unavailable at any time.</p>
        <p>Nothing on this site is professional, financial, legal, medical, or other regulated advice. Currency conversions use indicative reference rates and are not quotes or transaction offers.</p>
      </section>
      <section>
        <h2>Third-party services and links</h2>
        <p>Some features use third-party services, and the site may link to other websites. Those services and sites have their own terms and privacy practices. We do not control or endorse their content or availability.</p>
      </section>
      <section>
        <h2>Disclaimers and liability</h2>
        <p>To the extent permitted by applicable law, the site and its tools are provided “as is” and “as available,” without warranties of any kind. To the extent permitted by law, the site operator is not liable for indirect or consequential loss arising from your use of, or inability to use, the site. Nothing in these terms limits rights or remedies that cannot legally be limited.</p>
      </section>
      <section>
        <h2>Changes and contact</h2>
        <p>These terms may be updated as the site changes. The date above shows when this page was last revised. For questions, use the contact options on the <a href="https://ujjwaluzu.in" target="_blank" rel="noopener noreferrer">portfolio site</a>.</p>
      </section>
    </LegalPage>
  );
}
