import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;


function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications() {

  const { profile } = useAuth();

  const [permission, setPermission] = useState(Notification.permission);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);


  useEffect(() => {
    if (!('serviceWorker' in navigator) || !profile?.id) {
      return;
    }

    navigator.serviceWorker.ready.then(async (reg) => {
      const existing = await reg.pushManager.getSubscription();
      setIsSubscribed(!!existing);
    });
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) {
      return;
    }
    if (Notification.permission === 'default') {
      subscribe();
    } else {
        //
    }
  }, [profile?.id]);

  const subscribe = useCallback(async () => {

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.error('🔔 [Push] ❌ Service worker or PushManager not supported');
      setError('Push notifications are not supported in this browser.');
      return;
    }
    if (!VAPID_PUBLIC_KEY) {
      console.error('🔔 [Push] ❌ VAPID key missing');
      setError('VAPID public key is missing. Add VITE_VAPID_PUBLIC_KEY to your .env');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') {
        setError('Notification permission denied.');
        return;
      }

      const reg = await navigator.serviceWorker.ready;

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const sub = subscription.toJSON();

      const { error: dbError } = await supabase
        .from('push_subscriptions')
        .upsert(
          {
            user_id: profile.id,
            endpoint: sub.endpoint,
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth,
            user_agent: navigator.userAgent,
          },
          { onConflict: 'endpoint' }
        );

      if (dbError) {
        console.error('🔔 [Push] ❌ Supabase error:', dbError);
        throw dbError;
      }

      setIsSubscribed(true);
    } catch (err) {
      console.error('🔔 [Push] ❌ Subscribe error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', subscription.endpoint);
        await subscription.unsubscribe();
      } else {
        //
      }
      setIsSubscribed(false);
    } catch (err) {
      console.error('🔔 [Push] ❌ Unsubscribe error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { permission, isSubscribed, loading, error, subscribe, unsubscribe };
}

