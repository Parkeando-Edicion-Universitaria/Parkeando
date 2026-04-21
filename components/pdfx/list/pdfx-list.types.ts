import type { Style } from '@react-pdf/types';

/** List visual style variante. */
export type ListVariant =
  | 'bullet'
  | 'numbered'
  | 'checklist'
  | 'icon'
  | 'multi-level'
  | 'descriptive';

/**
 * A single list item, optionally con anidados children.
 * Props - `texto` | `descripción` | `checked` | `children`
 * @see {@link ListItem}
 */
export interface ListItem {
  text: string;
  description?: string;
  checked?: boolean;
  children?: ListItem[];
}

/**
 * List of items con múltiple style variants including viñeta, numbered, checklist, y descriptive.
 * Props - `items` | `variante` | `gap` | `style` | `_level` | `noWrap`
 * @see {@link PdfListProps}
 */
export interface PdfListProps {
  items: ListItem[];
  /**
   * @default 'viñeta'
   */
  variant?: ListVariant;
  /**
   * @default 'sm'
   */
  gap?: 'xs' | 'sm' | 'md';
  style?: Style;
  _level?: number;
  /**
   * @default false
   */
  noWrap?: boolean;
}
