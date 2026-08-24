import { cp, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const target = process.argv[2] ? resolve(process.argv[2]) : null;
const suppliedLlama = process.argv[3] ? resolve(process.argv[3]) : null;

if (!target) {
  console.error("Usage: node scripts/integrate-native-llm.mjs /path/to/open-historia [/path/to/llama.cpp]");
  process.exit(2);
}

async function exists(path) {
  try { await stat(path); return true; } catch { return false; }
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (!(await exists(resolve(target, "mobile/android/app/build.gradle")))) {
  console.error("Target does not look like an Open Historia checkout with the Android shell.");
  process.exit(2);
}

let llamaRoot = suppliedLlama;
if (!llamaRoot) {
  llamaRoot = resolve(target, ".hardsim/llama.cpp");
  if (!(await exists(resolve(llamaRoot, ".git")))) {
    await mkdir(dirname(llamaRoot), { recursive: true });
    run("git", ["clone", "--depth", "1", "https://github.com/ggml-org/llama.cpp.git", llamaRoot], target);
  }
}

const llamaAndroid = resolve(llamaRoot, "examples/llama.android");
const llamaLibBuild = resolve(llamaAndroid, "lib/build.gradle.kts");
if (!(await exists(llamaLibBuild))) {
  console.error("llama.cpp checkout does not contain examples/llama.android/lib.");
  process.exit(2);
}

// Historia HardSim's embedded APK is an Android-phone target. Upstream's sample
// library builds both arm64-v8a and x86_64 by default; building only arm64 keeps
// CI and APK size bounded without changing upstream source in the repository.
let llamaBuildSource = await readFile(llamaLibBuild, "utf8");
llamaBuildSource = llamaBuildSource.replace(
  /abiFilters\s*\+=\s*listOf\("arm64-v8a",\s*"x86_64"\)/,
  'abiFilters += listOf("arm64-v8a")',
);
await writeFile(llamaLibBuild, llamaBuildSource, "utf8");

if (process.platform !== "win32") {
  run("chmod", ["+x", "gradlew"], llamaAndroid);
  run("./gradlew", [":lib:assembleRelease", "--no-daemon"], llamaAndroid);
} else {
  run("gradlew.bat", [":lib:assembleRelease", "--no-daemon"], llamaAndroid);
}

const aarSource = resolve(llamaAndroid, "lib/build/outputs/aar/lib-release.aar");
if (!(await exists(aarSource))) {
  console.error("llama.cpp Android AAR was not produced at the expected path.");
  process.exit(3);
}

const appDir = resolve(target, "mobile/android/app");
const appLibs = resolve(appDir, "libs");
const packageDir = resolve(appDir, "src/main/java/io/github/arkniem/paxhistoria");
await mkdir(appLibs, { recursive: true });
await mkdir(packageDir, { recursive: true });
await cp(aarSource, resolve(appLibs, "llama-android.aar"), { force: true });
await cp(
  resolve(repoRoot, "integrations/open-historia/mobile-native/LocalLlmPlugin.kt"),
  resolve(packageDir, "LocalLlmPlugin.kt"),
  { force: true },
);

const variablesPath = resolve(target, "mobile/android/variables.gradle");
let variables = await readFile(variablesPath, "utf8");
variables = variables
  .replace(/minSdkVersion\s*=\s*\d+/, "minSdkVersion = 33")
  .replace(/compileSdkVersion\s*=\s*\d+/, "compileSdkVersion = 36")
  .replace(/targetSdkVersion\s*=\s*\d+/, "targetSdkVersion = 36");
await writeFile(variablesPath, variables, "utf8");

const rootBuildPath = resolve(target, "mobile/android/build.gradle");
let rootBuild = await readFile(rootBuildPath, "utf8");
if (!rootBuild.includes("kotlin-gradle-plugin")) {
  rootBuild = rootBuild.replace(
    "classpath 'com.android.tools.build:gradle:8.7.2'",
    "classpath 'com.android.tools.build:gradle:8.7.2'\n        classpath 'org.jetbrains.kotlin:kotlin-gradle-plugin:2.3.0'",
  );
  await writeFile(rootBuildPath, rootBuild, "utf8");
}

const appBuildPath = resolve(appDir, "build.gradle");
let appBuild = await readFile(appBuildPath, "utf8");
if (!appBuild.includes("org.jetbrains.kotlin.android")) {
  appBuild = appBuild.replace(
    "apply plugin: 'com.android.application'",
    "apply plugin: 'com.android.application'\napply plugin: 'org.jetbrains.kotlin.android'",
  );
}
if (!appBuild.includes("llama-android.aar")) {
  appBuild = appBuild.replace(
    "implementation fileTree(include: ['*.jar'], dir: 'libs')",
    [
      "implementation fileTree(include: ['*.jar'], dir: 'libs')",
      "    implementation files('libs/llama-android.aar')",
      "    implementation 'androidx.core:core-ktx:1.17.0'",
      "    implementation 'androidx.datastore:datastore-preferences:1.2.0'",
    ].join("\n"),
  );
}
if (!appBuild.includes("sourceCompatibility JavaVersion.VERSION_21")) {
  appBuild = appBuild.replace(
    "buildTypes {",
    "compileOptions {\n        sourceCompatibility JavaVersion.VERSION_21\n        targetCompatibility JavaVersion.VERSION_21\n    }\n    kotlinOptions {\n        jvmTarget = '21'\n    }\n    buildTypes {",
  );
}
await writeFile(appBuildPath, appBuild, "utf8");

const mainActivityPath = resolve(packageDir, "MainActivity.java");
let mainActivity = await readFile(mainActivityPath, "utf8");
if (!mainActivity.includes("registerPlugin(LocalLlmPlugin.class)")) {
  mainActivity = mainActivity.replace(
    "super.onCreate(savedInstanceState);",
    "registerPlugin(LocalLlmPlugin.class);\n        super.onCreate(savedInstanceState);",
  );
  await writeFile(mainActivityPath, mainActivity, "utf8");
}

console.log("Embedded LocalLlm integration installed:");
console.log(`  llama.cpp AAR: ${resolve(appLibs, "llama-android.aar")}`);
console.log(`  Capacitor plugin: ${resolve(packageDir, "LocalLlmPlugin.kt")}`);
console.log("  Android baseline: arm64-v8a / minSdk 33 / compileSdk 36 / targetSdk 36 / JVM 21");
console.log("The app can now download, load and run GGUF models without Termux.");
