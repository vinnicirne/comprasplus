import React from 'react';
import { useListStore } from '../store/useListStore';
import { cn } from '../../../core/utils/cn';

export const FilterNav: React.FC = () => {
  const { lists, filter, setFilter } = useListStore();

  const countAll = lists.length;
  const countActive = lists.filter(l => l.status !== 'concluida').length;
  const countPending = lists.filter(l => l.status !== 'concluida' && (l.items || []).some(i => !i.checked)).length;
  const countCompleted = lists.filter(l => l.status === 'concluida').length;

  const FilterButton = ({ label, value, count }: { label: string, value: typeof filter, count: number }) => (
    <button
      onClick={() => setFilter(value)}
      className={cn(
        "h-8 rounded-full font-semibold text-[11px] sm:text-xs flex items-center justify-center active:scale-95 transition-all cursor-pointer px-1 truncate shadow-sm",
        filter === value 
          ? "bg-primary text-on-primary font-extrabold" 
          : "bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container border border-outline-variant/30"
      )}
    >
      {label} ({count})
    </button>
  );

  return (
    <nav className="grid grid-cols-4 gap-1.5 w-full py-0.5">
      <FilterButton label="Todas" value="TODAS" count={countAll} />
      <FilterButton label="Ativas" value="ATIVAS" count={countActive} />
      <FilterButton label="Pend." value="PENDENTES" count={countPending} />
      <FilterButton label="Concl." value="CONCLUIDAS" count={countCompleted} />
    </nav>
  );
};
