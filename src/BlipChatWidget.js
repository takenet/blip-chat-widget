import chatView from './chat.html'
import blipIcon from './images/brand-logo.svg'
import closeIcon from './images/close.svg'
import Constants from './Constants.js'
import StorageService from './StorageService.js'
import './styles.scss'
import 'babel-polyfill'

const createDiv = selector => {
  const div = document.createElement('div')

  if (selector) {
    if (selector.startsWith('.')) {
      // is selector a Class
      div.className = selector.substr(1)
    }
    else if (selector.startsWith('#')) {
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

export class BlipChatWidget {
  constructor (appKey, buttonConfig, authConfig, target, events) {
    this.appKey = appKey
    this.buttonColor = buttonConfig.color
    this.buttonIcon = buttonConfig.icon || blipIcon
    this.authConfig = authConfig
    this.target = target
    this.events = events
    this.blipChatContainer = target || createDiv('#blip-chat-container')
    this.isOpen = false

    this.CHAT_URL = Constants.CHAT_URL_LOCAL
    if (process.env.NODE_ENV === 'homolog') {
      console.log('Env', process.env)
      this.CHAT_URL = Constants.CHAT_URL_HMG
    }
    else if (process.env.NODE_ENV === 'production') {
      this.CHAT_URL = Constants.CHAT_URL_PROD
    }
    this.CHAT_URL += `?appKey=${appKey}`
    if (authConfig) this.CHAT_URL += `&authType=${authConfig.authType}`

    // Check if local storage values expired
    StorageService._processLocalStorageExpires()

    this.onInit()
  }

  onInit () {
    const rendered = render(chatView, this)
    this.blipChatContainer.innerHTML = rendered

    window.addEventListener('message', this._onReceivePostMessage.bind(this))
    document.body.appendChild(this.blipChatContainer)
    if (!this.target) {
      // Chat presented on widget
      document
        .getElementById('blip-chat-open-iframe')
        .addEventListener('click', this.openChat.bind(this))
    }
  }

  openChat (event) {
    const blipChatIframe = document.getElementById('blip-chat-iframe')
    const blipChatIcon = document.getElementById('blip-chat-icon')

    if (!blipChatIframe.classList.contains('blip-chat-iframe-opened')) {
      if (!this.isOpen) {
        // Is opening for the first time
        const userData = this._getObfuscatedUserAccount()
        blipChatIframe.contentWindow.postMessage({ code: Constants.START_CONNECTION_CODE, userData }, this.CHAT_URL)
        this.isOpen = true
      }
      blipChatIframe.classList.add('blip-chat-iframe-opened')

      blipChatIcon.src = closeIcon

      if (this.events.OnEnter) this.events.OnEnter()
    }
    else {
      blipChatIframe.classList.remove('blip-chat-iframe-opened')

      blipChatIcon.src = this.buttonIcon

      if (this.events.OnLeave) this.events.OnLeave()
    }
  }

  _onReceivePostMessage (message) {
    console.log(message)
    switch (message.data.code) {
      case Constants.CHAT_READY_CODE:
        if (!this.target) {
          // Chat presented on widget
          let button = document.getElementById('blip-chat-open-iframe')
          button.style.visibility = 'visible'
          button.style.opacity = 1
        }
        else {
          // Chat presented on fixed element
          this.openChat()
        }
        break

      case Constants.CREATE_ACCOUNT_CODE:
        let data = window.atob(message.data.userData)
        StorageService._setToLocalStorage(Constants.USER_ACCOUNT_KEY, JSON.parse(data), Constants.COOKIES_EXPIRATION)
        break

      case Constants.CHAT_CONNECTED_CODE:
        if (this.events.OnLoad) this.events.OnLoad()
        break
    }
  }

  _getObfuscatedUserAccount () {
    if (!this.authConfig || this.authConfig.authType === Constants.GUEST_AUTH) {
      return StorageService._getFromLocalStorage(Constants.USER_ACCOUNT_KEY)
    }
    else if (this.authConfig.authType === Constants.DEV_AUTH) {
      return window.btoa(JSON.stringify(this.authConfig))
    }
  }

  _sendMessage (content) {
    const blipChatIframe = document.getElementById('blip-chat-iframe')
    blipChatIframe.contentWindow.postMessage({ code: Constants.SEND_MESSAGE_CODE, content }, this.CHAT_URL)
  }
}
