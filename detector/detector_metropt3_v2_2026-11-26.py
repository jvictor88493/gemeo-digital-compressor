#!/usr/bin/env python3
"""Detector de anomalias - compressor MetroPT-3
Versao 2 - 26/11/2026

Uso com o arquivo real (baixado da UCI):
    pip install pandas numpy
    python detector_metropt3_v2_2026-11-26.py "MetroPT3(AirCompressor).csv"

Uso sem o arquivo (dados SINTETICOS, apenas para demonstracao):
    python detector_metropt3_v2_2026-11-26.py --demo

Saida: um JSON {rows, meta} com uma linha por hora, usado pelo painel.
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

VERSAO, DATA = "v2", "2026-11-26"
FIM_TREINO = pd.Timestamp("2020-03-01")   # treino = primeiro mes (fevereiro/2020)
MIN_AMOSTRAS = 60                          # leituras minimas para aceitar uma hora
HORAS_SEGUIDAS = 2                         # horas acima do limite para gerar alarme

# nome no painel -> (coluna no CSV, piso da escala: evita que sinal quase constante dispare)
SENSORES = {
    "tp2": ("TP2", 0.25), "tp3": ("TP3", 0.10), "h1": ("H1", 0.25),
    "dv": ("DV_pressure", 0.05), "reserv": ("Reservoirs", 0.10),
    "oleo": ("Oil_temperature", 1.5), "corrente": ("Motor_current", 0.20),
    "carga": ("DV_eletric", 0.03),
}

# Relatorios de falha publicados na pagina do dataset (UCI, id 791)
FALHAS_REAIS = [
    ("Relatório 1", "2020-04-18 00:00", "2020-04-18 23:59"),
    ("Relatório 2", "2020-05-29 23:30", "2020-05-30 06:00"),
    ("Relatório 3", "2020-06-05 10:00", "2020-06-07 14:30"),
    ("Relatório 4", "2020-07-15 14:30", "2020-07-15 19:00"),
]
# Falhas inventadas para a demonstracao (datas propositalmente diferentes das reais)
FALHAS_DEMO = [
    ("Falha injetada 1", "2020-04-07 06:00", "2020-04-08 02:00"),
    ("Falha injetada 2", "2020-06-21 13:00", "2020-06-21 22:00"),
    ("Falha injetada 3", "2020-08-04 03:00", "2020-08-05 09:00"),
]


def gerar_demo(semente=42):
    """Leituras sinteticas a cada 10 s, com ciclos de carga e vazamentos de ar injetados."""
    rng = np.random.default_rng(semente)
    t = pd.date_range("2020-02-01", "2020-08-31 23:59:50", freq="10s")
    n = len(t)
    hora = (t.hour + t.minute / 60).to_numpy()
    dia = np.sin((hora - 9) / 24 * 2 * np.pi)

    # intensidade do vazamento (0 = normal), com rampa de 6 h antes do inicio
    vaz = np.zeros(n)
    for (_, ini, fim), forca in zip(FALHAS_DEMO, (1.0, 0.75, 0.9)):
        ini, fim = pd.Timestamp(ini), pd.Timestamp(fim)
        rampa = (t >= ini - pd.Timedelta("6h")) & (t < ini)
        vaz[rampa] = np.linspace(0, forca * 0.5, rampa.sum())
        vaz[(t >= ini) & (t <= fim)] = forca

    # ciclo de 15 min: fracao em carga sobe com a demanda diurna e com o vazamento
    lento = np.repeat(rng.normal(0, 0.02, n // 360 + 1), 360)[:n]
    duty = np.clip(0.30 + 0.05 * dia + lento + 0.60 * vaz, 0, 0.98)
    fase = (np.arange(n) % 90) / 90
    on = (fase < duty).astype(float)
    sobe = np.where(on == 1, fase / duty, 1 - (fase - duty) / (1 - duty))

    ruido = lambda s: rng.normal(0, s, n)
    reserv = 8.2 + 1.6 * sobe - 1.4 * vaz + ruido(0.05)
    return pd.DataFrame({
        "timestamp": t,
        "TP2": on * (reserv + 0.35) + ruido(0.05),
        "TP3": reserv + ruido(0.03),
        "H1": (1 - on) * reserv + ruido(0.05),
        "DV_pressure": ((np.arange(n) % 90) == 0) * 1.8 * (1 - 0.5 * vaz) + ruido(0.01),
        "Reservoirs": reserv,
        "Oil_temperature": 60 + 3.0 * dia + 14 * (duty - 0.30) + 6 * vaz + ruido(0.6),
        "Motor_current": 3.8 + on * (2.2 + 0.8 * vaz) + ruido(0.12),
        "DV_eletric": on,
    })


def processar(bruto, falhas, origem):
    mapa = {c.lower(): c for c in bruto.columns}
    faltam = [c for c, _ in SENSORES.values() if c.lower() not in mapa]
    if "timestamp" not in mapa or faltam:
        sys.exit(f"Colunas ausentes no CSV: {faltam or ['timestamp']}")
    df = bruto[[mapa["timestamp"]] + [mapa[c.lower()] for c, _ in SENSORES.values()]].copy()
    df.columns = ["timestamp"] + list(SENSORES)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    grupos = df.set_index("timestamp").sort_index().resample("1h")
    h = grupos.mean()[grupos.size() >= MIN_AMOSTRAS].dropna()

    treino = h[h.index < FIM_TREINO]
    if len(treino) < 200:
        sys.exit("Menos de 200 horas validas no primeiro mes: treino insuficiente.")

    # 1) desvio robusto de cada sensor em relacao ao primeiro mes
    med = treino.median()
    mad = (treino - med).abs().median() * 1.4826
    piso = pd.Series({k: p for k, (_, p) in SENSORES.items()})
    z = ((h - med) / np.maximum(mad, piso)).abs().clip(upper=50)

    # 2) estado de cada sensor: 0 normal, 1 acima do percentil 99,5 do treino, 2 acima do dobro
    lim_sensor = np.maximum(z.loc[treino.index].quantile(0.995), 3.0)
    estado = (z > lim_sensor).astype(int) + (z > 2 * lim_sensor).astype(int)

    # 3) indice da hora = media quadratica dos 3 maiores desvios
    top3 = np.sort(z.to_numpy(), axis=1)[:, -3:]
    indice = pd.Series(np.sqrt((top3 ** 2).mean(axis=1)), index=h.index)
    limite = max(float(indice.loc[treino.index].quantile(0.995)), 3.0)

    # 4) alarme: HORAS_SEGUIDAS horas consecutivas acima do limite
    alarme, seguidas, anterior = [], 0, None
    for ts, v in indice.items():
        if anterior is None or ts - anterior != pd.Timedelta("1h"):
            seguidas = 0
        seguidas = seguidas + 1 if v > limite else 0
        alarme.append(int(seguidas >= HORAS_SEGUIDAS and ts >= FIM_TREINO))
        anterior = ts

    rotulo = pd.Series("", index=h.index)
    for nome, ini, fim in falhas:
        ini, fim = pd.Timestamp(ini), pd.Timestamp(fim)
        rotulo[(h.index + pd.Timedelta("1h") > ini) & (h.index <= fim)] = nome

    linhas = []
    for i, ts in enumerate(h.index):
        r = {"hora": ts.strftime("%Y-%m-%dT%H:%M"), "origem": origem,
             "periodo": "treino" if ts < FIM_TREINO else "teste", "falha": rotulo.iloc[i]}
        for k in SENSORES:
            r[k] = round(float(h[k].iloc[i]), 2)
            r["st_" + k] = int(estado[k].iloc[i])
        r.update(indice=round(float(indice.iloc[i]), 2), limite=round(limite, 2), alarme=alarme[i])
        linhas.append(r)
    return linhas


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    if sys.argv[1] == "--demo":
        linhas = processar(gerar_demo(), FALHAS_DEMO, "exemplo")
        entrada = "Dados SINTETICOS gerados pelo proprio script (semente 42)"
    else:
        linhas = processar(pd.read_csv(sys.argv[1]), FALHAS_REAIS, "real")
        entrada = Path(sys.argv[1]).name
    saida = Path(f"metropt3_painel_{VERSAO}_{DATA}.json")
    meta = [
        {"label": "Entrada", "value": entrada},
        {"label": "Versao", "value": f"{VERSAO} - {DATA}"},
        {"label": Path(__file__).name, "type": "code", "lang": "python",
         "value": Path(__file__).read_text(encoding="utf-8")},
    ]
    saida.write_text(json.dumps({"rows": linhas, "meta": meta}, separators=(",", ":")), encoding="utf-8")

    r = pd.DataFrame(linhas)
    print(f"{saida} | {len(r)} horas | limite {r.limite.iloc[0]}")
    for nome, g in r[r.falha != ""].groupby("falha"):
        print(f"  {nome}: {len(g)} h, {int(g.alarme.sum())} h em alarme, indice maximo {g.indice.max()}")
    fora = r[(r.falha == "") & (r.periodo == "teste")]
    print(f"  Alarmes fora das janelas de falha: {int(fora.alarme.sum())} de {len(fora)} h")


if __name__ == "__main__":
    main()
