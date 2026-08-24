import { cp, mkdir, stat, readFile, writeFile } from "node:fs/promises";
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

const build = spawnSync("npm", ["run", "build:lib"], {
  cwd: repoRoot,
  stdio: "inherit",
  shell: process.platform === "win32",
});
if (build.status !== 0) process.exit(build.status ?? 1);

const vendorDir = resolve(target, "src/vendor/hardsim");
const hardSimGameDir = resolve(target, "src/Game/HardSim");
await mkdir(vendorDir, { recursive: true });
await mkdir(hardSimGameDir, { recursive: true });

await cp(resolve(repoRoot, "dist"), vendorDir, { recursive: true, force: true });
for (const file of ["runtime.js", "gameplayAdapter.js", "nativeModelManager.js"]) {
  await cp(
    resolve(repoRoot, `integrations/open-historia/src/Game/HardSim/${file}`),
    resolve(hardSimGameDir, file),
    { force: true },
  );
}

const timePath = resolve(target, "src/Game/GameUI/time.jsx");
let timeSource = await readFile(timePath, "utf8");
const oldImport = 'import { loadRollbackSnapshots, maybeGeneratePregameHistory, rollBackToSnapshot, simulateAutoJump, simulateTimelineJump } from "../AI/gameplay.js";';
const newImports = [
  'import { loadRollbackSnapshots, maybeGeneratePregameHistory, rollBackToSnapshot } from "../AI/gameplay.js";',
  'import { simulateAutoJump, simulateTimelineJump } from "../HardSim/gameplayAdapter.js";',
  'import "../HardSim/nativeModelManager.js";',
].join("\n");

if (!timeSource.includes('../HardSim/gameplayAdapter.js')) {
  if (!timeSource.includes(oldImport)) {
    console.error("Open Historia time.jsx import changed upstream; refusing a blind patch.");
    process.exit(3);
  }
  timeSource = timeSource.replace(oldImport, newImports);
  await writeFile(timePath, timeSource, "utf8");
} else if (!timeSource.includes('../HardSim/nativeModelManager.js')) {
  timeSource = timeSource.replace(
    'import { simulateAutoJump, simulateTimelineJump } from "../HardSim/gameplayAdapter.js";',
    'import { simulateAutoJump, simulateTimelineJump } from "../HardSim/gameplayAdapter.js";\nimport "../HardSim/nativeModelManager.js";',
  );
  await writeFile(timePath, timeSource, "utf8");
}

console.log("Historia HardSim integration installed:");
console.log(`  library: ${vendorDir}`);
console.log(`  runtime: ${hardSimGameDir}`);
console.log(`  patched: ${timePath}`);
console.log("Run the Open Historia test/build commands before committing the generated integration branch.");
