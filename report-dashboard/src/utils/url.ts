const BASE_URL = import.meta.env.BASE_URL || "/";

export function withBase(path = "") {
  if (!path) return BASE_URL;

  const cleanedPath = path.replace(/^\/+/, "");
  const baseUrlClean = BASE_URL.replace(/\/+$/, "");

  if (baseUrlClean === "" || baseUrlClean === "/") {
    return `/${cleanedPath}`;
  }

  return `${baseUrlClean}/${cleanedPath}`;
}

export function withBaseAbsolute(path = "") {
  const cleanedPath = path.replace(/^\/+/, "");
  const baseUrlWithProtocol = `http://localhost${withBase(cleanedPath)}`;
  return baseUrlWithProtocol;
}
