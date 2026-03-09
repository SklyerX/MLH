'use client';

import { buttonVariants } from '@/components/ui/button'
import Link from 'next/link'

import { getCases } from "../hooks/use-cases";
import { useEffect, useState } from 'react';

export default function Page() {
  const [cases, setCases] = useState<any[]>([]);

  useEffect(() => {
    function setData() {
      const raw = localStorage.getItem("results");
      if (!raw) return null;

      const parsed = JSON.parse(raw);

      if (!parsed) return null;

      setCases(parsed);
    }

    setData()
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-4xl font-semibold">
            Echoes Forensics tool
          </h3>
          <p className="text-muted-foreground">Analyze a crime scene</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/upload" className={buttonVariants({ variant: "default", size: "lg" })}>New case</Link>
          <Link href="/sketch" className={buttonVariants({ variant: "secondary", size: "lg", class: "py-5" })}>Sketch from DNA</Link>
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-5">
        {cases.map((c) => (
          <Link href={`/${c.id}`}>
            <div className='border-b pb-5' key={c.id}>
              <h3 className="text-2xl font-semibold">Case #{c.id}</h3>
              <p className="text-muted-foreground">
                <span>
                  Total suspects: {c.suspects.people.length}
                </span>
                <span>
                  Total dna results: {c.dna.length}
                </span>
                <span>
                  {c?.ai?.report.substring(0, 100)}...
                </span>
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

