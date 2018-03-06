import chatView from './chat.html'
import blipIcon from './images/brand-logo.svg'
import closeIcon from './images/close.svg'
import Constants from './Constants.js'
import StorageService from './StorageService.js'
import './styles.scss'
import { isBase64 } from './Validators'
import { BlipChat } from './BlipChat'

if ((typeof window !== 'undefined' && !window._babelPolyfill) ||
  (typeof global !== 'undefined' && !global._babelPolyfill)) {
  require('babel-polyfill')
}

// Use self as context to be able to remove event listeners on widget destroy
let self = null
export class BlipChatWidget {
  constructor(appKey, buttonConfig, authConfig, target, events, environment) {
    self = this
    self.appKey = appKey
    self.buttonColor = buttonConfig.color
    self.buttonIcon = buttonConfig.icon || blipIcon
    self.authConfig = self._parseAuthConfig(authConfig)
    self.target = target
    self.events = events
    self.blipChatContainer = target || self._createDiv('#blip-chat-container')
    self.isOpen = false

    self.CHAT_URL = Constants.CHAT_URL_LOCAL
    if (environment === 'homolog') {
      self.CHAT_URL = Constants.CHAT_URL_HMG
    } else if (environment === 'production') {
      self.CHAT_URL = Constants.CHAT_URL_PROD
    }

    self.CHAT_URL += `?appKey=${encodeURIComponent(appKey)}`
    if (authConfig) self.CHAT_URL += `&authType=${authConfig.authType}`

    // Check if local storage values expired
    StorageService.processLocalStorageExpires()

    self._onInit()
  }

  _onInit() {
    const rendered = self._render(chatView, this)
    self.blipChatContainer.innerHTML = rendered

    window.addEventListener('message', self._onReceivePostMessage)

    if (!self.target) {
      // Chat presented on widget
      document.body.appendChild(self.blipChatContainer)
      document
        .getElementById('blip-chat-open-iframe')
        .addEventListener('click', self._openChat)
    }
    self._resizeElements()
    window.addEventListener('resize', self._resizeElements)
  }

  _createDiv(selector) {
    const div = document.createElement('div')

    if (selector) {
      if (selector.startsWith('.')) {
        // is selector a Class
        div.className = selector.substr(1)
      } else if (selector.startsWith('#')) {
        // is selector an ID
        div.id = selector.substr(1)
      }
    }

    return div
  }

  _render(template, context = this) {
    return template.replace(/{{([^{}]*)}}/g, (replaced, bind) => {
      let key = bind
      if (typeof key === 'string') {
        key = key.trim()
      }

      return context[key]
    })
  }

  _resizeElements() {
    const blipFAB = document.getElementById('blip-chat-open-iframe')
    const blipChatIframe = document.getElementById('blip-chat-iframe')
    const screenHeight = window.outerHeight - 250

    blipFAB.style.height = window.getComputedStyle(blipFAB).width
    blipChatIframe.style.bottom = `calc(15px + ${blipFAB.style.height} )`
    if (!self.target) {
      // Chat presented on widget
      blipChatIframe.style.maxHeight = `${screenHeight}px`
    }
  }

  _parseAuthConfig(authConfig) {
    if (!authConfig) {
      return { authType: BlipChat.GUEST_AUTH }
    }

    authConfig.userPassword =
      authConfig.userPassword !== undefined && !isBase64(authConfig.userPassword)
        ? window.btoa(authConfig.userPassword)
        : authConfig.userPassword

    const [identifier] = window.atob(self.appKey).split(':')

    authConfig.userIdentity = encodeURIComponent(`${authConfig.userIdentity}.${identifier}`)

    return authConfig
  }

  _openChat(event) {
    const blipChatIframe = document.getElementById('blip-chat-iframe')
    const blipChatIcon = document.getElementById('blip-chat-icon')

    blipChatIframe.style.boxShadow = '0 0 20px 1px rgba(0,0,0,.2)'
    blipChatIframe.style.borderRadius = '5px'

    if (!blipChatIframe.classList.contains('blip-chat-iframe-opened')) {
      if (!self.isOpen) {
        // Is opening for the first time
        const userAccount = self._getObfuscatedUserAccount()
        blipChatIframe.contentWindow.postMessage(
          { code: Constants.START_CONNECTION_CODE, userAccount },
          self.CHAT_URL
        )
        self.isOpen = true
      }
      blipChatIframe.classList.add('blip-chat-iframe-opened')

      blipChatIcon.src = closeIcon

      if (self.events.OnEnter) self.events.OnEnter()
    } else {
      blipChatIframe.classList.remove('blip-chat-iframe-opened')

      blipChatIcon.src = self.buttonIcon

      if (self.events.OnLeave) self.events.OnLeave()
    }
  }

  _onReceivePostMessage(message) {
    switch (message.data.code) {
      case Constants.CHAT_READY_CODE:
        if (!self.target) {
          // Chat presented on widget
          let button = document.getElementById('blip-chat-open-iframe')
          button.style.visibility = 'visible'
          button.style.opacity = 1
        } else {
          // Chat presented on fixed element
          self._openChat()
        }
        break

      case Constants.CREATE_ACCOUNT_CODE:
        let data = window.atob(message.data.userAccount)
        StorageService.setToLocalStorage(
          Constants.USER_ACCOUNT_KEY,
          JSON.parse(data),
          Constants.COOKIES_EXPIRATION
        )
        break

      case Constants.CHAT_CONNECTED_CODE:
        if (self.events.OnLoad) self.events.OnLoad()
        break
    }
  }

  _getObfuscatedUserAccount() {
    if (!self.authConfig || self.authConfig.authType === Constants.GUEST_AUTH) {
      return StorageService.getFromLocalStorage(Constants.USER_ACCOUNT_KEY)
    } else if (self.authConfig.authType === Constants.DEV_AUTH) {
      return window.btoa(JSON.stringify(self.authConfig))
    }
  }

  sendMessage(content) {
    const blipChatIframe = document.getElementById('blip-chat-iframe')
    blipChatIframe.contentWindow.postMessage(
      { code: Constants.SEND_MESSAGE_CODE, content },
      self.CHAT_URL
    )
  }

  destroy() {
    window.removeEventListener('message', self._onReceivePostMessage)
  }
}
