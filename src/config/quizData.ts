import { Brain, Target, Zap, Heart, Clock, Star, Film, Tv, Coffee, Moon, TrendingUp, ShieldCheck } from 'lucide-react';

export const QUIZ_PHASES = [
  { id: 1, label: 'PERFIL' },
  { id: 2, label: 'HÁBITOS' },
  { id: 3, label: 'DESAFIOS' },
  { id: 4, label: 'PERSONALIDADE' },
  { id: 5, label: 'CAPTURA' }
];

export const QUIZ_QUESTIONS = [
  // FASE 1: PERFIL
  {
    id: 'goal',
    phase: 1,
    title: 'Qual é o seu principal objetivo ao assistir algo?',
    type: 'single',
    options: [
      { id: 'relax', label: 'Relaxar e desligar a mente', icon: 'Coffee' },
      { id: 'learn', label: 'Aprender e expandir horizontes', icon: 'Brain' },
      { id: 'feel', label: 'Me emocionar profundamente', icon: 'Heart' },
      { id: 'distract', label: 'Pura adrenalina e diversão', icon: 'Zap' }
    ]
  },
  {
    id: 'genres',
    phase: 1,
    title: 'Quais são seus gêneros favoritos?',
    subtitle: 'Selecione pelo menos 2 opções',
    type: 'multiple',
    min: 2,
    options: [
      { id: 'action', label: 'Ação & Aventura' },
      { id: 'scifi', label: 'Ficção Científica' },
      { id: 'drama', label: 'Drama' },
      { id: 'comedy', label: 'Comédia' },
      { id: 'thriller', label: 'Suspense & Terror' },
      { id: 'doc', label: 'Documentários' },
      { id: 'romance', label: 'Romance' }
    ]
  },
  {
    id: 'era',
    phase: 1,
    title: 'Qual época de filmes mais te atrai?',
    type: 'single',
    options: [
      { id: 'new', label: 'Lançamentos (Últimos 3 anos)' },
      { id: '2000s', label: 'Anos 2000 a 2010' },
      { id: 'classics', label: 'Clássicos (Antes de 2000)' },
      { id: 'any', label: 'Sou eclético(a), a época não importa' }
    ]
  },
  {
    id: 'format',
    phase: 1,
    title: 'O que você prefere maratonar?',
    type: 'single',
    options: [
      { id: 'movies', label: 'Apenas Filmes (Início, meio e fim rápidos)' },
      { id: 'series', label: 'Apenas Séries (Histórias longas)' },
      { id: 'both', label: 'Ambos, depende do meu humor' }
    ]
  },

  // FASE 2: HÁBITOS
  {
    id: 'frequency',
    phase: 2,
    title: 'Com que frequência você assiste filmes ou séries?',
    type: 'single',
    options: [
      { id: 'daily', label: 'Todos os dias' },
      { id: 'weekends', label: 'Apenas nos finais de semana' },
      { id: 'rarely', label: 'Raramente, quando tenho tempo' }
    ]
  },
  {
    id: 'company',
    phase: 2,
    title: 'Com quem você costuma assistir?',
    type: 'single',
    options: [
      { id: 'alone', label: 'Sozinho(a) (Meu momento)' },
      { id: 'partner', label: 'Com meu parceiro(a)' },
      { id: 'family', label: 'Com a família/filhos' },
      { id: 'friends', label: 'Com amigos' }
    ]
  },
  {
    id: 'streamings',
    phase: 2,
    title: 'Quais streamings você assina?',
    subtitle: 'Selecione todos que você tem acesso',
    type: 'multiple',
    min: 1,
    options: [
      { id: 'netflix', label: 'Netflix' },
      { id: 'prime', label: 'Prime Video' },
      { id: 'max', label: 'Max (HBO)' },
      { id: 'disney', label: 'Disney+ / Star+' },
      { id: 'apple', label: 'Apple TV+' },
      { id: 'other', label: 'Outros / Alternativos' }
    ]
  },
  {
    id: 'time',
    phase: 2,
    title: 'Qual é o seu horário favorito para assistir?',
    type: 'single',
    options: [
      { id: 'morning', label: 'Manhã / Tarde' },
      { id: 'night', label: 'Noite (Após o trabalho)' },
      { id: 'latenight', label: 'Madrugada (Coruja)' }
    ]
  },

  // FASE 3: DESAFIOS
  {
    id: 'struggle',
    phase: 3,
    title: 'Qual é a sua maior frustração hoje?',
    type: 'single',
    options: [
      { id: 'time_lost', label: 'Perco 40 minutos escolhendo o que ver' },
      { id: 'where', label: 'Nunca sei em qual streaming o filme está' },
      { id: 'sleep', label: 'Durmo no meio porque escolhi um filme chato' },
      { id: 'forget', label: 'Esqueço os filmes que me recomendaram' }
    ]
  },
  {
    id: 'annoyance',
    phase: 3,
    title: 'O que mais te irrita em plataformas de streaming?',
    type: 'single',
    options: [
      { id: 'bad_algo', label: 'O algoritmo só me recomenda as mesmas coisas' },
      { id: 'interface', label: 'A interface é confusa e lenta' },
      { id: 'spoilers', label: 'Tomar spoilers antes de assistir' },
      { id: 'cancel', label: 'Cancelarem minhas séries favoritas' }
    ]
  },
  {
    id: 'decision',
    phase: 3,
    title: 'Quando você não sabe o que assistir, o que acontece?',
    type: 'single',
    options: [
      { id: 'paralyzed', label: 'Fico paralisado(a) rolando o catálogo por minutos' },
      { id: 'random', label: 'Escolho qualquer um e torço para ser bom' },
      { id: 'ask', label: 'Pergunto para alguém o que está assistindo' },
      { id: 'revisit', label: 'Acabo reassistindo algo que já vi' }
    ]
  },

  // FASE 4: PERSONALIDADE
  {
    id: 'recommendations',
    phase: 4,
    title: 'Como você lida com recomendações de amigos?',
    type: 'single',
    options: [
      { id: 'trust', label: 'Assisto de olhos fechados' },
      { id: 'research', label: 'Pesquiso a nota e o trailer antes' },
      { id: 'ignore', label: 'Anoto, mas acabo nunca assistindo' }
    ]
  },
  {
    id: 'plot_twists',
    phase: 4,
    title: 'Qual é a sua relação com "Plot Twists" (Finais Surpresa)?',
    type: 'single',
    options: [
      { id: 'love', label: 'Amo! Quanto mais confuso, melhor' },
      { id: 'hate', label: 'Odeio, prefiro histórias lineares e claras' },
      { id: 'depends', label: 'Gosto, desde que faça sentido na história' }
    ]
  },
  {
    id: 'rewatch',
    phase: 4,
    title: 'Como você se sente sobre reassistir filmes?',
    type: 'single',
    options: [
      { id: 'always', label: 'Adoro! Sempre descubro detalhes novos' },
      { id: 'never', label: 'Nunca reassisto, a vida é curta demais' },
      { id: 'comfort', label: 'Reassisto meus favoritos quando preciso de conforto' },
      { id: 'rarely', label: 'Raramente, só se passou muito tempo' }
    ]
  },

  // FASE 5: CAPTURA
  {
    id: 'name',
    phase: 5,
    title: 'Como podemos te chamar?',
    subtitle: 'Para personalizarmos o seu Perfil Cinematográfico.',
    type: 'input',
    placeholder: 'Seu primeiro nome'
  },
  {
    id: 'email',
    phase: 5,
    title: 'Para onde devemos enviar o seu resultado?',
    subtitle: 'Fique tranquilo, odiamos spam tanto quanto você.',
    type: 'input',
    placeholder: 'seu.melhor@email.com'
  },
  {
    id: 'whatsapp',
    phase: 5,
    title: 'Qual seu WhatsApp?',
    subtitle: 'Opcional. Enviaremos novidades e dicas de filmes por lá.',
    type: 'input',
    placeholder: '(11) 99999-9999',
    inputType: 'tel'
  }
];

