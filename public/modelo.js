/* modelo.js · Versão 4 · 26/11/2026 */
/* Modelo 3D fictício de uma unidade de produção de ar.
   Geometria própria, gerada por código, e desenho em WebGL (sem bibliotecas 3D nem modelos de terceiros). */
(() => {
const TAU = Math.PI * 2;
const soma = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const vezes = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const ponto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norma = (a) => vezes(a, 1 / (Math.hypot(...a) || 1));
const X = [1, 0, 0], Y = [0, 1, 0], Z = [0, 0, 1];

/* materiais: 0–5 fixos, 6–12 pintados conforme o estado dos sensores */
const CHAO = 0, ACO = 1, ESCURO = 2, BRANCO = 3, LATAO = 4, PRETO = 5;

/* cada peça: nome mostrado, sensores que definem a cor, material e ponto do rótulo */
const PECAS = {
  motor: { nome: 'Motor elétrico', curto: 'Motor', s: ['corrente'], m: 6, alvo: [-3.4, 0.45, 1.5], baixo: true },
  bloco: { nome: 'Compressor', curto: 'Compressor', s: ['tp2', 'carga'], m: 7, alvo: [-1.25, 0.45, 1.45], baixo: true },
  oleo: { nome: 'Resfriador de óleo', curto: 'Resfriador', s: ['oleo'], m: 8, alvo: [-3.75, 1.8, -1.2] },
  sep: { nome: 'Separador', curto: 'Separador', s: ['h1'], m: 9, alvo: [0.25, 0.55, 1.22], baixo: true },
  torres: { nome: 'Torres de secagem', curto: 'Secadores', s: ['dv'], m: 10, alvo: [1.87, 2.38, 0.95] },
  reserv: { nome: 'Reservatório', curto: 'Reservatório', s: ['reserv'], m: 11, alvo: [0.1, 1.64, -1.2] },
  painel: { nome: 'Painel pneumático', curto: 'Painel', s: ['tp3'], m: 12, alvo: [4.15, 0.62, 0.92], baixo: true }
};

/* ---------- primitivas ---------- */
function malha() {
  const v = [];
  const vert = (p, n, m) => v.push(p[0], p[1], p[2], n[0], n[1], n[2], m);
  const tri = (m, a, b, c, na, nb = na, nc = na) => { vert(a, na, m); vert(b, nb, m); vert(c, nc, m); };
  const quad = (m, a, b, c, d, na, nb = na, nc = na, nd = na) => { tri(m, a, b, c, na, nb, nc); tri(m, a, c, d, na, nc, nd); };

  /* caixa com eixos próprios (u, w) para peças inclinadas */
  function caixa(m, c, [dx, dy, dz], u = X, w = Y) {
    const a = vezes(u, dx / 2), b = vezes(w, dy / 2), d = vezes(norma(cruz(u, w)), dz / 2);
    const p = (i, j, k) => soma(soma(soma(c, vezes(a, i)), vezes(b, j)), vezes(d, k));
    const face = (n, q) => quad(m, ...q.map((s) => p(...s)), norma(n));
    face(a, [[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]]);
    face(vezes(a, -1), [[-1, -1, 1], [-1, 1, 1], [-1, 1, -1], [-1, -1, -1]]);
    face(b, [[-1, 1, -1], [-1, 1, 1], [1, 1, 1], [1, 1, -1]]);
    face(vezes(b, -1), [[-1, -1, 1], [-1, -1, -1], [1, -1, -1], [1, -1, 1]]);
    face(d, [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]);
    face(vezes(d, -1), [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]]);
  }

  const base = (eixo) => {
    const e = norma(cruz(eixo, Math.abs(eixo[1]) < 0.9 ? Y : X));
    return [e, cruz(eixo, e)];
  };

  /* sólido de revolução: perfil = lista de [posição no eixo, raio] */
  function torno(m, origem, eixo, perfil, n = 28) {
    const k = norma(eixo), [e, g] = base(k);
    const normais = perfil.slice(1).map(([t, r], i) => {
      const dt = t - perfil[i][0], dr = r - perfil[i][1], c = Math.hypot(dt, dr) || 1;
      return [-dr / c, dt / c]; /* [componente no eixo, componente radial] */
    });
    const suave = (i, j) => {
      const a = normais[i], b = normais[j];
      if (!b || a[0] * b[0] + a[1] * b[1] < 0.82) return a;
      const s = [a[0] + b[0], a[1] + b[1]], c = Math.hypot(...s);
      return [s[0] / c, s[1] / c];
    };
    for (let i = 0; i < perfil.length - 1; i++) {
      const [t0, r0] = perfil[i], [t1, r1] = perfil[i + 1];
      const n0 = suave(i, i - 1), n1 = suave(i, i + 1);
      for (let j = 0; j < n; j++) {
        const dir = (q) => { const a = q / n * TAU; return soma(vezes(e, Math.cos(a)), vezes(g, Math.sin(a))); };
        const A = dir(j), B = dir(j + 1);
        const p = (t, r, d) => soma(soma(origem, vezes(k, t)), vezes(d, r));
        const nn = (q, d) => soma(vezes(k, q[0]), vezes(d, q[1]));
        quad(m, p(t0, r0, A), p(t0, r0, B), p(t1, r1, B), p(t1, r1, A), nn(n0, A), nn(n0, B), nn(n1, B), nn(n1, A));
      }
    }
  }
  const cil = (m, a, b, r, n = 28) => {
    const L = Math.hypot(...sub(b, a));
    torno(m, a, sub(b, a), [[0, 0], [0, r], [L, r], [L, 0]], n);
  };

  /* anel (toro), inteiro ou em arco */
  function anel(m, c, eixo, R, r, de = 0, ate = TAU, n = 32) {
    const k = norma(eixo);
    let [e, g] = base(k);
    if (Math.abs(k[0]) > 0.9) { e = Z; g = Y; } /* eixo X: ângulo 90° aponta para cima */
    const q = 8;
    const p = (i, j) => {
      const a = de + (ate - de) * i / n, b = j / q * TAU;
      const d = soma(vezes(e, Math.cos(a)), vezes(g, Math.sin(a)));
      const nn = soma(vezes(d, Math.cos(b)), vezes(k, Math.sin(b)));
      return [soma(soma(c, vezes(d, R)), vezes(nn, r)), nn];
    };
    for (let i = 0; i < n; i++) for (let j = 0; j < q; j++) {
      const a = p(i, j), b = p(i + 1, j), d = p(i + 1, j + 1), f = p(i, j + 1);
      quad(m, a[0], b[0], d[0], f[0], a[1], b[1], d[1], f[1]);
    }
  }

  /* tubo ao longo de uma linha quebrada, com curvas arredondadas */
  function tubo(m, pts, r, curva = 0.22, n = 12) {
    const c = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) {
      const p = pts[i], a = sub(pts[i - 1], p), b = sub(pts[i + 1], p);
      const d = Math.min(curva, Math.hypot(...a) / 2, Math.hypot(...b) / 2);
      const ini = soma(p, vezes(norma(a), d)), fim = soma(p, vezes(norma(b), d));
      for (let s = 0; s <= 8; s++) {
        const t = s / 8;
        c.push(soma(soma(vezes(ini, (1 - t) * (1 - t)), vezes(p, 2 * t * (1 - t))), vezes(fim, t * t)));
      }
    }
    c.push(pts[pts.length - 1]);
    const limpa = c.filter((p, i) => !i || Math.hypot(...sub(p, c[i - 1])) > 1e-4);
    let e = null;
    const aneis = limpa.map((p, i) => {
      const t = norma(sub(limpa[Math.min(i + 1, limpa.length - 1)], limpa[Math.max(i - 1, 0)]));
      e = e ? norma(sub(e, vezes(t, ponto(e, t)))) : base(t)[0];
      const g = cruz(t, e);
      return Array.from({ length: n + 1 }, (_, j) => {
        const a = j / n * TAU, nn = soma(vezes(e, Math.cos(a)), vezes(g, Math.sin(a)));
        return [soma(p, vezes(nn, r)), nn];
      });
    });
    for (let i = 0; i < aneis.length - 1; i++) for (let j = 0; j < n; j++) {
      const a = aneis[i][j], b = aneis[i][j + 1], d = aneis[i + 1][j + 1], f = aneis[i + 1][j];
      quad(m, a[0], b[0], d[0], f[0], a[1], b[1], d[1], f[1]);
    }
  }

  /* círculo de parafusos sextavados */
  function parafusos(c, eixo, R, qtd, r = 0.035, alt = 0.05, m = ESCURO) {
    const k = norma(eixo), [e, g] = base(k);
    for (let i = 0; i < qtd; i++) {
      const a = (i + 0.5) / qtd * TAU;
      const p = soma(c, soma(vezes(e, R * Math.cos(a)), vezes(g, R * Math.sin(a))));
      cil(m, p, soma(p, vezes(k, alt)), r, 6);
    }
  }
  /* flange de tubulação */
  function flange(p, eixo, r) {
    const k = norma(eixo);
    cil(ACO, sub(p, vezes(k, 0.035)), soma(p, vezes(k, 0.035)), r, 20);
    parafusos(soma(p, vezes(k, 0.03)), k, r * 0.76, 6, 0.022, 0.035);
    parafusos(sub(p, vezes(k, 0.03)), vezes(k, -1), r * 0.76, 6, 0.022, 0.035);
  }
  /* registro com volante */
  function registro(p, eixo = Y) {
    const k = norma(eixo);
    cil(LATAO, p, soma(p, vezes(k, 0.12)), 0.07, 12);
    cil(ACO, soma(p, vezes(k, 0.12)), soma(p, vezes(k, 0.2)), 0.02, 8);
    anel(ESCURO, soma(p, vezes(k, 0.2)), k, 0.085, 0.018, 0, TAU, 18);
  }
  return { v, tri, quad, caixa, cil, torno, anel, tubo, parafusos, flange, registro };
}

