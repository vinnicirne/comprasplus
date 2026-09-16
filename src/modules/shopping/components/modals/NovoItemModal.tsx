import React, { useState, useEffect } from 'react';
import { Modal } from '../../../../core/components/ui/Modal';
import { Button } from '../../../../core/components/ui/Button';
import { useListStore } from '../../store/useListStore';
import { useCategoryStore } from '../../store/useCategoryStore';
import { useProductStore } from '../../store/useProductStore';
import { GerenciarCategoriasModal } from './GerenciarCategoriasModal';
import { Check, ChevronDown, Settings2 } from 'lucide-react';

import type { ShoppingItem } from '../../store/useListStore';

interface NovoItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId: string;
  itemToEdit?: ShoppingItem | null;
}

const UNITS = [
  { value: 'un', label: 'un' },
  { value: 'kg', label: 'kg' },
  { value: 'g', label: 'g' },
  { value: 'L', label: 'L' },
  { value: 'ml', label: 'ml' }
];

export const NovoItemModal: React.FC<NovoItemModalProps> = ({ open, onOpenChange, listId, itemToEdit }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Mercado');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('un');
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isManageCatsOpen, setIsManageCatsOpen] = useState(false);
  const { addItem, updateItem } = useListStore();
  const { categories } = useCategoryStore();
  const { searchResults, isSearching, searchProducts, registerProduct, clearSearch } = useProductStore();

  // Reset form when opened
  useEffect(() => {
    if (open) {
      if (itemToEdit) {
        setName(itemToEdit.name || '');
        setCategory(itemToEdit.category || 'Mercado');
        setPrice(itemToEdit.price ? itemToEdit.price.toString() : '');
        setQuantity(itemToEdit.quantity ? itemToEdit.quantity.toString() : '1');
        setUnit(itemToEdit.unit || 'un');
      } else {
        setName('');
        setCategory('Mercado');
        setPrice('');
        setQuantity('1');
        setUnit('un');
      }
      clearSearch();
    }
  }, [open, itemToEdit]);

  useEffect(() => {
    if (name.trim().length >= 2) {
      const delayFn = setTimeout(() => searchProducts(name), 300);
      return () => clearTimeout(delayFn);
    } else {
      clearSearch();
    }
  }, [name]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (itemToEdit) {
      updateItem(listId, itemToEdit.id, {
        name: name.trim(),
        category: category.trim(),
        price: price ? parseFloat(price.toString().replace(',', '.')) : 0,
        quantity: quantity ? parseFloat(quantity.toString().replace(',', '.')) : 1,
        unit: unit,
      });
    } else {
      addItem(listId, {
        id: crypto.randomUUID(),
        name: name.trim(),
        category: category.trim(),
        price: price ? parseFloat(price.toString().replace(',', '.')) : 0,
        quantity: quantity ? parseFloat(quantity.toString().replace(',', '.')) : 1,
        unit: unit,
        checked: false
      });
    }

    // Registra o produto globalmente em background
    registerProduct(name, category, unit);

    onOpenChange(false);
  };

  const handleSelectSuggestion = (product: any) => {
    setName(product.name);
    if (product.category) setCategory(product.category);
    if (product.default_unit) setUnit(product.default_unit);
    clearSearch();
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={itemToEdit ? "Editar Item" : "Adicionar Item"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 pb-2 mt-2">
        <div className="flex flex-col gap-1 relative">
          <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider" htmlFor="item-name">Nome do Produto *</label>
          <div className="flex items-center bg-surface-container-low rounded-xl border border-outline-variant/40 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all h-11 px-3">
              <input 
                id="item-name" 
                type="text" 
                className="w-full h-full bg-transparent outline-none text-sm text-on-surface font-semibold placeholder:text-outline/60 placeholder:font-normal" 
                placeholder="Ex: Arroz 5kg" 
                value={name}
                onChange={e => setName(e.target.value)}
                required 
                autoFocus
                autoComplete="off" 
              />
            </div>
            
            {/* Autocomplete Dropdown */}
            {searchResults.length > 0 && name.trim().length >= 2 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-outline-variant/40 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                {searchResults.map(prod => (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => handleSelectSuggestion(prod)}
                    className="w-full text-left px-3 py-2 hover:bg-surface-container-low transition-colors flex items-center justify-between border-b border-outline-variant/20 last:border-0"
                  >
                    <span className="text-sm font-semibold text-on-surface">{prod.name}</span>
                    <span className="text-xs text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-md">{prod.category}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider" htmlFor="item-price" title="Preço unitário ou por Kg">Preço Unitário</label>
            <div className="flex items-center bg-surface-container-low rounded-xl border border-outline-variant/40 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all h-11 overflow-hidden">
              <div className="pl-3 pr-1.5 h-full flex items-center justify-center text-on-surface-variant font-bold text-xs shrink-0">R$</div>
              <input 
                id="item-price" 
                type="number" 
                min="0" 
                step="0.01" 
                className="w-full h-full pr-3 bg-transparent outline-none text-sm text-on-surface font-semibold placeholder:text-outline/60 placeholder:font-normal" 
                placeholder="0,00"
                value={price}
                onChange={e => setPrice(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider" htmlFor="item-qtd">Quantidade</label>
            <div className="flex items-center bg-surface-container-low rounded-xl border border-outline-variant/40 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all h-11 px-2">
              <input 
                id="item-qtd" 
                type="number" 
                min="0.001" 
                step="any" 
                className="w-full h-full bg-transparent outline-none text-sm text-on-surface text-center font-bold" 
                required
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
              />
              <div className="w-[1px] h-6 bg-outline-variant/40 mx-1 shrink-0"></div>
              <select 
                id="item-unit" 
                className="h-full bg-transparent outline-none text-primary font-bold text-xs pl-1 pr-2 appearance-none cursor-pointer min-w-[40px] text-center"
                value={unit}
                onChange={e => setUnit(e.target.value)}
              >
                {UNITS.map(u => <option key={u.value} value={u.value} className="bg-surface text-on-surface font-semibold">{u.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider" htmlFor="item-category">Categoria</label>
            <button
              type="button"
              onClick={() => setIsManageCatsOpen(true)}
              className="flex items-center gap-1 text-[10px] font-bold text-primary hover:opacity-70 transition-opacity"
            >
              <Settings2 size={12} /> Gerenciar
            </button>
          </div>
          <div className="relative">
            <button 
              type="button"
              id="item-category" 
              className="w-full h-11 px-3.5 pr-8 bg-surface-container-low text-on-surface text-sm font-semibold rounded-xl border border-outline-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all flex items-center justify-between"
              onClick={() => setIsCategoryOpen(!isCategoryOpen)}
            >
              {category}
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant" size={20} />
            </button>
            {isCategoryOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsCategoryOpen(false)}></div>
                <div className="absolute bottom-full mb-2 left-0 right-0 bg-surface border border-outline-variant/40 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.15)] z-50 max-h-56 overflow-y-auto flex flex-col py-1 animate-in fade-in slide-in-from-bottom-2">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      className={`text-left px-4 py-2.5 text-sm font-semibold hover:bg-surface-container transition-colors ${category === cat ? 'bg-primary/10 text-primary' : 'text-on-surface'}`}
                      onClick={() => {
                        setCategory(cat);
                        setIsCategoryOpen(false);
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <GerenciarCategoriasModal
          open={isManageCatsOpen}
          onOpenChange={setIsManageCatsOpen}
        />

        <div className="mt-3 flex gap-2.5">
          <button 
            type="button" 
            className="flex-1 h-11 rounded-xl bg-surface-container-high text-on-surface font-semibold text-xs hover:bg-surface-container-highest transition-all"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </button>
          <Button 
            type="submit" 
            className="flex-[1.5] h-11 rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition-all"
          >
            <Check size={18} /> Salvar
          </Button>
        </div>
      </form>
    </Modal>
  );
};
