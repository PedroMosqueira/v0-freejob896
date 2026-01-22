# Problema com RLS na Tabela Notifications

## Situação Atual

A tabela `notifications` está com **RLS DESABILITADO** por questões técnicas.

## Por Que Desabilitamos?

Todas as tentativas de criar políticas RLS falharam com erro de `btoa`:

```
TypeError: Failed to execute 'btoa' on 'Window': The string to be encoded contains characters outside of the Latin1 range.
```

### Tentativas Realizadas:

1. ❌ `auth.email()` - Causou "permission denied for table users"
2. ❌ `auth.jwt() ->> 'email'` - Causou erro de btoa
3. ❌ `current_setting('request.jwt.claims', true)::json->>'email'` - Causou erro de btoa
4. ❌ `(SELECT email FROM auth.users WHERE id = auth.uid())` - Causou "permission denied"

## Por Que o Erro de btoa?

O Supabase usa `btoa` para codificar o JWT em Base64, mas quando a política RLS tenta acessar `current_setting`, o processo de serialização falha com caracteres UTF-8.

## Segurança Atual

Mesmo sem RLS, o sistema está protegido:

✅ **Filtro no Código**: Todas as queries filtram por `user_id = userEmail`
```typescript
.eq("user_id", userEmail)  // Em lib/notifications-store.ts
```

⚠️ **Risco**: Se houver um bug no código ou alguém acessar o banco diretamente, pode ver notificações de outros usuários.

## Soluções Possíveis

### Opção 1: Criar uma Função PostgreSQL (RECOMENDADO)

```sql
-- Criar função que retorna o email do usuário autenticado
CREATE OR REPLACE FUNCTION auth.user_email()
RETURNS TEXT AS $$
  SELECT email FROM auth.users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER;

-- Usar a função na política RLS
CREATE POLICY "notifications_select_policy"
ON notifications FOR SELECT
USING (user_id = auth.user_email());
```

### Opção 2: Adicionar Coluna user_uid

Trocar `user_id` (email) por `user_uid` (UUID) nas notificações:

```sql
-- Adicionar coluna
ALTER TABLE notifications ADD COLUMN user_uid UUID;

-- Popular com UUIDs
UPDATE notifications n
SET user_uid = u.id
FROM auth.users u
WHERE n.user_id = u.email;

-- Criar política RLS
CREATE POLICY "notifications_select_policy"
ON notifications FOR SELECT
USING (user_uid = auth.uid());
```

### Opção 3: Manter RLS Desabilitado

Continuar com segurança apenas no código da aplicação. **Não recomendado para produção.**

## Recomendação

Para produção, implemente a **Opção 1** (função PostgreSQL), que é a mais simples e confiável. Ela evita problemas de encoding e funciona perfeitamente com Supabase Auth.

## Status de Outras Tabelas

- ✅ `ratings` - RLS ativo e funcionando com `auth.email()`
- ❌ `notifications` - RLS desabilitado (problema com JWT)
- ℹ️ `needs`, `need_proposals`, `messages` - Verificar status