/* perfil abaulado (tampo de vaso) a partir de t0, no sentido s, altura h */
const tampo = (t0, r, h, s = 1) => Array.from({ length: 9 }, (_, i) => {
  const a = i / 8 * Math.PI / 2;
  return [t0 + s * h * Math.sin(a), r * Math.cos(a)];
});

/* ---------- peças ---------- */
function base(g) {
  [-2.3, 2.3].forEach((z) => { g.caixa(CHAO, [0, -0.1, z], [10.2, 0.26, 0.14]); });
  [-5.03, -2.5, 0, 2.5, 5.03].forEach((x) => g.caixa(CHAO, [x, -0.12, 0], [0.14, 0.2, 4.5]));
  g.caixa(CHAO, [0, -0.2, 0], [10.1, 0.04, 4.5]);
  for (const x of [-4.8, 4.8]) for (const z of [-2.05, 2.05]) {
    g.cil(ESCURO, [x, -0.18, z], [x, -0.06, z], 0.16, 16);
    g.cil(ACO, [x, -0.06, z], [x, 0.0, z], 0.06, 6);
  }
}

function motor(g, m) {
  const y = 0.85, z = 0.95, E = X;
  const em = (x) => [x, y, z];
  /* carcaça e aletas */
  g.cil(m, em(-4.02), em(-2.66), 0.5, 40);
  for (let i = 0; i < 30; i++) {
    const a = i / 30 * TAU, dir = [0, Math.sin(a), Math.cos(a)];
    if (dir[1] < -0.86) continue;
    g.caixa(m, soma(em(-3.34), vezes(dir, 0.55)), [1.26, 0.12, 0.024], E, dir);
  }
  /* tampas */
  g.torno(m, em(-2.68), E, [[0, 0], [0, 0.6], [0.1, 0.6], [0.16, 0.46], [0.22, 0.24], [0.28, 0.2], [0.28, 0]], 36);
  g.parafusos(em(-2.58), E, 0.52, 8);
  g.cil(m, em(-4.1), em(-4.0), 0.6, 36);
  /* capa do ventilador e grade */
  g.torno(ESCURO, em(-4.58), E, [[0.02, 0.5], [0, 0.56], [0.05, 0.62], [0.5, 0.62], [0.5, 0.55]], 36);
  [0.12, 0.26, 0.4, 0.5].forEach((r) => g.anel(ACO, em(-4.6), E, r, 0.016));
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI;
    g.caixa(ACO, em(-4.605), [0.025, 1.06, 0.025], E, [0, Math.sin(a), Math.cos(a)]);
  }
  g.cil(ESCURO, em(-4.57), em(-4.55), 0.5, 36);
  /* caixa de ligação, prensa-cabos e cabo */
  g.caixa(m, [-3.45, 1.55, z], [0.52, 0.22, 0.48]);
  g.caixa(ACO, [-3.45, 1.68, z], [0.58, 0.05, 0.54]);
  for (const dx of [-0.2, 0.2]) for (const dz of [-0.18, 0.18]) g.cil(ESCURO, [-3.45 + dx, 1.7, z + dz], [-3.45 + dx, 1.73, z + dz], 0.028, 6);
  g.cil(LATAO, [-3.45, 1.55, z + 0.24], [-3.45, 1.55, z + 0.34], 0.07, 8);
  g.tubo(PRETO, [[-3.45, 1.55, z + 0.32], [-3.45, 1.55, 1.85], [-3.45, 0.05, 1.85], [-4.6, 0.05, 1.85]], 0.045, 0.3);
  /* olhal, placa de identificação e pés */
  g.anel(ACO, [-2.9, 1.52, z], Z, 0.08, 0.024);
  g.caixa(ACO, [-3.1, 0.9, z + 0.625], [0.36, 0.2, 0.02]);
  [-3.82, -2.88].forEach((x) => {
    g.caixa(m, [x, 0.27, z], [0.26, 0.3, 0.9]);
    g.caixa(m, [x, 0.13, z], [0.34, 0.09, 1.3]);
    [-0.55, 0.55].forEach((d) => g.cil(ESCURO, [x, 0.17, z + d], [x, 0.23, z + d], 0.05, 6));
  });
  g.caixa(ACO, [-3.35, 0.04, z], [1.5, 0.08, 1.42]);
  /* eixo, acoplamento e proteção */
  g.cil(ACO, em(-2.42), em(-1.9), 0.085, 20);
  [-2.28, -2.1].forEach((x) => { g.cil(ESCURO, em(x - 0.06), em(x + 0.06), 0.23, 24); g.parafusos(em(x + 0.055), E, 0.16, 6, 0.025, 0.03, ACO); });
  g.cil(PRETO, em(-2.22), em(-2.16), 0.19, 24);
  [-2.38, -2.2, -2.02].forEach((x) => g.anel(LATAO, em(x), E, 0.33, 0.018, 0, Math.PI, 20));
  for (let i = 1; i < 6; i++) {
    const a = i / 6 * Math.PI;
    g.cil(LATAO, [-2.38, y + 0.33 * Math.sin(a), z + 0.33 * Math.cos(a)], [-2.02, y + 0.33 * Math.sin(a), z + 0.33 * Math.cos(a)], 0.012, 6);
  }
}

