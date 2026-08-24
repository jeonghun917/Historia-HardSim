import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=") || "1"];
  }),
);

const year = Number(args.get("year") || new Date().getUTCFullYear() - 2);
const outPath = resolve(args.get("out") || `data/calibration/worldbank-${year}.json`);
const requestedCodes = new Set(
  (args.get("countries") || "")
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean),
);

if (!Number.isInteger(year) || year < 1960 || year > 2100) {
  console.error("--year must be an integer between 1960 and 2100.");
  process.exit(2);
}

async function getJson(url) {
  const response = await fetch(url, {
    headers: { "user-agent": "Historia-HardSim calibration importer" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.json();
}

async function validCountries() {
  const payload = await getJson("https://api.worldbank.org/v2/country?format=json&per_page=400");
  const rows = Array.isArray(payload?.[1]) ? payload[1] : [];
  return new Set(
    rows
      .filter((row) => row?.region?.id && row?.id)
      .map((row) => String(row.id).toUpperCase()),
  );
}

async function indicator(code) {
  const url = new URL(`https://api.worldbank.org/v2/country/all/indicator/${code}`);
  url.searchParams.set("date", String(year));
  url.searchParams.set("format", "json");
  url.searchParams.set("per_page", "20000");
  const payload = await getJson(url.toString());
  return Array.isArray(payload?.[1]) ? payload[1] : [];
}

const [countries, populationRows, gdpRows] = await Promise.all([
  validCountries(),
  indicator("SP.POP.TOTL"),
  indicator("NY.GDP.MKTP.CD"),
]);

const calibration = {};
function accept(code) {
  return countries.has(code) && (requestedCodes.size === 0 || requestedCodes.has(code));
}

for (const row of populationRows) {
  const code = String(row?.countryiso3code || "").toUpperCase();
  const value = Number(row?.value);
  if (!accept(code) || !Number.isFinite(value) || value <= 0) continue;
  calibration[code] = {
    ...(calibration[code] || {}),
    year,
    population: value,
    source: "World Bank WDI",
  };
}

for (const row of gdpRows) {
  const code = String(row?.countryiso3code || "").toUpperCase();
  const value = Number(row?.value);
  if (!accept(code) || !Number.isFinite(value) || value <= 0) continue;
  calibration[code] = {
    ...(calibration[code] || { year, source: "World Bank WDI" }),
    gdpCurrentUsd: value,
  };
}

for (const [code, datum] of Object.entries(calibration)) {
  if (!datum.population && !datum.gdpCurrentUsd) delete calibration[code];
}

await mkdir(dirname(outPath), { recursive: true });
await writeFile(
  outPath,
  JSON.stringify(
    {
      schema: "historia-hardsim-civil-calibration-v1",
      source: "World Bank World Development Indicators",
      year,
      generatedAt: new Date().toISOString(),
      civilCalibration: calibration,
    },
    null,
    2,
  ) + "\n",
  "utf8",
);

console.log(`Wrote ${Object.keys(calibration).length} country calibration records to ${outPath}`);
console.log("Use the generated civilCalibration object under world.hardSimSeed.civilCalibration.");
