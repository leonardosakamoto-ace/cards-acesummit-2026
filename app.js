/* ACE Summit 2026 — gerador de cards de divulgação.
   Tudo roda no navegador: nenhuma imagem sai do dispositivo. */

import { CARDS, CARD_W, CARD_H, EVENT, GLOWS, SCRIMS, cardById } from './cards.js';
import { LOGO_WHITE } from './logo.js';

const LOGO_SRC = LOGO_WHITE;
const MAX_IMG = 2200; // px no maior lado — segura a memória em celular

/* ============================ helpers ============================ */

const $ = (sel, root = document) => root.querySelector(sel);
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

function escapeHtml(str) {
  return String(str).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function slugify(str) {
  return String(str)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

let toastTimer;
function toast(msg) {
  const node = $('#toast');
  node.textContent = msg;
  node.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { node.hidden = true; }, 3200);
}

/* ==================== fundo pintado em canvas ====================
   O gradiente e os dois brilhos radiais do design são desenhados em
   canvas em vez de CSS: assim o PNG exportado sai idêntico ao preview,
   sem depender de como a biblioteca de captura interpreta gradientes. */

function paintBackground(canvas, glowKey) {
  if (!canvas) return;
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');

  // linear-gradient(160deg, #6034BF 0%, #5632A6 48%, #241247 100%)
  const a = (160 * Math.PI) / 180;
  const dx = Math.sin(a);
  const dy = -Math.cos(a);
  const len = Math.abs(CARD_W * Math.sin(a)) + Math.abs(CARD_H * Math.cos(a));
  const cx = CARD_W / 2;
  const cy = CARD_H / 2;
  const grad = ctx.createLinearGradient(
    cx - (dx * len) / 2, cy - (dy * len) / 2,
    cx + (dx * len) / 2, cy + (dy * len) / 2,
  );
  grad.addColorStop(0, '#6034BF');
  grad.addColorStop(0.48, '#5632A6');
  grad.addColorStop(1, '#241247');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // brilhos radiais (raio = farthest-corner da caixa original × parada)
  for (const g of GLOWS[glowKey] || []) {
    const r = (Math.SQRT2 * g.box) / 2 * g.stop;
    const rg = ctx.createRadialGradient(g.cx, g.cy, 0, g.cx, g.cy, r);
    rg.addColorStop(0, `rgba(${g.rgb},${g.alpha})`);
    rg.addColorStop(1, `rgba(${g.rgb},0)`);
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, CARD_W, CARD_H);
  }
}

/* ========================= markup do card ========================= */

function headHTML() {
  return `
    <div class="card__head">
      <img class="card__logo" src="${LOGO_SRC}" alt="ACE Summit 2026">
      <div class="card__meta">
        <div class="card__meta-date">${escapeHtml(EVENT.date)}</div>
        <div class="card__meta-venue">${escapeHtml(EVENT.venue)}</div>
      </div>
    </div>`;
}

function footHTML(mt) {
  return `
    <div class="card__foot" style="margin-top:${mt}px">
      <span class="card__hashtag">${escapeHtml(EVENT.hashtag)}</span>
      <span class="card__site">${escapeHtml(EVENT.site)}</span>
    </div>`;
}

function emptySlotHTML(text) {
  return `
    <div class="slot__empty" data-empty>
      <svg class="slot__empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="16" rx="2"/>
        <circle cx="8.5" cy="9.5" r="1.6"/>
        <path d="M21 16l-5.5-5.5L7 19"/>
      </svg>
      <span class="slot__empty-text">${escapeHtml(text)}</span>
    </div>`;
}

