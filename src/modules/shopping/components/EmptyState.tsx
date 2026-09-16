import React from 'react';
import { Button } from '../../../core/components/ui/Button';
import { ShoppingCart } from 'lucide-react';

interface EmptyStateProps {
  onNewList: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onNewList }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4 bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/50">
      <div className="w-16 h-16 bg-surface-container flex items-center justify-center rounded-full mb-4">
        <ShoppingCart className="text-outline" size={28} />
      </div>
      <h3 className="font-headline-sm text-on-surface mb-1">Nenhuma lista encontrada</h3>
      <p className="font-body-sm text-on-surface-variant max-w-[250px]">
        Crie sua primeira lista e comece a controlar seus gastos de forma inteligente.
      </p>
      <Button className="mt-4" icon={ShoppingCart} onClick={onNewList}>
        Criar Primeira Lista
      </Button>
    </div>
  );
};
