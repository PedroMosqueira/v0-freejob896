# 🔧 Solução: Erro ao Enviar Email de Confirmação no Cadastro

## ⚠️ Problema Identificado

Quando você tenta cadastrar uma segunda conta, recebe erro ao enviar email de confirmação, mas a primeira conta funcionou normalmente.

## 🔍 Causas Prováveis

### 1. **Rate Limiting do Supabase** (MAIS COMUM)
- Supabase limita a **2 emails por hora** com SMTP padrão
- Se usou o email padrão na primeira, esgotou o limite

**Solução:** Configure um provedor SMTP externo (Resend, SendGrid, etc.)

### 2. **Rate Limiting do Resend** 
- Plano gratuito: **100 emails/dia**
- Se atingiu limite, aguarde até amanhã

**Solução:** Verifique em https://resend.com/overview quantos emails foram enviados

### 3. **Limite de Taxa de Cadastro**
- Supabase pode limitar múltiplos cadastros do mesmo IP/rede

**Solução:** Aguarde alguns minutos antes de tentar novamente

### 4. **Email já Cadastrado**
- Se tentou usar o mesmo email duas vezes

**Solução:** Use um email diferente ou limpe o registro anterior

---

## ✅ Como Resolver

### Passo 1: Verifique o Status da Conta

1. Na página de cadastro, se receber erro, clique em **"Verificar Status da Conta"**
2. Isso mostrará:
   - Se o email existe no sistema
   - Se foi verificado
   - Se pode fazer login

### Passo 2: Limpe o Registro Anterior (se necessário)

Se o status mostrar "Email não verificado", clique em **"🗑️ Limpar registro anterior"**

Isso permite que você tente cadastrar novamente com o mesmo email.

### Passo 3: Reenvie o Email de Verificação

Se o email não chegou, clique em **"Reenviar email"** na tela de confirmação.

### Passo 4: Teste a Configuração de Email

Se ainda não funcionar:

1. Acesse: `/admin/email-diagnostics`
2. Insira um email de teste
3. Clique em "Enviar Email de Teste"
4. Verifique o resultado e a diagnosis

---

## 🛠️ Soluções Permanentes

### Opção A: Configurar Resend (Recomendado)

**Resend é gratuito e profissional:**

1. Crie conta em https://resend.com
2. Gere uma API Key em https://resend.com/api-keys
3. No Supabase Dashboard:
   - Authentication → Email Templates
   - Vá até "SMTP Settings"
   - Ative "Enable Custom SMTP"
   - Configure:
     ```
     Host: smtp.resend.com
     Port: 465
     Username: resend
     Password: [Cole sua API Key aqui]
     Sender email: onboarding@resend.dev
     Sender name: FreeJob Brasil
     ```
4. Salve e teste

**Benefício:** 100 emails/dia gratuitos, emails profissionais

---

### Opção B: Usar SendGrid

**SendGrid oferece mais emails gratuitos:**

1. Crie conta em https://sendgrid.com
2. Gere uma API Key
3. Configure no Supabase com:
   ```
   Host: smtp.sendgrid.net
   Port: 587
   Username: apikey
   Password: [Cole sua API Key aqui]
   Sender email: seu@dominio.com
   ```

**Benefício:** 100 emails/dia gratuitos, mais confiável

---

### Opção C: Aumentar Limite do Supabase

Se está usando SMTP padrão do Supabase:

1. No Supabase Dashboard: Authentication → Email Templates
2. Verifique "SMTP Settings"
3. Se estiver vazio, está usando SMTP padrão
4. Para mais de 2 emails/hora, precisa de um provedor externo

---

## 📊 Diagnóstico Rápido

Execute esta verificação:

1. **Email 1:** [✅ funcionou]
   - Significa que SMTP está ativo

2. **Email 2:** [❌ erro]
   - Verifique o tipo de erro
   - Se "rate limit" → configure provedor externo
   - Se "already registered" → use outro email ou limpe

3. **Teste em `/admin/email-diagnostics`**
   - Se funcionar → problema está no signup
   - Se não funcionar → problema está no SMTP

---

## 🔗 Links Úteis

- **Página de Diagnóstico:** `/admin/email-diagnostics`
- **Resend Dashboard:** https://resend.com/dashboard
- **Resend API Keys:** https://resend.com/api-keys
- **Resend Logs:** https://resend.com/logs
- **Supabase Dashboard:** https://supabase.com/dashboard

---

## 🚨 Se Nada Funcionar

Entre em contato com o suporte incluindo:

1. Qual foi o erro exato que recebeu
2. O resultado do teste em `/admin/email-diagnostics`
3. Quantos emails tentou enviar hoje
4. Se o SMTP está configurado no Supabase
