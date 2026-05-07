import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { fetchMovieById } from '../services/tmdbService';
import { toast } from 'sonner';
import { Film, Search, Sparkles, ArrowRight, Star, Calendar, Loader2, Lock, ChevronRight, Zap, Users, Trophy, MessageCircle, Shield, Eye, TrendingUp, Heart, CheckCircle2, X } from 'lucide-react';

interface SecretCode {
  id: string;
  code: string;
  title: string;
  description: string | null;
  movie_ids: number[];
}

interface MovieData {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
  overview: string;
  vote_average: number;
  genre_ids: number[];
}

const GENRE_MAP: Record<number, string> = {
  28: 'Ação', 12: 'Aventura', 16: 'Animação', 35: 'Comédia', 80: 'Crime',
  99: 'Documentário', 18: 'Drama', 10751: 'Família', 14: 'Fantasia', 36: 'História',
  27: 'Terror', 10402: 'Musical', 9648: 'Mistério', 10749: 'Romance',
  878: 'Ficção Científica', 10770: 'Cinema TV', 53: 'Thriller', 10752: 'Guerra', 37: 'Faroeste',
};

// Social proof ticker messages
const TICKER_MESSAGES = [
  { name: 'Lucas M.', action: 'desbloqueou dicas de Terror', time: '2 min' },
  { name: 'Ana C.', action: 'recebeu 5 recomendações exclusivas', time: '5 min' },
  { name: 'Pedro R.', action: 'descobriu filmes de Comédia', time: '8 min' },
  { name: 'Juliana S.', action: 'ativou dicas de Ficção Científica', time: '12 min' },
  { name: 'Rafael L.', action: 'desbloqueou dicas de Drama', time: '15 min' },
];

// PMS Pain cards
const PMS_CARDS = [
  {
    mito: '"Eu consigo achar bons filmes sozinho no Netflix"',
    dor: 'Mas você já passou 40 min scrollando e acabou vendo nada? O algoritmo da plataforma mostra o que ELES querem, não o que VOCÊ precisa.',
    solucao: 'O MrCine analisa seu gosto pessoal e entrega recomendações cirúrgicas — sem perder tempo.',
    icon: Search,
  },
  {
    mito: '"Recomendações de IA são genéricas e frias"',
    dor: 'A maioria é. Mas quando a IA entende que você amou "Interestelar" e odiou "Gravidade", ela para de chutar e começa a acertar.',
    solucao: 'Cada avaliação treina seu perfil. Quanto mais usa, mais preciso fica — como um sommelier de cinema que aprende seu paladar.',
    icon: Zap,
  },
  {
    mito: '"Outro app de filmes? Já tenho Letterboxd"',
    dor: 'Letterboxd é um diário. Ótimo para registrar, péssimo para descobrir. Você precisa de indicações personalizadas, não de reviews de desconhecidos.',
    solucao: 'O MrCine é o motor de recomendação. Você avalia, ele descobre. E ainda encontra o filme que agrada TODO mundo no grupo.',
    icon: Users,
  },
];

// Value Prism cards
const VALUE_PRISM = [
  {
    icon: Zap,
    title: 'Recomendações Cirúrgicas',
    desc: 'IA que aprende seu gosto pessoal com cada avaliação. Sem genéricas, sem achismos.',
  },
  {
    icon: Users,
    title: 'Oráculo para Grupos',
    desc: 'Seleciona os amigos e a IA encontra o filme perfeito que agrada todo mundo. Acabou a briga.',
  },
  {
    icon: Trophy,
    title: 'Gamificação Viciante',
    desc: '30 níveis, 5 ligas, multiplicadores de XP. Avaliar filmes nunca foi tão recompensador.',
  },
  {
    icon: Eye,
    title: 'Onde Assistir na Hora',
    desc: 'Veja em qual streaming o filme está disponível. Sem buscar, sem adivinhar.',
  },
];

// Social proof testimonials
const TESTIMONIALS = [
  {
    name: 'Mariana T.',
    role: 'Cinéfila casual',
    text: '"Eu e meu namorado nunca conseguíamos escolher filme. Agora o Oráculo resolve em 10 segundos. Sério, mudou nossa noite de filme."',
    rating: 5,
  },
  {
    name: 'Lucas F.',
    role: 'Crítico amador',
    text: '"Já usei Letterboxd, IMDb, tudo. Nada me recomenda como o MrCine. Ele sabe que eu gosto de filme denso e odeio comédia romântica."',
    rating: 5,
  },
  {
    name: 'Rafael C.',
    role: 'Desenvolvedor',
    text: '"Achei que seria mais um app genérico, mas o sistema de ligas me viciou. Tô no nível 12 e não quero parar de avaliar."',
    rating: 4,
  },
];

