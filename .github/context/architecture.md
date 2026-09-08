# Arquitetura interna

## Arquivos-chave e responsabilidades

- [src/BlipChat.js](../../src/BlipChat.js) — API pública, padrão builder.
  Instancia `BlipChatWidget` em `build()`, delega todas as chamadas de
  instância (`sendMessage`, `sendCommand`, `setDraftMessage`,
  `updateConnectionData`, `updateCustomStyle`, `toogleChat`, `destroy`) ao
  widget.
- [src/BlipChatWidget.js](../../src/BlipChatWidget.js) — implementação core:
  lifecycle do container/iframe, protocolo `postMessage`, autenticação
  (Guest/Dev), sessão de convidado, notificações, resize/fullscreen,
  controle de instâncias simultâneas.
- [src/utils/Constants.js](../../src/utils/Constants.js) — catálogo único de
  códigos do protocolo `postMessage` e constantes de ambiente
  (`CHAT_URL_LOCAL`/`_HMG`/`_PROD`, `*_CODE`, `USER_ACCOUNT_KEY`,
  `getUserAccountKey(appKey)`, `DEV_AUTH`/`GUEST_AUTH`,
  `COOKIES_EXPIRATION` = 2.592e9 ms = 30 dias).
- [src/utils/StorageService.js](../../src/utils/StorageService.js) —
  persistência de identidade guest via `localStorage`, valores serializados
  em base64 (`window.btoa`/`atob`) com campo `expires`. `processLocalStorageExpires()`
  varre todo o `localStorage` do domínio no construtor do widget e remove
  entradas expiradas (não apenas as do próprio SDK — atenção ao side effect
  em domínios que compartilham `localStorage` com outras chaves base64+JSON).
  Não é usado para o estado aberto/fechado do widget (ver `sessionStorage`
  abaixo) — este último não passa por `StorageService.js`, é lido/escrito
  diretamente em `BlipChatWidget._setWidgetOpenState`/`_getWidgetOpenState`.
- [src/utils/NotificationHandler.js](../../src/utils/NotificationHandler.js) —
  badge de contagem no botão flutuante + alternância do título da aba
  (`document.title`) enquanto a aba está oculta (`document.hidden`) e o chat
  fechado.
- [src/utils/Misc.js](../../src/utils/Misc.js) — utilitários DOM
  (`dom.createDiv`, `dom.render` — engine de template simples via regex
  `{{ chave }}`) e diversos (`misc.decodeBlipKey`, `misc.createGuestUser`
  via `uuid`).
- [src/static/chat.html](../../src/static/chat.html) — template do botão
  flutuante apenas (ver restrição estrutural em
  [project.md](./project.md)). Inclui um `<style>` inline não escopado que
  aplica `buttonColor` a `#blip-chat-open-iframe`.
- [src/styles/main.scss](../../src/styles/main.scss) — CSS do widget.
  Seletores por ID fixo (`#blip-chat-container`, `#blip-chat-iframe`,
  `#blip-chat-open-iframe`, `#blip-chat-notifications`), `position: fixed`.
  Classe global `.chatParent` aplicada a `<body>`/`<html>` para lidar com
  scroll/zoom em telas pequenas.
- [index.html](../../index.html) — harness de teste manual (não publicado),
  único lugar do repo com exemplo de uso completo incluindo teste de
  mensagens, comandos, auth Dev/Guest e dados de conexão.

## Protocolo `postMessage`

Comunicação bidirecional entre `BlipChatWidget` e o conteúdo do iframe via
`window.postMessage`. Códigos definidos em `Constants.js` e despachados por
`switch (message.data.code)` em `_onReceivePostMessage`.

### Enviados pelo widget (`_sendPostMessage`)

| Código                                             | Quando                                                                            |
| -------------------------------------------------- | --------------------------------------------------------------------------------- |
| `BlipSdkStartConnection` (`START_CONNECTION_CODE`) | `onload` do iframe — envia `userAccount`, `connectionData`, `disableHistory`      |
| `UserIrisAccount` (`USER_IRIS_ACCOUNT`)            | Após `ChatConnected`, se `this.account` estiver definido                          |
| `SendMessage` / `SendCommand` / `SetDraftMessage`  | `sendMessage()` / `sendCommand()` / `setDraftMessage()` públicos                  |
| `UpdateConnectionData`                             | `updateConnectionData()` público, apenas se já conectado                          |
| `CustomStyle`                                      | No `RequestCookie` inicial (se `customStyle` definido) e em `updateCustomStyle()` |
| `CustomMessageMetadata`                            | No `RequestCookie` inicial, se `customMessageMetadata` definido                   |

### Recebidos pelo widget

