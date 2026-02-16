"use client"

console.log("[v0] ✅ Verificação de EMAIL DUPLICADO ATIVA - register-form.tsx carregado!")

import { useFormState, useFormStatus } from "react-dom"
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Loader2, AlertTriangle, Info } from "lucide-react"
import { signUpWithEmail, resendVerificationEmail, clearUnverifiedUser, checkUserStatus } from "@/lib/auth-actions"

interface RegisterFormProps {
  onSwitchToLogin: () => void
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-600/90" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Registrando...
        </>
      ) : (
        "Registrar"
      )}
    </Button>
  )
}

function ResendButton({ email }: { email: string }) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" variant="default" className="w-full bg-blue-600 hover:bg-blue-600/90" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Reenviando...
        </>
      ) : (
        "Reenviar email"
      )}
    </Button>
  )
}

function ClearButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" variant="destructive" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Limpando...
        </>
      ) : (
        "🗑️ Limpar registro anterior"
      )}
    </Button>
  )
}

function StatusButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" variant="outline" className="w-full bg-transparent" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Verificando...
        </>
      ) : (
        "🔍 Verificar Status da Conta"
      )}
    </Button>
  )
}

export default function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const [password, setPassword] = useState("")
  const [signUpState, signUpAction] = useFormState(signUpWithEmail, null)
  const [resendState, resendAction] = useFormState(resendVerificationEmail, null)
  const [clearState, clearAction] = useFormState(clearUnverifiedUser, null)
  const [statusState, statusAction] = useFormState(checkUserStatus, null)

  const checkPasswordStrength = (password: string) => {
    let score = 0
    if (!password) return { score: 0, text: "Nenhuma senha" }

    if (password.length >= 8) score += 20
    if (password.length >= 12) score += 20
    if (/[a-z]/.test(password)) score += 10
    if (/[A-Z]/.test(password)) score += 10
    if (/\d/.test(password)) score += 10
    if (/[^a-zA-Z0-9]/.test(password)) score += 20

    let text = "Muito Fraca"
    if (score >= 80) text = "Muito Forte"
    else if (score >= 60) text = "Forte"
    else if (score >= 40) text = "Média"
    else if (score >= 20) text = "Fraca"

    return { score: Math.min(score, 100), text }
  }

  const passwordStrength = checkPasswordStrength(password)

  if (statusState?.success && statusState?.status) {
    const { status } = statusState
    return (
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
              <Info className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold">Status da Conta</h2>
            <div className="text-left space-y-3 bg-gray-50 p-4 rounded-lg">
              <div className="text-sm">
                <strong>Email:</strong> {status.email}
              </div>
              <div className="text-sm">
                <strong>Existe no sistema:</strong> {status.existsInAuth ? "✅ Sim" : "❌ Não"}
              </div>
              <div className="text-sm">
                <strong>Email verificado:</strong> {status.emailVerified ? "✅ Sim" : "❌ Não"}
              </div>
              <div className="text-sm">
                <strong>Pode fazer login:</strong> {status.existsInCustomTable ? "✅ Sim" : "❌ Não"}
              </div>
              {status.verifiedAt && (
                <div className="text-sm">
                  <strong>Verificado em:</strong> {new Date(status.verifiedAt).toLocaleString("pt-BR")}
                </div>
              )}
            </div>

            {status.existsInAuth && status.emailVerified && status.existsInCustomTable && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">✅ Sua conta está completa! Você pode fazer login normalmente.</p>
              </div>
            )}

            {status.existsInAuth && !status.emailVerified && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  ⚠️ Sua conta existe mas o email não foi verificado. Verifique sua caixa de entrada.
                </p>
              </div>
            )}

            {status.existsInAuth && status.emailVerified && !status.existsInCustomTable && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">
                  ❌ Email verificado mas conta não foi criada completamente. Entre em contato com o suporte.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Button onClick={onSwitchToLogin} className="w-full bg-blue-600 hover:bg-blue-600/90">
                Tentar fazer login
              </Button>
              <Button onClick={() => window.location.reload()} variant="outline" className="w-full">
                Voltar ao cadastro
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (clearState?.cleared) {
    return (
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold">Registro limpo!</h2>
            <p className="text-sm text-muted-foreground">{clearState.success}</p>
            <Button onClick={() => window.location.reload()} className="w-full bg-blue-600 hover:bg-blue-600/90">
              Tentar cadastro novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (signUpState?.success) {
    return (
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold">Verifique seu email</h2>
            <p className="text-sm text-muted-foreground">
              Enviamos um link de confirmação para <strong>{signUpState.email}</strong>. Clique no link no email para
              ativar sua conta.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
              <h3 className="font-semibold text-sm text-blue-900 mb-2">📧 Não recebeu o email?</h3>
              <div className="text-xs text-blue-800 space-y-2">
                <div>
                  <strong>1. Verifique estas pastas:</strong>
                  <ul className="ml-4 mt-1 list-disc">
                    <li>Caixa de Spam/Lixo Eletrônico</li>
                    <li>Promoções (Gmail)</li>
                    <li>Atualizações (Gmail)</li>
                    <li>Pasta "Outros" (Outlook)</li>
                  </ul>
                </div>
                <div>
                  <strong>2. Aguarde até 5 minutos</strong> - emails podem demorar para chegar
                </div>
                <div>
                  <strong>3. Procure por:</strong> emails de "noreply" ou "auth" do Supabase
                </div>
                <div>
                  <strong>4. Se ainda não chegou:</strong> use o botão "Reenviar" abaixo
                </div>
                <div className="mt-3 pt-2 border-t border-blue-200">
                  <strong>🆘 Problema persistente?</strong>
                  <p className="mt-1">
                    Visite a <a href="/admin/email-diagnostics" className="underline font-semibold">página de diagnóstico</a> para testar a configuração de email.
                  </p>
                </div>
              </div>
            </div>

            {resendState?.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">{resendState.error}</p>
                {resendState.rateLimited && (
                  <div className="mt-2 space-y-2">
                    <form action={clearAction}>
                      <input type="hidden" name="email" value={signUpState.email} />
                      <ClearButton />
                    </form>
                    <Button
                      onClick={() => window.location.reload()}
                      variant="link"
                      className="text-sm text-blue-600 p-0 h-auto"
                    >
                      Ou tentar com outro email
                    </Button>
                  </div>
                )}
              </div>
            )}

            {resendState?.success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">{resendState.success}</p>
                <p className="text-xs text-green-700 mt-2">
                  ✅ Email reenviado! Verifique sua caixa de entrada e pasta de spam nos próximos 5 minutos.
                </p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                ⚠️ <strong>Importante:</strong> O link expira em 1 hora. Se não receber o email, verifique a pasta de
                spam ou use um provedor diferente (Gmail, Outlook, etc.).
              </p>
            </div>

            <div className="space-y-2">
              <form action={resendAction}>
                <input type="hidden" name="email" value={signUpState.email} />
                <ResendButton email={signUpState.email} />
              </form>

              <form action={clearAction}>
                <input type="hidden" name="email" value={signUpState.email} />
                <ClearButton />
              </form>

              <Button onClick={onSwitchToLogin} variant="link" className="w-full text-sm text-blue-600">
                Já confirmou? Fazer login
              </Button>

              <Button onClick={() => window.location.reload()} variant="link" className="w-full text-sm text-gray-600">
                Tentar com outro email
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-sm">
      <CardContent className="pt-6">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold leading-tight">Criar sua conta Freejob</h2>
          <p className="text-sm text-muted-foreground mt-1">Preencha seus dados para começar a usar.</p>
        </div>

        <form action={signUpAction} className="grid gap-4">
          {signUpState?.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-red-800">
                    <strong>Erro ao cadastrar:</strong> {signUpState.error}
                  </p>
                  
                  {signUpState.isDuplicateEmail && (
                    <div className="mt-3 bg-red-100 p-2 rounded text-xs text-red-700 space-y-2">
                      <p>
                        <strong>🔴 Email já cadastrado</strong>
                      </p>
                      <p>O email <strong>{signUpState.email}</strong> já possui uma conta ativa.</p>
                      <p>Você pode:</p>
                      <ul className="list-disc ml-4 space-y-1">
                        <li>Usar outro email para criar uma nova conta</li>
                        <li>Verificar o status da sua conta existente</li>
                        <li>Recuperar a senha se esquecer</li>
                      </ul>
                    </div>
                  )}
                  
                  {signUpState.isPendingConfirmation && (
                    <div className="mt-3 bg-yellow-100 p-2 rounded text-xs text-yellow-800 space-y-2">
                      <p>
                        <strong>⏳ Email aguardando confirmação</strong>
                      </p>
                      <p>O email <strong>{signUpState.email}</strong> já foi registrado, mas ainda está aguardando confirmação.</p>
                      <p>Se não recebeu o email de confirmação:</p>
                      <ul className="list-disc ml-4 space-y-1">
                        <li>Verifique a pasta de SPAM</li>
                        <li>Clique em "Reenviar Email de Confirmação" abaixo</li>
                        <li>Se o problema persistir, use "Limpar Registro" para começar novamente</li>
                      </ul>
                    </div>
                  )}
                  
                  {signUpState.showStatusCheck && (
                    <div className="mt-3 space-y-2">
                      {signUpState.showResendOption && (
                        <form action={resendAction}>
                          <input type="hidden" name="email" value={signUpState.email} />
                          <ResendButton email={signUpState.email} />
                        </form>
                      )}
                      {signUpState.isDuplicateEmail && (
                        <form action={statusAction}>
                          <input type="hidden" name="email" value={signUpState.email} />
                          <StatusButton />
                        </form>
                      )}
                      {signUpState.isPendingConfirmation && (
                        <form action={clearAction}>
                          <input type="hidden" name="email" value={signUpState.email} />
                          <ClearButton />
                        </form>
                      )}
                      {signUpState.isDuplicateEmail ? (
                        <Button 
                          type="button"
                          onClick={() => window.location.reload()} 
                          variant="outline" 
                          className="w-full"
                        >
                          Tentar com outro email
                        </Button>
                      ) : !signUpState.showResendOption && !signUpState.isPendingConfirmation ? (
                        <form action={clearAction}>
                          <input type="hidden" name="email" value={signUpState.email} />
                          <ClearButton />
                        </form>
                      ) : null}
                    </div>
                  )}
                  
                  {signUpState.rateLimited && !signUpState.isDuplicateEmail && (
                    <p className="text-xs text-red-600 mt-2">
                      💡 <strong>Dica:</strong> Use "Verificar Status" para entender o problema, ou tente com um email
                      diferente.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {clearState?.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{clearState.error}</p>
            </div>
          )}

          {statusState?.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{statusState.error}</p>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="register-email">Email</Label>
            <Input id="register-email" name="email" type="email" placeholder="seu@email.com" required />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="register-password">Senha</Label>
            <Input
              id="register-password"
              name="password"
              type="password"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="mt-1">
              <Progress value={passwordStrength.score} className="h-2" />
              <p
                className="text-sm mt-1"
                style={{
                  color: passwordStrength.score < 40 ? "red" : passwordStrength.score < 70 ? "orange" : "green",
                }}
              >
                Força: {passwordStrength.text}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                A senha deve ter pelo menos 8 caracteres e incluir letras maiúsculas, minúsculas, números e símbolos
                para ser forte.
              </p>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="confirm-password">Confirmar Senha</Label>
            <Input
              id="confirm-password"
              name="confirmPassword"
              type="password"
              placeholder="Confirme sua senha"
              required
            />
          </div>

          <SubmitButton />

          <Button type="button" variant="link" className="w-full text-sm text-blue-600" onClick={onSwitchToLogin}>
            Já tem conta? Entrar
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
