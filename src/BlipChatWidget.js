// Styles
import './styles/main.scss'

// Static
import chatView from './static/chat.html'

// Images
import blipIcon from './images/brand-logo.svg'

// Utils
import Constants from './utils/Constants.js'
import StorageService from './utils/StorageService.js'
import { NotificationHandler } from './utils/NotificationHandler'
import { dom, misc } from './utils/Misc'

// Core
import { BlipChat } from './BlipChat'

if (
  (typeof window !== 'undefined' && !window._babelPolyfill) ||
  (typeof global !== 'undefined' && !global._babelPolyfill)
) {
  require('babel-polyfill')
}

export class BlipChatWidget {
  constructor(
    appKey,
    buttonConfig,
    authConfig,
    account,
    target,
    events,
    environment,
    customStyle,
    customMessageMetadata,
    customCommonUrl,
    connectionData,
    disableHistory,
    customSearchParams
  ) {
    this.appKey = appKey
    this.buttonColor =
      buttonConfig && buttonConfig.color ? buttonConfig.color : '#2CC3D5'
    this.buttonIcon =
      buttonConfig && buttonConfig.icon ? buttonConfig.icon : blipIcon
    this.authConfig = this._parseAuthConfig(authConfig)
    this.account = this._addAuthTypeToExtras(account, authConfig)
    this.target = target
    this.events = events
    this.blipChatContainer = target || dom.createDiv('#blip-chat-container')
    this.isOpen = false
    this.isChatLoaded = false
    this.isFullScreen = false
    this.pendings = []
    this.customStyle = customStyle
    this.customMessageMetadata = customMessageMetadata
    this.customCommonUrl = customCommonUrl
    this.connectionData = connectionData
    this.disableHistory = disableHistory
    this.customSearchParams = customSearchParams

    this._setChatUrlEnvironment(environment, authConfig, appKey)

    // Check if local storage values expired
    StorageService.processLocalStorageExpires()

    // Bind methods used as event listener references so `this` stays correct
    // per instance and destroy() can remove the exact same bound reference
    this._boundOnReceivePostMessage = this._onReceivePostMessage.bind(this)
    this._boundResizeElements = this._resizeElements.bind(this)
    this._boundOpenChat = this._openChat.bind(this)

    this._onInit()

    // Needs to be after _onInit method because it instance needs some elements that will be created
    this.NotificationHandler = new NotificationHandler(this)
    // Set elements subscribers
    this._setSubscribers()
  }

  _onInit() {
    const rendered = dom.render(chatView, this)
    this.blipChatContainer.innerHTML = rendered

    window.addEventListener('message', this._boundOnReceivePostMessage)

    if (!this.target) {
      // Chat presented on widget
      document.body.appendChild(this.blipChatContainer)
      this.blipChatContainer
        .querySelector('#blip-chat-open-iframe')
        .addEventListener('click', this._boundOpenChat)
      // Recreate the iframe on boot when the widget was left open before a
      // reload, so CHAT_READY_CODE arrives and the reopen logic can run
      if (this._getWidgetOpenState()) {
        this._createIframe()
      }
    } else {
      this._createIframe()
    }
    this._resizeElements()
    window.addEventListener('resize', this._boundResizeElements)
  }

  _setSubscribers() {
    // Subscribe update count
    const updateNotifications = (count) =>
      (this.blipChatContainer.querySelector(
        '#blip-chat-notifications'
      ).textContent = count)
    this.NotificationHandler.subscribe(updateNotifications)

    // Subscribe update style
    const toggleNotificationsButton = (count) =>
      (this.blipChatContainer.querySelector(
        '#blip-chat-notifications'
      ).style.opacity = count > 0 ? 1 : 0)
    this.NotificationHandler.subscribe(toggleNotificationsButton)
  }

  _setChatUrlEnvironment(environment, authConfig, appKey) {
    if (this.customCommonUrl) {
      this.CHAT_URL = this.customCommonUrl
    } else if (environment === 'homolog') {
      this.CHAT_URL = Constants.CHAT_URL_HMG
    } else if (environment === 'production') {
      this.CHAT_URL = Constants.CHAT_URL_PROD
    } else if (environment === 'local') {
      this.CHAT_URL = Constants.CHAT_URL_LOCAL
    }

    this.CHAT_URL += `?appKey=${encodeURIComponent(appKey)}`
    if (authConfig) this.CHAT_URL += `&authType=${authConfig.authType}`

    // Append custom search parameters if provided
    if (this.customSearchParams) {
      Object.keys(this.customSearchParams).forEach((key) => {
        this.CHAT_URL += `&${encodeURIComponent(key)}=${encodeURIComponent(this.customSearchParams[key])}`
      })
    }
  }

