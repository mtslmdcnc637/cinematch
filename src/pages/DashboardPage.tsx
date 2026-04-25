import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, UserCheck, UserX, TrendingUp, Mail, Phone, Film, BarChart3, Eye, EyeOff, LogOut, RefreshCw, Key, Plus, Trash2, Pencil, X, Check, Loader2 } from 'lucide-react';
import { invokeEdgeFunction } from '../lib/edgeFunction';
import { toast } from 'sonner';
import { LEVELS, getLeagueForLevel } from '../constants';

// Admin password is validated server-side only (admin-stats edge function).
// The frontend never stores or compares the actual password.
// We just send what the user types to the backend for verification.

// ─── Types ───
interface ProfileRow {
  id: string;
  username: string | null;
  xp: number;
  level: number;
  subscription_status: string | null;
  subscription_plan: string | null;
  email: string | null;
  created_at: string | null;
}

interface QuizResponseRow {
  id: string;
  name: string | null;
  email: string | null;
  whatsapp: string | null;
  profile_type: string | null;
  answers: Record<string, any>;
  last_step: number;
  completed: boolean;
  created_at: string | null;
}

interface SubscriptionRow {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  plan_type: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface SecretCode {
  id: string;
  code: string;
  title: string;
  description: string | null;
  movie_ids: number[];
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

type TabId = 'overview' | 'funnel' | 'responses' | 'profiles' | 'codes';

// ─── API Helper ───
const API_BASE = '/api/admin/secret-codes';

async function adminFetch(path: string, options: RequestInit = {}, adminPassword?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (adminPassword) {
    headers['x-admin-password'] = adminPassword;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Erro ${res.status}`);
  }
  return data;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [isAuthed, setIsAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [quizResponses, setQuizResponses] = useState<QuizResponseRow[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);

  // Secret codes management
  const [secretCodes, setSecretCodes] = useState<SecretCode[]>([]);
  const [newCode, setNewCode] = useState({ code: '', title: '', description: '', movieIds: '' });
  const [editingCode, setEditingCode] = useState<SecretCode | null>(null);
  const [editForm, setEditForm] = useState({ code: '', title: '', description: '', movieIds: '' });
  const [codeActionLoading, setCodeActionLoading] = useState<string | null>(null);

  // Check if already authenticated (session storage)
  useEffect(() => {
    const savedPassword = sessionStorage.getItem('cm_admin_pw');
    if (savedPassword && sessionStorage.getItem('cm_admin') === 'true') {
      setPassword(savedPassword);
      setIsAuthed(true);
    }
  }, []);

  // Load data when authenticated
  useEffect(() => {
    if (!isAuthed) return;
    loadAllData();
  }, [isAuthed]);

  const loadAllData = async () => {
    if (!password) {
      setIsAuthed(false);
      sessionStorage.removeItem('cm_admin');
      setPassword('');
      return;
    }

    setIsLoading(true);
    try {
      const data = await invokeEdgeFunction<{
        profiles: ProfileRow[];
        quiz_responses: QuizResponseRow[];
        subscriptions: SubscriptionRow[];
      }>('admin-stats', { admin_password: password });

      setProfiles(data.profiles || []);
      setQuizResponses(data.quiz_responses || []);
      setSubscriptions(data.subscriptions || []);

      // Load secret codes
      loadSecretCodes();
    } catch (err) {
      toast.error('Erro ao carregar dados. Verifique sua senha.');
      setIsAuthed(false);
      sessionStorage.removeItem('cm_admin');
      setPassword('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      await invokeEdgeFunction('admin-stats', { admin_password: password });
      setIsAuthed(true);
      sessionStorage.setItem('cm_admin', 'true');
      sessionStorage.setItem('cm_admin_pw', password);
    } catch {
      toast.error('Senha incorreta');
    }
  };

  const handleLogout = () => {
    setIsAuthed(false);
    sessionStorage.removeItem('cm_admin');
    sessionStorage.removeItem('cm_admin_pw');
    setPassword('');
  };

  // ─── Secret Codes CRUD (via API) ────────────────────────────────
  const loadSecretCodes = async () => {
    try {
      const data = await adminFetch('', {}, password);
      setSecretCodes(data);
    } catch (err: any) {
      console.error('Failed to load secret codes:', err.message);
    }
  };

  const handleCreateCode = async () => {
    if (!newCode.code || !newCode.title) {
      toast.error('Código e título são obrigatórios');
      return;
    }
    const movieIds = newCode.movieIds
      .split(',')
      .map(s => parseInt(s.trim()))
      .filter(n => !isNaN(n));

    try {
      await adminFetch('', {
        method: 'POST',
        body: JSON.stringify({
          code: newCode.code.trim(),
          title: newCode.title.trim(),
          description: newCode.description.trim() || null,
          movie_ids: movieIds,
        }),
      }, password);
      toast.success(`Código "${newCode.code}" criado!`);
      setNewCode({ code: '', title: '', description: '', movieIds: '' });
      loadSecretCodes();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  const handleDeleteCode = async (id: string) => {
    setCodeActionLoading(id + '-delete');
    try {
      await adminFetch(`/${id}`, { method: 'DELETE' }, password);
      toast.success('Código deletado');
      loadSecretCodes();
    } catch (err: any) {
      toast.error(`Erro ao deletar: ${err.message}`);
    } finally {
      setCodeActionLoading(null);
    }
  };

  const handleToggleCode = async (id: string) => {
    setCodeActionLoading(id + '-toggle');
    try {
      await adminFetch(`/${id}/toggle`, { method: 'PATCH' }, password);
      toast.success('Status alterado');
      loadSecretCodes();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setCodeActionLoading(null);
    }
  };

  const startEditCode = (sc: SecretCode) => {
    setEditingCode(sc);
    setEditForm({
      code: sc.code,
      title: sc.title,
      description: sc.description || '',
      movieIds: sc.movie_ids?.join(', ') || '',
    });
  };

  const cancelEdit = () => {
    setEditingCode(null);
    setEditForm({ code: '', title: '', description: '', movieIds: '' });
  };

  const handleSaveEdit = async () => {
    if (!editingCode) return;
    if (!editForm.code || !editForm.title) {
      toast.error('Código e título são obrigatórios');
      return;
    }

    const movieIds = editForm.movieIds
      .split(',')
      .map(s => parseInt(s.trim()))
      .filter(n => !isNaN(n));

    setCodeActionLoading(editingCode.id + '-edit');
    try {
      await adminFetch(`/${editingCode.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          code: editForm.code.trim(),
          title: editForm.title.trim(),
          description: editForm.description.trim() || null,
          movie_ids: movieIds,
        }),
      }, password);
      toast.success('Código atualizado!');
      cancelEdit();
      loadSecretCodes();
    } catch (err: any) {
      toast.error(`Erro ao salvar: ${err.message}`);
    } finally {
      setCodeActionLoading(null);
    }
  };

  // ─── Computed metrics ───
  const totalProfiles = profiles.length;
  const totalQuizResponses = quizResponses.length;
  const completedQuizzes = quizResponses.filter(r => r.completed).length;
  const incompleteQuizzes = quizResponses.filter(r => !r.completed).length;
  const activeSubscriptions = subscriptions.filter(s => s.status === 'active' || s.status === 'trialing').length;
  const freeUsers = profiles.filter(p => !p.subscription_status || p.subscription_status === 'free').length;
  const proUsers = profiles.filter(p => p.subscription_status === 'pro' || p.subscription_status === 'active' || p.subscription_status === 'trialing').length;

  const funnelSteps = useCallback(() => {
    if (quizResponses.length === 0) return [];
    const stepCounts: Record<number, number> = {};
    quizResponses.forEach(r => {
      const step = r.last_step;
      stepCounts[step] = (stepCounts[step] || 0) + 1;
    });
    const maxStep = Math.max(...Object.keys(stepCounts).map(Number), 0);
    const steps = [];
    for (let i = 0; i <= maxStep; i++) {
      steps.push({
        step: i,
        label: i === 0 ? 'Início' : `Pergunta ${i}`,
        count: stepCounts[i] || 0,
      });
    }
    steps.push({
      step: maxStep + 1,
      label: 'Completou',
      count: completedQuizzes,
    });
    return steps;
  }, [quizResponses, completedQuizzes]);

  const profileDistribution = useCallback(() => {
    const counts: Record<string, number> = {};
    quizResponses.filter(r => r.completed && r.profile_type).forEach(r => {
      counts[r.profile_type!] = (counts[r.profile_type!] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([name, count]) => ({ name, count }));
  }, [quizResponses]);

  // ─── Auth screen ───
  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center selection:bg-purple-500/30">
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-purple-900/20 blur-[120px]" />
        </div>
        <div className="relative z-10 max-w-sm w-full mx-4">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <Film className="w-8 h-8 text-purple-500" />
              <span className="text-2xl font-bold">MrCine<span className="text-purple-500">PRO</span></span>
            </div>
            <h1 className="text-2xl font-bold mb-2">Dashboard Admin</h1>
            <p className="text-gray-400 text-sm">Insira a senha de administrador para acessar</p>
            <p className="text-gray-600 text-xs mt-1">A senha é solicitada a cada carregamento da página</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="relative mb-4">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="Senha de administrador"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 pr-10 text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500 transition-all"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              onClick={handleLogin}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition-all"
            >
              Entrar
            </button>
          </div>
          <button
            onClick={() => navigate('/')}
            className="mt-4 text-gray-500 hover:text-white text-sm flex items-center gap-1 mx-auto transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar ao site
          </button>
        </div>
      </div>
    );
  }

  // ─── Dashboard ───
  const tabs: { id: TabId; label: string; icon: any }[] = [
    { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
    { id: 'funnel', label: 'Funil', icon: TrendingUp },
    { id: 'responses', label: 'Respostas', icon: Mail },
    { id: 'profiles', label: 'Usuários', icon: Users },
    { id: 'codes', label: 'Códigos', icon: Key },
  ];

  const funnelData = funnelSteps();
  const profileDistData = profileDistribution();
  const maxFunnelCount = funnelData.length > 0 ? Math.max(...funnelData.map(f => f.count)) : 1;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-purple-500/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Film className="w-6 h-6 text-purple-500" />
            <span className="text-lg font-bold">MrCine<span className="text-purple-500">PRO</span> Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadAllData}
              disabled={isLoading}
              className="text-gray-400 hover:text-white p-2 rounded-lg transition-colors disabled:opacity-50"
              title="Atualizar dados"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-red-400 p-2 rounded-lg transition-colors flex items-center gap-1 text-sm"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
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
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* ─── OVERVIEW TAB ─── */}
        {activeTab === 'overview' && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <MetricCard icon={Users} label="Total Usuários" value={totalProfiles} color="purple" />
              <MetricCard icon={UserCheck} label="Quizzes Completos" value={completedQuizzes} color="green" />
              <MetricCard icon={UserX} label="Quizzes Incompletos" value={incompleteQuizzes} color="amber" />
              <MetricCard icon={TrendingUp} label="Assinaturas Ativas" value={activeSubscriptions} color="blue" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <MetricCard icon={Mail} label="E-mails Capturados" value={quizResponses.filter(r => r.email).length} color="pink" />
              <MetricCard icon={Phone} label="WhatsApp Capturados" value={quizResponses.filter(r => r.whatsapp).length} color="teal" />
              <MetricCard icon={Film} label="Usuários Free" value={freeUsers} color="gray" />
              <MetricCard icon={TrendingUp} label="Usuários Pro" value={proUsers} color="purple" />
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
              <h3 className="font-bold text-lg mb-4">Taxa de Conversão</h3>
              {totalQuizResponses > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <ConversionItem label="Quiz → Completou" value={totalQuizResponses > 0 ? ((completedQuizzes / totalQuizResponses) * 100).toFixed(1) : '0'} />
                  <ConversionItem label="Completou → Cadastro" value={completedQuizzes > 0 ? ((totalProfiles / completedQuizzes) * 100).toFixed(1) : '0'} />
                  <ConversionItem label="Cadastro → Assinatura" value={totalProfiles > 0 ? ((activeSubscriptions / totalProfiles) * 100).toFixed(1) : '0'} />
                </div>
              ) : (
                <p className="text-gray-500">Nenhuma resposta de quiz registrada ainda.</p>
              )}
            </div>

            {profileDistData.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="font-bold text-lg mb-4">Distribuição de Perfis</h3>
                <div className="space-y-3">
                  {profileDistData.map(({ name, count }) => (
                    <div key={name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-300">{name}</span>
                        <span className="text-purple-400 font-bold">{count}</span>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full transition-all" style={{ width: `${(count / Math.max(...profileDistData.map(d => d.count))) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── FUNNEL TAB ─── */}
        {activeTab === 'funnel' && (
          <div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="font-bold text-lg mb-6">Funil do Quiz — Drop-off por Etapa</h3>
              {funnelData.length > 0 ? (
                <div className="space-y-3">
                  {funnelData.map((step, i) => {
                    const prevCount = i > 0 ? funnelData[i - 1].count : step.count;
                    const dropOff = i > 0 && prevCount > 0 ? (((prevCount - step.count) / prevCount) * 100).toFixed(1) : null;
                    return (
                      <div key={step.step}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-300">{step.label}</span>
                            {dropOff !== null && Number(dropOff) > 0 && (
                              <span className="text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">-{dropOff}% drop-off</span>
                            )}
                          </div>
                          <span className="text-sm font-bold text-purple-400">{step.count} usuários</span>
                        </div>
                        <div className="h-8 bg-gray-800 rounded-lg overflow-hidden relative">
                          <div className="h-full bg-gradient-to-r from-purple-600 to-fuchsia-500 rounded-lg transition-all duration-500 flex items-center justify-end pr-3" style={{ width: `${(step.count / maxFunnelCount) * 100}%` }}>
                            {step.count > 0 && (step.count / maxFunnelCount) > 0.15 && (
                              <span className="text-xs font-bold text-white/80">{((step.count / maxFunnelCount) * 100).toFixed(0)}%</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500">Nenhuma resposta de quiz registrada ainda.</p>
              )}
            </div>
          </div>
        )}

        {/* ─── RESPONSES TAB ─── */}
        {activeTab === 'responses' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Respostas do Quiz ({quizResponses.length})</h3>
            </div>
            {quizResponses.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
                <Mail className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500">Nenhuma resposta registrada ainda.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {quizResponses.map(r => (
                  <div key={r.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <span className="font-bold text-sm">{r.name || 'Anônimo'}</span>
                      {r.email && <span className="text-xs bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full flex items-center gap-1"><Mail className="w-3 h-3" /> {r.email}</span>}
                      {r.whatsapp && <span className="text-xs bg-teal-500/10 text-teal-400 px-2 py-0.5 rounded-full flex items-center gap-1"><Phone className="w-3 h-3" /> {r.whatsapp}</span>}
                      {r.completed ? <span className="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full">Completou</span> : <span className="text-xs bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full">Parou na etapa {r.last_step}</span>}
                      {r.profile_type && <span className="text-xs bg-fuchsia-500/10 text-fuchsia-400 px-2 py-0.5 rounded-full">{r.profile_type}</span>}
                    </div>
                    {r.answers && (
                      <div className="mt-2 text-xs text-gray-500">
                        <details>
                          <summary className="cursor-pointer hover:text-gray-300 transition-colors">Ver respostas detalhadas</summary>
                          <pre className="mt-2 bg-black/30 rounded-lg p-3 overflow-x-auto text-gray-400">{JSON.stringify(r.answers, null, 2)}</pre>
                        </details>
                      </div>
                    )}
                    {r.created_at && <p className="text-[10px] text-gray-600 mt-2">{new Date(r.created_at).toLocaleString('pt-BR')}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── PROFILES TAB ─── */}
        {activeTab === 'profiles' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Usuários Cadastrados ({profiles.length})</h3>
            </div>
            {profiles.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
                <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500">Nenhum usuário cadastrado ainda.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-500">
                      <th className="text-left py-3 px-2 font-medium">Username</th>
                      <th className="text-left py-3 px-2 font-medium">Email</th>
                      <th className="text-center py-3 px-2 font-medium">XP</th>
                      <th className="text-center py-3 px-2 font-medium">Nível</th>
                      <th className="text-center py-3 px-2 font-medium">Plano</th>
                      <th className="text-left py-3 px-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map(p => (
                      <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-3 px-2 font-medium">{p.username || '—'}</td>
                        <td className="py-3 px-2 text-gray-400">{p.email || '—'}</td>
                        <td className="py-3 px-2 text-center text-purple-400 font-bold">{p.xp}</td>
                        <td className="py-3 px-2 text-center">
                          <span className="font-medium">{p.level}</span>
                          <span className="text-xs text-gray-500 block">
                            {(() => {
                              const lvl = LEVELS.find(l => l.level === p.level);
                              const league = getLeagueForLevel(p.level);
                              return lvl ? `${lvl.icon} ${lvl.name}` : '';
                            })()}
                          </span>
                          <span className="text-[10px] text-amber-500">
                            {getLeagueForLevel(p.level).icon} {getLeagueForLevel(p.level).name}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${p.subscription_plan === 'pro' || p.subscription_plan === 'quarterly' || p.subscription_plan === 'annual' ? 'bg-purple-500/10 text-purple-400' : 'bg-gray-500/10 text-gray-400'}`}>{p.subscription_plan || 'free'}</span>
                        </td>
                        <td className="py-3 px-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${p.subscription_status === 'active' || p.subscription_status === 'pro' || p.subscription_status === 'trialing' ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400'}`}>{p.subscription_status || 'free'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── SECRET CODES TAB ─── */}
        {activeTab === 'codes' && (
          <div className="space-y-6">
            {/* Create new code */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-400" />
                Criar Novo Código
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Código *</label>
                  <input type="text" value={newCode.code} onChange={e => setNewCode(prev => ({ ...prev, code: e.target.value }))} placeholder="ex: 99, HORROR2024, NATAL" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Título *</label>
                  <input type="text" value={newCode.title} onChange={e => setNewCode(prev => ({ ...prev, title: e.target.value }))} placeholder="ex: 5 Filmes de Terror Secretos" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-400 mb-1">Descrição</label>
                  <input type="text" value={newCode.description} onChange={e => setNewCode(prev => ({ ...prev, description: e.target.value }))} placeholder="Descrição opcional que aparece no card" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-400 mb-1">IDs dos Filmes (TMDB) *</label>
                  <input type="text" value={newCode.movieIds} onChange={e => setNewCode(prev => ({ ...prev, movieIds: e.target.value }))} placeholder="IDs separados por vírgula, ex: 574475, 414429, 447365" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50" />
                  <p className="text-xs text-gray-600 mt-1">Encontre o ID no TMDB: themoviedb.org/movie/[ID]</p>
                </div>
              </div>
              <button onClick={handleCreateCode} disabled={!newCode.code || !newCode.title} className="mt-4 px-6 py-2 bg-purple-600 rounded-lg font-medium hover:bg-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Criar Código
              </button>
            </div>

            {/* Edit modal/panel */}
            {editingCode && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <Pencil className="w-5 h-5 text-purple-400" />
                      Editar Código
                    </h3>
                    <button onClick={cancelEdit} className="text-gray-500 hover:text-white p-1 rounded-lg transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Código *</label>
                      <input type="text" value={editForm.code} onChange={e => setEditForm(prev => ({ ...prev, code: e.target.value }))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500/50" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Título *</label>
                      <input type="text" value={editForm.title} onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500/50" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Descrição</label>
                      <input type="text" value={editForm.description} onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500/50" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">IDs dos Filmes (TMDB)</label>
                      <input type="text" value={editForm.movieIds} onChange={e => setEditForm(prev => ({ ...prev, movieIds: e.target.value }))} placeholder="IDs separados por vírgula" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50" />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button onClick={cancelEdit} className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg font-medium hover:bg-white/10 transition-colors">
                      Cancelar
                    </button>
                    <button onClick={handleSaveEdit} disabled={codeActionLoading === editingCode.id + '-edit'} className="flex-1 px-4 py-2.5 bg-purple-600 rounded-lg font-medium hover:bg-purple-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                      {codeActionLoading === editingCode.id + '-edit' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Salvar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Existing codes */}
            <div>
              <h3 className="font-bold text-lg mb-4">Códigos Cadastrados ({secretCodes.length})</h3>
              {secretCodes.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
                  <Key className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500">Nenhum código cadastrado ainda.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {secretCodes.map(sc => {
                    const isToggleLoading = codeActionLoading === sc.id + '-toggle';
                    const isDeleteLoading = codeActionLoading === sc.id + '-delete';
                    return (
                      <div key={sc.id} className={`bg-white/5 border rounded-xl p-4 ${sc.is_active ? 'border-white/10' : 'border-red-500/20 opacity-60'}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <code className="bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded text-sm font-mono">{sc.code}</code>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${sc.is_active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                {sc.is_active ? 'Ativo' : 'Inativo'}
                              </span>
                            </div>
                            <h4 className="font-medium">{sc.title}</h4>
                            {sc.description && <p className="text-sm text-gray-400 mt-0.5">{sc.description}</p>}
                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                              <Film className="w-3 h-3" />
                              <span>{sc.movie_ids?.length || 0} filmes</span>
                              {sc.movie_ids?.length > 0 && <span className="text-gray-600">({sc.movie_ids.join(', ')})</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => startEditCode(sc)}
                              className="px-3 py-1.5 text-xs rounded-lg transition-colors bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 flex items-center gap-1"
                              title="Editar"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              Editar
                            </button>
                            <button
                              onClick={() => handleToggleCode(sc.id)}
                              disabled={isToggleLoading}
                              className={`px-3 py-1.5 text-xs rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1 ${
                                sc.is_active
                                  ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20'
                                  : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                              }`}
                            >
                              {isToggleLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                              {sc.is_active ? 'Desativar' : 'Ativar'}
                            </button>
                            <button
                              onClick={() => { if (confirm('Deletar este código?')) handleDeleteCode(sc.id); }}
                              disabled={isDeleteLoading}
                              className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                              title="Deletar"
                            >
                              {isDeleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Sub-components ───

function MetricCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    purple: 'from-purple-500/20 to-purple-900/10 border-purple-500/20 text-purple-400',
    green: 'from-green-500/20 to-green-900/10 border-green-500/20 text-green-400',
    amber: 'from-amber-500/20 to-amber-900/10 border-amber-500/20 text-amber-400',
    blue: 'from-blue-500/20 to-blue-900/10 border-blue-500/20 text-blue-400',
    pink: 'from-pink-500/20 to-pink-900/10 border-pink-500/20 text-pink-400',
    teal: 'from-teal-500/20 to-teal-900/10 border-teal-500/20 text-teal-400',
    gray: 'from-gray-500/20 to-gray-900/10 border-gray-500/20 text-gray-400',
  };
  const iconColorMap: Record<string, string> = {
    purple: 'text-purple-400 bg-purple-500/10',
    green: 'text-green-400 bg-green-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
    blue: 'text-blue-400 bg-blue-500/10',
    pink: 'text-pink-400 bg-pink-500/10',
    teal: 'text-teal-400 bg-teal-500/10',
    gray: 'text-gray-400 bg-gray-500/10',
  };

  return (
    <div className={`bg-gradient-to-br ${colorMap[color] || colorMap.purple} border rounded-2xl p-4`}>
      <div className={`w-9 h-9 rounded-xl ${iconColorMap[color] || iconColorMap.purple} flex items-center justify-center mb-3`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}

function ConversionItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-500">{value}%</p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  );
}
