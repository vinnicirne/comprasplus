import React, { useState } from 'react';
import { Modal } from '../../../../core/components/ui/Modal';
import { useCategoryStore } from '../../store/useCategoryStore';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { clsx } from 'clsx';

interface GerenciarCategoriasModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GerenciarCategoriasModal: React.FC<GerenciarCategoriasModalProps> = ({ open, onOpenChange }) => {
  const { categories, addCategory, editCategory, deleteCategory } = useCategoryStore();
  const [newName, setNewName] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [error, setError] = useState('');

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) {
      setError('Categoria já existe.');
      return;
    }
    addCategory(trimmed);
    setNewName('');
    setError('');
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditingValue(categories[index]);
    setError('');
  };

  const handleEditConfirm = (oldName: string) => {
    const trimmed = editingValue.trim();
    if (!trimmed) { setEditingIndex(null); return; }
    if (trimmed !== oldName && categories.includes(trimmed)) {
      setError('Já existe uma categoria com esse nome.');
      return;
    }
    editCategory(oldName, trimmed);
    setEditingIndex(null);
    setError('');
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Gerenciar Categorias">
      <div className="flex flex-col gap-4">

        {/* Add new */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Nova categoria..."
            value={newName}
            onChange={(e) => { setNewName(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="flex-1 h-11 px-3.5 bg-surface-container-low text-on-surface text-sm font-semibold rounded-xl border border-outline-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          />
          <button
            type="button"
            onClick={handleAdd}
            className="w-11 h-11 rounded-xl flex items-center justify-center text-on-primary shrink-0 transition-all hover:scale-105 active:scale-95"
            style={{ background: 'var(--primary)' }}
          >
            <Plus size={20} />
          </button>
        </div>

        {error && <p className="text-error text-xs font-semibold">{error}</p>}

        {/* List */}
        <div className="flex flex-col gap-1.5 max-h-[50vh] overflow-y-auto pr-1">
          {categories.map((cat, i) => (
            <div
              key={cat}
              className="flex items-center gap-2 bg-surface-container-low rounded-xl px-3 py-2.5 border border-outline-variant/30"
            >
              {editingIndex === i ? (
                <>
                  <input
                    autoFocus
                    type="text"
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleEditConfirm(cat); if (e.key === 'Escape') setEditingIndex(null); }}
                    className="flex-1 bg-transparent text-sm font-semibold text-on-surface outline-none border-b border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => handleEditConfirm(cat)}
                    className="w-7 h-7 flex items-center justify-center rounded-full text-on-primary shrink-0"
                    style={{ background: 'var(--primary)' }}
                  >
                    <Check size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingIndex(null)}
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant shrink-0"
                  >
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm font-semibold text-on-surface">{cat}</span>
                  <button
                    type="button"
                    onClick={() => handleEdit(i)}
                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors shrink-0"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteCategory(cat)}
                    className={clsx(
                      "w-7 h-7 flex items-center justify-center rounded-full text-error transition-colors hover:bg-error/10 shrink-0"
                    )}
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};
