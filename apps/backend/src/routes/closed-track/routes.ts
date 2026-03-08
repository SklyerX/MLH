import { spawn } from "child_process";
import { Hono } from "hono";

import { writeFile, mkdir } from "fs/promises";
import path from "path";
import os from "os";
import { readFileSync } from "fs";

const closedTrackRoutes = new Hono();

closedTrackRoutes.post("/analyze", async (c) => {
  const date = Date.now();
  const baseDir = path.join(os.tmpdir(), `analysis-${date}`);

  await mkdir(baseDir, { recursive: true });

  const fingerprintDir = path.join(baseDir, "fingerprints");
  const dnaDir = path.join(baseDir, "dna");
  const crimeDir = path.join(baseDir, "crime");
  const outputPath = path.join(baseDir, "output");

  await mkdir(fingerprintDir, { recursive: true });
  await mkdir(dnaDir, { recursive: true });
  await mkdir(crimeDir, { recursive: true });
  await mkdir(outputPath, { recursive: true });

  const form = await c.req.formData();

  const fingerprintDB = form.getAll("fingerprintDatabase");
  const dnaDB = form.get("DNADatabase");
  const crimeFP = form.get("crimeSceneFingerprint");
  const crimeDNA = form.get("crimeSceneDNA");

  const isValidFDB = fingerprintDB.every(
    (x) => x instanceof File && x.name.toLowerCase().endsWith(".bmp"),
  );
  const isValidDNA =
    dnaDB instanceof File && dnaDB.name.toLowerCase().endsWith(".fasta");
  const isValidFP =
    crimeFP instanceof File && crimeFP.name.toLowerCase().endsWith(".bmp");
  const isValidDNAFile =
    crimeDNA instanceof File && crimeDNA.name.toLowerCase().endsWith(".fasta");

  if (!isValidFDB || !isValidDNA || !isValidFP || !isValidDNAFile)
    return c.json({
      success: false,
      message: "Invalid file format",
      data: {
        isValidFDB,
        isValidDNA,
        isValidFP,
        isValidDNAFile,
      },
    });

  const fingerprintPaths = await Promise.all(
    fingerprintDB.map((f) => saveFile(f as File, fingerprintDir)),
  );

  const dnaDBPath = await saveFile(dnaDB as File, dnaDir);
  const crimeFPPath = await saveFile(crimeFP as File, crimeDir);
  const crimeDNAPath = await saveFile(crimeDNA as File, crimeDir);

  await Promise.all([
    runProcess(`${process.cwd()}/binary/fingerprint_analysis`, [
      outputPath,
      fingerprintDir,
      crimeFPPath,
    ]),
    runProcess(`${process.cwd()}/binary/dna_analysis`, [
      outputPath,
      crimeDNAPath,
      dnaDBPath,
    ]),
  ]);

  const raw_fingerprint_results = readFileSync(
    `${outputPath}/fingerprint_results.json`,
    "utf-8",
  );
  const suspectData = JSON.parse(raw_fingerprint_results);

  const raw_dna_analysis = readFileSync(
    `${outputPath}/dna_results.json`,
    "utf-8",
  );
  const dna_analysis = JSON.parse(raw_dna_analysis);

  return c.json({
    success: true,
    message: "Successfully analyzed crime scene",
    data: { suspects: suspectData, dna: dna_analysis },
  });
});

async function saveFile(file: File, dir: string) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = path.join(dir, file.name);
  await writeFile(filePath, buffer);
  return filePath;
}

function runProcess(cmd: string, options: string[]) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, options);

    child.on("close", (code) => {
      if (code === 0) resolve({ success: true, error: null });
      else reject(new Error(`Process exited with code ${code}`));
    });

    child.on("error", (error) => {
      reject({ success: false, error });
    });
  });
}

export default closedTrackRoutes;
