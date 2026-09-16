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
  const [listType, setListType] = useState<'normal' | 'continua' | 'rateada'>('normal');
  const [splitStrategy, setSplitStrategy] = useState<'products' | 'value'>('products');
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
        setListType(listToEdit.list_type || 'normal');
        setSplitStrategy(listToEdit.split_strategy || 'products');
      } else {
        setNome('');
        setLoja('');
        setOrcamento('');
        setCategoria('mercado');
        setListType('normal');
        setSplitStrategy('products');
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
        list_type: listType,
        split_strategy: splitStrategy,
        budget: orcamento ? parseFloat(orcamento.toString().replace(',', '.')) : 0,
      });
    } else {
      const newList = {
        id: crypto.randomUUID(),
        name: nome.trim(),
        store: loja.trim(),
        category: categoria,
        list_type: listType,
        split_strategy: splitStrategy,
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

        <div className="flex flex-col gap-1">
          <label className="font-label-sm text-on-surface-variant text-xs font-semibold uppercase tracking-wide">
            Tipo de Lista
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'normal', icon: 'receipt', label: 'Normal' },
              { value: 'continua', icon: 'loop', label: 'Contínua' },
              { value: 'rateada', icon: 'groups', label: 'Rateada (Rachar)' },
            ].map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setListType(t.value as any)}
                className={`flex items-center gap-1.5 h-8 px-3 rounded-full border text-xs transition-all active:scale-95 ${
                  listType === t.value
                    ? 'border-primary text-primary bg-primary-fixed/30 font-bold'
                    : 'border-outline-variant/40 bg-surface-container text-on-surface-variant font-semibold hover:border-primary hover:text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
          {listType === 'continua' && (
            <p className="text-[10px] text-on-surface-variant mt-1 leading-tight">
              A lista não fecha por completo. Finalize os itens parcialmente, criando abas de histórico para cada dia.
            </p>
          )}
          {listType === 'rateada' && (
            <p className="text-[10px] text-on-surface-variant mt-1 leading-tight">
              Compartilhe a lista para que cada pessoa pague sua parte, com encerramento direto nas suas respectivas carteiras.
            </p>
          )}
        </div>

        {listType === 'rateada' && (
          <div className="flex flex-col gap-1 p-3 rounded-xl bg-surface-container/50 border border-outline-variant/30">
            <label className="font-label-sm text-on-surface-variant text-xs font-semibold uppercase tracking-wide">
              Estratégia de Divisão
            </label>
            <div className="flex gap-2 mt-1">
              {[
                { value: 'products', label: 'Por Produto (Ex: Eu levo a Carne)' },
                { value: 'value', label: 'Por Valor (Ex: Eu dou R$ 50)' },
              ].map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSplitStrategy(s.value as any)}
                  className={`flex-1 flex items-center justify-center text-center py-2 rounded-lg border text-[11px] transition-all active:scale-95 ${
                    splitStrategy === s.value
                      ? 'border-primary text-primary bg-primary-fixed/30 font-bold'
                      : 'border-outline-variant/40 bg-surface text-on-surface-variant font-semibold hover:border-primary'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

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
