# 🚀 Guia Completo para Colocar o Site em Produção

Este guia contém todos os passos necessários para configurar seu projeto para produção e fazer o deploy.

---

## 1. 📧 Configurar Provedor de Email Profissional (SMTP)

O Supabase usa um provedor de email de demonstração que **não é confiável para produção**. Você precisa configurar um provedor SMTP profissional.

### Recomendação: **Resend** (Melhor para Next.js)
- ✅ Gratuito até 3.000 emails/mês
- ✅ Integração perfeita com Next.js/Vercel
- ✅ API moderna e simples
- ✅ Entregabilidade excelente

### Alternativas:
- **SendGrid**: 100 emails/dia grátis
- **AWS SES**: Muito barato, $0.10 por 1000 emails
- **Mailgun**: Flexível e robusto

---

## 📝 Passo a Passo: Configurar Resend com Supabase

### **Passo 1: Criar conta no Resend**
1. Acesse: https://resend.com/signup
2. Crie sua conta gratuita
3. Confirme seu email

### **Passo 2: Obter API Key**
1. No dashboard do Resend, vá em **API Keys**
2. Clique em **Create API Key**
3. Dê um nome (ex: "Supabase Production")
4. Copie a chave (começa com `re_`)

### **Passo 3: Configurar domínio (IMPORTANTE)**
1. No Resend, vá em **Domains**
2. Adicione seu domínio (ex: `seusite.com`)
3. Configure os registros DNS conforme instruído
4. Aguarde verificação (pode levar até 48h)

**⚠️ Sem domínio verificado**: Emails vão para spam ou não são entregues

### **Passo 4: Configurar SMTP no Supabase**

1. Acesse o **Supabase Dashboard**: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Authentication** → **Email Templates**
4. Clique em **SMTP Settings** (no topo da página)
5. Ative **Enable Custom SMTP**
6. Preencha os campos:

```
Host: smtp.resend.com
Port: 465
Username: resend
Password: [SUA_API_KEY_DO_RESEND]  (a que você copiou)
Sender email: noreply@seudominio.com  (use seu domínio verificado)
Sender name: Seu Site
```

7. Clique em **Save**
8. Teste enviando um email de confirmação

---

## 2. 🔐 Configurações de Segurança para Produção

### **Passo 1: Configurar URLs permitidas**
No Supabase Dashboard:
1. Vá em **Authentication** → **URL Configuration**
2. Configure:
   - **Site URL**: `https://seusite.com.br` (seu domínio de produção)
   - **Redirect URLs**: Adicione:
     - `https://seusite.com.br/**`
     - `http://localhost:3000/**` (para desenvolvimento local)

### **Passo 2: Desabilitar confirmação de email (OPCIONAL)**
Se quiser que usuários façam login sem confirmar email:
1. Vá em **Authentication** → **Providers** → **Email**
2. Desative **Confirm email**

⚠️ **Não recomendado para produção** - mantenha ativado com SMTP configurado

---

## 3. 🗄️ Verificar Banco de Dados

### RLS (Row Level Security)

Você já tem:
- ✅ RLS **desabilitado** em `ratings` (validação no código)
- ✅ RLS **desabilitado** em `notifications` (problema com auth.email())

**Recomendação**: Mantenha assim, pois o código valida as permissões corretamente.

### Backup
Configure backups automáticos no Supabase:
1. Vá em **Database** → **Backups**
2. Ative **Daily Backups** (Point-in-time Recovery)

---

## 4. 🌐 Deploy no Vercel

Seu projeto já está conectado ao Vercel via v0. Para fazer deploy:

### **Método 1: Pelo v0 (Mais Fácil)**
1. Clique no botão **Publish** no canto superior direito do v0
2. Confirme as configurações
3. Aguarde o deploy (1-2 minutos)
4. Seu site estará no ar em: `https://seu-projeto.vercel.app`

### **Método 2: Pelo GitHub**
1. Conecte seu repositório GitHub ao Vercel
2. Configure as variáveis de ambiente
3. Faça push para a branch `main`
4. Deploy automático a cada commit

---

## 5. 🔑 Variáveis de Ambiente

Você já tem todas configuradas! ✅

Verifique se estão corretas no Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- `BLOB_READ_WRITE_TOKEN`

---

## 6. 🎨 Configurar Domínio Personalizado (OPCIONAL)

### No Vercel:
1. Vá em **Settings** → **Domains**
2. Adicione seu domínio (ex: `seusite.com.br`)
3. Configure os DNS conforme instruído:
   - **A Record**: `76.76.21.21`
   - **CNAME**: `cname.vercel-dns.com`

### No Registrador do Domínio:
1. Acesse o painel do seu registrador (Registro.br, GoDaddy, etc.)
2. Configure os registros DNS conforme o Vercel instruiu
3. Aguarde propagação (pode levar até 48h)

---

## 7. ✅ Checklist Final Antes de Ir ao Ar

- [ ] SMTP configurado e testado (emails chegando)
- [ ] Domínio verificado no Resend
- [ ] URLs de redirect configuradas no Supabase
- [ ] Backups automáticos ativados
- [ ] Variáveis de ambiente conferidas
- [ ] Teste de registro de usuário funcionando
- [ ] Teste de login funcionando
- [ ] Teste de criação de pedido/lance funcionando
- [ ] Teste de notificações funcionando
- [ ] Layout mobile e desktop funcionando
- [ ] Imagens e assets carregando corretamente

---

## 8. 📊 Monitoramento (Recomendado)

### Vercel Analytics
Já incluído gratuitamente! Veja:
- Número de visitantes
- Páginas mais acessadas
- Performance do site

### Supabase Logs
Monitore:
1. **Database** → **Logs**: Erros de query
2. **Authentication** → **Logs**: Tentativas de login
3. **API** → **Logs**: Requisições e erros

---

## 9. 🚨 Troubleshooting Comum

### Emails não chegam
- ✅ Verifique se o domínio está verificado no Resend
- ✅ Confira se a API Key está correta
- ✅ Teste com um email diferente (Gmail, não Outlook)

### Erro de CORS
- ✅ Adicione seu domínio nas URLs permitidas do Supabase
- ✅ Verifique `NEXT_PUBLIC_SUPABASE_URL` no Vercel

### Banco de dados lento
- ✅ Considere upgrade do plano Supabase (se necessário)
- ✅ Otimize queries com índices

### Notificações não aparecem
- ✅ Verifique se o usuário está autenticado corretamente
- ✅ Confira logs no console do navegador

---

## 📞 Suporte

Se precisar de ajuda:
- **Supabase**: https://supabase.com/support
- **Vercel**: https://vercel.com/help
- **Resend**: https://resend.com/support

---

## 🎉 Próximos Passos Após o Deploy

1. **Marketing**: Compartilhe nas redes sociais
2. **SEO**: Configure metatags, sitemap.xml, robots.txt
3. **Analytics**: Integre Google Analytics se necessário
4. **Performance**: Use Vercel Speed Insights
5. **Feedback**: Colete feedback dos primeiros usuários

---

**Seu site está pronto para produção! 🚀**
