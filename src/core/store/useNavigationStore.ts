import { create } from 'zustand';

export type AppView = 'DASHBOARD' | 'LIST' | 'FINANCE' | 'REPORTS' | 'HISTORY' | 'PROFILE' | 'ADMIN' | 'RANKING';

interface NavigationState {
  currentView: AppView;
  activeListId: string | null;
  navigate: (view: AppView, listId?: string) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  currentView: 'DASHBOARD',
  activeListId: null,
  navigate: (view, listId) => set({ currentView: view, activeListId: listId || null }),
}));
