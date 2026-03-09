import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';

interface DnaEvidence {
    suspectName: string;
    confidence: number;       // 0 to 1
    fastaMatches: number;     // Number of matching lines/sequences from the FASTA file
}

interface FingerprintEvidence {
    suspectName: string;
    confidence: number;       // 0 to 1
    ransacLines: number;      // Number of consistent lines found via RANSAC
}

interface ForensicScene {
    caseId: string;
    dna: DnaEvidence;
    fingerprint: FingerprintEvidence;
}

async function generateForensicAnalysis(caseData: ForensicScene) {
    const google = createGoogleGenerativeAI({
        apiKey: 'AIzaSyAxDm56IM2ozQ0x2gWuACto-SLRDA1DD3M',
    });

    // We use the specific Thinking experimental model for deep analysis
    const model = google('gemini-3.1-pro-preview');

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
        Suspect identified: ${caseData.dna.suspectName}
        Match Confidence: ${caseData.dna.confidence * 100}%
        FASTA Sequence Matches: ${caseData.dna.fastaMatches} lines
        
        --- EVIDENCE ITEM B: FINGERPRINT ---
        Suspect identified: ${caseData.fingerprint.suspectName}
        Match Confidence: ${caseData.fingerprint.confidence * 100}%
        RANSAC Consistent Lines: ${caseData.fingerprint.ransacLines} lines

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
            }
        },
    });

    return { report: text, internalReasoning: reasoning };
}

// --- Test with the metrics you specified ---
const myTestData: ForensicScene = {
    caseId: "SCENE-77-B",
    dna: {
        suspectName: "Arshiya K.",
        confidence: 0.98,
        fastaMatches: 450 // Matching lines in the FASTA alignment
    },
    fingerprint: {
        suspectName: "Unknown Subject B",
        confidence: 0.72,
        ransacLines: 8 // RANSAC inliers/lines found
    }
};

generateForensicAnalysis(myTestData).then(res => {
    console.log("REASONING:", res.internalReasoning);
    console.log("REPORT:", res.report);
});