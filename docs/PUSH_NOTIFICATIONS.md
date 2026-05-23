# Push Notifications Setup Guide

## Overview

O app agora suporta **Web Push Notifications** usando o Web Push Protocol padrão. Usuários podem receber notificações em tempo real quando novos eventos acontecem (novo interesse, mensagem, conclusão de trabalho, etc.).

## Setup Steps

### 1. Gerar VAPID Keys

Execute este comando para gerar as chaves VAPID necessárias:

```bash
cd /vercel/share/v0-project
npx web-push generate-vapid-keys
```

Você receberá algo como:

```
Public Key: BG...
Private Key: t...
```

### 2. Configurar Environment Variables

Adicione as variáveis no Vercel Project Settings (Settings → Vars):

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BG...
VAPID_PRIVATE_KEY=t...
VAPID_SUBJECT=mailto:seu-email@freejob.online
```

**Importante:**
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`: Pode ser pública (prefixado com NEXT_PUBLIC_)
- `VAPID_PRIVATE_KEY`: Deve ser PRIVADA (não expor)
- `VAPID_SUBJECT`: Email de contato para o serviço de push

### 3. Criar Tabela no Banco de Dados

Execute o SQL abaixo no Supabase SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  auth TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_email ON push_subscriptions(user_email);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own push subscriptions"
  ON push_subscriptions
  FOR SELECT
  USING (auth.email() = user_email);

CREATE POLICY "Users can insert their own push subscriptions"
  ON push_subscriptions
  FOR INSERT
  WITH CHECK (auth.email() = user_email);

CREATE POLICY "Users can delete their own push subscriptions"
  ON push_subscriptions
  FOR DELETE
  USING (auth.email() = user_email);
```

## Como Usar

### Para Usuários

Usuários podem ativar notificações push abrindo as configurações e clicando no botão "Habilitar Notificações Push". Eles verão um prompt do navegador solicitando permissão.

### Para Desenvolvedores

#### Usar o Hook usePushNotifications

```tsx
import { usePushNotifications } from "@/hooks/use-push-notifications"

export function MyComponent() {
  const { isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications()

  return (
    <button onClick={isSubscribed ? unsubscribe : subscribe} disabled={isLoading}>
      {isLoading ? "Carregando..." : isSubscribed ? "Desabilitar" : "Habilitar"} Notificações
    </button>
  )
}
```

#### Enviar Push Manualmente

```typescript
import { sendPushToUser } from "@/lib/push-notifications-server"

// Em um endpoint API ou ação de servidor
await sendPushToUser("user@example.com", {
  title: "Novo interesse!",
  body: "João manifestou interesse em seu serviço",
  data: {
    needId: "123",
  },
})
```

## Arquitetura

### Client-Side
- **Service Worker** (`public/sw.js`): Recebe e exibe push notifications
- **Hook** (`hooks/use-push-notifications.ts`): Gerencia subscrição/desinscrição
- **Utilities** (`lib/push-notifications-client.ts`): Registra service worker, cria subscriptions

### Server-Side
- **API Endpoints**:
  - `POST /api/push/subscribe`: Salva subscription do usuário
  - `POST /api/push/unsubscribe`: Remove subscription do usuário
  - `POST /api/push/send`: Envia push para todas as subscriptions de um usuário
- **Utilities** (`lib/push-notifications-server.ts`): Gerencia VAPID keys, envia pushes
- **Database**: Tabela `push_subscriptions` armazena endpoints e credenciais

### Integration
- Quando uma notificação é criada em `/api/notifications/create`, o sistema automaticamente envia push para o usuário se ele tiver subscriptions ativas.

## Troubleshooting

### "Service Worker not registering"
- Certifique-se de que `public/sw.js` existe
- Verificar console do navegador para erros
- Service Workers só funcionam em HTTPS (ou localhost)

### "Push not received"
- Verificar se o usuário concedeu permissão no navegador
- Verificar Supabase se `push_subscriptions` tem entradas para o usuário
- Verificar server logs para erros em `/api/push/send`

### "VAPID keys not configured"
- Verificar se variáveis de ambiente estão configuradas no Vercel
- Depois de adicionar, fazer deploy novamente
- Verificar logs: "[v0] Push notifications not configured"

## Testing

Para testar em desenvolvimento:

```bash
# 1. Certifique-se de ter VAPID keys configuradas em .env.local
# 2. Rodando em HTTPS local (usando mkcert ou similar)
# 3. Abrir app no navegador
# 4. Ativar notificações
# 5. Criar uma notificação e verificar push
```

## Referências

- [Web Push Protocol](https://tools.ietf.org/html/draft-thomson-webpush-protocol)
- [Service Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Notification API](https://developer.mozilla.org/en-US/docs/Web/API/Notification)