function blockHTML(block, def) {
  switch (block.type) {
    case 'pill':
      return `
        <div class="card__pill" style="margin-top:${block.mt}px">
          <span style="font-size:${block.size}px;letter-spacing:${block.ls};padding:${block.padY}px ${block.padX}px">${escapeHtml(block.text)}</span>
        </div>`;

    case 'headline':
      // `fill` faz o título ocupar todo o espaço até o bloco seguinte: ele
      // recebe flex:1 e o corpo cresce até encostar na largura ou na altura.
      return `
        <div class="card__headline"${block.fill ? ' data-headline data-max="' + block.size + '"' : ''}
             style="margin-top:${block.mt}px;font-size:${block.size}px;line-height:${block.lh}${block.fill ? ';flex:1;min-height:0' : ''}">${block.html}</div>`;

    case 'photo':
      return `
        <div class="card__photo" style="margin-top:${block.mt}px">
          <div class="slot" data-slot data-fit="cover">${emptySlotHTML('Sua foto entra aqui')}</div>
          <div class="card__scrim" style="background:${SCRIMS[block.scrim]}"></div>
          <div class="card__caption">
            <div class="card__name" data-name style="font-size:${block.nameSize}px"></div>
            <div class="card__role" data-role style="margin-top:${block.roleMt}px;font-size:${block.roleSize}px"></div>
          </div>
        </div>`;

    case 'logoPanel':
      return `
        <div class="card__panel">
          <span class="card__panel-label">${escapeHtml(block.label)}</span>
          <div class="card__panel-slot">
            <div class="slot" data-slot data-fit="contain">${emptySlotHTML('Logo da empresa')}</div>
            <div class="card__panel-name" data-panel-name hidden><span></span></div>
          </div>
        </div>`;

    default:
      return '';
  }
}

function buildCard(def) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.card = def.id;

  const bg = document.createElement('canvas');
  bg.className = 'card__bg';
  card.appendChild(bg);

  const inner = document.createElement('div');
  inner.className = 'card__inner';
  inner.innerHTML = headHTML() + def.blocks.map((b) => blockHTML(b, def)).join('') + footHTML(def.footerMt);
  card.appendChild(inner);

  paintBackground(bg, def.glow);
  return card;
}

/* ===================== texto que se ajusta ======================
   Reduz o corpo até o texto caber no número de linhas previsto no
   design, para que nomes longos não estourem o card. */

/* Conta linhas pelos retângulos do Range: um por caixa de linha.
   Não serve medir scrollHeight — na Syne os glifos passam da caixa de
   linha (line-height:1) e uma linha já mede mais que 1em. */
function lineCount(el) {
  const range = document.createRange();
  range.selectNodeContents(el);
  const tops = new Set();
  for (const rect of range.getClientRects()) {
    if (rect.height > 0) tops.add(Math.round(rect.top));
  }
  return Math.max(1, tops.size);
}

/* Título que preenche o espaço: cresce até o limite da caixa. A largura é
   quem costuma travar — "PATROCINADORES" é uma palavra só e transborda em
   vez de quebrar, então medir scrollWidth é o que segura o tamanho. */
function fitFill(el, maxSize, minSize) {
  for (let size = maxSize; size >= minSize; size -= 2) {
    el.style.fontSize = `${size}px`;
    const cabe = el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1;
    if (cabe) return;
  }
  el.style.fontSize = `${minSize}px`;
}

function fitText(el, maxLines, maxSize, minSize) {
  for (let size = maxSize; size >= minSize; size -= 2) {
    el.style.fontSize = `${size}px`;
    // as duas checagens são necessárias: contar linhas pega o texto que quebra,
    // e a largura pega a palavra única grande demais, que transborda sem quebrar
    const fits = lineCount(el) <= maxLines && el.scrollWidth <= el.clientWidth + 1;
    if (fits) return;
  }
  el.style.fontSize = `${minSize}px`;
}

/* ========================= slot de imagem ========================= */

function layoutSlot(slot, st) {
  const img = slot.querySelector('.slot__img');
  if (!img || !st.img) return;

  const fit = slot.dataset.fit;
  const sw = slot.clientWidth;
  const sh = slot.clientHeight;
  if (!sw || !sh) return;

  const ratio = fit === 'cover'
    ? Math.max(sw / st.img.w, sh / st.img.h)
    : Math.min(sw / st.img.w, sh / st.img.h);

  const w = st.img.w * ratio * st.zoom;
  const h = st.img.h * ratio * st.zoom;

  // no modo cover a imagem nunca pode deixar buraco no slot
  if (fit === 'cover') {
    const maxX = Math.max(0, (w - sw) / 2);
    const maxY = Math.max(0, (h - sh) / 2);
    st.ox = clamp(st.ox, -maxX, maxX);
    st.oy = clamp(st.oy, -maxY, maxY);
  }

  img.style.width = `${w}px`;
  img.style.height = `${h}px`;
  img.style.left = `${(sw - w) / 2 + st.ox}px`;
  img.style.top = `${(sh - h) / 2 + st.oy}px`;
}

