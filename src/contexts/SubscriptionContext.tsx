import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

type PlanType = 'free' | 'monthly' | 'quarterly' | 'annual';

interface SubscriptionContextType {
  planType: PlanType;
  isPro: boolean;
  isTrialing: boolean;
  swipesToday: number;
  dicasToday: number;
  maxSwipes: number;
  maxDicas: number;
  incrementSwipes: () => Promise<boolean>;
  incrementDicas: () => Promise<boolean>;
  refreshSubscription: () => Promise<void>;
  isLoading: boolean;
  stripeCustomerId?: string;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

const FREE_MAX_SWIPES = 30;
const FREE_MAX_DICAS = 5;

export const SubscriptionProvider: React.FC<{ children: React.ReactNode, userId?: string }> = ({ children, userId }) => {
  const [planType, setPlanType] = useState<PlanType>('free');
  const [swipesToday, setSwipesToday] = useState(0);
  const [dicasToday, setDicasToday] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isTrialing, setIsTrialing] = useState(false);
  const [stripeCustomerId, setStripeCustomerId] = useState<string | undefined>();

  const fetchSubscriptionData = useCallback(async () => {
    if (!userId || !supabase) {
      setIsLoading(false);
      return;
    }

    try {
      // Fetch profile limits
      const { data: profile } = await supabase
        .from('profiles')
        .select('swipes_today, dicas_today, last_swipe_date, last_dica_date, subscription_status, subscription_plan')
        .eq('id', userId)
        .single();

      if (profile) {
        const today = new Date().toISOString().split('T')[0];
        setSwipesToday(profile.last_swipe_date === today ? profile.swipes_today : 0);
        setDicasToday(profile.last_dica_date === today ? profile.dicas_today : 0);
      }

      // Fetch subscription status from subscriptions table
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('plan_type, status, stripe_customer_id, cancel_at_period_end')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      if (sub) {
        setPlanType(sub.plan_type as PlanType);
        setIsTrialing(sub.status === 'trialing');
        setStripeCustomerId(sub.stripe_customer_id || undefined);
      } else if (profile?.subscription_plan && profile.subscription_plan !== 'free') {
        // Fallback: check profile subscription_plan
        setPlanType(profile.subscription_plan as PlanType);
      } else {
        setPlanType('free');
      }
    } catch {
      // Silently handle error
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchSubscriptionData();
  }, [fetchSubscriptionData]);

  // Real-time subscription listener
  useEffect(() => {


    if (!userId || !supabase) return;

    const channel = supabase
      .channel('subscription-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'subscriptions',
        filter: `user_id=eq.${userId}`,
      }, () => {
        fetchSubscriptionData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchSubscriptionData]);

  const incrementSwipes = useCallback(async () => {
    if (!userId || !supabase) return false;
    if (planType !== 'free') return true; // Unlimited for PRO
    if (swipesToday >= FREE_MAX_SWIPES) return false;

    const newCount = swipesToday + 1;
    setSwipesToday(newCount);

    await supabase
      .from('profiles')
      .update({
        swipes_today: newCount,
        last_swipe_date: new Date().toISOString().split('T')[0]
      })
      .eq('id', userId);

    return true;
  }, [userId, planType, swipesToday]);

  const incrementDicas = useCallback(async () => {
    if (!userId || !supabase) return false;
    if (planType !== 'free') return true; // Unlimited for PRO
    if (dicasToday >= FREE_MAX_DICAS) return false;

    const newCount = dicasToday + 1;
    setDicasToday(newCount);

    await supabase
      .from('profiles')
      .update({
        dicas_today: newCount,
        last_dica_date: new Date().toISOString().split('T')[0]
      })
      .eq('id', userId);

    return true;
  }, [userId, planType, dicasToday]);

  return (
    <SubscriptionContext.Provider value={{
      planType,
      isPro: planType !== 'free',
      isTrialing,
      swipesToday,
      dicasToday,
      maxSwipes: planType !== 'free' ? Infinity : FREE_MAX_SWIPES,
      maxDicas: planType !== 'free' ? Infinity : FREE_MAX_DICAS,
      incrementSwipes,
      incrementDicas,
      refreshSubscription: fetchSubscriptionData,
      isLoading,
      stripeCustomerId,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
