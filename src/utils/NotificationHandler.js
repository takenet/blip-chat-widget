import { Observable } from './Observable'

export class NotificationHandler {

  constructor(context) {
    this.context = context
    this.observer = new Observable()
    this.notifications = []
    this.originalDocumentTitle = document.title

    //
    window.document.addEventListener('visibilitychange', () => this.resetDocumentTitle())
  }

  get notificationsCount() {
    return this.notifications.length
  }

  subscribe(f) {
    this.observer.subscribe(f)
  }

  unsubscribe(f) {
    this.observer.unsubscribe(f)
  }

  handle({ message, botName }) {
    if (!this.context.isOpen) {
      this.addNotification(message)
    }

    if (this.passOnConditions()) {
      this.sendDocumentTitleNotification(botName)
    }
  }

  clearNotifications() {
    this.notifications = []
    this.observer.notify(this.notificationsCount)
  }

  addNotification(message) {
    this.notifications = this.notifications.concat(message)
    this.observer.notify(this.notificationsCount)
  }

  sendDocumentTitleNotification(botName) {
    let count = 0
    if (!this.documentTitleInterval) {
      this.documentTitleInterval = setInterval(() => {
        document.title = count % 2 ? `${botName} diz...` : this.originalDocumentTitle
        count++
      }, 300)
    }
  }

  resetDocumentTitle() {
    if (!window.document.hidden) { // if tab is being hidden
      clearInterval(this.documentTitleInterval)
      this.documentTitleInterval = 0
      document.title = this.originalDocumentTitle
    }
  }

  passOnConditions() {
    return document.hidden
  }
}
