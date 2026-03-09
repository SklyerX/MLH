'use client'

import FileUpload from '@/components/file-upload';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { redirect } from 'next/navigation';
import React, { useState } from 'react'
import { toast } from 'sonner';

const steps = [
    {
        title: "Upload suspects fingerprints",
        description: "A list of .bmp files",
        upload_desc: "Suspect image files (.bmp) only"
    },
    {
        title: "Upload crime scene fingerprint",
        description: "The crime scene fingerprint",
        upload_desc: "The crime scene fingerprint (1 .bmp file)"
    },
    {
        title: "Crime scene DNA",
        description: "A list of .fasta files",
        upload_desc: "Suspect files (.fasta) only"
    },
    {
        title: "Suspects DNA",
        description: "A list of .fasta files",
        upload_desc: "Suspect files (.fasta) only"
    },
]


export default function Page() {
    const [fingerprintSuspects, setFingerprintSuspects] = useState<File[]>([]);
    const [suspectsDNA, setSuspectsDNA] = useState<File | null>(null);
    const [crimeSceneFingerprint, setCrimeSceneFingerprint] = useState<File | null>(null);
    const [crimeSceneDNA, setCrimeSceneDNA] = useState<File | null>(null);

    const [isLoading, setIsLoading] = useState(false);

    const [currentStep, setCurrentStep] = useState<number>(0)

    function handleFiles(selected: FileList | null) {
        if (!selected) return


        if (currentStep === 0) {
            const valid = Array.from(selected).filter((file) =>
                file.name.toLowerCase().endsWith(".bmp")
            )

            setFingerprintSuspects(valid)
            toast.success(`Suspects file received (${valid.length} files)`)
            setCurrentStep((c) => c + 1)
            console.log(valid, selected)
        }

        if (currentStep === 1) {
            const valid = Array.from(selected).filter((file) =>
                file.name.toLowerCase().endsWith(".bmp")
            )

            if (valid.length > 1) return toast.error("Please only add one .bmp file")

            setCrimeSceneFingerprint(valid[0])
            toast.success(`Crime scene found`)
            setCurrentStep((c) => c + 1)
        }

        if (currentStep === 2) {
            const valid = Array.from(selected).filter((file) =>
                file.name.toLowerCase().endsWith(".fasta")
            )

            if (valid.length > 1) return toast.error("Please only add one .fasta file")

            setCrimeSceneDNA(valid[0])
            toast.success(`Crime scene DNA received`)
            setCurrentStep((c) => c + 1)
        }

        if (currentStep === 3) {
            const valid = Array.from(selected).filter((file) =>
                file.name.toLowerCase().endsWith(".fasta")
            )

            if (valid.length > 1) return toast.error("Please only add one .fasta file")

            setSuspectsDNA(valid[0])
            toast.success(`Suspect(s) DNA received`)
            setCurrentStep((c) => c + 1)
        }
        // setFiles((prev) => [...prev, ...valid])
    }

    async function handleUpload() {
        setIsLoading(true)
        const form = new FormData();

        fingerprintSuspects.map((f) => {
            form.append("fingerprintDatabase", f)
        })

        form.append("crimeSceneFingerprint", crimeSceneFingerprint as File);
        form.append("crimeSceneDNA", crimeSceneDNA as File);
        form.append("DNADatabase", suspectsDNA as File);

        toast.loading("Starting analysis", {
            description: "Please do not refresh this page!",
            id: "toast-analysis"
        });

        const res = await fetch("http://localhost:9000/closed-track/analyze", {
            method: "POST",
            body: form,
        });

        if (!res.ok) {
            console.log("FAILED")
            toast.error("Analysis error", {
                description: "Something went wrong while analyzing the crime scene",
                id: "toast-analysis"
            })
            return
        }

        const json = await res.json();

        const localData = localStorage.getItem("results");

        let d = []

        if (localData) {
            const parsed = JSON.parse(localData);
            d = parsed
        }

        d.push(json.data)

        toast.success("Crime scene analysis complete", { description: "Redirecting you to results", id: "toast-analysis" })

        localStorage.setItem("results", JSON.stringify(d))

        redirect(`/${json.data.id}`);
    }

    return (
        <div>

            {currentStep !== 4 ? (
                <>
                    <h3 className="text-3xl font-semibold">
                        {steps[currentStep].title} ({currentStep + 1} / {steps.length})
                    </h3>
                    <p className='text-muted-foreground mt-2'>{steps[currentStep].description}</p>
                    <label className="border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer hover:bg-muted mt-10">
                        <Upload className="w-6 h-6 mb-2" />

                        <span className="text-sm text-muted-foreground">
                            {steps[currentStep].upload_desc}
                        </span>

                        <input
                            type="file"
                            multiple
                            accept=".bmp,.fasta"
                            className="hidden"
                            onChange={(e) => handleFiles(e.target.files)}
                        />
                    </label>
                </>
            ) : null}

            {currentStep === 4 ? (
                <>
                    <div className="flex justify-between">
                        <div>
                            <h3 className="text-3xl font-semibold">All files have been received</h3>
                            <p className="text-muted-foreground">If you believe all the proper files have been uploaded click on the upload button below</p>
                        </div>
                        <Button size="lg" className='cursor-pointer disabled:cursor-not-allowed' onClick={handleUpload} disabled={isLoading}>
                            Upload
                        </Button>
                    </div>
                </>
            ) : null}
        </div>
    )
}
