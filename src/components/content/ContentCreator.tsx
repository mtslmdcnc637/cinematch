import React, { useState, useRef, useCallback } from 'react';
import { invokeEdgeFunction } from '../../lib/edgeFunction';
import { fetchMovieById } from '../../services/tmdbService';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import {
  Sparkles, Loader2, Wand2, CheckCircle2, Download,
  Image, Film, ChevronRight, ChevronLeft, LayoutTemplate,
  Palette, Type, Instagram, Music
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MovieOption {
  id_tmdb: number;
  posicao: number;
}

interface ContentOption {
  titulo: string;
  texto_barra: string;
  filmes: MovieOption[];
}

interface ContentGenResult {
  opcoes: ContentOption[];
  raw_text?: string;
}

interface MovieDetails {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
  vote_average: number;
  overview: string;
  genre_ids: number[];
}

type Step = 'prompt' | 'choosing' | 'preview' | 'done';

type TemplateStyle = 'neon' | 'minimal' | 'gradient' | 'cinematic';
type PlatformFormat = 'instagram' | 'tiktok';

// ─── Template configs (fixed palettes per the design spec) ────────────────────

const TEMPLATE_CONFIGS: Record<TemplateStyle, {
  name: string;
  bgColor: string;           // Solid background color
  barGradStart: string;      // Bar gradient left
  barGradEnd: string;        // Bar gradient right
  textColor: string;
  secondaryText: string;     // Muted text color
  badgeColor: string;        // Badge/circle background
  ctaBtnColor: string;       // CTA button fill
  codeBorderColor: string;   // Secret code box border
  codeBgColor: string;       // Secret code box bg
}> = {
  neon: {
    name: 'Neon',
    bgColor: '#1a0a2e',
    barGradStart: '#7c3aed',
    barGradEnd: '#a855f7',
    textColor: '#ffffff',
    secondaryText: '#c4b5fd',
    badgeColor: '#7c3aed',
    ctaBtnColor: '#7c3aed',
    codeBorderColor: '#7c3aed',
    codeBgColor: 'rgba(124,58,237,0.15)',
  },
  minimal: {
    name: 'Minimal',
    bgColor: '#111111',
    barGradStart: '#333333',
    barGradEnd: '#555555',
    textColor: '#ffffff',
    secondaryText: '#888888',
    badgeColor: '#333333',
    ctaBtnColor: '#333333',
    codeBorderColor: '#555555',
    codeBgColor: 'rgba(85,85,85,0.15)',
  },
  gradient: {
    name: 'Gradient',
    bgColor: '#1a0533',
    barGradStart: '#7c3aed',
    barGradEnd: '#f472b6',
    textColor: '#ffffff',
    secondaryText: '#d8b4fe',
    badgeColor: '#7c3aed',
    ctaBtnColor: '#7c3aed',
    codeBorderColor: '#7c3aed',
    codeBgColor: 'rgba(124,58,237,0.15)',
  },
  cinematic: {
    name: 'Cinematic',
    bgColor: '#0c0c0c',
    barGradStart: '#dc2626',
    barGradEnd: '#ef4444',
    textColor: '#ffffff',
    secondaryText: '#fca5a5',
    badgeColor: '#dc2626',
    ctaBtnColor: '#dc2626',
    codeBorderColor: '#dc2626',
    codeBgColor: 'rgba(220,38,38,0.15)',
  },
};

// ─── Canvas Image Generator (Redesigned) ──────────────────────────────────────

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/**
 * Wrap text into lines that fit within maxWidth.
 * Returns array of lines and the total height used.
 */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number = 99): { lines: string[]; totalHeight: number; lineHeight: number } {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    if (lines.length >= maxLines) break;
    const testLine = line + word + ' ';
    if (ctx.measureText(testLine).width > maxWidth && line !== '') {
      lines.push(line.trim());
      line = word + ' ';
    } else {
      line = testLine;
    }
  }
  if (lines.length < maxLines && line.trim()) {
    lines.push(line.trim());
  }

  // Truncate last line with "..." if text was cut
  if (words.length > 0 && lines.length >= maxLines) {
    const lastIdx = lines.length - 1;
    const lastLine = lines[lastIdx];
    if (lastLine.length > 3) {
      lines[lastIdx] = lastLine.slice(0, -3).trimEnd() + '...';
    }
  }

  return { lines, totalHeight: lines.length * 52, lineHeight: 52 };
}

