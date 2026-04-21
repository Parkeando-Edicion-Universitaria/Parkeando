import { Text as PDFText, StyleSheet, View } from '@react-pdf/renderer';
import type { Style } from '@react-pdf/types';
import { usePdfxTheme, useSafeMemo } from '../../../lib/pdfx-theme-context';
type PdfxTheme = ReturnType<typeof usePdfxTheme>;

export type WatermarkPosition =
  | 'center'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

/**
 * Marca de agua diagonal superpuesta sobre toda la página con posicionamiento absoluto.
 * Props: `text` | `opacity` | `fontSize` | `color` | `angle` | `position` | `fixed` | `style`
 * @see {@link PdfWatermarkProps}
 */
export interface PdfWatermarkProps {
  /** Estilos personalizados para combinar con los valores por defecto del componente */
  style?: Style;
  text: string;
  opacity?: number;
  fontSize?: number;
  color?: string;
  angle?: number;
  position?: WatermarkPosition;
  /**
   * @default true
   */
  fixed?: boolean;
  children?: never;
}

const THEME_COLOR_KEYS = ['foreground','muted','mutedForeground','primary','primaryForeground','accent','destructive','success','warning','info'] as const;
function resolveColor(value: string, colors: Record<string, string>): string {
  return THEME_COLOR_KEYS.includes(value as (typeof THEME_COLOR_KEYS)[number]) ? colors[value] : value;
}
function createWatermarkStyles(t: PdfxTheme) {
  const { fontWeights } = t.primitives;
  // Usa márgenes de página como insets de esquina para que la marca de agua se adapte al tema activo.
  const { marginTop, marginBottom, marginLeft, marginRight } = t.spacing.page;
  return StyleSheet.create({
    container: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: -1,
      pointerEvents: 'none',
    },
    text: {
      fontFamily: t.typography.heading.fontFamily,
      fontWeight: fontWeights.bold,
      textTransform: 'uppercase',
      letterSpacing: 4,
    },
    positionCenter: { justifyContent: 'center', alignItems: 'center' },
    positionTopLeft: {
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
      paddingTop: marginTop,
      paddingLeft: marginLeft,
    },
    positionTopRight: {
      justifyContent: 'flex-start',
      alignItems: 'flex-end',
      paddingTop: marginTop,
      paddingRight: marginRight,
    },
    positionBottomLeft: {
      justifyContent: 'flex-end',
      alignItems: 'flex-start',
      paddingBottom: marginBottom,
      paddingLeft: marginLeft,
    },
    positionBottomRight: {
      justifyContent: 'flex-end',
      alignItems: 'flex-end',
      paddingBottom: marginBottom,
      paddingRight: marginRight,
    },
  });
}

export function PdfWatermark({
  text,
  opacity = 0.15,
  fontSize = 60,
  color = 'mutedForeground',
  angle = -45,
  position = 'center',
  fixed = true,
  style,
}: PdfWatermarkProps) {
  const theme = usePdfxTheme();
  const styles = useSafeMemo(() => createWatermarkStyles(theme), [theme]);
  const positionMap: Record<WatermarkPosition, Style> = {
    center: styles.positionCenter,
    'top-left': styles.positionTopLeft,
    'top-right': styles.positionTopRight,
    'bottom-left': styles.positionBottomLeft,
    'bottom-right': styles.positionBottomRight,
  };
  const containerStyles: Style[] = [styles.container, positionMap[position]];
  if (style) containerStyles.push(...[style].flat());
  const textStyles: Style[] = [
    styles.text,
    {
      fontSize,
      color: resolveColor(color, theme.colors),
      opacity,
      transform: `rotate(${angle}deg)`,
    },
  ];
  return (
    <View style={containerStyles} fixed={fixed}>
      <PDFText style={textStyles}>{text}</PDFText>
    </View>
  );
}
