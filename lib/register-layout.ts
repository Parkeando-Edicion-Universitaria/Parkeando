type RegisterLayoutPlan = {
  shouldUseCompactLayout: boolean;
  estimatedHeight: number;
};

type RegisterLayoutInput = {
  viewportWidth: number;
  viewportHeight: number;
};

const MIN_LAYOUT_WIDTH = 280;
const MAX_LAYOUT_WIDTH = 420;
const HORIZONTAL_GUTTER = 24;
const VERTICAL_BUFFER = 28;

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

export async function computeRegisterLayoutPlan({
  viewportWidth,
  viewportHeight,
}: RegisterLayoutInput): Promise<RegisterLayoutPlan> {
  if (viewportWidth <= 0 || viewportHeight <= 0) {
    return { shouldUseCompactLayout: false, estimatedHeight: 0 };
  }

  const constrainedWidth = Math.max(
    MIN_LAYOUT_WIDTH,
    Math.min(MAX_LAYOUT_WIDTH, viewportWidth - HORIZONTAL_GUTTER),
  );

  try {
    const { computeLayout } = await getTextura();
    const isVeryNarrow = viewportWidth < 380;

    const tree = {
      width: constrainedWidth,
      flexDirection: 'column' as const,
      gap: isVeryNarrow ? 20 : 28,
      children: [
        {
          flexDirection: 'column' as const,
          gap: 8,
          children: [
            {
              text: 'Parkeando',
              font: isVeryNarrow
                ? '900 46px ui-sans-serif, system-ui, sans-serif'
                : '900 56px ui-sans-serif, system-ui, sans-serif',
              lineHeight: isVeryNarrow ? 52 : 60,
            },
            {
              text: 'Crea tu cuenta para empezar',
              font: '500 16px ui-sans-serif, system-ui, sans-serif',
              lineHeight: 22,
            },
          ],
        },
        {
          flexDirection: 'column' as const,
          gap: 14,
          padding: isVeryNarrow ? 16 : 24,
          children: [
            { height: 30 },
            { height: 76 },
            { height: 100 },
            { height: 120 },
            { height: 76 },
            { height: 108 },
            { height: isVeryNarrow ? 82 : 90 },
            { height: 48 },
            { height: 24 },
          ],
        },
      ],
    };

    const geometry = computeLayout(tree);
    const estimatedHeight = Math.ceil(geometry.height + VERTICAL_BUFFER);

    return {
      shouldUseCompactLayout: estimatedHeight > viewportHeight,
      estimatedHeight,
    };
  } catch {
    // respaldo heurística si textura is unavailable en runtime.
    const heuristicCompact = viewportHeight < 860 || viewportWidth < 370;
    return {
      shouldUseCompactLayout: heuristicCompact,
      estimatedHeight: heuristicCompact ? viewportHeight + 1 : viewportHeight - 1,
    };
  }
}
