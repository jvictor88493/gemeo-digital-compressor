/* pagina.js · Versão 7 · 26/11/2026 */
const $$ = (s) => document.querySelectorAll(s);
const SENS = [['tp2', 'TP2', 'bar'], ['tp3', 'TP3', 'bar'], ['h1', 'H1', 'bar'], ['dv', 'Secador', 'bar'],
  ['reserv', 'Reservatório', 'bar'], ['oleo', 'Óleo', '°C'], ['corrente', 'Corrente', 'A'], ['carga', 'Em carga', 'fração']];
const nf = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const quando = d3.utcFormat('%d/%m/%Y %Hh'), curto = d3.utcFormat('%d/%m');
const S = { i: 0, tocando: false, iniciado: false, giro: -0.55, incl: 0.5 };
let cache = null, de = null, tipico = null;

function linhas() {
  const d = dash.data('horas');
  if (d.status !== 'ok' || !d.data.length) return null;
  if (de !== d.data) {
    de = d.data;
    cache = d.data.map((r) => ({ ...r, t: new Date(r.hora + 'Z') }));
    /* valor típico de cada sensor: mediana do treino, a mesma referência do detector */
    const treino = cache.filter((r) => r.periodo === 'treino');
    tipico = Object.fromEntries(SENS.map(([k]) => [k, d3.median(treino, (r) => +r[k])]));
    S.i = Math.min(S.i, cache.length - 1);
    /* abre num dia de operação normal */
    if (!S.iniciado) { S.i = Math.min(36, cache.length - 1); S.iniciado = true; }
  }
  return cache;
}

const MOVEIS = ['alerta', 'gemeo', 'quando', 'situacao', 'barra', 'leituras', 'indice', 'm-reserv', 'm-oleo', 'm-corrente'];
function mover(i) {
  const L = linhas(); if (!L) return;
  S.i = Math.max(0, Math.min(L.length - 1, Math.round(i)));
  MOVEIS.forEach((n) => dash.draw(n));
}
function tocar(v) {
  S.tocando = v;
  $$('.gd-l-play').forEach((e) => { e.hidden = v; });
  $$('.gd-l-pause').forEach((e) => { e.hidden = !v; });
}

/* relógio da reprodução */
let antes = null, acumulado = 0, ultimo = 0;
function passo(agora) {
  const L = cache, vel = document.querySelector('.gd-speed');
  if (S.tocando && L && antes !== null) {
    acumulado += (agora - antes) / 1000 * (vel ? +vel.value : 12);
    if (acumulado >= 1 && agora - ultimo > 120) {
      ultimo = agora;
      const n = Math.floor(acumulado); acumulado -= n;
      mover(S.i + n);
      if (S.i >= L.length - 1) tocar(false);
    }
  }
  antes = agora;
  requestAnimationFrame(passo);
}
requestAnimationFrame(passo);

$$('.gd-play').forEach((b) => b.addEventListener('click', () => {
  if (!S.tocando && cache && S.i >= cache.length - 1) mover(0);
  tocar(!S.tocando);
}));

dash.draw('origem', (el) => {
  const L = linhas(), real = L && L[0].origem === 'real';
  el.replaceChildren();
  $$('.gd-demo').forEach((e) => { e.hidden = !L || real; });
  $$('.gd-real').forEach((e) => { e.hidden = !real; });
});

['detectadas', 'falhas', 'fora', 'fora_total', 'acaso_min', 'acaso_max'].forEach((campo) => dash.draw(campo, (el) => {
  const r = dash.data('resumo');
  el.setAttribute('data-field', campo); el.setAttribute('data-row', '0');
  el.textContent = r.status === 'ok' && r.data.length ? r.data[0][campo] : '—';
}));

