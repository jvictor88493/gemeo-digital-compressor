/* calculos.js · Versão 2 · 26/11/2026 */
dash.calc('eventos', {
  title: 'Falhas e alarmes',
  description: 'Uma linha por janela de falha, com o primeiro alarme entre 24 h antes do início e o fim.',
  inputs: ['horas'],
  fn: (horas) => {
    const t = (r) => Date.parse(r.hora + 'Z'), H = 36e5;
    const nomes = [...new Set(horas.map((r) => r.falha).filter(Boolean))];
    return nomes.map((falha) => {
      const dentro = horas.filter((r) => r.falha === falha);
      const ini = t(dentro[0]), fim = t(dentro[dentro.length - 1]);
      const a = horas.find((r) => +r.alarme === 1 && t(r) >= ini - 24 * H && t(r) <= fim);
      const d = a ? Math.round((ini - (t(a) + H)) / H) : null;
      return {
        falha,
        inicio: dentro[0].hora.replace('T', ' '),
        horas: dentro.length,
        em_alarme: dentro.filter((r) => +r.alarme === 1).length,
        sinalizada: a ? 'Sim' : 'Não',
        aviso: d === null ? 'Sem alarme' : d > 0 ? d + ' h antes' : d < 0 ? -d + ' h depois' : 'No início'
      };
    });
  }
});

dash.calc('resumo', {
  title: 'Resumo do detector',
  description: 'Falhas sinalizadas, alarmes fora das janelas de falha e das 24 h anteriores, e frequência com que um período qualquer do mesmo tamanho tem alarme.',
  inputs: ['horas', 'eventos'],
  fn: (horas, eventos) => {
    const t = (r) => Date.parse(r.hora + 'Z'), H = 36e5;
    const janelas = eventos.map((e) => {
      const d = horas.filter((r) => r.falha === e.falha);
      return [t(d[0]) - 24 * H, t(d[d.length - 1])];
    });
    const fora = horas.filter((r) => +r.alarme === 1 && !janelas.some(([a, b]) => t(r) >= a && t(r) <= b));
    const longe = horas.filter((r) => r.periodo === 'teste' && !janelas.some(([a, b]) => t(r) >= a && t(r) <= b));
    const teste = horas.filter((r) => r.periodo === 'teste').map(t);
    const alarmes = horas.filter((r) => +r.alarme === 1).map(t);
    /* para cada falha: fração dos períodos de mesmo tamanho, em todo o teste, com algum alarme */
    const acaso = janelas.map(([a, b]) => {
      const tam = b - a + H;
      let j = 0, total = 0, com = 0;
      teste.filter((s) => s + tam <= teste[teste.length - 1]).forEach((s) => {
        while (j < alarmes.length && alarmes[j] < s) j++;
        total++; if (alarmes[j] < s + tam) com++;
      });
      return Math.round(100 * com / total);
    });
    return [{ detectadas: eventos.filter((e) => e.sinalizada === 'Sim').length, falhas: eventos.length, fora: fora.length,
      fora_total: longe.length, acaso_min: Math.min(...acaso), acaso_max: Math.max(...acaso) }];
  }
});