function compressor(g, m) {
  const z = 0.95;
  /* flange de entrada do acionamento */
  g.torno(m, [-1.96, 0.85, z], X, [[0, 0], [0, 0.34], [0.08, 0.5], [0.18, 0.5], [0.18, 0]], 36);
  g.parafusos([-1.78, 0.85, z], X, 0.43, 10);
  /* carcaça dos dois rotores */
  g.cil(m, [-1.8, 0.7, z + 0.14], [-0.82, 0.7, z + 0.14], 0.4, 32);
  g.cil(m, [-1.8, 1.0, z - 0.16], [-0.82, 1.0, z - 0.16], 0.32, 32);
  g.caixa(m, [-1.31, 0.82, z], [0.94, 0.4, 0.5]);
  [-1.55, -1.33, -1.11].forEach((x) => {
    g.anel(m, [x, 0.7, z + 0.14], X, 0.4, 0.028);
    g.anel(m, [x, 1.0, z - 0.16], X, 0.32, 0.024);
  });
  /* tampa de descarga */
  g.torno(m, [-0.84, 0.82, z], X, [[0, 0], [0, 0.52], [0.1, 0.52], [0.16, 0.38], [0.26, 0.3], [0.26, 0]], 36);
  g.parafusos([-0.74, 0.82, z], X, 0.45, 10);
  g.cil(ACO, [-0.6, 0.62, z + 0.12], [-0.52, 0.62, z + 0.12], 0.1, 16);
  /* válvula de admissão e filtro de ar */
  g.cil(ACO, [-1.35, 1.2, z], [-1.35, 1.42, z], 0.2, 24);
  g.flange([-1.35, 1.43, z], Y, 0.28);
  g.cil(ACO, [-1.35, 1.46, z], [-1.35, 1.6, z], 0.14, 20);
  g.cil(LATAO, [-1.35, 1.36, z + 0.18], [-1.35, 1.36, z + 0.36], 0.075, 12);
  g.torno(ESCURO, [-1.35, 1.6, z], Y, [[0, 0], [0, 0.34], [0.05, 0.36], [0.07, 0.3]], 32);
  g.cil(m, [-1.35, 1.66, z], [-1.35, 1.96, z], 0.28, 32);
  for (let i = 0; i < 6; i++) g.anel(ACO, [-1.35, 1.69 + i * 0.048, z], Y, 0.295, 0.014);
  g.torno(ESCURO, [-1.35, 1.96, z], Y, [[0, 0.36], [0.04, 0.35], ...tampo(0.05, 0.3, 0.07)], 32);
  g.cil(ACO, [-1.35, 2.07, z], [-1.35, 2.12, z], 0.04, 6);
  /* visor, bujão e pés */
  g.cil(ACO, [-1.1, 0.62, z + 0.5], [-1.1, 0.62, z + 0.57], 0.09, 20);
  g.cil(LATAO, [-1.1, 0.62, z + 0.57], [-1.1, 0.62, z + 0.585], 0.06, 20);
  [-1.65, -0.98].forEach((x) => {
    g.caixa(m, [x, 0.27, z], [0.2, 0.34, 0.62]);
    g.caixa(ACO, [x, 0.08, z], [0.3, 0.1, 1.04]);
    [-0.44, 0.44].forEach((d) => g.cil(ESCURO, [x, 0.13, z + d], [x, 0.19, z + d], 0.045, 6));
  });
}

