/**
 * ProducerDashboardPage — Main dashboard for MrCine Pro producers
 * 
 * Tabbed interface with: Visão Geral, Perfil, Listas, Comissões, Pagamentos
 * All API calls use Supabase session token for authentication.
 * Stripe Connect integration for producer payouts.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { toast, Toaster } from 'sonner';
import {
  Film,
  BarChart3,
  User,
  ListVideo,
  DollarSign,
  LogOut,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  MousePointerClick,
  TrendingUp,
  Wallet,
  Clock,
  Save,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
  Instagram,
  ChevronLeft,
  ChevronRight,
  X,
  Crown,
  Sparkles,
  CreditCard,
  Shield,
  ArrowRight,
  Info,
  Percent,
} from 'lucide-react';

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';


// ─── Types ────────────────────────────────────────────────────────

interface ProducerData {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  custom_slug: string | null;
  role: 'influencer' | 'critic' | 'creator';
  commission_rate: number;
  status: 'approved' | 'pending';
  pix_key: string | null;
  instagram: string | null;
  tiktok: string | null;
  youtube: string | null;
  email: string | null;
  stripe_connect_id: string | null;
  created_at: string;
}

interface ProducerStats {
  totalClicks: number;
  totalConversions: number;
  totalCommissions: number;
  totalEarnings: number;
  pendingEarnings: number;
}

interface ReferralEntry {
  id: string;
  ref_code: string;
  status: string;
  created_at: string;
}

interface ProducerList {
  id: string;
  title: string;
  description: string | null;
  movie_ids: number[];
  slug: string | null;
  is_published: boolean;
  created_at: string;
}

interface CommissionEntry {
  id: string;
  created_at: string;
  gross_amount: number;
  fee: number;
  net_amount: number;
  status: string;
}

interface StripeConnectStatus {
  connected: boolean;
  stripe_configured?: boolean;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  details_submitted?: boolean;
  stripe_available?: boolean;
  error?: string;
}


interface AnalyticsFunnel {
  total_clicks: number;
  conversions: number;
  conversion_rate: number;
}

interface AnalyticsTimeSeriesClicks {
  date: string;
  clicks: number;
  conversions: number;
}

interface AnalyticsTimeSeriesEarnings {
  date: string;
  earnings: number;
}

interface AnalyticsTopLink {
  id: string;
  code: string;
  discount: string;
  click_count: number;
  conversions: number;
  earnings: number;
}

interface AnalyticsData {
  funnel: AnalyticsFunnel;
  timeSeries: {
    clicks: AnalyticsTimeSeriesClicks[];
    earnings: AnalyticsTimeSeriesEarnings[];
  };
  topLinks: AnalyticsTopLink[];
}

type TabId = 'overview' | 'profile' | 'lists' | 'commissions' | 'analytics' | 'payments';

// ─── Helpers ──────────────────────────────────────────────────────

const formatBRL = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const formatDateTime = (dateStr: string): string =>
  new Date(dateStr).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// ─── Component ────────────────────────────────────────────────────

export default function ProducerDashboardPage() {
  const navigate = useNavigate();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [producer, setProducer] = useState<ProducerData | null>(null);
  const [stats, setStats] = useState<ProducerStats | null>(null);
  const [referrals, setReferrals] = useState<ReferralEntry[]>([]);
  const [lists, setLists] = useState<ProducerList[]>([]);
  const [commissions, setCommissions] = useState<CommissionEntry[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsDays, setAnalyticsDays] = useState(30);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTabLoading, setIsTabLoading] = useState(false);

  // ─── Auth check & data load ───────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      if (!supabase) {
        navigate('/producer/login', { replace: true });
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/producer/login', { replace: true });
        return;
      }

      setSessionToken(session.access_token);

      try {
        const res = await fetch('/api/producer/me', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          await supabase.auth.signOut();
          navigate('/producer/login', { replace: true });
          return;
        }

        const data = await res.json();
        setProducer(data.producer || data);
      } catch {
        await supabase.auth.signOut();
        navigate('/producer/login', { replace: true });
        return;
      }

      setIsLoading(false);
    };

    init();
  }, [navigate]);

  // Load data when tab changes or on refresh
  useEffect(() => {
    if (!sessionToken || !producer) return;
    loadTabData(activeTab);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken, producer, activeTab]);

  // Refetch analytics when days period changes
  useEffect(() => {
    if (!sessionToken || !producer || activeTab !== 'analytics') return;
    loadTabData('analytics');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyticsDays]);

  // Handle URL params for Stripe Connect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('stripe_refresh') === 'true') {
      toast.info('A configuração foi interrompida. Clique no botão para tentar novamente.', { duration: 8000 });
      setActiveTab('payments');
      // Clean URL
      window.history.replaceState({}, '', '/producer/dashboard');
    } else if (params.get('stripe_return') === 'true') {
      toast.success('Configuração concluída! Verificando status...', { duration: 5000 });
      setActiveTab('payments');
      window.history.replaceState({}, '', '/producer/dashboard');
      // Auto-refresh connect status after return from Stripe
      setTimeout(() => {
        if (sessionToken) {
          fetch('/api/producer/me/connect/status', {
            headers: { 'Authorization': `Bearer ${sessionToken}` },
          }).then(r => r.ok ? r.json() : null).then(() => {
            // Status will be reloaded when PaymentsTab mounts
          }).catch(() => {});
        }
      }, 1500);
    }
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        navigate('/producer/login', { replace: true });
      } else {
        setSessionToken(session.access_token);
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  // ─── Data loading ─────────────────────────────────────────────────

  const loadTabData = async (tab: TabId) => {
    if (!sessionToken) return;

    setIsTabLoading(true);
    try {
      if (tab === 'overview') {
        const [statsRes, refsRes] = await Promise.all([
          fetch('/api/producer/me/stats', {
            headers: { 'Authorization': `Bearer ${sessionToken}` },
          }),
          fetch('/api/producer/me/referrals?limit=5', {
            headers: { 'Authorization': `Bearer ${sessionToken}` },
          }),
        ]);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData.stats || statsData);
        }
        if (refsRes.ok) {
          const refsData = await refsRes.json();
          setReferrals(refsData.referrals || refsData);
        }
      } else if (tab === 'lists') {
        const res = await fetch('/api/producer/me/lists', {
          headers: { 'Authorization': `Bearer ${sessionToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setLists(data.lists || data);
        }
      } else if (tab === 'commissions') {
        const res = await fetch('/api/producer/me/commissions', {
          headers: { 'Authorization': `Bearer ${sessionToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setCommissions(data.commissions || data);
        }
      } else if (tab === 'analytics') {
        const res = await fetch(`/api/producer/me/analytics?days=${analyticsDays}`, {
          headers: { 'Authorization': `Bearer ${sessionToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setAnalytics(data);
        }
      }
    } catch (err) {
      console.error(`[ProducerDashboard] Error loading ${tab}:`, err);
      toast.error(`Erro ao carregar dados da aba.`);
    } finally {
      setIsTabLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadTabData(activeTab);
      toast.success('Dados atualizados!');
    } catch {
      toast.error('Erro ao atualizar dados. Tente novamente.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    toast.info('Sessão encerrada.');
    navigate('/producer/login', { replace: true });
  };

  // ─── Loading State ────────────────────────────────────────────────

  if (isLoading || !producer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030303]">
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-purple-900/20 blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-fuchsia-900/10 blur-[100px]" />
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4 relative z-10"
        >
          <div className="w-16 h-16 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin" />
          <p className="text-gray-400 font-medium">Carregando dashboard...</p>
        </motion.div>
      </div>
    );
  }

  // ─── Tabs Config ──────────────────────────────────────────────────

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'lists', label: 'Listas', icon: ListVideo },
    { id: 'commissions', label: 'Comissões', icon: DollarSign },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'payments', label: 'Pagamentos', icon: CreditCard },
  ];

  // ─── Dashboard ────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#030303] text-white selection:bg-purple-500/30">
      <Toaster theme="dark" position="top-center" toastOptions={{ style: { background: 'rgba(20, 20, 20, 0.8)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' } }} />

      {/* Background Ambient Glow */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-purple-900/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-fuchsia-900/10 blur-[100px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#030303]/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Film className="w-6 h-6 text-purple-500 shrink-0" />
            <span className="text-lg font-bold truncate">
              MrCine<span className="text-purple-500">PRO</span>
            </span>
            <span className="hidden sm:inline text-gray-500 text-sm truncate">
              {producer.display_name} <span className="text-gray-600">@{producer.username}</span>
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="text-gray-400 hover:text-white p-2 rounded-lg transition-colors disabled:opacity-50"
              title="Atualizar dados"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-red-400 p-2 rounded-lg transition-colors flex items-center gap-1.5 text-sm"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 relative z-10">
        <div className="flex gap-1 bg-white/5 rounded-xl p-1 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Loading Indicator */}
      {isTabLoading && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="flex items-center gap-2 py-2 mb-2">
            <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
            <span className="text-sm text-gray-400">Carregando...</span>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 relative z-10">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <OverviewTab stats={stats} referrals={referrals} isLoading={isTabLoading} />
            </motion.div>
          )}
          {activeTab === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <ProfileTab producer={producer} sessionToken={sessionToken!} onUpdate={(p) => setProducer(p)} />
            </motion.div>
          )}
          {activeTab === 'lists' && (
            <motion.div key="lists" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <ListsTab lists={lists} sessionToken={sessionToken!} onRefresh={() => loadTabData('lists')} />
            </motion.div>
          )}
          {activeTab === 'commissions' && (
            <motion.div key="commissions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <CommissionsTab commissions={commissions} isLoading={isTabLoading} />
            </motion.div>
          )}
          {activeTab === 'analytics' && (
            <motion.div key="analytics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <AnalyticsTab analytics={analytics} days={analyticsDays} onDaysChange={setAnalyticsDays} isLoading={isTabLoading} />
            </motion.div>
          )}
          {activeTab === 'payments' && (
            <motion.div key="payments" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <PaymentsTab sessionToken={sessionToken!} producer={producer} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════════════════════════════════════════

function OverviewTab({ stats, referrals, isLoading }: { stats: ProducerStats | null; referrals: ReferralEntry[]; isLoading?: boolean }) {
  if (isLoading || !stats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-4 animate-pulse">
              <div className="w-9 h-9 rounded-xl bg-white/5 mb-3" />
              <div className="h-7 w-20 bg-white/5 rounded mb-1" />
              <div className="h-3 w-16 bg-white/5 rounded" />
            </div>
          ))}
        </div>
        <div className="bg-white/5 border border-white/5 rounded-2xl p-5 animate-pulse">
          <div className="h-5 w-48 bg-white/5 rounded mb-4" />
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5" />
                  <div>
                    <div className="h-4 w-24 bg-white/5 rounded mb-1" />
                    <div className="h-3 w-32 bg-white/5 rounded" />
                  </div>
                </div>
                <div className="h-5 w-16 bg-white/5 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards 2x2 Grid */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          icon={MousePointerClick}
          label="Total de Cliques"
          value={stats.totalClicks.toLocaleString('pt-BR')}
          color="purple"
        />
        <StatCard
          icon={TrendingUp}
          label="Conversões"
          value={stats.totalConversions.toLocaleString('pt-BR')}
          color="green"
        />
        <StatCard
          icon={DollarSign}
          label="Comissões Totais"
          value={formatBRL(stats.totalCommissions)}
          color="amber"
        />
        <StatCard
          icon={Wallet}
          label="Ganho Total"
          value={formatBRL(stats.totalEarnings)}
          color="pink"
        />
      </div>

      {/* Pending Earnings Card */}
      {stats.pendingEarnings > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-amber-500/10 to-yellow-500/5 border border-amber-500/20 rounded-2xl p-5 flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <p className="text-sm text-amber-300 font-medium">Ganhos Pendentes</p>
            <p className="text-2xl font-bold text-amber-400">{formatBRL(stats.pendingEarnings)}</p>
          </div>
        </motion.div>
      )}

      {/* Recent Referrals */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          Indicações Recentes
        </h3>
        {referrals.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">Nenhuma indicação registrada ainda.</p>
        ) : (
          <div className="space-y-3">
            {referrals.map((ref) => (
              <div key={ref.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <ExternalLink className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-300">{ref.ref_code}</p>
                    <p className="text-xs text-gray-500">{formatDateTime(ref.created_at)}</p>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  ref.status === 'converted'
                    ? 'bg-green-500/10 text-green-400'
                    : ref.status === 'clicked'
                      ? 'bg-amber-500/10 text-amber-400'
                      : 'bg-gray-500/10 text-gray-400'
                }`}>
                  {ref.status === 'converted' ? 'Convertido' : ref.status === 'clicked' ? 'Clicou' : ref.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PROFILE TAB
// ═══════════════════════════════════════════════════════════════════

function ProfileTab({
  producer,
  sessionToken,
  onUpdate,
}: {
  producer: ProducerData;
  sessionToken: string;
  onUpdate: (p: ProducerData) => void;
}) {
  const [form, setForm] = useState({
    display_name: producer.display_name || '',
    bio: producer.bio || '',
    pix_key: producer.pix_key || '',
    instagram: producer.instagram || '',
    tiktok: producer.tiktok || '',
    youtube: producer.youtube || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/producer/me', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Erro ao salvar alterações');
      }

      const data = await res.json();
      onUpdate(data.producer || data);
      setSaveSuccess(true);
      toast.success('Perfil atualizado com sucesso!');

      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar alterações';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Read-Only Info */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Crown className="w-5 h-5 text-purple-400" />
          Informações da Conta
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ReadOnlyField label="Email" value={producer.email || '—'} />
          <ReadOnlyField label="Username" value={`@${producer.username}`} />
          <ReadOnlyField
            label="Status"
            value={producer.status === 'approved' ? 'Aprovado' : 'Pendente'}
            badge={producer.status}
          />
          <ReadOnlyField label="Taxa de Comissão" value={`${(producer.commission_rate * 100).toFixed(0)}%`} />
        </div>
      </div>

      {/* Editable Form */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <h3 className="font-bold text-lg mb-4">Editar Perfil</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5 font-medium">Nome de Exibição</label>
            <input
              type="text"
              value={form.display_name}
              onChange={(e) => setForm(prev => ({ ...prev, display_name: e.target.value }))}
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5 font-medium">Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm(prev => ({ ...prev, bio: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-all resize-none"
              placeholder="Conte um pouco sobre você..."
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5 font-medium">Chave Pix</label>
            <input
              type="text"
              value={form.pix_key}
              onChange={(e) => setForm(prev => ({ ...prev, pix_key: e.target.value }))}
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-all"
              placeholder="email@exemplo.com ou CPF"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5 font-medium">Instagram</label>
              <input
                type="text"
                value={form.instagram}
                onChange={(e) => setForm(prev => ({ ...prev, instagram: e.target.value }))}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-all"
                placeholder="@usuario"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5 font-medium">TikTok</label>
              <input
                type="text"
                value={form.tiktok}
                onChange={(e) => setForm(prev => ({ ...prev, tiktok: e.target.value }))}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-all"
                placeholder="@usuario"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5 font-medium">YouTube</label>
              <input
                type="text"
                value={form.youtube}
                onChange={(e) => setForm(prev => ({ ...prev, youtube: e.target.value }))}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-all"
                placeholder="@canal"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold rounded-xl transition-all duration-300 hover:shadow-[0_0_20px_rgba(147,51,234,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saveSuccess ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isSaving ? 'Salvando...' : saveSuccess ? 'Salvo!' : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// LISTS TAB
// ═══════════════════════════════════════════════════════════════════

function ListsTab({
  lists,
  sessionToken,
  onRefresh,
}: {
  lists: ProducerList[];
  sessionToken: string;
  onRefresh: () => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [editingList, setEditingList] = useState<ProducerList | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    movie_ids: '',
    slug: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingList, setIsDeletingList] = useState<string | null>(null);
  const [isTogglingList, setIsTogglingList] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditingList(null);
    setForm({ title: '', description: '', movie_ids: '', slug: '' });
    setShowModal(true);
  };

  const openEditModal = (list: ProducerList) => {
    setEditingList(list);
    setForm({
      title: list.title,
      description: list.description || '',
      movie_ids: list.movie_ids?.join(', ') || '',
      slug: list.slug || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingList(null);
  };

  const handleSaveList = async () => {
    if (!form.title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    setIsSaving(true);
    const movieIds = form.movie_ids
      .split(',')
      .map(s => parseInt(s.trim()))
      .filter(n => !isNaN(n));

    try {
      const url = editingList ? `/api/producer/me/lists/${editingList.id}` : '/api/producer/me/lists';
      const method = editingList ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || null,
          movie_ids: movieIds,
          slug: form.slug.trim() || null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Erro ao salvar lista');
      }

      toast.success(editingList ? 'Lista atualizada!' : 'Lista criada!');
      closeModal();
      onRefresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar lista';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteList = async (listId: string) => {
    setIsDeletingList(listId);
    try {
      const res = await fetch(`/api/producer/me/lists/${listId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${sessionToken}` },
      });

      if (!res.ok) throw new Error('Erro ao deletar lista');

      toast.success('Lista deletada com sucesso!');
      setDeleteConfirmId(null);
      onRefresh();
    } catch {
      toast.error('Erro ao deletar lista. Tente novamente.');
    } finally {
      setIsDeletingList(null);
    }
  };

  const handleTogglePublish = async (list: ProducerList) => {
    setIsTogglingList(list.id);
    try {
      const res = await fetch(`/api/producer/me/lists/${list.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_published: !list.is_published }),
      });

      if (!res.ok) throw new Error('Erro ao atualizar lista');

      toast.success(list.is_published ? 'Lista despublicada!' : 'Lista publicada!');
      onRefresh();
    } catch {
      toast.error('Erro ao atualizar lista. Tente novamente.');
    } finally {
      setIsTogglingList(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header + Create button */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">Suas Listas ({lists.length})</h3>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Lista
        </button>
      </div>

      {/* Lists */}
      {lists.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <ListVideo className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">Nenhuma lista criada ainda.</p>
          <button
            onClick={openCreateModal}
            className="text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors"
          >
            Criar sua primeira lista →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {lists.map((list) => (
            <div key={list.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium truncate">{list.title}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                      list.is_published
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-gray-500/10 text-gray-400'
                    }`}>
                      {list.is_published ? 'Publicada' : 'Rascunho'}
                    </span>
                  </div>
                  {list.description && (
                    <p className="text-sm text-gray-400 line-clamp-2">{list.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Film className="w-3 h-3" />
                      {list.movie_ids?.length || 0} filmes
                    </span>
                    {list.slug && (
                      <span className="flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" />
                        /p/{list.slug}
                      </span>
                    )}
                    <span>{formatDate(list.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleTogglePublish(list)}
                    disabled={isTogglingList === list.id}
                    className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                      list.is_published
                        ? 'text-amber-400 hover:bg-amber-500/10'
                        : 'text-green-400 hover:bg-green-500/10'
                    }`}
                    title={list.is_published ? 'Despublicar' : 'Publicar'}
                  >
                    {isTogglingList === list.id ? <Loader2 className="w-4 h-4 animate-spin" /> : list.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => openEditModal(list)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(list.id)}
                    disabled={isDeletingList === list.id}
                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                    title="Deletar"
                  >
                    {isDeletingList === list.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {deleteConfirmId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirmId(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-sm"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
                  <AlertCircle className="w-7 h-7 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2">Deletar lista?</h3>
                  <p className="text-gray-400 text-sm">Essa ação não pode ser desfeita. A lista e todos os seus dados serão removidos permanentemente.</p>
                </div>
                <div className="flex items-center gap-3 w-full">
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="flex-1 px-4 py-2.5 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleDeleteList(deleteConfirmId)}
                    disabled={isDeletingList === deleteConfirmId}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDeletingList === deleteConfirmId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    {isDeletingList === deleteConfirmId ? 'Deletando...' : 'Deletar'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold">{editingList ? 'Editar Lista' : 'Nova Lista'}</h3>
                <button onClick={closeModal} className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5 font-medium">Título *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-all"
                    placeholder="Ex: Top 10 Filmes de Terror"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5 font-medium">Descrição</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-all resize-none"
                    placeholder="Descrição da lista..."
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5 font-medium">IDs dos Filmes (TMDB)</label>
                  <input
                    type="text"
                    value={form.movie_ids}
                    onChange={(e) => setForm(prev => ({ ...prev, movie_ids: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-all font-mono text-sm"
                    placeholder="IDs separados por vírgula, ex: 574475, 414429, 447365"
                  />
                  <p className="text-xs text-gray-600 mt-1">Encontre o ID no themoviedb.org/movie/[ID]</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5 font-medium">Slug (URL personalizada)</label>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => setForm(prev => ({ ...prev, slug: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-all"
                    placeholder="Ex: top-terror (opcional)"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={closeModal}
                  className="px-4 py-2.5 text-gray-400 hover:text-white rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveList}
                  disabled={isSaving || !form.title.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isSaving ? 'Salvando...' : editingList ? 'Salvar Alterações' : 'Criar Lista'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// COMMISSIONS TAB
// ═══════════════════════════════════════════════════════════════════

function CommissionsTab({ commissions, isLoading }: { commissions: CommissionEntry[]; isLoading?: boolean }) {
  const [page, setPage] = useState(1);
  const perPage = 10;
  const totalPages = Math.max(1, Math.ceil(commissions.length / perPage));
  const paginatedCommissions = commissions.slice((page - 1) * perPage, page * perPage);

  const totalGross = commissions.reduce((acc, c) => acc + c.gross_amount, 0);
  const totalFee = commissions.reduce((acc, c) => acc + c.fee, 0);
  const totalNet = commissions.reduce((acc, c) => acc + c.net_amount, 0);

  const statusLabel = (status: string): string => {
    switch (status) {
      case 'paid': return 'Pago';
      case 'pending': return 'Pendente';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const statusClass = (status: string): string => {
    switch (status) {
      case 'paid': return 'bg-green-500/10 text-green-400';
      case 'pending': return 'bg-amber-500/10 text-amber-400';
      case 'cancelled': return 'bg-red-500/10 text-red-400';
      default: return 'bg-gray-500/10 text-gray-400';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-white/5 animate-pulse" />
            <div className="h-5 w-40 bg-white/5 animate-pulse rounded" />
          </div>
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-white/5">
                <div className="h-4 w-24 bg-white/5 animate-pulse rounded" />
                <div className="h-4 w-20 bg-white/5 animate-pulse rounded" />
                <div className="h-4 w-16 bg-white/5 animate-pulse rounded" />
                <div className="h-4 w-20 bg-white/5 animate-pulse rounded" />
                <div className="h-6 w-16 bg-white/5 animate-pulse rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {commissions.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <DollarSign className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500">Nenhuma comissão registrada ainda.</p>
          <p className="text-gray-600 text-sm mt-1">As comissões aparecerão quando suas indicações gerarem assinaturas.</p>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-gray-500">
                    <th className="text-left py-3 px-4 font-medium">Data</th>
                    <th className="text-right py-3 px-4 font-medium">Valor Bruto</th>
                    <th className="text-right py-3 px-4 font-medium">Taxa</th>
                    <th className="text-right py-3 px-4 font-medium">Valor Líquido</th>
                    <th className="text-center py-3 px-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCommissions.map((c) => (
                    <tr key={c.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 text-gray-300">{formatDate(c.created_at)}</td>
                      <td className="py-3 px-4 text-right text-gray-300">{formatBRL(c.gross_amount)}</td>
                      <td className="py-3 px-4 text-right text-red-400">-{formatBRL(c.fee)}</td>
                      <td className="py-3 px-4 text-right font-medium text-green-400">{formatBRL(c.net_amount)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusClass(c.status)}`}>
                          {statusLabel(c.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-400">
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Summary */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h4 className="font-bold mb-3">Resumo Total</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Bruto</p>
                <p className="text-lg font-bold text-gray-300">{formatBRL(totalGross)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Taxas</p>
                <p className="text-lg font-bold text-red-400">-{formatBRL(totalFee)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Líquido</p>
                <p className="text-lg font-bold text-green-400">{formatBRL(totalNet)}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PAYMENTS TAB (Stripe Connect)
// ═══════════════════════════════════════════════════════════════════

function PaymentsTab({ sessionToken, producer }: { sessionToken: string; producer: ProducerData }) {
  const [stripeStatus, setStripeStatus] = useState<StripeConnectStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [isOpeningDashboard, setIsOpeningDashboard] = useState(false);

  // Load Stripe Connect status on mount
  useEffect(() => {
    loadStripeStatus();
  }, []);

  const loadStripeStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const res = await fetch('/api/producer/me/connect/status', {
        headers: { 'Authorization': `Bearer ${sessionToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStripeStatus(data);
      } else {
        setStripeStatus({ connected: false });
      }
    } catch {
      setStripeStatus({ connected: false });
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const handleConnectStripe = async () => {
    setIsOnboarding(true);
    try {
      const res = await fetch('/api/producer/me/connect/onboard', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || 'Erro ao iniciar onboarding');
      }

      const data = await res.json();

      if (data.url) {
        // Redirect to Stripe onboarding
        window.location.href = data.url;
      } else if (data.status === 'complete') {
        // Already connected
        toast.success(data.message || 'Sua conta Stripe já está configurada!');
        loadStripeStatus();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao conectar com Stripe';
      toast.error(message);
    } finally {
      setIsOnboarding(false);
    }
  };

  const handleOpenDashboard = async () => {
    setIsOpeningDashboard(true);
    try {
      const res = await fetch('/api/producer/me/connect/dashboard', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || 'Erro ao abrir painel');
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao abrir painel Stripe';
      toast.error(message);
    } finally {
      setIsOpeningDashboard(false);
    }
  };

  // Loading state
  if (isLoadingStatus) {
    return (
      <div className="space-y-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <Loader2 className="w-10 h-10 text-purple-400 mx-auto mb-3 animate-spin" />
          <p className="text-gray-400">Verificando status do Stripe...</p>
        </div>
      </div>
    );
  }

  // Stripe not configured (system maintenance)
  if (stripeStatus?.stripe_configured === false) {
    return (
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8"
        >
          <div className="flex flex-col items-center text-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gray-500/20 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Pagamentos Indisponíveis</h3>
              <p className="text-gray-400 max-w-md">
                Sistema de pagamentos em manutenção. Tente novamente mais tarde.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Not connected — show connect CTA
  if (!stripeStatus?.connected) {
    return (
      <div className="space-y-6">
        {/* Connect Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-purple-900/30 to-fuchsia-900/20 border border-purple-500/20 rounded-2xl p-6 sm:p-8"
        >
          <div className="flex flex-col items-center text-center gap-5">
            {/* Stripe Logo */}
            <div className="w-16 h-16 rounded-2xl bg-[#635bff]/20 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-10 h-10" fill="none">
                <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-7.076-2.204l-.917 5.629C5.018 22.759 7.574 24 11.411 24c2.645 0 4.795-.701 6.335-1.972 1.655-1.339 2.537-3.292 2.537-5.794 0-4.19-2.508-5.892-6.307-7.084z" fill="#635bff"/>
              </svg>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-2">Conecte sua conta Stripe</h3>
              <p className="text-gray-400 max-w-md">
                Conecte sua conta Stripe para receber seus ganhos automaticamente toda vez que uma comissão for gerada.
              </p>
            </div>

            <button
              onClick={handleConnectStripe}
              disabled={isOnboarding}
              className="flex items-center gap-3 px-8 py-3.5 bg-[#635bff] hover:bg-[#7a73ff] text-white font-bold rounded-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(99,91,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              {isOnboarding ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                  <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-7.076-2.204l-.917 5.629C5.018 22.759 7.574 24 11.411 24c2.645 0 4.795-.701 6.335-1.972 1.655-1.339 2.537-3.292 2.537-5.794 0-4.19-2.508-5.892-6.307-7.084z" fill="currentColor"/>
                </svg>
              )}
              {isOnboarding ? 'Conectando...' : 'Conectar com Stripe'}
            </button>
          </div>
        </motion.div>

        {/* Info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <InfoCard
            icon={Shield}
            title="Seguro"
            description="O Stripe é certificado PCI Level 1, o mais alto nível de segurança"
          />
          <InfoCard
            icon={Clock}
            title="Rápido"
            description="Receba seus ganhos automaticamente a cada ciclo de pagamento"
          />
          <InfoCard
            icon={Wallet}
            title="Transparente"
            description="Acompanhe todos os seus ganhos e pagamentos no painel Stripe"
          />
        </div>
      </div>
    );
  }

  // Connected but onboarding incomplete
  if (stripeStatus.connected && (!stripeStatus.charges_enabled || !stripeStatus.payouts_enabled)) {
    return (
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-amber-900/20 to-yellow-900/10 border border-amber-500/20 rounded-2xl p-6 sm:p-8"
        >
          <div className="flex flex-col items-center text-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-amber-400" />
            </div>

            <div>
              <h3 className="text-xl font-bold mb-2">Configuração Incompleta</h3>
              <p className="text-gray-400 max-w-md">
                Sua conta Stripe precisa de informações adicionais para receber pagamentos.
              </p>
            </div>

            <button
              onClick={handleConnectStripe}
              disabled={isOnboarding}
              className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isOnboarding ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ArrowRight className="w-5 h-5" />
              )}
              {isOnboarding ? 'Abrindo...' : 'Completar Configuração'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Fully connected
  return (
    <div className="space-y-6">
      {/* Connected Badge Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-green-900/20 to-emerald-900/10 border border-green-500/20 rounded-2xl p-6"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center shrink-0">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold">Conta Stripe Conectada</h3>
                <span className="text-sm font-bold text-green-400 bg-green-500/10 px-2.5 py-0.5 rounded-full">✓</span>
              </div>
              <p className="text-sm text-gray-400">Acesse seu painel Stripe para ver saldo, extrato e configurar sua conta bancária.</p>
            </div>
          </div>
          <button
            onClick={handleOpenDashboard}
            disabled={isOpeningDashboard}
            className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {isOpeningDashboard ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ExternalLink className="w-4 h-4" />
            )}
            {isOpeningDashboard ? 'Abrindo...' : 'Acessar Painel Stripe'}
          </button>
        </div>
      </motion.div>

      {/* Status Details */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <h4 className="font-bold mb-4 flex items-center gap-2">
          <Info className="w-4 h-4 text-gray-400" />
          Status da Conta
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatusItem
            label="Cobranças"
            enabled={stripeStatus.charges_enabled}
          />
          <StatusItem
            label="Pagamentos"
            enabled={stripeStatus.payouts_enabled}
          />
          <StatusItem
            label="Dados Enviados"
            enabled={stripeStatus.details_submitted}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <h4 className="font-bold mb-4">Ações Rápidas</h4>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleOpenDashboard}
            disabled={isOpeningDashboard}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#635bff]/20 hover:bg-[#635bff]/30 text-[#a5a0ff] font-medium rounded-xl transition-all disabled:opacity-50"
          >
            <CreditCard className="w-4 h-4" />
            Ver Extrato Stripe
          </button>
          <button
            onClick={handleConnectStripe}
            disabled={isOnboarding}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 font-medium rounded-xl transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isOnboarding ? 'animate-spin' : ''}`} />
            Atualizar Dados Bancários
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Payment Sub-Components ──────────────────────────────────────────

function InfoCard({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
      <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mx-auto mb-3">
        <Icon className="w-5 h-5 text-purple-400" />
      </div>
      <h4 className="font-medium text-sm mb-1">{title}</h4>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  );
}

function StatusItem({ label, enabled }: { label: string; enabled?: boolean }) {
  return (
    <div className="bg-white/5 rounded-xl p-3 flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
        enabled ? 'bg-green-500/10' : 'bg-amber-500/10'
      }`}>
        {enabled ? (
          <CheckCircle className="w-4 h-4 text-green-400" />
        ) : (
          <AlertCircle className="w-4 h-4 text-amber-400" />
        )}
      </div>
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className={`text-xs ${enabled ? 'text-green-400' : 'text-amber-400'}`}>
          {enabled ? 'Ativo' : 'Pendente'}
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ANALYTICS TAB
// ═══════════════════════════════════════════════════════════════════

function AnalyticsTab({
  analytics,
  days,
  onDaysChange,
  isLoading,
}: {
  analytics: AnalyticsData | null;
  days: number;
  onDaysChange: (days: number) => void;
  isLoading?: boolean;
}) {
  const hasData = analytics && (
    (analytics.timeSeries?.clicks?.length > 0) ||
    (analytics.timeSeries?.earnings?.length > 0) ||
    (analytics.topLinks?.length > 0)
  );

  const periodOptions = [
    { value: 7, label: '7 dias' },
    { value: 30, label: '30 dias' },
    { value: 90, label: '90 dias' },
  ];

  // Merge clicks and earnings time series for the combined chart
  const mergedTimeSeries = React.useMemo(() => {
    if (!analytics?.timeSeries) return [];
    const clicksMap = new Map(analytics.timeSeries.clicks.map(c => [c.date, c]));
    const earningsMap = new Map(analytics.timeSeries.earnings.map(e => [e.date, e]));

    const allDates = new Set([...clicksMap.keys(), ...earningsMap.keys()]);
    return Array.from(allDates).sort().map(date => ({
      date,
      clicks: clicksMap.get(date)?.clicks ?? 0,
      conversions: clicksMap.get(date)?.conversions ?? 0,
      earnings: earningsMap.get(date)?.earnings ?? 0,
    }));
  }, [analytics]);

  const formatChartDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center gap-2">
        {periodOptions.map(opt => (
          <button
            key={opt.value}
            onClick={() => onDaysChange(opt.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              days === opt.value
                ? 'bg-purple-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        /* Loading Skeleton */
        <div className="space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="h-5 w-48 bg-white/5 animate-pulse rounded mb-4" />
            <div className="grid grid-cols-3 gap-4 mb-4">
              {[1,2,3].map(i => (
                <div key={i} className="bg-white/5 border border-white/5 rounded-xl p-4 text-center">
                  <div className="w-5 h-5 bg-white/5 animate-pulse rounded mx-auto mb-2" />
                  <div className="h-7 w-16 bg-white/5 animate-pulse rounded mx-auto mb-1" />
                  <div className="h-3 w-10 bg-white/5 animate-pulse rounded mx-auto" />
                </div>
              ))}
            </div>
            <div className="h-4 bg-white/5 animate-pulse rounded-full" />
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="h-5 w-48 bg-white/5 animate-pulse rounded mb-4" />
            <div className="h-72 bg-white/5 animate-pulse rounded-xl" />
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="h-5 w-32 bg-white/5 animate-pulse rounded mb-4" />
            <div className="h-72 bg-white/5 animate-pulse rounded-xl" />
          </div>
        </div>
      ) : !hasData ? (
        /* Empty State */
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <TrendingUp className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500">Seus dados de analytics aparecerão aqui quando você começar a receber cliques no seu link de referência.</p>
        </div>
      ) : (
        <>
          {/* Funnel Card */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              Funil de Conversão
            </h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 text-center">
                <MousePointerClick className="w-5 h-5 text-purple-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-purple-400">{analytics.funnel.total_clicks.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-gray-500 mt-1">Cliques</p>
              </div>
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
                <CheckCircle className="w-5 h-5 text-green-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-400">{analytics.funnel.conversions.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-gray-500 mt-1">Conversões</p>
              </div>
              <div className="bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-xl p-4 text-center">
                <Percent className="w-5 h-5 text-fuchsia-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-fuchsia-400">{analytics.funnel.conversion_rate.toFixed(1)}%</p>
                <p className="text-xs text-gray-500 mt-1">Taxa de Conversão</p>
              </div>
            </div>
            {/* Visual funnel bar */}
            <div className="relative h-4 bg-white/5 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-green-500 rounded-full transition-all duration-500"
                style={{ width: `${analytics.funnel.total_clicks > 0 ? Math.max(2, (analytics.funnel.conversions / analytics.funnel.total_clicks) * 100) : 0}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-xs text-gray-500">
              <span>{analytics.funnel.total_clicks.toLocaleString('pt-BR')} cliques</span>
              <span>{analytics.funnel.conversions.toLocaleString('pt-BR')} conversões</span>
            </div>
          </div>

          {/* Clicks & Conversions Chart */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h3 className="font-bold text-lg mb-4">Cliques e Conversões</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mergedTimeSeries} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="clicksGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="conversionsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatChartDate}
                    stroke="rgba(255,255,255,0.5)"
                    tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.5)"
                    tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(17, 17, 17, 0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '13px',
                    }}
                    labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  />
                  <Legend
                    wrapperStyle={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="clicks"
                    name="Cliques"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    fill="url(#clicksGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="conversions"
                    name="Conversões"
                    stroke="#22C55E"
                    strokeWidth={2}
                    fill="url(#conversionsGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Earnings Chart */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h3 className="font-bold text-lg mb-4">Ganhos (R$)</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.timeSeries.earnings} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatChartDate}
                    stroke="rgba(255,255,255,0.5)"
                    tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.5)"
                    tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    tickFormatter={(val: number) => `R$${val}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(17, 17, 17, 0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '13px',
                    }}
                    labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    formatter={(value: number) => [formatBRL(value), 'Ganhos']}
                  />
                  <Bar
                    dataKey="earnings"
                    name="Ganhos"
                    fill="#22C55E"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Links Table */}
          {analytics.topLinks.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-white/10">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <ListVideo className="w-5 h-5 text-purple-400" />
                  Top Links
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-500">
                      <th className="text-left py-3 px-4 font-medium">Código</th>
                      <th className="text-left py-3 px-4 font-medium">Desconto</th>
                      <th className="text-right py-3 px-4 font-medium">Cliques</th>
                      <th className="text-right py-3 px-4 font-medium">Conversões</th>
                      <th className="text-right py-3 px-4 font-medium">Ganhos</th>
                      <th className="text-right py-3 px-4 font-medium">Taxa Conv.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.topLinks.map((link) => (
                      <tr key={link.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 text-gray-300 font-mono text-xs">{link.code}</td>
                        <td className="py-3 px-4 text-gray-300">{link.discount}</td>
                        <td className="py-3 px-4 text-right text-purple-400">{link.click_count.toLocaleString('pt-BR')}</td>
                        <td className="py-3 px-4 text-right text-green-400">{link.conversions.toLocaleString('pt-BR')}</td>
                        <td className="py-3 px-4 text-right font-medium text-green-400">{formatBRL(link.earnings)}</td>
                        <td className="py-3 px-4 text-right text-fuchsia-400">
                          {link.click_count > 0 ? (link.conversions / link.click_count * 100).toFixed(1) + '%' : '0.0%'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SHARED SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  const colorMap: Record<string, { gradient: string; icon: string; text: string }> = {
    purple: {
      gradient: 'from-purple-500/20 to-purple-900/10 border-purple-500/20',
      icon: 'text-purple-400 bg-purple-500/10',
      text: 'text-purple-400',
    },
    green: {
      gradient: 'from-green-500/20 to-green-900/10 border-green-500/20',
      icon: 'text-green-400 bg-green-500/10',
      text: 'text-green-400',
    },
    amber: {
      gradient: 'from-amber-500/20 to-amber-900/10 border-amber-500/20',
      icon: 'text-amber-400 bg-amber-500/10',
      text: 'text-amber-400',
    },
    pink: {
      gradient: 'from-pink-500/20 to-pink-900/10 border-pink-500/20',
      icon: 'text-pink-400 bg-pink-500/10',
      text: 'text-pink-400',
    },
  };

  const c = colorMap[color] || colorMap.purple;

  return (
    <div className={`bg-gradient-to-br ${c.gradient} border rounded-2xl p-4`}>
      <div className={`w-9 h-9 rounded-xl ${c.icon} flex items-center justify-center mb-3`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-xl sm:text-2xl font-bold">{value}</p>
      <p className={`text-xs ${c.text} mt-0.5 font-medium`}>{label}</p>
    </div>
  );
}

function ReadOnlyField({ label, value, badge }: { label: string; value: string; badge?: string }) {
  return (
    <div className="bg-white/5 rounded-xl p-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      {badge ? (
        <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${
          badge === 'approved'
            ? 'bg-green-500/10 text-green-400'
            : 'bg-amber-500/10 text-amber-400'
        }`}>
          {value}
        </span>
      ) : (
        <p className="text-sm font-medium text-gray-300">{value}</p>
      )}
    </div>
  );
}
