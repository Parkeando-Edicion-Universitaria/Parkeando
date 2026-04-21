import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { getServiceSupabase } from '@/lib/supabase';
import { decryptEmail } from '@/lib/security';
import { isSuperAdminEmail, isSuperAdminEmailKey, isSuperAdminPayload } from '@/lib/super-admin';

const CHAT_EVENT_TYPES = [
  'chat_message',
  'chat_message_deleted',
  'chat_user_banned',
  'chat_user_unbanned',
  'chat_cooldown_updated',
] as const;

const MAX_COOLDOWN_SECONDS = 120;
const MIN_COOLDOWN_SECONDS = 1;
const DEFAULT_CHAT_COOLDOWN_SECONDS = 3;
const DEFAULT_ADMIN_CHAT_GAMES_LIMIT = 80;
const COMPACT_ADMIN_CHAT_GAMES_LIMIT = 30;
const DEFAULT_ADMIN_CHAT_EVENTS_LIMIT = 600;
const COMPACT_ADMIN_CHAT_EVENTS_LIMIT = 260;
const DEFAULT_ADMIN_ROOM_MESSAGES_LIMIT = 14;
const COMPACT_ADMIN_ROOM_MESSAGES_LIMIT = 8;
const DEFAULT_ADMIN_ROOM_MODERATION_LIMIT = 12;
const COMPACT_ADMIN_ROOM_MODERATION_LIMIT = 8;
const DEFAULT_ADMIN_FLAT_MESSAGES_LIMIT = 120;
const COMPACT_ADMIN_FLAT_MESSAGES_LIMIT = 60;
const DEFAULT_BLACKLIST = [
  'puto', 'puta', 'mierda', 'pendejo', 'pendeja', 'cabron', 'cabrona',
  'maricon', 'zorra', 'verga', 'coño', 'joder', 'pinga', 'culo',
  'bitch', 'fuck', 'shit', 'asshole', 'dick', 'cunt', 'whore',
  'slut', 'bastardo', 'perra', 'marica', 'huevon',
];
const BLACKLIST_CONFIG_KEY = 'chat_blacklist_terms';

const isMissingColumnError = (error: any, column: string) =>
  String(error?.message || '').includes(`'${column}'`) ||
  String(error?.message || '').toLowerCase().includes(column.toLowerCase());

const isMissingRelationError = (error: any, relation: string) => {
  const message = String(error?.message || '').toLowerCase();
  return message.includes(relation.toLowerCase()) && (
    message.includes('does not exist') ||
    message.includes('schema cache') ||
    message.includes('could not find')
  );
};

const formatChatMessage = (event: any) => ({
  id: event.id,
  gameId: event.game_id,
  createdAt: event.created_at,
  username: event.event_data?.username || 'Sistema',
  userId: event.event_data?.userId || null,
  text: event.event_data?.text || '',
  isAdmin: Boolean(event.event_data?.isAdmin),
  title: event.event_data?.title || null,
});

const formatModerationEvent = (event: any) => ({
  id: event.id,
  gameId: event.game_id,
  eventType: event.event_type,
  createdAt: event.created_at,
  message: event.event_data?.message || 'Evento de moderación',
  username: event.event_data?.username || null,
  userId: event.event_data?.userId || null,
  actorName: event.event_data?.actorName || null,
  reason: event.event_data?.reason || null,
});

const encodeConfigValue = (value: unknown) => `\\x${Buffer.from(JSON.stringify(value), 'utf8').toString('hex')}`;

const decodeConfigValue = <T,>(value: string | null | undefined, fallback: T): T => {
  if (!value) return fallback;

  try {
    const hexValue = value.startsWith('\\x') ? value.slice(2) : value;
    return JSON.parse(Buffer.from(hexValue, 'hex').toString('utf8')) as T;
  } catch {
    return fallback;
  }
};

const normalizeBlacklistTerms = (terms: string[]) =>
  Array.from(new Set(
    terms
      .map((term) => String(term || '').trim().toLowerCase())
      .filter(Boolean)
  )).sort((a, b) => a.localeCompare(b, 'es'));

