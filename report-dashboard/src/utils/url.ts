const BASE_PLACEHOLDER = "http://localhost";
const baseUrl = new URL(import.meta.env.BASE_URL || "/", BASE_PLACEHOLDER);

export function withBase(path = "") {
  const cleanedPath = path.replace(/^\/+/, "");
  const resolved = new URL(cleanedPath || baseUrl.pathname, baseUrl);
  const pathname = cleanedPath
    ? resolved.pathname.replace(/\/+$/, "")
    : resolved.pathname;

  return `${pathname}${resolved.search}${resolved.hash}`;
}

export function withBaseAbsolute(path = "") {
  const cleanedPath = path.replace(/^\/+/, "");
  return new URL(cleanedPath, baseUrl).toString();
}
