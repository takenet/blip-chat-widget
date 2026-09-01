# Decisões arquiteturais permanentes

Registro do estado estrutural resultante de mudanças já commitadas na branch
`feat/blip-chat-evolution`, validadas contra o código em
[src/BlipChatWidget.js](../../src/BlipChatWidget.js) e
[src/utils/Constants.js](../../src/utils/Constants.js). Não é changelog —
registra apenas o que mudou estruturalmente e por quê, não "quem fez o quê
quando".

## 1. API de rascunho de mensagem (`setDraftMessage`)

`BlipChat.setDraftMessage(text)` → `BlipChatWidget.setDraftMessage(text)` →
`postMessage` código `SetDraftMessage`. Se o chat ainda não estiver
conectado, a chamada é enfileirada em `this.pendings` e liberada em
`ChatConnected`, no mesmo mecanismo já usado por `sendMessage`/`sendCommand`.

## 2. Atualização de dados de conexão em runtime (`updateConnectionData`)

`updateConnectionData(connectionData)` sobrescreve
`this.connectionData` incondicionalmente (mesmo antes da conexão) e, se já
conectado, envia `UpdateConnectionData` imediatamente. Isso garante que a
próxima reconexão do iframe (ex.: após `RedirectUrl`) já envie o valor mais
recente sem exigir nova chamada explícita.

## 3. Atualização de estilo em runtime (`updateCustomStyle`)

`updateCustomStyle(style)` segue o mesmo padrão: sobrescreve
`this.customStyle` sempre, e reaproveita o código `CustomStyle` já existente
(originalmente enviado apenas uma vez, no `RequestCookie` inicial). Não
introduziu novo código de protocolo.

## 4. Eliminação do singleton de módulo em `BlipChatWidget`

Anteriormente, um `let self = null` em escopo de módulo era atribuído a `this`
no construtor, e usado apenas para permitir que `destroy()` removesse o
listener correto de `window` (`removeEventListener('message', self...)`).
Isso é incompatível com múltiplas instâncias simultâneas: a segunda
instância criada sobrescrevia `self`, quebrando a remoção de listener da
primeira.

**Estado atual**: eliminado. Cada instância armazena suas próprias
referências vinculadas — `_boundOnReceivePostMessage`,
`_boundResizeElements`, `_boundOpenChat` — criadas via `.bind(this)` no
construtor, permitindo que `destroy()` remova exatamente o listener daquela
instância. **Pré-requisito estrutural** para qualquer suporte a múltiplas
instâncias (ver item 6 e [roadmap.md](./roadmap.md) N3).

## 5. Sessão de convidado namespaced por `appKey` + validação de origem (log-only)

