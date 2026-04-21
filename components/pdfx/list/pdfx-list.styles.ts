import { StyleSheet } from '@react-pdf/renderer';
import { usePdfxTheme } from '../../../lib/pdfx-theme-context';
type PdfxTheme = ReturnType<typeof usePdfxTheme>;

/**
 * Creates todas list estilos derived from the activo theme.
 * @param t - The resueltos PdfxTheme instance.
 */
export function createListStyles(t: PdfxTheme) {
  const { borderRadius, spacing, fontWeights, typography } = t.primitives;

  return StyleSheet.create({
    container: {
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      marginBottom: t.spacing.componentGap,
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    itemRowCenter: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    itemRowGapXs: { marginBottom: spacing[1] },
    itemRowGapSm: { marginBottom: spacing[2] },
    itemRowGapMd: { marginBottom: spacing[3] },
    markerBulletWrap: {
      width: spacing[4],
      alignItems: 'center',
      justifyContent: 'flex-start',
      marginTop: spacing[1],
    },
    markerBulletDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      backgroundColor: t.colors.primary,
    },
    markerBulletSubWrap: {
      width: spacing[4],
      alignItems: 'center',
      justifyContent: 'flex-start',
      marginTop: spacing[1],
    },
    markerBulletSubDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: t.colors.mutedForeground,
      backgroundColor: 'transparent',
    },
    markerNumberBadge: {
      width: spacing[5],
      height: spacing[5],
      borderRadius: spacing[5],
      backgroundColor: t.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing[2],
    },
    markerNumberText: {
      fontFamily: t.typography.body.fontFamily,
      fontSize: typography.xs,
      color: t.colors.primaryForeground,
      fontWeight: fontWeights.bold,
    },
    checkBox: {
      width: spacing[4],
      height: spacing[4],
      borderWidth: 1.5,
      borderColor: t.colors.border,
      borderStyle: 'solid',
      borderRadius: 3,
      marginRight: spacing[2],
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.colors.background,
    },
    checkBoxChecked: {
      backgroundColor: t.colors.success,
      borderColor: t.colors.success,
    },
    checkMark: {
      fontFamily: t.typography.body.fontFamily,
      fontSize: 8,
      color: t.colors.background,
      fontWeight: fontWeights.bold,
    },
    iconBox: {
      width: spacing[5],
      height: spacing[5],
      borderRadius: borderRadius.md,
      backgroundColor: t.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing[2],
    },
    iconMark: {
      fontFamily: t.typography.body.fontFamily,
      fontSize: 9,
      color: t.colors.primaryForeground,
      fontWeight: fontWeights.bold,
    },
    itemText: {
      // No usar flex aquí: los nodos Text con shorthand flex reciben flexBasis:0.
      // Eso hace que Yoga subestime la altura de texto multilínea y se monten las filas.
      // flex:1 debe ir en el View contenedor, no en el Text.
      fontFamily: t.typography.body.fontFamily,
      fontSize: t.typography.body.fontSize,
      lineHeight: t.typography.body.lineHeight,
      color: t.colors.foreground,
    },
    itemTextSub: {
      // Igual que arriba: sin flex. Ver comentario de itemText.
      fontFamily: t.typography.body.fontFamily,
      fontSize: t.typography.body.fontSize - 0.5,
      lineHeight: t.typography.body.lineHeight,
      color: t.colors.mutedForeground,
    },
    itemTextWrap: {
      // Complemento de itemText / itemTextSub: aplicar al View que envuelve el Text
      // para que la expansión flex ocurra al nivel del View, no del Text.
      flex: 1,
    },
    itemTextBold: {
      fontWeight: fontWeights.semibold,
    },
    descriptiveTitle: {
      fontFamily: t.typography.body.fontFamily,
      fontSize: t.typography.body.fontSize,
      lineHeight: t.typography.body.lineHeight,
      color: t.colors.foreground,
      fontWeight: fontWeights.semibold,
    },
    descriptiveDesc: {
      fontFamily: t.typography.body.fontFamily,
      fontSize: typography.sm,
      lineHeight: t.typography.body.lineHeight,
      color: t.colors.mutedForeground,
      marginTop: 1,
    },
    descriptiveAccent: {
      width: 3,
      borderRadius: borderRadius.sm,
      backgroundColor: t.colors.primary,
      marginRight: spacing[3],
      minHeight: spacing[4],
    },
    descriptiveContent: {
      flex: 1,
    },
    childrenContainer: {
      marginLeft: spacing[5],
      marginTop: spacing[1],
      display: 'flex',
      flexDirection: 'column',
    },
  });
}
