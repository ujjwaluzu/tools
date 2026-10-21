import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { safeMarkdownUrl } from "@/lib/tools/markdown";

export function MarkdownPreview({ source }: { source: string }) {
  return <div className="markdown-prose">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      urlTransform={(url, key) => safeMarkdownUrl(url, key === "src")}
      components={{
        a: ({ href, children, ...props }) => <a {...props} href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
        img: ({ src, alt = "", ...props }) => {
          if (!src) return null;
          // Relative-only Markdown images deliberately bypass Next's remote image optimizer.
          // eslint-disable-next-line @next/next/no-img-element
          return <img {...props} src={src} alt={alt} loading="lazy" />;
        },
        pre: ({ children, ...props }) => <pre {...props}>{children}</pre>,
        table: ({ children, ...props }) => <div className="markdown-table-scroll"><table {...props}>{children}</table></div>,
      }}
    >
      {source}
    </ReactMarkdown>
  </div>;
}
