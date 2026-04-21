import type { ChartLayout, GraphDataPoint, GraphSeries, GraphWidthOptions } from './pdfx-graph.types';
import type { usePdfxTheme } from '../../../lib/pdfx-theme-context';

type PdfxTheme = ReturnType<typeof usePdfxTheme>;

/** Ancho estándar de página A4 en puntos PDF. */
export const A4_WIDTH = 595;

/**
 * Pre-calculated safe graph widths para common scenarios.
 * These valores work con todas built-en themes on A4 pages.
 */
export const GRAPH_SAFE_WIDTHS = {
  /** Ancho seguro para gráfica directamente en contenido de página (sin contenedores extra) */
  default: 420,
  /** Ancho seguro para gráfica dentro de una Section con padding md */
  inSection: 400,
  /** Ancho seguro para gráfica dentro de una Section + contenedor con borde (como graphShell) */
  inSectionWithWrapper: 380,
} as const;

/**
 * calcular the safe graph grosor según on theme page márgenes y container context.
 *
 * This utility ensures graphs don't overflow their container by accounting para:
 * - Page márgenes (from theme)
 * - Container padding (e.g., Section component)
 * - Wrapper padding (e.g., a bordered graphShell View)
 *
 * @example
 * ```tsx
 * const grosor = getGraphWidth(theme);
 * // Para una gráfica dentro de una Section con padding="md" (12pt) y graphShell (12pt):
 * const grosor = getGraphWidth(theme, { containerPadding: 12, wrapperPadding: 12 });
 * ```
 */
export function getGraphWidth(theme: PdfxTheme, options: GraphWidthOptions = {}): number {
  const { containerPadding = 0, wrapperPadding = 0, pageWidth = A4_WIDTH } = options;
  const { marginLeft, marginRight } = theme.spacing.page;
  const availableWidth =
    pageWidth - marginLeft - marginRight - containerPadding * 2 - wrapperPadding * 2;
  return Math.max(Math.floor(availableWidth), 100);
}

export const CHART_MARGINS = {
  axisLeft: 40,
  pieLeft: 10,
  right: 10,
  top: 10,
  axisBottom: 24,
  pieBottom: 10,
} as const;

/** Normaliza para trabajar siempre con GraphSeries[]. */
export function normalizeData(data: GraphDataPoint[] | GraphSeries[]): GraphSeries[] {
  if (data.length === 0) return [];
  if ('label' in data[0] && 'value' in data[0]) {
    return [{ name: 'Series 1', data: data as GraphDataPoint[] }];
  }
  return data as GraphSeries[];
}

/** Calcula marcas agradables del eje Y para un rango dado. */
export function computeYTicks(min: number, max: number, count: number): number[] {
  if (min === max) return [0, max || 1];
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, i) => {
    const v = min + i * step;
    return Math.round(v * 100) / 100;
  });
}

/** Da formato a un número para mostrarlo en etiquetas de eje. */
export function fmtNum(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  if (!Number.isInteger(v)) return v.toFixed(1);
  return String(v);
}

/** Recorta una etiqueta a un máximo de maxLen caracteres. */
export function truncate(s: string, maxLen: number): string {
  return s.length > maxLen ? `${s.slice(0, maxLen - 1)}…` : s;
}

/** Conversión de coordenadas polares a cartesianas para arcos de pie/donut. */
export function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** Construye una ruta de arco SVG para un segmento de pie/donut. */
export function arcPath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
  innerR = 0
): string {
  const safeEnd = Math.min(endAngle, startAngle + 359.999);
  const large = safeEnd - startAngle > 180 ? 1 : 0;
  const s = polarToCartesian(cx, cy, r, safeEnd);
  const e = polarToCartesian(cx, cy, r, startAngle);
  if (innerR === 0) {
    return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y} Z`;
  }
  const si = polarToCartesian(cx, cy, innerR, safeEnd);
  const ei = polarToCartesian(cx, cy, innerR, startAngle);
  return [
    `M ${s.x} ${s.y}`,
    `A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y}`,
    `L ${ei.x} ${ei.y}`,
    `A ${innerR} ${innerR} 0 ${large} 1 ${si.x} ${si.y}`,
    'Z',
  ].join(' ');
}

/** Calcula puntos de control bezier suaves (Catmull-Rom → bezier cúbica). */
export function smoothPath(points: { x: number; y: number }[], tension = 0.4): string {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }
  const parts: string[] = [`M ${points[0].x} ${points[0].y}`];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;
    parts.push(`C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`);
  }
  return parts.join(' ');
}

/** Obtiene la paleta de colores de gráfica por defecto desde el tema. */
export function getDefaultPalette(t: PdfxTheme): string[] {
  return [
    t.colors.primary,
    t.colors.info ?? '#3B82F6',
    t.colors.success ?? '#22C55E',
    t.colors.warning ?? '#F59E0B',
    t.colors.destructive ?? '#EF4444',
    '#8B5CF6',
    '#F97316',
    '#14B8A6',
  ];
}

/** Deriva ChartLayout desde datos de series, dimensiones SVG y variante. */
export function buildLayout(
  series: GraphSeries[],
  width: number,
  height: number,
  isPieOrDonut: boolean,
  yTickCount: number
): ChartLayout {
  const mL = isPieOrDonut ? CHART_MARGINS.pieLeft : CHART_MARGINS.axisLeft;
  const mB = isPieOrDonut ? CHART_MARGINS.pieBottom : CHART_MARGINS.axisBottom;
  const chartX = mL;
  const chartY = CHART_MARGINS.top;
  const chartW = width - mL - CHART_MARGINS.right;
  const chartH = height - CHART_MARGINS.top - mB;
  const allValues = series.flatMap((s) => s.data.map((d) => d.value));
  const rawMin = Math.min(...allValues, 0);
  const rawMax = Math.max(...allValues, 1);
  const yMin = rawMin >= 0 ? 0 : rawMin;
  const yMax = rawMax + (rawMax - yMin) * 0.08;
  return {
    svgW: width,
    svgH: height,
    chartX,
    chartY,
    chartW,
    chartH,
    yMin,
    yMax,
    yTicks: computeYTicks(yMin, yMax, yTickCount),
    xLabels: series[0]?.data.map((d) => d.label) ?? [],
  };
}
