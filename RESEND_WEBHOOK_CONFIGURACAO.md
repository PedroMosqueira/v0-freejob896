# Configuração de Webhook do Resend - Logs Detalhados

## O Problema: Logs Sem Detalhes

Atualmente, os logs do Resend Dashboard mostram apenas:
- ❌ "Email sent"
- ❌ "Failed"
- ❌ "Bounced"

Mas **NÃO** dizem por quê!

## A Solução: Webhooks com Logs Estruturados

Vamos usar webhooks do Resend para capturar cada evento e registrá-lo com TODOS os detalhes em seus logs do servidor.

## Passo 1: Deploy da Aplicação

Primeiro, você precisa fazer deploy para que o webhook funcione (local não recebe webhooks):

```bash
# No v0, clique em "Publish" para fazer deploy no Vercel
```

Seu webhook estará em:
```
https://seu-dominio.vercel.app/api/resend-webhook
```

## Passo 2: Configurar Webhook no Resend

1. Acesse: **https://resend.com/api-keys**
2. Clique na API Key que você usa
3. Role até **"Webhooks"**
4. Clique em **"Add webhook"**
5. Cole a URL: `https://seu-dominio.vercel.app/api/resend-webhook`
6. Selecione os eventos:
   - ✅ Email sent
   - ✅ Email delivered
   - ✅ Email bounced
   - ✅ Email complained
   - ✅ Email failed
   - ✅ Email opened
   - ✅ Email clicked
7. Clique em **"Create webhook"**

## Passo 3: Testar o Webhook

Para testar, o Resend oferece um botão **"Send test event"** (será adicionado em breve).

Ou você pode testar manualmente criando uma nova conta e vendo os logs.

## Tipos de Eventos que Você Verá Agora

### 1. Email Enviado com Sucesso
```
[v0] ========== WEBHOOK RESEND RECEBIDO ==========
[v0] Tipo de evento: email.sent
[v0] Para: usuario@email.com
[v0] ✅ EMAIL ENVIADO COM SUCESSO
[v0] Email foi aceito pelo provedor de email
```

### 2. Email Entregue
```
[v0] Tipo de evento: email.delivered
[v0] 📬 EMAIL ENTREGUE
[v0] Email chegou na caixa de entrada do destinatário
```

### 3. Email Rejeitado (Bounce)
```
[v0] Tipo de evento: email.bounced
[v0] Para: usuario@email.com
[v0] ⚠️ EMAIL REJEITADO (BOUNCE)
[v0] Razão: Invalid email address
[v0] Possíveis motivos:
[v0]   - Email de destino não existe
[v0]   - Domínio de destino não existe
[v0]   - Servidor de destino rejeitou temporariamente
[v0]   - Email está na lista negra
```

### 4. Email Marcado como Spam
```
[v0] Tipo de evento: email.complained
[v0] 🚨 EMAIL MARCADO COMO SPAM
[v0] Destinatário marcou como spam/reclamação
```

### 5. Falha ao Enviar
```
[v0] Tipo de evento: email.failed
[v0] ❌ FALHA NO ENVIO DO EMAIL
[v0] Razão: Rate limit exceeded
[v0] Possíveis motivos:
[v0]   - Erro temporário no Resend
[v0]   - Serviço de email indisponível
[v0]   - Limite de taxa atingido
[v0]   - Configuração SMTP incorreta
```

### 6. Email Aberto
```
[v0] Tipo de evento: email.opened
[v0] 👁️ EMAIL ABERTO
[v0] Destinatário abriu o email
```

### 7. Link Clicado
```
[v0] Tipo de evento: email.clicked
[v0] 🖱️ LINK CLICADO
[v0] Destinatário clicou em um link no email
```

## Onde Ver os Logs

### Opção 1: Dashboard do Vercel
1. Acesse: **https://vercel.com/dashboard**
2. Selecione seu projeto
3. Vá para **"Logs"** ou **"Functions"**
4. Procure por eventos recentes do webhook

### Opção 2: Ferramentas de Monitoramento
- Use **Sentry**, **LogRocket**, ou **Better Stack** para capturar logs
- Configure integração do seu projeto para receber notificações

### Opção 3: Banco de Dados
O webhook também tenta salvar os eventos em uma tabela `email_events` se você configurar:

```sql
CREATE TABLE email_events (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  event_type VARCHAR(50),
  status VARCHAR(20),
  details TEXT,
  created_at TIMESTAMP,
  recorded_at TIMESTAMP DEFAULT NOW()
);
```

## Fluxo Completo de Diagnóstico

### Quando um Email de Cadastro Falha:

1. **Usuário tenta cadastro** → envia email
2. **Supabase cria usuário** → marca como "pending confirmation"
3. **Supabase chama Resend** → tenta enviar email
4. **Resend valida e tenta enviar** → pode falhar aqui
5. **Webhook registra o resultado** → você vê logs detalhados

### Exemplo de Fluxo Bem-Sucedido:

```
Tempo 00:00 → [user.signup] Usuário@email.com tenta cadastro
Tempo 00:01 → [email.sent] ✅ Email enviado ao Resend
Tempo 00:02 → [email.delivered] 📬 Email chegou na caixa
Tempo 00:05 → [email.opened] 👁️ Usuário abriu o email
Tempo 00:06 → [email.clicked] 🖱️ Usuário clicou no link de confirmação
Tempo 00:07 → [user.confirmed] ✅ Conta confirmada com sucesso
```

### Exemplo de Fluxo com Falha:

```
Tempo 00:00 → [user.signup] Usuario@email.com tenta cadastro
Tempo 00:01 → [email.sent] ✅ Email enviado ao Resend
Tempo 00:02 → [email.failed] ❌ FALHA: Rate limit exceeded
             → Você vê exatamente qual é o problema!
             → Ação: Aguardar ou fazer upgrade
```

## Possíveis Erros e Soluções

| Erro | Causa | Solução |
|------|-------|---------|
| `Rate limit exceeded` | 100 emails/dia atingido | Aguardar 24h ou fazer upgrade |
| `Invalid email address` | Email inválido ou não existe | Validar formato antes de enviar |
| `Domain not verified` | Domínio customizado não verificado | Verificar DNS no Resend |
| `API key invalid` | Chave expirou ou foi revogada | Gerar nova API Key |
| `SMTP error` | Configuração SMTP incorreta | Revisar credenciais no Supabase |

## Próximas Ações

1. **Agora**: Faça deploy clicando em "Publish"
2. **Depois**: Configure o webhook conforme instruções acima
3. **Teste**: Tente criar uma nova conta e verifique os logs
4. **Analise**: Procure por mensagens `[v0]` no Vercel Dashboard → Logs

## Verificação

Para confirmar que o webhook está funcionando:

1. Crie uma conta de teste
2. Acesse Vercel Dashboard → Seu Projeto → Logs
3. Procure por "WEBHOOK RESEND RECEBIDO"
4. Se ver, webhook está funcionando!

Se não ver, verifique:
- ✅ Webhook URL está correta
- ✅ Eventos estão selecionados
- ✅ API Key do Resend está ativa
- ✅ Deploy foi feito (não está em localhost)
