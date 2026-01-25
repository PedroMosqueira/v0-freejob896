# Como Configurar SMTP no Supabase para Envio de Emails

## Problema Atual

O Supabase usa um servidor SMTP padrão apenas para demonstração, que tem:
- Rate limits muito baixos (poucos emails por hora)
- Baixa confiabilidade de entrega
- Emails podem cair em spam

## Solução: Configurar SMTP Customizado

### Opções de Provedores SMTP Gratuitos:

#### 1. **Resend** (Recomendado - 100 emails/dia gratuito)
- Acesse: https://resend.com
- Crie uma conta gratuita
- Gere uma API Key
- Configure no Supabase (veja passos abaixo)

#### 2. **Gmail SMTP** (300 emails/dia)
- Use sua conta Gmail
- Ative "App Passwords" nas configurações de segurança
- Host: `smtp.gmail.com`
- Port: `587` (TLS)

#### 3. **SendGrid** (100 emails/dia gratuito)
- Acesse: https://sendgrid.com
- Crie conta gratuita
- Gere API Key
- Host: `smtp.sendgrid.net`
- Port: `587`

---

## Passos para Configurar no Supabase:

### 1. Acesse o Supabase Dashboard
\`\`\`
https://supabase.com/dashboard/project/[SEU_PROJECT_ID]
\`\`\`

### 2. Vá para Authentication → Email Templates

### 3. Role até "SMTP Settings" no final da página

### 4. Preencha as configurações:

**Para Resend:**
\`\`\`
SMTP Host: smtp.resend.com
SMTP Port: 587
SMTP Username: resend
SMTP Password: [SUA_API_KEY_DO_RESEND]
Sender Email: noreply@seudominio.com (ou use o domínio do Resend)
Sender Name: FreeJob Brasil
\`\`\`

**Para Gmail:**
\`\`\`
SMTP Host: smtp.gmail.com
SMTP Port: 587
SMTP Username: seuemail@gmail.com
SMTP Password: [SUA_APP_PASSWORD]
Sender Email: seuemail@gmail.com
Sender Name: FreeJob Brasil
\`\`\`

**Para SendGrid:**
\`\`\`
SMTP Host: smtp.sendgrid.net
SMTP Port: 587
SMTP Username: apikey
SMTP Password: [SUA_API_KEY_DO_SENDGRID]
Sender Email: noreply@seudominio.com
Sender Name: FreeJob Brasil
\`\`\`

### 5. Clique em "Save" para salvar as configurações

### 6. Teste o envio
- Use a página de teste: `/admin/test-email`
- Ou solicite recuperação de senha na página de login

---

## Verificar se Está Funcionando

1. Acesse: `https://supabase.com/dashboard/project/[SEU_PROJECT_ID]/auth/logs`
2. Procure por logs de envio de email
3. Verifique se há erros de SMTP

---

## Template de Email de Recuperação de Senha

Para personalizar o email que os usuários recebem:

1. Vá para: Authentication → Email Templates
2. Encontre "Reset Password"
3. Edite o template HTML
4. Use a variável `{{ .ConfirmationURL }}` para o link de reset

Exemplo:
\`\`\`html
<h2>Recuperação de Senha - FreeJob Brasil</h2>
<p>Olá!</p>
<p>Você solicitou a recuperação de senha da sua conta.</p>
<p>Clique no botão abaixo para criar uma nova senha:</p>
<a href="{{ .ConfirmationURL }}" style="background-color: #0070f3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
  Redefinir Senha
</a>
<p>Se você não solicitou esta recuperação, ignore este email.</p>
<p>Este link expira em 1 hora.</p>
\`\`\`

---

## Solução de Problemas

### Email não chega:
1. Verifique logs no Supabase Dashboard
2. Confirme que SMTP está configurado corretamente
3. Verifique pasta de spam
4. Teste com outro provedor de email

### Email cai em spam:
1. Configure SPF, DKIM e DMARC no seu domínio
2. Use um domínio customizado (não @gmail.com)
3. Use provedores especializados (Resend, SendGrid)

### Rate limit excedido:
1. Upgrade para plano pago do provedor SMTP
2. Use múltiplos provedores para backup
