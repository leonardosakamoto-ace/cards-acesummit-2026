/* Registra um download. Chamado pelo navegador depois que o PNG é gerado.

   Este endpoint nunca deve atrapalhar quem está baixando: qualquer falha
   responde 204 assim mesmo, e o front-end ignora o resultado. */

import { comBanco, garantirTabela } from './_db.js';

const CARDS_VALIDOS = new Set([
  'palestrante',
  'patrocinador',
  'apoiador',
  'embaixador',
]);

const limpa = (valor) => String(valor ?? '').trim().slice(0, 60);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ erro: 'Método não permitido' });
    return;
  }

  const corpo = typeof req.body === 'string' ? safeParse(req.body) : (req.body || {});
  const card = limpa(corpo.card);

  if (!CARDS_VALIDOS.has(card)) {
    res.status(400).json({ erro: 'Card desconhecido' });
    return;
  }

  try {
    await comBanco(async (client) => {
      await garantirTabela(client);
      await client.query(
        'INSERT INTO downloads (card, nome, cargo, empresa) VALUES ($1, $2, $3, $4)',
        [card, limpa(corpo.nome), limpa(corpo.cargo), limpa(corpo.empresa)],
      );
    });
  } catch (erro) {
    // Falha de registro não pode virar falha de download.
    console.error('Falha ao registrar download:', erro.code || erro.message);
  }

  res.status(204).end();
}

function safeParse(texto) {
  try {
    return JSON.parse(texto);
  } catch {
    return {};
  }
}
