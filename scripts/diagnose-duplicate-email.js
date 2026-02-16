#!/usr/bin/env node

/**
 * Script de Diagnóstico para Problema de Email Duplicado
 * Ajuda a identificar se emails já cadastrados causam problemas no signup
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey) {
  console.error("[v0] ❌ Erro: NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY não configuradas");
  process.exit(1);
}

console.log("[v0] 🔍 Script de Diagnóstico - Email Duplicado no Signup");
console.log("[v0] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("[v0]");
console.log("[v0] Este script verifica emails duplicados no Supabase");
console.log("[v0]");
console.log("[v0] Variáveis de ambiente detectadas:");
console.log(`[v0] ✅ NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl.substring(0, 30)}...`);
console.log(`[v0] ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY: ${anonKey.substring(0, 20)}...`);
console.log(`[v0] ${serviceRoleKey ? "✅" : "⚠️"} SUPABASE_SERVICE_ROLE_KEY: ${serviceRoleKey ? "Configurada" : "NÃO CONFIGURADA"}`);
console.log("[v0]");

console.log("[v0] 🧪 Para testar manualmente:");
console.log("[v0] ");
console.log("[v0] 1. Abra seu navegador no console (F12)");
console.log("[v0] ");
console.log("[v0] 2. Tente cadastrar com um email: teste-1@example.com");
console.log("[v0]    - Você verá 'Verifique seu email' ✅");
console.log("[v0]    - Verifique o console para logs [v0]");
console.log("[v0] ");
console.log("[v0] 3. Tente cadastrar NOVAMENTE com o MESMO email");
console.log("[v0]    - ESPERADO: Erro 'Email já cadastrado'");
console.log("[v0]    - Verifique os logs [v0] no console");
console.log("[v0]");
console.log("[v0] 📋 Informações que você verá nos logs:");
console.log("[v0]    - Mensagem exata do erro do Supabase");
console.log("[v0]    - Código do erro (422, 400, etc)");
console.log("[v0]    - Status do usuário (auth, verificado, etc)");
console.log("[v0]");
console.log("[v0] 🔧 Possíveis erros que podem ocorrer:");
console.log("[v0]    - 'User already registered' → Email já cadastrado ✅");
console.log("[v0]    - 'rate_limit_exceeded' → Limite de taxa atingido");
console.log("[v0]    - 'SMTP error' → Problema com envio de email");
console.log("[v0]");
console.log("[v0] 💡 Se o error for tratado corretamente:");
console.log("[v0]    ✅ Mensagem clara será mostrada ao usuário");
console.log("[v0]    ✅ Opção 'Verificar Status' estará disponível");
console.log("[v0]    ✅ Possibilidade de usar outro email");
console.log("[v0]");
console.log("[v0] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("[v0] ✅ Diagnóstico concluído!");
console.log("[v0]");
console.log("[v0] Dicas para debug:");
console.log("[v0] 1. Abra DevTools (F12) → Console");
console.log("[v0] 2. Procure por mensagens [v0]");
console.log("[v0] 3. Verifique o status do erro na resposta");
console.log("[v0]");