/* aviso do visualizador: estado da hora, o que saiu do normal e as mudanças anteriores */
const NOMES = { tp2: 'Pressão no compressor (TP2)', tp3: 'Pressão no painel (TP3)', h1: 'Pressão no separador (H1)',
  dv: 'Pressão de descarga do secador', reserv: 'Pressão do reservatório', oleo: 'Temperatura do óleo',
  corrente: 'Corrente do motor', carga: 'Tempo em carga' };
const ESTADOS = [['Normal', 0], ['Atenção', 1], ['Desvio acima do limite', 1], ['Anomalia detectada', 2]];
const estadoDe = (r) => +r.alarme ? 3 : +r.indice > +r.limite ? 2 : SENS.some(([k]) => +r['st_' + k]) ? 1 : 0;
const diaHora = d3.utcFormat('%d/%m %Hh');

/* primeira hora do trecho contínuo (sem lacunas) com o mesmo estado da hora i */
function inicioDoTrecho(L, i) {
  const e = estadoDe(L[i]);
  while (i > 0 && L[i].t - L[i - 1].t <= 36e5 && estadoDe(L[i - 1]) === e) i--;
  return i;
}

function bloco(tag, classe, texto) {
  const n = document.createElement(tag);
  n.className = classe;
  if (texto) n.textContent = texto;
  return n;
}

dash.draw('alerta', (el) => {
  const L = linhas();
  if (!L) { el.textContent = '—'; return; }
  const r = L[S.i], e = estadoDe(r), ini = inicioDoTrecho(L, S.i);
  const topo = bloco('div', 'gd-al-topo e' + ESTADOS[e][1]);
  topo.append(bloco('b', '', ESTADOS[e][0]), bloco('span', '', 'desde ' + diaHora(L[ini].t)));

  const fora = SENS.map(([k]) => k).filter((k) => +r['st_' + k]).sort((a, b) => r['st_' + b] - r['st_' + a]);
  const lista = bloco('ul', 'gd-al-lista');
  lista.append(...fora.slice(0, 4).map((k) => {
    const alto = +r[k] > tipico[k], st = +r['st_' + k];
    const seta = alto ? '▲ ' : '▼ ', como = `: ${st > 1 ? 'muito ' : ''}${alto ? 'acima' : 'abaixo'}`;
    const item = bloco('li', 'e' + st);
    /* nome completo em telas largas; no celular, o mesmo nome curto das leituras */
    item.append(bloco('span', 'gd-longo', seta + NOMES[k] + como + ' do normal'),
      bloco('span', 'gd-curto', seta + SENS.find((s) => s[0] === k)[1] + como));
    return item;
  }));
  if (fora.length > 4) lista.append(bloco('li', 'e1', '+ ' + (fora.length - 4) + ' fora do normal'));
  if (!fora.length) lista.append(bloco('li', 'e0', e ? 'Nenhum sensor passou sozinho do limite; o desvio é do conjunto' : 'Todos os sensores dentro do normal'));

  const antes = [];
  for (let j = ini; j > 0 && antes.length < 2;) {
    if (L[j].t - L[j - 1].t > 36e5) antes.push('Sem dados até ' + diaHora(L[j].t));
    if (antes.length === 2) break;
    j = inicioDoTrecho(L, j - 1);
    antes.push(`${ESTADOS[estadoDe(L[j])][0]} (${diaHora(L[j].t)})`);
  }
  el.replaceChildren(topo, lista, bloco('div', 'gd-al-antes', antes.length ? 'Antes: ' + antes.join(' · ') : 'Início dos dados'));
});

dash.draw('gemeo', {
  mount: (el) => {
    const c = document.createElement('canvas');
    c.className = 'gd-canvas'; c.setAttribute('role', 'img');
    c.setAttribute('aria-label', 'Modelo 3D do compressor com peças coloridas pelo estado dos sensores');
    el.append(c);
    let p = null;
    c.addEventListener('pointerdown', (e) => { p = [e.clientX, e.clientY]; c.setPointerCapture(e.pointerId); });
    c.addEventListener('pointerup', () => { p = null; });
    c.addEventListener('pointercancel', () => { p = null; });
    c.addEventListener('pointermove', (e) => {
      if (!p) return;
      S.giro += (e.clientX - p[0]) * 0.01;
      S.incl = Math.max(0.1, Math.min(1.3, S.incl + (e.clientY - p[1]) * 0.006));
      p = [e.clientX, e.clientY];
      GD_desenhar(c, cache && cache[S.i], S);
    });
    return c;
  },
  update: (el, c) => { const L = linhas(); GD_desenhar(c, L && L[S.i], S); }
});