function resfriador(g, m) {
  const z = -1.2;
  /* colmeia com aletas */
  g.caixa(ESCURO, [-3.5, 1.0, z - 0.06], [1.5, 1.36, 0.12]);
  for (let i = 0; i <= 34; i++) g.caixa(m, [-4.22 + i * 0.0424, 1.0, z + 0.03], [0.014, 1.34, 0.12]);
  for (let i = 0; i <= 6; i++) g.caixa(m, [-3.5, 0.38 + i * 0.207, z + 0.02], [1.48, 0.02, 0.12]);
  /* coletores laterais e travessas */
  [-4.36, -2.64].forEach((x) => {
    g.torno(m, [x, 0.3, z], Y, [...tampo(0, 0.13, 0.08, -1).reverse(), [1.4, 0.13], ...tampo(1.4, 0.13, 0.08)], 20);
  });
  [0.26, 1.74].forEach((y) => g.caixa(ACO, [-3.5, y, z], [1.9, 0.1, 0.34]));
  [-4.3, -2.7].forEach((x) => { g.caixa(ACO, [x, 0.12, z], [0.12, 0.24, 0.12]); g.caixa(ACO, [x, 0.03, z], [0.2, 0.06, 0.7]); });
  /* ventilador */
  const c = [-3.5, 1.0, z + 0.24];
  g.anel(ACO, c, Z, 0.62, 0.045);
  g.anel(ACO, soma(c, [0, 0, 0.1]), Z, 0.42, 0.014);
  g.anel(ACO, soma(c, [0, 0, 0.1]), Z, 0.22, 0.014);
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * TAU, d = [Math.cos(a), Math.sin(a), 0], t = norma([-Math.sin(a), Math.cos(a), 0.7]);
    g.caixa(ESCURO, soma(c, vezes(d, 0.34)), [0.44, 0.22, 0.018], d, t);
  }
  g.torno(ACO, c, Z, [[-0.1, 0], [-0.1, 0.13], [0.05, 0.13], ...tampo(0.05, 0.13, 0.07)], 24);
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * Math.PI + 0.39;
    g.caixa(ACO, soma(c, [0, 0, 0.11]), [1.24, 0.018, 0.018], [Math.cos(a), Math.sin(a), 0], [-Math.sin(a), Math.cos(a), 0]);
  }
  /* tampa de enchimento */
  g.cil(LATAO, [-4.36, 1.76, z], [-4.36, 1.9, z], 0.065, 8);
  /* filtro de óleo ao lado do compressor */
  g.cil(ACO, [-2.0, 0.55, 0.12], [-2.0, 0.7, 0.12], 0.2, 24);
  g.torno(m, [-2.0, 0.55, 0.12], Y, [...tampo(-0.34, 0.17, 0.06, -1).reverse(), [-0.34, 0.17], [0, 0.17], [0, 0]], 24);
  g.anel(ACO, [-2.0, 0.25, 0.12], Y, 0.175, 0.016);
  g.caixa(ACO, [-2.0, 0.1, 0.0], [0.12, 1.1, 0.06]);
}

