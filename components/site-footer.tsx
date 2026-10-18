import Link from "next/link"

const LINKS = [
  { href: "/termos", label: "Termos de uso" },
  { href: "/privacidade", label: "Privacidade" },
  { href: "/suporte", label: "Suporte" },
  { href: "/planos", label: "Planos" },
]

export function SiteFooter({ clearBottomNav = false }: { clearBottomNav?: boolean }) {
  return (
    <footer className={`border-t border-border ${clearBottomNav ? "pb-bottom-nav md:pb-0" : ""}`}>
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:justify-between sm:px-6 lg:px-8">
        <p>
          {"© "}
          {new Date().getFullYear()} <span translate="no">Freejob</span>
        </p>
        <nav aria-label="Links institucionais">
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="underline-offset-4 hover:text-foreground hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  )
}
