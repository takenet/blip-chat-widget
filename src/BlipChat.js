import { BlipChatWidget } from './BlipChatWidget.js'

const DEV_AUTH = 'Dev'
const GUEST_AUTH = 'Guest'

const ENTER_EVENT = 'OnEnter'
const LEAVE_EVENT = 'OnLeave'
const LOAD_EVENT = 'OnLoad'
const CREATE_ACCOUNT_EVENT = 'OnCreateAccount'

export class BlipChat {
  constructor() {
    this.events = {}
  }

  static get DEV_AUTH() {
    return DEV_AUTH
  }

  static get GUEST_AUTH() {
    return GUEST_AUTH
  }

  static get ENTER_EVENT() {
    return ENTER_EVENT
  }

  static get LEAVE_EVENT() {
    return LEAVE_EVENT
  }

  static get LOAD_EVENT() {
    return LOAD_EVENT
  }

  static get CREATE_ACCOUNT_EVENT() {
    return CREATE_ACCOUNT_EVENT
  }

  withAppKey(appkey) {
    this.appKey = appkey
    return this
  }

  withButton(buttonConfig) {
    this.buttonConfig = buttonConfig
    return this
  }

  withAuth(authConfig) {
    this.authConfig = authConfig
    return this
  }

  withAccount(account) {
    this.account = account
    return this
  }

  withTarget(target) {
    this.target = document.getElementById(target)
    return this
  }

  withEnvironment(environment) {
    this.environment = environment
    return this
  }

  withEventHandler(name, handler) {
    this.events[name] = handler
    return this
  }

  build() {
    this.widget = new BlipChatWidget(
      this.appKey,
      this.buttonConfig,
      this.authConfig,
      this.account,
      this.target,
      this.events,
      this.environment || process.env.NODE_ENV
    )
  }

  toogleChat() {
    this.widget._openChat()
  }

  destroy() {
    this.widget.destroy()
    if (this.widget && this.target) {
      // Chat exists on specified element
      while (this.target.firstChild) {
        this.target.removeChild(this.target.firstChild)
      }
    } else if (this.widget) {
      // Chat exists as widget
      this.widget.blipChatContainer.parentElement.removeChild(
        this.widget.blipChatContainer
      )
    }
    this.widget = null
  }

  sendMessage(content) {
    this.widget.sendMessage(content)
  }

  sendCommand(command) {
    this.widget.sendCommand(command)
  }
}