function separador(g, m) {
  const x = 0.25, z = 0.95;
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * TAU + 0.5, d = [Math.cos(a), 0, Math.sin(a)];
    g.cil(ACO, [x + d[0] * 0.46, 0.0, z + d[2] * 0.46], [x + d[0] * 0.32, 0.75, z + d[2] * 0.32], 0.035, 8);
    g.cil(ESCURO, [x + d[0] * 0.46, -0.02, z + d[2] * 0.46], [x + d[0] * 0.46, 0.04, z + d[2] * 0.46], 0.08, 12);
  }
  g.torno(m, [x, 0, z], Y, [[0.28, 0], [0.28, 0.09], [0.66, 0.36], [1.42, 0.36]], 36);
  g.cil(ACO, [x, 1.41, z], [x, 1.47, z], 0.44, 36);
  g.cil(ACO, [x, 1.485, z], [x, 1.545, z], 0.44, 36);
  g.parafusos([x, 1.545, z], Y, 0.395, 12);
  g.torno(m, [x, 0, z], Y, [[1.54, 0.36], ...tampo(1.58, 0.36, 0.22)], 36);
  g.anel(ACO, [x, 0.9, z], Y, 0.365, 0.022);
  g.flange([x, 1.83, z], Y, 0.15);
  g.cil(LATAO, [x, 0.16, z], [x, 0.3, z], 0.055, 12);
  g.registro([x, 0.19, z + 0.04], Z);
  g.cil(LATAO, [x + 0.1, 1.2, z + 0.34], [x + 0.14, 1.2, z + 0.47], 0.05, 10);
}

function secadores(g, m) {
  const z = 0.95;
  g.caixa(ACO, [1.87, 0.3, z], [1.86, 0.34, 0.66]);
  [1.05, 2.69].forEach((x) => g.caixa(ESCURO, [x, 0.07, z], [0.14, 0.14, 0.8]));
  [1.42, 2.32].forEach((x) => {
    g.flange([x, 0.52, z], Y, 0.4);
    g.cil(m, [x, 0.54, z], [x, 2.02, z], 0.33, 36);
    g.torno(m, [x, 0, z], Y, tampo(2.02, 0.33, 0.17), 36);
    g.flange([x, 2.0, z], Y, 0.39);
    [0.9, 1.6].forEach((y) => g.anel(ESCURO, [x, y, z], Y, 0.34, 0.026));
    g.cil(LATAO, [x, 2.17, z], [x, 2.3, z], 0.075, 12);
  });
  g.tubo(ACO, [[1.42, 2.22, z], [1.42, 2.36, z], [2.32, 2.36, z], [2.32, 2.22, z]], 0.06, 0.1);
  [1.25, 1.7, 2.15, 2.5].forEach((x, i) => {
    g.caixa(ESCURO, [x, 0.3, z + 0.4], [0.24, 0.2, 0.16]);
    g.cil(LATAO, [x, 0.3, z + 0.47], [x, 0.3, z + 0.58], 0.055, 10);
    g.caixa(i % 2 ? ACO : LATAO, [x, 0.44, z + 0.4], [0.13, 0.09, 0.12]);
  });
  g.caixa(ACO, [1.87, 1.25, z], [0.28, 0.1, 0.12]);
  g.tubo(ACO, [[2.8, 0.28, z], [3.08, 0.28, z], [3.08, 0.28, 1.65]], 0.055, 0.12);
  g.cil(LATAO, [3.08, 0.28, 1.6], [3.08, 0.28, 1.92], 0.12, 20);
  [1.66, 1.74, 1.82].forEach((zz) => g.anel(ESCURO, [3.08, 0.28, zz], Z, 0.125, 0.012, 0, TAU, 20));
}

function reservatorio(g, m) {
  const y = 0.98, z = -1.2, r = 0.66;
  g.torno(m, [0, y, z], X, [...tampo(-1.25, r, 0.34, -1).reverse(), [2.45, r], ...tampo(2.45, r, 0.34)], 44);
  [-1.2, 2.4].forEach((x) => g.anel(m, [x, y, z], X, r, 0.022, 0, TAU, 44));
  [-0.7, 1.9].forEach((x) => {
    g.anel(ESCURO, [x, y, z], X, r + 0.015, 0.03, 0, TAU, 44);
    g.caixa(ACO, [x, 0.27, z], [0.22, 0.34, 0.9]);
    g.caixa(ACO, [x, 0.05, z], [0.34, 0.1, 1.34]);
    [-0.56, 0.56].forEach((d) => g.cil(ESCURO, [x, 0.1, z + d], [x, 0.16, z + d], 0.045, 6));
  });
  /* válvula de segurança, bocais e dreno */
  g.cil(ACO, [-0.2, y + r - 0.02, z], [-0.2, y + r + 0.1, z], 0.1, 16);
  g.cil(LATAO, [-0.2, y + r + 0.1, z], [-0.2, y + r + 0.32, z], 0.07, 12);
  g.anel(ESCURO, [-0.2, y + r + 0.37, z], Z, 0.05, 0.014, 0, TAU, 16);
  g.flange([1.5, y + r + 0.04, z], Y, 0.15);
  g.cil(ACO, [0.7, y - r - 0.1, z], [0.7, y - r + 0.02, z], 0.05, 10);
  g.registro([0.7, y - r - 0.06, z + 0.03], Z);
  g.caixa(ACO, [0.55, y, z + r + 0.005], [0.5, 0.24, 0.02]);
}

