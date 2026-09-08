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

Commit `565723c` (versão inicial), corrigido por `e0f6a39`, `2c4686f` e
`f74cd94`. Endereça o item F1 do discovery Energisa (ver
[roadmap.md](./roadmap.md)).

**Mecanismo**: `this.isOpen` é espelhado em `sessionStorage`, sob a
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

**BLOCKER real encontrado em auditoria de completude e corrigido (não apenas
nota cosmética)**: a versão inicial (`565723c`) implementava escrita/leitura
corretamente, mas o mecanismo era **inalcançável no cenário de uso padrão**.
Em modo widget, `_createIframe()` só era chamado por clique do usuário ou por
uma chamada explícita (`sendMessage`/`sendCommand`/`setDraftMessage`) — nunca
no boot (`_onInit()`). Como a leitura do estado persistido só acontece dentro
do handler `CHAT_READY_CODE`, e esse handler só existe depois que o iframe é
criado, um reload de página com o widget previamente aberto nunca recriava o
iframe sozinho, então o widget nunca reabria. O mecanismo de persistência
"funcionava" isoladamente (dados eram escritos e lidos corretamente), mas o
comportamento fim a fim (reabrir após reload) nunca ocorria em produção.

Corrigido em 3 commits, todos revisados e aprovados (`BLOCKER RESOLVIDO` /
`APPROVED`) por Reviewer independente:

- `e0f6a39` — `_onInit()` passa a chamar `_createIframe()` proativamente
  quando `_getWidgetOpenState()` é `true`, para que `CHAT_READY_CODE` chegue
  a disparar e a lógica de reabertura já existente possa rodar.
- `2c4686f` — `destroy()` passa a limpar a flag de `sessionStorage` (via
  `_setWidgetOpenState(false)`, guardado pela mesma condição `!this.target`
  já usada em `_openChat()`). Sem isso, destruir um widget aberto e criar
  uma nova instância com o mesmo `appKey` na mesma aba/sessão reabriria a
  nova instância inesperadamente.
- `f74cd94` — `_createIframe()` passa a ser idempotente (`if
(this.blipChatIframe) return` como primeira linha), porque a criação
  proativada no boot (`e0f6a39`) introduziu uma corrida real: se
  `sendMessage`/`sendCommand`/`setDraftMessage` fossem chamados antes de
  `CHAT_READY_CODE`, o call site correspondente também tentava criar o
  iframe, resultando em um segundo iframe, handshake duplicado e
  bookkeeping de estado/contadores de referência corrompido.

**A versão atual (pós estes 3 commits) é a que funciona fim a fim**;
referências anteriores a F1 como simplesmente "implementado" citando apenas
`565723c` estão incompletas — ver correção em [roadmap.md](./roadmap.md).

## 8. Bug real em F1: chat fechava sozinho após redirect de tenant em bots multi-tenant (guard de idempotência em `CHAT_READY_CODE`)

Descoberto e corrigido nesta sessão, ainda não commitado no momento deste
registro. Endereça um blocker adicional do mecanismo descrito no item 7 —
distinto do blocker original (`565723c`), específico do cenário multi-tenant.

**Root cause**: para bots com `tenantId` nas extras da conta, quando o host
atual não corresponde ao subdomínio esperado, `blip-chat` (`App.vue`) envia
ao widget um `postMessage` reaproveitando o código de string `'RedirectUrl'`
(mesmo valor de `AppSettings.get('GOOGLE_ANALYTICS_EVENT_NAME')` em
`blip-chat/src/settings.json` — colisão de valor de string, não de nome de
constante, entre dois repositórios distintos; ver "Descoberta arquitetural"
abaixo). O widget trata isso como instrução de redirect
(`Constants.REDIRECT_URL`) e chama `_reloadIframe()`, que navega o **mesmo**
elemento `<iframe>` (não cria um novo). Isso dispara um segundo
`CHAT_READY_CODE` a partir do conteúdo recarregado do iframe — o estado JS do
widget (`this.isOpen`, contadores, etc.) não é recriado, só o conteúdo do
iframe recarrega.

O handler de `CHAT_READY_CODE` em `_onReceivePostMessage` chamava
`this._openChat()` incondicionalmente sempre que `_getWidgetOpenState()` era
`true`. Como `_openChat()` é uma função de toggle puro e `this.isOpen` já
era `true` da primeira chamada (reabertura automática após reload de
página, mecanismo do item 7), a segunda chamada — disparada pelo redirect de
tenant — caía no ramo de **fechar**, fechando o chat que tinha acabado de
reabrir sozinho. Efeito visível: o chat "pisca" aberto e fecha sozinho, sem
nenhuma ação do usuário.

