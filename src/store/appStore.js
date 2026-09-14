// Padrão Observer simplificado
class Store {
  constructor(initialState = {}) {
    this.listeners = [];
    
    // Proxy para interceptar mudancas no estado e notificar listeners
    this.state = new Proxy(initialState, {
      set: (target, property, value) => {
        target[property] = value;
        this.notify(property, value);
        return true;
      }
    });
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify(property, value) {
    this.listeners.forEach(listener => listener(this.state, property, value));
  }
}

export const appStore = new Store({
  currentUser: null,
  currentList: null,
  lists: [],
  filterCategory: 'TODAS',
  isOffline: !navigator.onLine,
});

window.addEventListener('online', () => appStore.state.isOffline = false);
window.addEventListener('offline', () => appStore.state.isOffline = true);
