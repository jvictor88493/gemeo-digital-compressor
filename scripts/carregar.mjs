// scripts/carregar.mjs · Versão 2 · 26/11/2026
// Cria as tabelas no Postgres (Neon) e carrega o arquivo de médias por hora.
// Pode rodar várias vezes: só recarrega quando o arquivo muda.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';

const ARQUIVO = new URL('../dados/metropt3_painel_v2_2026-11-26.json', import.meta.url);

if (!process.env.DATABASE_URL) {
  console.error('Defina a variável de ambiente DATABASE_URL.');
  process.exit(1);
}

const bruto = readFileSync(ARQUIVO);
const sha = createHash('sha256').update(bruto).digest('hex');
const { rows } = JSON.parse(bruto);
const sql = neon(process.env.DATABASE_URL);

await sql.transaction([
  sql`create table if not exists horas (
    hora timestamp primary key,
    origem text not null,
    periodo text not null,
    falha text not null,
    tp2 double precision not null, st_tp2 smallint not null,
    tp3 double precision not null, st_tp3 smallint not null,
    h1 double precision not null, st_h1 smallint not null,
    dv double precision not null, st_dv smallint not null,
    reserv double precision not null, st_reserv smallint not null,
    oleo double precision not null, st_oleo smallint not null,
    corrente double precision not null, st_corrente smallint not null,
    carga double precision not null, st_carga smallint not null,
    indice double precision not null,
    limite double precision not null,
    alarme smallint not null
  )`,
  sql`create table if not exists carga (
    sha256 text primary key,
    linhas integer not null,
    carregado_em timestamptz not null default now()
  )`
]);

const [atual] = await sql`
  select (select count(*)::int from horas) as linhas,
         exists (select 1 from carga where sha256 = ${sha}) as mesmo_arquivo`;

if (atual.mesmo_arquivo && atual.linhas === rows.length) {
  console.log(`Banco já está atualizado (${atual.linhas} linhas).`);
} else {
  await sql.transaction([
    sql`delete from horas`,
    sql`insert into horas select * from jsonb_populate_recordset(null::horas, ${JSON.stringify(rows)}::jsonb)`,
    sql`delete from carga`,
    sql`insert into carga (sha256, linhas) values (${sha}, ${rows.length})`
  ]);
  const [{ n }] = await sql`select count(*)::int as n from horas`;
  if (n !== rows.length) {
    console.error(`Carga incompleta: ${n} de ${rows.length} linhas.`);
    process.exit(1);
  }
  console.log(`Carregadas ${n} linhas.`);
}
