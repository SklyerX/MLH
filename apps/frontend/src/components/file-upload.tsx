"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, X } from "lucide-react"

export default function FileUpload() {
    const [files, setFiles] = useState<File[]>([])

    function handleFiles(selected: FileList | null) {
        if (!selected) return

        const valid = Array.from(selected).filter((file) =>
            file.name.endsWith(".bmp") || file.name.endsWith(".fasta")
        )

        setFiles((prev) => [...prev, ...valid])
    }

    function removeFile(index: number) {
        setFiles((prev) => prev.filter((_, i) => i !== index))
    }

    async function handleSubmit() {
        const formData = new FormData()

        files.forEach((file) => {
            formData.append("files", file)
        })

        await fetch("/api/analyze", {
            method: "POST",
            body: formData,
        })
    }

    return (
        <Card className="max-w-xl mx-auto">
            <CardHeader>
                <CardTitle>Upload Evidence Files</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
                <label className="border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer hover:bg-muted">
                    <Upload className="w-6 h-6 mb-2" />

                    <span className="text-sm text-muted-foreground">
                        Upload .bmp (fingerprints) or .fasta (DNA)
                    </span>

                    <input
                        type="file"
                        multiple
                        accept=".bmp,.fasta"
                        className="hidden"
                        onChange={(e) => handleFiles(e.target.files)}
                    />
                </label>

                {files.length > 0 && (
                    <div className="space-y-2">
                        {files.map((file, i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between border rounded-lg px-3 py-2"
                            >
                                <span className="text-sm">{file.name}</span>

                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => removeFile(i)}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}

                <Button
                    className="w-full"
                    disabled={files.length === 0}
                    onClick={handleSubmit}
                >
                    Analyze Evidence
                </Button>
            </CardContent>
        </Card>
    )
}