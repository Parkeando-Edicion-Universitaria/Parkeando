import type { Style } from '@react-pdf/types';

/**
 * Options para calculating graph grosor según on theme page márgenes y container context.
 * Props - `containerPadding` | `wrapperPadding` | `pageWidth`
 * @see {@link GraphWidthOptions}
 */
export interface GraphWidthOptions {
  containerPadding?: number;
  wrapperPadding?: number;
  pageWidth?: number;
}

export type GraphVariant = 'bar' | 'horizontal-bar' | 'line' | 'area' | 'pie' | 'donut';

export type GraphLegendPosition = 'bottom' | 'right' | 'none';

/**
 * Un punto de datos con etiqueta, valor numérico y sobrescritura opcional de color.
 * Props: `label` | `value` | `color`
 * @see {@link GraphDataPoint}
 */
export interface GraphDataPoint {
  label: string;
  value: number;
  color?: string;
}

/**
 * A named datos series containing múltiple datos puntos, usados para multi-series charts.
 * Props - `nombre` | `datos` | `color`
 * @see {@link GraphSeries}
 */
export interface GraphSeries {
  name: string;
  data: GraphDataPoint[];
  color?: string;
}

/**
 * Multi-variante PDF chart (barra, line, area, pie, donut) rendered con SVG primitives.
 * Props - `variante` | `datos` | `title` | `subtitle` | `xLabel` | `yLabel` | `grosor` | `altura` | `fullWidth` | `containerPadding` | `wrapperPadding` | `colores` | `showValues` | `showGrid` | `legend` | `centerLabel` | `showDots` | `smooth` | `yTicks` | `noWrap` | `style`
 * @see {@link GraphProps}
 */
export interface GraphProps {
  /**
   * @default 'barra'
   */
  variant?: GraphVariant;
  data: GraphDataPoint[] | GraphSeries[];
  title?: string;
  subtitle?: string;
  xLabel?: string;
  yLabel?: string;
  /**
   * @default 420
   */
  width?: number;
  /**
   * @default 260
   */
  height?: number;
  /**
   * @default false
   */
  fullWidth?: boolean;
  containerPadding?: number;
  wrapperPadding?: number;
  colors?: string[];
  /**
   * @default false
   */
  showValues?: boolean;
  /**
   * @default true
   */
  showGrid?: boolean;
  /**
   * @default 'bottom'
   */
  legend?: GraphLegendPosition;
  centerLabel?: string;
  /**
   * @default true
   */
  showDots?: boolean;
  /**
   * @default false
   */
  smooth?: boolean;
  /**
   * @default 5
   */
  yTicks?: number;
  /**
   * @default true
   */
  noWrap?: boolean;
  style?: Style;
}

/** Dimensiones internas del diseño del gráfico calculadas desde props y datos. */
export interface ChartLayout {
  svgW: number;
  svgH: number;
  chartX: number;
  chartY: number;
  chartW: number;
  chartH: number;
  yMin: number;
  yMax: number;
  yTicks: number[];
  xLabels: string[];
}
