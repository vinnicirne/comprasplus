import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Copy, Share2, Check, Smartphone } from 'lucide-react';
import { Button } from '../../../../core/components/ui/Button';
import { supabase } from '../../../../core/lib/supabase';

interface ShareListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId: string;
  listName: string;
  shareCode?: string;
}

export const ShareListModal: React.FC<ShareListModalProps> = ({
  open,
  onOpenChange,
  listId,
  listName,
  shareCode: initialShareCode
}) => {
  const [shareCode, setShareCode] = useState(initialShareCode || '');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [permission, setPermission] = useState<'view' | 'edit'>('edit');

  const generateCode = async () => {
    setIsLoading(true);
    try {
      // Simulated random code generation
      const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // TODO: Save share_code and default permission to Supabase
      await supabase.from('shopping_lists').update({
        share_code: newCode
      }).eq('id', listId);

      setShareCode(newCode);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (shareCode) {
      navigator.clipboard.writeText(shareCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    const text = `Participe da minha lista de compras "${listName}" no App! Use o código: ${shareCode}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Lista de Compras: ${listName}`,
          text: text,
        });
      } catch (error) {
        console.error('Error sharing', error);
      }
    } else {
      // Fallback for WhatsApp web/desktop
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md bg-surface rounded-3xl p-6 shadow-2xl z-50 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-xl font-bold text-on-surface">Compartilhar Lista</Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors">
                <X size={20} />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex flex-col gap-4">
            {!shareCode ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Share2 size={48} className="text-primary/50 mb-4" />
                <p className="text-sm text-on-surface-variant mb-6">
                  Gere um código para convidar amigos e familiares para colaborarem nesta lista.
                </p>
                <Button 
                  onClick={generateCode} 
                  isLoading={isLoading}
                  className="w-full"
                >
                  Gerar Código de Convite
                </Button>
              </div>
            ) : (
              <>
                <div className="flex flex-col items-center gap-2 py-4 bg-surface-container-low rounded-2xl">
                  <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Código de Convite</span>
                  <span className="text-4xl font-black text-primary tracking-[0.2em]">{shareCode}</span>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-on-surface">Permissão Padrão</label>
                  <div className="flex bg-surface-container p-1 rounded-xl">
                    <button 
                      className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${permission === 'view' ? 'bg-surface shadow text-primary' : 'text-on-surface-variant'}`}
                      onClick={() => setPermission('view')}
                    >
                      Apenas Visualizar
                    </button>
                    <button 
                      className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${permission === 'edit' ? 'bg-surface shadow text-primary' : 'text-on-surface-variant'}`}
                      onClick={() => setPermission('edit')}
                    >
                      Ver e Editar
                    </button>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1">
                    {permission === 'view' 
                      ? 'Convidados poderão apenas visualizar os itens e o saldo.' 
                      : 'Convidados poderão adicionar, marcar e remover itens da lista.'}
                  </p>
                </div>

                <div className="flex items-center gap-3 mt-2">
                  <Button 
                    variant="secondary" 
                    className="flex-1"
                    icon={copied ? Check : Copy}
                    onClick={handleCopy}
                  >
                    {copied ? 'Copiado' : 'Copiar Código'}
                  </Button>
                  <Button 
                    className="flex-1 bg-[#25D366] text-white hover:bg-[#128C7E]"
                    icon={Smartphone}
                    onClick={handleShare}
                  >
                    Compartilhar
                  </Button>
                </div>
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
