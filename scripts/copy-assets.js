const fs = require("fs");
const path = require("path");

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function copyFile(src, dest) {
  if (!fs.existsSync(src)) return false;
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  return true;
}

function main() {
  // Paths for CSS assets
  const srcStyles = path.join(__dirname, "..", "src", "templates", "styles.css");
  const distStyles = path.join(__dirname, "..", "dist", "templates", "styles.css");

  const srcTheme = path.join(
    __dirname,
    "..",
    "src",
    "report-generator",
    "components",
    "theme.css"
  );
  const distTheme = path.join(
    __dirname,
    "..",
    "dist",
    "report-generator",
    "components",
    "theme.css"
  );

  // Logo asset (used by modular HTML generator)
  const srcLogo = path.join(__dirname, "..", "public", "assets", "flow.png");
  const distLogo = path.join(__dirname, "..", "dist", "public", "assets", "flow.png");

  const copies = [
    { src: srcStyles, dest: distStyles, label: "styles.css" },
    { src: srcTheme, dest: distTheme, label: "theme.css" },
    { src: srcLogo, dest: distLogo, label: "flow.png" },
  ];

  let ok = true;
  for (const { src, dest, label } of copies) {
    const done = copyFile(src, dest);
    if (!done) {
      ok = false;
      console.warn(`[copy-assets] Skipped missing asset: ${label} (${src})`);
    } else {
      console.log(`[copy-assets] Copied ${label} -> ${dest}`);
    }
  }

  if (!ok) {
    console.warn("[copy-assets] Some optional assets were not found. The report will still build, but styles/images may be incomplete.");
  }
}

main();

