export const MAX_XML_INPUT_BYTES = 5 * 1024 * 1024;
export const MAX_XML_NESTING = 256;

export function assertXmlInputSize(source: string, limit = MAX_XML_INPUT_BYTES): number {
  const size = new TextEncoder().encode(source).byteLength;
  if (size > limit) throw new Error(`XML input is ${(size / (1024 * 1024)).toFixed(2)} MiB. The limit is ${(limit / (1024 * 1024)).toFixed(0)} MiB.`);
  return size;
}

export function stripUtf8Bom(source: string): string {
  return source.charCodeAt(0) === 0xfeff ? source.slice(1) : source;
}

export type ParsedXml = { document: XMLDocument; root: Element };

export function parseXml(source: string, Parser: typeof DOMParser = DOMParser): ParsedXml {
  const normalized = stripUtf8Bom(source);
  assertXmlInputSize(normalized);
  if (!normalized.trim()) throw new Error("Add XML content before processing.");
  const document = new Parser().parseFromString(normalized, "application/xml");
  const root = document.documentElement;
  if (!root) throw new Error("The XML document has no root element.");
  const parserErrors = [...document.getElementsByTagNameNS("*", "parsererror")];
  const isDiagnostic = (element: Element) => {
    if (element.namespaceURI?.toLowerCase().includes("parsererror")) return true;
    // Chromium nests a marked-up XHTML parsererror node inside the partial document.
    const children = Array.from(element.children);
    return element.namespaceURI === "http://www.w3.org/1999/xhtml" &&
      children.filter((child) => child.localName.toLowerCase() === "h3").length >= 2 &&
      children.some((child) => child.localName.toLowerCase() === "div");
  };
  const isParserErrorDocument = root.localName.toLowerCase() === "parsererror" &&
    isDiagnostic(root);
  const diagnostic = parserErrors.find(isDiagnostic);
  if (isParserErrorDocument || diagnostic) {
    const detailNode = diagnostic && Array.from(diagnostic.children).find((child) => child.localName.toLowerCase() === "div");
    const details = (detailNode?.textContent || diagnostic?.textContent || root.textContent)?.replace(/\s+/g, " ").trim();
    throw new Error(details ? `Malformed XML: ${details}` : "Malformed XML. Check that tags are closed and properly nested.");
  }
  assertNestingLimit(root);
  return { document, root };
}

function assertNestingLimit(root: Element): void {
  const stack: { element: Element; depth: number }[] = [{ element: root, depth: 1 }];
  while (stack.length) {
    const { element, depth } = stack.pop()!;
    if (depth > MAX_XML_NESTING) throw new Error(`XML nesting exceeds the ${MAX_XML_NESTING}-element limit.`);
    for (const child of Array.from(element.children)) stack.push({ element: child, depth: depth + 1 });
  }
}

function hasTextChild(element: Element): boolean {
  return Array.from(element.childNodes).some((node) => node.nodeType === 3 || node.nodeType === 4);
}

function serializePretty(node: Node, serializer: XMLSerializer, depth: number): string {
  const indent = "  ".repeat(depth);
  if (node.nodeType === 1) {
    const element = node as Element;
    const children = Array.from(element.childNodes);
    // Keep all text/CDATA and its surrounding nodes in place. Pretty-printing mixed
    // content by injecting whitespace would change its character data.
    if (!children.length || hasTextChild(element)) return `${indent}${serializer.serializeToString(element)}`;
    return `${indent}<${element.tagName}${serializeAttributes(element)}>${children.map((child) => {
      if (child.nodeType === 8) return `\n${"  ".repeat(depth + 1)}<!--${child.nodeValue ?? ""}-->`;
      if (child.nodeType === 7) return `\n${"  ".repeat(depth + 1)}<?${child.nodeName}${child.nodeValue ? ` ${child.nodeValue}` : ""}?>`;
      return `\n${serializePretty(child, serializer, depth + 1)}`;
    }).join("")}\n${indent}</${element.tagName}>`;
  }
  return serializer.serializeToString(node);
}

function serializeAttributes(element: Element): string {
  return Array.from(element.attributes).map((attribute) => ` ${attribute.name}="${escapeAttribute(attribute.value)}"`).join("");
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/\r/g, "&#13;").replace(/\n/g, "&#10;").replace(/\t/g, "&#9;");
}

export function formatXml(parsed: ParsedXml): string {
  const serializer = new XMLSerializer();
  const document = parsed.document;
  const parts: string[] = [];
  for (const child of Array.from(document.childNodes)) {
    if (child.nodeType === 1) parts.push(serializePretty(child, serializer, 0));
    else if (child.nodeType === 7) parts.push(`<?${child.nodeName}${child.nodeValue ? ` ${child.nodeValue}` : ""}?>`);
    else if (child.nodeType === 8) parts.push(`<!--${child.nodeValue ?? ""}-->`);
  }
  return parts.join("\n");
}

type JsonValue = string | { [key: string]: JsonValue | JsonValue[] } | JsonValue[];

function elementValue(element: Element): JsonValue {
  const attributes = Array.from(element.attributes);
  const children = Array.from(element.childNodes).filter((node) => node.nodeType === 1) as Element[];
  const textNodes = Array.from(element.childNodes).filter((node) => node.nodeType === 3 || node.nodeType === 4);
  const text = textNodes.map((node) => node.nodeValue ?? "").join("");
  const mixed = children.length > 0 && text.length > 0;
  const result: Record<string, JsonValue | JsonValue[]> = {};
  if (attributes.length) {
    const values: Record<string, string> = {};
    for (const attribute of attributes) values[attribute.name] = attribute.value;
    result["@attributes"] = values;
  }
  if (mixed) {
    const content: JsonValue[] = [];
    for (const node of Array.from(element.childNodes)) {
      if (node.nodeType === 1) {
        const child = node as Element;
        content.push({ [child.nodeName]: elementValue(child) });
      } else if (node.nodeType === 3 || node.nodeType === 4) content.push(node.nodeValue ?? "");
    }
    result["#content"] = content;
    return result;
  }
  if (textNodes.length) result["#text"] = text;
  const groups = new Map<string, JsonValue[]>();
  for (const child of children) {
    const values = groups.get(child.nodeName) ?? [];
    values.push(elementValue(child));
    groups.set(child.nodeName, values);
  }
  for (const [name, values] of groups) result[name] = values.length === 1 ? values[0] : values;
  if (!attributes.length && !children.length && !textNodes.length) return "";
  if (!attributes.length && !children.length && textNodes.length) return text;
  return result;
}

export function xmlToJson(parsed: ParsedXml, indent = 2): string {
  return JSON.stringify({ [parsed.root.nodeName]: elementValue(parsed.root) }, null, indent);
}
