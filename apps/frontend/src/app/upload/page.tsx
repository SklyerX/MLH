'use client'

import FileUpload from '@/components/file-upload';
import React, { useState } from 'react'

const steps = [
    {
        title: "Upload suspects fingerprints",
        description: "A list of .bmp files"
    }
]


export default function Page() {
    const [fingerprintSuspects, setFingerprintSuspects] = useState<File[]>([]);
    const [suspectsDNA, setSuspectsDNA] = useState<File | null>(null);
    const [crimeSceneFingerprint, setCrimeSceneFingerprint] = useState<File | null>(null);
    const [crimeSceneDNA, setCrimeSceneDNA] = useState<File | null>(null);

    const [currentStep, setCurrentStep] = useState<number>(0)

    return (
        <div>
            <h3 className="text-3xl font-semibold">
                {steps[currentStep].title}
            </h3>
            <p className='text-muted-foreground mt-2'>{steps[currentStep].description}</p>
            <FileUpload />
        </div>
    )
}
