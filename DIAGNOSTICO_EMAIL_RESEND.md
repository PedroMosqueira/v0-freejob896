# Diagnóstico - Email Não Chegando

## Problema Identificado

O Supabase registra o cadastro com sucesso, mas o email não é enviado pelo SMTP Resend.

## Verificações Necessárias

### 1. Verificar API Key do Resend

**No Dashboard do Resend (resend.com):**

1. Acesse: https://resend.com/api-keys
2. Verifique se a API Key que você usou está:
   - ✅ Ativa (não revogada)
   - ✅ Com permissão "Sending access"
   - ✅ Sem restrições de domínio

**Se a API Key tiver problema:**
- Crie uma nova API Key
- Copie a chave COMPLETA
- Atualize no Supabase Dashboard

### 2. Verificar Rate Limits do Resend

**No Dashboard do Resend:**

1. Vá para: https://resend.com/overview
2. Verifique:
   - Quantos emails foram enviados hoje
   - Se atingiu o limite do plano (100/dia no gratuito)

**Se atingiu o limite:**
- Aguarde até amanhã para resetar
- OU faça upgrade do plano

### 3. Verificar Logs do Resend

**No Dashboard do Resend:**

1. Acesse: https://resend.com/logs
2. Procure por tentativas de envio recentes
3. Veja se há erros como:
   - "API key invalid"
   - "Rate limit exceeded"
   - "Domain not verified"

### 4. Testar Configuração SMTP

**Passo a passo:**

1. No Supabase Dashboard:
   - Authentication → Email Templates
   - Clique em "Test SMTP Configuration"
   - Envie um email de teste para você

2. Se o email de teste **não chegar**:
   - Problema é na configuração SMTP
   - Verifique API Key, host, porta

3. Se o email de teste **chegar**:
   - Problema pode ser no código da aplicação
   - Verifique se o redirect URL está correto

## Solução Rápida (Temporária)

Enquanto investiga, você pode **DESABILITAR** a confirmação de email:

**No Supabase Dashboard:**

1. Authentication → Providers → Email
2. **DESATIVE**: "Confirm email"
3. Salve

**⚠️ ATENÇÃO:** Isso permite que usuários façam login sem confirmar email. Use apenas para testes!

## Solução Alternativa - Usar Provedor Padrão do Supabase

Se o Resend não funcionar, você pode voltar temporariamente ao provedor padrão:

**No Supabase Dashboard:**

1. Authentication → Email Templates
2. SMTP Settings
3. **DESATIVE**: "Enable custom SMTP"
4. Salve

**Limitações:**
- Apenas 2 emails por hora
- Apenas para endereços autorizados no projeto
- Não adequado para produção

## Solução Definitiva - Reconfigurar Resend

### Passo 1: Criar Nova API Key

1. https://resend.com/api-keys
2. "Create API Key"
3. Nome: "Supabase Production"
4. Permissão: "Sending access" + "Full access"
5. Copie a chave COMPLETA (começa com `re_`)

### Passo 2: Reconfigurar no Supabase

1. Supabase Dashboard → Authentication → Email Templates
2. SMTP Settings:
   \`\`\`
   Enable custom SMTP: ✅
   Sender email: onboarding@resend.dev
   Sender name: FreeJob Brasil
   Host: smtp.resend.com
   Port number: 465
   Username: resend
   Password: [COLE A NOVA API KEY AQUI]
   \`\`\`
3. Salve
4. Clique em "Send test email"

### Passo 3: Testar

1. Tente criar uma nova conta
2. Verifique:
   - Caixa de entrada
   - Spam
   - Logs do Resend

## Checklist de Verificação

Marque conforme verifica:

- [ ] API Key do Resend está ativa e válida
- [ ] Rate limit não foi atingido (< 100 emails/dia)
- [ ] Porta SMTP é 465 (não 587 ou 25)
- [ ] Username é exatamente "resend"
- [ ] Password é a API Key completa
- [ ] Sender email é "onboarding@resend.dev"
- [ ] "Enable custom SMTP" está marcado
- [ ] Email de teste do Supabase funciona
- [ ] Verificou pasta de spam
- [ ] Logs do Resend mostram envios

## Se Nada Funcionar

**Opção 1:** Desabilite temporariamente a confirmação de email
**Opção 2:** Use outro provedor SMTP (SendGrid, Mailgun, AWS SES)
**Opção 3:** Configure domínio próprio no Resend

## Próximos Passos

1. Siga o checklist acima
2. Teste criar uma nova conta
3. Me avise qual foi o resultado para ajudar mais