  _resizeElements() {
    const blipFAB = this.blipChatContainer.querySelector(
      '#blip-chat-open-iframe'
    )
    const blipChatIframe =
      this.blipChatContainer.querySelector('#blip-chat-iframe')
    const screenHeight = window.outerHeight - 250

    blipFAB.style.height = window.getComputedStyle(blipFAB).width
    if (blipChatIframe) {
      blipChatIframe.style.bottom = `calc(55px + ${blipFAB.style.height} )`
      if (!this.target) {
        // Chat presented on widget
        blipChatIframe.style.maxHeight = `${screenHeight}px`
      }
    }
    this._checkFullScreen()
  }

  _addAuthTypeToExtras(account, authConfig) {
    let authType = authConfig
      ? authConfig.authType || BlipChat.GUEST_AUTH
      : BlipChat.GUEST_AUTH
    if (account) {
      account.extras = account.extras || {}
      account.extras.authType = authType
    } else {
      account = {
        extras: { authType }
      }
    }

    return account
  }

  _parseAuthConfig(authConfig) {
    if (!authConfig) {
      return { authType: BlipChat.GUEST_AUTH }
    }

    if (
      authConfig.authType === Constants.DEV_AUTH &&
      (!authConfig.userIdentity || !authConfig.userPassword)
    ) {
      throw new Error(
        `Parameters 'userIdentity' and 'userPassword' must be provided when using DEV auth`
      )
    }

    authConfig.userPassword = window.btoa(authConfig.userPassword)

    const [identifier] = window.atob(this.appKey).split(':')

    authConfig.userIdentity = encodeURIComponent(
      `${authConfig.userIdentity}.${identifier}`
    )

    return authConfig
  }

  _reloadIframe() {
    this.blipChatIframe.src = this.NEW_URL
  }

  _createIframe(url = this.CHAT_URL) {
    // Idempotent: several call sites (boot, _openChat, sendMessage/sendCommand/
    // setDraftMessage before the chat has loaded) may race to create the
    // iframe. Creating a second one would duplicate the handshake and corrupt
    // the open-state/ref-count bookkeeping.
    if (this.blipChatIframe) return

    this.blipChatIframe = document.createElement('iframe')
    this.blipChatIframe.setAttribute('src', url)
    this.blipChatIframe.setAttribute('id', 'blip-chat-iframe')
    this.blipChatIframe.setAttribute('frameborder', 0)
    this.blipChatIframe.setAttribute(
      'allow',
      'geolocation; microphone; clipboard-read; clipboard-write'
    )
    this.blipChatIframe.setAttribute('allowFullscreen', true)

    this.blipChatIframe.onload = () => {
      const userAccount = this._getObfuscatedUserAccount()
      const connectionData = this._getObfuscatedConnectionData()
      this._sendPostMessage({
        code: Constants.START_CONNECTION_CODE,
        userAccount,
        connectionData,
        disableHistory: this.disableHistory
      })
    }

    this.blipChatContainer.appendChild(this.blipChatIframe)
  }

  _sendPostMessage(data) {
    const blipChatIframe =
      this.blipChatContainer.querySelector('#blip-chat-iframe')
    if (blipChatIframe && blipChatIframe.contentWindow) {
      blipChatIframe.contentWindow.postMessage(
        data,
        this.NEW_URL || this.CHAT_URL
      )
    }
  }

