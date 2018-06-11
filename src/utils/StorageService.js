class StorageService {
  static getFromLocalStorage(name) {
    if (this._supportsLocalStorage()) {
      return window.localStorage.getItem(name)
    } else {
      return null
    }
  }

  static setToLocalStorage(name, value, expires) {
    if (this._supportsLocalStorage()) {
      value.expires = new Date().getTime() + expires
      window.localStorage.setItem(name, window.btoa(JSON.stringify(value)))
    }
  }

  static _supportsLocalStorage() {
    try {
      return 'localStorage' in window && window['localStorage'] !== null
    } catch (e) {
      return false
    }
  }

  static processLocalStorageExpires() {
    try {
      let toRemove = [] // Items to be removed
      const currentDate = new Date().getTime()

      for (let i = 0, j = window.localStorage.length; i < j; i++) {
        try {
          let currentValue = window.localStorage.getItem(
            window.localStorage.key(i)
          )

          // Decode back to JSON
          currentValue = JSON.parse(window.atob(currentValue))

          // Check if item expired
          if (currentValue.expires && currentValue.expires <= currentDate) {
            toRemove.push(window.localStorage.key(i))
          }
        } catch (e) {}
      }

      // Remove outdated items
      for (let i = toRemove.length - 1; i >= 0; i--) {
        window.localStorage.removeItem(toRemove[i])
      }
    } catch (e) {}
  }

  static storageExpired() {
    try {
      const currentDate = new Date().getTime()

      let account = window.localStorage.getItem('blipSdkUAccount')
      account = JSON.parse(window.atob(account))

      if (account.expires && account.expires <= currentDate) {
        return true
      }

      return false
    } catch (e) {
      return true
    }
  }
}

export default StorageService
