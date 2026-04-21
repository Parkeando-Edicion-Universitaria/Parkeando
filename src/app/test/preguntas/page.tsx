'use client';

import { useMemo, useState } from 'react';
import QuestionModal from '@/components/game/QuestionModal';
import { GAME_CARDS } from '@/data/game-cards';
import type { GameCard } from '@/types/game';
import { TestIcon } from '@/components/test/TestIcons';

type QuestionLikeCard = GameCard & {
  type: 'pregunta';
  options: string[];
  correctAnswer: number;
};

const LONG_QUESTION_CARD: QuestionLikeCard = {
  id: 'qa-question-modal-long-text',
  cellPosition: 999,
  province: 'QA Visual',
  type: 'pregunta',
  title: 'Pregunta de texto largo para stress test del modal',
  description:
    'Este escenario de prueba esta hecho para validar como se comportan los cortes de linea, los paddings y las opciones cuando el contenido es mucho mas largo de lo normal en pantallas pequenas y tambien en desktop.',
  options: [
    'Opcion A con una frase extensa para revisar truncado, line clamp y legibilidad en espacios reducidos.',
    'Opcion B con un texto intermedio para comparar altura y consistencia entre tarjetas del listado.',
    'Opcion C mas corta, pero aun suficiente para probar estados seleccionados y foco visual.',
    'Opcion D con una descripcion larga para asegurar que no rompe el layout del boton ni del contenido.',
  ],
  correctAnswer: 1,
  onCorrect: { advanceCells: 2 },
  onIncorrect: { advanceCells: -2 },
};

const QUESTION_CARDS: QuestionLikeCard[] = GAME_CARDS.filter(
  (card): card is QuestionLikeCard =>
    card.type === 'pregunta' &&
    Array.isArray(card.options) &&
    card.options.length > 1 &&
    typeof card.correctAnswer === 'number'
);

const QUESTION_PRESETS: Array<{ id: string; label: string; card: QuestionLikeCard }> = [
  {
    id: LONG_QUESTION_CARD.id,
    label: 'QA: texto largo (stress test)',
    card: LONG_QUESTION_CARD,
  },
  ...QUESTION_CARDS.slice(0, 24).map((card) => ({
    id: card.id,
    label: `${card.cellPosition}. ${card.province} - ${card.title}`,
    card,
  })),
];

const answerLetter = (index: number) => String.fromCharCode(65 + index);

export default function TestPreguntasPage() {
  const [selectedPresetId, setSelectedPresetId] = useState(QUESTION_PRESETS[0]?.id ?? LONG_QUESTION_CARD.id);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [lastResult, setLastResult] = useState('Sin respuestas todavia.');

  const selectedCard = useMemo(() => {
    const preset = QUESTION_PRESETS.find((item) => item.id === selectedPresetId);
    return preset?.card ?? LONG_QUESTION_CARD;
  }, [selectedPresetId]);

  const openPreview = () => {
    setShowQuestionModal(true);
  };

  const closePreview = () => {
    setShowQuestionModal(false);
  };

  const handleAnswer = async (answer: number) => {
    await new Promise((resolve) => {
      window.setTimeout(resolve, 420);
    });

    const isCorrect = answer === selectedCard.correctAnswer;
    const pointsEarned = isCorrect ? 3 : 0;

    setLastResult(
      isCorrect
        ? `Correcto. Se selecciono ${answerLetter(answer)} y la respuesta correcta era ${answerLetter(selectedCard.correctAnswer)}.`
        : `Incorrecto. Se selecciono ${answerLetter(answer)} y la correcta era ${answerLetter(selectedCard.correctAnswer)}.`
    );

    return {
      is_correct: isCorrect,
      points_earned: pointsEarned,
      penalty_message: isCorrect ? undefined : 'Respuesta incorrecta en sandbox de QA.',
      new_position: undefined,
    };
  };

  const handleComplete = async () => {
    await new Promise((resolve) => {
      window.setTimeout(resolve, 280);
    });

    return {
      success: true,
      message: 'Accion de prueba completada.',
      new_position: undefined,
    };
  };

  return (
    <main className="p-4 text-foreground sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-cyan-300/20 bg-slate-900/75 p-6 shadow-[0_25px_90px_rgba(6,182,212,0.18)] backdrop-blur-md md:p-8">
          <div className="pointer-events-none absolute inset-0 opacity-80">
            <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
            <div className="absolute top-8 right-0 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl" />
            <div className="absolute -bottom-20 left-1/3 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-size-[42px_42px]" />
          </div>

          <div className="relative z-10 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/35 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-cyan-100">
              <TestIcon name="stars" className="h-3.5 w-3.5" />
              QA Visual Lab
            </span>
            <h1 className="text-2xl font-black tracking-tight text-white md:text-3xl lg:text-4xl">
              Test de Question Modal
            </h1>
          </div>

          <p className="relative z-10 mt-3 max-w-3xl text-sm text-white/80 md:text-base leading-relaxed">
            Esta vista permite abrir el modal de preguntas con cartas reales y un caso de texto largo para revisar
            como se ve en movil y desktop.
          </p>

          <div className="relative z-10 mt-6 grid gap-4 md:grid-cols-[1.2fr_1fr]">
            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/70">Pregunta de prueba</span>
              <select
                value={selectedPresetId}
                onChange={(event) => setSelectedPresetId(event.target.value)}
                className="w-full rounded-xl border border-white/20 bg-black/35 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-300"
              >
                {QUESTION_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id} className="bg-slate-900 text-white">
                    {preset.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={openPreview}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 font-bold text-slate-950 transition hover:bg-cyan-400"
              >
                <TestIcon name="questionCircle" className="h-5 w-5" />
                Abrir Question Modal
              </button>
            </label>

            <div className="rounded-2xl border border-white/15 bg-black/25 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/65">Preview</p>
              <p className="mt-2 text-base font-bold text-white">{selectedCard.title}</p>
              <p className="mt-1 text-sm text-white/75">
                {selectedCard.province} - Casilla {selectedCard.cellPosition}
              </p>
              <p className="mt-3 text-sm text-white/90">{selectedCard.description}</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-white/65">Respuesta correcta</p>
              <p className="mt-1 text-sm text-emerald-300">
                {answerLetter(selectedCard.correctAnswer)}. {selectedCard.options[selectedCard.correctAnswer]}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-950/65 p-5 backdrop-blur-sm">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
            <TestIcon name="testTube" className="h-4 w-4 text-cyan-300" />
            Ultimo resultado de prueba
          </p>
          <p className="mt-2 text-sm leading-relaxed text-foreground/90">{lastResult}</p>
        </section>
      </div>

      {showQuestionModal && (
        <QuestionModal
          card={selectedCard}
          onAnswer={handleAnswer}
          onComplete={handleComplete}
          onClose={closePreview}
        />
      )}
    </main>
  );
}