import Image from "next/image"
import type { ReactNode } from "react"

export function StatusScreen({
  code,
  title,
  description,
  children,
}: {
  code: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 py-16 text-foreground">
      <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
        <Image src="/icons/icon-192.png" alt="Freejob" width={56} height={56} className="rounded-xl" />
        <p className="font-mono text-sm font-medium tracking-widest text-muted-foreground">{code}</p>
        <div className="flex flex-col gap-2">
          <h1 className="text-balance text-2xl font-semibold md:text-3xl">{title}</h1>
          <p className="text-pretty leading-relaxed text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">{children}</div>
      </div>
    </main>
  )
}
