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

// ─── Template configs ─────────────────────────────────────────────────────────

const TEMPLATE_CONFIGS: Record<TemplateStyle, { name: string; bgGradient: string; barColor: string; textColor: string; accentColor: string }> = {
  neon: { name: 'Neon', bgGradient: 'linear-gradient(180deg, #0a0a1a 0%, #1a0a2e 50%, #0a0a1a 100%)', barColor: '#a855f7', textColor: '#ffffff', accentColor: '#c084fc' },
  minimal: { name: 'Minimal', bgGradient: 'linear-gradient(180deg, #111111 0%, #1a1a1a 50%, #111111 100%)', barColor: '#ffffff', textColor: '#ffffff', accentColor: '#888888' },
  gradient: { name: 'Gradient', bgGradient: 'linear-gradient(180deg, #1a0533 0%, #2d1b69 50%, #1a0533 100%)', barColor: '#7c3aed', textColor: '#ffffff', accentColor: '#f472b6' },
  cinematic: { name: 'Cinematic', bgGradient: 'linear-gradient(180deg, #0c0c0c 0%, #1a0a0a 50%, #0c0c0c 100%)', barColor: '#dc2626', textColor: '#ffffff', accentColor: '#ef4444' },
};

// ─── Canvas Image Generator ───────────────────────────────────────────────────

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