| Código                                       | Efeito                                                                                                                                                                                                                                                   |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RedirectUrl`                                | Recarrega o **mesmo** iframe com nova URL (`_reloadIframe`) — não cria elemento novo. Também usado por `blip-chat` para redirect de tenant (subdomínio), reaproveitando o mesmo valor de string de `GOOGLE_ANALYTICS_EVENT_NAME`; ver [decisions.md](./decisions.md#descoberta-arquitetural-colisão-de-valor-de-string-entre-constantsredirect_url-widget-e-google_analytics_event_name-blip-chat) |
| `RequestCookie` (`CHAT_READY_CODE`)          | Torna o botão visível (modo widget) ou abre o chat (modo `target`); marca `isChatLoaded`; reenvia `customStyle`/`customMessageMetadata`; em modo widget, reabre o chat via `_openChat()` se houver estado `sessionStorage` persistido e o chat ainda não estiver aberto (ver seção abaixo). Guardado por `!this.isOpen` em ambos os modos — idempotente a múltiplas ocorrências no mesmo ciclo de vida da instância (ex.: redirect de tenant recarregando o mesmo iframe), ver [decisions.md](./decisions.md#8-bug-real-em-f1-chat-fechava-sozinho-após-redirect-de-tenant-em-bots-multi-tenant-guard-de-idempotência-em-chat_ready_code) |
| `CreateAccount`                              | Decodifica `userAccount` (base64+JSON); se `authType === Guest`, persiste no `localStorage` namespaced; dispara `OnCreateAccount`                                                                                                                        |
| `ChatConnected`                              | Envia `UserIrisAccount` se aplicável; dispara `OnLoad`; libera fila `pendings` (mensagens/comandos/draft enfileirados antes da conexão)                                                                                                                  |
| `NewBotMessage` (`PARENT_NOTIFICATION_CODE`) | Repassa a `NotificationHandler.handle()`                                                                                                                                                                                                                 |
| `CloseWidget`                                | Força fechamento (`_openChat(null, true)`)                                                                                                                                                                                                               |

### Validação de origem/fonte (log-only)

`_onReceivePostMessage` compara `message.origin` contra
`new URL(this.NEW_URL || this.CHAT_URL).origin` e `message.source` contra
`this.blipChatIframe.contentWindow`. Diferenças geram apenas
`console.warn` — **nenhuma mensagem é bloqueada** hoje. Decisão pendente
sobre avançar para bloqueio rígido (ver [decisions.md](./decisions.md) item 5
e [roadmap.md](./roadmap.md) N1/N2).

## Resolução de `CHAT_URL`

Por instância, em `_setChatUrlEnvironment`: `customCommonUrl` (se fornecido)
tem prioridade; senão, `CHAT_URL_HMG`/`CHAT_URL_PROD`/`CHAT_URL_LOCAL`
conforme `environment` (`homolog`/`production`/`local`, default vem de
`process.env.NODE_ENV` se não passado explicitamente via `withEnvironment`).
Este é o mecanismo usado para determinar a origem esperada na validação de
`postMessage` acima.

`_getNewUrlWithWebProtocol(newUrl)` (usado para montar `this.NEW_URL` a
partir do `RedirectUrl` de tenant) deriva o protocolo de
`new window.URL(this.CHAT_URL).protocol` — o protocolo do ambiente do chat,
não o da página host (`window.location.protocol`). Usar o protocolo da
página host quebrava silenciosamente a validação de origem acima sempre que
host e chat divergiam em protocolo (ex.: host `http://` local testando
contra chat `https://` real).

## Sessão e autenticação

Dois tipos: `Guest` (`GUEST_AUTH`, default) e `Dev` (`DEV_AUTH`, requer
`userIdentity`/`userPassword` em `authConfig`, lança erro caso contrário).

Sessão guest é persistida em `localStorage` sob a chave
`getUserAccountKey(appKey)` = `blipSdkUAccount:<appKey>` — namespaced por
`appKey` desde o commit `4c8c644` (ver [decisions.md](./decisions.md)).
Migração automática de uma execução legada por instância: se a chave
namespaced não existir mas a chave legada compartilhada `blipSdkUAccount`
existir, o valor é decodificado (protegido por `try/catch`), reescrito sob a
chave namespaced, e a chave legada é sempre removida (`finally`) — mesmo se
a decodificação falhar (valor corrompido é descartado, não repropagado).

## Múltiplas instâncias simultâneas

Suportado desde os commits `c06c726`/`6c88cf8`: cada instância de
`BlipChatWidget` usa `this` (não singleton de módulo) e escopa lookups DOM
via `this.blipChatContainer.querySelector(...)`. Dois estados globais reais
de documento (não eliminináveis por instância, pois são singletons de
documento por natureza) são coordenados por contadores estáticos de
referência na classe:

- `BlipChatWidget._openWidgetsCount` — controla a classe `chatParent` em
  `<body>`/`<html>`, aplicada apenas em modo widget (sem `target`).
- `BlipChatWidget._openMetaRefCount` — controla a tag
  `<meta id="blipChatMeta">` de viewport, aplicada em qualquer modo.

Ver limitações conhecidas ainda não corrigidas em [decisions.md](./decisions.md).

## Persistência do estado aberto/fechado do widget (`sessionStorage`)

Além da sessão guest (`localStorage`, ver acima), o widget persiste
separadamente se está aberto ou fechado, em `sessionStorage` sob a chave
`Constants.getWidgetOpenKey(appKey)` = `blipSdkWidgetOpen:<appKey>` —
namespaced por `appKey` no mesmo padrão da sessão guest, mas em
`sessionStorage` (não `localStorage`): sobrevive a um reload da mesma
aba/sessão, mas não a uma nova visita. Aplica-se apenas em modo widget
(`!this.target`); modo `target` já abre incondicionalmente em
`CHAT_READY_CODE`. Escrito/lido via `_setWidgetOpenState`/
`_getWidgetOpenState` em `BlipChatWidget.js` (commit `565723c`, ver
[decisions.md](./decisions.md#7-persistência-do-estado-abertofechado-do-widget-entre-reloads-sessionstorage)).
