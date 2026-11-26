/* painel.js · Versão 2 · 26/11/2026
   Liga os cálculos e desenhos da página aos dados vindos de /api/horas. */
(() => {
  const calcs = new Map(), draws = new Map();
  let horas = { status: 'loading', data: [] };

  function data(id) {
    if (id === 'horas') return horas;
    const c = calcs.get(id);
    if (!c) return { status: 'error', data: [] };
    if (!c.saida) {
      const entradas = c.inputs.map(data);
      const pendente = entradas.find((e) => e.status !== 'ok');
      if (pendente) return { status: pendente.status, data: [] };
      c.saida = { status: 'ok', data: c.fn(...entradas.map((e) => e.data)) };
    }
    return c.saida;
  }

  function rodar(nome) {
    const d = draws.get(nome);
    if (!d) return;
    document.querySelectorAll(`[data-draw="${nome}"]`).forEach((el) => {
      if (typeof d.f === 'function') return d.f(el);
      if (!d.montados.has(el)) { el.replaceChildren(); d.montados.set(el, d.f.mount(el)); }
      d.f.update(el, d.montados.get(el));
    });
  }
  const rodarTudo = () => draws.forEach((_, nome) => rodar(nome));

  window.dash = {
    colors: ['#2a78d6'],
    data,
    calc: (id, c) => calcs.set(id, { ...c }),
    draw: (nome, f) => { if (f) draws.set(nome, { f, montados: new WeakMap() }); rodar(nome); }
  };

  window.carregarDados = async () => {
    try {
      const r = await fetch('api/horas');
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const linhas = await r.json();
      if (!Array.isArray(linhas) || !linhas.length) throw new Error('sem dados');
      horas = { status: 'ok', data: linhas };
    } catch (e) {
      console.error('Falha ao carregar os dados:', e);
      horas = { status: 'error', data: [] };
    }
    calcs.forEach((c) => { delete c.saida; });
    rodarTudo();
  };

  let espera;
  addEventListener('resize', () => { clearTimeout(espera); espera = setTimeout(rodarTudo, 150); });
})();