**Fix aplicado** (escopo único em `BlipChatWidget.js`, `_onReceivePostMessage`,
`case Constants.CHAT_READY_CODE`): guard `&& !this.isOpen` adicionado ao
ramo `!this.target` (reabertura automática só ocorre se ainda não estiver
aberto) e `if (!this.isOpen) { this._openChat() }` no ramo `else`/modo
`target` (que antes chamava `_openChat()` sem nenhuma condição). Torna a
reabertura idempotente a múltiplos `CHAT_READY_CODE` no mesmo ciclo de vida
do widget, sem alterar o comportamento de toggle usado por clique manual no
botão flutuante, `BlipChat.toogleChat()` público, ou pelo `CloseWidget`
(`forceClose=true`, caminho não afetado por este guard).

**Bug secundário corrigido no mesmo escopo**: `_getNewUrlWithWebProtocol(newUrl)`
derivava o protocolo de `window.location.protocol` — o protocolo da página
HOST onde o widget está embutido, não o do ambiente do chat. Isso causava um
`console.warn` espúrio de "postMessage recebida com origin/source
inesperado" (validação de origem, ver item 5) sempre que a página host e o
domínio do chat tinham protocolos diferentes (ex.: sandbox local em `http://`
testando contra HMG real em `https://`) durante um redirect de tenant.
Corrigido para derivar de `new window.URL(this.CHAT_URL).protocol` — o
protocolo correto do ambiente do chat (local/homolog/produção).

### Descoberta arquitetural: colisão de valor de string entre `Constants.REDIRECT_URL` (widget) e `GOOGLE_ANALYTICS_EVENT_NAME` (`blip-chat`)

Conhecimento estrutural permanente, relevante para qualquer investigação
futura envolvendo `CHAT_READY_CODE` ou reload de iframe: o valor de string
`'RedirectUrl'` é definido de forma independente em dois repositórios —
`Constants.REDIRECT_URL` neste repo (`src/utils/Constants.js`) e
`GOOGLE_ANALYTICS_EVENT_NAME` em `blip-chat/src/settings.json` — sem
nenhuma referência compartilhada entre eles. O nome da constante do lado
`blip-chat` (`GOOGLE_ANALYTICS_EVENT_NAME`) sugere um propósito de
analytics, mas o valor foi reaproveitado por `redirectIfNotUsingTenantIdOnUrl`
(`blip-chat/src/App.vue`) para instruir o widget a recarregar o iframe em um
subdomínio de tenant diferente — um uso não documentado como tal no nome da
constante de origem. Qualquer mudança de valor de um dos dois lados sem
coordenar o outro quebra silenciosamente o mecanismo de redirect de tenant
(F1 multi-tenant), sem erro explícito — o widget simplesmente pararia de
reagir ao redirect, ou passaria a reagir a eventos de analytics não
relacionados.

O mecanismo de redirect em si **reutiliza o mesmo `<iframe>`** via
`_reloadIframe()` (não cria um novo elemento) — por isso o `CHAT_READY_CODE`
subsequente chega ao mesmo listener/estado de instância já existente, o que
é a precondição para o bug descrito acima. Qualquer novo handler de
`CHAT_READY_CODE` ou de outro código de protocolo que assuma "isto só
dispara uma vez por instância" deve considerar este caminho de reentrada.

### Padrão de risco permanente descoberto (relevante para mudanças futuras neste arquivo)

Qualquer mudança que torne a criação do iframe (`_createIframe()`)
condicional a **estado** (ex.: valor persistido, flag interna) em vez de
apenas a uma ação direta do usuário (clique) precisa auditar **todos os call
sites** de `_createIframe()`, não apenas o caminho feliz que motivou a
mudança. Neste arquivo, `_createIframe()` é chamado a partir de múltiplos
pontos independentes — boot (`_onInit`), clique do usuário (`_openChat`), e
chamadas públicas que podem chegar antes da conexão
(`sendMessage`/`sendCommand`/`setDraftMessage`) — e cada um assumia
implicitamente que era o único responsável por criar o iframe. Introduzir um
novo caminho de criação (boot) sem tornar `_createIframe()` idempotente é
suficiente para reintroduzir esta classe de bug (iframe duplicado, handshake
corrompido, contadores de referência incorretos). Qualquer novo call site
futuro deve assumir que outro pode disparar concorrentemente.