export const LOADING_TEXTS = [
  "Analisando suas preferências de gênero...",
  "Cruzando dados com milhares de filmes...",
  "Mapeando seus hábitos de consumo...",
  "Calculando seu Perfil Cinematográfico...",
  "Gerando seu algoritmo personalizado..."
];

export const RESULT_BENEFITS = [
  {
    title: "Economize Tempo",
    desc: "Pare de rolar catálogos por 40 minutos. Receba a indicação certa em 5 segundos.",
    icon: "Clock"
  },
  {
    title: "Match Perfeito",
    desc: "Recomendações baseadas no seu humor e companhia do dia.",
    icon: "Target"
  },
  {
    title: "Onde Assistir",
    desc: "Saiba instantaneamente em qual dos seus streamings o filme está.",
    icon: "Tv"
  },
  {
    title: "Sem Frustrações",
    desc: "Chega de filmes ruins. Assista apenas o que tem alta probabilidade de você amar.",
    icon: "Star"
  }
];

export const PRICING_PLANS = [
  {
    id: 'monthly',
    name: 'Mensal',
    price: 'R$ 9,00',
    period: '/mês',
    popular: false,
    savings: ''
  },
  {
    id: 'quarterly',
    name: 'Trimestral',
    price: 'R$ 24,00',
    period: '/3 meses',
    popular: true,
    savings: 'Mais Popular'
  },
  {
    id: 'annual',
    name: 'Anual',
    price: 'R$ 69,00',
    period: '/ano',
    popular: false,
    savings: 'Melhor Custo-Benefício'
  }
];