const MOSTRADORES = [{ c: [3.8, 1.55, 0.93], campo: 'tp3' }, { c: [4.5, 1.55, 0.93], campo: 'reserv' }];
const ANG = (v) => Math.PI * 1.25 - Math.max(0, Math.min(12, v)) / 12 * Math.PI * 1.5;

function painel(g, m) {
  [3.6, 4.7].forEach((x) => { g.caixa(ACO, [x, 0.3, 0.75], [0.1, 0.62, 0.1]); g.caixa(ESCURO, [x, 0.03, 0.75], [0.2, 0.06, 0.7]); });
  g.caixa(m, [4.15, 1.28, 0.74], [1.5, 1.5, 0.26]);
  g.caixa(ACO, [4.15, 2.06, 0.74], [1.58, 0.07, 0.34]);
  MOSTRADORES.forEach(({ c: [x, y, z] }) => {
    g.cil(ACO, [x, y, z - 0.08], [x, y, z - 0.02], 0.29, 36);
    g.anel(LATAO, [x, y, z - 0.015], Z, 0.275, 0.026, 0, TAU, 36);
    g.cil(BRANCO, [x, y, z - 0.03], [x, y, z - 0.012], 0.26, 36);
    for (let i = 0; i <= 12; i++) {
      const a = ANG(i), d = [Math.cos(a), Math.sin(a), 0], longa = i % 3 === 0;
      g.caixa(PRETO, [x + d[0] * (longa ? 0.2 : 0.215), y + d[1] * (longa ? 0.2 : 0.215), z - 0.008], [longa ? 0.07 : 0.04, longa ? 0.018 : 0.01, 0.006], d, [-d[1], d[0], 0]);
    }
  });
  [3.68, 4.0, 4.32, 4.62].forEach((x, i) => {
    g.cil(ACO, [x, 1.03, 0.86], [x, 1.03, 0.89], 0.085, 16);
    g.torno(i === 3 ? LATAO : m, [x, 1.03, 0.89], Z, tampo(0, 0.055, 0.05), 16);
  });
  [3.75, 4.15, 4.55].forEach((x) => {
    g.caixa(ESCURO, [x, 0.74, 0.92], [0.2, 0.2, 0.12]);
    g.registro([x, 0.74, 0.97], Z);
  });
  g.tubo(LATAO, [[3.75, 0.64, 0.92], [3.75, 0.52, 0.92], [4.55, 0.52, 0.92], [4.55, 0.64, 0.92]], 0.028, 0.07, 8);
}

function tubulacao(g) {
  /* compressor → separador */
  g.tubo(ACO, [[-0.55, 0.62, 1.07], [-0.32, 0.62, 1.07], [-0.32, 1.0, 0.95], [-0.08, 1.0, 0.95]], 0.075, 0.14);
  g.flange([-0.5, 0.62, 1.07], X, 0.14); g.flange([-0.12, 1.0, 0.95], X, 0.14);
  /* separador → secadores */
  g.tubo(ACO, [[0.25, 1.84, 0.95], [0.25, 2.1, 0.95], [0.78, 2.1, 0.95], [0.78, 0.32, 0.95], [0.96, 0.32, 0.95]], 0.07, 0.18);
  g.flange([0.78, 1.2, 0.95], Y, 0.13);
  /* secadores → reservatório */
  g.tubo(ACO, [[1.87, 2.36, 0.95], [1.87, 2.36, -0.1], [1.5, 2.2, -1.2], [1.5, 1.66, -1.2]], 0.065, 0.24);
  g.cil(LATAO, [1.87, 2.36, 0.82], [1.87, 2.36, 1.02], 0.09, 12);
  /* reservatório → painel */
  g.tubo(ACO, [[2.76, 0.98, -1.2], [4.15, 0.98, -1.2], [4.15, 0.98, 0.62]], 0.07, 0.25);
  g.flange([2.86, 0.98, -1.2], X, 0.14); g.flange([4.15, 0.98, -0.2], Z, 0.13); g.registro([3.5, 1.04, -1.2]);
  /* mangueiras de óleo */
  g.tubo(PRETO, [[-1.62, 0.46, 0.65], [-1.62, 0.18, 0.5], [-1.62, 0.18, -0.55], [-2.2, 0.45, -1.2], [-2.52, 0.45, -1.2]], 0.07, 0.28);
  g.tubo(PRETO, [[-2.52, 1.55, -1.2], [-2.1, 1.55, -1.2], [-2.0, 1.5, -0.2], [-2.0, 0.7, 0.12]], 0.07, 0.3);
  g.tubo(PRETO, [[-1.85, 0.62, 0.12], [-1.6, 0.62, 0.2], [-1.55, 0.7, 0.6]], 0.055, 0.14);
}

