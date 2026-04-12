/**
 * Web Push Notification Service
 * Handles subscription management and push notification registration
 */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

export const pushNotificationService = {
  /**
   * Check if push notifications are supported
   */
  isSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window;
  },

  /**
   * Request notification permission from the user
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) return 'denied';
    return await Notification.requestPermission();
  },

  /**
   * Get current permission state
   */
  getPermissionStatus(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  },

  /**
   * Register service worker and subscribe to push notifications
   */
  async subscribe(userId: string): Promise<PushSubscription | null> {
    if (!this.isSupported()) return null;

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Check for existing subscription
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        if (!VAPID_PUBLIC_KEY) {
          console.warn('VAPID public key not configured');
          return null;
        }
        
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      // Send subscription to server
      const { supabase } = await import('../lib/supabase');
      if (supabase) {
        await supabase.from('push_subscriptions').upsert({
          user_id: userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.toJSON().keys?.p256dh,
          auth: subscription.toJSON().keys?.auth,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      }

      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  },

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(userId: string): Promise<boolean> {
    if (!this.isSupported()) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
      }

      // Remove from server
      const { supabase } = await import('../lib/supabase');
      if (supabase) {
        await supabase.from('push_subscriptions').delete().eq('user_id', userId);
      }

      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  },

  /**
   * Convert VAPID key from Base64 to Uint8Array
   */
  urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  },
};
