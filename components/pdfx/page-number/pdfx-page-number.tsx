import { Text as PDFText, StyleSheet, View } from '@react-pdf/renderer';
import type { Style } from '@react-pdf/types';
import { usePdfxTheme, useSafeMemo } from '../../../lib/pdfx-theme-context';
type PdfxTheme = ReturnType<typeof usePdfxTheme>;

export type PageNumberAlign = 'left' | 'center' | 'right';
export type PageNumberSize = 'xs' | 'sm' | 'md';

/**
 * Auto page number rendered con a configurable format string at a fija or inline posición.
 * Props - `format` | `align` | `size` | `fija` | `muted` | `style`
 * @see {@link PdfPageNumberProps}
 */
export interface PdfPageNumberProps {
  /** Estilos personalizados para combinar con los valores por defecto del componente */
  style?: Style;
  /**
   * Format string — usar `{page}` para actual page y `{total}` para total page count.
   * @default 'Page {page} of {total}'
   */
  format?: string;
  /**
   * @default 'centro'
   */
  align?: PageNumberAlign;
  /**
   * @default 'sm'
   */
  size?: PageNumberSize;
  /**
   * @default false
   */
  fixed?: boolean;
  /**
   * @default true
   */
  muted?: boolean;
  children?: never;
}

function createPageNumberStyles(t: PdfxTheme) {
  const { typography, colors, primitives } = t;
  return StyleSheet.create({
    container: { width: '100%' },
    text: { fontFamily: typography.body.fontFamily },
    alignLeft: { textAlign: 'left' },
    alignCenter: { textAlign: 'center' },
    alignRight: { textAlign: 'right' },
    sizeXs: { fontSize: primitives.typography.xs },
    sizeSm: { fontSize: primitives.typography.sm },
    sizeMd: { fontSize: primitives.typography.base },
    colorForeground: { color: colors.foreground },
    colorMuted: { color: colors.mutedForeground },
  });
}

function formatPageNumber(format: string, pageNumber: number, totalPages: number): string {
  return format.replace('{page}', String(pageNumber)).replace('{total}', String(totalPages));
}

export function PdfPageNumber({
  format = 'Page {page} of {total}',
  align = 'center',
  size = 'sm',
  fixed = false,
  muted = true,
  style,
}: PdfPageNumberProps) {
  const theme = usePdfxTheme();
  const styles = useSafeMemo(() => createPageNumberStyles(theme), [theme]);
  const alignMap = {
    left: styles.alignLeft,
    center: styles.alignCenter,
    right: styles.alignRight,
  } as Record<PageNumberAlign, Style>;
  const sizeMap = { xs: styles.sizeXs, sm: styles.sizeSm, md: styles.sizeMd } as Record<
    PageNumberSize,
    Style
  >;
  const textStyles: Style[] = [
    styles.text,
    alignMap[align],
    sizeMap[size],
    muted ? styles.colorMuted : styles.colorForeground,
  ];
  if (style) textStyles.push(...[style].flat());
  return (
    <View style={styles.container} fixed={fixed}>
      <PDFText
        style={textStyles}
        render={({ pageNumber, totalPages }) => formatPageNumber(format, pageNumber, totalPages)}
      />
    </View>
  );
}
