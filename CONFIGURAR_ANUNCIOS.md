# Como Configurar os Links de Afiliados

## 📋 Visão Geral

Todos os links de afiliados estão centralizados no arquivo `lib/affiliate-config.ts`. Você precisa substituir os valores placeholder pelos seus links reais.

---

## 🛒 Amazon Associates

### 1. Criar Conta na Amazon Associates
1. Acesse: https://associados.amazon.com.br/
2. Crie uma conta ou faça login
3. Complete o cadastro do seu site (use o domínio do Freejob)

### 2. Obter sua Tag de Afiliado
- Após aprovação, você receberá uma **Tag de Rastreamento** (ex: `freejob-20`)
- Substitua em `affiliate-config.ts`:
  \`\`\`ts
  amazonTag: "SUA-TAG-AQUI"
  \`\`\`

### 3. Criar Links de Produtos
Para cada produto que você quer promover:
1. Busque o produto na Amazon
2. Use a barra de ferramentas do Associates para gerar o link curto
3. O formato será: `https://amzn.to/CODIGO-UNICO`
4. Substitua os links em `AFFILIATE_CONFIG.amazonProducts`

**Produtos atuais que precisam de links:**
- Multímetro Digital
- Kit de Ferramentas
- Trena Laser
- Chave de Grifo
- Serra Tico-Tico

---

## 📚 Hotmart (Cursos Profissionalizantes)

### 1. Criar Conta na Hotmart
1. Acesse: https://www.hotmart.com/
2. Crie uma conta como **Afiliado**
3. Complete seu cadastro

### 2. Encontrar Produtos para Promover
1. Vá em "Marketplace" ou "Afiliados"
2. Busque por cursos relacionados a:
   - Eletricista
   - Encanador
   - Marcenaria
   - Pintura
   - Pedreiro

### 3. Obter Links de Afiliado
1. Ao encontrar um curso, clique em "Promover"
2. Copie seu link de afiliado (formato: `https://go.hotmart.com/CODIGO`)
3. Substitua em `AFFILIATE_CONFIG.courses`:
   \`\`\`ts
   courses: {
     eletricista: "https://go.hotmart.com/SEU-LINK",
     encanador: "https://go.hotmart.com/SEU-LINK",
     // ...
   }
   \`\`\`

**Alternativa:** Você também pode usar **Eduzz** ou **Monetizze**

---

## 📊 Google AdSense

### 1. Criar Conta no AdSense
1. Acesse: https://www.google.com/adsense/
2. Inscreva-se com sua conta Google
3. Adicione seu site e aguarde aprovação

### 2. Obter Client ID
1. Após aprovação, vá em "Anúncios" > "Visão Geral"
2. Copie seu **Publisher ID** (formato: `ca-pub-XXXXXXXXXX`)
3. Substitua em `affiliate-config.ts`:
   \`\`\`ts
   googleAdsense: {
     clientId: "ca-pub-SEU-ID-AQUI",
   }
   \`\`\`

### 3. Criar Unidades de Anúncio
1. Vá em "Anúncios" > "Por unidade de anúncio"
2. Crie dois anúncios:
   - Um para banners (responsivo)
   - Um para sidebar
3. Copie os **Ad Slot IDs** de cada um
4. Substitua em `affiliate-config.ts`:
   \`\`\`ts
   slots: {
     banner: "1234567890",    // ID do banner
     sidebar: "0987654321",   // ID da sidebar
   }
   \`\`\`

### 4. Adicionar Script no Site
Adicione este código no `app/layout.tsx` dentro do `<head>`:
\`\`\`tsx
<script
  async
  src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-SEU-ID-AQUI"
  crossOrigin="anonymous"
></script>
\`\`\`

---

## ✅ Checklist Final

Antes de colocar no ar, verifique:

- [ ] Tag da Amazon Associates configurada
- [ ] Links de pelo menos 5 produtos da Amazon criados
- [ ] Links de pelo menos 3 cursos da Hotmart/Eduzz configurados
- [ ] Google AdSense Client ID configurado
- [ ] Google AdSense Slots criados e configurados
- [ ] Script do AdSense adicionado no layout
- [ ] Todos os placeholders "SEU_LINK" substituídos
- [ ] Testado os cliques nos anúncios (em modo incógnito)

---

## 💰 Estimativa de Receita

Com 1.000 usuários ativos/dia:

| Tipo de Anúncio | Conversão Estimada | Receita Mensal |
|-----------------|-------------------|----------------|
| Amazon (5% cliques, 2% conversão) | 1.000 usuários | R$ 150-300 |
| Cursos Hotmart (1% conversão) | 300 cliques | R$ 300-900 |
| Google AdSense (CTR 2%) | 600 impressões | R$ 100-200 |
| **TOTAL ESTIMADO** | | **R$ 550-1.400/mês** |

*Valores variam conforme engajamento e produtos promovidos*

---

## 🆘 Suporte

Se tiver dúvidas sobre configuração de afiliados:
- Amazon Associates: https://affiliate-program.amazon.com.br/help
- Hotmart: https://atendimento.hotmart.com.br/
- Google AdSense: https://support.google.com/adsense/
