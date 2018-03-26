// Styles
import './styles/main.scss'

// Static
import chatView from './static/chat.html'

// Images
import blipIcon from './images/brand-logo.svg'

// Utils
import Constants from './utils/Constants.js'
import StorageService from './utils/StorageService.js'
import { isBase64 } from './utils/Validators'
import { NotificationHandler } from './utils/NotificationHandler'
import { dom } from './utils/Misc'

// Core
import { BlipChat } from './BlipChat'

if ((typeof window !== 'undefined' && !window._babelPolyfill) ||
  (typeof global !== 'undefined' && !global._babelPolyfill)) {
  require('babel-polyfill')
}

// Use self as context to be able to remove event listeners on widget destroy
let self = null
export class BlipChatWidget {
  constructor(appKey, buttonConfig, authConfig, account, target, events, environment) {
    self = this
    self.appKey = appKey
    self.buttonColor = buttonConfig && buttonConfig.color ? buttonConfig.color : '#2CC3D5'
    self.buttonIcon = buttonConfig && buttonConfig.icon ? buttonConfig.icon : blipIcon
    self.authConfig = self._parseAuthConfig(authConfig)
    self.account = account
    self.target = target
    self.events = events
    self.blipChatContainer = target || dom.createDiv('#blip-chat-container')
    self.isOpen = false
    self.isChatLoaded = false
    self.pendings = []

    self._setChatUrlEnvironment(environment, authConfig, appKey)

    // Check if local storage values expired
    StorageService.processLocalStorageExpires()

    self._onInit()

    // Needs to be after _onInit method because it instance needs some elements that will be created
    self.NotificationHandler = new NotificationHandler(self)
    // Set elements subscribers
    self._setSubscribers()
  }

  _onInit() {
    const rendered = dom.render(chatView, this)
    self.blipChatContainer.innerHTML = rendered

    window.addEventListener('message', self._onReceivePostMessage)

    if (!self.target) {
      // Chat presented on widget
      document.body.appendChild(self.blipChatContainer)
      document
        .getElementById('blip-chat-open-iframe')
        .addEventListener('click', self._openChat)
    } else {
      self._createIframe()
    }
    self._resizeElements()
    window.addEventListener('resize', self._resizeElements)
  }

  _setSubscribers() {
    // Subscribe update count
    const updateNotifications = count => document.getElementById('blip-chat-notifications').textContent = count
    self.NotificationHandler.subscribe(updateNotifications)

    // Subscribe update style
    const toggleNotificationsButton = count => document.getElementById('blip-chat-notifications').style.opacity = count > 0 ? 1 : 0
    self.NotificationHandler.subscribe(toggleNotificationsButton)
  }

  _setChatUrlEnvironment(environment, authConfig, appKey) {
    if (environment === 'homolog') {
      self.CHAT_URL = Constants.CHAT_URL_HMG
    } else if (environment === 'production') {
      self.CHAT_URL = Constants.CHAT_URL_PROD
    } else if (environment === 'local') {
      self.CHAT_URL = Constants.CHAT_URL_LOCAL
    }

    self.CHAT_URL += `?appKey=${encodeURIComponent(appKey)}`
    if (authConfig) self.CHAT_URL += `&authType=${authConfig.authType}`
  }

