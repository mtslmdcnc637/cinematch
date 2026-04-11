import { Brain, Target, Zap, Heart, Clock, Star, Film, Tv, Coffee, Moon, TrendingUp, ShieldCheck } from 'lucide-react';

export const QUIZ_PHASES = [
  { id: 1, label: 'SEU PERFIL' },
  { id: 2, label: 'SEUS HÁBITOS' },
  { id: 3, label: 'DESAFIOS' },
  { id: 4, label: 'PLANO IDEAL' }
];

export const QUIZ_QUESTIONS = [
  // FASE 1
  {
    id: 'goal',
    phase: 1,
    title: 'Qual é o seu principal objetivo ao assistir algo?',
    type: 'single',
    options: [
      { id: 'relax', label: 'Relaxar após um dia cansativo', icon: 'Coffee' },
      { id: 'learn', label: 'Aprender e expandir a mente', icon: 'Brain' },
      { id: 'feel', label: 'Me emocionar e sentir algo forte', icon: 'Heart' },
      { id: 'distract', label: 'Pura distração e diversão', icon: 'Zap' }
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
      { id: 'doc', label: 'Documentários' }
    ]
  },
  // FASE 2
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
  // FASE 3
  {
    id: 'struggle',
    phase: 3,
    title: 'Qual é a sua maior frustração hoje?',
    type: 'single',
    options: [
      { id: 'time', label: 'Perco muito tempo escolhendo o que ver' },
      { id: 'where', label: 'Nunca sei em qual streaming o filme está' },
      { id: 'sleep', label: 'Durmo no meio porque escolhi mal' },
      { id: 'forget', label: 'Esqueço os filmes que me recomendaram' }
    ]
  },
  // FASE 4
  {
    id: 'name',
    phase: 4,
    title: 'Como podemos te chamar?',
    subtitle: 'Para personalizarmos o seu plano.',
    type: 'input',
    placeholder: 'Seu primeiro nome'
  },
  {
    id: 'email',
    phase: 4,
    title: 'Para onde devemos enviar o seu Perfil Cinematográfico?',
    subtitle: 'Prometemos não enviar spam.',
    type: 'input',
    placeholder: 'seu.melhor@email.com'
  }
];

export const LOADING_TEXTS = [
  "Analisando suas preferências de gênero...",
  "Cruzando dados com milhares de filmes...",
  "Mapeando seus hábitos de consumo...",
  "Criando seu algoritmo personalizado...",
  "Finalizando seu Plano Pro..."
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
    name: '1 Mês',
    price: 'R$ 29,90',
    period: '/mês',
    popular: false,
    savings: ''
  },
  {
    id: 'quarterly',
    name: '3 Meses',
    price: 'R$ 19,90',
    period: '/mês',
    popular: true,
    savings: 'Economize 33%'
  },
  {
    id: 'annual',
    name: '1 Ano',
    price: 'R$ 14,90',
    period: '/mês',
    popular: false,
    savings: 'Economize 50%'
  }
];
