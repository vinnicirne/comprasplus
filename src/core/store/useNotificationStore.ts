import { create } from 'zustand';

export interface Notification {
  id: string;
  title: string;
  body: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  setNotifications: (notifications: Notification[]) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  addNotification: (notification) => set((state) => {
    const exists = state.notifications.some(n => n.id === notification.id);
    if (exists) return state;
    
    const newNotifications = [notification, ...state.notifications];
    return {
      notifications: newNotifications,
      unreadCount: newNotifications.filter(n => !n.is_read).length
    };
  }),
  markAsRead: (id) => set((state) => {
    const newNotifications = state.notifications.map(n => 
      n.id === id ? { ...n, is_read: true } : n
    );
    return {
      notifications: newNotifications,
      unreadCount: newNotifications.filter(n => !n.is_read).length
    };
  }),
  setNotifications: (notifications) => set({
    notifications,
    unreadCount: notifications.filter(n => !n.is_read).length
  })
}));
