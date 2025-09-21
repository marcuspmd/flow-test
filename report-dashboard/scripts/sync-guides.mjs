import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dashboardRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(dashboardRoot, "..");

// Multiple possible source directories for guides
function findGuidesDirectory() {
  const candidates = [
    // Local development (repository structure)
    path.join(repoRoot, "guides"),

    // From CLI directory (when installed via npm)
    process.env.FLOW_TEST_CLI_DIR ? path.join(process.env.FLOW_TEST_CLI_DIR, "guides") : null,

    // When installed via npm globally or locally
    path.join(__dirname, "..", "..", "guides"),

    // Alternative for global npm installation
    path.join(__dirname, "..", "..", "..", "guides"),

    // Project directory from environment variable (set by CLI)
    process.env.FLOW_TEST_PROJECT_DIR ? path.join(process.env.FLOW_TEST_PROJECT_DIR, "guides") : null,

    // Try to find from node_modules
    path.join(process.cwd(), "node_modules", "flow-test-engine", "guides"),

    // Try global node_modules
    path.join(__dirname, "..", "..", "..", "..", "flow-test-engine", "guides"),
  ].filter(Boolean); // Remove null entries

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      console.log(`[Sync] Found guides directory at: ${candidate}`);
      return candidate;
    }
  }

  return null;
}

const sourceDir = findGuidesDirectory();
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
  if (!sourceDir) {
    console.warn(`[Sync] Guides directory not found in any of the expected locations.`);
    console.warn(`[Sync] Searched locations:`);
    console.warn(`  - ${path.join(repoRoot, "guides")} (local dev)`);
    if (process.env.FLOW_TEST_CLI_DIR) {
      console.warn(`  - ${path.join(process.env.FLOW_TEST_CLI_DIR, "guides")} (CLI installation)`);
    }
    console.warn(`  - ${path.join(__dirname, "..", "..", "guides")} (npm install)`);
    if (process.env.FLOW_TEST_PROJECT_DIR) {
      console.warn(`  - ${path.join(process.env.FLOW_TEST_PROJECT_DIR, "guides")} (from env)`);
    }
    console.warn(`  - ${path.join(process.cwd(), "node_modules", "flow-test-engine", "guides")} (node_modules)`);
    console.warn(`[Sync] Skipping guides sync. Dashboard will work without documentation.`);
    return;
  }

  if (!fs.existsSync(sourceDir)) {
    console.warn(`[Sync] Guides directory not found at ${sourceDir}. Skipping sync.`);
    return;
  }

  fs.mkdirSync(path.dirname(targetDir), { recursive: true });
  emptyDir(targetDir);
  copyDir(sourceDir, targetDir);

  console.log(`[Sync] Synced guides from ${sourceDir} -> ${targetDir}`);
}

main();
