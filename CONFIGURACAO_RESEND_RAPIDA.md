# ⚡ Configuração Rápida do Resend (5 minutos)

## Passos Simplificados

### 1️⃣ Criar conta
- Acesse: https://resend.com/signup
- Cadastre-se (gratuito)

### 2️⃣ Obter API Key
- Dashboard Resend → **API Keys** → **Create API Key**
- Copie a chave (começa com `re_`)

### 3️⃣ Configurar no Supabase
- Supabase Dashboard → **Authentication** → **Email Templates** → **SMTP Settings**
- Ative **Enable Custom SMTP**
- Cole estas configurações:

\`\`\`
Host: smtp.resend.com
Port: 465
Username: resend
Password: [COLE_SUA_API_KEY_AQUI]
Sender email: onboarding@resend.dev  (use esse temporariamente)
Sender name: Seu Site
\`\`\`

- **Salve** e teste!

### 4️⃣ (Depois) Configurar domínio próprio
- Resend → **Domains** → Adicione seu domínio
- Configure DNS conforme instruído
- Atualize o "Sender email" no Supabase para `noreply@seudominio.com`

---

**Pronto! Seus emails agora são enviados por um provedor profissional! ✅**

**Próximo passo**: Clique em **Publish** no v0 para fazer deploy! 🚀