  _openChat(event, forceClose) {
    const blipChatIcon = this.blipChatContainer.querySelector('#blip-chat-icon')
    const blipChatCloseIcon = this.blipChatContainer.querySelector(
      '#blip-chat-close-icon'
    )
    const blipChatButton = this.blipChatContainer.querySelector(
      '#blip-chat-open-iframe'
    )

    if (!this.blipChatIframe) {
      this._createIframe()
    }

    if (!forceClose && this.blipChatIframe && !this.isOpen) {
      // Hide parent html when on widget mode, only for the first widget instance opening
      if (!this.target) {
        BlipChatWidget._openWidgetsCount++
        if (BlipChatWidget._openWidgetsCount === 1) {
          document.getElementsByTagName('body')[0].classList.add('chatParent')
          document.getElementsByTagName('html')[0].classList.add('chatParent')
        }
      }

      // Add meta tag to prevent zoom on input focus, only if not already present
      BlipChatWidget._openMetaRefCount++
      if (!document.getElementById('blipChatMeta')) {
        let meta = document.createElement('meta')
        meta.name = 'viewport'
        meta.content =
          'width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no'
        meta.id = 'blipChatMeta'
        document.getElementsByTagName('head')[0].appendChild(meta)
      }

      // this.blipChatIframe.style.display = 'block'
      // Required for animation effect
      setTimeout(() => {
        this.blipChatIframe.classList.add('blip-chat-iframe-opened')
        this._resizeElements()
      }, 100)

      if (this.isChatLoaded) {
        blipChatButton.classList.add('opened')
      }

      blipChatIcon.style.display = 'none'
      blipChatCloseIcon.style.display = 'block'

      // Clear float button notifications
      this.NotificationHandler.clearNotifications()
      this.isOpen = true
      if (!this.target) {
        this._setWidgetOpenState(true)
      }
      if (this.events.OnEnter) this.events.OnEnter()
    } else {
      // Change display to prevent interaction on iOS
      setTimeout(() => {
        // this.blipChatIframe.style.display = 'none'
      }, 500)

      // Remove meta tag to prevent zoom on input focus, only when the last open instance closes
      BlipChatWidget._openMetaRefCount = Math.max(
        0,
        BlipChatWidget._openMetaRefCount - 1
      )
      if (BlipChatWidget._openMetaRefCount === 0) {
        let meta = document.getElementById('blipChatMeta')
        if (meta) meta.parentElement.removeChild(meta)
      }

      // Hide parent html when on widget mode, only when the last widget instance closes
      if (!this.target) {
        BlipChatWidget._openWidgetsCount = Math.max(
          0,
          BlipChatWidget._openWidgetsCount - 1
        )
        if (BlipChatWidget._openWidgetsCount === 0) {
          document
            .getElementsByTagName('body')[0]
            .classList.remove('chatParent')
          document
            .getElementsByTagName('html')[0]
            .classList.remove('chatParent')
        }
      }
      this.blipChatIframe.classList.remove('blip-chat-iframe-opened')
      blipChatButton.classList.remove('opened')
      blipChatIcon.style.display = 'block'
      blipChatCloseIcon.style.display = 'none'
      this.isOpen = false
      if (!this.target) {
        this._setWidgetOpenState(false)
      }

      if (this.events.OnLeave) this.events.OnLeave()
    }
  }

  _getNewUrlWithWebProtocol(newUrl) {
    return `${window.location.protocol}//${newUrl}`
  }

  // Persists the widget open/closed state for the current tab/session only,
  // so a page reload restores it but a new session never reopens on its own
  _setWidgetOpenState(isOpen) {
    try {
      window.sessionStorage.setItem(
        Constants.getWidgetOpenKey(this.appKey),
        String(isOpen)
      )
    } catch (e) {}
  }

  _getWidgetOpenState() {
    try {
      return (
        window.sessionStorage.getItem(
          Constants.getWidgetOpenKey(this.appKey)
        ) === 'true'
      )
    } catch (e) {
      return false
    }
  }

