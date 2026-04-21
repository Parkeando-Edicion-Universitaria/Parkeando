/**
 * Utilidades para medir texto usando Pretext
 * Siguiendo las mejores prácticas del Pretext SKILL:
 * - Cache de prepared texto
 * - Medición precisa sin DOM reflow
 * - SSR-safe con fallbacks
 */

import { layout, prepare } from '@chenglou/pretext';

// Cache para prepared texto (siguiendo recomendación del SKILL)
const PREPARED_CACHE_LIMIT = 500;
const preparedCache = new Map<string, ReturnType<typeof prepare>>();

function buildCacheKey(text: string, font: string, whiteSpace: string): string {
  return `${font}::${whiteSpace}::${text}`;
}

function getPreparedCached(
  text: string,
  font: string,
  whiteSpace: 'normal' | 'pre-wrap'
): ReturnType<typeof prepare> {
  const cacheKey = buildCacheKey(text, font, whiteSpace);
  const cached = preparedCache.get(cacheKey);
  
  if (cached) {
    return cached;
  }

  const prepared = prepare(text, font, { whiteSpace });
  preparedCache.set(cacheKey, prepared);

  // Evict oldest entry si cache is too grande
  if (preparedCache.size > PREPARED_CACHE_LIMIT) {
    const oldestKey = preparedCache.keys().next().value;
    if (oldestKey) {
      preparedCache.delete(oldestKey);
    }
  }

  return prepared;
}

export interface TextMeasurementOptions {
  font: string;
  maxWidth?: number;
  lineHeight: number;
  whiteSpace?: 'normal' | 'pre-wrap';
}

export interface TextDimensions {
  width: number;
  height: number;
  lines: number;
}

/**
 * Mide las dimensiones de un texto considerando word wrap usando Pretext
 * Usa cache interno para mejor performance (recomendación del SKILL)
 */
export function measureTextDimensions(
  text: string,
  options: TextMeasurementOptions
): TextDimensions {
  const { font, maxWidth = 400, lineHeight, whiteSpace = 'normal' } = options;

  // SSR respaldo (recomendación del SKILL)
  if (typeof window === 'undefined') {
    // Estimación determinística para SSR
    const avgCharsPerLine = Math.floor(maxWidth / (lineHeight * 0.5));
    const estimatedLines = Math.max(1, Math.ceil(text.length / avgCharsPerLine));
    return {
      width: maxWidth,
      height: estimatedLines * lineHeight,
      lines: estimatedLines,
    };
  }

  // Usar cache de prepared texto (core rule del SKILL)
  const prepared = getPreparedCached(text, font, whiteSpace);
  const measured = layout(prepared, maxWidth, lineHeight);

  return {
    width: maxWidth,
    height: measured.height,
    lines: measured.lineCount,
  };
}

/**
 * Calcula el padding necesario para un contenedor basado en el contenido
 * Agrega padding extra para textos multi-línea
 */
export function calculateContainerPadding(
  textDimensions: TextDimensions,
  basePadding: number = 16
): { paddingTop: number; paddingBottom: number; minHeight: number } {
  // Agregar padding extra si hay múltiples líneas
  const extraPadding = textDimensions.lines > 1 ? 8 : 0;
  
  return {
    paddingTop: basePadding + extraPadding,
    paddingBottom: basePadding + extraPadding,
    minHeight: textDimensions.height + (basePadding + extraPadding) * 2,
  };
}

/**
 * Genera estilos CSS inline para un contenedor de texto
 * Útil para componentes que necesitan altura dinámica basada en contenido
 */
export function generateTextContainerStyles(
  text: string,
  options: TextMeasurementOptions & { padding?: number }
): React.CSSProperties {
  const dimensions = measureTextDimensions(text, options);
  const padding = calculateContainerPadding(dimensions, options.padding);

  return {
    minHeight: `${padding.minHeight}px`,
    paddingTop: `${padding.paddingTop}px`,
    paddingBottom: `${padding.paddingBottom}px`,
  };
}

/**
 * Limpia el cache de prepared texto
 * Útil para liberar memoria en aplicaciones de larga duración
 */
export function clearTextMeasurementCache(): void {
  preparedCache.clear();
}