// ──────────── QUIZ SCORING & PERSONALITIES ────────────

export interface QuizPersonality {
  id: string;
  title: string;
  emoji: string;
  description: string;
  color: string;
}

export const QUIZ_PERSONALITIES: QuizPersonality[] = [
  {
    id: 'explorer',
    title: 'Explorador Cinematográfico',
    emoji: '🗺️',
    description: 'Você ama descobrir joias escondidas e está sempre em busca de algo novo. Seu feed ideal é uma seleção curada de filmes que ninguém te contou.',
    color: 'from-blue-500 to-cyan-400',
  },
  {
    id: 'emotion_driven',
    title: 'Espectador Emocional',
    emoji: '💔',
    description: 'Você assiste para sentir. Chora, ri e se emociona com facilidade. Filmes que tocam a alma são sua especialidade.',
    color: 'from-pink-500 to-rose-400',
  },
  {
    id: 'analyst',
    title: 'Crítico Analítico',
    emoji: '🔍',
    description: 'Você pesquisa antes de assistir, compara notas e lê resenhas. Quer qualidade comprovada e nada de enrolação.',
    color: 'from-purple-500 to-violet-400',
  },
  {
    id: 'social_watcher',
    title: 'Maratonista Social',
    emoji: '🍿',
    description: 'Para você, filme é desculpa para reunir a galera. O importante é a experiência compartilhada e a diversão garantida.',
    color: 'from-amber-500 to-orange-400',
  },
  {
    id: 'nostalgic',
    title: 'Nostálgico por Natureza',
    emoji: '📼',
    description: 'Você ama reassistir clássicos e tem carinho especial por filmes do passado. Conforto e familiaridade são suas palavras-chave.',
    color: 'from-emerald-500 to-teal-400',
  },
];

export function calculatePersonality(answers: Record<string, string | string[]>): QuizPersonality {
  const scores: Record<string, number> = {
    explorer: 0,
    emotion_driven: 0,
    analyst: 0,
    social_watcher: 0,
    nostalgic: 0,
  };

  // Goal question
  if (answers.goal === 'learn') scores.explorer += 3;
  if (answers.goal === 'feel') scores.emotion_driven += 3;
  if (answers.goal === 'distract') scores.social_watcher += 2;
  if (answers.goal === 'relax') scores.nostalgic += 2;

  // Genres
  const genres = Array.isArray(answers.genres) ? answers.genres : [];
  if (genres.includes('scifi')) scores.explorer += 2;
  if (genres.includes('drama')) scores.emotion_driven += 2;
  if (genres.includes('doc')) scores.analyst += 2;
  if (genres.includes('comedy')) scores.social_watcher += 2;
  if (genres.includes('thriller')) scores.analyst += 1;
  if (genres.includes('romance')) scores.emotion_driven += 1;

  // Era
  if (answers.era === 'classics') scores.nostalgic += 3;
  if (answers.era === 'new') scores.explorer += 2;
  if (answers.era === 'any') scores.social_watcher += 1;

  // Company
  if (answers.company === 'friends') scores.social_watcher += 3;
  if (answers.company === 'alone') scores.emotion_driven += 2;
  if (answers.company === 'partner') scores.nostalgic += 1;

  // Struggle
  if (answers.struggle === 'time_lost') scores.analyst += 2;
  if (answers.struggle === 'where') scores.explorer += 1;
  if (answers.struggle === 'sleep') scores.emotion_driven += 1;

  // Annoyance
  if (answers.annoyance === 'bad_algo') scores.explorer += 2;
  if (answers.annoyance === 'interface') scores.analyst += 1;

  // Recommendations
  if (answers.recommendations === 'research') scores.analyst += 3;
  if (answers.recommendations === 'trust') scores.social_watcher += 2;
  if (answers.recommendations === 'ignore') scores.nostalgic += 1;

  // Plot twists
  if (answers.plot_twists === 'love') scores.explorer += 2;
  if (answers.plot_twists === 'hate') scores.nostalgic += 1;
  if (answers.plot_twists === 'depends') scores.analyst += 1;

  // NEW: Decision fatigue question
  if (answers.decision === 'paralyzed') scores.analyst += 2;
  if (answers.decision === 'random') scores.social_watcher += 1;
  if (answers.decision === 'ask') scores.social_watcher += 2;

  // NEW: Rewatch question
  if (answers.rewatch === 'always') scores.nostalgic += 3;
  if (answers.rewatch === 'never') scores.explorer += 2;
  if (answers.rewatch === 'comfort') scores.emotion_driven += 2;

  // Find max score
  let maxScore = 0;
  let maxId = 'explorer';
  for (const [id, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxId = id;
    }
  }

  return QUIZ_PERSONALITIES.find(p => p.id === maxId) || QUIZ_PERSONALITIES[0];
}
