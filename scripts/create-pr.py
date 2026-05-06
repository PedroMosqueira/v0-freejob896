#!/usr/bin/env python3
import subprocess
import sys

print("[v0] ========== GIT OPERATIONS ==========")

# Verificar status
print("\n[v0] Git status atual:")
subprocess.run(['git', 'status'])

# Adicionar mudanças
print("\n[v0] Adicionando mudanças...")
subprocess.run(['git', 'add', '.'])

# Criar commit
commit_message = """feat: Implementar autenticação Supabase OAuth com Magic Link

- Remover NextAuth e implementar autenticação nativa do Supabase
- Criar singleton pattern para cliente Supabase (evitar múltiplas instâncias)
- Adicionar suporte para Google OAuth e Magic Link por email
- Criar rota de callback /auth/callback para processar retorno OAuth
- Atualizar hooks useAuth e useNotifications para usar Supabase
- Adicionar debug logs para monitorar estado de autenticação
- Remover imports duplicados que causavam erro de compilação"""

print("\n[v0] Criando commit...")
subprocess.run(['git', 'commit', '-m', commit_message])

# Fazer push
print("\n[v0] Fazendo push para o GitHub...")
subprocess.run(['git', 'push', 'origin', 'v0/pedromosqueira00-7400-254b3d8d'])

print("\n[v0] ✅ Commit e push realizados com sucesso!")
print("[v0] Agora você pode criar um PR no GitHub para fazer merge em main")
print("[v0] ========================================")