// MOHT Objections
const OBJECTIONS = [
  {
    objection: '"É de graça? Deve ser fraco então"',
    response: 'O quiz é 100% gratuito e já entrega recomendações reais. O plano Pro libera dicas diárias, oráculo para grupos e badges exclusivos — mas o core funciona sem pagar nada.',
    icon: Shield,
  },
  {
    objection: '"Mais um app que vou usar 1 vez e esquecer"',
    response: 'O sistema de ligas e XP foi feito pra manter você engajado. Cada avaliação te leva mais longe. E as dicas diárias sempre trazem algo novo pra assistir.',
    icon: TrendingUp,
  },
  {
    objection: '"Não quero criar outra conta"',
    response: 'Login com Google em 1 clique. Sem formulário, sem verificação de email, sem frescura. Em 5 segundos você já está dentro.',
    icon: Zap,
  },
];

// Antes/Depois comparison
const ANTES_DEPOIS = {
  antes: [
    '40 minutos scrollando Netflix sem escolher nada',
    'Briga com o parceiro sobre qual filme assistir',
    'Recomendações genéricas que não combinam com você',
    'Reviews de desconhecidos que não ajudam em nada',
  ],
  depois: [
    'Recomendações cirúrgicas em 10 segundos',
    'Oráculo de IA encontra o filme que agrada todo mundo',
    'Cada avaliação treina seu perfil pessoal',
    'Badges, ligas e XP enquanto descobre filmes',
  ],
};

