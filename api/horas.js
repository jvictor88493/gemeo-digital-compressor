// api/horas.js · Versão 2 · 26/11/2026
// Devolve as médias por hora guardadas no Postgres (Neon). Não recebe parâmetros.
import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ erro: 'Método não permitido' });
  }
  try {
    const sql = neon(process.env.DATABASE_URL);
    const linhas = await sql`
      select to_char(hora, 'YYYY-MM-DD"T"HH24:MI') as hora, origem, periodo, falha,
             tp2, st_tp2, tp3, st_tp3, h1, st_h1, dv, st_dv, reserv, st_reserv,
             oleo, st_oleo, corrente, st_corrente, carga, st_carga, indice, limite, alarme
      from horas
      order by horas.hora`;
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json(linhas);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: 'Não foi possível ler o banco de dados' });
  }
}