const loadBlacklistFromSystemConfig = async (db: ReturnType<typeof getServiceSupabase>) => {
  const { data, error } = await db
    .from('system_config')
    .select('value_encrypted, updated_at')
    .eq('key', BLACKLIST_CONFIG_KEY)
    .maybeSingle();

  if (error) throw error;

  const customTerms = normalizeBlacklistTerms(
    decodeConfigValue<string[]>(data?.value_encrypted, [])
  );

  return normalizeBlacklistTerms([...DEFAULT_BLACKLIST, ...customTerms]).map((term) => ({
    id: `config:${term}`,
    term,
    is_default: DEFAULT_BLACKLIST.includes(term),
    created_at: data?.updated_at || new Date(0).toISOString(),
  }));
};

const saveBlacklistToSystemConfig = async (
  db: ReturnType<typeof getServiceSupabase>,
  userId: string,
  terms: string[]
) => {
  const customTerms = normalizeBlacklistTerms(
    terms.filter((term) => !DEFAULT_BLACKLIST.includes(term))
  );

  const { error } = await db
    .from('system_config')
    .upsert({
      key: BLACKLIST_CONFIG_KEY,
      value_encrypted: encodeConfigValue(customTerms),
      description: 'Lista negra editable del chat para administración',
      updated_at: new Date().toISOString(),
      updated_by: userId,
    }, { onConflict: 'key' });

  if (error) throw error;

  return normalizeBlacklistTerms([...DEFAULT_BLACKLIST, ...customTerms]).map((term) => ({
    id: `config:${term}`,
    term,
    is_default: DEFAULT_BLACKLIST.includes(term),
    created_at: new Date().toISOString(),
  }));
};

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const url = new URL(req.url);
    const compactMode = url.searchParams.get('compact') === '1';
    const gameIdFilter = (url.searchParams.get('gameId') || '').trim();
    const gamesLimit = compactMode ? COMPACT_ADMIN_CHAT_GAMES_LIMIT : DEFAULT_ADMIN_CHAT_GAMES_LIMIT;
    const eventsLimit = compactMode ? COMPACT_ADMIN_CHAT_EVENTS_LIMIT : DEFAULT_ADMIN_CHAT_EVENTS_LIMIT;
    const messagesPerRoomLimit = compactMode ? COMPACT_ADMIN_ROOM_MESSAGES_LIMIT : DEFAULT_ADMIN_ROOM_MESSAGES_LIMIT;
    const moderationPerRoomLimit = compactMode ? COMPACT_ADMIN_ROOM_MODERATION_LIMIT : DEFAULT_ADMIN_ROOM_MODERATION_LIMIT;
    const flatMessagesLimit = compactMode ? COMPACT_ADMIN_FLAT_MESSAGES_LIMIT : DEFAULT_ADMIN_FLAT_MESSAGES_LIMIT;

    const db = getServiceSupabase();
    let games: any[] = [];

    let gamesQuery: any = db
      .from('games')
      .select(`
        id,
        status,
        created_at,
        started_at,
        finished_at,
        chat_cooldown_seconds,
        winner,
        game_players (
          user_id,
          username,
          status
        )
      `)
      .order('created_at', { ascending: false })
      .limit(gamesLimit);

    if (gameIdFilter) {
      gamesQuery = gamesQuery.eq('id', gameIdFilter).limit(1);
    }

    let gamesResult: any = await gamesQuery;

    if (gamesResult.error && isMissingColumnError(gamesResult.error, 'chat_cooldown_seconds')) {
      let fallbackGamesQuery: any = db
        .from('games')
        .select(`
          id,
          status,
          created_at,
          started_at,
          finished_at,
          winner,
          game_players (
            user_id,
            username,
            status
          )
        `)
        .order('created_at', { ascending: false })
        .limit(gamesLimit);

      if (gameIdFilter) {
        fallbackGamesQuery = fallbackGamesQuery.eq('id', gameIdFilter).limit(1);
      }

      gamesResult = await fallbackGamesQuery;

      if (!gamesResult.error) {
        games = (gamesResult.data || []).map((game: any) => ({
          ...game,
          chat_cooldown_seconds: DEFAULT_CHAT_COOLDOWN_SECONDS,
        }));
      }
    } else if (!gamesResult.error) {
      games = gamesResult.data || [];
    }

    if (gamesResult.error) throw gamesResult.error;

    const gameIds = games.map((game) => game.id);

    const [eventsResult, rawBansResult, rawBlacklistResult] = await Promise.all([
      gameIds.length
        ? db
            .from('game_events')
            .select('id, game_id, event_type, created_at, event_data')
            .in('game_id', gameIds)
            .in('event_type', [...CHAT_EVENT_TYPES])
            .order('created_at', { ascending: false })
            .limit(eventsLimit)
        : Promise.resolve({ data: [], error: null }),
      gameIds.length
        ? db
            .from('game_chat_bans')
            .select('id, game_id, user_id, username, reason, banned_by_username, active, created_at, updated_at')
            .in('game_id', gameIds)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      db
        .from('chat_blacklist_terms')
        .select('id, term, is_default, created_at')
        .order('is_default', { ascending: false })
        .order('term', { ascending: true }),
    ]);

    if (eventsResult.error) throw eventsResult.error;

    const bansResult =
      rawBansResult.error && isMissingRelationError(rawBansResult.error, 'game_chat_bans')
        ? { data: [], error: null }
        : rawBansResult;

    const blacklistResult =
      rawBlacklistResult.error && isMissingRelationError(rawBlacklistResult.error, 'chat_blacklist_terms')
        ? { data: await loadBlacklistFromSystemConfig(db), error: null }
        : rawBlacklistResult;

    if (bansResult.error) throw bansResult.error;
    if (blacklistResult.error) throw blacklistResult.error;

    const events = eventsResult.data || [];
    const activeBans = bansResult.data || [];
    const blacklist = blacklistResult.data || [];

    const roomMap = new Map<string, any>();

    for (const game of games || []) {
      roomMap.set(game.id, {
        gameId: game.id,
        status: game.status,
        createdAt: game.created_at,
        startedAt: game.started_at,
        finishedAt: game.finished_at,
        cooldownSeconds: game.chat_cooldown_seconds || DEFAULT_CHAT_COOLDOWN_SECONDS,
        participants: new Map<string, { userId: string | null; username: string }>(),
        recentMessages: [] as any[],
        moderationEvents: [] as any[],
        activeBans: [] as any[],
        messageCount: 0,
      });

      for (const player of game.game_players || []) {
        const key = player.user_id || `username:${player.username}`;
        roomMap.get(game.id).participants.set(key, {
          userId: player.user_id || null,
          username: player.username,
        });
      }
    }

    for (const event of events) {
      const room = roomMap.get(event.game_id);
      if (!room) continue;

      if (event.event_type === 'chat_message') {
        room.messageCount += 1;
        if (room.recentMessages.length < messagesPerRoomLimit) {
          room.recentMessages.push(formatChatMessage(event));
        }
      } else {
        room.moderationEvents.push(formatModerationEvent(event));
      }

      const userId = event.event_data?.userId || null;
      const username = event.event_data?.username || null;
      if (username) {
        room.participants.set(userId || `username:${username}`, {
          userId,
          username,
        });
      }
    }

    for (const ban of activeBans) {
      const room = roomMap.get(ban.game_id);
      if (!room || !ban.active) continue;

      room.activeBans.push({
        id: ban.id,
        gameId: ban.game_id,
        userId: ban.user_id,
        username: ban.username,
        reason: ban.reason,
        bannedByName: ban.banned_by_username || 'Administración',
        createdAt: ban.created_at,
        updatedAt: ban.updated_at,
      });

      room.participants.set(ban.user_id || `username:${ban.username}`, {
        userId: ban.user_id || null,
        username: ban.username,
      });
    }

    const rooms = Array.from(roomMap.values()).map((room) => ({
      ...room,
      participants: Array.from(room.participants.values()).sort((a: any, b: any) => a.username.localeCompare(b.username, 'es')),
      recentMessages: room.recentMessages.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      moderationEvents: room.moderationEvents
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, moderationPerRoomLimit),
      activeBans: room.activeBans.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      participantCount: room.participants.size,
    }));

    const flatMessages = events
      .filter((event) => event.event_type === 'chat_message')
      .slice(0, flatMessagesLimit)
      .map((event) => ({
        id: event.id,
        gameId: event.game_id,
        created_at: event.created_at,
        event_data: {
          username: event.event_data?.username || 'Sistema',
          text: event.event_data?.text || '',
          userId: event.event_data?.userId || null,
        },
        games: {
          status: roomMap.get(event.game_id)?.status || 'unknown',
        },
      }));

    return NextResponse.json({
      messages: flatMessages,
      rooms,
      blacklist: blacklist.map((term) => ({
        id: term.id,
        term: term.term,
        isDefault: term.is_default,
        createdAt: term.created_at,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}, { requireAdmin: true });

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const db = getServiceSupabase();
    const body = await req.json();
    const action = typeof body.action === 'string' ? body.action : '';

    if (!req.user?.userId) {
      return NextResponse.json({ error: 'Usuario administrador no identificado' }, { status: 401 });
    }

    const { data: adminUser } = await db
      .from('users')
      .select('username')
      .eq('id', req.user.userId)
      .maybeSingle();

    const adminName = adminUser?.username || 'Administración';
    const actorIsSuperAdmin = isSuperAdminPayload(req.user);

    if (action === 'setCooldown') {
      const gameId = typeof body.gameId === 'string' ? body.gameId : '';
      const cooldownSeconds = Number(body.cooldownSeconds);

      if (!gameId || !Number.isFinite(cooldownSeconds)) {
        return NextResponse.json({ error: 'Datos incompletos para actualizar el cooldown' }, { status: 400 });
      }

      const normalizedCooldown = Math.max(MIN_COOLDOWN_SECONDS, Math.min(MAX_COOLDOWN_SECONDS, Math.round(cooldownSeconds)));

      const { error } = await db
        .from('games')
        .update({ chat_cooldown_seconds: normalizedCooldown, updated_at: new Date().toISOString() })
        .eq('id', gameId);

      if (error) {
        if (isMissingColumnError(error, 'chat_cooldown_seconds')) {
          return NextResponse.json({
            error: 'La configuración persistente del anti-spam requiere aplicar la migración 20260328010000_chat_moderation.sql',
          }, { status: 409 });
        }
        throw error;
      }

      await db.from('game_events').insert({
        game_id: gameId,
        event_type: 'chat_cooldown_updated',
        event_data: {
          actorName: adminName,
          cooldownSeconds: normalizedCooldown,
          message: `${adminName} actualizó el cooldown del chat a ${normalizedCooldown}s.`,
        },
      });

      return NextResponse.json({ success: true, cooldownSeconds: normalizedCooldown });
    }

    if (action === 'banUser') {
      const gameId = typeof body.gameId === 'string' ? body.gameId : '';
      const userId = typeof body.userId === 'string' ? body.userId : '';
      const username = typeof body.username === 'string' ? body.username : 'Jugador';
      const reason = typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim() : 'Moderación de chat';

      if (!gameId || !userId) {
        return NextResponse.json({ error: 'Datos incompletos para banear del chat' }, { status: 400 });
      }

      const { data: targetUser, error: targetError } = await db
        .from('users')
        .select('role, email, email_key')
        .eq('id', userId)
        .single();

      if (targetError || !targetUser) {
        return NextResponse.json({ error: 'Usuario objetivo no encontrado' }, { status: 404 });
      }

      const targetIsSuperAdmin =
        isSuperAdminEmailKey(targetUser.email_key) ||
        isSuperAdminEmail(decryptEmail(targetUser.email));
      if (targetIsSuperAdmin && !actorIsSuperAdmin) {
        return NextResponse.json({ error: 'No tienes permisos para moderar al super administrador' }, { status: 403 });
      }

      if (targetUser.role === 'admin' && !actorIsSuperAdmin) {
        return NextResponse.json({ error: 'Solo el super administrador puede moderar cuentas administradoras' }, { status: 403 });
      }

      const { error } = await db
        .from('game_chat_bans')
        .upsert({
          game_id: gameId,
          user_id: userId,
          username,
          reason,
          banned_by: req.user.userId,
          banned_by_username: adminName,
          active: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'game_id,user_id' });

      if (error) {
        if (isMissingRelationError(error, 'game_chat_bans')) {
          return NextResponse.json({
            error: 'El baneo de chat por sala requiere aplicar la migración 20260328010000_chat_moderation.sql',
          }, { status: 409 });
        }
        throw error;
      }

      await db.from('game_events').insert({
        game_id: gameId,
        event_type: 'chat_user_banned',
        event_data: {
          userId,
          username,
          actorName: adminName,
          reason,
          message: `${username} fue bloqueado del chat por ${adminName}: ${reason}.`,
        },
      });

      return NextResponse.json({ success: true, reason });
    }

    if (action === 'unbanUser') {
      const gameId = typeof body.gameId === 'string' ? body.gameId : '';
      const userId = typeof body.userId === 'string' ? body.userId : '';
      const username = typeof body.username === 'string' ? body.username : 'Jugador';

      if (!gameId || !userId) {
        return NextResponse.json({ error: 'Datos incompletos para levantar el baneo' }, { status: 400 });
      }

      const { data: targetUser, error: targetError } = await db
        .from('users')
        .select('role, email, email_key')
        .eq('id', userId)
        .single();

      if (targetError || !targetUser) {
        return NextResponse.json({ error: 'Usuario objetivo no encontrado' }, { status: 404 });
      }

      const targetIsSuperAdmin =
        isSuperAdminEmailKey(targetUser.email_key) ||
        isSuperAdminEmail(decryptEmail(targetUser.email));
      if (targetIsSuperAdmin && !actorIsSuperAdmin) {
        return NextResponse.json({ error: 'No tienes permisos para moderar al super administrador' }, { status: 403 });
      }

      if (targetUser.role === 'admin' && !actorIsSuperAdmin) {
        return NextResponse.json({ error: 'Solo el super administrador puede moderar cuentas administradoras' }, { status: 403 });
      }

      const { error } = await db
        .from('game_chat_bans')
        .update({
          active: false,
          updated_at: new Date().toISOString(),
          banned_by: req.user.userId,
          banned_by_username: adminName,
        })
        .eq('game_id', gameId)
        .eq('user_id', userId)
        .eq('active', true);

      if (error) {
        if (isMissingRelationError(error, 'game_chat_bans')) {
          return NextResponse.json({
            error: 'El baneo de chat por sala requiere aplicar la migración 20260328010000_chat_moderation.sql',
          }, { status: 409 });
        }
        throw error;
      }

      await db.from('game_events').insert({
        game_id: gameId,
        event_type: 'chat_user_unbanned',
        event_data: {
          userId,
          username,
          actorName: adminName,
          message: `${adminName} levantó el bloqueo de chat para ${username}.`,
        },
      });

      return NextResponse.json({ success: true });
    }

    if (action === 'clearRoomChat') {
      const gameId = typeof body.gameId === 'string' ? body.gameId : '';

      if (!gameId) {
        return NextResponse.json({ error: 'Selecciona una sala válida para limpiar el chat' }, { status: 400 });
      }

      const { data: existingMessages, error: fetchMessagesError } = await db
        .from('game_events')
        .select('id')
        .eq('game_id', gameId)
        .eq('event_type', 'chat_message');

      if (fetchMessagesError) throw fetchMessagesError;

      const messageIds = (existingMessages || []).map((event) => event.id);

      if (messageIds.length > 0) {
        const { error: deleteMessagesError } = await db
          .from('game_events')
          .delete()
          .in('id', messageIds)
          .eq('event_type', 'chat_message');

        if (deleteMessagesError) throw deleteMessagesError;
      }

      const clearedCount = messageIds.length;
      await db.from('game_events').insert({
        game_id: gameId,
        event_type: 'chat_message_deleted',
        event_data: {
          actorName: adminName,
          clearedAll: true,
          clearedCount,
          message: clearedCount > 0
            ? `${adminName} limpió todo el chat de la sala (${clearedCount} mensajes).`
            : `${adminName} limpió el chat de la sala, pero no había mensajes para eliminar.`,
        },
      });

      return NextResponse.json({
        success: true,
        clearedCount,
        notice: clearedCount > 0
          ? `${adminName} limpió el chat de la sala (${clearedCount} mensajes).`
          : `${adminName} limpió el chat de la sala.`,
      });
    }

    if (action === 'addBlacklistTerm') {
      const rawTerm = typeof body.term === 'string' ? body.term : '';
      const term = rawTerm.trim().toLowerCase();

      if (!term) {
        return NextResponse.json({ error: 'Escribe una palabra para añadir a la lista negra' }, { status: 400 });
      }

      const { data, error } = await db
        .from('chat_blacklist_terms')
        .insert({
          term,
          is_default: false,
          created_by: req.user.userId,
        })
        .select('id, term, is_default, created_at')
        .single();

      if (error) {
        if (error.code === '23505') {
          return NextResponse.json({ error: 'Esa palabra ya existe en la lista negra' }, { status: 409 });
        }
        if (isMissingRelationError(error, 'chat_blacklist_terms')) {
          const currentTerms = await loadBlacklistFromSystemConfig(db);
          if (currentTerms.some((current) => current.term === term)) {
            return NextResponse.json({ error: 'Esa palabra ya existe en la lista negra' }, { status: 409 });
          }

          const savedTerms = await saveBlacklistToSystemConfig(
            db,
            req.user.userId,
            [...currentTerms.map((current) => current.term), term]
          );

          const savedTerm = savedTerms.find((current) => current.term === term);
          return NextResponse.json({
            success: true,
            term: {
              id: savedTerm?.id || `config:${term}`,
              term,
              isDefault: false,
              createdAt: savedTerm?.created_at || new Date().toISOString(),
            },
          });
        }
        throw error;
      }

      return NextResponse.json({
        success: true,
        term: {
          id: data.id,
          term: data.term,
          isDefault: data.is_default,
          createdAt: data.created_at,
        },
      });
    }

    if (action === 'removeBlacklistTerm') {
      const id = typeof body.id === 'string' ? body.id : '';
      if (!id) {
        return NextResponse.json({ error: 'Selecciona una palabra válida para eliminar' }, { status: 400 });
      }

      const { data: existing, error: existingError } = await db
        .from('chat_blacklist_terms')
        .select('id, is_default')
        .eq('id', id)
        .maybeSingle();

      if (existingError) {
        if (isMissingRelationError(existingError, 'chat_blacklist_terms')) {
          const currentTerms = await loadBlacklistFromSystemConfig(db);
          const termToRemove = id.startsWith('config:') ? id.replace(/^config:/, '') : id;
          const existingConfigTerm = currentTerms.find((term) => term.term === termToRemove);

          if (!existingConfigTerm) {
            return NextResponse.json({ error: 'La palabra no existe' }, { status: 404 });
          }
          if (existingConfigTerm.is_default) {
            return NextResponse.json({ error: 'Las palabras base no se pueden eliminar' }, { status: 400 });
          }

          await saveBlacklistToSystemConfig(
            db,
            req.user.userId,
            currentTerms
              .map((term) => term.term)
              .filter((term) => term !== termToRemove)
          );

          return NextResponse.json({ success: true });
        }
        throw existingError;
      }
      if (!existing) {
        return NextResponse.json({ error: 'La palabra no existe' }, { status: 404 });
      }
      if (existing.is_default) {
        return NextResponse.json({ error: 'Las palabras base no se pueden eliminar' }, { status: 400 });
      }

      const { error } = await db
        .from('chat_blacklist_terms')
        .delete()
        .eq('id', id);

      if (error) {
        if (isMissingRelationError(error, 'chat_blacklist_terms')) {
          return NextResponse.json({
            error: 'La lista negra editable requiere aplicar la migración 20260328010000_chat_moderation.sql',
          }, { status: 409 });
        }
        throw error;
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Acción de moderación no soportada' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}, { requireAdmin: true });
