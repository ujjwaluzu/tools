import type { ToolDefinition } from "@/lib/tools/registry";
import { getToolFaqs } from "@/lib/tools/faqs";

export function ToolFaqs({ tool }: { tool: ToolDefinition }) {
  const faqs = getToolFaqs(tool);
  return <section className="tool-faq-section" aria-labelledby="tool-faq-heading">
    <div className="section-heading">
      <div><span className="eyebrow">Quick answers</span><h2 id="tool-faq-heading">Frequently asked questions</h2></div>
    </div>
    <div className="tool-faq-list">
      {faqs.map(({ question, answer }) => <details className="tool-faq-item" key={question}>
        <summary>{question}<span aria-hidden="true" className="tool-faq-chevron" /></summary>
        <p>{answer}</p>
      </details>)}
    </div>
  </section>;
}
