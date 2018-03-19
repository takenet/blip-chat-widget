export const dom = {
  createDiv(selector) {
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
  },
  render(template, context = this) {
    return template.replace(/{{([^{}]*)}}/g, (replaced, bind) => {
      let key = bind
      if (typeof key === 'string') {
        key = key.trim()
      }

      return context[key]
    })
  }
}
