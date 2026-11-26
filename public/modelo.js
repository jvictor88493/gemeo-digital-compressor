/* modelo.js · Versão 2 · 26/11/2026 */
/* Modelo 3D simplificado, desenhado em canvas (sem bibliotecas externas). */
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

function caixa(c, d, peca) {
  const p = [];
  for (let i = 0; i < 8; i++) p.push(add(c, [(i & 1 ? 1 : -1) * d[0] / 2, (i & 2 ? 1 : -1) * d[1] / 2, (i & 4 ? 1 : -1) * d[2] / 2]));
  return [[0, 2, 3, 1], [4, 5, 7, 6], [0, 1, 5, 4], [2, 6, 7, 3], [0, 4, 6, 2], [1, 3, 7, 5]]
    .map((f) => ({ v: f.map((i) => p[i]), peca }));
}

/* cilindro entre os pontos a e b */
function cilindro(a, b, r, peca, n = 16) {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(...d), u = d.map((x) => x / L);
  const ref = Math.abs(u[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const cruz = (p, q) => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
  let e = cruz(u, ref); const m = Math.hypot(...e); e = e.map((x) => x / m);
  const g = cruz(u, e);
  const anel = (c) => Array.from({ length: n }, (_, i) => {
    const k = i / n * 2 * Math.PI;
    return add(c, e.map((x, j) => r * (x * Math.cos(k) + g[j] * Math.sin(k))));
  });
  const A = anel(a), B = anel(b);
  const faces = A.map((_, i) => ({ v: [A[i], A[(i + 1) % n], B[(i + 1) % n], B[i]], peca }));
  faces.push({ v: [...A].reverse(), peca }, { v: B, peca });
  return faces;
}

/* cada peça: nome mostrado e sensores que definem a sua cor */
const PECAS = {
  motor: { nome: 'Motor', s: ['corrente'] },
  bloco: { nome: 'Compressor', s: ['tp2', 'carga'] },
  oleo: { nome: 'Óleo', s: ['oleo'] },
  sep: { nome: 'Separador', s: ['h1'] },
  torres: { nome: 'Secadores', s: ['dv'] },
  reserv: { nome: 'Reservatório', s: ['reserv'] },
  painel: { nome: 'Painel', s: ['tp3'] }
};

const faces = [
  ...caixa([0, -0.15, 0], [8.4, 0.2, 4.2], 'chao'),
  ...cilindro([-3.6, 0.75, 0.9], [-2.0, 0.75, 0.9], 0.6, 'motor'),
  ...cilindro([-2.0, 0.75, 0.9], [-1.6, 0.75, 0.9], 0.16, 'base'),
  ...caixa([-1.0, 0.75, 0.9], [1.2, 1.3, 1.2], 'bloco'),
  ...caixa([-1.0, 1.55, 0.9], [0.8, 0.3, 0.8], 'bloco'),
  ...caixa([-3.0, 0.7, -1.1], [1.6, 1.4, 0.7], 'oleo'),
  ...cilindro([0.4, 0.0, 0.9], [0.4, 1.4, 0.9], 0.3, 'sep'),
  ...cilindro([1.5, 0.0, 0.9], [1.5, 2.1, 0.9], 0.36, 'torres'),
  ...cilindro([2.4, 0.0, 0.9], [2.4, 2.1, 0.9], 0.36, 'torres'),
  ...cilindro([-0.6, 0.75, -1.1], [2.8, 0.75, -1.1], 0.7, 'reserv'),
  ...caixa([3.5, 1.0, 0], [0.5, 1.9, 1.3], 'painel'),
  ...cilindro([-0.4, 1.0, 0.9], [0.1, 1.0, 0.9], 0.09, 'base', 8),
  ...cilindro([0.7, 1.2, 0.9], [1.14, 1.2, 0.9], 0.09, 'base', 8),
  ...cilindro([2.76, 1.2, 0.9], [3.25, 1.2, 0.9], 0.09, 'base', 8),
  ...cilindro([2.8, 0.75, -1.1], [3.5, 0.75, -1.1], 0.09, 'base', 8),
  ...cilindro([3.5, 0.75, -1.1], [3.5, 0.75, -0.65], 0.09, 'base', 8),
  ...cilindro([-1.6, 0.35, 0.3], [-2.4, 0.35, -0.75], 0.09, 'base', 8)
];
const ROTULOS = { motor: [-3.4, 1.85, 0.9], bloco: [-1.4, -0.6, 2.1], oleo: [-3.0, 1.85, -1.1], sep: [0.5, -0.6, 2.1], torres: [1.95, 2.6, 0.9], reserv: [0.2, 2.0, -1.1], painel: [3.7, 2.4, 0] };

window.GD_estado = (linha, peca) => Math.max(...PECAS[peca].s.map((s) => +linha['st_' + s]));

/* desenha o modelo; cam = {giro, incl} */
window.GD_desenhar = (canvas, linha, cam) => {
  const w = canvas.parentElement.clientWidth || 320;
  const h = Math.round(Math.max(190, Math.min(w * 0.62, window.innerWidth < 720 ? 210 : 360)));
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); canvas.style.height = h + 'px';
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
  const css = getComputedStyle(canvas);
  const cor = (v, alt) => d3.color(css.getPropertyValue(v).trim()) || d3.color(alt);
  const estados = [cor('--color-ok', '#2e8b57'), cor('--color-warn', '#d99a00'), cor('--color-bad', '#c0392b')];
  const neutro = d3.color('#8a8f98'), texto = css.color;
  const cy = Math.cos(cam.giro), sy = Math.sin(cam.giro), cx = Math.cos(cam.incl), sx = Math.sin(cam.incl);
  const gira = ([x, y, z]) => {
    const X = x * cy + z * sy, Z = -x * sy + z * cy, Y = y - 0.8;
    return [X, Y * cx - Z * sx, Y * sx + Z * cx];
  };
  /* ajusta a escala para a cena e os rótulos caberem em qualquer ângulo */
  const persp = (p) => { const k = 16 / (16 - p[2]); return [p[0] * k, -p[1] * k]; };
  const pontos = faces.flatMap((f) => f.v).concat(Object.values(ROTULOS)).map((p) => persp(gira(p)));
  const [x0, x1] = d3.extent(pontos, (p) => p[0]), [y0, y1] = d3.extent(pontos, (p) => p[1]);
  const esc = Math.min((w - 90) / (x1 - x0), (h - 28) / (y1 - y0));
  const proj = (p) => { const q = persp(p); return [w / 2 + (q[0] - (x0 + x1) / 2) * esc, h / 2 + (q[1] - (y0 + y1) / 2) * esc]; };
  faces.map((f) => {
    const r = f.v.map(gira);
    return { r, peca: f.peca, z: d3.mean(r, (p) => p[2]) };
  }).sort((a, b) => (b.peca === 'chao') - (a.peca === 'chao') || a.z - b.z)
    .forEach((f) => {
      const [a, b, c] = f.r;
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const m = Math.hypot(...n) || 1;
      const luz = 0.62 + 0.38 * Math.abs((n[0] * 0.3 + n[1] * 0.7 + n[2] * 0.65) / m);
      const base = !PECAS[f.peca] || !linha ? neutro : estados[GD_estado(linha, f.peca)];
      const k = d3.rgb(base);
      ctx.fillStyle = `rgb(${k.r * luz | 0},${k.g * luz | 0},${k.b * luz | 0})`;
      ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 0.6;
      ctx.beginPath(); f.r.map(proj).forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p));
      ctx.closePath(); ctx.fill(); ctx.stroke();
    });
  ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = texto;
  ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.strokeStyle = css.getPropertyValue('--color-panel').trim() || '#fff';
  Object.entries(ROTULOS).forEach(([id, pos]) => {
    const [x, y] = proj(gira(pos));
    const marca = linha && GD_estado(linha, id) ? ' ⚠' : '';
    ctx.strokeText(PECAS[id].nome + marca, x, y);
    ctx.fillText(PECAS[id].nome + marca, x, y);
  });
};