  _onReceivePostMessage(message) {
    const expectedOrigin = new window.URL(this.NEW_URL || this.CHAT_URL).origin
    const originValid = message.origin === expectedOrigin
    const sourceValid = this.blipChatIframe
      ? message.source === this.blipChatIframe.contentWindow
      : true

    if (!originValid || !sourceValid) {
      console.warn(
        '[BlipChatWidget] postMessage recebida com origin/source inesperado',
        {
          origin: message.origin,
          expectedOrigin,
          hasIframeRef: !!this.blipChatIframe
        }
      )
    }

    switch (message.data.code) {
      case Constants.REDIRECT_URL:
        this.NEW_URL = this._getNewUrlWithWebProtocol(message.data.url)
        this._reloadIframe()
        break
      case Constants.CHAT_READY_CODE:
        if (!this.target) {
          // Chat presented on widget
          let button = this.blipChatContainer.querySelector(
            '#blip-chat-open-iframe'
          )
          button.style.visibility = 'visible'
          button.style.opacity = 1
          if (this._getWidgetOpenState()) {
            this._openChat()
          }
        } else {
          // Chat presented on fixed element
          this._openChat()
        }
        this.isChatLoaded = true
        const blipChatButton = this.blipChatContainer.querySelector(
          '#blip-chat-open-iframe'
        )
        blipChatButton.classList.add('opened')
        this._checkFullScreen()
        if (this.customStyle) {
          this._sendPostMessage({
            code: Constants.CUSTOM_STYLE_CODE,
            customStyle: this.customStyle
          })
        }

        if (this.customMessageMetadata) {
          console.log(
            'postado: ' +
              Constants.CUSTOM_MESSAGE_METADATA +
              this.customMessageMetadata
          )
          this._sendPostMessage({
            code: Constants.CUSTOM_MESSAGE_METADATA,
            customMessageMetadata: this.customMessageMetadata
          })
        }
        break

      case Constants.CREATE_ACCOUNT_CODE:
        let data = window.atob(message.data.userAccount)

        if (this.events.OnCreateAccount) this.events.OnCreateAccount()

        const accountObj = JSON.parse(data)
        if (accountObj.authType === Constants.GUEST_AUTH) {
          StorageService.setToLocalStorage(
            Constants.getUserAccountKey(this.appKey),
            accountObj,
            Constants.COOKIES_EXPIRATION
          )
        }
        break

      case Constants.CHAT_CONNECTED_CODE:
        if (this.account) {
          this._sendPostMessage({
            code: Constants.USER_IRIS_ACCOUNT,
            account: this.account
          })
        }
        if (this.events.OnLoad) this.events.OnLoad()

        if (this.pendings) {
          this.pendings.map((pending) => {
            if (pending.content) {
              // If is a message
              this.sendMessage(pending.content)
            } else if (pending.draft !== undefined) {
              // If is a draft message
              this.setDraftMessage(pending.draft)
            } else {
              // is command
              this.sendCommand(pending.command)
            }
          })
        }
        break

      case Constants.PARENT_NOTIFICATION_CODE:
        // Handle notification and dispatch updates
        this.NotificationHandler.handle(message.data.messageData)
        break

      case Constants.CLOSE_WIDGET:
        this._openChat(null, true)
        break
    }
  }

  serializeFunction(f) {
    if (typeof f === 'function') {
      return encodeURI(f.toString())
    }
  }

  _checkFullScreen() {
    if (!this.isChatLoaded || this.target) return
    const width = Math.max(
      document.documentElement.clientWidth,
      window.innerWidth || 0
    )
    const height = Math.max(
      document.documentElement.clientHeight,
      window.innerHeight || 0
    )
    const enteredFullScreen = width <= 480 || height <= 420
    if (
      (!this.isFullScreen && enteredFullScreen) ||
      (this.isFullScreen && !enteredFullScreen)
    ) {
      this.isFullScreen = enteredFullScreen
      this._sendPostMessage({
        code: Constants.SHOW_CLOSE_BUTTON,
        showCloseButton: this.isFullScreen
      })
    }
  }

  _getObfuscatedUserAccount() {
    if (!this.authConfig || this.authConfig.authType === Constants.GUEST_AUTH) {
      const namespacedUserAccountKey = Constants.getUserAccountKey(this.appKey)
      let localUserAccount = StorageService.getFromLocalStorage(
        namespacedUserAccountKey
      )

      if (!localUserAccount) {
        const legacyUserAccount = StorageService.getFromLocalStorage(
          Constants.USER_ACCOUNT_KEY
        )

        if (legacyUserAccount) {
          try {
            // Migrate the legacy shared key to the namespaced one and drop it
            const migratedAccount = JSON.parse(window.atob(legacyUserAccount))
            StorageService.setToLocalStorage(
              namespacedUserAccountKey,
              migratedAccount,
              Constants.COOKIES_EXPIRATION
            )
            localUserAccount = StorageService.getFromLocalStorage(
              namespacedUserAccountKey
            )
          } catch (error) {
            // Corrupted legacy value: discard it and fall back to guest creation below
            console.warn(
              'BlipChat: legacy user account key was corrupted and has been discarded',
              error
            )
          } finally {
            window.localStorage.removeItem(Constants.USER_ACCOUNT_KEY)
          }
        }
      }

      if (!localUserAccount) {
        const { botIdentifier } = misc.decodeBlipKey(this.appKey)
        let userAccount = misc.createGuestUser(botIdentifier)
        userAccount = { ...userAccount, ...this.account }
        return window.btoa(JSON.stringify(userAccount))
      } else {
        return localUserAccount
      }
    } else if (this.authConfig.authType === Constants.DEV_AUTH) {
      let userAccount = this.account
      userAccount.userIdentity = this.authConfig.userIdentity
      userAccount.userPassword = this.authConfig.userPassword
      userAccount.authType = this.authConfig.authType
      userAccount.userName = this.authConfig.userName
      userAccount.userEmail = this.authConfig.userEmail

      return window.btoa(JSON.stringify(userAccount))
    }
  }

