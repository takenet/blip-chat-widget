# Context Manifest — blip-chat-widget

Base de conhecimento permanente deste repositório. Criada em modo BOOTSTRAP.

## Como usar

Leia estes documentos antes de investigar o código do zero. Eles registram
conhecimento que não é trivialmente recuperável por um `grep` rápido:
decisões arquiteturais já tomadas, restrições estruturais, e estado de
roadmap. Não substituem a leitura do código para detalhes de implementação.

## Documentos

| Arquivo                              | Conteúdo                                                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| [project.md](./project.md)           | O que é o projeto, arquitetura em 4 camadas, restrição estrutural central (sem UI de conversa neste repo)    |
| [architecture.md](./architecture.md) | Arquivos-chave e responsabilidades, protocolo `postMessage`, padrões de sessão/autenticação                  |
| [decisions.md](./decisions.md)       | Decisões arquiteturais permanentes já implementadas, com racional e estado atual                             |
| [development.md](./development.md)   | Toolchain, comandos, limitações de ambiente conhecidas, ausência de testes automatizados                     |
| [conventions.md](./conventions.md)   | Regras de lint/formatação, convenção de commits (Conventional Commits + semantic-release), padrões de código |
| [roadmap.md](./roadmap.md)           | Estado dos itens de roadmap de produto (Blocos A/B/C) frente à arquitetura atual                             |

## Fonte de verdade

Para fatos de código: o próprio código em `src/` e o histórico Git, validados
nesta sessão de bootstrap (branch `feat/blip-chat-evolution`, HEAD `6c88cf8`).
Para o roadmap de produto: documento externo (Google Sites, não versionado
neste repo) — ver [roadmap.md](./roadmap.md) para detalhes de proveniência.

## Manutenção

Após qualquer mudança aprovada que altere comportamento estrutural (protocolo
`postMessage`, arquitetura de sessão, API pública de `BlipChat`/`BlipChatWidget`,
toolchain de build), rode o Context Engineer em modo SYNC para manter esta base
atualizada. Não registre aqui changelog de commits individuais — apenas o
conhecimento permanente resultante.
