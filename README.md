# Cards de divulgação — ACE Summit 2026

Gerador de cards para embaixadores, patrocinadores, apoiadores e palestrantes
do ACE Summit 2026. A pessoa abre o link, escolhe o modelo, coloca a foto (ou o
logo da empresa), edita nome/cargo/empresa e baixa o PNG em **1080×1350**,
pronto para o feed do Instagram e do LinkedIn.

Sem cadastro e sem login. **A imagem nunca sai do dispositivo de quem usa** —
o card é montado e exportado no próprio navegador. O que é enviado, no momento
do download, são apenas o nome, o cargo e a empresa preenchidos, para a
organização acompanhar quem divulgou (veja *Painel de downloads*).

## Os quatro modelos

| | Modelo | O que a pessoa preenche |
|---|---|---|
| A | Participação confirmada | Foto + nome, cargo, empresa |
| B | Somos patrocinadores | Logo da empresa (ou o nome dela) |
| C | Somos apoiadores oficiais | Logo da empresa (ou o nome dela) |
| D | Eu sou embaixador | Foto + nome, cargo, empresa |

Palestrantes usam o modelo A.

Cada modelo tem link direto por hash, útil para mandar o card certo para cada
público sem a pessoa precisar escolher:

```
.../#participante
.../#patrocinador
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
index.html            página (galeria de modelos + editor + painel)
cards.js              definição dos 4 cards: geometria, textos fixos, brilhos
card.css              o card em si, sempre em 1080×1350 reais
app.js                fundo em canvas, slot de imagem, ajuste de texto, exportação
app.css               interface do gerador e do painel
admin.js              painel de downloads, carregado sob demanda em /#admin-ace
logo.js               logo do evento embutido como data URI (gerado)
api/_db.js            conexão com o Postgres e conferência da senha
api/log.js            POST — registra um download
api/admin.js          GET  — lista os downloads (exige a senha)
tools/inline-logo.js  regera logo.js a partir de um PNG
dev-server.js         servidor local; também simula a API em memória
```

O projeto é 100% texto: o logo do evento vive embutido em `logo.js` como data
URI, então não há binário para hospedar, é uma requisição a menos e não existe
risco de CORS na hora de exportar. Se a marca mudar:

```bash
node tools/inline-logo.js caminho/para/novo-logo.png
```

Fonte **Syne** (400–800) via Google Fonts, como no design system do evento.

## Painel de downloads

Fica em **`/#admin-ace`**. Nada no site aponta para lá: não existe botão nem
link, e o endereço só é conhecido por quem recebeu.

Vale ser explícito sobre o que isso protege. O que vem depois de `#` nunca é
enviado ao servidor, então o hash apenas esconde a entrada — **quem protege os
dados é a senha** exigida pela API. Sem `ADMIN_KEY` configurada, o endpoint
responde 503 e o painel não abre, para nunca ficar aberto por esquecimento.

O painel mostra o total por modelo, a tabela com data, modelo, nome, cargo e
empresa, busca por texto, filtro por modelo e exportação em CSV (separado por
`;` e com BOM, para o Excel em português abrir os acentos certos).

### O que é registrado

Uma linha por download, com nome, cargo, empresa, qual card e quando. **A foto
e o logo não são enviados** — eles nunca saem do navegador. A página avisa isso
em texto, logo abaixo do botão de baixar.

### Configuração na Vercel

1. **Banco**: no projeto, aba *Storage*, conecte um Postgres (Neon). A variável
   de conexão entra sozinha; o código aceita `POSTGRES_URL`, `DATABASE_URL` e
   os outros nomes usuais, então serve para qualquer uma das integrações.
2. **Senha**: em *Settings → Environment Variables*, crie `ADMIN_KEY` com a
   senha do painel.
3. Faça um novo deploy para as variáveis valerem.

A tabela `downloads` é criada sozinha na primeira chamada — não há migração
para rodar à mão.

## Rodando local

```bash
node dev-server.js
```

Depois abra <http://localhost:4173>. O `dev-server.js` também responde a
`/api/log` e `/api/admin` guardando os registros em memória, para dar para
mexer no painel sem subir banco nenhum. A senha local é `dev` (ou o valor de
`ADMIN_KEY`, se você definir), e os dados somem quando o servidor para.

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
