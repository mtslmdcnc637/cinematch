import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

type PlanType = 'free' | 'monthly' | 'quarterly' | 'annual';

interface SubscriptionContextType {
  planType: PlanType;
  isPro: boolean;
  swipesToday: number;
  dicasToday: number;
  incrementSwipes: () => Promise<boolean>;
  incrementDicas: () => Promise<boolean>;
  isLoading: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode, userId?: string }> = ({ children, userId }) => {
  const [planType, setPlanType] = useState<PlanType>('free');
  const [swipesToday, setSwipesToday] = useState(0);
  const [dicasToday, setDicasToday] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const fetchSubscriptionData = async () => {
      try {
        // Fetch profile limits
        const { data: profile } = await supabase
          .from('profiles')
          .select('swipes_today, dicas_today, last_swipe_date, last_dica_date')
          .eq('id', userId)
          .single();

        if (profile) {
          const today = new Date().toISOString().split('T')[0];
          setSwipesToday(profile.last_swipe_date === today ? profile.swipes_today : 0);
          setDicasToday(profile.last_dica_date === today ? profile.dicas_today : 0);
        }

        // Fetch subscription status
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('plan_type, status')
          .eq('user_id', userId)
          .eq('status', 'active')
          .maybeSingle();

        if (sub) {
          setPlanType(sub.plan_type as PlanType);
        } else {
          setPlanType('free');
        }
      } catch (error) {
        console.error("Error fetching subscription:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscriptionData();
  }, [userId]);

  const incrementSwipes = async () => {
    if (!userId) return false;
    if (planType === 'free' && swipesToday >= 30) return false;

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
  };

  const incrementDicas = async () => {
    if (!userId) return false;
    if (planType === 'free' && dicasToday >= 5) return false;

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
  };

  return (
    <SubscriptionContext.Provider value={{
      planType,
      isPro: planType !== 'free',
      swipesToday,
      dicasToday,
      incrementSwipes,
      incrementDicas,
      isLoading
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
