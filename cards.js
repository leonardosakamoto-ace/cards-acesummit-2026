/* ACE Summit 2026 — definições dos cards de divulgação.
   Geometria fiel ao arquivo de design "Cards de Divulgação.dc.html" (1080×1350). */

export const CARD_W = 1080;
export const CARD_H = 1350;

export const EVENT = {
  date: '16 de novembro',
  venue: 'Centro de Convenções Frei Caneca',
  hashtag: '#ACESummit2026',
  site: 'www.acesummit.com.br',
};

/* Os dois conjuntos de brilhos radiais do fundo, já convertidos para
   coordenadas absolutas do card (centro, tamanho da caixa, parada, cor). */
export const GLOWS = {
  a: [
    { cx: 880, cy: 160, box: 760, stop: 0.68, rgb: '242,187,19', alpha: 0.28 },
    { cx: 150, cy: 1260, box: 700, stop: 0.70, rgb: '122,79,214', alpha: 0.55 },
  ],
  b: [
    { cx: 200, cy: 160, box: 720, stop: 0.68, rgb: '242,187,19', alpha: 0.24 },
    { cx: 910, cy: 1240, box: 780, stop: 0.70, rgb: '122,79,214', alpha: 0.50 },
  ],
};

export const SCRIMS = {
  a: 'linear-gradient(to top,rgba(36,18,71,.92) 0%,rgba(36,18,71,.35) 34%,rgba(36,18,71,0) 62%)',
  b: 'linear-gradient(to top,rgba(36,18,71,.92) 0%,rgba(36,18,71,.3) 32%,rgba(36,18,71,0) 58%)',
};

export const CARDS = [
  {
    id: 'palestrante',
    tag: 'A',
    title: 'Palestrante confirmado',
    hint: 'Para quem vai subir ao palco.',
    kind: 'photo',
    glow: 'a',
    slug: 'palestrante-confirmado',
    blocks: [
      { type: 'pill', mt: 56, text: 'PALESTRANTE CONFIRMADO', size: 30, ls: '.1em', padY: 16, padX: 30 },
      { type: 'photo', mt: 44, scrim: 'a', nameSize: 76, roleSize: 30, roleMt: 18 },
    ],
    footerMt: 44,
    placeholders: { nome: 'Seu Nome', cargo: 'Cargo', empresa: 'Empresa' },
  },
  {
    id: 'patrocinador',
    tag: 'B',
    title: 'Somos patrocinadores',
    hint: 'Para empresas patrocinadoras. Use o logo em PNG com fundo transparente.',
    kind: 'logo',
    glow: 'b',
    slug: 'patrocinador',
    blocks: [
      {
        type: 'headline', mt: 72, size: 76, lh: 1.02, fill: true,
        html: 'SOMOS <em>PATROCINADORES</em><br>OFICIAIS DO<br>ACE SUMMIT 2026',
      },
      { type: 'logoPanel', label: 'PATROCINADOR' },
    ],
    footerMt: 44,
    placeholders: { empresa: 'Nome da empresa' },
  },
  {
    id: 'apoiador',
    tag: 'C',
    title: 'Somos apoiadores oficiais',
    hint: 'Para instituições e parceiros apoiadores.',
    kind: 'logo',
    glow: 'b',
    slug: 'apoiador',
    blocks: [
      {
        type: 'headline', mt: 64, size: 76, lh: 1.02, fill: true,
        html: 'SOMOS <em>APOIADORES</em><br>OFICIAIS DO<br>ACE SUMMIT 2026',
      },
      { type: 'logoPanel', label: 'APOIADOR' },
    ],
    footerMt: 44,
    placeholders: { empresa: 'Nome da empresa' },
  },
  {
    id: 'embaixador',
    tag: 'D',
    title: 'Eu sou embaixador',
    hint: 'Para embaixadores oficiais do Summit.',
    kind: 'photo',
    glow: 'a',
    slug: 'embaixador',
    blocks: [
      { type: 'headline', mt: 56, size: 64, lh: 1.02, html: 'EU SOU <em>EMBAIXADOR</em><br>OFICIAL DO ACE SUMMIT 2026' },
      { type: 'photo', mt: 40, scrim: 'b', nameSize: 62, roleSize: 30, roleMt: 18 },
    ],
    footerMt: 44,
    placeholders: { nome: 'Seu Nome', cargo: 'Cargo', empresa: 'Empresa' },
  },
];

export const cardById = (id) => CARDS.find((c) => c.id === id);