  _getObfuscatedConnectionData() {
    return window.btoa(JSON.stringify(this.connectionData))
  }

  sendMessage(userMessage) {
    // Process Message before sending
    let content
    if (typeof userMessage === 'object') {
      if (!userMessage.payload) {
        // Lime document
        content = {
          content: userMessage.content,
          type: userMessage.type,
          metadata: userMessage.metadata
        }
      } else {
        // { payload:, preview: } document
        content = {
          content: userMessage.payload.content,
          type: userMessage.payload.type
        }
        if (userMessage.preview) {
          content.metadata = {
            '#blip.payload.content':
              typeof userMessage.preview.content === 'string'
                ? userMessage.preview.content
                : JSON.stringify(userMessage.preview.content),
            '#blip.payload.type': userMessage.preview.type
          }
        } else {
          content.metadata = {
            '#blip.hiddenMessage': true
          }
        }
      }
    } else {
      content = userMessage
    }

    // If chat is not connected, connect it and wait to send command
    if (!this.isChatLoaded) {
      this.pendings.push({ content })
      this._createIframe()
      return
    }
    this._sendPostMessage({ code: Constants.SEND_MESSAGE_CODE, content })
  }

  sendCommand(command) {
    // If chat is not connected, connect it and wait to send command
    if (!this.isChatLoaded) {
      this.pendings.push({ command })
      this._createIframe()
      return
    }
    this._sendPostMessage({ code: Constants.SEND_COMMAND_CODE, command })
  }

  setDraftMessage(text) {
    // If chat is not connected, connect it and wait to set the draft message
    if (!this.isChatLoaded) {
      this.pendings.push({ draft: text })
      this._createIframe()
      return
    }
    this._sendPostMessage({
      code: Constants.SET_DRAFT_MESSAGE_CODE,
      draft: text
    })
  }

  updateConnectionData(connectionData) {
    // Always keep the latest value so the next connection/reconnection sends it automatically
    this.connectionData = connectionData
    if (!this.isChatLoaded) {
      return
    }
    this._sendPostMessage({
      code: Constants.UPDATE_CONNECTION_DATA_CODE,
      connectionData: this._getObfuscatedConnectionData()
    })
  }

  updateCustomStyle(customStyle) {
    // Always keep the latest value so CHAT_READY_CODE sends it on future (re)connections
    this.customStyle = customStyle
    if (!this.isChatLoaded) {
      return
    }
    this._sendPostMessage({
      code: Constants.CUSTOM_STYLE_CODE,
      customStyle: this.customStyle
    })
  }

  destroy() {
    // Treat a destroy while still open as an implicit close, so the shared
    // 'chatParent' class / '#blipChatMeta' ref counts don't leak.
    if (this.isOpen) {
      BlipChatWidget._openMetaRefCount = Math.max(
        0,
        BlipChatWidget._openMetaRefCount - 1
      )
      if (BlipChatWidget._openMetaRefCount === 0) {
        let meta = document.getElementById('blipChatMeta')
        if (meta) meta.parentElement.removeChild(meta)
      }

      if (!this.target) {
        BlipChatWidget._openWidgetsCount = Math.max(
          0,
          BlipChatWidget._openWidgetsCount - 1
        )
        if (BlipChatWidget._openWidgetsCount === 0) {
          document
            .getElementsByTagName('body')[0]
            .classList.remove('chatParent')
          document
            .getElementsByTagName('html')[0]
            .classList.remove('chatParent')
        }
        this._setWidgetOpenState(false)
      }
      this.isOpen = false
    }

    window.removeEventListener('message', this._boundOnReceivePostMessage)
    window.removeEventListener('resize', this._boundResizeElements)
  }
}

// Reference counters for document-level singletons shared across all BlipChatWidget instances.
// _openWidgetsCount tracks open widget-mode (!target) instances and gates the 'chatParent'
// class on <body>/<html>. _openMetaRefCount tracks open instances of any mode and gates the
// shared '#blipChatMeta' viewport tag, since that tag was previously created for both modes.
BlipChatWidget._openWidgetsCount = 0
BlipChatWidget._openMetaRefCount = 0
