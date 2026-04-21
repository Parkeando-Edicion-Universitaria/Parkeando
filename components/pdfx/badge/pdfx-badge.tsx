import { Text as PDFText, StyleSheet, View } from '@react-pdf/renderer';
import type { Style } from '@react-pdf/types';
import { usePdfxTheme, useSafeMemo } from '../../../lib/pdfx-theme-context';
type PdfxTheme = ReturnType<typeof usePdfxTheme>;

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'info'
  | 'outline';
export type BadgeSize = 'sm' | 'md' | 'lg';

/**
 * Inline label para status, tags, or categories.
 *
 * Accepts texto via either `label` prop or `children` (string). `label` takes
 * precedence cuando both are provisto. The children pattern (`<Badge>texto</Badge>`)
 * is supported para compatibility con common React idioms, but note that
 * `@react-pdf/renderer` no soporte JSX children the way HTML does — solo
 * string children are accepted.
 *
 * Props - `label` | `children` | `variante` | `size` | `fondo` | `color` | `style`
 * @see {@link BadgeProps}
 */
export interface BadgeProps {
  /** Estilos personalizados para combinar con los valores por defecto del componente */
  style?: Style;
  /** Texto a mostrar. Tiene prioridad sobre children cuando ambos se proveen. */
  label?: string;
  /** Children tipo string como alternativa a la prop label. */
  children?: string;
  /**
   * @default 'default'
   */
  variant?: BadgeVariant;
  /**
   * @default 'md'
   */
  size?: BadgeSize;
  background?: string;
  color?: string;
}

const THEME_COLOR_KEYS = ['foreground','muted','mutedForeground','primary','primaryForeground','accent','destructive','success','warning','info'] as const;
function resolveColor(value: string, colors: Record<string, string>): string {
  return THEME_COLOR_KEYS.includes(value as (typeof THEME_COLOR_KEYS)[number]) ? colors[value] : value;
}
function createBadgeStyles(t: PdfxTheme) {
  const { spacing, borderRadius, fontWeights } = t.primitives;
  const c = t.colors;
  const textBase = {
    fontFamily: t.typography.body.fontFamily,
    fontWeight: fontWeights.semibold,
    letterSpacing: 0.3,
  };
  const variantBox = (borderColor: string, bgColor: string = c.muted) => ({
    backgroundColor: bgColor,
    borderWidth: spacing[0.5],
    borderColor,
    borderStyle: 'solid' as const,
  });
  const sheet = StyleSheet.create({
    containerBase: {
      borderRadius: borderRadius.full,
      alignSelf: 'flex-start' as const,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
    },
    variantDefault: variantBox(c.border),
    variantPrimary: variantBox(c.primary, c.primary),
    variantSuccess: variantBox(c.success),
    variantWarning: variantBox(c.warning),
    variantDestructive: variantBox(c.destructive),
    variantInfo: variantBox(c.info),
    variantOutline: variantBox(c.border, c.background),
    sizeSm: { paddingHorizontal: spacing[2], paddingVertical: spacing[0.5] },
    sizeMd: { paddingHorizontal: spacing[3], paddingVertical: spacing[1] },
    sizeLg: { paddingHorizontal: spacing[4], paddingVertical: spacing[2] },
    textDefault: { ...textBase, color: c.mutedForeground },
    textPrimary: { ...textBase, color: c.primaryForeground },
    textSuccess: { ...textBase, color: c.success },
    textWarning: { ...textBase, color: c.warning },
    textDestructive: { ...textBase, color: c.destructive },
    textInfo: { ...textBase, color: c.info },
    textOutline: { ...textBase, color: c.foreground },
    textSm: { fontSize: t.primitives.typography.xs - 1 },
    textMd: { fontSize: t.primitives.typography.xs },
    textLg: { fontSize: t.primitives.typography.sm },
  });
  return {
    ...sheet,
    containerVariantMap: {
      default: sheet.variantDefault,
      primary: sheet.variantPrimary,
      success: sheet.variantSuccess,
      warning: sheet.variantWarning,
      destructive: sheet.variantDestructive,
      info: sheet.variantInfo,
      outline: sheet.variantOutline,
    } as Record<BadgeVariant, Style>,
    textVariantMap: {
      default: sheet.textDefault,
      primary: sheet.textPrimary,
      success: sheet.textSuccess,
      warning: sheet.textWarning,
      destructive: sheet.textDestructive,
      info: sheet.textInfo,
      outline: sheet.textOutline,
    } as Record<BadgeVariant, Style>,
    containerSizeMap: { sm: sheet.sizeSm, md: sheet.sizeMd, lg: sheet.sizeLg } as Record<
      BadgeSize,
      Style
    >,
    textSizeMap: { sm: sheet.textSm, md: sheet.textMd, lg: sheet.textLg } as Record<
      BadgeSize,
      Style
    >,
  };
}

export function Badge({
  label,
  children,
  variant = 'default',
  size = 'md',
  background,
  color,
  style,
}: BadgeProps) {
  const theme = usePdfxTheme();
  const styles = useSafeMemo(() => createBadgeStyles(theme), [theme]);
  // `label` tiene prioridad; usa children string como respaldo por compatibilidad con el estilo de React
  const text = label ?? children ?? '';
  const containerStyles: Style[] = [
    styles.containerBase,
    styles.containerVariantMap[variant],
    styles.containerSizeMap[size],
    ...(background ? [{ backgroundColor: resolveColor(background, theme.colors) }] : []),
    ...(style ? [style].flat() : []),
  ];
  const textStyles: Style[] = [
    styles.textVariantMap[variant],
    styles.textSizeMap[size],
    ...(color ? [{ color: resolveColor(color, theme.colors) }] : []),
  ];
  return (
    <View style={containerStyles}>
      <PDFText style={textStyles}>{text}</PDFText>
    </View>
  );
}
