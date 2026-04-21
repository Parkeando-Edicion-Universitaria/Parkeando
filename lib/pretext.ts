import { layout, prepare, prepareWithSegments, layoutWithLines, walkLineRanges } from '@chenglou/pretext';

type WhiteSpaceMode = 'normal' | 'pre-wrap';

const PREPARED_CACHE_LIMIT = 1500;

type PreparedHandle = ReturnType<typeof prepare>;

interface TruncateSingleLineOptions {
  font: string;
  maxWidth: number;
  lineHeight: number;
  whiteSpace?: WhiteSpaceMode;
  ellipsis?: string;
}

interface MeasureMultilineOptions {
  font: string;
  maxWidth: number;
  lineHeight: number;
  whiteSpace?: WhiteSpaceMode;
}

const DEFAULT_ELLIPSIS = '…';
const preparedCache = new Map<string, PreparedHandle>();

function buildPreparedCacheKey(text: string, font: string, whiteSpace: WhiteSpaceMode): string {
  return `${font}::${whiteSpace}::${text}`;
}

function getPreparedCached(text: string, font: string, whiteSpace: WhiteSpaceMode): PreparedHandle {
  const cacheKey = buildPreparedCacheKey(text, font, whiteSpace);
  const cached = preparedCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const prepared = prepare(text, font, { whiteSpace });
  preparedCache.set(cacheKey, prepared);

  if (preparedCache.size > PREPARED_CACHE_LIMIT) {
    const oldestKey = preparedCache.keys().next().value;
    if (oldestKey) {
      preparedCache.delete(oldestKey);
    }
  }

  return prepared;
}

function splitGraphemes(input: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    return Array.from(segmenter.segment(input), (entry) => entry.segment);
  }

  return Array.from(input);
}

function fallbackTruncate(input: string, limit = 10, ellipsis = DEFAULT_ELLIPSIS): string {
  const graphemes = splitGraphemes(input);
  if (graphemes.length <= limit) return input;
  return `${graphemes.slice(0, limit).join('')}${ellipsis}`;
}

function fallbackMultilineHeight(input: string, maxWidth: number, lineHeight: number): number {
  const safeLineHeight = Math.max(1, lineHeight);
  const graphemeCount = splitGraphemes(input).length;
  const avgGlyphWidth = Math.max(6, safeLineHeight * 0.5);
  const charsPerLine = Math.max(1, Math.floor(maxWidth / avgGlyphWidth));
  const lineCount = Math.max(1, Math.ceil(graphemeCount / charsPerLine));
  return lineCount * safeLineHeight;
}

export function measureMultilineTextHeightWithPretext(
  text: string,
  {
    font,
    maxWidth,
    lineHeight,
    whiteSpace = 'pre-wrap',
  }: MeasureMultilineOptions
): number {
  const source = typeof text === 'string' ? text : '';
  if (!source) return Math.max(1, lineHeight);
  if (!Number.isFinite(maxWidth) || maxWidth <= 0) return Math.max(1, lineHeight);

  if (typeof window === 'undefined') {
    return fallbackMultilineHeight(source, maxWidth, lineHeight);
  }

  const prepared = getPreparedCached(source, font, whiteSpace);
  const measured = layout(prepared, maxWidth, lineHeight);
  return Math.max(lineHeight, measured.height);
}

export function truncateSingleLineWithPretext(
  text: string,
  {
    font,
    maxWidth,
    lineHeight,
    whiteSpace = 'normal',
    ellipsis = DEFAULT_ELLIPSIS,
  }: TruncateSingleLineOptions
): string {
  const source = typeof text === 'string' ? text : '';
  if (!source) return '';
  if (!Number.isFinite(maxWidth) || maxWidth <= 0) return '';

  // Pretext necesita un contexto de canvas del navegador. Durante SSR, usa un respaldo seguro.
  if (typeof window === 'undefined') {
    return fallbackTruncate(source, 10, ellipsis);
  }

  const prepared = getPreparedCached(source, font, whiteSpace);
  const fullLineLayout = layout(prepared, maxWidth, lineHeight);
  if (fullLineLayout.lineCount <= 1) {
    return source;
  }

  const graphemes = splitGraphemes(source);
  if (graphemes.length === 0) return '';

  let low = 0;
  let high = graphemes.length;

  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const candidate = `${graphemes.slice(0, mid).join('')}${ellipsis}`;
    const candidatePrepared = getPreparedCached(candidate, font, whiteSpace);
    const candidateLayout = layout(candidatePrepared, maxWidth, lineHeight);

    if (candidateLayout.lineCount <= 1) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  if (low <= 0) return ellipsis;
  return `${graphemes.slice(0, low).join('')}${ellipsis}`;
}

export function wrapTextWithPretext(
  text: string,
  {
    font,
    maxWidth,
    lineHeight,
    whiteSpace = 'normal',
  }: MeasureMultilineOptions
): string[] {
  const source = typeof text === 'string' ? text : '';
  if (!source) return [];
  if (!Number.isFinite(maxWidth) || maxWidth <= 0) return [source];

  if (typeof window === 'undefined') {
    return [source]; // SSR respaldo
  }

  const prepared = prepareWithSegments(source, font, { whiteSpace });
  const { lines } = layoutWithLines(prepared, Math.max(1, maxWidth), lineHeight);
  
  return lines.map(line => line.text);
}

export function shrinkWrapTextWithPretext(
  text: string,
  {
    font,
    maxWidth,
    lineHeight,
    whiteSpace = 'normal',
  }: MeasureMultilineOptions
): { lines: string[], tightWidth: number, height: number } {
  const source = typeof text === 'string' ? text : '';
  if (!source) return { lines: [], tightWidth: 0, height: 0 };
  if (!Number.isFinite(maxWidth) || maxWidth <= 0) return { lines: [source], tightWidth: maxWidth, height: lineHeight };

  if (typeof window === 'undefined') {
    return { lines: [source], tightWidth: maxWidth, height: lineHeight }; // SSR
  }

  const prepared = prepareWithSegments(source, font, { whiteSpace });
  
  let maxW = 0;
  walkLineRanges(prepared, maxWidth, line => { 
    if (line.width > maxW) maxW = line.width; 
  });
  
  const tightWidth = Math.max(1, Math.ceil(maxW));
  const { lines, height } = layoutWithLines(prepared, tightWidth, lineHeight);
  
  return { lines: lines.map(l => l.text), tightWidth, height };
}
