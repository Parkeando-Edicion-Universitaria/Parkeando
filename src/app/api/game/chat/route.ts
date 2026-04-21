import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { getServiceSupabase } from '@/lib/supabase';
import { getGameById, PlayerStatus } from '@/lib/game-manager';
import leoProfanity from 'leo-profanity';

const CHAT_EVENT_TYPES = [
  'chat_message',
  'chat_message_deleted',
  'chat_user_banned',
  'chat_user_unbanned',
  'chat_cooldown_updated',
] as const;

const CHAT_HISTORY_LIMIT = 80;
const DEFAULT_CHAT_COOLDOWN_SECONDS = 3;
const MAX_CHAT_MESSAGE_LENGTH = 180;
const SPAM_WINDOW_MS = 4000;
const SPAM_BURST_LIMIT = 3;
const CHAT_BLACKLIST_CACHE_TTL_MS = 5 * 60 * 1000;
const CHAT_COOLDOWN_MIN_LOOKBACK_MS = 12000;
const CHAT_RECENT_MESSAGES_LIMIT = 12;
const CHAT_LINK_REGEX = /(?:https?:\/\/|www\.|(?:[a-z0-9-]+\.)+[a-z]{2,})(?:[/?#][^\s]*)?/i;
const CHAT_ALLOWED_TEXT_REGEX = /^[\p{L}\p{M}\p{N}\s.,!¡?¿@#%&*()\-\/:;='"_]+$/u;
const CHAT_SUSPICIOUS_PAYLOAD_REGEX = /<\s*\/?\s*\w+[^>]*>|javascript:|on\w+\s*=|(?:union\s+select|drop\s+table|insert\s+into|delete\s+from|update\s+\w+\s+set)\b|(?:--|\/\*|\*\/)/i;

const DEFAULT_BLACKLIST_TERMS = [
  'puto', 'puta', 'mierda', 'pendejo', 'pendeja', 'cabron', 'cabrona',
  'maricon', 'zorra', 'verga', 'coño', 'joder', 'pinga', 'culo', 'bitch',
  'fuck', 'shit', 'asshole', 'dick', 'cunt', 'whore', 'slut', 'bastardo',
  'perra', 'marica', 'huevon', 'mame', 'mamar',
] as const;

let profanityDictionarySignature = '';
const baseProfanityTerms = Array.from(new Set(DEFAULT_BLACKLIST_TERMS.map((term) => term.trim().toLowerCase())));
const blacklistCache: { expiresAt: number; terms: string[] } = {
  expiresAt: 0,
  terms: [...baseProfanityTerms],
};

const sanitizeChatScalar = (value: unknown, maxLength: number): string => {
  const normalized = String(value || '')
    .normalize('NFKC')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized.slice(0, maxLength);
};

const sanitizeChatTextForRender = (value: unknown, maxLength = 180): string => {
  return sanitizeChatScalar(value, maxLength)
    .replace(/<[^>]*>/g, '')
    .replace(/[^\p{L}\p{M}\p{N}\s.,!¡?¿@#%&*()\-\/+:;='"_]/gu, '')
    .trim();
};

const sanitizeUsername = (value: unknown): string => {
  return sanitizeChatScalar(value, 32)
    .replace(/[^\p{L}\p{M}\p{N}\s._-]/gu, '')
    .trim();
};

const normalizeTerm = (value: unknown) => String(value || '').trim().toLowerCase();

const normalizeProfanityCandidate = (value: unknown): string =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[0-9]/g, (digit) => {
      const leetMap: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't' };
      return leetMap[digit] || digit;
    })
    .toLowerCase();

const syncProfanityDictionary = (blacklistTerms: string[] = []) => {
  const mergedTerms = Array.from(new Set([
    ...baseProfanityTerms,
    ...(blacklistTerms || []).map((term) => normalizeTerm(term)).filter(Boolean),
  ]));

  const signature = mergedTerms.join('|');
  if (signature === profanityDictionarySignature) return;

  leoProfanity.reset();
  leoProfanity.add(mergedTerms);
  profanityDictionarySignature = signature;
};

const sanitizeChatMessageText = (value: unknown, maxLength = MAX_CHAT_MESSAGE_LENGTH) =>
  sanitizeChatScalar(value, maxLength)
    .replace(/<[^>]*>/g, '')
    .trim();

const loadBlacklistTerms = async (db: ReturnType<typeof getServiceSupabase>): Promise<string[]> => {
  if (Date.now() < blacklistCache.expiresAt && blacklistCache.terms.length > 0) {
    return blacklistCache.terms;
  }

  const { data, error } = await db
    .from('chat_blacklist_terms')
    .select('term')
    .order('is_default', { ascending: false })
    .order('term', { ascending: true });

  if (error) {
    if (isMissingRelationError(error, 'chat_blacklist_terms')) {
      blacklistCache.terms = [...DEFAULT_BLACKLIST_TERMS];
      blacklistCache.expiresAt = Date.now() + CHAT_BLACKLIST_CACHE_TTL_MS;
      return blacklistCache.terms;
    }

    if (blacklistCache.terms.length > 0) {
      return blacklistCache.terms;
    }

    throw error;
  }

  const terms = (data || [])
    .map((row) => normalizeTerm(row.term))
    .filter(Boolean);

  blacklistCache.terms = terms.length > 0 ? terms : [...DEFAULT_BLACKLIST_TERMS];
  blacklistCache.expiresAt = Date.now() + CHAT_BLACKLIST_CACHE_TTL_MS;

  return blacklistCache.terms;
};

const validateIncomingChatText = (value: unknown):
  | { ok: true; text: string }
  | { ok: false; code: string; title: string; description: string } => {
  const normalized = sanitizeChatMessageText(value, MAX_CHAT_MESSAGE_LENGTH + 20);

  if (!normalized) {
    return {
      ok: false,
      code: 'empty_message',
      title: 'Mensaje vacío',
      description: 'Escribe algo antes de enviar.',
    };
  }

  if (normalized.length > MAX_CHAT_MESSAGE_LENGTH) {
    return {
      ok: false,
      code: 'message_too_long',
      title: 'Mensaje demasiado largo',
      description: `El chat acepta hasta ${MAX_CHAT_MESSAGE_LENGTH} caracteres por mensaje.`,
    };
  }

  if (CHAT_LINK_REGEX.test(normalized)) {
    return {
      ok: false,
      code: 'links_blocked',
      title: 'Links no permitidos',
      description: 'Por seguridad, el chat no permite enlaces ni dominios externos.',
    };
  }

  if (CHAT_SUSPICIOUS_PAYLOAD_REGEX.test(normalized)) {
    return {
      ok: false,
      code: 'suspicious_payload',
      title: 'Contenido bloqueado',
      description: 'El mensaje contiene patrones bloqueados por seguridad.',
    };
  }

  if (!CHAT_ALLOWED_TEXT_REGEX.test(normalized)) {
    return {
      ok: false,
      code: 'invalid_characters',
      title: 'Caracteres no permitidos',
      description: 'Usa solo letras, números y signos de puntuación comunes.',
    };
  }

  return {
    ok: true,
    text: normalized,
  };
};

const censorMessage = (text: string, blacklistTerms: string[]): string => {
  syncProfanityDictionary(blacklistTerms);

  const chunks = text.split(/([\s,.;?!]+)/);
  for (let index = 0; index < chunks.length; index += 1) {
    const value = chunks[index];
    if (!value || !value.trim()) continue;

    const normalized = normalizeProfanityCandidate(value);
    if (leoProfanity.check(normalized)) {
      chunks[index] = '*'.repeat(Math.max(0, value.length));
    }
  }

  return sanitizeChatTextForRender(chunks.join(''), MAX_CHAT_MESSAGE_LENGTH);
};

const isMissingRelationError = (error: any, relation: string) => {
  const message = String(error?.message || '').toLowerCase();
  return message.includes(relation.toLowerCase()) && (
    message.includes('does not exist') ||
    message.includes('schema cache') ||
    message.includes('could not find')
  );
};

const isMissingColumnError = (error: any, column: string) =>
  String(error?.message || '').includes(`'${column}'`) ||
  String(error?.message || '').toLowerCase().includes(column.toLowerCase());

const formatChatTimelineEntry = (event: any) => {
  if (event.event_type === 'chat_message') {
    return {
      id: event.id,
      gameId: event.game_id,
      userId: event.event_data?.userId || null,
      username: sanitizeUsername(event.event_data?.username || 'Sistema') || 'Sistema',
      text: sanitizeChatTextForRender(event.event_data?.text || ''),
      isAdmin: Boolean(event.event_data?.isAdmin),
      title: event.event_data?.title || null,
      timestamp: event.created_at,
      isSystem: false,
      kind: 'message',
      eventType: event.event_type,
    };
  }

  return {
    id: event.id,
    gameId: event.game_id,
    userId: 'system',
    username: 'Sistema',
    text: sanitizeChatTextForRender(event.event_data?.message || 'Evento de moderación del chat.') || 'Evento de moderación del chat.',
    isAdmin: true,
    title: null,
    timestamp: event.created_at,
    isSystem: true,
    kind: 'moderation',
    eventType: event.event_type,
    targetUserId: event.event_data?.userId || null,
    deletedMessageId: event.event_data?.deletedMessageId || null,
    clearedAll: Boolean(event.event_data?.clearedAll),
    reason: event.event_data?.reason || null,
    cooldownSeconds: Number(event.event_data?.cooldownSeconds) || null,
  };
};

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const user = req.user!;
    const gameId = req.nextUrl.searchParams.get('gameId')?.trim();

    if (!gameId) {
      return NextResponse.json({ error: 'gameId es requerido' }, { status: 400 });
    }

    const game = await getGameById(gameId);
    if (!game) {
      return NextResponse.json({ error: 'Sala no encontrada' }, { status: 404 });
    }

    const isPlayer = game.players.some(
      (player) => player.userId === user.userId && player.status !== PlayerStatus.INACTIVE
    );
    const isSpectator = (game.spectators || []).includes(user.userId);

    if (!isPlayer && !isSpectator && !user.isAdmin) {
      return NextResponse.json({ error: 'No tienes acceso a este chat' }, { status: 403 });
    }

    const db = getServiceSupabase();

    let cooldownSeconds = DEFAULT_CHAT_COOLDOWN_SECONDS;
    let activeBan: { reason?: string | null } | null = null;

    const gameMetaResult = await db
      .from('games')
      .select('chat_cooldown_seconds')
      .eq('id', gameId)
      .maybeSingle();

    if (!gameMetaResult.error && gameMetaResult.data?.chat_cooldown_seconds) {
      cooldownSeconds = Number(gameMetaResult.data.chat_cooldown_seconds) || DEFAULT_CHAT_COOLDOWN_SECONDS;
    } else if (gameMetaResult.error && !isMissingColumnError(gameMetaResult.error, 'chat_cooldown_seconds')) {
      throw gameMetaResult.error;
    }

    const banResult = await db
      .from('game_chat_bans')
      .select('reason, active')
      .eq('game_id', gameId)
      .eq('user_id', user.userId)
      .eq('active', true)
      .maybeSingle();

    if (!banResult.error) {
      activeBan = banResult.data || null;
    } else if (!isMissingRelationError(banResult.error, 'game_chat_bans')) {
      throw banResult.error;
    }

    const { data: events, error: eventsError } = await db
      .from('game_events')
      .select('id, game_id, created_at, event_type, event_data')
      .eq('game_id', gameId)
      .in('event_type', [...CHAT_EVENT_TYPES])
      .order('created_at', { ascending: false })
      .limit(CHAT_HISTORY_LIMIT);

    if (eventsError) throw eventsError;

    return NextResponse.json({
      gameId,
      status: game.status,
      cooldownSeconds,
      isChatBanned: Boolean(activeBan),
      banReason: activeBan?.reason || null,
      messages: (events || [])
        .map(formatChatTimelineEntry)
        .sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime()),
    });
  } catch (error: any) {
    console.error('[Game Chat] Error al cargar estado autoritativo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const user = req.user!;
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const gameId = sanitizeChatScalar(body?.gameId, 80);

    if (!gameId) {
      return NextResponse.json({ error: 'gameId es requerido' }, { status: 400 });
    }

    const game = await getGameById(gameId);
    if (!game) {
      return NextResponse.json({ error: 'Sala no encontrada' }, { status: 404 });
    }

    const isPlayer = game.players.some(
      (player) => player.userId === user.userId && player.status !== PlayerStatus.INACTIVE
    );
    const isSpectator = (game.spectators || []).includes(user.userId);

    if (!isPlayer && !isSpectator && !user.isAdmin) {
      return NextResponse.json({ error: 'No tienes acceso a este chat' }, { status: 403 });
    }

    const validation = validateIncomingChatText(body?.text);
    if (!validation.ok) {
      return NextResponse.json(
        {
          code: validation.code,
          title: validation.title,
          description: validation.description,
        },
        { status: 400 }
      );
    }

    const db = getServiceSupabase();

    let cooldownSeconds = DEFAULT_CHAT_COOLDOWN_SECONDS;
    const gameMetaResult = await db
      .from('games')
      .select('chat_cooldown_seconds')
      .eq('id', gameId)
      .maybeSingle();

    if (!gameMetaResult.error && gameMetaResult.data?.chat_cooldown_seconds) {
      cooldownSeconds = Number(gameMetaResult.data.chat_cooldown_seconds) || DEFAULT_CHAT_COOLDOWN_SECONDS;
    } else if (gameMetaResult.error && !isMissingColumnError(gameMetaResult.error, 'chat_cooldown_seconds')) {
      throw gameMetaResult.error;
    }

    const banResult = await db
      .from('game_chat_bans')
      .select('reason, active')
      .eq('game_id', gameId)
      .eq('user_id', user.userId)
      .eq('active', true)
      .maybeSingle();

    let activeBan: { reason?: string | null } | null = null;
    if (!banResult.error) {
      activeBan = banResult.data || null;
    } else if (!isMissingRelationError(banResult.error, 'game_chat_bans')) {
      throw banResult.error;
    }

    if (activeBan) {
      return NextResponse.json(
        {
          code: 'chat_banned',
          title: 'No puedes escribir en este chat',
          description: activeBan.reason || 'El administrador bloqueó tu acceso al chat de esta sala.',
        },
        { status: 403 }
      );
    }

    const nowMs = Date.now();
    if (!user.isAdmin && cooldownSeconds > 0) {
      const lookbackMs = Math.max(cooldownSeconds * 1000, SPAM_WINDOW_MS, CHAT_COOLDOWN_MIN_LOOKBACK_MS);
      const sinceIso = new Date(nowMs - lookbackMs).toISOString();

      let ownMessageTimes: number[] = [];

      const recentByUserResult = await db
        .from('game_events')
        .select('created_at')
        .eq('game_id', gameId)
        .eq('event_type', 'chat_message')
        .filter('event_data->>userId', 'eq', user.userId)
        .gte('created_at', sinceIso)
        .order('created_at', { ascending: false })
        .limit(CHAT_RECENT_MESSAGES_LIMIT);

      if (!recentByUserResult.error) {
        ownMessageTimes = (recentByUserResult.data || [])
          .map((event) => new Date(event.created_at).getTime())
          .filter((value) => Number.isFinite(value));
      } else {
        const fallbackResult = await db
          .from('game_events')
          .select('created_at, event_data')
          .eq('game_id', gameId)
          .eq('event_type', 'chat_message')
          .gte('created_at', sinceIso)
          .order('created_at', { ascending: false })
          .limit(CHAT_RECENT_MESSAGES_LIMIT * 3);

        if (fallbackResult.error) throw fallbackResult.error;

        ownMessageTimes = (fallbackResult.data || [])
          .filter((event) => String(event.event_data?.userId || '') === user.userId)
          .map((event) => new Date(event.created_at).getTime())
          .filter((value) => Number.isFinite(value));
      }

      const latestMessageAt = ownMessageTimes[0] || 0;
      const cooldownMs = cooldownSeconds * 1000;
      const remainingMs = latestMessageAt ? Math.max(0, cooldownMs - (nowMs - latestMessageAt)) : 0;

      if (remainingMs > 0) {
        return NextResponse.json(
          {
            code: 'cooldown',
            title: 'Anti-spam activado',
            description: `Estás enviando mensajes demasiado rápido. Espera ${Math.ceil(remainingMs / 1000)}s para volver a escribir.`,
            cooldownSeconds,
            remainingMs,
          },
          { status: 429 }
        );
      }

      const burstMessages = ownMessageTimes.filter((timestamp) => nowMs - timestamp < SPAM_WINDOW_MS).length;
      if (burstMessages >= SPAM_BURST_LIMIT) {
        return NextResponse.json(
          {
            code: 'cooldown',
            title: 'Anti-spam activado',
            description: `Mandaste demasiados mensajes seguidos. Espera ${cooldownSeconds}s antes de volver a escribir.`,
            cooldownSeconds,
            remainingMs: cooldownMs,
          },
          { status: 429 }
        );
      }
    }

    const blacklistTerms = await loadBlacklistTerms(db);
    const censoredText = censorMessage(validation.text, blacklistTerms);

    if (!censoredText) {
      return NextResponse.json(
        {
          code: 'empty_message',
          title: 'Mensaje vacío',
          description: 'El texto quedó vacío después del filtrado.',
        },
        { status: 400 }
      );
    }

    const playerRef = game.players.find((player) => player.userId === user.userId) ?? null;
    const fallbackName = sanitizeUsername(body?.username);
    const username = sanitizeUsername(playerRef?.username || fallbackName || (user.isAdmin ? 'Administración' : 'Jugador'))
      || (user.isAdmin ? 'Administración' : 'Jugador');
    const title = sanitizeChatScalar(body?.title, 40) || null;
    const clientMessageId = sanitizeChatScalar(body?.clientMessageId, 120) || null;

    const { data: storedEvent, error: insertError } = await db
      .from('game_events')
      .insert({
        game_id: gameId,
        event_type: 'chat_message',
        event_data: {
          userId: user.userId,
          username,
          text: censoredText,
          isAdmin: Boolean(user.isAdmin),
          title,
          timestamp: new Date().toISOString(),
        },
      })
      .select('id, created_at, event_data')
      .single();

    if (insertError || !storedEvent) {
      throw insertError || new Error('No se pudo persistir el mensaje');
    }

    const payload = {
      id: storedEvent.id,
      gameId,
      userId: user.userId,
      username,
      text: sanitizeChatTextForRender(storedEvent.event_data?.text || censoredText),
      isAdmin: Boolean(user.isAdmin),
      title,
      timestamp: storedEvent.created_at,
      clientMessageId,
    };

    const nextAllowedAt = !user.isAdmin && cooldownSeconds > 0
      ? new Date(Date.now() + (cooldownSeconds * 1000)).toISOString()
      : null;

    return NextResponse.json({
      ok: true,
      payload,
      cooldownSeconds: user.isAdmin ? 0 : cooldownSeconds,
      nextAllowedAt,
    });
  } catch (error: any) {
    console.error('[Game Chat] Error al enviar mensaje:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
});