function applyState(card, def, st) {
  // título fixo: texto não muda, então basta ajustar uma vez por card
  // Sem layout (elemento ainda fora do documento) a medição não vale nada:
  // sai sem marcar como ajustado, para tentar de novo quando houver caixa.
  const head = $('[data-headline]', card);
  if (head && !head.dataset.fitted && head.clientHeight > 0) {
    const max = Number(head.dataset.max);
    fitFill(head, max, Math.round(max * 0.5));
    head.dataset.fitted = '1';
  }

  // nome e cargo/empresa (cards com foto)
  const nameEl = $('[data-name]', card);
  if (nameEl) {
    const photo = def.blocks.find((b) => b.type === 'photo');
    nameEl.textContent = st.nome || def.placeholders.nome;
    fitText(nameEl, 2, photo.nameSize, Math.round(photo.nameSize * 0.55));

    const roleEl = $('[data-role]', card);
    const role = [st.cargo || def.placeholders.cargo, st.empresa || def.placeholders.empresa]
      .filter(Boolean)
      .join(' · ');
    roleEl.textContent = role;
    roleEl.hidden = !role;
    if (role) fitText(roleEl, 2, photo.roleSize, Math.round(photo.roleSize * 0.7));
  }

  // painel branco (cards com logo)
  const panelName = $('[data-panel-name]', card);
  if (panelName) {
    const showName = !st.img && !!st.empresa;
    panelName.hidden = !showName;
    if (showName) {
      const span = panelName.firstElementChild;
      span.textContent = st.empresa;
      fitText(span, 3, 76, 30);
    }
  }

  // slot
  const slot = $('[data-slot]', card);
  if (slot) {
    const empty = $('[data-empty]', slot);
    let img = slot.querySelector('.slot__img');

    if (st.img) {
      if (empty) empty.remove();
      if (!img) {
        img = document.createElement('img');
        img.className = 'slot__img';
        img.alt = '';
        slot.appendChild(img);
      }
      if (img.getAttribute('src') !== st.img.src) img.src = st.img.src;
      layoutSlot(slot, st);
    } else {
      if (img) img.remove();
      if (!empty && !(panelName && !panelName.hidden)) {
        slot.insertAdjacentHTML('afterbegin', emptySlotHTML(
          slot.dataset.fit === 'contain' ? 'Logo da empresa' : 'Sua foto entra aqui',
        ));
      }
      if (empty && panelName && !panelName.hidden) empty.remove();
    }
  }
}

/* ===================== carregamento de imagem =====================
   <img> já aplica a orientação EXIF, então fotos tiradas de lado no
   celular entram em pé. Reamostramos para no máximo MAX_IMG px. */

async function loadImageFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    throw new Error('Escolha um arquivo de imagem (JPG, PNG ou WebP).');
  }

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('Não conseguimos abrir essa imagem.'));
      img.src = url;
    });

    const w0 = img.naturalWidth || 512;
    const h0 = img.naturalHeight || 512;
    const k = Math.min(1, MAX_IMG / Math.max(w0, h0));
    const w = Math.max(1, Math.round(w0 * k));
    const h = Math.max(1, Math.round(h0 * k));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);

    // logos precisam de transparência; fotos ficam menores em JPEG
    const keepAlpha = /png|webp|svg|gif/i.test(file.type);
    const src = keepAlpha ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.92);
    return { src, w, h };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/* ============================ exportação ============================ */

async function renderPngBlob(def, st) {
  if (document.fonts && document.fonts.ready) await document.fonts.ready;

  const host = $('#export-host');
  host.innerHTML = '';

  // clone em tamanho real, fora de qualquer transform
  const clone = buildCard(def);
  host.appendChild(clone);
  applyState(clone, def, st);
  layoutSlot($('[data-slot]', clone) || document.createElement('div'), st);

  // a imagem do logo precisa estar decodificada antes da captura
  const logo = $('.card__logo', clone);
  if (logo && !logo.complete) {
    await new Promise((r) => { logo.onload = r; logo.onerror = r; });
  }
  const slotImg = clone.querySelector('.slot__img');
  if (slotImg && !slotImg.complete) {
    await new Promise((r) => { slotImg.onload = r; slotImg.onerror = r; });
  }

  const canvas = await window.html2canvas(clone, {
    backgroundColor: null,
    scale: 1,
    width: CARD_W,
    height: CARD_H,
    useCORS: true,
    logging: false,
  });

  host.innerHTML = '';

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Falha ao gerar o PNG.'))), 'image/png');
  });
}

