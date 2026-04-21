'use client';

import { useEffect, useRef, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { GameCard } from '@/types/game';
import { sileo } from 'sileo';
import { useAudio } from '@/lib/audio';
import { HelpCircle, Target, Trophy, AlertTriangle, CheckCircle2, XCircle, ArrowRight, Sparkles, CircleSlash } from 'lucide-react';
import { RippleButton } from '@/components/ui/RippleButton';

interface QuestionModalProps {
  card: GameCard;
  onAnswer: (answer: number, cardId: string) => Promise<{ is_correct: boolean; points_earned: number; penalty_message?: string; new_position?: number }>;
  onComplete: (completed: boolean, cardId: string) => Promise<{ success: boolean; message?: string; new_position?: number }>;
  onClose: () => void;
}

// Pro Max UI Config
const CARD_STYLES: Record<string, { bg: string; icon: React.ReactNode; label: string; border: string; glow: string; text: string; lightBg: string }> = {
  pregunta: { bg: 'bg-blue-600', icon: <HelpCircle className="w-6 h-6" />, label: 'PREGUNTA', border: 'border-blue-500', glow: 'shadow-blue-500/50', text: 'text-blue-600', lightBg: 'bg-blue-50 dark:bg-blue-900/40' },
  reto: { bg: 'bg-amber-500', icon: <Target className="w-6 h-6" />, label: 'RETO', border: 'border-amber-400', glow: 'shadow-amber-500/50', text: 'text-amber-600', lightBg: 'bg-amber-50 dark:bg-amber-900/40' },
  premio: { bg: 'bg-emerald-500', icon: <Trophy className="w-6 h-6" />, label: 'PREMIO', border: 'border-emerald-400', glow: 'shadow-emerald-500/50', text: 'text-emerald-600', lightBg: 'bg-emerald-50 dark:bg-emerald-900/40' },
  penalizacion: { bg: 'bg-red-500', icon: <AlertTriangle className="w-6 h-6" />, label: 'PENALIZACIÓN', border: 'border-red-500', glow: 'shadow-red-500/50', text: 'text-red-600', lightBg: 'bg-red-50 dark:bg-red-900/40' },
};

// Paleta completa provista por el usuario. Cada modal usa un color a la vez (aleatorio).
const MODAL_BG_SURFACES = [
  'bg-[linear-gradient(155deg,rgba(210,39,55,0.32)_0%,rgba(15,23,42,0.95)_54%,rgba(2,6,23,0.98)_100%)]',
  'bg-[linear-gradient(155deg,rgba(246,143,42,0.32)_0%,rgba(15,23,42,0.95)_54%,rgba(2,6,23,0.98)_100%)]',
  'bg-[linear-gradient(155deg,rgba(251,181,33,0.32)_0%,rgba(15,23,42,0.95)_54%,rgba(2,6,23,0.98)_100%)]',
  'bg-[linear-gradient(155deg,rgba(1,123,188,0.34)_0%,rgba(15,23,42,0.95)_54%,rgba(2,6,23,0.98)_100%)]',
  'bg-[linear-gradient(155deg,rgba(5,165,225,0.34)_0%,rgba(15,23,42,0.95)_54%,rgba(2,6,23,0.98)_100%)]',
  'bg-[linear-gradient(155deg,rgba(202,223,56,0.32)_0%,rgba(15,23,42,0.95)_54%,rgba(2,6,23,0.98)_100%)]',
  'bg-[linear-gradient(155deg,rgba(58,173,72,0.32)_0%,rgba(15,23,42,0.95)_54%,rgba(2,6,23,0.98)_100%)]',
  'bg-[linear-gradient(155deg,rgba(219,18,150,0.34)_0%,rgba(15,23,42,0.95)_54%,rgba(2,6,23,0.98)_100%)]',
  'bg-[linear-gradient(155deg,rgba(127,44,132,0.34)_0%,rgba(15,23,42,0.95)_54%,rgba(2,6,23,0.98)_100%)]',
  'bg-[linear-gradient(155deg,rgba(93,23,235,0.34)_0%,rgba(15,23,42,0.95)_54%,rgba(2,6,23,0.98)_100%)]',
] as const;

const MODAL_BG_ORBS = [
  'bg-[#d22737]/46',
  'bg-[#f68f2a]/46',
  'bg-[#fbb521]/46',
  'bg-[#017bbc]/48',
  'bg-[#05a5e1]/48',
  'bg-[#cadf38]/46',
  'bg-[#3aad48]/46',
  'bg-[#db1296]/48',
  'bg-[#7f2c84]/48',
  'bg-[#5d17eb]/48',
] as const;

const MODAL_ACCENT_BORDERS = [
  'border-[#d22737]/42',
  'border-[#f68f2a]/42',
  'border-[#fbb521]/42',
  'border-[#017bbc]/42',
  'border-[#05a5e1]/42',
  'border-[#cadf38]/42',
  'border-[#3aad48]/42',
  'border-[#db1296]/42',
  'border-[#7f2c84]/42',
  'border-[#5d17eb]/42',
] as const;

const MODAL_ACCENT_SHADOWS = [
  'shadow-[0_26px_84px_-26px_rgba(210,39,55,0.58)]',
  'shadow-[0_26px_84px_-26px_rgba(246,143,42,0.58)]',
  'shadow-[0_26px_84px_-26px_rgba(251,181,33,0.58)]',
  'shadow-[0_26px_84px_-26px_rgba(1,123,188,0.58)]',
  'shadow-[0_26px_84px_-26px_rgba(5,165,225,0.58)]',
  'shadow-[0_26px_84px_-26px_rgba(202,223,56,0.58)]',
  'shadow-[0_26px_84px_-26px_rgba(58,173,72,0.58)]',
  'shadow-[0_26px_84px_-26px_rgba(219,18,150,0.58)]',
  'shadow-[0_26px_84px_-26px_rgba(127,44,132,0.58)]',
  'shadow-[0_26px_84px_-26px_rgba(93,23,235,0.58)]',
] as const;

const getRandomPaletteIndex = () => Math.floor(Math.random() * MODAL_BG_SURFACES.length);
export default function QuestionModal({ card, onAnswer, onComplete, onClose }: QuestionModalProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const modalScrollRef = useRef<HTMLDivElement | null>(null);
  const [paletteIndex, setPaletteIndex] = useState<number>(getRandomPaletteIndex);
  const audio = useAudio();
  const style = CARD_STYLES[card.type] || CARD_STYLES.pregunta;
  const modalBackgroundClass = MODAL_BG_SURFACES[paletteIndex];
  const modalOrbClass = MODAL_BG_ORBS[paletteIndex];
  const modalBorderClass = MODAL_ACCENT_BORDERS[paletteIndex];
  const modalShadowClass = MODAL_ACCENT_SHADOWS[paletteIndex];
  const isCompactViewport =
    viewport.width > 0 && (viewport.width < 860 || viewport.height < 940);
  const shouldUseNoScrollLayout = isCompactViewport && card.type === 'pregunta';
  const retoCompleteButtonClass = 'group relative flex flex-col items-center justify-center gap-3 p-6 bg-white dark:bg-slate-800 rounded-2xl border-2 border-emerald-200 dark:border-emerald-900 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all duration-300 cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/30 shadow-sm';
  const retoCompleteIconClass = 'w-10 h-10 transition-colors text-emerald-400 group-hover:text-emerald-500';

  // animación variants
  const slideUp = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', damping: 25, stiffness: 300 } },
    exit: { opacity: 0, scale: 0.95, y: -20, transition: { duration: 0.2 } }
  };

  const listItem = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({ opacity: 1, x: 0, transition: { delay: i * 0.1, type: 'spring', stiffness: 300, damping: 24 } })
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncViewport = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };

    syncViewport();
    window.addEventListener('resize', syncViewport);

    return () => {
      window.removeEventListener('resize', syncViewport);
    };
  }, []);

  useEffect(() => {
    // reinicio visual estado cada tiempo a nuevo carta abre to evitar obsoleta deshabilitada/respondida UI.
    setSelected(null);
    setAnswered(false);
    setIsCorrect(null);
    setIsSubmitting(false);
    setPaletteIndex(getRandomPaletteIndex());
    if (modalScrollRef.current) {
      modalScrollRef.current.scrollTop = 0;
    }
  }, [card.id, card.type]);

  const handleSubmitAnswer = async () => {
    if (selected === null) { sileo.error({ title: 'Selecciona una respuesta' }); return; }
    setIsSubmitting(true);
    const result = await onAnswer(selected, card.id);
    setIsSubmitting(false);
    // Cuando penalty_message es undefined en un resultado no correcto, significa que la solicitud
    // falló por sí misma (error de red, turno ya avanzado, etc.) — no que la respuesta
    // estuviera mal. En ese caso quien llamó ya mostró un toast de error, así que
    // cerramos el modal sin mostrar el mensaje engañoso de "Respuesta incorrecta".
    const wasRequestError = !result.is_correct && result.penalty_message === undefined;
    if (!wasRequestError) {
      setAnswered(true);
      setIsCorrect(result.is_correct);
    }
    if (result.is_correct) {
      audio.playCorrectAnswer();
      sileo.success({ title: `¡Correcto! +B/. ${result.points_earned} Balboa` });
    } else if (!wasRequestError) {
      audio.playWrongAnswer();
      const correctOption =
        typeof card.correctAnswer === 'number' && card.options?.[card.correctAnswer]
          ? card.options[card.correctAnswer]
          : null;
      sileo.error({
        title: result.penalty_message || 'Respuesta incorrecta',
        description: correctOption
          ? `Respuesta correcta: ${String.fromCharCode(65 + card.correctAnswer!)}. ${correctOption}`
          : undefined,
        duration: 5200,
      });
    }
    setTimeout(() => onClose(), result.is_correct ? 2500 : wasRequestError ? 1500 : 4200);
  };

  const handleRetoComplete = async (completed: boolean) => {
    setIsSubmitting(true);
    const result = await onComplete(completed, card.id);
    setAnswered(true);
    setIsCorrect(completed);
    setIsSubmitting(false);
    if (completed) {
      audio.playCorrectAnswer();
      sileo.success({ title: result.message || '¡Reto completado!' });
    } else {
      audio.playWrongAnswer();
      sileo.error({ title: result.message || 'Reto no completado' });
    }
    setTimeout(() => onClose(), 2500);
  };

  const handlePremioAccept = async () => {
    setIsSubmitting(true);
    const result = await onComplete(true, card.id);
    setAnswered(true);
    setIsCorrect(true);
    setIsSubmitting(false);
    audio.playCorrectAnswer();
    sileo.success({ title: result.message || '¡Premio obtenido!' });
    setTimeout(() => onClose(), 2500);
  };

  const handlePenalizacionAccept = async () => {
    setIsSubmitting(true);
    const result = await onComplete(false, card.id);
    setAnswered(true);
    setIsCorrect(false);
    setIsSubmitting(false);
    audio.playWrongAnswer();
    sileo.error({ title: result.message || 'Penalización aplicada' });
    setTimeout(() => onClose(), 2500);
  };

  return (
    <AnimatePresence>
      <m.div
        initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
        animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
        exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
        className="fixed inset-0 z-100 flex items-center justify-center px-2 py-3 sm:p-4 bg-slate-900/60 transition-all duration-300 overflow-y-auto overscroll-y-contain"
        onClick={!answered && !isSubmitting ? onClose : undefined}
      >
        <m.div
          ref={modalScrollRef}
          variants={slideUp}
          initial="hidden"
          animate="visible"
          exit="exit"
          className={`relative isolate my-auto w-full max-w-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/15 ring-1 ring-inset ring-white/8 overflow-x-hidden overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${modalShadowClass} ${shouldUseNoScrollLayout ? 'rounded-2xl p-3.5 max-h-[calc(100dvh-0.85rem)]' : 'rounded-3xl p-4 sm:p-6 md:p-8 max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)]'}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Decorative Banner */}
          <div className={`absolute top-0 left-0 right-0 h-2 ${style.bg}`} />

          {/* Fondo de un solo color aleatorio tomado de toda la paleta */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 bg-[#020617]" />
            <div className={`absolute inset-0 ${modalBackgroundClass}`} />
            <span className={`absolute -top-24 right-8 h-64 w-64 rounded-full blur-3xl ${modalOrbClass}`} />
            <span className={`absolute -bottom-24 -left-12 h-72 w-72 rounded-full blur-3xl ${modalOrbClass} opacity-80`} />
            <div className="absolute inset-0 bg-[linear-gradient(168deg,rgba(2,6,23,0.24)_0%,rgba(2,6,23,0.64)_100%)]" />
            <div className="absolute inset-0 bg-white/70 dark:bg-slate-950/50" />
          </div>
          <div
            className={`pointer-events-none absolute inset-0 ${shouldUseNoScrollLayout ? 'rounded-2xl' : 'rounded-3xl'} border ${modalBorderClass}`}
          />

          {/* Encabezado */}
          <div className={`relative z-10 flex flex-col items-center text-center ${shouldUseNoScrollLayout ? 'mb-3' : 'mb-5 sm:mb-8'}`}>
            <div className={`inline-flex items-center justify-center rounded-2xl ${style.lightBg} ${style.text} shadow-lg ring-1 ring-black/5 ${shouldUseNoScrollLayout ? 'p-2.5 mb-2' : 'p-4 mb-4'}`}>
              {style.icon}
            </div>
            <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase ${style.bg} text-white shadow-md ${shouldUseNoScrollLayout ? 'mb-2' : 'mb-3'}`}>
              {style.label}
              </div>
            <p className={`text-slate-500 dark:text-slate-400 uppercase tracking-widest font-semibold ${shouldUseNoScrollLayout ? 'text-xs mb-1.5' : 'text-sm mb-2'}`}>{card.province}</p>
            <h2 className={`font-extrabold text-slate-900 dark:text-white leading-tight text-center ${shouldUseNoScrollLayout ? 'text-[2rem] mb-2' : 'text-2xl md:text-3xl mb-4'}`}>
              {card.title}
            </h2>
            <div className={`w-16 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto ${shouldUseNoScrollLayout ? 'mb-3' : 'mb-6'}`} />
            <p className={`text-slate-600 dark:text-slate-300 font-medium text-center max-w-3xl mx-auto whitespace-pre-line wrap-break-word ${shouldUseNoScrollLayout ? 'text-base leading-[1.35] line-clamp-4' : 'text-lg leading-relaxed'}`}>
              {card.description}
            </p>
          </div>

          {/* contenido Body */}
          <div className="relative z-10 overflow-visible">
            {/* PREGUNTA: múltiple opción */}
            {card.type === 'pregunta' && card.options && (
              <div className={`${shouldUseNoScrollLayout ? 'space-y-3' : 'space-y-4'}`}>
                <div className={`${shouldUseNoScrollLayout
                  ? 'space-y-2 max-h-[40dvh] overflow-y-auto px-0.5 py-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'
                  : 'space-y-3 max-h-[44dvh] overflow-y-auto px-0.5 py-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'}`}>
                  {card.options.map((option, index) => {
                    const isSelected = selected === index;
                    const showCorrect = answered && index === card.correctAnswer;
                    const showWrong = answered && isSelected && !isCorrect;
                    
                    let itemClass = "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/80";
                    let iconNode = <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 mr-4 font-bold">{String.fromCharCode(65 + index)}</span>;

                    if (isSelected && !answered) {
                      itemClass = `border-blue-500 ring-1 ring-blue-500 ${style.lightBg} text-blue-900 dark:text-blue-100`;
                      iconNode = <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white mr-4 font-bold">{String.fromCharCode(65 + index)}</span>;
                    } else if (showCorrect) {
                      itemClass = "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500";
                      iconNode = <CheckCircle2 className="w-8 h-8 text-emerald-500 mr-4" />;
                    } else if (showWrong) {
                      itemClass = "border-red-500 bg-red-50 dark:bg-red-900/30 text-red-900 dark:text-red-100 ring-2 ring-red-500";
                      iconNode = <XCircle className="w-8 h-8 text-red-500 mr-4" />;
                    } else if (answered) {
                      // Dim non-selected items después answering
                      itemClass = "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 opacity-60";
                    }

                    return (
                      <RippleButton
                        key={index}
                        onClick={() => !answered && !isSubmitting && setSelected(index)}
                        disabled={answered || isSubmitting}
                        className={`w-full h-auto flex items-start rounded-2xl border-2 transition-all duration-200 ease-out text-left whitespace-normal focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 cursor-pointer disabled:cursor-not-allowed ${shouldUseNoScrollLayout ? 'min-h-16 p-2.5' : 'min-h-21 md:min-h-18 p-3.5 md:p-4'} ${itemClass}`}
                      >
                        <div className="flex items-start w-full min-w-0">
                          <div className="shrink-0">{iconNode}</div>
                          <span className={`font-medium flex-1 min-w-0 whitespace-normal wrap-break-word pr-1 ${shouldUseNoScrollLayout ? 'text-[15px] leading-[1.32] line-clamp-2' : 'text-base md:text-lg leading-[1.4]'}`}>
                            {option}
                          </span>
                        </div>
                      </RippleButton>
                    );
                  })}
                </div>

                {answered && typeof card.correctAnswer === 'number' && card.options?.[card.correctAnswer] && (
                  <m.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-2xl border px-4 py-3 text-sm md:text-base text-center ${isCorrect
                      ? 'border-emerald-500/60 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200'
                      : 'border-amber-400/60 bg-amber-50 dark:bg-amber-900/25 text-amber-800 dark:text-amber-200'}`}
                  >
                    {isCorrect ? (
                      <span>Respuesta correcta confirmada: <strong>{String.fromCharCode(65 + card.correctAnswer)}. {card.options[card.correctAnswer]}</strong></span>
                    ) : (
                      <span>La respuesta correcta era: <strong>{String.fromCharCode(65 + card.correctAnswer)}. {card.options[card.correctAnswer]}</strong></span>
                    )}
                  </m.div>
                )}

                <div className={`z-20 mt-1 rounded-2xl border border-white/12 bg-slate-900/35 p-2 sm:p-2.5 flex flex-col sm:flex-row gap-3 sm:gap-4`}>
                  {!answered && (
                    <RippleButton 
                      onClick={onClose} 
                      disabled={isSubmitting}
                      variant="outline"
                      className={`rounded-xl font-bold text-slate-900 dark:text-slate-100 border-slate-300/70 dark:border-slate-600 bg-white/85 dark:bg-slate-800/75 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50 ${shouldUseNoScrollLayout ? 'px-5 py-3' : 'px-6 py-3.5'}`}
                    >
                      Cancelar
                    </RippleButton>
                  )}
                  <RippleButton 
                    onClick={handleSubmitAnswer} 
                    disabled={selected === null || answered || isSubmitting}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-xl font-bold text-white transition-all shadow-lg cursor-pointer ${shouldUseNoScrollLayout ? 'py-3.5' : 'py-4'}
                      ${selected !== null && !answered ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25' : 'bg-slate-300 dark:bg-slate-700 shadow-none cursor-not-allowed'}`}
                  >
                    {isSubmitting ? (
                      <span className="animate-pulse">Procesando...</span>
                    ) : answered ? (
                      'Respondido'
                    ) : (
                      <>Confirmar Respuesta <ArrowRight className="w-5 h-5 ml-2" /></>
                    )}
                  </RippleButton>
                </div>
              </div>
            )}

            {/* RETO: Complete / no complete */}
            {card.type === 'reto' && (
              <div className="pt-4">
                {!answered ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <RippleButton 
                        onClick={() => handleRetoComplete(false)}
                        disabled={isSubmitting}
                        className="group relative flex flex-col items-center justify-center gap-3 p-6 bg-white dark:bg-slate-800 rounded-2xl border-2 border-red-200 dark:border-red-900 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-300 cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-red-500/30 shadow-sm"
                      >
                        <XCircle className="w-10 h-10 text-red-400 group-hover:text-red-500 transition-colors" />
                        <span className="font-bold text-red-600 dark:text-red-400 text-lg">No Completado</span>
                      </RippleButton>
                      
                      <RippleButton 
                        onClick={() => handleRetoComplete(true)}
                        disabled={isSubmitting}
                        className={retoCompleteButtonClass}
                      >
                        <CheckCircle2 className={retoCompleteIconClass} />
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-lg">Reto Superado</span>
                      </RippleButton>
                    </div>
                  </div>
                ) : (
                  <m.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`w-full flex items-center justify-center gap-3 p-6 rounded-2xl font-bold text-xl border-2 ${isCorrect ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-red-50 border-red-500 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}
                  >
                    {isCorrect ? <><CheckCircle2 className="w-8 h-8" /> <Sparkles className="w-6 h-6" /> ¡Reto Completado!</> : <><XCircle className="w-8 h-8" /> <CircleSlash className="w-6 h-6" /> No se completó el reto</>}
                  </m.div>
                )}
              </div>
            )}

            {/* PREMIO: Accept button */}
            {card.type === 'premio' && (
              <div className="pt-4">
                {!answered ? (
                  <RippleButton 
                    onClick={handlePremioAccept}
                    disabled={isSubmitting}
                    className="group w-full flex items-center justify-center gap-3 bg-emerald-500 text-white p-6 rounded-2xl font-black text-xl hover:bg-emerald-600 transition-all shadow-lg cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/30"
                  >
                    <Trophy className="w-8 h-8 animate-bounce" />
                    ¡Recibir Premio!
                  </RippleButton>
                ) : (
                  <m.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-full flex items-center justify-center gap-3 p-6 rounded-2xl bg-emerald-50 border-2 border-emerald-500 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 font-bold text-xl"
                  >
                    <CheckCircle2 className="w-8 h-8" /> <Sparkles className="w-6 h-6" /> ¡Premio Obtenido!
                  </m.div>
                )}
              </div>
            )}

            {/* PENALIZACION: Auto-aplicar */}
            {card.type === 'penalizacion' && (
              <div className="pt-4">
                {!answered ? (
                  <RippleButton 
                    onClick={handlePenalizacionAccept}
                    disabled={isSubmitting}
                    className="group w-full flex items-center justify-center gap-3 bg-red-500 text-white p-6 rounded-2xl font-black text-xl hover:bg-red-600 transition-all shadow-lg cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-red-500/30"
                  >
                    <AlertTriangle className="w-8 h-8" />
                    😢 Aceptar Penalización
                  </RippleButton>
                ) : (
                  <m.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-full flex items-center justify-center gap-3 p-6 rounded-2xl bg-red-50 border-2 border-red-500 text-red-700 dark:bg-red-900/30 dark:text-red-300 font-bold text-xl"
                  >
                    <AlertTriangle className="w-8 h-8" /> Penalización Aplicada
                  </m.div>
                )}
              </div>
            )}
          </div>
        </m.div>
      </m.div>
    </AnimatePresence>
  );
}