async function generateSlideImage(
  movie: MovieDetails | null,
  index: number,
  isCTA: boolean,
  option: ContentOption,
  template: TemplateStyle,
  format: PlatformFormat,
  secretCode?: string
): Promise<Blob> {
  const cfg = TEMPLATE_CONFIGS[template];
  const width = 1080;
  const height = format === 'instagram' ? 1350 : 1920;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // ─── 1. Solid background (consistent across all cards) ───
  ctx.fillStyle = cfg.bgColor;
  ctx.fillRect(0, 0, width, height);

  // Subtle vignette / radial glow at center for depth
  const vignetteGrad = ctx.createRadialGradient(width / 2, height * 0.45, 0, width / 2, height * 0.45, 600);
  vignetteGrad.addColorStop(0, cfg.barGradStart + '12');
  vignetteGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = vignetteGrad;
  ctx.fillRect(0, 0, width, height);

  if (isCTA) {
    // ═══════════════════════════════════════════════════════════════════
    // CTA SLIDE — Vertically centered content
    // ═══════════════════════════════════════════════════════════════════

    const contentBlockHeight = 520;
    const startY = Math.floor((height - contentBlockHeight) / 2);

    // Film icon
    ctx.fillStyle = cfg.barGradStart;
    ctx.font = '70px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('\uD83C\uDFAC', width / 2, startY + 10);

    // Main CTA text
    ctx.fillStyle = cfg.textColor;
    ctx.font = 'bold 44px Arial';
    ctx.fillText('Quer saber quais', width / 2, startY + 75);
    ctx.fillText('filmes sao perfeitos', width / 2, startY + 130);
    ctx.fillText('pra VOCE?', width / 2, startY + 185);

    // mrcine.pro button — styled as pill
    const btnY = startY + 235;
    const btnW = 480;
    const btnH = 70;
    const btnX = (width - btnW) / 2;
    ctx.fillStyle = cfg.ctaBtnColor;
    roundRect(ctx, btnX, btnY, btnW, btnH, 50);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Arial';
    ctx.fillText('mrcine.pro', width / 2, btnY + 46);

    // Subtitle
    ctx.fillStyle = cfg.secondaryText;
    ctx.font = '26px Arial';
    ctx.fillText('Descubra seu perfil cinematografico!', width / 2, btnY + 110);

    // Secret Code box — styled with border and tinted bg
    if (secretCode) {
      const codeY = btnY + 145;
      const codeW = 440;
      const codeH = 110;
      const codeX = (width - codeW) / 2;

      // Background tint
      ctx.fillStyle = cfg.codeBgColor;
      roundRect(ctx, codeX, codeY, codeW, codeH, 16);
      ctx.fill();

      // Border
      ctx.strokeStyle = cfg.codeBorderColor;
      ctx.lineWidth = 2;
      roundRect(ctx, codeX, codeY, codeW, codeH, 16);
      ctx.stroke();

      // "CODIGO SECRETO" label
      ctx.fillStyle = cfg.secondaryText;
      ctx.font = '20px Arial';
      ctx.fillText('CODIGO SECRETO', width / 2, codeY + 35);

      // The actual code
      ctx.fillStyle = cfg.textColor;
      ctx.font = 'bold 40px Arial';
      ctx.fillText(secretCode.toUpperCase(), width / 2, codeY + 82);
    }

    // Footer hashtag
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '20px Arial';
    ctx.fillText('@mrcine  #MrCinePro', width / 2, height - 40);

  } else if (movie) {
    // ═══════════════════════════════════════════════════════════════════
    // MOVIE SLIDE — Redesigned layout
    // ═══════════════════════════════════════════════════════════════════

    // ─── Top bar with gradient ───
    const barHeight = 80;
    const barGrad = ctx.createLinearGradient(0, 0, width, 0);
    barGrad.addColorStop(0, cfg.barGradStart);
    barGrad.addColorStop(1, cfg.barGradEnd);
    ctx.fillStyle = barGrad;
    ctx.fillRect(0, 0, width, barHeight);

    // Bar text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(option.texto_barra, width / 2, barHeight / 2 + 11);

    // ─── Poster (55-65% of card height) ───
    const posterW = 540;
    const posterH = Math.floor(height * 0.60);
    const posterX = Math.floor((width - posterW) / 2);
    const posterY = barHeight + 16;

    // Badge — positioned top-left over poster, z-index above
    const badgeSize = 52;
    const badgeX = posterX + 16;
    const badgeY = posterY + 16;

    // Draw badge on top of poster
    ctx.fillStyle = cfg.badgeColor;
    ctx.beginPath();
    ctx.arc(badgeX + badgeSize / 2, badgeY + badgeSize / 2, badgeSize / 2, 0, Math.PI * 2);
    ctx.fill();
    // Subtle glow
    ctx.shadowColor = cfg.badgeColor;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(badgeX + badgeSize / 2, badgeY + badgeSize / 2, badgeSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    // Badge text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${index + 1}`, badgeX + badgeSize / 2, badgeY + badgeSize / 2 + 9);

    // Poster shadow (box-shadow: 0 8px 40px rgba(0,0,0,0.7))
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = '#222222';
    roundRect(ctx, posterX, posterY, posterW, posterH, 12);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Load and draw poster image
    let posterLoaded = false;
    try {
      if (movie.poster_path) {
        const posterImg = await loadImage(`https://image.tmdb.org/t/p/w500${movie.poster_path}`);
        ctx.save();
        roundRect(ctx, posterX, posterY, posterW, posterH, 12);
        ctx.clip();
        ctx.drawImage(posterImg, posterX, posterY, posterW, posterH);

        // Gradient overlay at bottom of poster — makes title "emerge" naturally
        const overlayGrad = ctx.createLinearGradient(0, posterY + posterH * 0.6, 0, posterY + posterH);
        overlayGrad.addColorStop(0, 'transparent');
        overlayGrad.addColorStop(1, cfg.bgColor);
        ctx.fillStyle = overlayGrad;
        ctx.fillRect(posterX, posterY, posterW, posterH);

        ctx.restore();
        posterLoaded = true;
      }
    } catch {
      // Fall through to placeholder
    }

    if (!posterLoaded) {
      ctx.fillStyle = '#2a2a2a';
      roundRect(ctx, posterX, posterY, posterW, posterH, 12);
      ctx.fill();
      ctx.fillStyle = '#555555';
      ctx.font = '70px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('\uD83C\uDFAC', width / 2, posterY + posterH / 2 + 25);
    }

    // ─── Text area below poster ───
    const textStartY = posterY + posterH + 16;
    ctx.textAlign = 'center';
    const textMaxWidth = width - 120;

    // Movie title — 28-32px equivalent scaled for 1080px canvas
    ctx.fillStyle = cfg.textColor;
    ctx.font = 'bold 30px Arial';
    const titleResult = wrapText(ctx, movie.title, textMaxWidth, 2);
    let titleY = textStartY;
    for (const tl of titleResult.lines) {
      ctx.fillText(tl, width / 2, titleY + 24);
      titleY += 38;
    }

    // Year + Rating — 8px gap below title
    const infoY = titleY + 8;
    ctx.fillStyle = cfg.secondaryText;
    ctx.font = '22px Arial';
    const year = movie.release_date ? movie.release_date.slice(0, 4) : '';
    const rating = movie.vote_average > 0 ? `\u2B50 ${movie.vote_average.toFixed(1)}` : '';
    ctx.fillText(`${year}${year && rating ? '  \u2022  ' : ''}${rating}`, width / 2, infoY + 18);

    // Synopsis — 12px gap below info, max 3 lines, #secondaryText color
    if (movie.overview) {
      const synopsisY = infoY + 12 + 22;
      ctx.fillStyle = cfg.secondaryText;
      ctx.font = '20px Arial';
      const synopsisMaxWidth = width - 80;
      const synopsisResult = wrapText(ctx, movie.overview, synopsisMaxWidth, 3);
      let sY = synopsisY;
      for (const sLine of synopsisResult.lines) {
        ctx.fillText(sLine, width / 2, sY + 16);
        sY += 28;
      }
    }

    // Footer — at least 60px from bottom
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.font = '18px Arial';
    ctx.fillText('@mrcine  #MrCinePro', width / 2, height - 45);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')),
      'image/png',
      1.0
    );
  });
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ContentCreatorProps {
  adminPassword: string;
}

