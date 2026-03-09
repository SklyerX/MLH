import { spawn } from "child_process";
import { Hono } from "hono";

import { writeFile, mkdir } from "fs/promises";
import path from "path";
import os from "os";
import { readFileSync, rmSync } from "fs";
import { zValidator } from "@hono/zod-validator";
import z from "zod";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";

import NC from "node-cache";
import { generateForensicAnalysis, type ForensicScene } from "./ai.js";

const cache = new NC({
  stdTTL: 24 * 60 * 60, // one day
});

const closedTrackRoutes = new Hono();

closedTrackRoutes.post("/analyze", async (c) => {
  const id = randomBytes(6).toString("hex");

  const baseDir = path.join(os.tmpdir(), `${id}`);

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
    runProcess(`${process.cwd()}/binary/Fingerprint_analysis`, [
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

  const image = readFileSync(`${outputPath}/fingerprint_matches.png`);
  const base64 = image.toString("base64");

  const dto: ForensicScene = {
    caseId: id,
    dna: dna_analysis.map((d: any) => ({
      suspectName: d.suspect_id,
      confidence: d.confidence,
      fastaMatches: d.best_alignment_score,
    })),
    fingerprint: suspectData.map((s: any) => ({
      suspectName: s.name.split(".").at(0),
      confidence: s.confidence,
      ransacLines: s.score,
    })),
  };

  console.log(dto);

  const data = await generateForensicAnalysis(dto);

  return c.json({
    success: true,
    message: "Successfully analyzed crime scene",
    data: {
      id,
      suspects: { people: suspectData, image: base64 },
      dna: dna_analysis,
      ai: data,
    },
  });
});

async function saveFile(file: File, dir: string) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = path.join(dir, file.name);
  await writeFile(filePath, buffer);
  return filePath;
}

closedTrackRoutes.post(
  "/imagine",
  zValidator(
    "json",
    z.object({
      dna_sequence: z.string().min(32).max(10_000),
    }),
  ),
  async (c) => {
    const { dna_sequence } = c.req.valid("json");

    const id = c.req.param("id");

    const baseDir = path.join(os.tmpdir(), `imagine-${id}`);
    const outputPath = path.join(baseDir, "imagine-output");

    await mkdir(baseDir, { recursive: true });
    await mkdir(outputPath, { recursive: true });

    await runProcess(`${process.cwd()}/binary/generation`, [
      outputPath,
      dna_sequence,
    ]);

    const imgPath = path.join(`${outputPath}/dna_sketch.png`);

    const image = readFileSync(imgPath);
    rmSync(imgPath);

    return c.json({ image: image.toString("base64") });
  },
);

export default closedTrackRoutes;

function runProcess(cmd: string, options: string[]) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${cmd}`);

    const child = spawn(cmd, options);

    child.stdout.on("data", (data) => {
      console.log(`[${cmd} stdout]: ${data}`);
    });

    child.stderr.on("data", (data) => {
      console.error(`[${cmd} stderr]: ${data}`);
    });

    child.on("close", (code) => {
      console.log(`Process exited with code ${code}`);

      if (code === 0) resolve(true);
      else reject(new Error(`Process exited with code ${code}`));
    });

    child.on("error", reject);
  });
}
