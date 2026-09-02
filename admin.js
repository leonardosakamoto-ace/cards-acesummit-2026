/* Painel de administração — carregado sob demanda em /#admin-ace.

   Nada no site aponta para cá: nenhum botão, nenhum link. O hash não chega
   ao servidor, então ele só esconde a entrada — quem protege os dados de
   verdade é a senha exigida pela API. */

import { CARDS } from './cards.js';

const CHAVE_SESSAO = 'ace-summit-admin-key';
const rotulo = Object.fromEntries(CARDS.map((c) => [c.id, c.title]));

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const dataHora = (iso) => new Date(iso).toLocaleString('pt-BR', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

let estado = { registros: [], porCard: [], filtro: 'todos', busca: '' };

export function mount(root) {
  root.innerHTML = `
    <div class="admin">
      <header class="admin__head">
        <h1>Downloads</h1>
        <p>Quem gerou card, qual modelo e quando. Atualizado a cada carregamento.</p>
      </header>
      <div id="admin-body"></div>
    </div>`;

  const salva = sessionStorage.getItem(CHAVE_SESSAO);
  if (salva) carregar(salva);
  else pedirSenha();
}

/* ---------- senha ---------- */

function pedirSenha(erro) {
  const body = document.getElementById('admin-body');
  body.innerHTML = `
    <form class="admin__login" id="admin-login">
      <label class="field__label" for="admin-key">Senha do painel</label>
      <input id="admin-key" type="password" autocomplete="current-password" autofocus>
      ${erro ? `<p class="admin__erro">${esc(erro)}</p>` : ''}
      <button class="btn btn--primary" type="submit">Entrar</button>
    </form>`;

  document.getElementById('admin-login').addEventListener('submit', (e) => {
    e.preventDefault();
    const senha = document.getElementById('admin-key').value;
    if (senha) carregar(senha);
  });
}

/* ---------- dados ---------- */

async function carregar(senha) {
  const body = document.getElementById('admin-body');
  body.innerHTML = '<p class="admin__aviso">Carregando…</p>';

  let resposta;
  try {
    resposta = await fetch('/api/admin', { headers: { 'x-admin-key': senha } });
  } catch {
    body.innerHTML = '<p class="admin__erro">Não foi possível falar com o servidor.</p>';
    return;
  }

  if (resposta.status === 401) {
    sessionStorage.removeItem(CHAVE_SESSAO);
    pedirSenha('Senha incorreta.');
    return;
  }

  if (!resposta.ok) {
    const { erro } = await resposta.json().catch(() => ({}));
    body.innerHTML = `<p class="admin__erro">${esc(erro || 'Falha ao carregar.')}</p>`;
    return;
  }

  sessionStorage.setItem(CHAVE_SESSAO, senha);
  const dados = await resposta.json();
  estado = { ...estado, registros: dados.registros || [], porCard: dados.porCard || [] };
  render();
}

/* ---------- tela ---------- */

function visiveis() {
  const busca = estado.busca.trim().toLowerCase();
  return estado.registros.filter((r) => {
    if (estado.filtro !== 'todos' && r.card !== estado.filtro) return false;
    if (!busca) return true;
    return [r.nome, r.cargo, r.empresa].some((v) => String(v || '').toLowerCase().includes(busca));
  });
}

function render() {
  const body = document.getElementById('admin-body');
  const total = estado.registros.length;
  const mapa = Object.fromEntries(estado.porCard.map((t) => [t.card, t.total]));

  body.innerHTML = `
    <div class="admin__tiles">
      <div class="tile"><span class="tile__num">${total}</span><span class="tile__label">Downloads</span></div>
      ${CARDS.map((c) => `
        <div class="tile"><span class="tile__num">${mapa[c.id] || 0}</span><span class="tile__label">${esc(c.title)}</span></div>
      `).join('')}
    </div>

    <div class="admin__ferramentas">
      <input id="admin-busca" type="text" placeholder="Buscar por nome, cargo ou empresa" value="${esc(estado.busca)}">
      <select id="admin-filtro">
        <option value="todos">Todos os modelos</option>
        ${CARDS.map((c) => `<option value="${c.id}"${estado.filtro === c.id ? ' selected' : ''}>${esc(c.title)}</option>`).join('')}
      </select>
      <button class="btn btn--ghost btn--sm" id="admin-csv" type="button">Baixar CSV</button>
      <button class="btn btn--ghost btn--sm" id="admin-sair" type="button">Sair</button>
    </div>

    <div class="admin__tabela-caixa">${tabela()}</div>`;

  document.getElementById('admin-busca').addEventListener('input', (e) => {
    estado.busca = e.target.value;
    document.querySelector('.admin__tabela-caixa').innerHTML = tabela();
  });
  document.getElementById('admin-filtro').addEventListener('change', (e) => {
    estado.filtro = e.target.value;
    document.querySelector('.admin__tabela-caixa').innerHTML = tabela();
  });
  document.getElementById('admin-csv').addEventListener('click', baixarCsv);
  document.getElementById('admin-sair').addEventListener('click', () => {
    sessionStorage.removeItem(CHAVE_SESSAO);
    pedirSenha();
  });
}

function tabela() {
  const linhas = visiveis();
  if (!linhas.length) {
    return '<p class="admin__aviso">Nenhum registro ainda.</p>';
  }
  return `
    <table class="admin__tabela">
      <thead>
        <tr><th>Quando</th><th>Modelo</th><th>Nome</th><th>Cargo</th><th>Empresa</th></tr>
      </thead>
      <tbody>
        ${linhas.map((r) => `
          <tr>
            <td class="col-data">${esc(dataHora(r.criado_em))}</td>
            <td><span class="tag">${esc(rotulo[r.card] || r.card)}</span></td>
            <td>${esc(r.nome) || '<span class="vazio">—</span>'}</td>
            <td>${esc(r.cargo) || '<span class="vazio">—</span>'}</td>
            <td>${esc(r.empresa) || '<span class="vazio">—</span>'}</td>
          </tr>`).join('')}
      </tbody>
    </table>
    <p class="admin__contagem">${linhas.length} de ${estado.registros.length} registros</p>`;
}

function baixarCsv() {
  const campo = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const linhas = [
    ['Quando', 'Modelo', 'Nome', 'Cargo', 'Empresa'],
    ...visiveis().map((r) => [dataHora(r.criado_em), rotulo[r.card] || r.card, r.nome, r.cargo, r.empresa]),
  ];
  // BOM para o Excel abrir os acentos corretamente
  const csv = '﻿' + linhas.map((l) => l.map(campo).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `ace-summit-downloads-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
