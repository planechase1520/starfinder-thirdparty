/**
 * tools/link.mjs
 *
 * Creates a symlink (junction on Windows) from your Foundry VTT Data/modules/
 * directory to this module's source folder so Foundry picks up live builds.
 *
 * Setup:
 *   1. Copy `.foundryconfig.json.example` → `.foundryconfig.json`
 *   2. Set `dataPath` to your Foundry user-data folder (the one that contains
 *      the `Data/` subfolder with worlds/, modules/, systems/, etc.)
 *   3. Run:  npm run link
 *
 * After linking, run `npm run watch` and Foundry will hot-reload the JS on
 * every save.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const moduleRoot = path.resolve(__dirname, "..");
const configPath = path.join(moduleRoot, ".foundryconfig.json");

// ── Read config ──────────────────────────────────────────────────────────────

if (!fs.existsSync(configPath)) {
  console.error(
    `[link] ERROR: .foundryconfig.json not found.\n` +
    `  Copy .foundryconfig.json.example to .foundryconfig.json and set your\n` +
    `  Foundry user-data path before running npm run link.`
  );
  process.exit(1);
}

let config;
try {
  config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
} catch (err) {
  console.error(`[link] ERROR: Could not parse .foundryconfig.json — ${err.message}`);
  process.exit(1);
}

const { dataPath } = config;
if (!dataPath) {
  console.error(`[link] ERROR: .foundryconfig.json must contain a "dataPath" key.`);
  process.exit(1);
}

// ── Resolve paths ─────────────────────────────────────────────────────────────

const moduleId = "starfinder-thirdparty";
const modulesDir = path.join(dataPath, "Data", "modules");
const linkTarget = path.join(modulesDir, moduleId);

// ── Check modules dir exists ──────────────────────────────────────────────────

if (!fs.existsSync(modulesDir)) {
  console.error(
    `[link] ERROR: Foundry modules directory not found at:\n  ${modulesDir}\n` +
    `  Make sure dataPath in .foundryconfig.json points to your Foundry user-data\n` +
    `  folder (the parent of the Data/ directory).`
  );
  process.exit(1);
}

// ── Remove existing link / directory ─────────────────────────────────────────

if (fs.existsSync(linkTarget)) {
  const stat = fs.lstatSync(linkTarget);
  if (stat.isSymbolicLink() || stat.isDirectory()) {
    fs.rmSync(linkTarget, { recursive: true, force: true });
    console.log(`[link] Removed existing link/directory at:\n  ${linkTarget}`);
  } else {
    console.error(`[link] ERROR: ${linkTarget} exists and is a file — remove it manually.`);
    process.exit(1);
  }
}

// ── Create symlink / junction ─────────────────────────────────────────────────

try {
  // On Windows, "junction" works without elevated privileges.
  // On macOS/Linux it falls back to a directory symlink.
  const linkType = process.platform === "win32" ? "junction" : "dir";
  fs.symlinkSync(moduleRoot, linkTarget, linkType);
  console.log(
    `[link] ✓ Linked module successfully:\n` +
    `  Source : ${moduleRoot}\n` +
    `  Target : ${linkTarget}\n\n` +
    `  Next steps:\n` +
    `    1. Run:  npm run watch   (keeps JS bundle up-to-date)\n` +
    `    2. Start Foundry VTT\n` +
    `    3. Go to Game Settings → Manage Modules → enable "Starfinder Third Party Library"\n` +
    `    4. Reload the world after any code change\n`
  );
} catch (err) {
  if (err.code === "EPERM") {
    console.error(
      `[link] ERROR: Permission denied creating symlink.\n` +
      `  On Windows, try running the terminal as Administrator, OR enable\n` +
      `  Developer Mode in Settings → For Developers → Developer Mode.\n` +
      `  (Junctions don't require admin; only symlinks do.)`
    );
  } else {
    console.error(`[link] ERROR: ${err.message}`);
  }
  process.exit(1);
}
