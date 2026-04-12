#!/bin/bash

# Script para fazer commit e push das alterações do card de serviço

cd /vercel/share/v0-project

# Verificar status
echo "Status do repositório:"
git status

# Adicionar todas as mudanças
git add .

# Criar commit com mensagem descritiva
git commit -m "fix: Resolver problema de abertura do card de serviço

- Corrigir import do NeedDetailsDialog em search-requests.tsx (default vs named export)
- Adicionar useAuth() hook para extrair email do usuário autenticado
- Mover guard clause e variáveis derivadas após verificação de currentNeed
- Proteger funções assíncronas com verificações de null
- Corrigir onOpenChange handler em todos os diálogos (send-bid, image-viewer, edit-need, chat, payment, chat-management, my-chats, interest, rating)
- Adicionar null safety para currentNeed com inicialização nullable

Co-authored-by: v0[bot] <v0[bot]@users.noreply.github.com>"

# Fazer push
echo "Enviando para o repositório..."
git push origin card-de-servico-com-problema

echo "Sucesso! Mudanças enviadas para a branch card-de-servico-com-problema"
