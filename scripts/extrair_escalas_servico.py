"""
Extrator de Escalas de Serviço de Boletins Internos
Lê arquivos de boletim interno e extrai apenas as escalas de serviços
"""

import re
from datetime import datetime
from pathlib import Path

def extrair_escalas_de_boletim(texto):
    """
    Extrai todas as escalas de serviço de um boletim interno
    
    Args:
        texto: Conteúdo completo do boletim interno
        
    Returns:
        Lista de dicionários contendo as escalas extraídas
    """
    escalas = []
    
    # Padrão para identificar o cabeçalho do boletim
    padrao_cabecalho = r'BOLETIM INTERNO Nº\s*(\d+/\d+).*?Quartel em São Borja-RS,\s*(\d+ de \w+ de \d+)'
    match_cabecalho = re.search(padrao_cabecalho, texto, re.DOTALL)
    
    numero_bi = match_cabecalho.group(1) if match_cabecalho else "Desconhecido"
    data_bi = match_cabecalho.group(2) if match_cabecalho else "Desconhecida"
    
    # Padrão para identificar seções de escala de serviço
    # Procura por "SERVIÇO PARA O DIA" até o próximo "2. EXTERNO E INTERNOS" ou "2ª Parte"
    padrao_escala = r'SERVIÇO PARA O DIA\s+(\d+.*?)\s*$$(.*?)$$(.*?)(?=SERVIÇO PARA O DIA|2\.\s*EXTERNO E INTERNOS|2ª Parte|ESCALA DE SERVIÇO)'
    
    matches = re.finditer(padrao_escala, texto, re.DOTALL | re.IGNORECASE)
    
    for match in matches:
        dia_servico = match.group(1).strip()
        dia_semana = match.group(2).strip()
        conteudo_escala = match.group(3).strip()
        
        # Extrai os militares de cada função
        escala = {
            'boletim_numero': numero_bi,
            'boletim_data': data_bi,
            'dia_servico': dia_servico,
            'dia_semana': dia_semana,
            'militares': extrair_militares_por_funcao(conteudo_escala)
        }
        
        escalas.append(escala)
    
    return escalas

def extrair_militares_por_funcao(conteudo):
    """
    Extrai militares organizados por função
    
    Args:
        conteudo: Texto contendo a escala de serviço
        
    Returns:
        Dicionário com funções e militares designados
    """
    funcoes = {}
    
    # Lista de funções comuns nas escalas
    funcoes_padrao = [
        'FISCAL DE DIA',
        'AUXILIAR DO FISCAL DE DIA',
        'SARGENTO DE DIA',
        'COMANDANTE DA GUARDA',
        'CABO DA GUARDA',
        'GUARDA AO QUARTEL',
        'VILA DOS SARGENTOS',
        'CABO DE DIA',
        'PLANTÃO AO ALOJAMENTO DOS SOLDADOS',
        'PERMANÊNCIA AO RANCHO',
        'COZINHEIRO',
        'AUXILIAR DO RANCHO',
        'MOTORISTA DE DIA',
        'CORNETEIRO DE DIA',
        'PERMANÊNCIA DA RESERVA DE ARMAMENTO'
    ]
    
    # Para cada função, tenta extrair os militares
    for funcao in funcoes_padrao:
        # Procura pela função e captura os militares até a próxima função
        padrao = rf'{funcao}\s*(.*?)(?=' + '|'.join([f for f in funcoes_padrao if f != funcao]) + r'|\Z)'
        match = re.search(padrao, conteudo, re.DOTALL | re.IGNORECASE)
        
        if match:
            militares_texto = match.group(1).strip()
            # Remove linhas vazias e limpa o texto
            militares = [m.strip() for m in militares_texto.split('\n') if m.strip() and not m.strip().startswith('Sd Ef')]
            
            # Extrai nomes de militares (formato: Posto Nome ou Sd Ef Vrv 123 NOME)
            militares_limpos = []
            for linha in militares_texto.split('\n'):
                linha = linha.strip()
                if linha and len(linha) > 3:
                    militares_limpos.append(linha)
            
            if militares_limpos:
                funcoes[funcao] = militares_limpos
    
    return funcoes

