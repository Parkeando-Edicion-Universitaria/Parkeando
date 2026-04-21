import { Cell } from '@/types/game';
import { getCardsForCell } from '@/data/game-cards';
import { SPECIAL_CELL_MAP, CellType } from './special-cells';

// Rangos de provincias en el tablero (posición → provincia)
export const PROVINCE_RANGES: { start: number; end: number; province: string }[] = [
  { start: 1, end: 10, province: 'Panamá' },
  { start: 11, end: 20, province: 'Panamá Oeste' },
  { start: 21, end: 30, province: 'Coclé' },
  { start: 31, end: 40, province: 'Los Santos' },
  { start: 41, end: 50, province: 'Herrera' },
  { start: 51, end: 60, province: 'Veraguas' },
  { start: 61, end: 70, province: 'Bocas del Toro' },
  { start: 71, end: 80, province: 'Comarcas' },
  { start: 81, end: 90, province: 'Chiriquí' },
  { start: 91, end: 100, province: 'Colón' },
  { start: 101, end: 110, province: 'Darién' },
  { start: 111, end: 120, province: 'Panamá Este' },
];

export function getProvinceForCell(position: number): string | undefined {
  if (position === 0) return 'Inicio';
  const range = PROVINCE_RANGES.find(r => position >= r.start && position <= r.end);
  return range?.province;
}

// Emojis de provincias para mostrar en el tablero
export const PROVINCE_ICONS: Record<string, string> = {
  'Panamá': '🏙️',
  'Panamá Oeste': '🌄',
  'Coclé': '🎩',
  'Herrera': '🎭',
  'Los Santos': '💃',
  'Veraguas': '🌊',
  'Bocas del Toro': '🏝️',
  'Comarcas': '🪶',
  'Chiriquí': '🌋',
  'Colón': '⚓',
  'Darién': '🦜',
  'Panamá Este': '✈️',
};

// Emoji por tipo de carta para mostrar en el tablero
export const CARD_TYPE_ICONS: Record<string, string> = {
  'pregunta': '❓',
  'reto': '🎯',
  'premio': '🏆',
  'penalizacion': '⚠️',
};

// Genera el tablero dinámicamente con datos de game-cards y special-cells (0-120)
export const CELLS: Cell[] = Array.from({ length: 121 }, (_, i) => {
  const position = i;
  const province = getProvinceForCell(position);
  const cards = getCardsForCell(position);
  const primaryCard = cards[0];
  const specialDef = SPECIAL_CELL_MAP[position];
  const hasCard = cards.length > 0;
  const isStart = position === 0;
  const isFinish = position === 120;
  const cardText = primaryCard ? `${primaryCard.title} ${primaryCard.description}`.toLowerCase() : '';

  // Determine cell type
  let type: 'normal' | 'special' | 'event' = 'normal';
  if (isStart || (isFinish && !hasCard) || specialDef?.type === CellType.CARCEL || specialDef?.type === CellType.VIAJE_RAPIDO || specialDef?.type === CellType.PROBLEMA_VIAL || specialDef?.type === CellType.RETEN) {
    type = 'special';
  } else if (specialDef?.type === CellType.EVENT_NACIONAL) {
    type = 'event';
  } else if (hasCard) {
    const cardType = cards[0].type;
    type = cardType === 'penalizacion' ? 'special' : cardType === 'reto' ? 'event' : 'normal';
  }

  // compilar descripción & nombre
  let name = specialDef?.name || (hasCard ? cards[0].title : `Casilla ${position}`);
  let description = specialDef?.description || (hasCard ? cards[0].description : `Casilla ${position}`);
  
  if (isStart) description = 'INICIO – Parkeando';
  else if (isFinish && !hasCard) description = 'META – ¡Has completado el recorrido!';

  // Icon mapping
  let icon = province ? PROVINCE_ICONS[province] : undefined;
  if (specialDef) {
    if (specialDef.type === CellType.CARCEL) icon = '⛓️';
    else if (specialDef.type === CellType.VIAJE_RAPIDO) icon = '✈️';
    else if (specialDef.type === CellType.PROBLEMA_VIAL || specialDef.type === CellType.RETEN) icon = '🛑';
    else if (specialDef.type === CellType.EVENT_NACIONAL) icon = '🎉';
  } else if (primaryCard) {
    if (cardText.includes('aeropuerto') || cardText.includes('vuelo') || cardText.includes('viaje rápido') || cardText.includes('viaje rapido')) {
      icon = '✈️';
    } else if (cardText.includes('cárcel') || cardText.includes('carcel')) {
      icon = '⛓️';
    } else if (cardText.includes('retén') || cardText.includes('reten') || cardText.includes('problema vial')) {
      icon = '🛑';
    } else {
      icon = CARD_TYPE_ICONS[primaryCard.type];
    }
  }

  return {
    position,
    type,
    has_question: hasCard,
    description: name + ': ' + description,
    province: province || specialDef?.province || undefined,
    qr_code: '',
    icon,
  };
});
