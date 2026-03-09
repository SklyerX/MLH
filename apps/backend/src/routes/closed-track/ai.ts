import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { env } from "../../utils/env.js";

interface DnaEvidence {
  suspectName: string;
  confidence: number; // 0 to 1
  fastaMatches: number; // Number of matching lines/sequences from the FASTA file
}

interface FingerprintEvidence {
  suspectName: string;
  confidence: number; // 0 to 1
  ransacLines: number; // Number of consistent lines found via RANSAC
}

export interface ForensicScene {
  caseId: string;
  dna: DnaEvidence[];
  fingerprint: FingerprintEvidence[];
}

export async function generateForensicAnalysis(caseData: ForensicScene) {
  const google = createGoogleGenerativeAI({
    apiKey: env.GEMINI_API_KEY,
  });

  // We use the specific Thinking experimental model for deep analysis
  const model = google("gemini-3.1-pro-preview");

  const { text, reasoning } = await generateText({
    model: model,
    system: `You are a Senior Forensic Analyst.
        You are analyzing a crime scene where DNA and Fingerprints point to DIFFERENT suspects.
        - DNA Evidence: Uses FASTA sequence matching. High line counts indicate stronger sequence alignment.
        - Fingerprint Evidence: Uses RANSAC algorithm to find matching ridge lines. More RANSAC lines mean a more robust geometric match.
        
        CRITICAL: Your report must address why there are two different individuals identified and evaluate the strength of each match based on the technical metrics (FASTA lines vs RANSAC lines).`,

    prompt: `
        FORENSIC CASE FILE: ${caseData.caseId}

        --- EVIDENCE ITEM A: DNA ---
        ${caseData.dna.map((d) => {
          return `
Suspect identified: ${d.suspectName}
Match Confidence: ${d.confidence * 100}%
FASTA Sequence Matches: ${d.fastaMatches} lines
-------------------------------------------------------------
          `;
        })}
        
        --- EVIDENCE ITEM B: FINGERPRINT ---
        ${caseData.fingerprint.map((f) => {
          return `
Suspect identified: ${f.suspectName}
  Match Confidence: ${f.confidence * 100}%
  RANSAC Consistent Lines: ${f.ransacLines} lines
          `;
        })}

        Please generate:
        1. An executive summary of the discrepancy.
        2. A technical evaluation of the DNA (FASTA) and Fingerprint (RANSAC) data.
        3. A conclusion on whether this suggests a multi-perpetrator scene.
        `,
    providerOptions: {
      google: {
        thinkingConfig: {
          includeThoughts: true,
        },
      },
    },
  });

  return { report: text, internalReasoning: reasoning };
}
