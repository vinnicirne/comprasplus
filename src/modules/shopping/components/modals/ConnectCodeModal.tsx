import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Link2, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../../../../core/lib/supabase';
import { useListStore } from '../../store/useListStore';
import { useAuthStore } from '../../../auth/store/useAuthStore';
import { useNavigationStore } from '../../../../core/store/useNavigationStore';

interface ConnectCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ConnectCodeModal: React.FC<ConnectCodeModalProps> = ({ open, onOpenChange }) => {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [permission, setPermission] = useState<'view' | 'edit'>('edit');
  const { addList } = useListStore();
  const { user } = useAuthStore();
  const { navigate } = useNavigationStore();

  const handleConnect = async () => {
    if (code.trim().length < 4) {
      setError('Digite um código válido.');
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      // 1. Look up list by share_code
      const { data: lists, error: fetchError } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('share_code', code.trim().toUpperCase())
        .limit(1);

      if (fetchError || !lists || lists.length === 0) {
        setError('Código não encontrado. Verifique e tente novamente.');
        setIsLoading(false);
        return;
      }

      const list = lists[0];

      // 2. Add current user to shared_users with the selected permission
      const currentSharedUsers: { id: string; permission: string; name?: string }[] = list.shared_users || [];
      const alreadyJoinedIndex = currentSharedUsers.findIndex(u => u.id === user?.id);

      if (user) {
        let updatedUsers = [...currentSharedUsers];
        if (alreadyJoinedIndex >= 0) {
          updatedUsers[alreadyJoinedIndex].permission = permission;
        } else {
          updatedUsers = [
            ...updatedUsers,
            { id: user.id, permission, name: user.user_metadata?.name || user.email }
          ];
        }
        await supabase
          .from('shopping_lists')
          .update({ shared_users: updatedUsers })
          .eq('id', list.id);
      }

      // 3. Add list to local store and navigate
      addList({
        ...list,
        items: list.items || [],
      });

      onOpenChange(false);
      setCode('');
      navigate('LIST', list.id);
    } catch (err) {
      setError('Ocorreu um erro. Tente novamente.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConnect();
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-sm bg-surface rounded-3xl p-6 shadow-2xl z-50 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-secondary-container text-on-secondary-container flex items-center justify-center">
                <Link2 size={20} />
              </div>
              <Dialog.Title className="text-lg font-bold text-on-surface">Conectar à Lista</Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors">
                <X size={20} />
              </button>
            </Dialog.Close>
          </div>

          <p className="text-sm text-on-surface-variant -mt-2">
            Digite o código enviado pelo dono da lista para começar a colaborar em tempo real.
          </p>

          <div className="flex flex-col gap-3">
            <input
              type="text"
              value={code}
              onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); }}
              onKeyDown={handleKeyDown}
              placeholder="Ex: A7X9K2"
              maxLength={8}
              className={`w-full text-center text-4xl font-black tracking-[0.3em] py-4 px-4 rounded-2xl bg-surface-container-low border-2 outline-none transition-all placeholder:text-outline-variant/50 placeholder:tracking-widest ${
                error ? 'border-error text-error' : 'border-outline-variant/30 text-on-surface focus:border-primary'
              }`}
            />
            {error && (
              <p className="text-sm text-error text-center font-medium">{error}</p>
            )}
          </div>

          <div className="flex bg-surface-container-low rounded-xl p-1 gap-1 border border-outline-variant/30">
            <button
              onClick={() => setPermission('view')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${permission === 'view' ? 'bg-white shadow-sm text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              Só Visualizar
            </button>
            <button
              onClick={() => setPermission('edit')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${permission === 'edit' ? 'bg-white shadow-sm text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              Ver e Editar
            </button>
          </div>

          <button
            onClick={handleConnect}
            disabled={isLoading || code.length < 4}
            className="w-full h-14 flex items-center justify-center gap-2 rounded-2xl bg-primary text-on-primary font-bold text-base shadow-md hover:shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 size={22} className="animate-spin" />
            ) : (
              <>
                Entrar na Lista
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
