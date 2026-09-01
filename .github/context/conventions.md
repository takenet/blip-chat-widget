# Convenções de código e commit

## Estilo de código

- **Linter**: ESLint com `extends: "standard"` ([.eslintrc](../../.eslintrc)),
  com 4 overrides: `no-new: 0`, `space-before-function-paren: 0`,
  `brace-style: ["error", "1tbs"]`, `no-return-assign: 0` (este último
  necessário porque vários setters do estilo `(x) => (this.y = x)` são usados
  no código, ex. em `_setSubscribers()` de
  [src/BlipChatWidget.js](../../src/BlipChatWidget.js)).
- **Formatter**: Prettier ([.prettierrc](../../.prettierrc)) —
  `singleQuote: true`, `semi: false` (sem ponto e vírgula), `trailingComma: "none"`,
  `arrowParens: "always"`, `eslintIntegration: true`.
- **Editor**: [.editorconfig](../../.editorconfig) — indent 2 espaços, LF,
  UTF-8, newline final obrigatório.
- O ESLint roda também como parte do build via `eslint-loader` no
  [webpack.config.js](../../webpack.config.js) (`enforce: 'pre'`, escopo
  `src/`) — um erro de lint pode quebrar o build, não é apenas cosmético.
- Sem `.prettierignore`/`.eslintignore` customizados além do padrão
  (`node_modules` excluído no webpack rule).

## Commits e versionamento

- Conventional Commits é obrigatório neste repositório (política
  organizacional — ver instruções globais do workspace) e é o que alimenta o
  **semantic-release** no pipeline de CI
  ([azure-pipelines.yml](../../azure-pipelines.yml), `to: semantic-release`):
  o tipo do commit (`feat`, `fix`, `refactor`, etc.) determina o bump de
  versão automaticamente. Não editar `version` em
  [package.json](../../package.json) manualmente — ver nota em
  [development.md](./development.md).
- `npm run commit` invoca Commitizen (`git-cz`) com o preset
  `cz-conventional-changelog`, configurado em `package.json` →
  `config.commitizen.path`. É a forma assistida recomendada de gerar
  mensagens de commit conformes, mas não é a única (mensagens manuais no
  formato Conventional Commits também são aceitas pelo semantic-release).
- Títulos de Pull Request também devem seguir Conventional Commits com o
  tipo correto (`feat`, `fix`, `chore`, `docs`, `ci`, etc.), refletindo a
  mudança real.

## Padrões observados no código-fonte

- Classes ES2015 (`class`/`extends`), sem TypeScript, sem framework de
  componentes (JS puro + templating via regex simples, ver
  `dom.render` em [src/utils/Misc.js](../../src/utils/Misc.js)).
- Métodos builder retornam `this` para encadeamento (`BlipChat.withX()`).
- Callbacks vinculados via `.bind(this)` no construtor e armazenados como
  propriedades de instância (ex. `_boundOnReceivePostMessage`) — necessário
  para suportar múltiplas instâncias simultâneas e permitir remoção correta
  de listeners em `destroy()` (ver [architecture.md](./architecture.md) e
  [decisions.md](./decisions.md) item 4).
