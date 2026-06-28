#!/usr/bin/env node
/**
 * Download SF Pro from Apple's official CDN, extract, and generate
 * Latin-subset WOFF2 files for web use.
 *
 * Usage: npm run setup:fonts
 * Requires: curl, 7z (p7zip-full), python3, fonttools (pip install fonttools brotli)
 */
import { execSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "app/fonts/sf-pro");
const TMP = path.join(ROOT, ".tmp/sf-pro-setup");
const DMG_URL =
  "https://devimages-cdn.apple.com/design/resources/download/SF-Pro.dmg";

const WEIGHTS = ["Regular", "Medium", "Semibold", "Bold"];
const UNICODES =
  "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";

function run(cmd, opts = {}) {
  console.log(`  $ ${cmd}`);
  execSync(cmd, { stdio: "inherit", ...opts });
}

function have(cmd) {
  return spawnSync("which", [cmd], { stdio: "ignore" }).status === 0;
}

function main() {
  console.log("SF Pro setup — downloading from Apple developer CDN\n");

  if (!have("curl")) throw new Error("curl is required");
  if (!have("7z")) {
    throw new Error(
      "7z is required (install p7zip-full / p7zip on Linux, brew install p7zip on macOS)"
    );
  }

  const pyftsubset = have("pyftsubset")
    ? "pyftsubset"
    : have("/home/ubuntu/.local/bin/pyftsubset")
      ? "/home/ubuntu/.local/bin/pyftsubset"
      : null;

  if (!pyftsubset) {
    console.error(
      "pyftsubset not found. Install: pip install fonttools brotli"
    );
    process.exit(1);
  }

  mkdirSync(OUT, { recursive: true });
  mkdirSync(TMP, { recursive: true });

  const dmg = path.join(TMP, "SF-Pro.dmg");
  const extract = path.join(TMP, "extract");
  const pkgDir = path.join(TMP, "pkg");

  if (!existsSync(dmg)) {
    run(`curl -fsSL -o "${dmg}" "${DMG_URL}"`);
  } else {
    console.log("  (reusing cached DMG)");
  }

  rmSync(extract, { recursive: true, force: true });
  mkdirSync(extract);
  run(`7z x -o"${extract}" "${dmg}" -y`);

  const pkg = path.join(extract, "SFProFonts/SF Pro Fonts.pkg");
  if (!existsSync(pkg)) {
    throw new Error(`Expected pkg at ${pkg}`);
  }

  rmSync(pkgDir, { recursive: true, force: true });
  mkdirSync(pkgDir);
  run(`7z x -o"${pkgDir}" "${pkg}" -y`);

  const payload = path.join(pkgDir, "Payload~");
  if (!existsSync(payload)) {
    throw new Error("Payload~ not found in pkg");
  }

  run(`7z x -o"${pkgDir}" "${payload}" -y`, { cwd: pkgDir });

  const fontDir = path.join(pkgDir, "Library/Fonts");
  if (!existsSync(fontDir)) {
    throw new Error(`Fonts not found at ${fontDir}`);
  }

  console.log("\nGenerating Latin-subset WOFF2 files…\n");

  for (const weight of WEIGHTS) {
    const otf = path.join(fontDir, `SF-Pro-Text-${weight}.otf`);
    const woff2 = path.join(OUT, `SF-Pro-Text-${weight}.woff2`);
    if (!existsSync(otf)) {
      throw new Error(`Missing ${otf}`);
    }
    run(
      `${pyftsubset} "${otf}" --output-file="${woff2}" --flavor=woff2 --layout-features='*' --unicodes='${UNICODES}'`
    );
  }

  console.log(`\nDone — SF Pro Text WOFF2 files written to:\n  ${OUT}\n`);
  console.log(
    "Reminder: Apple's SF Pro license applies. See app/fonts/sf-pro/README.md\n"
  );
}

main();
