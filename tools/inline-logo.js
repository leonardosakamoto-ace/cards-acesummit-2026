/* Regera logo.js a partir de um PNG.
   Uso: node tools/inline-logo.js caminho/para/logo-white.png

   O logo vive embutido como data URI para que o projeto seja 100% texto:
   nada de arquivo binário para hospedar, uma requisição a menos e nenhum
   risco de CORS na hora de exportar o PNG. */
const fs = require('fs');
const path = require('path');

const src = process.argv[2];
if (!src) {
  console.error('uso: node tools/inline-logo.js <arquivo.png>');
  process.exit(1);
}

const b64 = fs.readFileSync(src).toString('base64');
const out = path.join(__dirname, '..', 'logo.js');

fs.writeFileSync(
  out,
  `/* Logo ACE Summit em branco, embutido como data URI.
   NÃO edite à mão — gerado por tools/inline-logo.js a partir de
   ${path.basename(src)} (${(fs.statSync(src).size / 1024).toFixed(1)} KB). */

export const LOGO_WHITE =
  'data:image/png;base64,${b64}';
`,
);

console.log(`logo.js gerado a partir de ${src} (${(b64.length / 1024).toFixed(1)} KB em base64)`);
