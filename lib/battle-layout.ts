type RouletteSizePreset = 'sm' | 'md' | 'lg';

export interface BattleLayoutPlan {
  sizePreset: RouletteSizePreset;
  compact: boolean;
  titleMaxWidth: number;
  messageMaxWidth: number;
}

interface BattleLayoutInput {
  viewportWidth: number;
  viewportHeight: number;
  headline: string;
  message: string;
}

const MIN_LAYOUT_WIDTH = 280;
const MAX_LAYOUT_WIDTH = 520;
const HORIZONTAL_GUTTER = 24;

let texturaModulePromise: Promise<typeof import('textura')> | null = null;
let texturaReadyPromise: Promise<typeof import('textura')> | null = null;

async function getTextura() {
  if (!texturaModulePromise) {
    texturaModulePromise = import('textura');
  }

  const textura = await texturaModulePromise;

  if (!texturaReadyPromise) {
    texturaReadyPromise = textura.init().then(() => textura);
  }

  return texturaReadyPromise;
}

function choosePreset(wheelBudget: number): RouletteSizePreset {
  if (wheelBudget >= 320) return 'lg';
  if (wheelBudget >= 255) return 'md';
  return 'sm';
}

export async function computeBattleLayoutPlan({
  viewportWidth,
  viewportHeight,
  headline,
  message,
}: BattleLayoutInput): Promise<BattleLayoutPlan> {
  if (viewportWidth <= 0 || viewportHeight <= 0) {
    return {
      sizePreset: 'md',
      compact: false,
      titleMaxWidth: 260,
      messageMaxWidth: 280,
    };
  }

  const constrainedWidth = Math.max(
    MIN_LAYOUT_WIDTH,
    Math.min(MAX_LAYOUT_WIDTH, viewportWidth - HORIZONTAL_GUTTER)
  );

  try {
    const { computeLayout } = await getTextura();
    const isNarrow = constrainedWidth < 360;

    // Estima el contenido fuera de la ruleta con Textura para elegir un tamaño seguro de ruleta.
    const tree = {
      width: constrainedWidth,
      padding: isNarrow ? 16 : 24,
      flexDirection: 'column' as const,
      gap: isNarrow ? 12 : 16,
      children: [
        {
          text: 'BATALLA EN CASILLA',
          font: '700 13px ui-sans-serif, system-ui, sans-serif',
          lineHeight: 18,
        },
        {
          text: 'JUEGA VIVO',
          font: isNarrow
            ? '900 44px ui-sans-serif, system-ui, sans-serif'
            : '900 52px ui-sans-serif, system-ui, sans-serif',
          lineHeight: isNarrow ? 48 : 56,
        },
        {
          text: headline,
          font: isNarrow
            ? '800 18px ui-sans-serif, system-ui, sans-serif'
            : '800 20px ui-sans-serif, system-ui, sans-serif',
          lineHeight: isNarrow ? 26 : 30,
        },
        {
          text: message,
          font: isNarrow
            ? '800 20px ui-sans-serif, system-ui, sans-serif'
            : '800 24px ui-sans-serif, system-ui, sans-serif',
          lineHeight: isNarrow ? 28 : 34,
        },
        { height: isNarrow ? 64 : 74 },
      ],
    };

    const geometry = computeLayout(tree);
    const staticHeight = Math.ceil(geometry.height);

    // Reserva la altura restante para la ruleta + márgenes.
    const wheelBudget = Math.max(220, viewportHeight - staticHeight - 120);
    const sizePreset = choosePreset(wheelBudget);
    const shouldCompact = wheelBudget < 280 || viewportHeight < 860 || viewportWidth < 430;

    return {
      sizePreset,
      compact: shouldCompact,
      titleMaxWidth: Math.max(190, constrainedWidth - (isNarrow ? 36 : 70)),
      messageMaxWidth: Math.max(220, constrainedWidth - (isNarrow ? 26 : 56)),
    };
  } catch {
    // Respaldo determinista si Textura falla al inicializar.
    const isCompact = viewportWidth < 430 || viewportHeight < 820;
    return {
      sizePreset: isCompact ? 'sm' : viewportWidth > 440 ? 'lg' : 'md',
      compact: isCompact,
      titleMaxWidth: isCompact ? 236 : 280,
      messageMaxWidth: isCompact ? 250 : 310,
    };
  }
}
