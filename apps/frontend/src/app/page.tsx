import { buttonVariants } from '@/components/ui/button'
import Link from 'next/link'

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
        <Link href="/upload" className={buttonVariants({ variant: "default", size: "lg" })}>New case</Link>
      </div>
    </div>
  )
}
