export const TMDB_API_BASE = 'https://api.themoviedb.org/3';
export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

export const GENRES = [
  { id: 28, name: 'Ação' },
  { id: 35, name: 'Comédia' },
  { id: 18, name: 'Drama' },
  { id: 27, name: 'Terror' },
  { id: 878, name: 'Ficção Científica' },
  { id: 10749, name: 'Romance' },
  { id: 16, name: 'Animação' },
  { id: 99, name: 'Documentário' },
  { id: 53, name: 'Suspense' },
  { id: 14, name: 'Fantasia' },
];

export const LEVELS = [
  { level: 1, name: 'Novato', xpRequired: 0, icon: '🌱', color: 'from-gray-500 to-gray-400' },
  { level: 2, name: 'Pipoca de Microondas', xpRequired: 50, icon: '🍿', color: 'from-yellow-500 to-amber-400' },
  { level: 3, name: 'Espectador Casual', xpRequired: 150, icon: '🛋️', color: 'from-blue-500 to-cyan-400' },
  { level: 4, name: 'Amante da Sétima Arte', xpRequired: 300, icon: '🎫', color: 'from-emerald-500 to-green-400' },
  { level: 5, name: 'Crítico de Sofá', xpRequired: 500, icon: '🧐', color: 'from-purple-500 to-violet-400' },
  { level: 6, name: 'Cinéfilo de Carteirinha', xpRequired: 800, icon: '🎬', color: 'from-pink-500 to-rose-400' },
  { level: 7, name: 'Roteirista Amador', xpRequired: 1200, icon: '✍️', color: 'from-orange-500 to-red-400' },
  { level: 8, name: 'Diretor Visionário', xpRequired: 1700, icon: '🎥', color: 'from-indigo-500 to-blue-600' },
  { level: 9, name: 'Lenda de Hollywood', xpRequired: 2500, icon: '⭐', color: 'from-yellow-400 to-yellow-200' },
  { level: 10, name: 'Entidade Cósmica', xpRequired: 3500, icon: '🌌', color: 'from-fuchsia-600 to-purple-900' },
];
