# Como Interpretar os Logs Detalhados do Sistema de Email

## Onde Visualizar os Logs

1. **Abra o navegador** e acesse seu site
2. **Pressione F12** para abrir Developer Tools
3. **Clique na aba "Console"**
4. Procure por mensagens começando com `[v0]`

## Tipos de Logs e O Que Significam

### 1. SIGNUP INICIADO

```
[v0] ========== SIGNUP INICIADO ==========
[v0] Timestamp: 2026-02-15T14:30:45.123Z
[v0] Email: user@example.com
[v0] Password length: 8 caracteres
```

**O que significa:** O formulário de cadastro foi enviado e o servidor começou a processar.

---

### 2. VERIFICAÇÃO DE USUÁRIOS EXISTENTES

```
[v0] ✓ Total de usuários no banco: 5
[v0] ✓ NOVO EMAIL: Nenhum usuário existente com este email
```

**Cenários possíveis:**
- **"NOVO EMAIL"** = Tudo bem, pode prosseguir
- **"Email confirmado"** = Já existe conta ativa, falha
- **"Email PENDENTE"** = Existe conta não confirmada, ofereça reenvio

---

### 3. CHAMADA SUPABASE SIGNUP

```
[v0] Iniciando supabase.auth.signUp()...
```

**O que significa:** Agora o Supabase vai tentar criar o usuário.

---

### 4. SUCESSO NO SIGNUP

```
[v0] ✅ ========== SIGNUP BEM-SUCEDIDO! ==========
[v0] ID do usuário criado: abc123xyz
[v0] Email do usuário: user@example.com
[v0] Email confirmado no momento: false
[v0] Status esperado: PENDENTE (aguardando confirmação por email)
```

**O que significa:** Usuário foi criado com sucesso! Agora o email será enviado.

**IMPORTANTE:** Se você vir isso mas o email não chegou, o problema está no **Resend** ou na **configuração SMTP**.

---

### 5. ERRO: EMAIL DUPLICADO

```
[v0] ✅ Usuário existente encontrado
[v0]   - Email confirmado: true
[v0]   - Data de criação: 2026-02-14T10:00:00Z
[v0] 🔴 TIPO DE ERRO DETECTADO: EMAIL DUPLICADO
[v0] Status 422 = Unprocessable Entity (conflito de dados)
```

**Solução:** Use outro email para registrar.

---

### 6. ERRO: RATE LIMIT

```
[v0] ❌ ========== ERRO NO SIGNUP ==========
[v0] Status HTTP: 429
[v0] Código de erro: rate_limit_exceeded
[v0] 🟡 TIPO: RATE LIMIT
[v0] Possíveis causas:
[v0]   1. Muitos reenvios do mesmo email
[v0]   2. Limite de Resend atingido (100/dia)
[v0]   3. Limite de IP atingido
```

**Solução:** Aguarde 1-2 horas ou tente com outro email.

---

### 7. ERRO: PROBLEMA SMTP/EMAIL

```
[v0] Mensagem de erro: SMTP Error: ...
[v0] ⚙️ TIPO DE ERRO DETECTADO: PROBLEMA SMTP/EMAIL
[v0] Possíveis causas:
[v0]   1. Serviço de email (Resend) fora do ar
[v0]   2. Configuração SMTP incorreta no Supabase
[v0]   3. Email não verificado no Resend
```

**Solução:** Aguarde e tente novamente. Se persistir, contate o suporte.

---

### 8. RESEND EMAIL INICIADO

```
[v0] ========== RESEND EMAIL INICIADO ==========
[v0] Timestamp: 2026-02-15T14:35:20.456Z
[v0] Email para reenvio: user@example.com
[v0] Fazendo chamada REST API: /auth/v1/resend
[v0] ✓ Response recebido do servidor
[v0] Status HTTP: 200
```

**O que significa:** Tentando reenviar o email de confirmação.

---

### 9. RESEND BEM-SUCEDIDO

```
[v0] ✅ ========== RESEND BEM-SUCEDIDO! ==========
[v0] Email reenviado para: user@example.com
[v0] Próximo passo: Usuário deve verificar email de confirmação
```

**O que significa:** Email foi reenviado com sucesso. Aguarde o recebimento.

---

### 10. ERRO: USUÁRIO NÃO ENCONTRADO

```
[v0] ❌ ========== ERRO NO RESEND ==========
[v0] Status HTTP de erro: 404
[v0] Mensagem de erro: User not found
[v0] 🔴 Usuário não encontrado
[v0] Possível causa: Email foi deletado ou nunca foi registrado
```

**Solução:** Registre-se novamente com o email.

---

## Fluxo Esperado (Sem Erros)

Quando tudo funciona normalmente, você deve ver:

```
[v0] ========== SIGNUP INICIADO ==========
[v0] Email: user@example.com
[v0] ✓ NOVO EMAIL: Nenhum usuário existente com este email
[v0] Iniciando supabase.auth.signUp()...
[v0] ✅ ========== SIGNUP BEM-SUCEDIDO! ==========
[v0] Email do usuário: user@example.com
[v0] Status esperado: PENDENTE (aguardando confirmação por email)
```

**Depois:**
- Email deve chegar em 1-5 minutos
- Clique no link de confirmação
- Conta será ativada

---

## Diagnóstico Rápido: O Que Procurar

### Cadastro não funciona?
```
Procure por: ❌ ou 🔴 nos logs
Leia a mensagem e código de erro
Compare com a seção acima
```

### Email não chega?
```
Se vê: ✅ ========== SIGNUP BEM-SUCEDIDO! ==========
Mas o email não chegou:
  → Problema está no Resend/SMTP
  → Verifique Spam
  → Use "Reenviar Email"
```

### Rate limit?
```
Se vê: Status 429 ou "rate_limit_exceeded"
Solução: Aguarde 1-2 horas
```

---

## Passos para Reportar um Erro

1. **Tente fazer o cadastro**
2. **Abra Console (F12)**
3. **Copie TODOS os logs [v0]** da seção de erro
4. **Cole em um arquivo .txt**
5. **Compartilhe com o desenvolvimento**

Exemplo do que copiar:
```
[v0] ========== SIGNUP INICIADO ==========
[v0] Timestamp: 2026-02-15T14:30:45.123Z
[v0] Email: user@example.com
[v0] ✓ Total de usuários no banco: 5
[v0] ❌ ========== ERRO NO SIGNUP ==========
[v0] Mensagem de erro: User already registered
```

---

## Resumo de Status HTTP Comuns

| Código | Significado | Ação |
|--------|-------------|------|
| 200 | Sucesso | Tudo bem! |
| 400 | Dados inválidos | Verifique email/senha |
| 403 | Permissão negada | Problema de configuração |
| 404 | Não encontrado | Usuário não existe |
| 422 | Email duplicado | Use outro email |
| 429 | Rate limit | Aguarde |
| 500 | Erro do servidor | Tente novamente |

---

## Estrutura Geral dos Logs

```
[TIMESTAMP] [v0] [ÍCONE] [MENSAGEM DESCRITIVA]
            └──┬──┘  └─┬─┘ └───────────┬──────────┘
               │       │              └─ O que aconteceu
               │       └─ Indica status (✓✅❌🔴⚠️🟡)
               └─ Identificador v0
```

Todos os logs detalhados agora começam com `[v0]` para fácil filtragem no Console!
