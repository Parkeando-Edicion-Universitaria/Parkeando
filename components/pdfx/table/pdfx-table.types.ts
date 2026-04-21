import type { Style } from '@react-pdf/types';
import type React from 'react';

/** Variante de estilo visual de tabla. */
export type TableVariant =
  | 'line'
  | 'grid'
  | 'minimal'
  | 'striped'
  | 'compact'
  | 'bordered'
  | 'primary-header';

/**
 * Contenedor de tabla con variantes de estilo visual y zebra striping opcional.
 * Props: `variant` | `zebraStripe` | `noWrap` | `children` | `style`
 * @see {@link TableProps}
 */
export interface TableProps {
  /** Estilos personalizados para combinar con los valores por defecto del componente */
  style?: Style;
  /** Contenido a renderizar */
  children: React.ReactNode;
  /**
   * @default 'line'
   */
  variant?: TableVariant;
  /**
   * @default false
   */
  zebraStripe?: boolean;
  /**
   * @default false
   */
  noWrap?: boolean;
}

export interface TableSectionProps {
  /** Estilos personalizados para combinar con los valores por defecto del componente */
  style?: Style;
  /** Contenido a renderizar */
  children: React.ReactNode;
}

/**
 * Fila de tabla con estados opcionales de encabezado, pie y zebra.
 * Props: `header` | `footer` | `stripe` | `variant` | `children` | `style`
 * @see {@link TableRowProps}
 */
export interface TableRowProps {
  /** Estilos personalizados para combinar con los valores por defecto del componente */
  style?: Style;
  /** Contenido a renderizar */
  children: React.ReactNode;
  header?: boolean;
  footer?: boolean;
  stripe?: boolean;
  variant?: TableVariant;
}

/**
 * Celda de tabla con alineación, ancho fijo y estilo de texto para encabezado o pie.
 * Props: `header` | `footer` | `align` | `width` | `variant` | `_last` | `children` | `style`
 * @see {@link TableCellProps}
 */
export interface TableCellProps {
  /** Estilos personalizados para combinar con los valores por defecto del componente */
  style?: Style;
  /** Contenido a renderizar */
  children: React.ReactNode;
  header?: boolean;
  footer?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string | number;
  variant?: TableVariant;
  _last?: boolean;
}
