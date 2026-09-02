/* Servidor estático mínimo, só para desenvolvimento local.
   Uso: node dev-server.js [porta]

   Ele também simula /api/log e /api/admin guardando tudo em memória, para
   dar para mexer no painel sem subir um Postgres. Em produção quem responde
   são as funções em api/, com o banco de verdade. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = import.meta.dirname;
const PORT = Number(process.argv[2] || 4173);
const SENHA_DEV = process.env.ADMIN_KEY || 'dev';

const registros = [];
let proximoId = 1;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8',
};

const json = (res, status, corpo) => {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(corpo));
};

function api(req, res, rota) {
  if (rota === '/api/log' && req.method === 'POST') {
    let bruto = '';
    req.on('data', (c) => { bruto += c; });
    req.on('end', () => {
      try {
        const { card, nome, cargo, empresa } = JSON.parse(bruto || '{}');
        registros.unshift({
          id: proximoId++,
          card: String(card || ''),
          nome: String(nome || ''),
          cargo: String(cargo || ''),
          empresa: String(empresa || ''),
          criado_em: new Date().toISOString(),
        });
        console.log(`[log] ${card} — ${nome || 'sem nome'} (${registros.length} no total)`);
      } catch { /* corpo inválido: ignora, como em produção */ }
      res.writeHead(204).end();
    });
    return true;
  }

  if (rota === '/api/admin' && req.method === 'GET') {
    if (req.headers['x-admin-key'] !== SENHA_DEV) {
      json(res, 401, { erro: 'Senha incorreta' });
      return true;
    }
    const porCard = Object.entries(
      registros.reduce((acc, r) => ({ ...acc, [r.card]: (acc[r.card] || 0) + 1 }), {}),
    ).map(([card, total]) => ({ card, total })).sort((a, b) => b.total - a.total);
    json(res, 200, { registros, porCard });
    return true;
  }

  return false;
}

http
  .createServer((req, res) => {
    const rota = decodeURIComponent(req.url.split('?')[0]);

    if (rota.startsWith('/api/') && api(req, res, rota)) return;

    const rel = rota === '/' ? '/index.html' : rota;
    const file = path.join(ROOT, path.normalize(rel).replace(/^[\\/]+/, ''));
    if (!file.startsWith(ROOT)) {
      res.writeHead(403).end('forbidden');
      return;
    }
    fs.readFile(file, (err, buf) => {
      if (err) {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('404');
        return;
      }
      res.writeHead(200, {
        'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'cache-control': 'no-store',
      });
      res.end(buf);
    });
  })
  .listen(PORT, () => {
    console.log(`servindo ${ROOT} em http://localhost:${PORT}`);
    console.log(`painel: http://localhost:${PORT}/#admin-ace (senha: ${SENHA_DEV})`);
  });