/* Avisa a organização que alguém gerou um card. Deliberadamente frouxo:
   se falhar, o download segue normalmente e ninguém fica sabendo. */
function registrarDownload(def, st) {
  try {
    const corpo = JSON.stringify({
      card: def.id,
      nome: st.nome || '',
      cargo: st.cargo || '',
      empresa: st.empresa || '',
    });
    const enviado = navigator.sendBeacon
      && navigator.sendBeacon('/api/log', new Blob([corpo], { type: 'application/json' }));
    if (!enviado) {
      fetch('/api/log', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: corpo,
        keepalive: true,
      }).catch(() => {});
    }
  } catch { /* registro é acessório, nunca crítico */ }
}

function fileName(def, st) {
  const who = slugify(st.nome || st.empresa || '');
  return `ace-summit-2026-${def.slug}${who ? `-${who}` : ''}.png`;
}

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/* ============================== app ============================== */

const state = new Map(); // id -> estado do card

function stateFor(id) {
  if (!state.has(id)) {
    state.set(id, { img: null, zoom: 1, ox: 0, oy: 0, nome: '', cargo: '', empresa: '' });
  }
  return state.get(id);
}

const TEXT_KEYS = ['nome', 'cargo', 'empresa'];

function loadSavedText() {
  try {
    const raw = JSON.parse(localStorage.getItem('ace-summit-cards') || '{}');
    for (const [id, vals] of Object.entries(raw)) {
      const st = stateFor(id);
      for (const k of TEXT_KEYS) if (typeof vals[k] === 'string') st[k] = vals[k];
    }
  } catch { /* sem histórico, segue em branco */ }
}

function saveText() {
  try {
    const out = {};
    for (const [id, st] of state) {
      out[id] = { nome: st.nome, cargo: st.cargo, empresa: st.empresa };
    }
    localStorage.setItem('ace-summit-cards', JSON.stringify(out));
  } catch { /* modo privado: só não persiste */ }
}

/* ---------- escala do preview ---------- */

function autoScale(hostEl, boxEl) {
  const apply = () => {
    const w = boxEl.clientWidth;
    if (w) hostEl.style.transform = `scale(${w / CARD_W})`;
  };
  apply();
  new ResizeObserver(apply).observe(boxEl);
  return apply;
}

/* ---------- galeria de modelos ---------- */

function buildPicker() {
  const grid = $('#picker-grid');
  grid.innerHTML = '';

  for (const def of CARDS) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'picker__card';
    btn.innerHTML = `
      <div class="picker__thumb"></div>
      <div class="picker__body">
        <span class="picker__tag">${def.tag}</span>
        <span class="picker__title">${escapeHtml(def.title)}</span>
        <span class="picker__hint">${escapeHtml(def.hint)}</span>
      </div>`;

    btn.addEventListener('click', () => { location.hash = def.id; });
    li.appendChild(btn);
    grid.appendChild(li);

    // Entra no documento primeiro: fora dele todas as medidas são zero e o
    // ajuste do título aceitaria qualquer corpo como se coubesse.
    const thumb = $('.picker__thumb', btn);
    const host = document.createElement('div');
    host.className = 'stage__host';
    const card = buildCard(def);
    host.appendChild(card);
    thumb.appendChild(host);
    applyState(card, def, { img: null, zoom: 1, ox: 0, oy: 0, nome: '', cargo: '', empresa: '' });
    autoScale(host, thumb);
  }
}

/* ---------- editor ---------- */

let current = null; // { def, st, card, rescale }

