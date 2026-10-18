import Image from "next/image"
import Link from "next/link"
import type { ReactNode } from "react"
import { SiteFooter } from "@/components/site-footer"

interface LegalPageProps {
  title: string
  updatedAt?: string
  intro?: ReactNode
  children: ReactNode
}

export function LegalPage({ title, updatedAt, intro, children }: LegalPageProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-[#4F7CFF]">
            <Image src="/logo.png" alt="" width={32} height={32} className="rounded-full" />
            <span translate="no">Freejob</span>
          </Link>
          <Link href="/" className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            Voltar ao início
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
        <div className="flex flex-col gap-3">
          <h1 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
          {updatedAt && <p className="text-sm text-muted-foreground">Última atualização: {updatedAt}</p>}
          {intro && <div className="text-pretty leading-relaxed text-muted-foreground">{intro}</div>}
        </div>
        <div className="flex flex-col gap-8">{children}</div>
      </main>

      <SiteFooter />
    </div>
  )
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-balance text-lg font-semibold sm:text-xl">{title}</h2>
      <div className="flex flex-col gap-3 text-pretty leading-relaxed text-muted-foreground [&_a]:text-[#4F7CFF] [&_a]:underline [&_a]:underline-offset-4 [&_li]:pl-1 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  )
}