export default function ContentCreator({ adminPassword }: ContentCreatorProps) {
  const [step, setStep] = useState<Step>('prompt');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [options, setOptions] = useState<ContentOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<number>(-1);
  const [movies, setMovies] = useState<MovieDetails[]>([]);
  const [template, setTemplate] = useState<TemplateStyle>('neon');
  const [format, setFormat] = useState<PlatformFormat>('instagram');
  const [generatedImages, setGeneratedImages] = useState<Blob[]>([]);
  const [isBuildingImages, setIsBuildingImages] = useState(false);
  const [secretCodeValue, setSecretCodeValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [currentPreview, setCurrentPreview] = useState(0);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Generate content from AI
  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setStep('choosing');

    try {
      const data = await invokeEdgeFunction<ContentGenResult>('content-gen', {
        admin_password: adminPassword,
        prompt: prompt.trim(),
      });

      if (data.result?.opcoes?.length > 0) {
        setOptions(data.result.opcoes);
      } else if (data.result?.raw_text) {
        toast.error('A IA não retornou dados válidos. Tente novamente.');
        setStep('prompt');
      } else {
        toast.error('Nenhuma opção gerada. Tente outro tema.');
        setStep('prompt');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao gerar conteúdo');
      setStep('prompt');
    } finally {
      setIsGenerating(false);
    }
  };

  // Select an option and fetch movie details
  const handleSelectOption = async (optIndex: number) => {
    setSelectedOption(optIndex);
    const option = options[optIndex];

    // Fetch movie details from TMDB (skip movies without poster)
    const movieDetails: MovieDetails[] = [];
    for (const f of option.filmes) {
      try {
        const movie = await fetchMovieById(f.id_tmdb) as any;
        if (movie?.title && movie?.poster_path) {
          movieDetails.push({
            id: movie.id,
            title: movie.title,
            poster_path: movie.poster_path,
            release_date: movie.release_date || '',
            vote_average: movie.vote_average || 0,
            overview: movie.overview || '',
            genre_ids: movie.genre_ids || [],
          });
        } else if (movie?.title) {
          // Movie exists but no poster — skip to avoid empty slides
          console.warn(`Skipping "${movie.title}" — no poster available`);
        }
      } catch {
        // Skip movies that fail to load
      }
    }

    if (movieDetails.length === 0) {
      toast.error('Nenhum filme encontrado. Tente outro tema.');
      return;
    }

    setMovies(movieDetails);
    setStep('preview');

    // Generate default secret code from bar text — only alphanumeric
    const codeFromBar = option.texto_barra
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 15);
    setSecretCodeValue(codeFromBar || `dica${Date.now().toString(36)}`);
  };

  // Build all images
  const handleBuildImages = useCallback(async () => {
    if (movies.length === 0 || selectedOption < 0) return;
    setIsBuildingImages(true);
    setGeneratedImages([]);

    try {
      const option = options[selectedOption];
      const blobs: Blob[] = [];

      // Generate movie slides
      for (let i = 0; i < movies.length; i++) {
        const blob = await generateSlideImage(movies[i], i, false, option, template, format, secretCodeValue);
        blobs.push(blob);
      }

      // Generate CTA slide (always the last one)
      const ctaBlob = await generateSlideImage(null, 0, true, option, template, format, secretCodeValue);
      blobs.push(ctaBlob);

      setGeneratedImages(blobs);
      setCurrentPreview(0);
    } catch (err: any) {
      toast.error('Erro ao gerar imagens: ' + err.message);
    } finally {
      setIsBuildingImages(false);
    }
  }, [movies, selectedOption, options, template, format]);

  // Re-generate images when template/format changes
  React.useEffect(() => {
    if (step === 'preview' && movies.length > 0 && selectedOption >= 0) {
      handleBuildImages();
    }
  }, [template, format]); // eslint-disable-line react-hooks/exhaustive-deps

  // Download all images as individual files
  const handleDownloadAll = () => {
    generatedImages.forEach((blob, i) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mrcine_${i + 1}${i === generatedImages.length - 1 ? '_cta' : ''}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
    toast.success(`${generatedImages.length} imagens baixadas!`);
  };

  // Download single image
  const handleDownloadOne = (index: number) => {
    const blob = generatedImages[index];
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mrcine_${index + 1}${index === generatedImages.length - 1 ? '_cta' : ''}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Save secret code + mark as done
  const handleApproveAndSave = async () => {
    if (!secretCodeValue.trim()) {
      toast.error('Defina um código secreto');
      return;
    }
    if (!supabase) return;

    setIsSaving(true);
    try {
      const option = options[selectedOption];
      const movieIds = movies.map(m => m.id);

      // Check if code already exists
      const { data: existing } = await supabase
        .from('secret_codes')
        .select('id')
        .eq('code', secretCodeValue.trim())
        .maybeSingle();

      if (existing) {
        toast.error('Este código já existe. Escolha outro.');
        setIsSaving(false);
        return;
      }

      const { error } = await supabase
        .from('secret_codes')
        .insert({
          code: secretCodeValue.trim(),
          title: option.titulo,
          description: `Postagem: ${option.texto_barra}`,
          movie_ids: movieIds,
          is_active: true,
        });

      if (error) {
        toast.error(`Erro: ${error.message}`);
      } else {
        toast.success(`Código "${secretCodeValue}" cadastrado com sucesso!`);
        setStep('done');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar código');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to start
  const handleReset = () => {
    setStep('prompt');
    setPrompt('');
    setOptions([]);
    setSelectedOption(-1);
    setMovies([]);
    setGeneratedImages([]);
    setSecretCodeValue('');
    setCurrentPreview(0);
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-xl flex items-center gap-2">
            <Wand2 className="w-6 h-6 text-purple-400" />
            Criador de Conteúdo
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Gere postagens automáticas com código secreto para Instagram e TikTok
          </p>
        </div>
        {step !== 'prompt' && (
          <button
            onClick={handleReset}
            className="text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            Novo Post
          </button>
        )}
      </div>

      {/* ─── Step 1: Prompt ─── */}
      {step === 'prompt' && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h4 className="font-bold text-lg mb-3">Descreva a postagem</h4>
          <p className="text-gray-400 text-sm mb-4">
            Ex: "5 melhores filmes de terror", "Filmes de ficção científica que ninguém conhece", "Top 5 comédias para assistir no fim de semana"
          </p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Descreva o tema da postagem..."
            rows={3}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 resize-none text-base"
          />
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="mt-4 px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold text-lg hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Gerando opções...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Gerar Postagem
              </>
            )}
          </button>
        </div>
      )}

      {/* ─── Step 2: Choose option ─── */}
      {step === 'choosing' && isGenerating && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <h4 className="text-xl font-bold mb-2">Gerando opções...</h4>
          <p className="text-gray-400">A IA está criando 2 opções de postagem para você escolher</p>
        </div>
      )}

      {step === 'choosing' && !isGenerating && options.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-bold text-lg">Escolha uma opção</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleSelectOption(i)}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 text-left hover:border-purple-500/50 hover:bg-purple-500/5 transition-all group"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-sm font-bold">
                    Opção {i + 1}
                  </span>
                  <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-full">
                    {opt.texto_barra}
                  </span>
                </div>
                <h5 className="font-bold text-lg mb-3 group-hover:text-purple-300 transition-colors">
                  {opt.titulo}
                </h5>
                <div className="space-y-1.5">
                  {opt.filmes.map((f, j) => (
                    <div key={j} className="flex items-center gap-2 text-sm text-gray-400">
                      <span className="text-purple-400 font-mono text-xs">#{f.posicao}</span>
                      <span className="font-mono text-xs">TMDB: {f.id_tmdb}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-purple-400 text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                  Selecionar <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Step 3: Preview ─── */}
      {step === 'preview' && selectedOption >= 0 && (
        <div className="space-y-6">
          {/* Controls */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
            {/* Template selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                <Palette className="w-4 h-4" /> Estilo do Template
              </label>
              <div className="flex gap-2 flex-wrap">
                {(Object.entries(TEMPLATE_CONFIGS) as [TemplateStyle, typeof TEMPLATE_CONFIGS.neon][]).map(([key, tcfg]) => (
                  <button
                    key={key}
                    onClick={() => setTemplate(key)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                      template === key
                        ? 'bg-purple-600 text-white shadow-lg'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tcfg.barGradStart }} />
                    {tcfg.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Format selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                <LayoutTemplate className="w-4 h-4" /> Formato
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFormat('instagram')}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                    format === 'instagram'
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Instagram className="w-4 h-4" /> Instagram (1080x1350)
                </button>
                <button
                  onClick={() => setFormat('tiktok')}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                    format === 'tiktok'
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Music className="w-4 h-4" /> TikTok (1080x1920)
                </button>
              </div>
            </div>

            {/* Secret Code */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                <Type className="w-4 h-4" /> Código Secreto (será cadastrado automaticamente)
              </label>
              <input
                type="text"
                value={secretCodeValue}
                onChange={(e) => setSecretCodeValue(e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 15))}
                placeholder="ex: TERROR2024, NATAL, TOP5"
                className="w-full max-w-sm px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 font-mono text-lg"
              />
            </div>
          </div>

          {/* Loading state */}
          {isBuildingImages && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-3" />
              <p className="text-gray-400">Gerando imagens... ({movies.length + 1} slides)</p>
            </div>
          )}

          {/* Image previews */}
          {!isBuildingImages && generatedImages.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-bold text-lg flex items-center gap-2">
                <Image className="w-5 h-5 text-purple-400" />
                Preview ({generatedImages.length} slides)
              </h4>

              {/* Preview carousel */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => setCurrentPreview(prev => Math.max(0, prev - 1))}
                    disabled={currentPreview === 0}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-all"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="relative">
                    <img
                      src={URL.createObjectURL(generatedImages[currentPreview])}
                      alt={`Slide ${currentPreview + 1}`}
                      className="max-h-[500px] rounded-xl shadow-2xl object-contain"
                    />
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 px-3 py-1 rounded-full text-xs text-white">
                      {currentPreview + 1} / {generatedImages.length}
                      {currentPreview === generatedImages.length - 1 ? ' (CTA)' : ` — ${movies[currentPreview]?.title || ''}`}
                    </div>
                  </div>

                  <button
                    onClick={() => setCurrentPreview(prev => Math.min(generatedImages.length - 1, prev + 1))}
                    disabled={currentPreview === generatedImages.length - 1}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-all"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                {/* Thumbnail row */}
                <div className="flex gap-2 mt-4 overflow-x-auto pb-2 justify-center">
                  {generatedImages.map((blob, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPreview(i)}
                      className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                        currentPreview === i ? 'border-purple-500 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={URL.createObjectURL(blob)}
                        alt={`Thumb ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleDownloadAll}
                  className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-xl font-bold flex items-center gap-2 transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Baixar Todas ({generatedImages.length} imgs)
                </button>
                <button
                  onClick={() => handleDownloadOne(currentPreview)}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium flex items-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Baixar Esta
                </button>
                <button
                  onClick={handleApproveAndSave}
                  disabled={isSaving}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold flex items-center gap-2 hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                  {isSaving ? 'Salvando...' : 'Aprovar e Cadastrar Código'}
                </button>
              </div>

              {/* Movie list for reference */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <h5 className="font-medium text-sm text-gray-400 mb-2 flex items-center gap-1">
                  <Film className="w-4 h-4" /> Filmes nesta postagem
                </h5>
                <div className="flex flex-wrap gap-2">
                  {movies.map((m, i) => (
                    <span key={m.id} className="text-xs bg-white/5 px-3 py-1.5 rounded-lg text-gray-300">
                      #{i + 1} {m.title} ({m.release_date?.slice(0, 4) || '?'}) ⭐{m.vote_average?.toFixed(1) || '?'}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Step 4: Done ─── */}
      {step === 'done' && (
        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h4 className="text-2xl font-bold mb-2">Postagem Criada!</h4>
          <p className="text-gray-400 mb-4">
            Código secreto <code className="bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-mono">{secretCodeValue}</code> cadastrado com sucesso.
          </p>
          <p className="text-gray-500 text-sm mb-6">
            As imagens já foram baixadas. Publique no Instagram/TikTok e divulgue o código!
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={handleDownloadAll}
              className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-xl font-bold flex items-center gap-2 transition-colors"
            >
              <Download className="w-5 h-5" />
              Baixar Imagens Novamente
            </button>
            <button
              onClick={handleReset}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold flex items-center gap-2 transition-colors"
            >
              <Wand2 className="w-5 h-5" />
              Criar Outra Postagem
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