function buildFields(def, st, onChange) {
  const box = $('#fields');
  box.innerHTML = '';

  const specs = def.kind === 'photo'
    ? [
        { key: 'nome', label: 'Nome', ph: def.placeholders.nome, max: 60 },
        { key: 'cargo', label: 'Cargo', ph: def.placeholders.cargo, max: 60 },
        { key: 'empresa', label: 'Empresa', ph: def.placeholders.empresa, max: 60 },
      ]
    : [
        { key: 'empresa', label: 'Empresa', ph: def.placeholders.empresa, max: 60 },
      ];

  for (const spec of specs) {
    const field = document.createElement('div');
    field.className = 'field';
    field.innerHTML = `
      <label class="field__label" for="f-${spec.key}">${escapeHtml(spec.label)}</label>
      <input id="f-${spec.key}" type="text" maxlength="${spec.max}" placeholder="${escapeHtml(spec.ph)}"
             autocomplete="off" spellcheck="false">`;
    const input = $('input', field);
    input.value = st[spec.key] || '';
    input.addEventListener('input', () => {
      st[spec.key] = input.value;
      saveText();
      onChange();
    });
    box.appendChild(field);
  }

  if (def.kind === 'logo') {
    const note = document.createElement('p');
    note.className = 'panel-hint';
    note.textContent = 'Sem o arquivo do logo em mãos? O nome da empresa aparece no card no lugar dele.';
    box.appendChild(note);
  }
}

function refresh() {
  if (!current) return;
  const { def, st, card } = current;
  applyState(card, def, st);

  const tools = $('#img-tools');
  tools.hidden = !st.img;
  if (st.img) $('#zoom').value = String(st.zoom);

  // a dica só faz sentido quando já existe imagem para arrastar
  const hint = $('#drag-hint');
  hint.hidden = !st.img;
  $('#drag-hint-text').textContent = def.kind === 'photo'
    ? 'Arraste a foto para reposicionar · use o zoom para aproximar'
    : 'Arraste o logo para reposicionar · use o zoom para ajustar';

  const ready = def.kind === 'photo' ? !!st.img : (!!st.img || !!st.empresa.trim());
  const btn = $('#download');
  btn.disabled = !ready;
  $('#download-hint').textContent = ready
    ? 'PNG 1080×1350 · pronto para o feed'
    : def.kind === 'photo'
      ? 'Adicione sua foto para liberar o download.'
      : 'Adicione o logo ou o nome da empresa.';
}

function openEditor(def) {
  const st = stateFor(def.id);
  const host = $('#card-host');
  host.innerHTML = '';
  const card = buildCard(def);
  host.appendChild(card);

  current = { def, st, card, rescale: null };
  current.rescale = autoScale(host, $('#stage'));

  $('#panel-title').textContent = `${def.tag} · ${def.title}`;
  $('#panel-hint').textContent = def.hint;
  $('#stage-label').textContent = def.title;
  $('#upload-label').textContent = def.kind === 'photo' ? 'Sua foto' : 'Logo da empresa';
  $('#drop-title').textContent = def.kind === 'photo' ? 'Toque para escolher sua foto' : 'Toque para escolher o logo';
  $('#drop-sub').textContent = def.kind === 'photo'
    ? 'ou arraste o arquivo aqui · JPG, PNG ou WebP'
    : 'ou arraste o arquivo aqui · PNG com fundo transparente fica melhor';
  $('#zoom-tip').textContent = def.kind === 'photo'
    ? 'Arraste a foto direto no preview para escolher o enquadramento.'
    : 'Arraste o logo no preview e use o zoom para ajustar o tamanho.';

  buildFields(def, st, refresh);
  refresh();

  $('#view-picker').hidden = true;
  $('#view-editor').hidden = false;
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function closeEditor() {
  current = null;
  $('#view-editor').hidden = true;
  $('#view-picker').hidden = false;
}

/* ---------- arrastar para reposicionar ---------- */

function bindDrag() {
  const stage = $('#stage');
  let active = false;
  let lastX = 0;
  let lastY = 0;
  let scale = 1;

  stage.addEventListener('pointerdown', (e) => {
    if (!current || !current.st.img) return;
    active = true;
    lastX = e.clientX;
    lastY = e.clientY;
    scale = stage.clientWidth / CARD_W || 1;
    stage.setPointerCapture(e.pointerId);
    stage.style.cursor = 'grabbing';
  });

  stage.addEventListener('pointermove', (e) => {
    if (!active || !current) return;
    const { st, card } = current;
    st.ox += (e.clientX - lastX) / scale;
    st.oy += (e.clientY - lastY) / scale;
    lastX = e.clientX;
    lastY = e.clientY;
    layoutSlot($('[data-slot]', card), st);
  });

  const stop = (e) => {
    if (!active) return;
    active = false;
    stage.style.cursor = '';
    try { stage.releasePointerCapture(e.pointerId); } catch { /* já liberado */ }
  };
  stage.addEventListener('pointerup', stop);
  stage.addEventListener('pointercancel', stop);
}

/* ---------- upload ---------- */

async function useFile(file) {
  if (!current) return;
  try {
    const img = await loadImageFile(file);
    const { st } = current;
    st.img = img;
    st.zoom = 1;
    st.ox = 0;
    st.oy = 0;
    refresh();
  } catch (err) {
    toast(err.message || 'Não conseguimos usar essa imagem.');
  }
}

function bindUpload() {
  const drop = $('#drop');
  const input = $('#file');

  const pick = () => { input.value = ''; input.click(); };
  drop.addEventListener('click', pick);
  drop.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); }
  });
  $('#change-img').addEventListener('click', pick);

  input.addEventListener('change', () => {
    if (input.files && input.files[0]) useFile(input.files[0]);
  });

  for (const zone of [drop, $('#stage')]) {
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      drop.classList.add('is-over');
    });
    zone.addEventListener('dragleave', () => drop.classList.remove('is-over'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      drop.classList.remove('is-over');
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) useFile(file);
    });
  }

  // colar direto da área de transferência
  window.addEventListener('paste', (e) => {
    if (!current || !e.clipboardData) return;
    const item = [...e.clipboardData.files].find((f) => f.type.startsWith('image/'));
    if (item) useFile(item);
  });

  $('#zoom').addEventListener('input', (e) => {
    if (!current || !current.st.img) return;
    current.st.zoom = parseFloat(e.target.value);
    layoutSlot($('[data-slot]', current.card), current.st);
  });

  $('#reset-img').addEventListener('click', () => {
    if (!current) return;
    current.st.zoom = 1;
    current.st.ox = 0;
    current.st.oy = 0;
    refresh();
  });

  $('#remove-img').addEventListener('click', () => {
    if (!current) return;
    current.st.img = null;
    current.st.zoom = 1;
    current.st.ox = 0;
    current.st.oy = 0;
    refresh();
  });
}

