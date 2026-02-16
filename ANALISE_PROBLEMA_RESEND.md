# Análise: Por Que o Resend Pode Estar Bloqueando Cadastros

## O Problema que Você Reportou

1. Primeiro email de cadastro: Mostrou "enviado com sucesso", mas email nunca chegou
2. Supabase registra como "pending confirmation" 
3. Tentativas posteriores: Mostram erro na tela

## Sim! O Resend Guarda Histórico e Faz Validações

O Resend (e qualquer provedor SMTP) tem DUAS camadas de validação:

### Camada 1: Validação de Envio
Quando você tenta enviar um email, o Resend verifica:
- ✅ É um email válido? (formato correto)
- ✅ O domínio existe? (MX records)
- ✅ Não está na lista de bloqueio? (globais ou do seu domínio)
- ✅ Rate limit não foi atingido? (limite de emails por hora/dia)

### Camada 2: Cache/Histórico
O Resend mantém:
- **Log de tentativas**: Qual email, horário, resultado
- **Bounce list**: Emails que voltam (não existe, inválido, etc)
- **Complaint list**: Emails que marcaram como spam
- **Rate limit counter**: Quantos emails foram enviados hoje

---

## Cenários de Erro - Por Que as Tentativas Falhavam

### Cenário 1: Email Nunca Saiu do Resend
```
1. Você cadastra: email@teste.com
2. Resend recebe: "enviar confirmação para email@teste.com"
3. Resend valida:
   - Email válido? ✅
   - Rate limit? ⚠️ ATINGIDO (100 emails gratuitos por dia)
4. Resultado: Email NÃO é enviado
5. Mas Supabase pensa: "Ok, o usuário foi criado, email será enviado"
6. Supabase marca: "pending confirmation"
```

### Cenário 2: Email Chegou em Spam
```
1. Email foi enviado ✅
2. Mas chegou em SPAM do destinatário
3. Você não viu ❌
4. Supabase continua aguardando confirmação
5. Próxima tentativa: "Email já cadastrado" ⚠️
```

### Cenário 3: Domínio Padrão do Resend
```
1. Você usa: onboarding@resend.dev (padrão temporário)
2. Muitos provedores bloqueiam este domínio ⚠️
3. Gmail/Outlook/Yahoo podem filtrar automaticamente
4. Emails saem, mas não chegam (silent drop)
```

### Cenário 4: API Key Revogada/Inválida
```
1. Supabase tenta enviar com a API Key
2. API Key estava OK, mas depois foi revogada
3. Resend nega: "API Key inválida"
4. Email não sai
5. Próximas tentativas: Mesmo erro "email já cadastrado"
```

---

## Sinais de Que é Problema do Resend

Verifique no **Dashboard do Resend** (https://resend.com):

### Sinal 1: Logs Vazios
```
Resend → Logs
- Se não há tentativa de envio registrada
- Significa: Email não chegou ao Resend
- Causa: Problema na configuração SMTP do Supabase
```

### Sinal 2: Muitos Erros 4xx
```
Resend → Logs
- Status 400/401/403
- Significa: API Key inválida ou expirada
- Solução: Gerar nova API Key
```

### Sinal 3: Mensagem "Bounced"
```
Resend → Logs
- Status "Bounced" ou "Failed"
- Significa: Email saiu mas voltou (endereço inválido)
- Causa: Email de teste inválido ou bloqueado
```

### Sinal 4: Rate Limited
```
Resend → Overview
- "100 of 100 emails sent today"
- Significa: Limite diário atingido
- Solução: Aguardar até amanhã ou fazer upgrade
```

---

## Verificações Que Você Deve Fazer AGORA

### Verificação 1: Status do Resend
```bash
Acesse: https://resend.com/overview

Procure por:
- Total de emails enviados hoje (vs limite)
- Se há erros recentes
- Data/hora do último envio bem-sucedido
```

### Verificação 2: Histórico de Tentativas
```bash
Acesse: https://resend.com/logs

Procure por:
- Seu email de teste
- Status (Delivered, Bounced, Failed)
- Motivo do erro (se houver)
```

### Verificação 3: API Keys
```bash
Acesse: https://resend.com/api-keys

Procure por:
- API Keys ativas (não revogadas)
- Permissões corretas ("Sending access")
- Se há restrições de domínio
```

### Verificação 4: Testar Configuração do Supabase
```bash
# Use este endpoint para testar:
POST /api/health/email-config
Content-Type: application/json

{
  "email": "seuemail@teste.com",
  "testType": "resend"
}

# Se receber erro: veja a mensagem exata
# Se receber sucesso: email foi enviado pelo Resend
```

---

## Solução Rápida - Se Descobrir o Problema

### Se for Rate Limit:
```
- Aguarde até amanhã (reset automático à 00h UTC)
- OU faça upgrade da conta Resend
```

### Se for API Key Inválida:
```
1. Acesse https://resend.com/api-keys
2. Delete a chave atual
3. Crie uma nova chave
4. Atualize no Supabase (Authentication → Email Templates → SMTP Settings)
5. Teste
```

### Se for Domínio Padrão Bloqueado:
```
1. Opção A: Configure seu domínio próprio no Resend
   - Resend → Domains → Add Domain
   - Siga os passos de verificação DNS

2. Opção B: Use outro provedor (SendGrid, Mailgun)
   - SendGrid é mais confiável
   - Mailgun tem mais controle
```

### Se for Email Pendente não Confirmado:
```
1. Novo email de cadastro NÃO será processado
2. Opções:
   A) Aguardar confirmação do email anterior
   B) Usar endpoint para limpar (você tem isso no código)
   C) Usar email diferente
```

---

## Por Que Acontece Isso?

### Supabase cria usuário ANTES de enviar email

```
Fluxo Supabase:
1. Validar dados (email, senha)
2. CRIAR USUÁRIO no banco
3. TENTAR ENVIAR email
4. Se email falhar, usuário continua criado
5. Status: "pending confirmation"
```

### Resend valida ANTES de enviar

```
Fluxo Resend:
1. Receber requisição de envio
2. Validar: API Key, rate limit, domínio, email
3. Se alguma validação falhar: RECUSA o envio
4. Mantém log de todos os bloqueios
```

### Resultado: Email em limbo

```
Status do Supabase: "pending confirmation"
Status do Resend: "nunca tentei enviar"
                OU "tentei e foi rejeitado"
                OU "enviei mas foi para spam"
```

---

## Ferramenta de Diagnóstico Implementada

Você tem um endpoint já pronto para diagnosticar:

```bash
GET /api/health/email-config
# Verifica se variáveis de ambiente estão OK

POST /api/health/email-config
# Testa o envio real e retorna diagnóstico automático
```

**Este endpoint dirá exatamente qual é o problema!**

---

## Próximas Ações

1. **Hoje**: Acesse https://resend.com e verifique logs/quotas
2. **Hoje**: Use `POST /api/health/email-config` para testar
3. **Depois**: Corrija conforme o diagnóstico revelar
4. **Se problema persistir**: Me avise o resultado do teste!

---

## TL;DR (Resumo Rápido)

**Sim, Resend guarda histórico e faz validações.**

**Seu problema provavelmente é:**
- Rate limit atingido (100 emails/dia no plano grátis)
- OU API Key inválida
- OU Email em spam
- OU Domínio padrão bloqueado (onboarding@resend.dev)

**Para descobrir**: Acesse https://resend.com/logs e procure por seu email