**Sessão**: a chave de `localStorage` para a conta de convidado deixou de ser
compartilhada globalmente (`blipSdkUAccount`) e passou a ser namespaced por
`appKey` via `Constants.getUserAccountKey(appKey)` =
`blipSdkUAccount:<appKey>`. Sem isso, dois bots diferentes na mesma página
(ou visitados na mesma origem ao longo do tempo) colidiriam na mesma
identidade de convidado. Migração automática e única da chave legada
compartilhada está descrita em [architecture.md](./architecture.md#sessão-e-autenticação).

**Validação de origem**: `_onReceivePostMessage` agora compara
`event.origin`/`event.source` contra a origem/`contentWindow` esperados da
própria instância. **Estado atual: log-only** — divergências geram
`console.warn`, nenhuma mensagem é rejeitada. Isso é uma decisão deliberada
de rollout gradual, não uma limitação técnica: falta decisão de produto
sobre quando/como avançar para bloqueio rígido sem quebrar integrações
existentes que dependam de comportamento atual permissivo.

## 6. Escopo de instância para lookups DOM + coordenação de singletons de documento

Lookups internos que usavam `document.getElementById(...)` (busca global no
documento) foram trocados por
`this.blipChatContainer.querySelector(...)` (escopado ao container da
própria instância). Isso elimina colisão entre duas instâncias simultâneas
— seja em modo widget (dois botões flutuantes) ou modo `target` (dois
containers fixos).

Dois estados que são singletons de documento por natureza (não podem ser
duplicados por instância) continuam existindo, mas agora são coordenados por
contadores estáticos de referência em vez de manipulados sem coordenação:

- Classe `chatParent` em `<body>`/`<html>` (aplica-se apenas em modo widget,
  para lidar com scroll/zoom em telas pequenas) — contador
  `BlipChatWidget._openWidgetsCount`.
- Tag `<meta id="blipChatMeta">` de viewport (aplica-se em qualquer modo) —
  contador `BlipChatWidget._openMetaRefCount`.

`destroy()` decrementa ambos os contadores corretamente mesmo se a instância
for destruída ainda aberta (tratado como fechamento implícito).

## Limitações conhecidas, deliberadamente não corrigidas nesta rodada

Registradas como conhecimento permanente — não são tarefas pendentes deste
documento, mas débitos estruturais reais que qualquer trabalho futuro em
`BlipChatWidget.js` precisa considerar:

- ~~**Guard de reentrância em `_openChat`**~~ — **corrigido no commit
  `c292816`**. O guard passou a depender de `this.isOpen` (síncrono,
  atualizado no fim de ambos os branches) em vez da classe de animação
  `blip-chat-iframe-opened` (aplicada de forma assíncrona via `setTimeout`
  de 100ms), que permitia cliques repetidos reentrarem no branch de
  abertura e sobre-incrementarem `_openWidgetsCount`/`_openMetaRefCount`
  sem decremento correspondente.
- **Resíduo cosmético do fix acima (`c292816`)**: o `setTimeout` que aplica
  a classe de animação não é cancelado em um fechamento rápido, então a
  classe `blip-chat-iframe-opened` ainda pode ser reaplicada ~100ms depois
  de um close rápido. Não afeta os contadores de referência (já protegidos
  por `isOpen`), é puramente visual/cosmético. Não corrigido nesta rodada.
- **Sobreposição visual de instâncias em modo widget**: duas instâncias sem
  `target` compartilham a mesma posição `fixed` definida em
  [main.scss](../../src/styles/main.scss) (`#blip-chat-container`). Não há
  mecanismo de empilhamento/offset automático. Decisão de UX pendente.
- **`buttonColor` não escopado**: o `<style>` inline em
  [chat.html](../../src/static/chat.html) aplica `background-color` ao
  seletor global `#blip-chat-open-iframe`, então duas instâncias com
  `buttonColor` diferentes entram em conflito de cascata CSS — a última
  instância renderizada no DOM vence para ambos os botões.
- **Validação de `postMessage` é apenas log-only** (ver item 5) — decisão de
  produto pendente sobre avançar para bloqueio rígido.

## 7. Persistência do estado aberto/fechado do widget entre reloads (`sessionStorage`)

Commit `565723c`. Endereça o item F1 do discovery Energisa (ver
[roadmap.md](./roadmap.md)).

**Mecanismo**: `this.isOpen` passou a ser espelhado em `sessionStorage`, sob a
chave `Constants.getWidgetOpenKey(appKey)` = `blipSdkWidgetOpen:<appKey>` —
mesmo padrão de namespacing por `appKey` já usado para a conta guest (ver
item 5). A escrita ocorre em `_setWidgetOpenState(isOpen)`, chamada nos dois
branches de `_openChat()` (abrir e fechar), e a leitura em
`_getWidgetOpenState()`, consultada no handler `CHAT_READY_CODE`: se o valor
persistido for `'true'`, o widget reabre chamando o `_openChat()` já
existente — nenhum novo caminho de abertura foi criado.

**Escopo deliberadamente restrito a modo widget**: ambas as chamadas são
guardadas por `if (!this.target)`. Em modo `target` (elemento fixo do
hospedeiro), o chat já abre incondicionalmente em `CHAT_READY_CODE`
independente deste mecanismo, então persistir o estado ali seria redundante.

**`sessionStorage`, não `localStorage`**: escolha deliberada — o estado deve
sobreviver a um reload da mesma aba/sessão, mas não deve reabrir o widget em
uma visita futura (nova aba/sessão). Isso o diferencia do mecanismo de sessão
guest (item 5), que usa `localStorage` propositalmente para persistir entre
visitas.

**Leitura/escrita protegidas por `try/catch`** (retornando `false` em caso de
erro na leitura) — mesma cautela defensiva já aplicada a operações de
`localStorage` em `StorageService.js`, relevante para navegadores com
`sessionStorage` desabilitado ou em modo privado restrito.

Revisado e aprovado (`APPROVED_WITH_NOTES`) por Reviewer independente.
