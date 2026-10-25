import { getToolFaqs } from "@/lib/tools/faqs";
import { canonicalUrl, siteUrl } from "@/lib/tools/metadata";
import { categories, getCategory, getTool, getToolsForCategory, tools } from "@/lib/tools/registry";

const uniqueTools = Array.from(new Map(tools.map((tool) => [tool.href, tool])).values());

function toolLines(items: typeof uniqueTools) {
  return items.map((tool) => `- [${tool.title}](${canonicalUrl(tool.href)}): ${tool.description}`).join("\n");
}

export function buildLlmIndex() {
  const categoryBlocks = categories
    .filter((category) => uniqueTools.some((tool) => tool.category === category.slug))
    .map((category) => `### ${category.name}\n\n${category.description}\n\n${toolLines(getToolsForCategory(category.slug))}`)
    .join("\n\n");

  return `# Ujjwal Tools\n\n> Free browser-based utilities for everyday, developer, document, and creative tasks. Most tools process user inputs locally in the browser.\n\nUjjwal Tools is a collection of focused online tools. Pages explain each tool's purpose, supported input, and privacy behavior. The site does not expose a public programmatic API or agent endpoint; tools are operated through their web pages.\n\n## Start here\n\n- [All tools](${canonicalUrl("/tools")}): browse and search the full toolbox.\n- [Privacy policy](${canonicalUrl("/privacy")}): browser storage and external service details.\n- [Terms of use](${canonicalUrl("/terms")})\n- [Legal notice](${canonicalUrl("/legal")})\n- [Sitemap](${canonicalUrl("/sitemap.xml")})\n\n## Tool categories\n\n${categoryBlocks}\n\n## Data handling\n\nMost tools process inputs locally in the browser. Exceptions include currency tools, which request the selected currency pair's public reference rate from Frankfurter; URL header/status tools, which send a request to the URL entered by the user; and Image to Text, which downloads OCR software from jsDelivr while processing the image locally. Study Notes stores notes in browser local storage on the current device.\n\n## Contact\n\nUse the contact options on [Ujjwal's portfolio](https://ujjwaluzu.in).\n`;
}

