# Proposal Cleanup Script

Este script limpa e valida os dados das propostas na tabela `need_proposals` do Supabase.

## O que ele faz:

1. **Remove propostas com tipo inválido** - Remove propostas que não são `type: "interest_only"`
2. **Corrige propostas canceladas** - Adiciona `cancelled_at` timestamp para propostas sem
3. **Libera propostas velhas** - Propostas canceladas há mais de 2 horas são automaticamente liberadas
4. **Mostra contagem ativa** - Lista quantas propostas simultâneas cada profissional tem
5. **Valida estrutura** - Verifica que os dados têm os campos corretos

## Como rodar:

```bash
cd /vercel/share/v0-project
node --env-file-if-exists=/vercel/share/.env.project scripts/cleanup-proposals.mjs
```

## Campos esperados em `need_proposals`:

- `id` - UUID único
- `type` - Sempre `"interest_only"` para propostas de interesse
- `status` - `pending`, `viewed`, `accepted`, `completed`, `cancelled`, `released`
- `professional_email` - Email do profissional
- `cancelled_at` - Timestamp quando cancelada (NULL se ativa)
- `viewed_by_requester_at` - Timestamp quando visto (NULL se não visto)

## Se contar estiver errada:

Verifique se essas propostas têm dados inconsistentes:
- Propostas com `status` inválido
- Propostas sem `type` = "interest_only"
- Propostas canceladas sem `cancelled_at`
- Propostas muito velhas que deveriam ter sido liberadas