dash.draw('quando', (el) => { const L = linhas(); el.textContent = L ? quando(L[S.i].t) : '—'; });

dash.draw('situacao', (el) => {
  const L = linhas();
  if (!L) { el.textContent = dash.data('horas').status === 'error' ? 'Falha ao carregar os dados' : '—'; return; }
  const r = L[S.i];
  const partes = [r.periodo === 'treino' ? 'Treino' : 'Teste', 'índice ' + nf.format(+r.indice) + ' (limite ' + nf.format(+r.limite) + ')'];
  if (r.falha) partes.push(r.falha);
  if (+r.alarme) partes.push('ALARME');
  el.textContent = partes.join(' · ');
  el.className = +r.alarme ? 'ruim' : '';
});

dash.draw('barra', {
  mount: (el) => {
    const s = document.createElement('input');
    s.type = 'range'; s.min = 0; s.setAttribute('aria-label', 'Hora reproduzida');
    s.addEventListener('input', () => { tocar(false); mover(+s.value); });
    el.append(s); return s;
  },
  update: (el, s) => { const L = linhas(); s.disabled = !L; if (L) { s.max = L.length - 1; s.value = S.i; } }
});

dash.draw('leituras', (el) => {
  const L = linhas();
  if (!L) { el.textContent = '—'; return; }
  const r = L[S.i], nomes = ['Normal', 'Atenção', 'Anômalo'];
  el.replaceChildren(...SENS.map(([k, nome, un]) => {
    const d = document.createElement('div'); d.className = 'gd-sensor e' + r['st_' + k];
    const t = document.createElement('span'); t.textContent = nome;
    const v = document.createElement('b'); v.textContent = nf.format(+r[k]);
    v.setAttribute('data-source', 'horas'); v.setAttribute('data-field', k); v.setAttribute('data-where', 'hora=' + encodeURIComponent(r.hora));
    const u = document.createElement('small'); u.textContent = un + ' · ' + nomes[+r['st_' + k]];
    d.append(t, v, u); return d;
  }));
});

/* insere quebras onde faltam horas, para a linha não atravessar lacunas */
const comLacunas = (L) => L.flatMap((r, i) => i && r.t - L[i - 1].t > 36e5 ? [null, r] : [r]);

