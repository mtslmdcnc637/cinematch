import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { fetchMovieById } from '../services/tmdbService';
import { toast } from 'sonner';
import { Film, Search, Sparkles, ArrowRight, Star, Calendar, Loader2, Lock, ChevronRight } from 'lucide-react';

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

export default function DicaPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [secretCode, setSecretCode] = useState<SecretCode | null>(null);
  const [movies, setMovies] = useState<MovieData[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set());

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
      // Query secret code from Supabase (public read via RLS)
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

      // Fetch movie details from TMDB
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

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-full px-4 py-1.5 mb-6">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-purple-300">Dicas Secretas</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              Desbloqueie Dicas
            </span>
            <br />
            de Filmes
          </h1>
          <p className="text-gray-400 text-lg">
            Digite o código secreto para revelar recomendações exclusivas
          </p>
        </div>

        {/* Code Input */}
        <form onSubmit={handleSubmit} className="mb-10">
          <div className="relative flex gap-3">
            <div className="relative flex-1">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Digite o código secreto..."
                className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all text-lg"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !code.trim()}
              className="px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-semibold hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
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

        {/* Not Found */}
        {notFound && (
          <div className="text-center py-12 bg-white/5 border border-white/10 rounded-2xl">
            <div className="text-5xl mb-4">🔒</div>
            <h3 className="text-xl font-semibold text-gray-300 mb-2">Código não encontrado</h3>
            <p className="text-gray-500">Verifique o código e tente novamente</p>
          </div>
        )}

        {/* Results */}
        {secretCode && (
          <div className="space-y-6">
            {/* Code Header */}
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

            {/* Movie Cards */}
            <div className="space-y-4">
              {movies.map((movie, index) => (
                <div
                  key={movie.id}
                  className="group bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-purple-500/30 transition-all duration-300"
                >
                  <div className="flex gap-4 p-4">
                    {/* Poster */}
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

                    {/* Info */}
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
                              {movie.vote_average.toFixed(1)}
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

            {/* CTA */}
            <div className="bg-gradient-to-r from-purple-600/10 to-pink-600/10 border border-purple-500/20 rounded-2xl p-6 text-center">
              <Sparkles className="w-8 h-8 text-purple-400 mx-auto mb-3" />
              <h3 className="text-xl font-bold mb-2">Quer dicas personalizadas?</h3>
              <p className="text-gray-400 mb-4">
                Crie sua conta grátis e receba recomendações baseadas no seu gosto
              </p>
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-semibold hover:from-purple-500 hover:to-pink-500 transition-all"
              >
                Criar conta grátis
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Footer hint */}
        <div className="text-center mt-12 text-gray-600 text-sm">
          <p>Siga <span className="text-purple-400">@mrcine</span> nas redes sociais para pegar novos códigos</p>
        </div>
      </div>
    </div>
  );
}
