import { supabase } from './client';
import { generateId } from '../utils/id';

export type SyncOperation = {
  id: string;
  table_name: string;
  operation_type: 'INSERT' | 'UPDATE' | 'DELETE';
  record_id: string;
  new_data?: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
};

class SyncEngine {
  async addOperation(tableName: string, operationType: 'INSERT' | 'UPDATE' | 'DELETE', recordId: string, data?: any) {
    const operation: Omit<SyncOperation, 'status' | 'created_at'> = {
      id: generateId(),
      table_name: tableName,
      operation_type: operationType,
      record_id: recordId,
      new_data: data,
    };

    const { error } = await supabase
      .from('sync_operations')
      .insert({
        ...operation,
        status: 'pending'
      });

    if (error) {
      console.error('Failed to add sync operation:', error);
      // Fallback to local storage or IndexedDB for offline support could be implemented here
      throw error;
    }
  }
}

export const syncEngine = new SyncEngine();
