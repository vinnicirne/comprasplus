import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { JWT } from 'https://esm.sh/google-auth-library@9.6.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Interface for the payload we expect
interface NotificationPayload {
  listId: string;
  senderId: string;
  senderName: string;
  itemName?: string;
  type: 'NEW_ITEM' | 'MARKETING';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { listId, senderId, senderName, itemName, type } = await req.json() as NotificationPayload;

    // 1. Fetch the list to find the owner and shared users
    const { data: list, error: listError } = await supabaseClient
      .from('shopping_lists')
      .select('owner_id, shared_users, name')
      .eq('id', listId)
      .single();

    if (listError || !list) {
      throw new Error('List not found');
    }

    // 2. Determine recipients (everyone in the list EXCEPT the sender)
    const recipients = new Set<string>();
    if (list.owner_id !== senderId) {
      recipients.add(list.owner_id);
    }
    
    if (list.shared_users && Array.isArray(list.shared_users)) {
      list.shared_users.forEach((u: any) => {
        if (u.id !== senderId) recipients.add(u.id);
      });
    }

    if (recipients.size === 0) {
      return new Response(JSON.stringify({ message: 'No recipients to notify' }), { headers: corsHeaders });
    }

    // 3. Assemble Notification Message
    const title = type === 'NEW_ITEM' ? `Novo item em ${list.name}` : 'Notificação do ComprasPlus';
    const body = type === 'NEW_ITEM' 
      ? `${senderName} adicionou ${itemName || 'um novo item'} na lista.`
      : 'Confira as novidades no app!';

    // 4. Save to `notifications` table for In-App Toast
    const notificationsToInsert = Array.from(recipients).map(userId => ({
      user_id: userId,
      title,
      body,
      link: `/lists/${listId}`
    }));

    await supabaseClient.from('notifications').insert(notificationsToInsert);

    // 5. Fetch FCM Tokens for recipients
    const { data: tokens, error: tokensError } = await supabaseClient
      .from('user_fcm_tokens')
      .select('user_id, token, platform')
      .in('user_id', Array.from(recipients));

    if (tokensError || !tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ message: 'Saved in-app, but no FCM tokens found.' }), { headers: corsHeaders });
    }

    // 6. Setup Firebase Auth (HTTP v1)
    const serviceAccountStr = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
    if (!serviceAccountStr) {
       console.error('FIREBASE_SERVICE_ACCOUNT is not set');
       return new Response(JSON.stringify({ message: 'Saved in-app, missing FCM config' }), { headers: corsHeaders });
    }
    
    const serviceAccount = JSON.parse(serviceAccountStr);
    const jwtClient = new JWT({
      email: serviceAccount.client_email,
      key: serviceAccount.private_key,
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    });
    
    const accessTokenObj = await jwtClient.getAccessToken();
    const accessToken = accessTokenObj.token;

    // 7. Dispatch FCM Pushes
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;
    
    for (const userToken of tokens) {
      const payload = {
        message: {
          token: userToken.token,
          notification: {
            title,
            body
          },
          data: {
            listId,
            type
          }
        }
      };

      const fcmRes = await fetch(fcmUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      // 8. Self-Healing: Remove invalid tokens
      if (!fcmRes.ok) {
        const fcmResData = await fcmRes.json();
        const errorCode = fcmResData.error?.details?.[0]?.errorCode;
        if (errorCode === 'UNREGISTERED' || errorCode === 'INVALID_ARGUMENT') {
           console.log(`Removing invalid token: ${userToken.token}`);
           await supabaseClient.from('user_fcm_tokens').delete().eq('token', userToken.token);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, notifiedCount: tokens.length }), { headers: corsHeaders, status: 200 });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { headers: corsHeaders, status: 400 });
  }
});
