# Cards de divulgação — ACE Summit 2026

Gerador de cards para embaixadores, patrocinadores, apoiadores e palestrantes
do ACE Summit 2026. A pessoa abre o link, escolhe o modelo, coloca a foto (ou o
logo da empresa), edita nome/cargo/empresa e baixa o PNG em **1080×1350**,
pronto para o feed do Instagram e do LinkedIn.

Sem cadastro, sem login, sem backend: é uma página estática e **nenhuma imagem
sai do dispositivo de quem usa** — o card é montado e exportado no próprio
navegador.

## Os cinco modelos

| | Modelo | O que a pessoa preenche |
|---|---|---|
| A | Participação confirmada | Foto + nome, cargo, empresa |
| B | Somos patrocinadores | Logo da empresa (ou o nome dela) |
| C | Eu sou palestrante | Foto + nome, cargo, empresa |
| D | Somos apoiadores oficiais | Logo da empresa (ou o nome dela) |
| E | Eu sou embaixador | Foto + nome, cargo, empresa |

Cada modelo tem link direto por hash, útil para mandar o card certo para cada
público sem a pessoa precisar escolher:

```
.../#participante
.../#patrocinador
.../#palestrante
.../#apoiador
.../#embaixador
```

## Como funciona

- **Foto**: clique, arraste o arquivo ou cole da área de transferência. A foto
  entra em *cover* no espaço do card; dá para reposicionar arrastando no
  preview e ajustar o tamanho no zoom. Fotos de celular tiradas de lado entram
  na orientação certa (a orientação EXIF é respeitada).
- **Logo**: entra em *contain* dentro do painel branco, sem distorcer. PNG com
  fundo transparente fica melhor. Quem não tem o arquivo em mãos pode só
  digitar o nome da empresa — ele aparece no lugar do logo.
- **Textos**: nome, cargo e empresa têm ajuste automático de corpo, então nome
  comprido não estoura o card. Os textos ficam salvos no navegador entre
  visitas (as imagens, não).
- **Download**: no celular, quando o navegador permite, abre a folha nativa de
  compartilhamento — salvar na galeria ou mandar direto para o Instagram. No
  desktop baixa o arquivo direto, sem passar pela folha de compartilhamento.

## Fidelidade ao design

O card é montado em HTML/CSS no tamanho real de 1080×1350 e o preview é o mesmo
elemento apenas reduzido por `transform: scale()` — o que aparece na tela é
exatamente o que sai no PNG.

Duas decisões que sustentam isso:

- O **fundo** (gradiente de 160° e os dois brilhos radiais) é pintado em
  `<canvas>` em `app.js`, com a geometria convertida do design original, em vez
  de depender de como a biblioteca de captura interpreta gradientes CSS.
- Os **títulos fixos** já vêm em caixa alta no markup, sem depender de
  `text-transform` na hora da exportação.

A exportação usa [html2canvas](https://html2canvas.hertzen.com/) (via CDN) sobre
um clone do card em tamanho natural.

Conferido por amostragem de pixels no PNG exportado: fundo, raio de canto,
degradê sobre a foto e cores da marca batem com o design de origem.

## Estrutura

```
index.html            página (galeria de modelos + editor)
cards.js              definição dos 5 cards: geometria, textos fixos, brilhos
card.css              o card em si, sempre em 1080×1350 reais
app.js                fundo em canvas, slot de imagem, ajuste de texto, exportação
app.css               interface do gerador
logo.js               logo do evento embutido como data URI (gerado)
tools/inline-logo.js   regera logo.js a partir de um PNG
dev-server.js         servidor estático mínimo, só para rodar local
```

O projeto é 100% texto: o logo do evento vive embutido em `logo.js` como data
URI, então não há binário para hospedar, é uma requisição a menos e não existe
risco de CORS na hora de exportar. Se a marca mudar:

```bash
node tools/inline-logo.js caminho/para/novo-logo.png
```

Fonte **Syne** (400–800) via Google Fonts, como no design system do evento.

## Rodando local

```bash
node dev-server.js
```

Depois abra <http://localhost:4173>.

## Publicando

É um site estático — qualquer hospedagem serve, sem build.

**Vercel** (caminho usado aqui): importe o repositório, deixe *Framework Preset*
em **Other** e **não** preencha build command nem output directory — a raiz já é
o site. Cada push na `main` republica.

Alternativas: Netlify e Cloudflare Pages funcionam do mesmo jeito. O GitHub
Pages também serviria, mas exige plano pago em repositório privado.

A página precisa ser servida por HTTP (não abra o `index.html` direto do disco:
os módulos JavaScript não carregam em `file://`).

## Origem

Layout derivado de `Cards de Divulgação.dc.html`, do projeto de design
"Artes para ACE Summit 2026", com as cores e a tipografia do design system
ACE Summit (roxo `#6034BF` / `#5632A6` / `#241247`, amarelo `#F2BB13`).
