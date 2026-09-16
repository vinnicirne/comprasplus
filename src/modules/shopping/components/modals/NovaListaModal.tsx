import React, { useState } from 'react';
import { Modal } from '../../../../core/components/ui/Modal';
import { Button } from '../../../../core/components/ui/Button';
import { Input } from '../../../../core/components/ui/Input';
import { ShoppingCart, Store, CircleDollarSign } from 'lucide-react';
import type { ListCategory, ShoppingList } from '../../store/useListStore';
import { useListStore } from '../../store/useListStore';
import { useAuthStore } from '../../../auth/store/useAuthStore';

interface NovaListaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listToEdit?: ShoppingList | null;
}

const CATEGORIAS = [
  { value: 'mercado', icon: 'shopping_cart', label: 'Mercado' },
  { value: 'hortifruti', icon: 'nutrition', label: 'Hortifruti' },
  { value: 'farmacia', icon: 'medical_services', label: 'Farmácia' },
  { value: 'festa', icon: 'celebration', label: 'Festa' },
  { value: 'outros', icon: 'category', label: 'Outros' },
] as const;

export const NovaListaModal: React.FC<NovaListaModalProps> = ({ open, onOpenChange, listToEdit }) => {
  const [nome, setNome] = useState('');
  const [loja, setLoja] = useState('');
  const [orcamento, setOrcamento] = useState('');
  const [categoria, setCategoria] = useState<ListCategory>('mercado');
  const [error, setError] = useState('');
  
  const { addList, updateList } = useListStore();
  const { user } = useAuthStore();

  React.useEffect(() => {
    if (open) {
      if (listToEdit) {
        setNome(listToEdit.name || '');
        setLoja(listToEdit.store || '');
        setOrcamento(listToEdit.budget ? listToEdit.budget.toString() : '');
        setCategoria(listToEdit.category || 'mercado');
      } else {
        setNome('');
        setLoja('');
        setOrcamento('');
        setCategoria('mercado');
      }
      setError('');
    }
  }, [open, listToEdit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nome.trim()) {
      setError('Dê um nome para sua lista.');
      return;
    }

    if (listToEdit) {
      updateList(listToEdit.id, {
        name: nome.trim(),
        store: loja.trim(),
        category: categoria,
        budget: orcamento ? parseFloat(orcamento.toString().replace(',', '.')) : 0,
      });
    } else {
      const newList = {
        id: crypto.randomUUID(),
        name: nome.trim(),
        store: loja.trim(),
        category: categoria,
        budget: orcamento ? parseFloat(orcamento.toString().replace(',', '.')) : 0,
        items: [],
        status: 'aberta' as const,
        created_at: new Date().toISOString(),
        owner_id: user?.id || '00000000-0000-0000-0000-000000000000',
        owner_name: user?.user_metadata?.name || user?.email?.split('@')[0],
      };

      addList(newList);
    }
    
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={listToEdit ? "Editar Lista" : "Nova Lista"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input 
          label="Nome da lista *" 
          placeholder="Ex: Mercado da semana" 
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          autoFocus
        />
        
        <Input 
          label="Loja / Supermercado (opcional)" 
          placeholder="Ex: Carrefour, Atacadão" 
          icon={Store}
          value={loja}
          onChange={(e) => setLoja(e.target.value)}
        />

        <div className="flex flex-col gap-1">
          <label className="font-label-sm text-on-surface-variant text-xs font-semibold uppercase tracking-wide">
            Categoria
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIAS.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategoria(c.value as ListCategory)}
                className={`flex items-center gap-1.5 h-8 px-3 rounded-full border text-xs transition-all active:scale-95 ${
                  categoria === c.value
                    ? 'border-primary text-primary bg-primary-fixed/30 font-bold'
                    : 'border-outline-variant/40 bg-surface-container text-on-surface-variant font-semibold hover:border-primary hover:text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">{c.icon}</span>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <Input 
          label="Orçamento (opcional)" 
          type="number"
          min="0"
          step="0.01"
          placeholder="0,00" 
          icon={CircleDollarSign}
          value={orcamento}
          onChange={(e) => setOrcamento(e.target.value)}
        />

        {error && <div className="text-error text-sm text-center font-medium mt-1">{error}</div>}

        <Button type="submit" className="w-full mt-2" icon={ShoppingCart} size="lg">
          {listToEdit ? "Salvar Alterações" : "Criar Lista"}
        </Button>
      </form>
    </Modal>
  );
};
