import { useState, useCallback, useEffect } from 'react';
import { pushNotificationService } from '../services/pushNotificationService';
import { toast } from 'sonner';

interface UsePushNotificationsReturn {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isSubscribing: boolean;
  requestAndSubscribe: (userId: string) => Promise<void>;
  unsubscribe: (userId: string) => Promise<void>;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  const isSupported = pushNotificationService.isSupported();

  useEffect(() => {
    if (isSupported) {
      setPermission(pushNotificationService.getPermissionStatus());
    }
  }, [isSupported]);

  const requestAndSubscribe = useCallback(async (userId: string) => {
    setIsSubscribing(true);
    try {
      const perm = await pushNotificationService.requestPermission();
      setPermission(perm);
      
      if (perm !== 'granted') {
        toast.error('Permissão de notificação negada');
        return;
      }

      const subscription = await pushNotificationService.subscribe(userId);
      if (subscription) {
        setIsSubscribed(true);
        toast.success('Notificações ativadas! 🎉');
      }
    } catch {
      toast.error('Erro ao ativar notificações');
    } finally {
      setIsSubscribing(false);
    }
  }, []);

  const unsubscribe = useCallback(async (userId: string) => {
    try {
      const success = await pushNotificationService.unsubscribe(userId);
      if (success) {
        setIsSubscribed(false);
        toast.success('Notificações desativadas');
      }
    } catch {
      toast.error('Erro ao desativar notificações');
    }
  }, []);

  return {
    isSupported,
    permission,
    isSubscribed,
    isSubscribing,
    requestAndSubscribe,
    unsubscribe,
  };
}
