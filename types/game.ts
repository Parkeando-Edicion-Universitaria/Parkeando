export interface Player {
  id: string;
  user_id: string;
  game_id: string;
  username: string;
  position: number;
  points: number;
  wildcards: number;
  status: 'active' | 'inactive' | 'disconnected' | 'finished';
  is_active: boolean;
  last_activity: string;
  color: string;
  avatar: number;
  icon?: string;
  in_jail?: boolean;
  jail_position?: number | null;
  skip_next_turn?: boolean;
  skip_turns_remaining?: number;
  penalty_shields?: number;
  pending_position?: number | null;
  pending_dice?: number | null;
  pending_card_id?: string | null;
  failed_attempts?: number;
  consecutive_doubles?: number;
  jail_visits?: number;
  equipped?: {
    avatar: string | null;
    border: string | null;
    title: string | null;
  };
  created_at: string;
}

export interface Game {
  id: string;
  status: 'waiting' | 'in_progress' | 'finished';
  current_player_index: number;
  max_players: number;
  created_at: string;
  started_at?: string;
  finished_at?: string;
  winner_id?: string;
  winner?: string;
  current_turn?: string | null;
  turn_start_time?: string | null;
  turn_number?: number;
  // rellenado cuando consultado con .select('*, game_players(*)')
  game_players?: Player[];
  spectators?: string[];
  queue?: any[];
}

export interface Cell {
  position: number;
  type: 'normal' | 'special' | 'event';
  has_question: boolean;
  question?: Question;
  province?: string;
  description: string;
  qr_code: string;
  icon?: string;
}

export interface Question {
  id: string;
  cell_position: number;
  question_text: string;
  options: string[];
  correct_answer: number;
  points: number;
  category: 'turismo' | 'gastronomia' | 'cultura';
}

// ─── nuevo carta sistema para province-según contenido ────────────────────────────

export type CardType = 'pregunta' | 'reto' | 'premio' | 'penalizacion';

export interface CardEffect {
  advanceCells?: number;         // positivo = avanzar, negativo = retroceder
  skipTurns?: number;            // cuántos turnos debe saltar
  rollDiceAndAdvance?: boolean;  // el jugador tira dado para avanzar
  goToPosition?: number;         // teletransporta a una posición específica
  goToFinish?: boolean;          // va directo a la meta (120)
  extraDiceRoll?: boolean;       // tira el dado otra vez
  loseTurn?: boolean;            // pierde el turno actual
  protectFromPenalty?: boolean;  // inmunidad frente a la siguiente penalización
}

export interface GameCard {
  id: string;
  cellPosition: number;
  province: string;
  type: CardType;
  title: string;
  description: string;
  // Para preguntas (opción múltiple)
  options?: string[];
  correctAnswer?: number;
  // Efectos
  onCorrect?: CardEffect;
  onIncorrect?: CardEffect;
  onComplete?: CardEffect;    // para retos/premios — siempre aplicado al acertar
  onFail?: CardEffect;        // para retos — aplicado cuando no se completa
  autoApply?: CardEffect;     // para premios/penalizaciones — aplicado automáticamente
}

export interface DiceRoll {
  value: number;
  player_id: string;
  timestamp: string;
}

export type GameAction = 
  | { type: 'roll'; player_id: string; timestamp: string; data: { values: number[] } }
  | { type: 'scan'; player_id: string; timestamp: string; data: { qr_id: string } }
  | { type: 'answer'; player_id: string; timestamp: string; data: { question_id: string; correct: boolean } }
  | { type: 'wildcard'; player_id: string; timestamp: string; data: { wildcard_id: string } }
  | { type: 'timeout'; player_id: string; timestamp: string; data: {} };

export interface PlayerStats {
  total_games: number;
  wins: number;
  total_points: number;
  questions_answered: number;
  questions_correct: number;
  average_position: number;
}

export const PLAYER_COLORS = [
  '#FFD100', // Amarillo
  '#D21034', // Rojo
  '#0033A0', // Azul
  '#00A859', // Verde
  '#FF6B00', // Naranja
  '#9B26B6', // Morado
];

export const PLAYER_ICONS = [
  'car',
  'sport_car',
  'suv',
  'van',
  'taxi',
  'police_car',
];

export const SPECIAL_CELLS = {
  START: 0,
  CARNAVALES: 15,
  FIESTAS_PATRIAS: 30,
  FERIAS_CHIRIQUI: 45,
  VIAJE_RAPIDO: 85,
  PROBLEMA_VIAL: 75,
  FINISH: 120,
};

export const TIMEOUT_DURATION = 60000; // 60 segundos
export const WILDCARD_THRESHOLD = 120000; // 2 minutos
