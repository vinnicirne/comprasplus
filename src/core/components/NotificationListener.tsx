import { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { useNotificationStore } from '../store/useNotificationStore';
import { Toast } from './ui/Toast';

export function NotificationListener({ userId }: { userId?: string }) {
  const addNotification = useNotificationStore(state => state.addNotification);
  const markAsRead = useNotificationStore(state => state.markAsRead);
  const [activeToasts, setActiveToasts] = useState<any[]>([]);

  useEffect(() => {
    if (!userId) return;

    // Fetch initial unread notifications (optional, but good for badge)
    supabase.from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) {
          useNotificationStore.getState().setNotifications(data);
        }
      });

    // Subscribe to real-time inserts
    const channel = supabase.channel('realtime:notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const newNotif = payload.new;
          addNotification(newNotif as any);
          
          // Show Toast
          setActiveToasts(prev => [...prev, newNotif]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, addNotification]);

  const handleCloseToast = (id: string) => {
    setActiveToasts(prev => prev.filter(t => t.id !== id));
    markAsRead(id);
    
    // Opt: update DB
    supabase.from('notifications').update({ is_read: true }).eq('id', id).then();
  };

  const handleToastClick = (link: string) => {
    // Basic navigation, ideally use your router (e.g. wouter or react-router)
    window.location.href = link;
  };

  return (
    <div
      aria-live="assertive"
      className="pointer-events-none fixed inset-0 flex items-end px-4 py-6 sm:items-start sm:p-6 z-50"
    >
      <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
        {activeToasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            title={toast.title}
            body={toast.body}
            link={toast.link}
            onClose={handleCloseToast}
            onClick={handleToastClick}
          />
        ))}
      </div>
    </div>
  );
}
