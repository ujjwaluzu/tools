import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Ujjwal Tools handles information when you use the site and its tools.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" summary="What happens to information when you visit the site or use a tool.">
      <section>
        <h2>Most tools run on your device</h2>
        <p>Most tools process the text and files you provide directly in your browser. Those inputs and results are not sent to or stored by Ujjwal Tools. The tool page explains when a feature works differently.</p>
      </section>
      <section>
        <h2>Browser storage</h2>
        <p>The site stores your theme preference in your browser’s local storage. The Study Notes tool also saves notes in that browser’s local storage so they remain available on that device. These notes are not synced to an account or uploaded by that tool. You can remove them using the tool’s controls or your browser’s site data settings; clearing browser storage may permanently delete them.</p>
      </section>
      <section>
        <h2>When a tool contacts another service</h2>
        <ul>
          <li>Currency tools request a public exchange rate from Frankfurter. The selected currency pair is sent to that service; the amount you convert stays in your browser.</li>
          <li>Website header and status tools send a browser request to the URL you enter. The destination website receives that request and may process your network address and request details.</li>
          <li>Image to Text loads OCR software from jsDelivr when needed. The image is processed in your browser and is not sent to that content delivery service.</li>
        </ul>
        <p>Those providers process requests under their own policies. Ujjwal Tools does not control their data handling.</p>
      </section>
      <section>
        <h2>Visiting the site</h2>
        <p>Your browser must connect to the site to load its pages and assets. The hosting and network providers involved in delivering the site may receive technical connection information, such as an IP address, browser details, and requested pages, under their own practices. This project does not include a user account system or an in-app analytics tracker.</p>
      </section>
      <section>
        <h2>Retention and your choices</h2>
        <p>Ujjwal Tools does not have a tool-input database or account profile for you. Data saved by the Study Notes tool remains in your browser until you remove it. For information handled by a third-party service or the site host, refer to that provider’s policy and available controls.</p>
      </section>
      <section>
        <h2>Updates and contact</h2>
        <p>This policy may change when the site or its tools change. The date above shows when this page was last revised. For privacy questions, use the contact options on the <a href="https://ujjwaluzu.in" target="_blank" rel="noopener noreferrer">portfolio site</a>.</p>
      </section>
    </LegalPage>
  );
}
