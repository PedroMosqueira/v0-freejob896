#!/bin/bash
cd /vercel/share/v0-project

# Verificar status
echo "[v0] Git status atual:"
git status

# Adicionar todas as mudanças
echo "[v0] Adicionando mudanças..."
git add .

# Criar commit
echo "[v0] Criando commit..."
git commit -m "feat: Implementar autenticação Supabase OAuth com Magic Link

- Remover NextAuth e implementar autenticação nativa do Supabase
- Criar singleton pattern para cliente Supabase (evitar múltiplas instâncias)
- Adicionar suporte para Google OAuth e Magic Link por email
- Criar rota de callback /auth/callback para processar retorno OAuth
- Atualizar hooks useAuth e useNotifications para usar Supabase
- Adicionar debug logs para monitorar estado de autenticação
- Remover imports duplicados que causavam erro de compilação"

# Fazer push
echo "[v0] Fazendo push para o GitHub..."
git push origin v0/pedromosqueira00-7400-254b3d8d

echo "[v0] ✅ Commit e push realizados com sucesso!"
echo "[v0] Agora crie um PR no GitHub para fazer merge em main"