export function renderMarkdownPage(pathname: string): string | null {
  if (pathname === "/" || pathname === "/tools" || pathname === "/tools/") {
    return `# Ujjwal Tools\n\n## Small tools for annoying tasks\n\nQuick, focused browser utilities for code, documents, images, data, conversions, and everyday tasks. Search or browse by category, open a tool, and process your input in the browser. Most tools keep input on your device.\n\n${toolLines(uniqueTools)}\n\n## Privacy\n\nMost tool inputs stay in your browser. [Read the Privacy Policy](${canonicalUrl("/privacy")}); review a tool's page for exceptions.\n`;
  }

  const categoryMatch = pathname.match(/^\/tools\/([^/]+)\/?$/);
  if (categoryMatch) {
    const category = getCategory(categoryMatch[1]);
    if (!category) return null;
    const categoryTools = getToolsForCategory(category.slug);
    return `# ${category.name} tools\n\n${category.description}\n\n${toolLines(categoryTools)}\n`;
  }

  const toolMatch = pathname.match(/^\/tools\/([^/]+)\/([^/]+)\/?$/);
  if (toolMatch) {
    const tool = getTool(toolMatch[1], toolMatch[2]);
    if (!tool) return null;
    const category = getCategory(tool.category);
    const faqs = getToolFaqs(tool).map(({ question, answer }) => `### ${question}\n\n${answer}`).join("\n\n");
    return `# ${tool.title}\n\n${tool.description}\n\n- Category: ${category?.name ?? tool.category}\n- Use the tool: ${canonicalUrl(tool.href)}\n- Privacy: ${tool.privacyNote}\n\n## Questions and answers\n\n${faqs}\n`;
  }

  if (pathname === "/terms") return `# Terms of Use\n\nThe terms for using the tools and information on this site.\n\n## Using the site\n\nBy using Ujjwal Tools, you agree to these terms. If you do not agree, do not use the site. You must use the tools lawfully and avoid disrupting the site, trying to gain unauthorized access, or using the tools to violate another person's rights.\n\n## Your content\n\nYou keep your rights to the text and files you provide and to the results you create. Most tools process data in your browser. A few features make requests to outside services, as described in the [Privacy Policy](${canonicalUrl("/privacy")}) and in the relevant tool. You are responsible for having the rights and permissions needed to use your inputs and outputs.\n\n## Results and availability\n\nThe tools are provided for general convenience. Results may be incomplete, inaccurate, or unsuitable for a particular purpose. Check important results before relying on them. The site may change, be interrupted, or become unavailable at any time.\n\nNothing on this site is professional, financial, legal, medical, or other regulated advice. Currency conversions use indicative reference rates and are not quotes or transaction offers.\n\n## Third-party services and links\n\nSome features use third-party services, and the site may link to other websites. Those services and sites have their own terms and privacy practices. We do not control or endorse their content or availability.\n\n## Disclaimers and liability\n\nTo the extent permitted by applicable law, the site and its tools are provided “as is” and “as available,” without warranties of any kind. To the extent permitted by law, the site operator is not liable for indirect or consequential loss arising from your use of, or inability to use, the site. Nothing in these terms limits rights or remedies that cannot legally be limited.\n\n## Changes and contact\n\nThese terms may be updated as the site changes. The date above shows when this page was last revised. For questions, use the contact options on the [portfolio site](https://ujjwaluzu.in).\n`;
  if (pathname === "/privacy") return `# Privacy Policy\n\nWhat happens to information when you visit the site or use a tool.\n\n## Most tools run on your device\n\nMost tools process the text and files you provide directly in your browser. Those inputs and results are not sent to or stored by Ujjwal Tools. The tool page explains when a feature works differently.\n\n## Browser storage\n\nThe site stores your theme preference in your browser's local storage. The Study Notes tool also saves notes in that browser's local storage so they remain available on that device. These notes are not synced to an account or uploaded by that tool. You can remove them using the tool's controls or your browser's site data settings; clearing browser storage may permanently delete them.\n\n## When a tool contacts another service\n\n- Currency tools request a public exchange rate from Frankfurter. The selected currency pair is sent to that service; the amount you convert stays in your browser.\n- Website header and status tools send a browser request to the URL you enter. The destination website receives that request and may process your network address and request details.\n- Image to Text loads OCR software from jsDelivr when needed. The image is processed in your browser and is not sent to that content delivery service.\n\nThose providers process requests under their own policies. Ujjwal Tools does not control their data handling.\n\n## Visiting the site\n\nYour browser must connect to the site to load its pages and assets. The hosting and network providers involved in delivering the site may receive technical connection information, such as an IP address, browser details, and requested pages, under their own practices. This project does not include a user account system or an in-app analytics tracker.\n\n## Retention and your choices\n\nUjjwal Tools does not have a tool-input database or account profile for you. Data saved by the Study Notes tool remains in your browser until you remove it. For information handled by a third-party service or the site host, refer to that provider's policy and available controls.\n\n## Updates and contact\n\nThis policy may change when the site or its tools change. The date above shows when this page was last revised. For privacy questions, use the contact options on the [portfolio site](https://ujjwaluzu.in).\n`;
  if (pathname === "/legal") return `# Legal Notice\n\nImportant information about the site and its tools.\n\n## Service information\n\nUjjwal Tools provides small browser-based utilities and related informational content. The tools are general-purpose and are not a substitute for professional advice or independent verification.\n\n## Content and software\n\nUnless otherwise stated, the site's original design, text, and software are provided by the site operator. You may use the tools to process your own material, but this does not transfer ownership of the site or grant rights to third-party content, brands, or software used by the tools.\n\n## Third-party services\n\nSome tools rely on outside services, including Frankfurter for reference exchange rates and jsDelivr for OCR software delivery. External websites and services are independent of Ujjwal Tools and may have separate terms, privacy practices, and availability.\n\n## Related pages\n\nRead the [Terms of Use](${canonicalUrl("/terms")}) and [Privacy Policy](${canonicalUrl("/privacy")}) for more information about using the site and how tools handle data.\n\n## Contact\n\nFor site-related questions, use the contact options on the [portfolio site](https://ujjwaluzu.in).\n`;

  return null;
}

export function buildMarkdownNotFound(pathname: string) {
  return `# Page not found\n\nNo Markdown representation is available for ${pathname}. Browse the [Ujjwal Tools index](${siteUrl}/llms.txt) or [sitemap](${siteUrl}/sitemap.xml).\n`;
}