let cena = null;
function montar() {
  if (cena) return cena;
  const g = malha();
  base(g); motor(g, 6); compressor(g, 7); resfriador(g, 8); separador(g, 9); secadores(g, 10); reservatorio(g, 11); painel(g, 12); tubulacao(g);
  const limites = [];
  for (let i = 0; i < g.v.length; i += 7 * 11) limites.push([g.v[i], g.v[i + 1], g.v[i + 2]]);
  cena = { v: new Float32Array(g.v), limites };
  return cena;
}
function ponteiros(linha) {
  const g = malha();
  MOSTRADORES.forEach(({ c: [x, y, z], campo }) => {
    const a = ANG(linha ? +linha[campo] : 0), d = [Math.cos(a), Math.sin(a), 0];
    g.caixa(PRETO, [x + d[0] * 0.08, y + d[1] * 0.08, z + 0.008], [0.24, 0.024, 0.008], d, [-d[1], d[0], 0]);
    g.cil(LATAO, [x, y, z], [x, y, z + 0.025], 0.035, 12);
  });
  return new Float32Array(g.v);
}

/* ---------- WebGL ---------- */
const VS = `
attribute vec3 aPos; attribute vec3 aNor; attribute float aMat;
uniform mat3 uRot; uniform vec3 uCentro; uniform vec2 uMeio; uniform vec2 uEsc; uniform vec2 uProf;
uniform vec3 uCor[13]; uniform float uBrilho[13];
varying vec3 vNor; varying vec3 vCor; varying float vBrilho;
void main(){
  vec3 p = uRot * (aPos - uCentro);
  float D = uProf.x, R = uProf.y, d = D - p.z, w = d / D, n = D - R, f = D + R;
  int m = int(aMat + 0.5);
  vNor = uRot * aNor; vCor = uCor[m]; vBrilho = uBrilho[m];
  gl_Position = vec4((p.xy - uMeio * w) * uEsc, ((f + n) * d - 2.0 * f * n) / ((f - n) * D), w);
}`;
const FS = `
precision mediump float;
varying vec3 vNor; varying vec3 vCor; varying float vBrilho;
void main(){
  vec3 n = normalize(vNor);
  if (n.z < -0.05) n = -n;
  vec3 l = normalize(vec3(-0.35, 0.75, 0.65));
  float dif = max(dot(n, l), 0.0);
  float enche = max(dot(n, normalize(vec3(0.8, 0.1, 0.4))), 0.0);
  float esp = pow(max(dot(n, normalize(l + vec3(0.0, 0.0, 1.0))), 0.0), 36.0);
  float borda = pow(1.0 - max(n.z, 0.0), 3.0);
  vec3 c = vCor * (0.40 + 0.54 * dif + 0.12 * enche) + 0.7 * vBrilho * esp + 0.08 * borda;
  gl_FragColor = vec4(c, 1.0);
}`;

let gpu;
function iniciar() {
  if (gpu !== undefined && !(gpu && gpu.gl.isContextLost())) return gpu;
  const tela = document.createElement('canvas');
  const gl = tela.getContext('webgl', { antialias: true, alpha: true });
  if (!gl) return (gpu = null);
  const prog = gl.createProgram();
  [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, FS]].forEach(([tipo, src]) => {
    const s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
    gl.attachShader(prog, s);
  });
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(prog)); return (gpu = null); }
  gl.useProgram(prog); gl.enable(gl.DEPTH_TEST);
  const fixo = gl.createBuffer(), movel = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, fixo); gl.bufferData(gl.ARRAY_BUFFER, montar().v, gl.STATIC_DRAW);
  const atr = ['aPos', 'aNor', 'aMat'].map((n) => gl.getAttribLocation(prog, n));
  const u = (n) => gl.getUniformLocation(prog, n);
  gpu = { tela, gl, fixo, movel, atr, u };
  return gpu;
}

window.GD_estado = (linha, peca) => Math.max(...PECAS[peca].s.map((s) => +linha['st_' + s]));

