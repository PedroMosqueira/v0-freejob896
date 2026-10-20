"use client"

import { useState } from "react"
import Link from "next/link"
import { Loader2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { GoogleLoginButton, sendMagicLink } from "@/components/auth-form"

function AssistantBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-xs rounded-lg rounded-bl-none bg-gray-100 px-4 py-2 text-gray-800">
        <p className="text-sm leading-relaxed">{children}</p>
      </div>
    </div>
  )
}

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-xs break-all rounded-lg rounded-br-none bg-blue-500 px-4 py-2 text-white">
        <p className="text-sm">{children}</p>
      </div>
    </div>
  )
}

export function ChatLoginPrompt({ imagesDropped }: { imagesDropped: boolean }) {
  const [email, setEmail] = useState("")
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSend = async () => {
    if (loading || !email.trim()) return
    setLoading(true)
    setError("")
    const sendError = await sendMagicLink(email)
    if (sendError) {
      setError(sendError)
    } else {
      setSentTo(email.trim())
      setEmail("")
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <AssistantBubble>
        Seu pedido está guardado. Para publicar, é só entrar na sua conta. Se ainda não tem, ela é criada na hora.
      </AssistantBubble>

      {imagesDropped && (
        <AssistantBubble>
          As fotos eram grandes demais para guardar. Depois de entrar, você poderá adicioná-las de novo.
        </AssistantBubble>
      )}

      <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3">
        <GoogleLoginButton disabled={loading} onError={setError} onLoadingChange={setLoading} />
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="h-px flex-1 bg-gray-200" aria-hidden="true" />
          ou receba um link no e-mail
          <span className="h-px flex-1 bg-gray-200" aria-hidden="true" />
        </div>

        {sentTo ? (
          <div className="flex flex-col gap-3">
            <UserBubble>{sentTo}</UserBubble>
            <AssistantBubble>
              Enviei um link de acesso para {sentTo}. Abra o e-mail neste mesmo aparelho e navegador para publicar o
              pedido.
            </AssistantBubble>
            <button
              type="button"
              onClick={() => setSentTo(null)}
              className="w-fit text-xs font-medium text-blue-600 underline-offset-2 hover:underline"
            >
              Usar outro e-mail
            </button>
          </div>
        ) : (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
          >
            <label htmlFor="chat-login-email" className="sr-only">
              Seu e-mail
            </label>
            <Input
              id="chat-login-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Digite seu e-mail"
              disabled={loading}
              className="flex-1 bg-white text-gray-900"
            />
            <Button type="submit" size="icon" disabled={loading || !email.trim()} aria-label="Enviar link de acesso">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        )}

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <p className="text-xs leading-relaxed text-gray-500">
          Ao continuar, você concorda com os{" "}
          <Link href="/termos" className="text-blue-600 underline underline-offset-2">
            Termos de uso
          </Link>{" "}
          e a{" "}
          <Link href="/privacidade" className="text-blue-600 underline underline-offset-2">
            Política de privacidade
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
