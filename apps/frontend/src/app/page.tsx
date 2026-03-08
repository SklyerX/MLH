import { Button } from '@/components/ui/button'
import React from 'react'

export default function Page() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-4xl font-semibold">
            Echoes Forensics tool
          </h3>
          <p className="text-muted-foreground">Analyze a crime scene</p>
        </div>
        <Button size="lg">
          New case
        </Button>
      </div>
    </div>
  )
}
