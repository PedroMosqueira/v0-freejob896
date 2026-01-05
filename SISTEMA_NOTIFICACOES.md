# Sistema de Notificações - Freejob

## Eventos que Disparam Notificações

### 1. **Nova Proposta Recebida**
- **Quando**: Um profissional envia uma proposta para um serviço
- **Quem recebe**: Solicitante do serviço
- **Tipo**: `proposal_received`
- **Arquivo**: `lib/needs-store.ts` (função `createProposal`)

### 2. **Proposta Aceita**
- **Quando**: O solicitante aceita uma proposta
- **Quem recebe**: Profissional que enviou a proposta
- **Tipo**: `proposal_accepted`
- **Arquivo**: `lib/needs-store.ts` (função `updateProposalStatus`)

### 3. **Proposta Recusada**
- **Quando**: O solicitante recusa uma proposta
- **Quem recebe**: Profissional que enviou a proposta
- **Tipo**: `proposal_rejected`
- **Arquivo**: `lib/needs-store.ts` (função `updateProposalStatus`)

### 4. **Nova Mensagem no Chat**
- **Quando**: Um usuário envia uma mensagem em um chat
- **Quem recebe**: Outro participante do chat
- **Tipo**: `new_message`
- **Arquivo**: `components/chat-dialog.tsx`

### 5. **Novo Interesse Demonstrado**
- **Quando**: Um usuário demonstra interesse em um serviço
- **Quem recebe**: Solicitante do serviço
- **Tipo**: `interest_shown`
- **Arquivo**: `components/interest-dialog.tsx`

### 6. **Lance (Bid) Enviado**
- **Quando**: Um profissional envia um lance para um serviço
- **Quem recebe**: Solicitante do serviço
- **Tipo**: `bid_received`
- **Arquivo**: `components/send-bid-dialog.tsx`

### 7. **Serviço Criado** (Admin)
- **Quando**: Um novo serviço é criado no sistema
- **Quem recebe**: Administradores
- **Tipo**: `need_created`
- **Arquivo**: `lib/needs-store.ts` (função `createNeed`)

### 8. **Serviço Cancelado**
- **Quando**: Um serviço é cancelado pelo solicitante
- **Quem recebe**: Profissionais que enviaram propostas
- **Tipo**: `need_cancelled`
- **Arquivo**: `lib/needs-store.ts` (função `deleteNeed`)

### 9. **Proposta Atualizada** (Preço/Prazo)
- **Quando**: Um profissional atualiza sua proposta
- **Quem recebe**: Solicitante do serviço
- **Tipo**: `proposal_updated`
- **Arquivo**: `lib/needs-store.ts` (função `updateProposal`)

## Status de Implementação

### ✅ Implementado
- Criação de notificações
- Listagem de notificações
- Contagem de não lidas
- Marcar como lida
- Marcar todas como lidas
- Políticas RLS configuradas

### ⚠️ Pontos de Atenção

1. **Notificações em Tempo Real**: Atualmente as notificações são carregadas quando o componente monta ou quando há uma ação. Para notificações em tempo real, seria necessário:
   - Implementar Supabase Realtime subscriptions
   - Adicionar polling periódico
   - Usar WebSockets

2. **Notificações Push**: Não implementado. Para adicionar:
   - Service Worker para notificações do navegador
   - Permissões de notificação
   - Backend para enviar notificações push

3. **Eventos Faltantes** (sugestões):
   - Avaliação recebida
   - Prazo próximo ao vencimento
   - Novo comentário em serviço
   - Pagamento recebido/confirmado
   - Status de assinatura alterado

## Estrutura da Tabela Notifications

```sql
CREATE TABLE notifications (
  id: uuid (PK)
  user_id: text (email do usuário)
  title: text
  message: text
  type: text
  link: text (opcional)
  is_read: boolean (default: false)
  created_at: timestamp
  updated_at: timestamp
)
```

## Políticas RLS

- **SELECT**: Usuários autenticados podem ler suas próprias notificações (`user_id = auth.email()`)
- **INSERT**: Qualquer usuário autenticado pode criar notificações
- **UPDATE**: Usuários podem atualizar suas próprias notificações
- **DELETE**: Usuários podem deletar suas próprias notificações

## Como Adicionar Nova Notificação

```typescript
import { createNotification } from '@/lib/notifications-client'

await createNotification({
  userId: 'email@usuario.com',
  title: 'Título da Notificação',
  message: 'Mensagem detalhada',
  type: 'tipo_notificacao',
  link: '/caminho/opcional' // opcional
})
```

## Melhorias Recomendadas

1. **Implementar notificações em tempo real** usando Supabase Realtime
2. **Adicionar notificações push** do navegador
3. **Implementar agrupamento** de notificações similares
4. **Adicionar preferências** de notificação por usuário
5. **Implementar notificações por email** para eventos importantes
6. **Adicionar sons** de notificação (opcional)
7. **Histórico de notificações** com paginação
8. **Expiração automática** de notificações antigas
