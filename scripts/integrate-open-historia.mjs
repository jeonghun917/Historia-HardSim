import { cp, mkdir, stat } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const target = process.argv[2] ? resolve(process.argv[2]) : null;

if (!target) {
  console.error("Usage: node scripts/integrate-open-historia.mjs /path/to/open-historia");
  process.exit(2);
}

async function exists(path) {
  try { await stat(path); return true; } catch { return false; }
}

if (!(await exists(resolve(target, "src/Game/AI/gameplay.js")))) {
  console.error("Target does not look like an Open Historia checkout: src/Game/AI/gameplay.js is missing.");
  process.exit(2);
}

const build = spawnSync("npm", ["run", "build:lib"], { cwd: repoRoot, stdio: "inherit", shell: process.platform === "win32" });
if (build.status !== 0) process.exit(build.status ?? 1);

const vendorDir = resolve(target, "src/vendor/hardsim");
const hardSimGameDir = resolve(target, "src/Game/HardSim");
await mkdir(vendorDir, { recursive: true });
await mkdir(hardSimGameDir, { recursive: true });

await cp(resolve(repoRoot, "dist"), vendorDir, { recursive: true, force: true });
await cp(
  resolve(repoRoot, "integrations/open-historia/src/Game/HardSim/runtime.js"),
  resolve(hardSimGameDir, "runtime.js"),
  { force: true },
);

console.log("Historia HardSim library installed into Open Historia:");
console.log(`  ${vendorDir}`);
console.log(`  ${resolve(hardSimGameDir, "runtime.js")}`);
console.log("Next: wire createHardSimRuntime() at the structured turn boundary described in docs/OPEN_HISTORIA_INTEGRATION.md.");
