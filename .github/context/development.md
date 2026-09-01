# Desenvolvimento e toolchain

## Stack

JavaScript ES2015+ transpilado via Babel
([.babelrc](../../.babelrc): `preset-es2015` +
`transform-object-rest-spread`). Bundle via Webpack 3
([webpack.config.js](../../webpack.config.js)): `HtmlWebpackPlugin`,
`ExtractTextPlugin`, `UglifyJsPlugin` (produção), saída UMD única
(`dist/blip-chat.js`). Estilos em SCSS via `node-sass@4.14.1` +
`sass-loader`.

Sem `browserslist` configurado no `package.json`. Sem suíte de testes
automatizada — `"test": "echo \"Error: no test specified\" && exit 1"` em
[package.json](../../package.json). Qualquer verificação de regressão hoje
depende de teste manual via [index.html](../../index.html)
(harness não publicado) e/ou revisão de código.

## Scripts (`package.json`)

| Script                | Efeito                                                       |
| --------------------- | ------------------------------------------------------------ |
| `npm start`           | `webpack-dev-server` porta 3000, `NODE_ENV=homolog`          |
| `npm run start:local` | idem, `NODE_ENV=local`                                       |
| `npm run start:prod`  | idem, `NODE_ENV=production`                                  |
| `npm run build`       | build de produção (`NODE_ENV=production webpack`)            |
| `npm run build:hmg`   | build de homologação                                         |
| `npm run commit`      | `git-cz` (Commitizen, convenção `cz-conventional-changelog`) |

## CI/CD

[azure-pipelines.yml](../../azure-pipelines.yml): trigger em `master`,
runner `ubuntu-latest`, Node `14.21.3`, usa template interno
(`Operações/template-take-blip`) com `to: semantic-release` — versionamento
e publicação são automatizados por `semantic-release` no pipeline, não
manualmente. Pipeline roda `npm prune` + `npm run build`, com integração
SonarQube (`skipSast: true`).

**Nota**: o campo `version` em [package.json](../../package.json) neste
checkout (`1.9.0-beta.1`) está desatualizado em relação à última tag real do
histórico Git (`v1.12.0`) — não é bug, é efeito esperado de
`semantic-release` gerenciar versão/tag no momento do release via CI, não no
código-fonte commitado. Não usar o campo `version` do `package.json` como
fonte de verdade da versão publicada; usar tags Git ou o pacote publicado no
npm/unpkg.

## Limitação de ambiente conhecida: `node-sass` + arm64

`node-sass@4.14.1` é uma dependência nativa (binding C++ pré-compilado por
versão de Node/arquitetura). Em ambientes de desenvolvimento local com
arquitetura arm64 (ex.: Apple Silicon), o binário pré-compilado esperado
pode não existir para essa combinação, causando falha de build isolada ao
processamento de [main.scss](../../src/styles/main.scss) via `sass-loader`.

Isso é uma **limitação de ambiente local**, não do código: não afeta a
compilação dos módulos JS (`babel-loader`/`webpack`), apenas o pipeline
`.scss` → CSS. O pipeline de CI (`ubuntu-latest`, Node 14.21.3) não é
arm64 e não é afetado. Contornos possíveis (não aplicados por este
documento, pois seriam mudança de dependência de produção):
rebuild do binding nativo para a arquitetura local, ou execução via
container/VM x86_64.
