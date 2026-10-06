export const siteUrl = "https://app.ujjwaluzu.in";

export function canonicalUrl(path: string): string {
  return new URL(path, siteUrl).toString();
}
