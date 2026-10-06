export const siteUrl = "https://tools.ujjwaluzu.in";

export function canonicalUrl(path: string): string {
  return new URL(path, siteUrl).toString();
}
