/* Lista os downloads para o painel. Exige a senha em ADMIN_KEY.

   Sem a senha correta responde 401 — inclusive quando ADMIN_KEY não foi
   configurada, para o painel nunca ficar aberto por esquecimento. */

import { comBanco, garantirTabela, senhaConfere } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ erro: 'Método não permitido' });
    return;
  }

  if (!process.env.ADMIN_KEY) {
    res.status(503).json({ erro: 'ADMIN_KEY não configurada nas variáveis de ambiente da Vercel.' });
    return;
  }

  if (!senhaConfere(req.headers['x-admin-key'])) {
    res.status(401).json({ erro: 'Senha incorreta' });
    return;
  }

  try {
    const dados = await comBanco(async (client) => {
      await garantirTabela(client);
      const { rows } = await client.query(`
        SELECT id, card, nome, cargo, empresa, criado_em
        FROM downloads
        ORDER BY criado_em DESC
        LIMIT 5000
      `);
      const { rows: totais } = await client.query(`
        SELECT card, COUNT(*)::int AS total
        FROM downloads
        GROUP BY card
        ORDER BY total DESC
      `);
      return { registros: rows, porCard: totais };
    });

    res.setHeader('cache-control', 'no-store');
    res.status(200).json(dados);
  } catch (erro) {
    if (erro.code === 'SEM_BANCO') {
      res.status(503).json({
        erro: 'Banco não conectado. Ligue um Postgres ao projeto no painel da Vercel.',
      });
      return;
    }
    console.error('Falha ao ler downloads:', erro);
    res.status(500).json({ erro: 'Falha ao consultar o banco' });
  }
}