async function generateSlideImage(
  movie: MovieDetails | null,
  index: number,
  isCTA: boolean,
  option: ContentOption,
  template: TemplateStyle,
  format: PlatformFormat,
  secretCode?: string
): Promise<Blob> {
  const config = TEMPLATE_CONFIGS[template];
  const width = 1080;
  const height = format === 'instagram' ? 1350 : 1920;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // ─── Background ───
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  if (template === 'neon') {
    bgGrad.addColorStop(0, '#0a0a1a');
    bgGrad.addColorStop(0.4, '#1a0a2e');
    bgGrad.addColorStop(0.8, '#120828');
    bgGrad.addColorStop(1, '#0a0a1a');
  } else if (template === 'minimal') {
    bgGrad.addColorStop(0, '#111111');
    bgGrad.addColorStop(0.5, '#1a1a1a');
    bgGrad.addColorStop(1, '#111111');
  } else if (template === 'gradient') {
    bgGrad.addColorStop(0, '#1a0533');
    bgGrad.addColorStop(0.4, '#2d1b69');
    bgGrad.addColorStop(0.8, '#1a0a3d');
    bgGrad.addColorStop(1, '#1a0533');
  } else {
    bgGrad.addColorStop(0, '#0c0c0c');
    bgGrad.addColorStop(0.4, '#1a0a0a');
    bgGrad.addColorStop(0.8, '#120808');
    bgGrad.addColorStop(1, '#0c0c0c');
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle decorative glow at center
  const glowGrad = ctx.createRadialGradient(width / 2, height * 0.45, 0, width / 2, height * 0.45, 500);
  glowGrad.addColorStop(0, config.barColor + '15');
  glowGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, width, height);

  if (isCTA) {
    // ─── CTA Slide ───
    // Decorative circles
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = config.barColor;
    ctx.beginPath();
    ctx.arc(width / 2, height * 0.25, 350, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(width / 2, height * 0.75, 250, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Film icon
    ctx.fillStyle = config.barColor;
    ctx.font = 'bold 80px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('\uD83C\uDFAC', width / 2, height * 0.28);

    // Main CTA text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.fillText('Quer saber quais', width / 2, height * 0.40);
    ctx.fillText('filmes sao perfeitos', width / 2, height * 0.40 + 62);
    ctx.fillText('pra VOCE?', width / 2, height * 0.40 + 124);

    // URL with glow background
    const urlY = height * 0.60;
    ctx.fillStyle = config.barColor + '30';
    roundRect(ctx, width / 2 - 280, urlY - 38, 560, 76, 38);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 58px Arial';
    ctx.fillText('mrcine.pro', width / 2, urlY + 20);

    // Subtitle
    ctx.fillStyle = '#cccccc';
    ctx.font = '30px Arial';
    ctx.fillText('Descubra seu perfil cinematografico!', width / 2, urlY + 72);

    // SECRET CODE - Highlighted prominently
    if (secretCode) {
      const codeY = height * 0.78;
      // Code container with border
      ctx.fillStyle = config.barColor + '25';
      roundRect(ctx, width / 2 - 250, codeY - 35, 500, 100, 20);
      ctx.fill();
      ctx.strokeStyle = config.barColor + '80';
      ctx.lineWidth = 2;
      roundRect(ctx, width / 2 - 250, codeY - 35, 500, 100, 20);
      ctx.stroke();

      // "Codigo secreto" label
      ctx.fillStyle = '#aaaaaa';
      ctx.font = '22px Arial';
      ctx.fillText('CODIGO SECRETO', width / 2, codeY);

      // The actual code - big and bold
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 42px Arial';
      ctx.fillText(secretCode.toUpperCase(), width / 2, codeY + 45);
    }

    // Footer hashtag
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '22px Arial';
    ctx.fillText('@mrcine  #MrCinePro', width / 2, height - 35);
  } else if (movie) {
    // ─── Movie Slide ───
    // Top bar with gradient
    const barHeight = 85;
    const barGrad = ctx.createLinearGradient(0, 0, width, 0);
    barGrad.addColorStop(0, config.barColor);
    barGrad.addColorStop(1, config.accentColor);
    ctx.fillStyle = barGrad;
    ctx.fillRect(0, 0, width, barHeight);

    // Bar text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(option.texto_barra, width / 2, barHeight / 2 + 11);

    // Position badge (top-left, overlapping poster)
    const badgeSize = 56;
    const badgeX = 60;
    const badgeY = barHeight + 30;
    ctx.fillStyle = config.barColor;
    ctx.beginPath();
    ctx.arc(badgeX + badgeSize / 2, badgeY + badgeSize / 2, badgeSize / 2, 0, Math.PI * 2);
    ctx.fill();
    // Badge border glow
    ctx.shadowColor = config.barColor;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(badgeX + badgeSize / 2, badgeY + badgeSize / 2, badgeSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px Arial';
    ctx.fillText(`#${index + 1}`, badgeX + badgeSize / 2, badgeY + badgeSize / 2 + 10);

    // Poster area — larger!
    const posterW = 560;
    const posterH = 840;
    const posterX = (width - posterW) / 2;
    const posterY = barHeight + 25;

    // Poster shadow
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = '#222222';
    roundRect(ctx, posterX, posterY, posterW, posterH, 16);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Try to load and draw poster
    try {
      if (movie.poster_path) {
        const posterImg = await loadImage(`https://image.tmdb.org/t/p/w500${movie.poster_path}`);
        ctx.save();
        roundRect(ctx, posterX, posterY, posterW, posterH, 16);
        ctx.clip();
        ctx.drawImage(posterImg, posterX, posterY, posterW, posterH);
        ctx.restore();
      } else {
        ctx.fillStyle = '#333333';
        roundRect(ctx, posterX, posterY, posterW, posterH, 16);
        ctx.fill();
        ctx.fillStyle = '#666666';
        ctx.font = '80px Arial';
        ctx.fillText('\uD83C\uDFAC', width / 2, posterY + posterH / 2 + 25);
      }
    } catch {
      ctx.fillStyle = '#333333';
      roundRect(ctx, posterX, posterY, posterW, posterH, 16);
      ctx.fill();
      ctx.fillStyle = '#666666';
      ctx.font = '80px Arial';
      ctx.fillText('\uD83C\uDFAC', width / 2, posterY + posterH / 2 + 25);
    }

    // Text area below poster
    const textStartY = posterY + posterH + 25;
    ctx.textAlign = 'center';

    // Movie title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px Arial';
    const maxWidth = width - 100;
    const words = movie.title.split(' ');
    let line = '';
    let lineY = textStartY;
    const titleLines: string[] = [];
    for (const word of words) {
      const testLine = line + word + ' ';
      if (ctx.measureText(testLine).width > maxWidth && line !== '') {
        titleLines.push(line.trim());
        line = word + ' ';
      } else {
        line = testLine;
      }
    }
    titleLines.push(line.trim());
    for (const tl of titleLines) {
      ctx.fillText(tl, width / 2, lineY);
      lineY += 52;
    }

    // Year + Rating
    const infoY = lineY + 15;
    ctx.fillStyle = '#bbbbbb';
    ctx.font = '28px Arial';
    const year = movie.release_date ? movie.release_date.slice(0, 4) : '';
    const rating = movie.vote_average > 0 ? `\u2B50 ${movie.vote_average.toFixed(1)}` : '';
    ctx.fillText(`${year}${year && rating ? '  \u2022  ' : ''}${rating}`, width / 2, infoY);

    // Short synopsis (2-3 lines max)
    if (movie.overview) {
      const synopsisY = infoY + 40;
      ctx.fillStyle = '#999999';
      ctx.font = '24px Arial';
      const synopsisMaxWidth = width - 120;
      const synopsisWords = movie.overview.split(' ');
      let sLine = '';
      let sLineY = synopsisY;
      let sLineCount = 0;
      for (const word of synopsisWords) {
        if (sLineCount >= 3) break;
        const testLine = sLine + word + ' ';
        if (ctx.measureText(testLine).width > synopsisMaxWidth && sLine !== '') {
          ctx.fillText(sLine.trim(), width / 2, sLineY);
          sLine = word + ' ';
          sLineY += 32;
          sLineCount++;
        } else {
          sLine = testLine;
        }
      }
      if (sLineCount < 3 && sLine.trim()) {
        // Add ellipsis if truncated
        let finalLine = sLine.trim();
        if (synopsisWords.length > 15) finalLine += '...';
        ctx.fillText(finalLine, width / 2, sLineY);
      }
    }

    // Watermark + hashtag
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.font = '22px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('@mrcine  #MrCinePro', width / 2, height - 35);
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

    // Fetch movie details from TMDB
    const movieDetails: MovieDetails[] = [];
    for (const f of option.filmes) {
      try {
        const movie = await fetchMovieById(f.id_tmdb) as any;
        if (movie?.title) {
          movieDetails.push({
            id: movie.id,
            title: movie.title,
            poster_path: movie.poster_path,
            release_date: movie.release_date || '',
            vote_average: movie.vote_average || 0,
            overview: movie.overview || '',
            genre_ids: movie.genre_ids || [],
          });
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

    // Generate default secret code from bar text
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
                {(Object.entries(TEMPLATE_CONFIGS) as [TemplateStyle, typeof TEMPLATE_CONFIGS.neon][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setTemplate(key)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                      template === key
                        ? 'bg-purple-600 text-white shadow-lg'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cfg.barColor }} />
                    {cfg.name}
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
                  <Instagram className="w-4 h-4" /> Instagram (1080×1350)
                </button>
                <button
                  onClick={() => setFormat('tiktok')}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                    format === 'tiktok'
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Music className="w-4 h-4" /> TikTok (1080×1920)
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
                onChange={(e) => setSecretCodeValue(e.target.value)}
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
