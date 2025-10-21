# Blip Chat Widget - AI Coding Agent Instructions

## Project Overview
This is a standalone JavaScript widget library for embedding BLiP chatbots into websites. It's distributed as a UMD module via unpkg CDN and npm. The widget creates an iframe-based chat UI with a floating action button, communicating with BLiP's hosted chat service via postMessage API.

## Architecture

### Two-Component System
- **`BlipChat.js`**: Public API with builder pattern (`.withAppKey()`, `.withButton()`, etc.) - this is what developers interact with
- **`BlipChatWidget.js`**: Core implementation that manages iframe lifecycle, postMessage communication, and DOM manipulation

### Communication Flow
1. Widget creates iframe pointing to `chat.blip.ai` (or custom URL via `withCustomCommonUrl`)
2. PostMessage codes (defined in `Constants.js`) coordinate bidirectional communication:
   - Widget → iframe: `START_CONNECTION_CODE`, `SEND_MESSAGE_CODE`, `CUSTOM_STYLE_CODE`
   - iframe → Widget: `CHAT_READY_CODE`, `CREATE_ACCOUNT_CODE`, `PARENT_NOTIFICATION_CODE`
3. All data passed through iframe boundary is base64-encoded for security

### Authentication Patterns
Two auth types (see `Constants.js`):
- **Guest**: Auto-generates UUID identity, stores in localStorage for 30 days (see `StorageService.js`)
- **Dev**: Requires `userIdentity` + `userPassword`, encodes as `${identity}.${botIdentifier}`

## Development Workflows

### Local Development
```bash
npm start:local    # Points to localhost:8082 (requires local chat service)
npm start          # Points to HMG environment
npm start:prod     # Points to production
```
Open `http://localhost:3000` - the `index.html` is a full sandbox with auth/connection/messaging tests.

### Build & Release
```bash
npm run build      # Production build → dist/blip-chat.js (uglified)
npm run build:hmg  # HMG build (points to staging)
```
Releases automated via semantic-release on Azure Pipelines (see `azure-pipelines.yml`). Uses conventional commits (`npm run commit` for commitizen).

## Critical Patterns

### Environment URL Configuration
URLs are **not** dynamically changed - they're baked into webpack build via `process.env.NODE_ENV`:
- `production` → `https://chat.blip.ai/`
- `homolog` → `https://hmg-chat.blip.ai/`
- `local` → `http://localhost:8082/`

Override with `withCustomCommonUrl()` for organization-specific BLiP instances.

### Widget vs Embedded Mode
- **Widget mode** (default): Creates floating button, append to `body`
- **Target mode**: Call `.withTarget('element-id')` - embeds inline, no floating button

Check distinction in `BlipChatWidget.js:_onInit()` - `if (!self.target)` branches control this.

### Storage & Persistence
`StorageService.js` implements expiring localStorage:
- Values stored as base64 JSON with `expires` timestamp
- `processLocalStorageExpires()` runs on init to clean expired items
- Used for Guest auth persistence (30 days = `2.592e+9` ms)

### Message Queueing
If `sendMessage()` or `sendCommand()` called before iframe loads, they're queued in `self.pendings[]` and flushed on `CHAT_CONNECTED_CODE` (see `BlipChatWidget.js:_onReceivePostMessage`).

### Notification System
`NotificationHandler.js` uses Observable pattern:
- Tracks messages when chat closed
- Blinks document title when tab hidden
- Updates badge count on floating button
- Cleared when chat opened

### Responsive Fullscreen Detection
`_checkFullScreen()` monitors viewport ≤480px or ≤420px height to:
- Toggle fullscreen iframe mode
- Show/hide close button via `SHOW_CLOSE_BUTTON` postMessage

## Common Modifications

### Adding New Builder Methods
1. Add property to `BlipChat.js` constructor
2. Create `withX(value)` method returning `this`
3. Pass to `BlipChatWidget` constructor
4. Handle in widget's init or send via postMessage

Example: The `withCustomSearchParams()` method allows passing custom query parameters to the iframe URL. Parameters are URL-encoded and appended in `_setChatUrlEnvironment()`.

### New PostMessage Codes
1. Define constant in `Constants.js`
2. Add case in `BlipChatWidget.js:_onReceivePostMessage()`
3. For widget→iframe, create helper using `_sendPostMessage()`

### Custom Styling
Injected via `CUSTOM_STYLE_CODE` postMessage after `CHAT_READY_CODE`. Styles applied inside iframe, not widget container. See `index.html` for comprehensive example.

## Dependencies & Build

### Key Dependencies
- **babel-polyfill**: Required for IE11 support (loaded conditionally)
- **uuid**: Generates guest user identities
- **webpack 3**: Builds UMD bundle with dev server hot reload
- **sass-loader**: Compiles `styles/main.scss` to CSS

### Webpack Specifics
- Entry: `src/BlipChat.js` (exports `BlipChat` class)
- Output: UMD module exports to `window.BlipChat`
- Images/SVGs inlined via url-loader (<8KB)
- HTML template (`chat.html`) inlined via html-loader

## Testing & Debugging

No automated tests currently (`"test": "echo \"Error: no test specified\" && exit 1"`).

**Manual testing**: Use `index.html` sandbox:
- Test both auth types (Guest/Dev)
- Test widget vs target mode (toggle with "Change SDK Template")
- Test message/command sending
- Test custom styles and connection data

**Browser Console**: Widget exposes methods on instance:
```javascript
const chat = new BlipChat().withAppKey('...').build();
chat.sendMessage({ type: "text/plain", content: "test" });
chat.toogleChat();  // Note: typo in original - should be "toggle"
chat.destroy();
```

## Known Quirks

- **Typo**: `toogleChat()` should be `toggleChat()` - maintain for backward compatibility
- **HTTPS Required**: Geolocation cards need HTTPS, some browsers block mixed content
- **CSP**: Host sites must allow `frame-src https://chat.blip.ai/`
- **Referrer-Policy**: Cannot use `no-referrer` or `same-origin` - widget needs `document.referrer`
- **Window protocol**: URLs converted with `_getNewUrlWithWebProtocol()` to match `http/https`

## File Organization

```
src/
  BlipChat.js              # Public API (builder pattern)
  BlipChatWidget.js        # Core widget logic
  utils/
    Constants.js           # PostMessage codes & URLs
    StorageService.js      # Expiring localStorage wrapper
    NotificationHandler.js # Badge & title notifications
    Observable.js          # Simple pub-sub for notifications
    Misc.js                # UUID generation, DOM helpers
  static/chat.html         # Widget button template
  styles/main.scss         # Widget container styles
  images/                  # SVG icons (inlined)
```

Focus changes in `BlipChat.js` or `BlipChatWidget.js` - utils are stable helpers.
