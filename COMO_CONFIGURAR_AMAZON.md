# Como Configurar Seus Links de Afiliado da Amazon

## Passo 1: Pegue Sua Tag de Afiliado

1. Acesse [Amazon Associates](https://associados.amazon.com.br/)
2. Faça login na sua conta
3. No topo da página, você verá sua **Tag de Afiliado** (formato: `seutag-20`)
4. Copie essa tag

## Passo 2: Escolha os Produtos

Para cada categoria de serviço, escolha produtos relevantes:

**Eletricista:**
- Multímetro Digital
- Kit de Ferramentas Elétricas
- Trena a Laser

**Encanador:**
- Chave de Grifo
- Fita Veda Rosca
- Desentupidor Profissional

**Marceneiro:**
- Serra Tico-Tico
- Tupia Manual
- Conjunto de Brocas

## Passo 3: Gere os Links de Afiliado

### Opção A: Link Direto com Tag
1. Encontre o produto na Amazon
2. Copie a URL do produto (ex: `https://www.amazon.com.br/dp/B08XYZ123`)
3. Adicione sua tag: `https://www.amazon.com.br/dp/B08XYZ123?tag=seutag-20`

### Opção B: Link Encurtado (Recomendado)
1. No painel Amazon Associates, vá em **Product Links** > **Link to Any Page**
2. Cole a URL do produto
3. Clique em **Get Link**
4. Copie o link encurtado `amzn.to/xyz123`

## Passo 4: Adicione os Links no Arquivo

Abra o arquivo `lib/affiliate-config.ts` e substitua:

```typescript
export const AFFILIATE_CONFIG = {
  amazonTag: "sua-tag-aqui-20", // ← Cole sua tag aqui
  
  amazonProducts: {
    multimetro: "https://amzn.to/3AbCdEf", // ← Cole o link do multímetro
    kitFerramentas: "https://amzn.to/3XyZaBc", // ← Cole o link do kit
    // ... e assim por diante
  },
}
```

## Exemplo Real:

```typescript
export const AFFILIATE_CONFIG = {
  amazonTag: "freejob-20",
  
  amazonProducts: {
    multimetro: "https://www.amazon.com.br/dp/B08N5WRWNW?tag=freejob-20",
    kitFerramentas: "https://www.amazon.com.br/dp/B07VNBKBQX?tag=freejob-20",
    trenaLaser: "https://www.amazon.com.br/dp/B08CXQN3Y8?tag=freejob-20",
    // ...
  },
}
```

## Dicas:

✅ Use produtos com boas avaliações (4+ estrelas)
✅ Escolha produtos com preço entre R$50-300 (melhor conversão)
✅ Verifique se os produtos têm estoque disponível
✅ Teste todos os links antes de publicar

## Comissões Amazon Associates:

- Ferramentas: 3-4% de comissão
- Produtos para Casa: 4-5% de comissão
- Mínimo para saque: R$10,00

## Suporte:

Precisa de ajuda? Consulte a [Central de Ajuda Amazon Associates](https://afiliados.amazon.com.br/help)
