import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { tarotCards, generateReading } from './data/tarotCards';
import type { TarotCard } from './data/tarotCards';

/* ═══════════════════════════════════════════════════
   Star Particles — floating golden stars
   ═══════════════════════════════════════════════════ */

interface Particle {
  id: number;
  x: number;
  delay: number;
  duration: number;
  char: string;
  size: number;
}

function StarParticles() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const chars = ['✦', '✧', '·', '⋆', '✵', '♦'];
    const initial: Particle[] = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 8,
      duration: 8 + Math.random() * 12,
      char: chars[Math.floor(Math.random() * chars.length)],
      size: 8 + Math.random() * 8,
    }));
    setParticles(initial);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map(p => (
        <span
          key={p.id}
          className="star-particle"
          style={{
            left: `${p.x}%`,
            bottom: '-20px',
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            animationIterationCount: 'infinite',
            fontSize: `${p.size}px`,
            opacity: 0.4,
          }}
        >
          {p.char}
        </span>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Ornament — decorative divider ✦ ── ❖ ── ✦
   ═══════════════════════════════════════════════════ */

function Ornament({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 ${className}`}>
      <span className="text-gold-light text-xs">✦</span>
      <div className="h-px w-12 bg-gradient-to-r from-transparent via-gold-light to-transparent" />
      <span className="text-gold text-sm">❖</span>
      <div className="h-px w-12 bg-gradient-to-r from-transparent via-gold-light to-transparent" />
      <span className="text-gold-light text-xs">✦</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Ambient Music — Web Audio API drone pad
   ═══════════════════════════════════════════════════ */

function useAmbientMusic() {
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const oscsRef = useRef<OscillatorNode[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);

  const start = useCallback(() => {
    if (ctxRef.current) return;

    const ctx = new AudioContext();
    ctxRef.current = ctx;

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0;
    masterGain.connect(ctx.destination);
    gainRef.current = masterGain;

    // Ethereal pad: C major chord with slight detuning
    const notes = [
      { freq: 130.81, vol: 0.06, detune: 0 },   // C3
      { freq: 164.81, vol: 0.04, detune: 3 },    // E3
      { freq: 196.00, vol: 0.05, detune: -2 },   // G3
      { freq: 261.63, vol: 0.03, detune: 5 },    // C4
      { freq: 329.63, vol: 0.02, detune: -3 },   // E4
    ];

    const oscs: OscillatorNode[] = [];

    notes.forEach(note => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = note.freq;
      osc.detune.value = note.detune;

      const oscGain = ctx.createGain();
      oscGain.gain.value = note.vol;

      osc.connect(oscGain);
      oscGain.connect(masterGain);
      osc.start();
      oscs.push(osc);
    });

    // Add a subtle triangle wave for warmth
    const triOsc = ctx.createOscillator();
    triOsc.type = 'triangle';
    triOsc.frequency.value = 65.41; // C2
    const triGain = ctx.createGain();
    triGain.gain.value = 0.03;
    triOsc.connect(triGain);
    triGain.connect(masterGain);
    triOsc.start();
    oscs.push(triOsc);

    oscsRef.current = oscs;

    // Fade in
    masterGain.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 3);
    setIsPlaying(true);
  }, []);

  const stop = useCallback(() => {
    if (!ctxRef.current || !gainRef.current) return;

    const ctx = ctxRef.current;
    const gain = gainRef.current;

    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);

    setTimeout(() => {
      oscsRef.current.forEach(o => {
        try { o.stop(); } catch (_e) { /* already stopped */ }
      });
      try { ctx.close(); } catch (_e) { /* already closed */ }
      ctxRef.current = null;
      gainRef.current = null;
      oscsRef.current = [];
    }, 2000);

    setIsPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) {
      stop();
    } else {
      start();
    }
  }, [isPlaying, start, stop]);

  useEffect(() => {
    return () => {
      if (ctxRef.current) {
        oscsRef.current.forEach(o => {
          try { o.stop(); } catch (_e) { /* noop */ }
        });
        try { ctxRef.current.close(); } catch (_e) { /* noop */ }
      }
    };
  }, []);

  return { isPlaying, toggle };
}

/* ═══════════════════════════════════════════════════
   Music Toggle Button
   ═══════════════════════════════════════════════════ */

function MusicToggle({ isPlaying, onToggle }: { isPlaying: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="fixed top-4 right-4 z-50 w-10 h-10 rounded-full
                 bg-cream/80 border border-gold-light/50 backdrop-blur-sm
                 flex items-center justify-center
                 hover:bg-cream hover:border-gold/50
                 transition-all duration-300 shadow-sm
                 text-gold"
      title={isPlaying ? '关闭音乐' : '开启音乐'}
    >
      {isPlaying ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
        </svg>
      )}
    </button>
  );
}

/* ═══════════════════════════════════════════════════
   Card Back Component
   ═══════════════════════════════════════════════════ */

function CardBack({ size = 'normal' }: { size?: 'normal' | 'small' | 'selection' }) {
  const sizeClasses = {
    normal: 'w-40 h-64 md:w-48 md:h-72',
    selection: 'w-20 h-32 sm:w-24 sm:h-38 md:w-28 md:h-44',
    small: 'w-16 h-24',
  };
  const isSmall = size === 'small' || size === 'selection';

  return (
    <div
      className={`${sizeClasses[size]} rounded-xl
                  bg-gradient-to-br from-mystic/80 via-lavender to-mystic/60
                  border-2 border-gold/30 flex items-center justify-center
                  shadow-lg relative overflow-hidden`}
    >
      {/* Inner border */}
      <div className={`absolute ${isSmall ? 'inset-1.5' : 'inset-3'} border border-gold/20 rounded-lg`} />

      {/* Decorative stars */}
      <div className="absolute inset-0 opacity-10">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="absolute text-gold"
            style={{
              top: `${15 + (i % 3) * 30}%`,
              left: `${15 + Math.floor(i / 3) * 50}%`,
              fontSize: isSmall ? '8px' : '16px',
              opacity: 0.5,
            }}
          >
            ✦
          </div>
        ))}
      </div>

      {/* Center moon */}
      <div
        className={`relative z-10 ${isSmall ? 'w-6 h-6 sm:w-8 sm:h-8' : 'w-16 h-16'}
                    rounded-full border border-gold/30 flex items-center justify-center`}
      >
        <span className={`text-gold/60 ${isSmall ? 'text-xs sm:text-sm' : 'text-2xl'}`}>☽</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Card Front Component
   ═══════════════════════════════════════════════════ */

function CardFront({ card, size = 'normal' }: { card: TarotCard; size?: 'normal' | 'selection' }) {
  const sizeClasses = {
    normal: 'w-40 h-64 md:w-48 md:h-72',
    selection: 'w-20 h-32 sm:w-24 sm:h-38 md:w-28 md:h-44',
  };
  const isSmall = size === 'selection';

  return (
    <div
      className={`${sizeClasses[size]} rounded-xl border-2 border-gold/40
                  flex flex-col items-center justify-between
                  ${isSmall ? 'p-1.5 sm:p-2' : 'p-4'} shadow-xl relative overflow-hidden`}
      style={{
        background: `linear-gradient(135deg, ${card.colors.from}, ${card.colors.to})`,
      }}
    >
      {/* Inner border */}
      <div className={`absolute ${isSmall ? 'inset-1' : 'inset-2.5'} border border-gold/15 rounded-lg`} />

      {/* Top numeral */}
      <div className="relative z-10 text-center">
        <p className={`${isSmall ? 'text-[8px] sm:text-[10px]' : 'text-xs'} text-ink-light/50 font-display`}>
          {card.numeral}
        </p>
      </div>

      {/* Center symbol + name */}
      <div className="relative z-10 flex flex-col items-center">
        <div
          className={`${isSmall ? 'w-8 h-8 sm:w-10 sm:h-10' : 'w-20 h-20'} rounded-full bg-white/40
                      border border-gold/20 flex items-center justify-center
                      ${isSmall ? 'mb-1' : 'mb-3'} shadow-inner`}
        >
          <span className={`${isSmall ? 'text-base sm:text-lg' : 'text-4xl'}`}>{card.symbol}</span>
        </div>
        <h3
          className={`${isSmall ? 'text-[10px] sm:text-xs' : 'text-lg'} font-serif font-semibold text-ink tracking-wider`}
        >
          {card.name}
        </h3>
        {!isSmall && (
          <p className="text-xs text-ink-light/50 font-display italic">{card.nameEn}</p>
        )}
      </div>

      {/* Bottom element */}
      <div className="relative z-10 text-center">
        <p className={`${isSmall ? 'text-[7px] sm:text-[8px]' : 'text-xs'} text-ink-light/40`}>
          {card.element}
        </p>
      </div>

      {/* Corner stars */}
      {!isSmall && (
        <>
          <span className="absolute top-2 left-3 text-gold/20 text-xs">✦</span>
          <span className="absolute top-2 right-3 text-gold/20 text-xs">✦</span>
          <span className="absolute bottom-2 left-3 text-gold/20 text-xs">✦</span>
          <span className="absolute bottom-2 right-3 text-gold/20 text-xs">✦</span>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Moon Decoration (Landing page)
   ═══════════════════════════════════════════════════ */

function MoonDecoration() {
  return (
    <div className="relative flex items-center justify-center mb-8">
      {/* Outer glowing ring */}
      <div
        className="w-32 h-32 rounded-full
                   bg-gradient-to-br from-gold-light/30 via-lavender-light/40 to-rose-light/30
                   animate-breathe shadow-lg shadow-gold/10
                   flex items-center justify-center"
      >
        {/* Inner circle */}
        <div
          className="w-24 h-24 rounded-full
                     bg-gradient-to-br from-cream via-white to-cream-dark
                     border border-gold-light/40
                     flex items-center justify-center"
        >
          <span className="text-4xl text-golden">✦</span>
        </div>
      </div>

      {/* Orbit dots */}
      {[0, 60, 120, 180, 240, 300].map(deg => (
        <div
          key={deg}
          className="absolute w-1.5 h-1.5 bg-gold/60 rounded-full"
          style={{
            top: `calc(50% + ${Math.sin((deg * Math.PI) / 180) * -76}px - 3px)`,
            left: `calc(50% + ${Math.cos((deg * Math.PI) / 180) * 76}px - 3px)`,
          }}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Landing Page — question input
   ═══════════════════════════════════════════════════ */

function LandingPage({ onSubmit }: { onSubmit: (q: string) => void }) {
  const [question, setQuestion] = useState('');

  const handleSubmit = () => {
    if (question.trim()) {
      onSubmit(question.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative z-10">
      <div className="max-w-lg w-full text-center animate-fadeInUp">
        {/* Moon decoration */}
        <MoonDecoration />

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-serif font-light text-golden tracking-wider mb-2">
          星辰塔罗
        </h1>
        <p className="text-sm md:text-base font-display italic text-ink-light/60 mb-2">
          Celestial Tarot
        </p>

        <Ornament className="my-6" />

        {/* Subtitle */}
        <p className="text-ink-light text-sm md:text-base leading-relaxed mb-8 font-serif">
          在星辰的指引下，探寻内心的答案。
          <br />
          请静下心来，向宇宙提出你的问题。
        </p>

        {/* Question input */}
        <div className="relative mb-6">
          <textarea
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="在这里写下你心中的疑问..."
            rows={3}
            className="w-full px-5 py-4 rounded-xl
                       bg-white/60 backdrop-blur-sm
                       border border-gold-light/40
                       text-ink font-serif text-sm md:text-base
                       placeholder:text-ink-light/30
                       focus:border-gold/60 focus:ring-2 focus:ring-gold/10
                       transition-all duration-300 resize-none
                       leading-relaxed"
          />
        </div>

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!question.trim()}
          className="btn-golden px-8 py-3 rounded-full
                     text-white font-serif text-sm md:text-base tracking-wider
                     disabled:opacity-30 disabled:cursor-not-allowed
                     disabled:transform-none disabled:shadow-none
                     shadow-md"
        >
          ✦ 开始占卜 ✦
        </button>

        {/* Hint */}
        <p className="mt-6 text-xs text-ink-light/30 font-serif">
          ✧ 例如：我最近的工作方向是否正确？✧
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Utility: shuffle
   ═══════════════════════════════════════════════════ */

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ═══════════════════════════════════════════════════
   Card Selection Page — pick 3 cards
   ═══════════════════════════════════════════════════ */

function CardSelectionPage({ onComplete }: { onComplete: (cards: TarotCard[]) => void }) {
  const shuffled = useMemo(() => shuffleArray([...tarotCards]), []);
  const [selected, setSelected] = useState<number[]>([]);
  const [flipped, setFlipped] = useState<Set<number>>(new Set());

  const positionLabels = ['过去', '现在', '未来'];

  const handleCardClick = (index: number) => {
    if (flipped.has(index)) {
      // Un-select
      setSelected(prev => prev.filter(i => i !== index));
      setFlipped(prev => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    } else if (selected.length < 3) {
      // Select
      setSelected(prev => [...prev, index]);
      setFlipped(prev => new Set(prev).add(index));
    }
  };

  const handleComplete = () => {
    const cards = selected.map(i => shuffled[i]);
    onComplete(cards);
  };

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8 md:py-12 relative z-10">
      {/* Header */}
      <div className="text-center mb-6 md:mb-10 animate-fadeInUp">
        <h2 className="text-2xl md:text-3xl font-serif font-light text-golden tracking-wider mb-2">
          选择你的命运之牌
        </h2>
        <p className="text-xs md:text-sm text-ink-light/60 font-serif mb-3">
          请凭直觉选择三张牌，它们将揭示过去、现在与未来的指引
        </p>
        <Ornament className="my-4" />

        {/* Selected indicators */}
        <div className="flex items-center justify-center gap-4 md:gap-6 mt-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 md:w-10 md:h-10 rounded-full border-2 flex items-center justify-center
                            transition-all duration-500
                            ${i < selected.length
                    ? 'border-gold bg-gold/10 text-gold'
                    : 'border-gold-light/30 text-gold-light/30'
                  }`}
              >
                {i < selected.length ? (
                  <span className="text-sm">✦</span>
                ) : (
                  <span className="text-xs">{i + 1}</span>
                )}
              </div>
              <span className={`text-xs font-serif ${i < selected.length ? 'text-gold' : 'text-ink-light/30'}`}>
                {positionLabels[i]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Card Grid */}
      <div
        className="grid gap-2 sm:gap-3 md:gap-4 mb-8 animate-fadeIn w-full max-w-4xl"
        style={{
          gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
        }}
      >
        {shuffled.map((card, index) => {
          const isFlipped = flipped.has(index);
          const isSelected = selected.includes(index);
          const selectionIndex = selected.indexOf(index);
          const isDisabled = selected.length >= 3 && !isSelected;

          return (
            <div
              key={card.id}
              className="flex flex-col items-center"
              style={{
                animationDelay: `${index * 0.05}s`,
              }}
            >
              <button
                onClick={() => handleCardClick(index)}
                disabled={isDisabled}
                className={`card-flip-container relative
                            ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                            ${!isDisabled && !isFlipped ? 'tarot-card-hover' : ''}
                            ${isSelected ? 'card-selected rounded-xl' : ''}
                            transition-opacity duration-300`}
              >
                <div className={`card-flip-inner ${isFlipped ? 'flipped' : ''}`}>
                  {/* Front = card back (face down) */}
                  <div className="card-face-front">
                    <CardBack size="selection" />
                  </div>
                  {/* Back = card front (revealed) */}
                  <div className="card-face-back absolute inset-0">
                    <CardFront card={card} size="selection" />
                  </div>
                </div>
              </button>

              {/* Position label */}
              {isSelected && (
                <div
                  className="mt-1 px-2 py-0.5 rounded-full bg-gold/10 border border-gold/20
                             text-gold text-[10px] font-serif animate-fadeIn"
                >
                  {positionLabels[selectionIndex]}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Complete button */}
      {selected.length === 3 && (
        <div className="animate-slideInFromBottom mb-8">
          <button
            onClick={handleComplete}
            className="btn-golden px-10 py-3 rounded-full
                       text-white font-serif tracking-wider
                       shadow-lg text-sm md:text-base"
          >
            ✦ 揭示命运 ✦
          </button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Reading Page — AI interpretation
   ═══════════════════════════════════════════════════ */

function ReadingPage({
  question,
  cards,
  onRestart,
}: {
  question: string;
  cards: TarotCard[];
  onRestart: () => void;
}) {
  const fullText = useMemo(() => generateReading(question, cards), [question, cards]);
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let index = 0;

    const tick = () => {
      if (cancelled) return;
      if (index < fullText.length) {
        index++;
        setDisplayedText(fullText.slice(0, index));
        const char = fullText[index - 1];
        const delay = ['。', '，', '、', '！', '？', '\n'].includes(char) ? 80 : 30;
        setTimeout(tick, delay);
      } else {
        setIsComplete(true);
      }
    };

    setTimeout(tick, 800);

    return () => {
      cancelled = true;
    };
  }, [fullText]);

  // Auto-scroll the text container
  useEffect(() => {
    if (textRef.current) {
      textRef.current.scrollTop = textRef.current.scrollHeight;
    }
  }, [displayedText]);

  const handleSkip = () => {
    setDisplayedText(fullText);
    setIsComplete(true);
  };

  const positionLabels = ['🌑 过去', '🌓 现在', '🌕 未来'];

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8 md:py-12 relative z-10">
      {/* Header */}
      <div className="text-center mb-6 md:mb-8 animate-fadeInUp">
        <h2 className="text-2xl md:text-3xl font-serif font-light text-golden tracking-wider mb-2">
          ✦ 星辰解读 ✦
        </h2>
        <Ornament className="my-4" />
      </div>

      {/* Three cards display */}
      <div className="flex flex-wrap items-start justify-center gap-4 md:gap-8 mb-8 animate-fadeIn">
        {cards.map((card, i) => (
          <div key={card.id} className="flex flex-col items-center gap-2"
               style={{ animationDelay: `${i * 0.3}s` }}>
            <p className="text-xs md:text-sm text-gold font-serif mb-1">{positionLabels[i]}</p>
            <div className="animate-cardGlow rounded-xl">
              <CardFront card={card} size="normal" />
            </div>
            <p className="text-xs text-ink-light/50 font-serif mt-1">
              {card.keywords.slice(0, 2).join(' · ')}
            </p>
          </div>
        ))}
      </div>

      {/* Reading text */}
      <div className="w-full max-w-2xl animate-fadeInUp" style={{ animationDelay: '0.5s' }}>
        <div
          className="bg-white/40 backdrop-blur-sm rounded-2xl
                     border border-gold-light/30 p-6 md:p-8
                     shadow-sm"
        >
          {/* AI label */}
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gold-light/20">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-lavender-light to-rose-light
                            flex items-center justify-center">
              <span className="text-xs">✦</span>
            </div>
            <span className="text-xs text-ink-light/60 font-serif">星辰之语 · AI 解读</span>
            {!isComplete && (
              <button
                onClick={handleSkip}
                className="ml-auto text-xs text-gold/60 hover:text-gold font-serif
                           transition-colors duration-300"
              >
                跳过动画 →
              </button>
            )}
          </div>

          {/* Text content */}
          <div
            ref={textRef}
            className="reading-text text-ink font-serif text-sm md:text-base
                       whitespace-pre-wrap max-h-[50vh] overflow-y-auto pr-2"
          >
            {displayedText}
            {!isComplete && <span className="typing-cursor" />}
          </div>
        </div>

        {/* Restart button */}
        {isComplete && (
          <div className="text-center mt-8 animate-fadeInUp">
            <Ornament className="mb-6" />
            <button
              onClick={onRestart}
              className="px-8 py-3 rounded-full
                         bg-white/60 border border-gold-light/40
                         text-gold font-serif text-sm tracking-wider
                         hover:bg-white/80 hover:border-gold/50
                         transition-all duration-300 shadow-sm"
            >
              ✦ 重新占卜 ✦
            </button>
            <p className="mt-4 text-xs text-ink-light/30 font-serif">
              每一次占卜都是与宇宙的对话
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Main App
   ═══════════════════════════════════════════════════ */

type Page = 'landing' | 'selection' | 'reading';

export function App() {
  const [page, setPage] = useState<Page>('landing');
  const [question, setQuestion] = useState('');
  const [selectedCards, setSelectedCards] = useState<TarotCard[]>([]);
  const [transitioning, setTransitioning] = useState(false);
  const { isPlaying, toggle } = useAmbientMusic();

  const goToPage = useCallback((nextPage: Page) => {
    setTransitioning(true);
    setTimeout(() => {
      setPage(nextPage);
      window.scrollTo({ top: 0 });
      setTimeout(() => setTransitioning(false), 50);
    }, 500);
  }, []);

  const handleQuestionSubmit = useCallback(
    (q: string) => {
      setQuestion(q);
      goToPage('selection');
    },
    [goToPage],
  );

  const handleCardsSelected = useCallback(
    (cards: TarotCard[]) => {
      setSelectedCards(cards);
      goToPage('reading');
    },
    [goToPage],
  );

  const handleRestart = useCallback(() => {
    setQuestion('');
    setSelectedCards([]);
    goToPage('landing');
  }, [goToPage]);

  return (
    <div className="min-h-screen bg-cream bg-pattern relative overflow-x-hidden">
      <StarParticles />
      <MusicToggle isPlaying={isPlaying} onToggle={toggle} />

      <div
        className={`page-transition ${transitioning ? 'opacity-0' : 'opacity-100'}`}
      >
        {page === 'landing' && <LandingPage onSubmit={handleQuestionSubmit} />}
        {page === 'selection' && <CardSelectionPage onComplete={handleCardsSelected} />}
        {page === 'reading' && (
          <ReadingPage question={question} cards={selectedCards} onRestart={handleRestart} />
        )}
      </div>
    </div>
  );
}
