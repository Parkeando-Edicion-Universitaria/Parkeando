/**
 * Special Cells Engine - Lógica de casillas especiales de Parkeando
 *
 * Reglas (Regla 5):
 *  - Eventos Nacionales (Carnavales/Los Santos=15, Fiestas Patrias/PTY=30, Ferias Chiriquí-Boquete=45):
 *      Te dan un punto extra de experiencia.
 *  - Viaje Rápido (casilla 85 = Vuelo directo de Chiriquí a Tocumen):
 *      Avanzas inmediatamente a otra provincia del tablero (teleport).
 *  - Problema Vial / Retén:
 *      Casillas de bloqueo temporal (pierdes turno) cuando estén activas en el mapa especial.
 *  - Cárcel:
 *      Quedas preso. Necesitas 5 comodines o sacar un 3 y un 5 en los dados para salir.
 *
 * Regla 7 (Interacción):
 *  - Comodín 5: Necesitas tener 5 comodines para salir de la cárcel en un solo uso.
 *  - Juega Vivo (Batalla): Si caes en una casilla donde ya hay otro jugador,
 *    uno avanza y el otro pierde un turno (determinado aleatoriamente).
 */

import { getServiceSupabase } from './supabase';

const db = () => getServiceSupabase();

// ─── Definición de casillas especiales ───────────────────────────────────────

export enum CellType {
    NORMAL = 'normal',
    EVENT_NACIONAL = 'event_nacional',   // +1 punto extra
    VIAJE_RAPIDO = 'viaje_rapido',       // Teleport a otro aeropuerto
    PROBLEMA_VIAL = 'problema_vial',     // Pierdes turno
    RETEN = 'reten',                     // Pierdes turno (igual a Problema Vial)
    CARCEL = 'carcel',                   // Quedas preso (necesitas 5 comodines)
    START = 'start',                     // Casilla inicial
    FINISH = 'finish',                   // Meta
}

export interface SpecialCellDefinition {
    position: number;
    type: CellType;
    name: string;
    province: string;
    description: string;
    teleportTo?: number; // Solo para VIAJE_RAPIDO
}

export const SPECIAL_CELL_MAP: Record<number, SpecialCellDefinition> = {
    0: {
        position: 0,
        type: CellType.START,
        name: 'Casilla Parkeando',
        province: 'Panamá',
        description: 'Punto de partida. ¡Todos empiezan aquí!',
    },
    // Eventos Nacionales (+1 punto)
    15: {
        position: 15,
        type: CellType.EVENT_NACIONAL,
        name: 'Carnavales de Los Santos',
        province: 'Los Santos',
        description: '¡Los Carnavales de Los Santos! ¡+1 punto de experiencia!',
    },
    30: {
        position: 30,
        type: CellType.EVENT_NACIONAL,
        name: 'Fiestas Patrias - PTY',
        province: 'Panamá',
        description: '¡Fiestas Patrias en la capital! ¡+1 punto de experiencia!',
    },
    45: {
        position: 45,
        type: CellType.EVENT_NACIONAL,
        name: 'Ferias de Chiriquí-Boquete',
        province: 'Chiriquí',
        description: '¡Las famosas Ferias de Boquete! ¡+1 punto de experiencia!',
    },
    // Viaje rápido de Chiriquí a Panamá
    85: {
        position: 85,
        type: CellType.VIAJE_RAPIDO,
        name: 'Aeropuerto Internacional Enrique Malek',
        province: 'Chiriquí',
        description: 'Vuela directo a Panamá. Avanzas a la casilla del Aeropuerto Internacional de Tocumen.',
        teleportTo: 112,
    },
};

export interface CellEffect {
    type: CellType;
    bonusPoints?: number;       // Puntos extra ganados
    skipTurn?: boolean;          // Si el jugador pierde su próximo turno
    teleportTo?: number;         // Posición destino del viaje rápido
    sendToJail?: boolean;        // Si va a la cárcel
    message: string;             // Mensaje para mostrar al jugador
}

/**
 * Determina el efecto que tiene una casilla sobre el jugador
 */
export function getCellEffect(position: number): CellEffect {
    const cell = SPECIAL_CELL_MAP[position];

    if (!cell) {
        return {
            type: CellType.NORMAL,
            message: `Casilla ${position}`,
        };
    }

    switch (cell.type) {
        case CellType.EVENT_NACIONAL:
            return {
                type: cell.type,
                bonusPoints: 1,
                message: `🎉 ${cell.description}`,
            };

        case CellType.VIAJE_RAPIDO:
            return {
                type: cell.type,
                teleportTo: cell.teleportTo,
                message: `✈️ ${cell.description}`,
            };

        case CellType.PROBLEMA_VIAL:
        case CellType.RETEN:
            return {
                type: cell.type,
                skipTurn: true,
                message: `🛑 ${cell.description}`,
            };

        case CellType.CARCEL:
            return {
                type: cell.type,
                sendToJail: true,
                message: `⛓️ ${cell.description}`,
            };

        case CellType.FINISH:
            return {
                type: cell.type,
                message: `🏁 ${cell.description}`,
            };

        default:
            return {
                type: CellType.NORMAL,
                message: `Casilla ${position}`,
            };
    }
}

