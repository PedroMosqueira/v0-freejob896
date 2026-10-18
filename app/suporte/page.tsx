import Link from "next/link"
import type { Metadata } from "next"
import { Mail, MessageCircle } from "lucide-react"
import { LegalPage, LegalSection } from "@/components/legal-page"

export const metadata: Metadata = {
  title: "Suporte",
  description: "Fale com o Freejob e veja respostas para as dúvidas mais comuns.",
  alternates: { canonical: "/suporte" },
}

const FAQ = [
  {
    question: "Como cancelo minha assinatura?",
    answer:
      "Em Planos, clique em “Cancelar assinatura”. A cobrança para e todos os recursos continuam funcionando até o fim do período já pago. Antes dessa data você pode reativar sem nova cobrança.",
  },
  {
    question: "Posso pedir reembolso?",
    answer:
      "Sim, em até 7 dias da primeira contratação de um plano (direito de arrependimento do Código de Defesa do Consumidor). Fale com a gente por e-mail ou WhatsApp dentro desse prazo.",
  },
  {
    question: "O profissional não apareceu ou o serviço teve problema. O que faço?",
    answer:
      "Primeiro tente resolver pelo chat do pedido. Se não houver acordo, envie para o suporte o link do pedido e uma descrição do que aconteceu, que analisamos o caso.",
  },
  {
    question: "Não recebi o código de verificação no WhatsApp.",
    answer:
      "Confira se o número está com DDD e se o WhatsApp está ativo nele. Aguarde alguns minutos antes de pedir um novo código, porque há um limite de tentativas por segurança.",
  },
  {
    question: "Esqueci minha senha.",
    answer: "Na tela de entrada, use “Esqueci minha senha” e siga o link enviado para o seu e-mail. Confira também a caixa de spam.",
  },
  {
    question: "Como excluo minha conta?",
    answer:
      "No seu perfil, no final da página, use “Excluir conta”. A exclusão não é possível enquanto houver serviço em andamento ou pagamento pendente.",
  },
  {
    question: "Quero denunciar um usuário ou um pedido.",
    answer:
      "Envie para o suporte o link do pedido ou o nome do usuário e o motivo. Conteúdos e contas que violam os Termos de uso são removidos.",
  },
]

function whatsappLink() {
  const number = process.env.FREEJOB_WHATSAPP_NUMBER?.replace(/\D/g, "")
  if (!number) return null
  return `https://wa.me/${number}?text=${encodeURIComponent("Olá! Preciso de ajuda com o Freejob.")}`
}

export default function SupportPage() {
  const whatsapp = whatsappLink()

  return (
    <LegalPage
      title="Suporte"
      intro={<p>Fale com a gente pelo canal que preferir. Respondemos em dias úteis, normalmente em até 1 dia útil.</p>}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <a
          href="mailto:contato@freejob.services"
          className="flex items-center gap-4 rounded-lg border border-border p-4 transition-colors hover:border-[#4F7CFF]"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#4F7CFF]/10 text-[#4F7CFF]">
            <Mail className="size-5" aria-hidden="true" />
          </span>
          <span className="flex flex-col">
            <span className="font-semibold">E-mail</span>
            <span className="text-sm text-muted-foreground">contato@freejob.services</span>
          </span>
        </a>
        {whatsapp && (
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 rounded-lg border border-border p-4 transition-colors hover:border-[#4F7CFF]"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#4F7CFF]/10 text-[#4F7CFF]">
              <MessageCircle className="size-5" aria-hidden="true" />
            </span>
            <span className="flex flex-col">
              <span className="font-semibold">WhatsApp</span>
              <span className="text-sm text-muted-foreground">Abrir conversa</span>
            </span>
          </a>
        )}
      </div>

      <LegalSection title="Perguntas frequentes">
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {FAQ.map((item) => (
            <details key={item.question} className="group px-4 py-3">
              <summary className="cursor-pointer list-none font-medium text-foreground marker:hidden [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-4">
                  {item.question}
                  <span aria-hidden="true" className="text-muted-foreground transition-transform group-open:rotate-45">
                    +
                  </span>
                </span>
              </summary>
              <p className="pt-2">{item.answer}</p>
            </details>
          ))}
        </div>
      </LegalSection>

      <p className="text-sm text-muted-foreground">
        Veja também os <Link href="/termos" className="text-[#4F7CFF] underline underline-offset-4">Termos de uso</Link> e a{" "}
        <Link href="/privacidade" className="text-[#4F7CFF] underline underline-offset-4">Política de privacidade</Link>.
      </p>
    </LegalPage>
  )
}
