# Configuração SMTP Resend no Supabase - Passo a Passo

## ⚠️ CONFIGURAÇÕES EXATAS (copie e cole)

### 1. Criar API Key no Resend

**URL:** https://resend.com/api-keys

1. Faça login no Resend
2. Clique em **"API Keys"** no menu lateral
3. Clique em **"Create API Key"**
4. Nome: `Supabase Production`
5. Permissão: **"Sending access"**
6. Clique em **"Add"**
7. **COPIE A API KEY** (ela aparece uma vez só!)
   - Exemplo: `re_123abc456def789ghi`

---

### 2. Configurar SMTP no Supabase Dashboard

**URL:** https://supabase.com/dashboard/project/vcfoodjietokyijrygts/auth/email-templates

**Navegação:**
1. Acesse seu projeto no Supabase
2. Menu lateral: **Authentication**
3. Clique em **Email Templates**
4. Role até o final da página
5. Seção: **"SMTP Settings"**

---

### 3. Preencher os campos EXATAMENTE assim:

\`\`\`
┌─────────────────────────────────────────────┐
│ ☑ Enable Custom SMTP                       │ ← MARQUE ESTA CAIXA!
├─────────────────────────────────────────────┤
│ Sender name:                                │
│ FreeJob Brasil                              │ ← Nome do seu site
├─────────────────────────────────────────────┤
│ Sender email:                               │
│ noreply@freejob.online                      │ ← Seu domínio verificado!
├─────────────────────────────────────────────┤
│ Host:                                       │
│ smtp.resend.com                             │ ← Copie exatamente
├─────────────────────────────────────────────┤
│ Port number:                                │
│ 465                                         │ ← Número apenas, sem espaços
├─────────────────────────────────────────────┤
│ Username:                                   │
│ resend                                      │ ← Copie exatamente (tudo minúsculo)
├─────────────────────────────────────────────┤
│ Password:                                   │
│ re_sua_api_key_aqui                         │ ← Cole a API Key do Resend
└─────────────────────────────────────────────┘
\`\`\`

**Clique em "Save"** no canto inferior direito

---

## ✅ Checklist de Verificação

Antes de testar, confirme:

- [ ] A caixa **"Enable Custom SMTP"** está MARCADA
- [ ] Sender email é exatamente `noreply@freejob.online` (seu domínio verificado)
- [ ] Host é exatamente `smtp.resend.com`
- [ ] Port é o número `465` (não 25, não 587, não 2525)
- [ ] Username é exatamente `resend` (tudo minúsculo)
- [ ] Password é sua API Key do Resend (começa com `re_`)
- [ ] Você clicou em **"Save"** no final

---

## 🧪 Como Testar

### Opção 1: Criar novo usuário
1. Vá para a página de cadastro do seu site
2. Use um email que você tenha acesso
3. Preencha os dados e envie
4. **Verifique sua caixa de entrada** (e spam!)

### Opção 2: Reenviar confirmação (se já criou conta)
No Supabase Dashboard:
1. Authentication → Users
2. Encontre seu usuário
3. Clique nos três pontos (...)
4. "Send confirmation email"

---

## 🔍 Verificar se Funcionou

### No Resend Dashboard:
- Acesse: https://resend.com/emails
- Você deve ver os emails enviados com status:
  - ✅ **"Delivered"** = Funcionou!
  - ⏳ **"Queued"** = Aguardando
  - ❌ **"Failed"** = Erro (veja os detalhes)

### No Supabase Logs:
- Authentication → Logs
- Procure por `mail.send` ou `smtp`
- Status 200 = Enviado com sucesso

---

## 🚨 Erros Comuns

### Erro: "SMTP connection failed"
**Causa:** Configuração incorreta
**Solução:**
- Port está em `465`? (não 25, 587 ou 2525)
- Username é `resend`? (tudo minúsculo)
- API Key está correta?

### Erro: "Authentication failed"
**Causa:** API Key inválida ou expirada
**Solução:**
- Gere uma nova API Key no Resend
- Cole novamente no Supabase
- Salve

### Email não chega na caixa de entrada
**Causa:** Email pode estar no spam ou delay do provedor
**Solução:**
1. Verifique pasta de **SPAM/Lixo Eletrônico**
2. Adicione `onboarding@resend.dev` aos contatos
3. Aguarde 2-5 minutos (delay normal)
4. Verifique no Resend Dashboard se foi "Delivered"

### "Enable Custom SMTP" desmarca sozinho
**Causa:** Erro na configuração impedindo salvar
**Solução:**
1. Preencha TODOS os campos primeiro
2. Depois marque "Enable Custom SMTP"
3. Clique em "Save" imediatamente

---

## 💡 Dica Extra: Email de Teste

Se quiser testar rapidamente sem criar usuário:

1. Supabase Dashboard → Authentication → Users
2. Clique em qualquer usuário
3. Menu (...) → "Send password recovery"
4. Verifique se o email chega

---

## 📞 Ainda não funciona?

Se seguiu todos os passos e ainda não funciona:

1. **Tire um print da tela de configuração SMTP** (sem mostrar a API Key completa)
2. **Verifique os logs** em Supabase → Authentication → Logs
3. **Verifique no Resend** se os emails aparecem como "Failed"

Posso te ajudar a debugar se você me enviar essas informações!

---

## ✨ Próximo Passo

Depois que os emails funcionarem:
- Faça o **Publish** do site no v0
- Seu site estará no ar em `freejob-brasil.vercel.app`
- Tudo funcionando perfeitamente!