// ─── Jugador en Cárcel ────────────────────────────────────────────────────────

export interface JailStatus {
    isInJail: boolean;
    jailPosition: number | null;
    wildcardsNeeded: number; // Siempre 5
}

/**
 * Verifica si un jugador está en la cárcel
 */
export async function getJailStatus(playerId: string): Promise<JailStatus> {
    const { data: player } = await db()
        .from('game_players')
        .select('in_jail, jail_position, wildcards')
        .eq('id', playerId)
        .single();

    if (!player) {
        return { isInJail: false, jailPosition: null, wildcardsNeeded: 5 };
    }

    return {
        isInJail: player.in_jail || false,
        jailPosition: player.jail_position,
        wildcardsNeeded: 5,
    };
}

/**
 * Envía a un jugador a la cárcel
 */
export async function sendToJail(playerId: string, jailPosition: number): Promise<void> {
    await db()
        .from('game_players')
        .update({
            in_jail: true,
            jail_position: jailPosition,
            updated_at: new Date().toISOString(),
        })
        .eq('id', playerId);
}

/**
 * Intenta liberar al jugador de la cárcel usando 5 comodines (Regla 7)
 * Devuelve true si fue liberado, false si no tiene suficientes comodines.
 */
export async function escapeJailWithWildcards(playerId: string): Promise<{
    success: boolean;
    message: string;
}> {
    const { data: player } = await db()
        .from('game_players')
        .select('wildcards, in_jail')
        .eq('id', playerId)
        .single();

    if (!player) return { success: false, message: 'Jugador no encontrado' };
    if (!player.in_jail) return { success: false, message: 'No estás en la cárcel' };

    if (player.wildcards < 5) {
        return {
            success: false,
            message: `Necesitas 5 comodines para salir. Tienes ${player.wildcards}.`,
        };
    }

    await db()
        .from('game_players')
        .update({
            in_jail: false,
            jail_position: null,
            wildcards: player.wildcards - 5,
            updated_at: new Date().toISOString(),
        })
        .eq('id', playerId);

    return { success: true, message: '¡Liberado de la cárcel! Usaste 5 comodines.' };
}

// ─── Batalla "Juega Vivo" ─────────────────────────────────────────────────────

export interface BattleResult {
    winnerId: string;
    loserId: string;
    winnerUsername: string;
    loserUsername: string;
    message: string;
    participantUsernames?: string[];
    totalPlayers?: number;
}

/**
 * Verifica si hay jugadores en la misma casilla (Regla 7 - Juega Vivo)
 * y resuelve una batalla entre todos los presentes.
 */
export async function checkAndHandleBattle(
    gameId: string,
    movingPlayerId: string,
    newPosition: number
): Promise<BattleResult | null> {
    // Buscar todos los jugadores activos en la misma posición (incluye al que se movió)
    const { data: playersAtPosition } = await db()
        .from('game_players')
        .select('id, username')
        .eq('game_id', gameId)
        .eq('position', newPosition)
        .eq('status', 'active');

    if (!playersAtPosition || playersAtPosition.length < 2) return null;

    const participants = playersAtPosition;
    const winner = participants[Math.floor(Math.random() * participants.length)];
    const losers = participants.filter((player) => player.id !== winner.id);

    if (losers.length === 0) return null;

    const representativeLoser = losers[0];
    const loserIds = losers.map((player) => player.id);
    const loserUsernames = losers.map((player) => player.username);
    const battleAdvancePosition = Math.min(120, newPosition + 1);

    const winnerId = winner.id;
    const loserId = representativeLoser.id;
    const winnerUsername = winner.username;
    const loserUsername = representativeLoser.username;

    // El ganador avanza 1 casilla extra
    await db()
        .from('game_players')
        .update({
            position: battleAdvancePosition,
            updated_at: new Date().toISOString(),
        })
        .eq('id', winnerId);

    // Todos los perdedores pierden su próximo turno
    await db()
        .from('game_players')
        .update({
            skip_turns_remaining: 1,
            skip_next_turn: true,
            updated_at: new Date().toISOString(),
        })
        .in('id', loserIds);

    const loserNamesPreview =
        loserUsernames.length === 1
            ? loserUsernames[0]
            : `${loserUsernames.slice(0, -1).join(', ')} y ${loserUsernames[loserUsernames.length - 1]}`;

    const battleMessage =
        losers.length === 1
            ? `⚔️ ¡Juega Vivo! ${winnerUsername} avanza y ${loserUsername} pierde un turno.`
            : `⚔️ ¡Juega Vivo! ${winnerUsername} ganó una batalla múltiple contra ${loserNamesPreview}. ${losers.length} jugadores pierden su próximo turno.`;

    // Registrar el evento de batalla
    await db().from('game_events').insert({
        game_id: gameId,
        player_id: movingPlayerId,
        event_type: 'battle_juega_vivo',
        event_data: {
            winnerId,
            loserId,
            winnerUsername,
            loserUsername,
            loserIds,
            loserUsernames,
            participantIds: participants.map((player) => player.id),
            participantUsernames: participants.map((player) => player.username),
            totalPlayers: participants.length,
            mode: participants.length > 2 ? 'multi' : 'duel',
            position: newPosition,
        },
    });

    return {
        winnerId,
        loserId,
        winnerUsername,
        loserUsername,
        message: battleMessage,
        participantUsernames: participants.map((player) => player.username),
        totalPlayers: participants.length,
    };
}