  _resizeElements() {
    const blipFAB = document.getElementById('blip-chat-open-iframe')
    const blipChatIframe = document.getElementById('blip-chat-iframe')
    const screenHeight = window.outerHeight - 250

    blipFAB.style.height = window.getComputedStyle(blipFAB).width
    if (blipChatIframe) {
      blipChatIframe.style.bottom = `calc(55px + ${blipFAB.style.height} )`
      if (!self.target) {
        // Chat presented on widget
        blipChatIframe.style.maxHeight = `${screenHeight}px`
      }
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

  _createIframe() {
    self.blipChatIframe = document.createElement('iframe')
    self.blipChatIframe.setAttribute('src', self.CHAT_URL)
    self.blipChatIframe.setAttribute('id', 'blip-chat-iframe')
    self.blipChatIframe.setAttribute('frameborder', 0)
    self.blipChatIframe.setAttribute('allow', 'geolocation')

    self.blipChatContainer.appendChild(self.blipChatIframe)
  }

  _sendPostMessage(data) {
    const blipChatIframe = document.getElementById('blip-chat-iframe')
    blipChatIframe.contentWindow.postMessage(data, self.CHAT_URL)
  }

  _openChat(event) {
    const blipChatIcon = document.getElementById('blip-chat-icon')
    const blipChatCloseIcon = document.getElementById('blip-chat-close-icon')
    const blipChatButton = document.getElementById('blip-chat-open-iframe')

    if (!self.blipChatIframe) {
      self._createIframe()
    }

    if ((self.blipChatIframe && !self.blipChatIframe.classList.contains('blip-chat-iframe-opened'))) {
      self.blipChatIframe.style.display = 'block'
      // Required for animation effect
      setTimeout(() => {
        self.blipChatIframe.classList.add('blip-chat-iframe-opened')
        self._resizeElements()

        // Hide parent html when on widget mode
        if (!self.target) {
          document.getElementsByTagName('body')[0].classList.add('chatParent')
          document.getElementsByTagName('html')[0].classList.add('chatParent')
        }

        // Add meta tag to prevent zoom on input focus
        let meta = document.createElement('meta')
        meta.name = 'viewport'
        meta.content = 'width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no'
        meta.id = 'blipChatMeta'
        document.getElementsByTagName('head')[0].appendChild(meta)
      }, 100)

      if (self.isChatLoaded) {
        blipChatButton.classList.add('opened')
      }

      blipChatIcon.style.display = 'none'
      blipChatCloseIcon.style.display = 'block'
      self._startConnection()

      // Clear float button notifications
      self.NotificationHandler.clearNotifications()
      self.isOpen = true
      if (self.events.OnEnter) self.events.OnEnter()
    } else {
      // Change display to prevent interaction on iOS
      setTimeout(() => {
        self.blipChatIframe.style.display = 'none'
      }, 500)

      // Hide parent html when on widget mode
      if (!self.target) {
        document.getElementsByTagName('body')[0].classList.remove('chatParent')
        document.getElementsByTagName('html')[0].classList.remove('chatParent')
      }
      self.blipChatIframe.classList.remove('blip-chat-iframe-opened')
      blipChatButton.classList.remove('opened')
      blipChatIcon.style.display = 'block'
      blipChatCloseIcon.style.display = 'none'
      self.isOpen = false

      if (self.events.OnLeave) self.events.OnLeave()
    }
  }

  _startConnection() {
    if (!self.isChatLoaded) {
      // Is opening for the first time
      const userAccount = self._getObfuscatedUserAccount()

      self.blipChatIframe.onload = () => self._sendPostMessage({ code: Constants.START_CONNECTION_CODE, userAccount })

      self.isChatLoaded = true
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
        if (self.account) self._sendPostMessage({ code: Constants.USER_IRIS_ACCOUNT, account: self.account })

        if (self.events.OnLoad) self.events.OnLoad()

        if (self.isOpen) {
          const blipChatButton = document.getElementById('blip-chat-open-iframe')
          blipChatButton.classList.add('opened')
        }

        if (self.pendings) {
          self.pendings.map((pending) => {
            if (pending.content) { // If is a message
              self.sendMessage(pending.content)
            } else { // is command
              self.sendCommand(pending.command)
            }
          })
        }
        break

      case Constants.PARENT_NOTIFICATION_CODE:
        // Handle notification and dispatch updates
        self.NotificationHandler.handle(message.data.messageData)
        break

      case Constants.WELCOME_SCREEN_VISIBILITY:
        const startButton = document.getElementById('blip-chat-open-iframe')
        if (message.data.visibility && !startButton.classList.contains('welcomeScreen')) {
          startButton.classList.add('welcomeScreen')
        } else if (!message.data.visibility && startButton.classList.contains('welcomeScreen')) {
          startButton.classList.remove('welcomeScreen')
        }
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
    // If chat is not connected, connect it and wait to send command
    if (!self.isChatLoaded) {
      self.pendings.push({ content })
      self._createIframe()
      self._startConnection()
      return
    }
    self._sendPostMessage({ code: Constants.SEND_MESSAGE_CODE, content })
  }

  sendCommand(command) {
    // If chat is not connected, connect it and wait to send command
    if (!self.isChatLoaded) {
      self.pendings.push({ command })
      self._createIframe()
      self._startConnection()
      return
    }
    self._sendPostMessage({ code: Constants.SEND_COMMAND_CODE, command })
  }

  destroy() {
    window.removeEventListener('message', self._onReceivePostMessage)
  }
}
