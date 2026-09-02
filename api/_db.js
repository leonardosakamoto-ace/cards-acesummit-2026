/* Conexão com o Postgres da Vercel.

   O nome da variável de conexão muda conforme a integração usada (Neon,
   Supabase, o antigo Vercel Postgres), então procuramos entre os nomes
   habituais em vez de fixar um. Se nenhuma existir, os endpoints respondem
   com uma mensagem clara em vez de estourar. */

import pg from 'pg';

const CHAVES = [
  'POSTGRES_URL',
  'DATABASE_URL',
  'POSTGRES_PRISMA_URL',
  'POSTGRES_URL_NON_POOLING',
  'DATABASE_URL_UNPOOLED',
];

export function stringDeConexao() {
  for (const chave of CHAVES) {
    if (process.env[chave]) return process.env[chave];
  }
  return null;
}

/* Uma conexão por invocação. O volume aqui é pequeno (algumas centenas de
   downloads no total), então não compensa a complexidade de um pool. */
export async function comBanco(fn) {
  const connectionString = stringDeConexao();
  if (!connectionString) {
    const erro = new Error('Banco não configurado');
    erro.code = 'SEM_BANCO';
    throw erro;
  }

  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

export async function garantirTabela(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS downloads (
      id BIGSERIAL PRIMARY KEY,
      card TEXT NOT NULL,
      nome TEXT NOT NULL DEFAULT '',
      cargo TEXT NOT NULL DEFAULT '',
      empresa TEXT NOT NULL DEFAULT '',
      criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS downloads_criado_em_idx ON downloads (criado_em DESC)');
}

/* Comparação em tempo constante, para a senha do painel não vazar por
   diferença de tempo de resposta. */
export function senhaConfere(recebida) {
  const esperada = process.env.ADMIN_KEY || '';
  if (!esperada) return false;
  const a = Buffer.from(String(recebida || ''));
  const b = Buffer.from(esperada);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}
