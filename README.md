# Gêmeo digital de um compressor de ar

**Versão 7 · 26/11/2026**

**Site:** https://gemeo-digital-compressor.vercel.app

Protótipo de gêmeo digital e análise preditiva industrial com a base aberta MetroPT-3 (compressor de ar de um trem de metrô). A página reproduz as leituras hora a hora, colore um modelo 3D simplificado conforme o estado de cada sensor e mostra o resultado de um detector de anomalias.

## Versões

- **7 (26/11/2026):** aviso do estado de cada hora junto ao modelo (normal, atenção, desvio acima do limite, anomalia); índice lateral que só abre o texto, sem mexer na animação; topo reduzido; versão deixou de aparecer na página. Reúne as versões 5 a 7 do painel. Dados e detector não mudaram.
- **4 (26/11/2026):** modelo 3D refeito com peças detalhadas (motor, compressor, resfriador, separador, torres, reservatório, painel e tubulação), em WebGL próprio.
- **3 (26/11/2026):** os textos ao lado da animação viraram um índice clicável. Dados e detector não mudaram (arquivos da versão 2).
- **2 (26/11/2026):** primeira versão publicada, com os dados reais do MetroPT-3.

## Estrutura

| Pasta ou arquivo | Conteúdo |
|---|---|
| `public/` | Página (HTML, CSS e JavaScript; modelo 3D desenhado em WebGL, sem biblioteca 3D) |
| `api/horas.js` | Função da Vercel que lê o banco |
| `scripts/carregar.mjs` | Cria as tabelas no Neon (Postgres) e carrega os dados |
| `dados/` | Médias por hora e estados calculados pelo detector |
| `detector/` | Script Python que gera o arquivo de `dados/` a partir do CSV original |

## Como o detector funciona

1. As leituras são resumidas em médias por hora.
2. Fevereiro de 2020 define o normal de cada sensor (mediana e desvio absoluto mediano, com um piso por sensor).
3. O índice de anomalia é a raiz da média dos quadrados dos três maiores desvios.
4. O limite é o percentil 99,5 do índice no treino (mínimo 3). Há alarme com duas horas seguidas acima dele, a partir de 01/03/2020.

## Resultado nos dados reais

| Falha | Horas com dados | Horas em alarme | Alarme confirmado |
|---|---|---|---|
| 1 (18/04) | 24 | 24 | 12 h antes |
| 2 (29–30/05) | 8 | 6 | 23 h antes |
| 3 (05–07/06) | 50 | 49 | 1 h depois |
| 4 (15/07) | 6 | 6 | 15 h antes |

**Limitações:**

- Fora das janelas de falha e das 24 horas anteriores, o detector ficou em alarme em 593 de 3557 horas de teste.
- Um período qualquer do mesmo tamanho tem algum alarme em 52% a 74% das vezes. Por isso, **a antecipação das falhas não está demonstrada**.
- As janelas de falha vêm dos relatórios publicados com a base. Horas fora delas não são garantidamente normais.
- O modelo 3D é fictício e foi gerado por código neste projeto, sem arquivos de terceiros. Não representa o equipamento real.

## Rodar

Publicação na Vercel: defina `DATABASE_URL` (conexão do Neon) nas variáveis de ambiente do projeto. O build carrega o banco e monta a página.

Gerar os dados novamente (o CSV original não está no repositório):

```bash
pip install pandas numpy
python detector/detector_metropt3_v2_2026-11-26.py "MetroPT3(AirCompressor).csv"
```

## Dados e licença

Base: [MetroPT-3 Dataset](https://archive.ics.uci.edu/dataset/791), de N. Davari, B. Veloso, R. Ribeiro e J. Gama (2023), UCI Machine Learning Repository, DOI [10.24432/C5VW3R](https://doi.org/10.24432/C5VW3R), licença [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

**Alterações feitas:** o arquivo em `dados/` contém médias por hora das leituras originais, além do índice de anomalia, dos estados e dos alarmes calculados por este projeto. Os autores da base não endossam este projeto.

A biblioteca [D3](https://d3js.org) (licença ISC) é instalada pelo npm.

A licença CC BY 4.0 acima vale para os dados. Nenhuma licença foi definida para o código deste repositório.
