import { supabase } from '../lib/supabase';
import { useAuthStore } from '../../modules/auth/store/useAuthStore';

export type SyncOperationType = 'INSERT' | 'UPDATE' | 'DELETE';

// SEC-004: Tabelas permitidas — apenas estas podem ser operadas pelo SyncEngine
const ALLOWED_TABLES = ['shopping_lists', 'shopping_items', 'finance_transactions'] as const;
type AllowedTable = typeof ALLOWED_TABLES[number];

export interface SyncOperation {
  id: string;
  table: AllowedTable;
  type: SyncOperationType;
  payload: any;
  record_id: string;
  created_at: string;
}

// SEC-008: Logger apenas em desenvolvimento
const log = {
  warn: (...args: any[]) => { if (import.meta.env.DEV) console.warn(...args); },
  error: (...args: any[]) => { if (import.meta.env.DEV) console.error(...args); },
  info: (...args: any[]) => { if (import.meta.env.DEV) console.log(...args); },
};

const SYNC_QUEUE_KEY = '@compras_plus:sync_queue';

class SyncEngine {
  private isProcessing = false;

  private getQueue(): SyncOperation[] {
    try {
      const q = localStorage.getItem(SYNC_QUEUE_KEY);
      return q ? JSON.parse(q) : [];
    } catch {
      return [];
    }
  }

  private saveQueue(queue: SyncOperation[]) {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  }

  // SEC-004: Valida operação antes de enfileirar
  private isValidOperation(op: Partial<SyncOperation>): op is SyncOperation {
    if (!op.table || !ALLOWED_TABLES.includes(op.table as AllowedTable)) {
      log.warn('SyncEngine: Tabela inválida bloqueada:', op.table);
      return false;
    }
    if (!['INSERT', 'UPDATE', 'DELETE'].includes(op.type || '')) {
      log.warn('SyncEngine: Tipo de operação inválido:', op.type);
      return false;
    }
    if (!op.record_id || typeof op.record_id !== 'string') {
      log.warn('SyncEngine: record_id inválido');
      return false;
    }
    return true;
  }

  public addOperation(op: Omit<SyncOperation, 'id' | 'created_at'>) {
    // SEC-004: Valida antes de enfileirar
    if (!this.isValidOperation(op as any)) return;

    const queue = this.getQueue();
    queue.push({
      ...op,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    });
    this.saveQueue(queue);
    
    // Tenta processar em background assim que insere na fila
    this.processQueue();
  }

  public async processQueue() {
    if (this.isProcessing) return;
    
    const user = useAuthStore.getState().user;
    if (!user) return;

    if (!navigator.onLine) return;

    const queue = this.getQueue();
    if (queue.length === 0) return;

    this.isProcessing = true;
    const remainingQueue = [...queue];

    for (const op of queue) {
      // SEC-004: Re-valida operações lidas do localStorage (podem ter sido manipuladas)
      if (!this.isValidOperation(op)) {
        const opId = (op as { id?: string }).id;
        const index = remainingQueue.findIndex(q => q.id === opId);
        if (index > -1) remainingQueue.splice(index, 1);
        continue;
      }

      try {
        let error = null;

        const safePayload = op.payload ? { ...op.payload } : undefined;
        if (safePayload && op.type === 'UPDATE') {
          delete safePayload.owner_id;
          delete safePayload.created_at;
          delete safePayload.isShared;
        }

        // Corrige payloads corrompidos com owner_id local
        if (safePayload && safePayload.owner_id === 'local-user') {
          safePayload.owner_id = user.id;
        }

        if (op.type === 'INSERT') {
          const { error: err } = await supabase.from(op.table).insert(safePayload);
          error = err;
        } else if (op.type === 'UPDATE') {
          const { error: err } = await supabase.from(op.table).update(safePayload).eq('id', op.record_id);
          error = err;
        } else if (op.type === 'DELETE') {
          const { error: err } = await supabase.from(op.table).delete().eq('id', op.record_id);
          error = err;
        }

        const isPermanentError = error && (error.code === '22P02' || error.code === '42501' || error.code === '23505');

        if (!error || isPermanentError) {
          const index = remainingQueue.findIndex(q => q.id === op.id);
          if (index > -1) remainingQueue.splice(index, 1);
          
          if (isPermanentError) {
            log.warn(`SyncEngine: Operação ${op.id} descartada permanentemente:`, error?.code);
          }
        } else {
          log.error(`SyncEngine: Falha ao sincronizar operação ${op.id}:`, error?.code);
        }
      } catch (err) {
        log.error('SyncEngine: Erro crítico:', err);
        const index = remainingQueue.findIndex(q => q.id === op.id);
        if (index > -1) remainingQueue.splice(index, 1);
      }
    }

    this.saveQueue(remainingQueue);
    this.isProcessing = false;
  }
}

export const syncEngine = new SyncEngine();

// Processa fila quando a conexão volta
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    log.info('SyncEngine: Conexão restaurada, processando fila...');
    syncEngine.processQueue();
  });
}
