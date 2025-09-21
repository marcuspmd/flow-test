import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dashboardRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(dashboardRoot, "..");
const sourceDir = path.join(repoRoot, "guides");
const targetDir = path.join(dashboardRoot, "src", "content", "guides");

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function emptyDir(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      emptyDir(entryPath);
      fs.rmdirSync(entryPath);
    } else {
      fs.unlinkSync(entryPath);
    }
  }
}

function main() {
  if (!fs.existsSync(sourceDir)) {
    console.warn(`Guides directory not found at ${sourceDir}. Skipping sync.`);
    return;
  }

  fs.mkdirSync(path.dirname(targetDir), { recursive: true });
  emptyDir(targetDir);
  copyDir(sourceDir, targetDir);

  console.log(`Synced guides from ${sourceDir} -> ${targetDir}`);
}

main();
