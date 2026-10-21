export type MarkdownTableAlignment = "left" | "center" | "right";

/** Serialize a header row and body rows as a GFM table. Newlines become `<br>` within cells. */
export function serializeMarkdownTable(
  headers: readonly string[],
  rows: readonly (readonly string[])[],
  alignments: readonly MarkdownTableAlignment[] = [],
): string {
  if (headers.length === 0) throw new RangeError("A Markdown table needs at least one column.");
  if (rows.some((row) => row.length !== headers.length)) throw new RangeError("Every table row must have the same number of cells as the header.");
  if (alignments.length > 0 && alignments.length !== headers.length) throw new RangeError("Choose an alignment for each table column.");

  const cell = (value: string) => value.replace(/\\/gu, "\\\\").replace(/\|/gu, "\\|").replace(/\r\n|\r|\n/gu, "<br>");
  const headerRow = `| ${headers.map(cell).join(" | ")} |`;
  const divider = `| ${headers.map((_, index) => {
    const alignment = alignments[index] ?? "left";
    return alignment === "center" ? ":---:" : alignment === "right" ? "---:" : ":---";
  }).join(" | ")} |`;
  const body = rows.map((row) => `| ${row.map(cell).join(" | ")} |`);
  return [headerRow, divider, ...body].join("\n");
}