/* ---------- download / compartilhar ---------- */

function bindDownload() {
  const btn = $('#download');
  // No celular a folha nativa de compartilhamento é o caminho mais curto
  // (salvar na galeria, mandar para o Instagram). No desktop ela só atrapalha
  // quem quer o arquivo, então lá vai direto para o download.
  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  const canShareFiles = isTouch && !!(navigator.canShare && navigator.share);

  btn.addEventListener('click', async () => {
    if (!current) return;
    const { def, st } = current;
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Gerando…';

    try {
      const blob = await renderPngBlob(def, st);
      const name = fileName(def, st);
      registrarDownload(def, st);
      const file = new File([blob], name, { type: 'image/png' });

      if (canShareFiles && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'ACE Summit 2026' });
          return;
        } catch (err) {
          if (err && err.name === 'AbortError') return; // usuário cancelou
          // sem permissão para compartilhar: cai para o download
        }
      }

      saveBlob(blob, name);
      toast('PNG salvo. Agora é só postar!');
    } catch (err) {
      console.error(err);
      toast('Algo deu errado ao gerar o PNG. Tente novamente.');
    } finally {
      btn.textContent = label;
      refresh();
    }
  });

  if (canShareFiles) btn.textContent = 'Salvar / compartilhar PNG';
}

/* ---------- roteamento ---------- */

const ROTA_ADMIN = 'admin-ace';

function route() {
  const id = location.hash.replace(/^#/, '');

  if (id === ROTA_ADMIN) {
    $('#view-picker').hidden = true;
    $('#view-editor').hidden = true;
    const host = $('#view-admin');
    host.hidden = false;
    // carregado sob demanda: o código do painel não pesa para quem faz card
    import('./admin.js').then((m) => m.mount(host));
    return;
  }

  $('#view-admin').hidden = true;
  const def = id && cardById(id);
  if (def) openEditor(def);
  else closeEditor();
}

/* ---------- boot ---------- */

for (const node of document.querySelectorAll('[data-logo]')) node.src = LOGO_WHITE;
$('#favicon').href = LOGO_WHITE;


loadSavedText();
buildPicker();
bindDrag();
bindUpload();
bindDownload();

$('#back').addEventListener('click', () => { location.hash = ''; });
window.addEventListener('hashchange', route);
route();

// refaz o ajuste tipográfico quando a fonte Syne termina de carregar
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => {
    buildPicker();
    if (current) refresh();
  });
}