/**
 * Aplica todos los efectos de la casilla al jugador después de moverse
 */
export async function applyMoveEffects(
    gameId: string,
    playerId: string,
    newPosition: number
): Promise<{
    effect: CellEffect;
    battle: BattleResult | null;
    finalPosition: number;
}> {
    const effect = getCellEffect(newPosition);
    let finalPosition = newPosition;
    let updateFields: Record<string, any> = {};
    let resetByJailRecidivism = false;

    if (effect.skipTurn) {
        updateFields.skip_turns_remaining = 1;
        updateFields.skip_next_turn = true;
    }

    if (effect.sendToJail) {
        const { data: jailState } = await db()
            .from('game_players')
            .select('jail_visits')
            .eq('id', playerId)
            .single();

        const nextJailVisits = (jailState?.jail_visits ?? 0) + 1;

        if (nextJailVisits >= 2) {
            resetByJailRecidivism = true;
            finalPosition = 0;
            updateFields.position = 0;
            updateFields.in_jail = false;
            updateFields.jail_position = null;
            updateFields.jail_visits = 0;
            effect.message = '⛓️ Caíste por segunda vez en la cárcel. Reinicias tu progreso en la salida.';
        } else {
            updateFields.in_jail = true;
            updateFields.jail_position = newPosition;
            updateFields.jail_visits = nextJailVisits;
        }
    }

    if (effect.teleportTo !== undefined) {
        finalPosition = effect.teleportTo;
        updateFields.position = finalPosition;
        
        // Aplicar efecto de la casilla destino también
        const destEffect = getCellEffect(finalPosition);
        if (destEffect.bonusPoints) {
            effect.bonusPoints = (effect.bonusPoints || 0) + destEffect.bonusPoints;
        }
    }

    // aplicar acumulados puntos via RPC to evitar precisión problemas
    if (effect.bonusPoints) {
        await db().rpc('increment_player_points', {
            p_id: playerId,
            amount: effect.bonusPoints,
        });
    }

    // Ejecutar un solo actualiza consolidado a la DB (si hay campos afectados)
    if (Object.keys(updateFields).length > 0) {
        updateFields.updated_at = new Date().toISOString();
        await db()
            .from('game_players')
            .update(updateFields)
            .eq('id', playerId);
    }

    // Verificar batalla Juega Vivo (solo si no está en cárcel ni perdió turno)
    let battle: BattleResult | null = null;
    if (!effect.sendToJail && !effect.skipTurn) {
        battle = await checkAndHandleBattle(gameId, playerId, finalPosition);
        if (battle && battle.winnerId === playerId) {
            finalPosition = finalPosition + 1;
        }
    }

    // Asegurar que la posición no sea negativa ni mayor a 120
    finalPosition = Math.max(0, Math.min(120, finalPosition));

    if (resetByJailRecidivism) {
        await db().from('game_events').insert({
            game_id: gameId,
            player_id: playerId,
            event_type: 'position_changed',
            event_data: {
                type: 'jail_reset',
                position: newPosition,
                finalPosition,
                message: 'Jugador reiniciado a la salida por segunda caída en cárcel.',
            },
        });
    }

    // Registrar evento de la casilla
    await db().from('game_events').insert({
        game_id: gameId,
        player_id: playerId,
        event_type: 'cell_effect',
        event_data: {
            position: newPosition,
            finalPosition,
            effect: effect.type,
            message: effect.message,
        },
    });

    return { effect, battle, finalPosition };
}