dash.draw('indice', (el) => {
  const L = linhas();
  if (!L) { el.textContent = dash.data('horas').status === 'error' ? 'Falha ao carregar os dados' : '—'; return; }
  const w = el.clientWidth || 320, h = 220, m = { l: 34, r: 24, t: 8, b: 24 };
  const x = d3.scaleUtc(d3.extent(L, (r) => r.t), [m.l, w - m.r]);
  const y = d3.scaleLinear([0, d3.max(L, (r) => +r.indice) * 1.05], [h - m.b, m.t]);
  const raiz = d3.select(el); raiz.text('');
  const svg = raiz.append('svg').attr('width', w).attr('height', h).attr('role', 'img')
    .attr('aria-label', 'Índice de anomalia por hora, com limite e janelas de falha');
  d3.groups(L.filter((r) => r.falha), (r) => r.falha).forEach(([, g]) => {
    const a = x(g[0].t), b = x(g[g.length - 1].t);
    svg.append('rect').attr('x', a).attr('width', Math.max(3, b - a)).attr('y', m.t).attr('height', h - m.t - m.b)
      .style('fill', 'var(--color-bad)').style('opacity', 0.18);
  });
  svg.append('g').attr('transform', `translate(0,${h - m.b})`).call(d3.axisBottom(x).ticks(Math.max(3, w / 90)).tickFormat(curto));
  svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5));
  svg.append('path').datum(comLacunas(L)).attr('fill', 'none').style('stroke', dash.colors[0]).attr('stroke-width', 1)
    .attr('d', d3.line().defined(Boolean).x((r) => x(r.t)).y((r) => y(+r.indice)));
  svg.append('line').attr('x1', m.l).attr('x2', w - m.r).attr('y1', y(+L[0].limite)).attr('y2', y(+L[0].limite))
    .style('stroke', 'var(--color-fg)').attr('stroke-dasharray', '5 4');
  svg.append('line').attr('x1', x(L[S.i].t)).attr('x2', x(L[S.i].t)).attr('y1', m.t).attr('y2', h - m.b)
    .style('stroke', 'var(--color-fg)').attr('stroke-width', 1.5);
  const tip = raiz.append('div').attr('class', 'gd-tip').style('display', 'none');
  const acha = (e) => d3.bisector((r) => r.t).center(L, x.invert(d3.pointer(e, svg.node())[0]));
  svg.append('rect').attr('x', m.l).attr('y', m.t).attr('width', w - m.l - m.r).attr('height', h - m.t - m.b)
    .attr('fill', 'transparent').style('cursor', 'pointer')
    .on('pointermove', (e) => {
      const r = L[acha(e)];
      tip.style('display', null).style('top', '4px').text(`${quando(r.t)} · ${nf.format(+r.indice)}`);
      tip.style('left', Math.max(0, Math.min(w - tip.node().offsetWidth, x(r.t) + 8)) + 'px');
    })
    .on('pointerleave', () => tip.style('display', 'none'))
    .on('click', (e) => { tocar(false); mover(acha(e)); });
});

['reserv', 'oleo', 'corrente'].forEach((k) => dash.draw('m-' + k, (el) => {
  const L = linhas();
  if (!L) { el.textContent = '—'; return; }
  const c = L[S.i].t, J = L.filter((r) => Math.abs(r.t - c) <= 72 * 36e5);
  const w = el.clientWidth || 280, h = 130, m = { l: 34, r: 22, t: 6, b: 22 };
  const x = d3.scaleUtc([new Date(+c - 72 * 36e5), new Date(+c + 72 * 36e5)], [m.l, w - m.r]);
  const ext = d3.extent(L, (r) => +r[k]);
  const y = d3.scaleLinear(ext, [h - m.b, m.t]).nice();
  d3.select(el).text('');
  const svg = d3.select(el).append('svg').attr('width', w).attr('height', h).attr('role', 'img')
    .attr('aria-label', 'Leituras do sensor em torno da hora escolhida');
  svg.append('g').attr('transform', `translate(0,${h - m.b})`).call(d3.axisBottom(x).ticks(4).tickFormat(curto));
  svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4));
  svg.append('path').datum(comLacunas(J)).attr('fill', 'none').style('stroke', dash.colors[0]).attr('stroke-width', 1.5)
    .attr('d', d3.line().defined(Boolean).x((r) => x(r.t)).y((r) => y(+r[k])));
  svg.append('circle').attr('cx', x(c)).attr('cy', y(+L[S.i][k])).attr('r', 4)
    .style('fill', ['var(--color-ok)', 'var(--color-warn)', 'var(--color-bad)'][+L[S.i]['st_' + k]]);
}));

dash.draw('tabela', (tb) => {
  const e = dash.data('eventos');
  tb.replaceChildren(...(e.status === 'ok' ? e.data : []).map((r) => {
    const tr = document.createElement('tr');
    ['falha', 'inicio', 'horas', 'em_alarme', 'sinalizada', 'aviso'].forEach((c) => {
      const td = document.createElement('td'); td.textContent = r[c]; tr.append(td);
    });
    return tr;
  }));
});
