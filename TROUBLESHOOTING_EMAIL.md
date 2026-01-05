# Troubleshooting - Emails de Confirmação Não Chegam

## O que já verificamos:
- ✅ Supabase está enviando requests (status 200 nos logs)
- ✅ Endpoint `/resend` está funcionando
- ❌ Emails não estão chegando na caixa de entrada

## Checklist de Configuração SMTP no Supabase

### 1. Verificar Configuração SMTP no Dashboard

Acesse: `https://supabase.com/dashboard/project/[seu-project-id]/auth/providers`

**Configurações obrigatórias:**

\`\`\`
Enable Custom SMTP: ✅ ATIVADO

Host: smtp.resend.com
Port Number: 465 (SSL) ou 587 (TLS)
Username: resend
Password: [sua_api_key_do_resend]

Sender email: onboarding@resend.dev
Sender name: FreeJob Brasil
\`\`\`

### 2. Verificar API Key do Resend

**No Resend Dashboard:**
1. Acesse https://resend.com/api-keys
2. Certifique-se que a API key:
   - Está ATIVA (não expirada)
   - Tem permissão "Sending access"
   - Começa com `re_`

### 3. Testar Envio Manual

**No Supabase Dashboard:**
1. Vá em Authentication → Users
2. Clique em "Add user" → "Create new user"
3. Digite um email de teste
4. Marque "Send confirmation email"
5. Verifique se aparece erro

### 4. Problemas Comuns

#### Problema: Port incorreta
- **Solução:** Use porta `465` com SSL ou `587` com TLS
- Nunca use porta `25`

#### Problema: API Key inválida
- **Sintomas:** Erro 401 nos logs
- **Solução:** Gere nova API key no Resend

#### Problema: Sender email inválido
- **Sintomas:** Erro 400 ou 403
- **Solução:** Use `onboarding@resend.dev` ou verifique seu domínio

#### Problema: Rate limit
- **Sintomas:** Erro 429
- **Solução:** Aguarde alguns minutos ou upgrade no Resend

### 5. Verificar Logs do Resend

1. Acesse https://resend.com/logs
2. Verifique se há tentativas de envio
3. Procure por erros de autenticação ou rejeições

### 6. Teste com Email Diferente

Às vezes provedores específicos bloqueiam:
- ❌ Outlook/Hotmail - Taxa alta de bloqueio
- ✅ Gmail - Melhor taxa de entrega
- ✅ Seu domínio próprio - Melhor opção

## Solução Temporária: Confirmação Manual

Enquanto resolve o SMTP, confirme emails manualmente via SQL:

\`\`\`sql
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'email@do-usuario.com'
AND email_confirmed_at IS NULL;
\`\`\`

## Próximos Passos

1. **Imediato:** Use confirmação manual para testar o site
2. **Curto prazo:** Configure SMTP corretamente
3. **Longo prazo:** Configure domínio próprio para emails profissionais

## Ainda não funciona?

Se seguiu todos os passos e ainda não funciona:

1. Desative Custom SMTP no Supabase temporariamente
2. Use o provedor padrão do Supabase (rate limit baixo mas funciona)
3. Ou confirme manualmente todos os usuários por enquanto
