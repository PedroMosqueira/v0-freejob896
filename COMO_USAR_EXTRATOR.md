# Como Usar o Extrator de Escalas de Serviço

## Descrição

Este programa extrai automaticamente as escalas de serviço dos Boletins Internos da 1ª Cia E Cmb Mec.

## Requisitos

- Python 3.7 ou superior
- Nenhuma biblioteca externa necessária (usa apenas bibliotecas padrão)

## Como Usar

### Opção 1: Processar um único arquivo

```python
from scripts.extrair_escalas_servico import processar_arquivo_boletim, salvar_escalas_extraidas

# Processar um boletim
escalas = processar_arquivo_boletim("caminho/para/boletim.txt")

# Salvar resultados
salvar_escalas_extraidas(escalas, "escalas_extraidas.txt")
```

### Opção 2: Processar múltiplos arquivos

```python
from pathlib import Path
from scripts.extrair_escalas_servico import processar_arquivo_boletim, salvar_escalas_extraidas

# Processar todos os boletins em uma pasta
todas_escalas = []
pasta_boletins = Path("boletins/")

for arquivo in pasta_boletins.glob("*.txt"):
    escalas = processar_arquivo_boletim(arquivo)
    todas_escalas.extend(escalas)

# Salvar todos os resultados
salvar_escalas_extraidas(todas_escalas, "todas_escalas_2025.txt")
```

### Opção 3: Usar o script diretamente

```bash
python scripts/extrair_escalas_servico.py
```

## Formato de Saída

O programa gera um arquivo de texto formatado com:

```
================================================================================
BOLETIM INTERNO Nº 140/2025 - 30 de julho de 2025
ESCALA DE SERVIÇO PARA 31 DE JULHO DE 2025 (QUINTA-FEIRA)
================================================================================

FISCAL DE DIA:
  • 1º Ten KEITEL

SARGENTO DE DIA:
  • 2º Sgt LEONARDO DORNELLES

COMANDANTE DA GUARDA:
  • 3º Sgt LEANDRO

...
```

## Personalização

### Extrair apenas funções específicas

Edite a lista `funcoes_padrao` na função `extrair_militares_por_funcao()`:

```python
funcoes_padrao = [
    'FISCAL DE DIA',
    'SARGENTO DE DIA',
    'COMANDANTE DA GUARDA',
    # Adicione ou remova funções conforme necessário
]
```

### Exportar para outros formatos

O programa pode ser facilmente adaptado para exportar para CSV, JSON ou Excel:

#### CSV:
```python
import csv

def salvar_escalas_csv(escalas, arquivo_saida):
    with open(arquivo_saida, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['BI Número', 'BI Data', 'Dia Serviço', 'Função', 'Militar'])
        
        for escala in escalas:
            for funcao, militares in escala['militares'].items():
                for militar in militares:
                    writer.writerow([
                        escala['boletim_numero'],
                        escala['boletim_data'],
                        escala['dia_servico'],
                        funcao,
                        militar
                    ])
```

#### JSON:
```python
import json

def salvar_escalas_json(escalas, arquivo_saida):
    with open(arquivo_saida, 'w', encoding='utf-8') as f:
        json.dump(escalas, f, ensure_ascii=False, indent=2)
```

## Troubleshooting

### Problema: Escalas não são encontradas

**Solução:** Verifique se o arquivo contém a seção "1ª Parte - SERVIÇOS DIÁRIOS" e "ESCALA DE SERVIÇOS"

### Problema: Militares não são extraídos corretamente

**Solução:** O formato dos nomes pode variar. Ajuste as expressões regulares na função `extrair_militares_por_funcao()`

### Problema: Caracteres especiais aparecem incorretamente

**Solução:** Certifique-se de que os arquivos estão em UTF-8. Use `encoding='utf-8'` ao abrir arquivos.

## Suporte

Para melhorias ou correções, modifique o script conforme necessário para atender às especificidades dos boletins.