export default function DicaPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [secretCode, setSecretCode] = useState<SecretCode | null>(null);
  const [movies, setMovies] = useState<MovieData[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set());
  const [tickerIndex, setTickerIndex] = useState(0);
  const [showTicker, setShowTicker] = useState(true);

  // Social proof ticker rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setShowTicker(false);
      setTimeout(() => {
        setTickerIndex((prev) => (prev + 1) % TICKER_MESSAGES.length);
        setShowTicker(true);
      }, 400);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setNotFound(false);
    setSecretCode(null);
    setMovies([]);
    setImgErrors(new Set());

    try {
      const { data, error } = await supabase!
        .from('secret_codes')
        .select('id, code, title, description, movie_ids')
        .eq('code', trimmed)
        .maybeSingle();

      if (error || !data) {
        setNotFound(true);
        return;
      }

      setSecretCode(data);

      if (data.movie_ids && data.movie_ids.length > 0) {
        const moviePromises = data.movie_ids.map(async (id: number) => {
          try {
            const movie = await fetchMovieById(id) as any;
            return movie as MovieData;
          } catch {
            return null;
          }
        });
        const results = await Promise.all(moviePromises);
        setMovies(results.filter((m): m is MovieData => m !== null && !!m.title));
      }
    } catch {
      toast.error('Erro ao buscar dicas. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImgError = (movieId: number) => {
    setImgErrors(prev => new Set(prev).add(movieId));
  };

  return (
    <div className="min-h-screen bg-[#030303] text-white font-sans">
      {/* Background effects */}
      <div className="glow-orb glow-orb-1" />
      <div className="glow-orb glow-orb-2" />
      <div className="fixed inset-0 bg-[url('/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay" />

      {/* ── SECTION 1: PAS Hook ── */}
      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-8 pb-4">
        {/* Social Proof Ticker */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-purple-600/10 backdrop-blur-md border-b border-purple-500/20">
          <div className="max-w-2xl mx-auto px-4 py-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <div className={`transition-all duration-300 ${showTicker ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
              <span className="text-xs text-gray-300">
                <span className="text-purple-300 font-medium">{TICKER_MESSAGES[tickerIndex].name}</span>{' '}
                {TICKER_MESSAGES[tickerIndex].action}
                <span className="text-gray-500 ml-1">• {TICKER_MESSAGES[tickerIndex].time} atrás</span>
              </span>
            </div>
          </div>
        </div>

        {/* PAS Pain */}
        <div className="text-center mb-6 pt-8">
          <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-full px-4 py-1.5 mb-6">
            <span className="text-sm text-red-300">Já passou 40 minutos escolhendo filme?</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            Sua próxima noite de filme
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              não precisa ser um fracasso
            </span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-lg mx-auto">
            Você scrolla, discute, desiste e vê qualquer coisa. O MrCine usa IA para
            encontrar o filme <strong className="text-white">perfeito pro seu gosto</strong> — em 10 segundos.
          </p>
        </div>
      </div>

      {/* ── SECTION 2: Code Input ── */}
      <div className="relative z-10 max-w-2xl mx-auto px-4 pb-8">
        <div className="bg-white/5 border border-purple-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-300">Tem um código secreto?</span>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="relative flex gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Digite o código secreto..."
                  className="w-full pl-4 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all text-lg"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !code.trim()}
                className="px-6 py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-semibold hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
                <span className="hidden sm:inline">Revelar</span>
              </button>
            </div>
          </form>

          {/* Not Found + Quiz Fallback CTA */}
          {notFound && (
            <div className="text-center py-8 mt-4">
              <div className="text-4xl mb-3">🤔</div>
              <h3 className="text-lg font-semibold text-gray-200 mb-2">Código não encontrado</h3>
              <p className="text-gray-500 text-sm mb-4">Mas calma — você ainda pode descobrir filmes perfeitos pro seu gosto:</p>
              <button
                onClick={() => window.open('https://quiz.mrcine.pro', '_blank')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-semibold text-sm hover:from-purple-500 hover:to-pink-500 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                Fazer o Quiz e descobrir
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Results */}
        {secretCode && (
          <div className="space-y-4 mt-6">
            <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/20 rounded-2xl p-6">
              <h2 className="text-2xl font-bold mb-2">{secretCode.title}</h2>
              {secretCode.description && (
                <p className="text-gray-300">{secretCode.description}</p>
              )}
              <div className="flex items-center gap-2 mt-3 text-sm text-purple-300">
                <Film className="w-4 h-4" />
                <span>{movies.length} filme{movies.length !== 1 ? 's' : ''} recomendado{movies.length !== 1 ? 's' : ''}</span>
              </div>
            </div>

            <div className="space-y-3">
              {movies.map((movie, index) => (
                <div
                  key={movie.id}
                  className="group bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-purple-500/30 transition-all duration-300"
                >
                  <div className="flex gap-4 p-4">
                    <div className="shrink-0 w-24 h-36 rounded-lg overflow-hidden bg-white/5">
                      {movie.poster_path && !imgErrors.has(movie.id) ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w300${movie.poster_path}`}
                          alt={movie.title}
                          className="w-full h-full object-cover"
                          onError={() => handleImgError(movie.id)}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film className="w-8 h-8 text-gray-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs text-purple-400 font-medium">#{index + 1}</span>
                          <h3 className="text-lg font-semibold leading-tight">{movie.title}</h3>
                        </div>
                        {movie.vote_average > 0 && (
                          <div className="flex items-center gap-1 shrink-0 bg-yellow-500/10 px-2 py-0.5 rounded-full">
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            <span className="text-xs text-yellow-300 font-medium">
                              {(movie.vote_average ?? 0).toFixed(1)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        {movie.release_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {movie.release_date.slice(0, 4)}
                          </span>
                        )}
                        {movie.genre_ids?.slice(0, 3).map(id => (
                          <span key={id} className="bg-white/5 px-1.5 py-0.5 rounded">
                            {GENRE_MAP[id] || ''}
                          </span>
                        ))}
                      </div>
                      <p className="text-sm text-gray-400 mt-2 line-clamp-2">
                        {movie.overview || 'Sem descrição disponível.'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── SECTION 3: Hook Intercalado ── */}
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-10">
        <div className="text-center">
          <p className="text-gray-500 text-sm mb-2">Não tem código? Sem problema.</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Descubra o que{' '}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              você realmente gosta
            </span>
          </h2>
          <p className="text-gray-400 text-lg max-w-md mx-auto">
            7 perguntas. 10 segundos cada. E o MrCine já sabe exatamente o que recomendar pra você.
          </p>
        </div>
      </div>

      {/* ── SECTION 4: PMS Cards (Mito → Dor → Solução) ── */}
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-center mb-8">
          Você pode estar pensando...
        </h2>
        <div className="space-y-4">
          {PMS_CARDS.map((card, i) => {
            const Icon = card.icon;
            return (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="p-5">
                  {/* Mito */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <X className="w-4 h-4 text-red-400" />
                    </div>
                    <p className="text-gray-300 text-sm font-medium">{card.mito}</p>
                  </div>
                  {/* Dor */}
                  <div className="flex items-start gap-3 mb-3 ml-11">
                    <p className="text-red-300/80 text-sm">{card.dor}</p>
                  </div>
                  {/* Solução */}
                  <div className="flex items-start gap-3 ml-4 bg-purple-500/5 -mx-2 px-4 py-3 rounded-xl border border-purple-500/10">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-purple-400" />
                    </div>
                    <p className="text-purple-200 text-sm font-medium">{card.solucao}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SECTION 5: Value Prism ── */}
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            Tudo que o MrCine faz por você
          </h2>
          <p className="text-gray-400">Mais do que recomendar — ele transforma como você descobre cinema.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {VALUE_PRISM.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-purple-500/30 transition-all duration-300">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                <p className="text-sm text-gray-400">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SECTION 6: Social Proof Testimonials ── */}
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-center mb-8">
          Quem usa, aprova
        </h2>
        <div className="space-y-4">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-sm">
                  {t.name[0]}
                </div>
                <div>
                  <p className="font-medium text-white text-sm">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.role}</p>
                </div>
                <div className="ml-auto flex gap-0.5">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed italic">{t.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION 7: MOHT Objections ── */}
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-center mb-2">
          Ainda em dúvida?
        </h2>
        <p className="text-gray-500 text-center text-sm mb-8">Tira essas da cabeça agora:</p>
        <div className="space-y-4">
          {OBJECTIONS.map((obj, i) => {
            const Icon = obj.icon;
            return (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                    <span className="text-sm">🤨</span>
                  </div>
                  <p className="text-gray-300 font-medium text-sm">{obj.objection}</p>
                </div>
                <div className="flex items-start gap-3 ml-11">
                  <Icon className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                  <p className="text-green-300/80 text-sm">{obj.response}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SECTION 8: Exclusive Empowerment CTA ── */}
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-10">
        <div className="relative bg-gradient-to-br from-purple-600/20 via-pink-600/10 to-purple-600/20 border border-purple-500/30 rounded-[2rem] p-8 text-center overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.15),transparent_70%)]" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-full px-4 py-1.5 mb-6">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-purple-300 font-medium">Acesso antecipado</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Só quem entra agora
              <br />
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                ganha acesso VIP
              </span>
            </h2>
            <p className="text-gray-300 mb-6 max-w-md mx-auto">
              Os primeiros usuários ganham badge exclusivo, multiplicador de XP 1.5x permanente
              e dicas diárias gratuitas por 30 dias. Depois, só no Pro.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => window.open('https://quiz.mrcine.pro', '_blank')}
                className="group relative inline-flex items-center justify-center gap-3 bg-white text-black px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.3)]"
              >
                <Sparkles className="w-5 h-5" />
                Descobrir meus filmes
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
              >
                Já tenho conta
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 9: Antes/Depois ── */}
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8 pb-16">
        <h2 className="text-2xl font-bold text-center mb-8">
          Antes vs. Depois do MrCine
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Antes */}
          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5">
            <h3 className="font-semibold text-red-300 mb-4 flex items-center gap-2">
              <X className="w-4 h-4" /> Sem o MrCine
            </h3>
            <ul className="space-y-3">
              {ANTES_DEPOIS.antes.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                  <span className="text-red-400 mt-0.5">✗</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          {/* Depois */}
          <div className="bg-purple-500/5 border border-purple-500/20 rounded-2xl p-5">
            <h3 className="font-semibold text-purple-300 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Com o MrCine
            </h3>
            <ul className="space-y-3">
              {ANTES_DEPOIS.depois.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-purple-400 mt-0.5">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center mt-10">
          <button
            onClick={() => window.open('https://quiz.mrcine.pro', '_blank')}
            className="group relative inline-flex items-center justify-center gap-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-10 py-5 rounded-full font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(168,85,247,0.4)]"
          >
            <Sparkles className="w-5 h-5" />
            Quero descobrir meus filmes agora
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <p className="text-gray-600 text-xs mt-4">Gratuito • 7 perguntas • Resultado na hora</p>
        </div>
      </div>
    </div>
  );
}
