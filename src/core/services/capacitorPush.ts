import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../supabase/client';

export async function setupCapacitorPush(userId: string) {
  if (!Capacitor.isNativePlatform()) return;

  let permStatus = await PushNotifications.checkPermissions();

  if (permStatus.receive === 'prompt') {
    permStatus = await PushNotifications.requestPermissions();
  }

  if (permStatus.receive !== 'granted') {
    console.log('Push notification permission denied');
    return;
  }

  await PushNotifications.register();

  PushNotifications.addListener('registration', async (token) => {
    await supabase.from('user_fcm_tokens').upsert({
      user_id: userId,
      token: token.value,
      platform: Capacitor.getPlatform()
    }, { onConflict: 'user_id,token' });
  });

  PushNotifications.addListener('registrationError', (error) => {
    console.error('Error on registration: ' + JSON.stringify(error));
  });

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push received: ' + JSON.stringify(notification));
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
    console.log('Push action performed: ' + JSON.stringify(notification));
  });
}