/* desenha o modelo; cam = {giro, incl} */
window.GD_desenhar = (canvas, linha, cam) => {
  const w = canvas.parentElement.clientWidth || 320;
  const h = Math.round(w < 520 ? Math.max(240, w * 0.85) : Math.min(480, w * 0.62));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = Math.round(w * dpr), H = Math.round(h * dpr);
  if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; canvas.style.height = h + 'px'; }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H);
  const css = getComputedStyle(canvas);
  const texto = css.color, fundo = css.getPropertyValue('--color-panel').trim() || '#fff';
  const g = iniciar();
  if (!g) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = texto; ctx.font = '13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Este navegador não conseguiu abrir o modelo 3D (WebGL).', w / 2, h / 2);
    return;
  }
  const { gl, u } = g, C = montar();

  /* câmera: gira em torno do eixo vertical e inclina; enquadra o modelo inteiro */
  const cy = Math.cos(cam.giro), sy = Math.sin(cam.giro), cx = Math.cos(cam.incl), sx = Math.sin(cam.incl);
  const rot = [[cy, 0, sy], [sx * sy, cx, -sx * cy], [-cx * sy, sx, cx * cy]];
  const centro = [0, 0.9, 0], D = 22, R = 8;
  const proj = (p) => {
    const q = sub(p, centro), r = rot.map((l) => ponto(l, q)), k = D / (D - r[2]);
    return [r[0] * k, r[1] * k];
  };
  const todos = C.limites.map(proj);
  const [x0, x1] = d3.extent(todos, (p) => p[0]), [y0, y1] = d3.extent(todos, (p) => p[1]);
  const estreito = w < 520, topo = estreito ? 44 : 54, pe = estreito ? 40 : 46, lado = 8;
  const esc = Math.min((w - 2 * lado) / (x1 - x0), (h - topo - pe) / (y1 - y0));
  const meio = [(x0 + x1) / 2, (y0 + y1) / 2 + (topo - pe) / 2 / esc];

  if (g.tela.width !== W || g.tela.height !== H) { g.tela.width = W; g.tela.height = H; }
  gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  const cor = (v, alt) => d3.rgb(d3.color(css.getPropertyValue(v).trim()) || alt);
  const estados = [cor('--color-ok', '#2e8b57'), cor('--color-warn', '#d99a00'), cor('--color-bad', '#c0392b')];
  const cores = ['#565c66', '#aab2bd', '#3b414a', '#f4f4ef', '#c29b52', '#17191c'].map((c) => d3.rgb(c));
  Object.entries(PECAS).forEach(([id, p]) => { cores[p.m] = linha ? estados[GD_estado(linha, id)] : d3.rgb('#8a8f98'); });
  gl.uniformMatrix3fv(u('uRot'), false, [0, 1, 2].flatMap((c) => rot.map((l) => l[c])));
  gl.uniform3fv(u('uCentro'), centro);
  gl.uniform2f(u('uMeio'), meio[0], meio[1]);
  gl.uniform2f(u('uEsc'), esc * 2 / w, esc * 2 / h);
  gl.uniform2f(u('uProf'), D, R);
  gl.uniform3fv(u('uCor'), cores.flatMap((c) => [c.r / 255, c.g / 255, c.b / 255]));
  gl.uniform1fv(u('uBrilho'), cores.map((_, i) => [0.05, 0.45, 0.18, 0.1, 0.5, 0.1][i] ?? 0.22));
  const desenha = (buf, n) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    [[3, 0], [3, 12], [1, 24]].forEach(([tam, desloc], i) => {
      gl.enableVertexAttribArray(g.atr[i]); gl.vertexAttribPointer(g.atr[i], tam, gl.FLOAT, false, 28, desloc);
    });
    gl.drawArrays(gl.TRIANGLES, 0, n / 7);
  };
  desenha(g.fixo, C.v.length);
  const p = ponteiros(linha);
  gl.bindBuffer(gl.ARRAY_BUFFER, g.movel); gl.bufferData(gl.ARRAY_BUFFER, p, gl.DYNAMIC_DRAW);
  desenha(g.movel, p.length);
  ctx.drawImage(g.tela, 0, 0);

  /* rótulos com linha de chamada, sem sobreposição */
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const tam = estreito ? 10 : 12, afasta = estreito ? 28 : 40;
  ctx.font = `${tam}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const postos = [];
  Object.entries(PECAS).map(([id, pc]) => {
    const q = proj(pc.alvo);
    const x = w / 2 + (q[0] - meio[0]) * esc, y = h / 2 - (q[1] - meio[1]) * esc;
    const nome = (estreito ? pc.curto : pc.nome) + (linha && GD_estado(linha, id) ? ' ⚠' : '');
    return { id, x, y, nome, sentido: pc.baixo ? 1 : -1 };
  }).sort((a, b) => a.x - b.x).forEach((r) => {
    /* peças da frente têm o rótulo embaixo; as demais, em cima */
    const larg = ctx.measureText(r.nome).width + 18, alt = tam + 8;
    const tx = Math.max(larg / 2 + 2, Math.min(w - larg / 2 - 2, r.x));
    const livre = (y) => !postos.some((o) => Math.abs(o.x - tx) < (o.l + larg) / 2 + 3 && Math.abs(o.y - y) < alt + 2);
    const dentro = (y) => Math.max(alt / 2 + 1, Math.min(h - alt / 2 - 1, y));
    const ideal = r.y + r.sentido * afasta;
    let ty = dentro(ideal);
    for (let k = 1; !livre(ty) && k < 24; k++) {
      ty = dentro(ideal + (k % 2 ? r.sentido : -r.sentido) * Math.ceil(k / 2) * (alt + 3));
    }
    postos.push({ x: tx, y: ty, l: larg });
    ctx.strokeStyle = texto; ctx.globalAlpha = 0.55; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(r.x, r.y); ctx.stroke();
    ctx.beginPath(); ctx.arc(r.x, r.y, 2, 0, TAU); ctx.fillStyle = texto; ctx.fill();
    ctx.globalAlpha = 0.92; ctx.fillStyle = fundo; ctx.fillRect(tx - larg / 2, ty - alt / 2, larg, alt);
    ctx.globalAlpha = 1;
    const e = linha ? estados[GD_estado(linha, r.id)] : null;
    if (e) { ctx.fillStyle = e.formatRgb(); ctx.fillRect(tx - larg / 2, ty - alt / 2, 4, alt); }
    ctx.fillStyle = texto; ctx.fillText(r.nome, tx + 2, ty);
  });
};
})();
