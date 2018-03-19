export class Observable {
  constructor() {
    this.observers = []
  }

  subscribe(f) {
    this.observers = this.observers.concat(f)
  }

  unsubscribe(f) {
    this.observers = this.observers.filter(subscriber => subscriber !== f)
  }

  notify(data) {
    this.observers.forEach(observer => observer(data))
  }
}
