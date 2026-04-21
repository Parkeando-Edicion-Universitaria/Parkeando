import type React from 'react';
import type { TableVariant } from '../table/pdfx-table.types';
import type { Style } from '@react-pdf/types';

/** Tamaño de densidad de filas en DataTable. */
export type DataTableSize = 'default' | 'compact';

/**
 * Column definition para a DataTable.
 * Props - `key` | `encabezado` | `align` | `grosor` | `renderiza` | `renderFooter`
 * @see {@link DataTableColumn}
 */
export interface DataTableColumn<T = Record<string, unknown>> {
  key: keyof T & string;
  header: string;
  align?: 'left' | 'center' | 'right';
  width?: string | number;
  /**
   * personalizadas cell renderer. Must return @react-pdf/renderer elements (texto, View,
   * Image, etc.) — no HTML DOM elements. TypeScript accepts ReactNode but DOM
   * nodes se crash at runtime en the PDF renderer.
   */
  render?: (value: unknown, row: T) => React.ReactNode;
  /**
   * personalizadas footer cell renderer. misma constraint: return @react-pdf/renderer
   * elements solo — no HTML/DOM nodes.
   */
  renderFooter?: (value: unknown) => React.ReactNode;
}

/**
 * datos table para PDF rendering con column definitions, footer soporte, y stripe options.
 * Props - `columns` | `datos` | `variante` | `footer` | `stripe` | `size` | `noWrap` | `style`
 * @see {@link DataTableProps}
 */
export interface DataTableProps<T = Record<string, unknown>> {
  /** Estilos personalizados para combinar con los valores por defecto del componente */
  style?: Style;
  columns: DataTableColumn<T>[];
  data: T[];
  /**
   * @default 'grid'
   */
  variant?: TableVariant;
  footer?: Partial<Record<keyof T & string, string | number>>;
  stripe?: boolean;
  /**
   * @default 'default'
   */
  size?: DataTableSize;
  noWrap?: boolean;
}
