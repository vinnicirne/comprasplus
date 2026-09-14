const DB_NAME = 'ListaComprasDB';
const DB_VERSION = 4;

let dbInstance = null;
let initPromise = null;

export async function initDB() {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('listas')) {
        const listStore = db.createObjectStore('listas', { keyPath: 'id' });
        listStore.createIndex('createdAt', 'createdAt', { unique: false });
        listStore.createIndex('userId', 'userId', { unique: false });
      }
      if (!db.objectStoreNames.contains('config')) {
        db.createObjectStore('config', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('historico')) {
        const histStore = db.createObjectStore('historico', { keyPath: 'id' });
        histStore.createIndex('purchasedAt', 'purchasedAt', { unique: false });
        histStore.createIndex('userId', 'userId', { unique: false });
      }
      if (!db.objectStoreNames.contains('carteira')) {
        const carteiraStore = db.createObjectStore('carteira', { keyPath: 'id' });
        carteiraStore.createIndex('userId', 'userId', { unique: false });
        carteiraStore.createIndex('entryDate', 'entryDate', { unique: false });
        carteiraStore.createIndex('yearMonth', 'yearMonth', { unique: false });
      }
      if (!db.objectStoreNames.contains('compartilhamentos')) {
        const compStore = db.createObjectStore('compartilhamentos', { keyPath: 'id' });
        compStore.createIndex('listaId', 'listaId', { unique: false });
        compStore.createIndex('inviteCode', 'inviteCode', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('Erro ao abrir IndexedDB:', event.target.error);
      reject(event.target.error);
    };
  });

  return initPromise;
}

export async function getStore(storeName, mode = 'readonly') {
  const db = await initDB();
  return db.transaction(storeName, mode).objectStore(storeName);
}
