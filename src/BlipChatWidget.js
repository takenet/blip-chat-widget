import chatView from './chat.html'
import blipIcon from './images/brand-logo.svg'
import closeIcon from './images/close.svg'
import Constants from './Constants.js'
import StorageService from './StorageService.js'
import './styles.scss'
import 'babel-polyfill'

const createDiv = (selector) => {
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

const render = (template, context = this) =>
  template.replace(/{{([^{}]*)}}/g, (replaced, bind) => {
    let key = bind
    if (typeof key === 'string') {
      key = key.trim()
    }

    return context[key]
  })

// Use self as context to be able to remove event listeners on widget destroy
let self = null
export class BlipChatWidget {
  constructor(appKey, buttonConfig, authConfig, target, events) {
    self = this
    self.appKey = appKey
    self.buttonColor = buttonConfig.color
    self.buttonIcon = buttonConfig.icon || blipIcon
    self.authConfig = authConfig || Constants.GUEST_AUTH
    self.target = target
    self.events = events
    self.blipChatContainer = target || createDiv('#blip-chat-container')
    self.isOpen = false

    self.CHAT_URL = Constants.CHAT_URL_LOCAL
    if (process.env.NODE_ENV === 'homolog') {
      self.CHAT_URL = Constants.CHAT_URL_HMG
    } else if (process.env.NODE_ENV === 'production') {
      self.CHAT_URL = Constants.CHAT_URL_PROD
    }

    self.CHAT_URL += `?appKey=${encodeURIComponent(appKey)}`
    if (authConfig) self.CHAT_URL += `&authType=${authConfig.authType}`

    // Check if local storage values expired
    StorageService._processLocalStorageExpires()

    self.onInit()
  }

  onInit() {
    const rendered = render(chatView, this)
    self.blipChatContainer.innerHTML = rendered

    window.addEventListener('message', self._onReceivePostMessage)

    if (!self.target) {
      // Chat presented on widget
      document.body.appendChild(self.blipChatContainer)
      document
        .getElementById('blip-chat-open-iframe')
        .addEventListener('click', self.openChat)
    }
    this.resizeElements()
    window.addEventListener('resize', this.resizeElements)
  }

  resizeElements() {
    const blipFAB = document.getElementById('blip-chat-open-iframe')
    const blipChatIframe = document.getElementById('blip-chat-iframe')
    const screenHeight = window.outerHeight - 250

    blipFAB.style.height = window.getComputedStyle(blipFAB).width
    blipChatIframe.style.bottom = `calc(15px + ${blipFAB.style.height} )`
    blipChatIframe.style.maxHeight = `${screenHeight}px`
  }

  openChat(event) {
    const blipChatIframe = document.getElementById('blip-chat-iframe')
    const blipChatIcon = document.getElementById('blip-chat-icon')

    blipChatIframe.style.boxShadow = '0 -1px 12px 0 #c5c5c5'
    blipChatIframe.style.borderRadius = '5px'

    if (!blipChatIframe.classList.contains('blip-chat-iframe-opened')) {
      if (!self.isOpen) {
        // Is opening for the first time
        const userData = self._getObfuscatedUserAccount()
        blipChatIframe.contentWindow.postMessage(
          { code: Constants.START_CONNECTION_CODE, userData },
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
          self.openChat()
        }
        break

      case Constants.CREATE_ACCOUNT_CODE:
        let data = window.atob(message.data.userAccount)
        StorageService._setToLocalStorage(
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
      return StorageService._getFromLocalStorage(Constants.USER_ACCOUNT_KEY)
    } else if (self.authConfig.authType === Constants.DEV_AUTH) {
      return window.btoa(JSON.stringify(self.authConfig))
    }
  }

  _sendMessage(content) {
    const blipChatIframe = document.getElementById('blip-chat-iframe')
    blipChatIframe.contentWindow.postMessage(
      { code: Constants.SEND_MESSAGE_CODE, content },
      self.CHAT_URL
    )
  }

  _destroy() {
    window.removeEventListener('message', self._onReceivePostMessage)
  }
}
