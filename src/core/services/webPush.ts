import { messaging } from './firebase';
import { getToken } from "firebase/messaging";
import { supabase } from '../supabase/client';

export async function requestWebPushPermission(userId: string) {
  if (!messaging) return;
  
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const currentToken = await getToken(messaging, {
        vapidKey: 'BBpy4ttb0BZIpMXJQ3RHpVDR-IaMn7QzxEGC9VaUDki60NAJoXH-8ukqcV5RAUcvL4_9PoEV8CLFoXYhk0KeCB8'
      });
      
      if (currentToken) {
        await supabase.from('user_fcm_tokens').upsert({
          user_id: userId,
          token: currentToken,
          platform: 'web'
        }, { onConflict: 'user_id,token' });
      }
    }
  } catch (error) {
    console.error('An error occurred while retrieving web push token. ', error);
  }
}