def formatar_escala_para_texto(escala):
    """
    Formata uma escala extraída em texto legível
    
    Args:
        escala: Dicionário com dados da escala
        
    Returns:
        String formatada com a escala
    """
    texto = f"""
{'='*80}
BOLETIM INTERNO Nº {escala['boletim_numero']} - {escala['boletim_data']}
ESCALA DE SERVIÇO PARA {escala['dia_servico']} ({escala['dia_semana']})
{'='*80}

"""
    
    for funcao, militares in escala['militares'].items():
        texto += f"\n{funcao}:\n"
        for militar in militares:
            texto += f"  • {militar}\n"
    
    return texto

def processar_arquivo_boletim(caminho_arquivo):
    """
    Processa um arquivo de boletim e extrai as escalas
    
    Args:
        caminho_arquivo: Caminho para o arquivo do boletim
        
    Returns:
        Lista de escalas extraídas
    """
    print(f"[v0] Processando arquivo: {caminho_arquivo}")
    
    try:
        with open(caminho_arquivo, 'r', encoding='utf-8') as f:
            conteudo = f.read()
        
        escalas = extrair_escalas_de_boletim(conteudo)
        print(f"[v0] Encontradas {len(escalas)} escala(s) de serviço")
        
        return escalas
    
    except Exception as e:
        print(f"[v0] Erro ao processar arquivo: {e}")
        return []

def salvar_escalas_extraidas(escalas, arquivo_saida):
    """
    Salva as escalas extraídas em um arquivo de texto
    
    Args:
        escalas: Lista de escalas extraídas
        arquivo_saida: Caminho para o arquivo de saída
    """
    print(f"[v0] Salvando escalas em: {arquivo_saida}")
    
    with open(arquivo_saida, 'w', encoding='utf-8') as f:
        f.write(f"ESCALAS DE SERVIÇO EXTRAÍDAS\n")
        f.write(f"Data de extração: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}\n")
        f.write(f"{'='*80}\n\n")
        
        for escala in escalas:
            f.write(formatar_escala_para_texto(escala))
            f.write("\n\n")
    
    print(f"[v0] {len(escalas)} escala(s) salva(s) com sucesso!")

# Exemplo de uso
if __name__ == "__main__":
    print("[v0] Iniciando extração de escalas de serviço...")
    
    # Para testar, você pode criar um arquivo exemplo ou usar o conteúdo fornecido
    # Aqui está um exemplo básico:
    
    exemplo_boletim = """
BOLETIM INTERNO Nº 140/2025
Quartel em São Borja-RS, 30 de julho de 2025

1ª Parte
SERVIÇOS DIÁRIOS
1. ESCALA DE SERVIÇOS
SERVIÇO PARA O DIA 31 DE JULHO DE 2025 (QUINTA-FEIRA)
Serviços internos:
FISCAL DE DIA
1º Ten KEITEL
SARGENTO DE DIA
2º Sgt LEONARDO DORNELLES
COMANDANTE DA GUARDA
3º Sgt LEANDRO
CABO DA GUARDA
Cb 125 FREIRE
GUARDA AO QUARTEL
Sd Ef Vrv 356 ARCE
Sd Ef Vrv 376 BRINGHENTI
MOTORISTA DE DIA
Sd Ef Profl 207 MARIAN

2. EXTERNO E INTERNOS
Sem Alteração
"""
    
    # Extrai as escalas
    escalas = extrair_escalas_de_boletim(exemplo_boletim)
    
    # Salva em arquivo
    salvar_escalas_extraidas(escalas, "escalas_extraidas.txt")
    
    print("[v0] Processamento concluído!")
