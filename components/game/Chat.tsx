'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAudio } from '@/lib/audio';
import { useAuthStore } from '@/store/authStore';
import { sileo } from 'sileo';
import { supabase } from '@/lib/supabase';
import { measureMultilineTextHeightWithPretext } from '@/lib/pretext';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';

interface Message {
  id: string;
  gameId?: string;
  userId: string;
  username: string;
  text: string;
  isAdmin: boolean;
  title?: string | null;
  timestamp: string;
  isSystem?: boolean;
  kind?: string;
  pending?: boolean;
  clientMessageId?: string;
  eventType?: string;
  targetUserId?: string | null;
  deletedMessageId?: string | null;
  clearedAll?: boolean;
  reason?: string | null;
  cooldownSeconds?: number | null;
}

interface ChatProps {
  gameId: unknown;
  playerName: string;
  onSendMessage?: (message: string) => void;
}

const MAX_CHAT_MESSAGE_LENGTH = 180;
const CHAT_LINK_REGEX = /(?:https?:\/\/|www\.|(?:[a-z0-9-]+\.)+[a-z]{2,})(?:[/?#][^\s]*)?/i;
const CHAT_ALLOWED_TEXT_REGEX = /^[\p{L}\p{M}\p{N}\s.,!¡?¿@#%&*()\-\/+:;='"_]+$/u;
const CHAT_SUSPICIOUS_PAYLOAD_REGEX = /<\s*\/?\s*\w+[^>]*>|javascript:|on\w+\s*=|(?:union\s+select|drop\s+table|insert\s+into|delete\s+from|update\s+\w+\s+set)\b|(?:--|\/\*|\*\/)/i;
const CHAT_VIRTUALIZATION_THRESHOLD = 45;
const CHAT_CONTENT_HORIZONTAL_PADDING = 32;
const CHAT_MESSAGE_FONT = '400 14px "Josefin Sans"';
const CHAT_MESSAGE_LINE_HEIGHT = 20;
const CHAT_SYSTEM_FONT = '500 11px "Josefin Sans"';
const CHAT_SYSTEM_LINE_HEIGHT = 16;
const CHAT_VIRTUAL_OVERSCAN_TOP = 360;
const CHAT_VIRTUAL_OVERSCAN_BOTTOM = 480;
const CHAT_AUTHORITATIVE_SYNC_MS = 12000;
const CHAT_FALLBACK_SYNC_MS = 3000;
const CHAT_MIN_SYNC_GAP_MS = 1500;

const sanitizeClientChatText = (value: string) =>
  value
    .normalize('NFKC')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const sanitizeDisplayChatText = (value: string): string => {
  const normalized = sanitizeClientChatText(value);
  if (!normalized) return '';

  return normalized
    .replace(/<[^>]*>/g, '')
    .replace(/[^\p{L}\p{M}\p{N}\s.,!¡?¿@#%&*()\-\/+:;='"_]/gu, '')
    .trim();
};

const validateClientChatText = (rawValue: string): {
  ok: true;
  message: string;
} | {
  ok: false;
  title: string;
  description: string;
} => {
  const message = sanitizeClientChatText(rawValue);

  if (!message) {
    return {
      ok: false,
      title: 'Mensaje vacío',
      description: 'Escribe algo antes de enviar.',
    };
  }

  if (message.length > MAX_CHAT_MESSAGE_LENGTH) {
    return {
      ok: false,
      title: 'Mensaje demasiado largo',
      description: `Máximo ${MAX_CHAT_MESSAGE_LENGTH} caracteres por mensaje.`,
    };
  }

  if (CHAT_LINK_REGEX.test(message)) {
    return {
      ok: false,
      title: 'Links no permitidos',
      description: 'Por seguridad, el chat no permite enlaces ni dominios externos.',
    };
  }

  if (CHAT_SUSPICIOUS_PAYLOAD_REGEX.test(message)) {
    return {
      ok: false,
      title: 'Contenido bloqueado',
      description: 'El mensaje contiene patrones no permitidos por seguridad.',
    };
  }

  if (!CHAT_ALLOWED_TEXT_REGEX.test(message)) {
    return {
      ok: false,
      title: 'Caracteres no permitidos',
      description: 'Usa solo letras, números y signos comunes de puntuación.',
    };
  }

  return {
    ok: true,
    message,
  };
};

const normalizeGameId = (value: unknown): string => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed === '[object Object]') return '';
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
      try {
        return normalizeGameId(JSON.parse(trimmed));
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const nestedId = normalizeGameId(record.id);
    if (nestedId) return nestedId;
    const nestedGameId = normalizeGameId(record.gameId);
    if (nestedGameId) return nestedGameId;
    const nestedLegacyGameId = normalizeGameId(record.game_id);
    if (nestedLegacyGameId) return nestedLegacyGameId;
  }
  return '';
};

const sortMessagesByTimestamp = (items: Message[]) =>
  [...items].sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime());

const mergeMessages = (current: Message[], incoming: Message[]) => {
  const merged = new Map<string, Message>();

  for (const message of current) {
    merged.set(message.id, message);
  }

  for (const message of incoming) {
    const previous = merged.get(message.id);
    merged.set(message.id, previous ? { ...previous, ...message } : message);
  }

  return sortMessagesByTimestamp(Array.from(merged.values()));
};

const buildSystemMessage = (payload: {
  id?: string | null;
  text?: string | null;
  timestamp?: string | null;
  kind?: string | null;
  eventType?: string | null;
  targetUserId?: string | null;
  deletedMessageId?: string | null;
  clearedAll?: boolean;
  reason?: string | null;
  cooldownSeconds?: number | null;
}): Message => ({
  id: payload.id || `system-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  userId: 'system',
  username: 'Sistema',
  text: sanitizeDisplayChatText(payload.text || 'Evento de moderación del chat.') || 'Evento de moderación del chat.',
  isAdmin: true,
  timestamp: payload.timestamp || new Date().toISOString(),
  isSystem: true,
  kind: payload.kind || 'moderation',
  eventType: payload.eventType || undefined,
  targetUserId: payload.targetUserId || null,
  deletedMessageId: payload.deletedMessageId || null,
  clearedAll: Boolean(payload.clearedAll),
  reason: payload.reason || null,
  cooldownSeconds: payload.cooldownSeconds ?? null,
});

const getMessageRowHeight = (message: Message, contentWidth: number): number => {
  const width = Math.max(140, contentWidth);

  if (message.isSystem) {
    const textWidth = Math.max(80, width * 0.92 - 32);
    const textHeight = measureMultilineTextHeightWithPretext(message.text, {
      font: CHAT_SYSTEM_FONT,
      maxWidth: textWidth,
      lineHeight: CHAT_SYSTEM_LINE_HEIGHT,
      whiteSpace: 'pre-wrap',
    });

    // py-2 + borde + rounded pill breathing room
    return Math.max(34, Math.ceil(textHeight + 18));
  }

  const textWidth = Math.max(100, width * 0.9 - 24);
  const textWithPending = message.pending ? `${message.text} enviando...` : message.text;
  const textHeight = measureMultilineTextHeightWithPretext(textWithPending, {
    font: CHAT_MESSAGE_FONT,
    maxWidth: textWidth,
    lineHeight: CHAT_MESSAGE_LINE_HEIGHT,
    whiteSpace: 'pre-wrap',
  });

  // encabezado fila + mb-1 + burbuja rellenos
  return Math.max(52, Math.ceil(18 + 4 + textHeight + 16));
};

export default function Chat({ gameId, playerName, onSendMessage }: ChatProps) {
  const audio = useAudio();
  const { user, authenticatedFetch } = useAuthStore();
  const normalizedGameId = normalizeGameId(gameId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(3);
  const [chatBlockedReason, setChatBlockedReason] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState<number>(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const nonVirtualScrollRef = useRef<HTMLDivElement>(null);
  const virtuosoRef = useRef<VirtuosoHandle | null>(null);
  const pendingClientMessageRef = useRef<string | null>(null);
  const pendingTimeoutsRef = useRef<Map<string, number>>(new Map());
  const syncInFlightRef = useRef(false);
  const lastAuthoritativeSyncRef = useRef(0);
  const realtimeSubscribedRef = useRef(false);
  const [chatViewportHeight, setChatViewportHeight] = useState(0);
  const [chatContentWidth, setChatContentWidth] = useState(280);

  const clearPendingTimeout = (clientMessageId: string) => {
    const timeoutId = pendingTimeoutsRef.current.get(clientMessageId);
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      pendingTimeoutsRef.current.delete(clientMessageId);
    }
  };

  const upsertIncomingMessage = (incoming: Message) => {
    const safeIncoming: Message = {
      ...incoming,
      text: sanitizeDisplayChatText(incoming.text || ''),
    };

    setMessages((prev) => {
      const byId = prev.findIndex((current) => current.id === safeIncoming.id);
      if (byId >= 0) {
        const next = [...prev];
        next[byId] = { ...next[byId], ...safeIncoming, pending: false };
        if (next[byId].clientMessageId) {
          clearPendingTimeout(next[byId].clientMessageId!);
        }
        return sortMessagesByTimestamp(next);
      }

      const pendingMatchIndex = prev.findIndex((current) =>
        current.pending &&
        !current.isSystem &&
        current.userId === safeIncoming.userId &&
        current.text === safeIncoming.text &&
        Math.abs(new Date(current.timestamp).getTime() - new Date(safeIncoming.timestamp).getTime()) < 15000
      );

      if (pendingMatchIndex >= 0) {
        const next = [...prev];
        next[pendingMatchIndex] = { ...safeIncoming, pending: false };
        if (prev[pendingMatchIndex]?.clientMessageId) {
          clearPendingTimeout(prev[pendingMatchIndex].clientMessageId!);
        }
        return sortMessagesByTimestamp(next);
      }

      return sortMessagesByTimestamp([...prev, { ...safeIncoming, pending: false }]);
    });
  };

  const upsertSystemNotice = (incoming: Message) => {
    setMessages((prev) => {
      const existingIndex = prev.findIndex((message) => message.id === incoming.id);
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = { ...next[existingIndex], ...incoming, pending: false, isSystem: true };
        return sortMessagesByTimestamp(next);
      }

      return sortMessagesByTimestamp([...prev, { ...incoming, pending: false, isSystem: true }]);
    });
  };

  const appendSystemNotice = (text: string, kind = 'moderation', id?: string) => {
    upsertSystemNotice(buildSystemMessage({ id, text, kind }));
  };

  const applyAuthoritativeChatState = useCallback((payload: any) => {
    if (normalizeGameId(payload?.gameId) !== normalizedGameId) return;

    const incomingMessages = Array.isArray(payload?.messages) ? payload.messages : [];

    setMessages((prev) => {
      const pendingMessages = prev.filter((message) => message.pending);
      return mergeMessages(pendingMessages, incomingMessages);
    });

    setCooldownSeconds(payload?.cooldownSeconds || 3);
    setChatBlockedReason(
      payload?.isChatBanned
        ? (payload?.banReason || 'El administrador bloqueó tu acceso al chat.')
        : null
    );
  }, [normalizedGameId]);

  const fetchAuthoritativeChatState = useCallback(async (force = false) => {
    if (!normalizedGameId || syncInFlightRef.current) return;

    const now = Date.now();
    if (!force && now - lastAuthoritativeSyncRef.current < CHAT_MIN_SYNC_GAP_MS) {
      return;
    }

    syncInFlightRef.current = true;
    try {
      const response = await authenticatedFetch(`/api/game/chat?gameId=${encodeURIComponent(normalizedGameId)}`);
      if (!response.ok) return;

      const payload = await response.json();
      applyAuthoritativeChatState(payload);
      lastAuthoritativeSyncRef.current = Date.now();
    } catch {
      // respaldo silencioso para evitar romper la UI por errores puntuales de red.
    } finally {
      syncInFlightRef.current = false;
    }
  }, [applyAuthoritativeChatState, authenticatedFetch, normalizedGameId]);

  const rowHeights = useMemo(() => {
    return messages.map((message) => getMessageRowHeight(message, chatContentWidth));
  }, [messages, chatContentWidth]);

  const estimatedDefaultItemHeight = useMemo(() => {
    if (rowHeights.length === 0) return 68;
    const total = rowHeights.reduce((sum, height) => sum + height, 0);
    return Math.max(44, Math.round(total / rowHeights.length));
  }, [rowHeights]);

  const shouldVirtualize = messages.length >= CHAT_VIRTUALIZATION_THRESHOLD && chatViewportHeight > 0;

  const scrollToBottom = useCallback(() => {
    if (messages.length === 0) return;

    if (shouldVirtualize) {
      virtuosoRef.current?.scrollToIndex({
        index: messages.length - 1,
        align: 'end',
        behavior: 'smooth',
      });
      return;
    }

    const container = nonVirtualScrollRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  }, [messages.length, shouldVirtualize]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updateMetrics = () => {
      setChatViewportHeight(container.clientHeight);
      setChatContentWidth(Math.max(180, container.clientWidth - CHAT_CONTENT_HORIZONTAL_PADDING));
    };

    updateMetrics();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateMetrics);
      return () => window.removeEventListener('resize', updateMetrics);
    }

    const observer = new ResizeObserver(updateMetrics);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;

    const timeout = window.setTimeout(() => {
      setCooldownUntil(0);
    }, Math.max(0, cooldownUntil - Date.now()));

    return () => window.clearTimeout(timeout);
  }, [cooldownUntil]);

  useEffect(() => {
    if (!normalizedGameId) {
      setMessages([]);
      return;
    }

    setMessages([]);
    setCooldownUntil(0);
    setChatBlockedReason(null);
    lastAuthoritativeSyncRef.current = 0;
    realtimeSubscribedRef.current = false;
    void fetchAuthoritativeChatState(true);

    const applyPersistedModerationEvent = (event: Record<string, any>) => {
      const eventType = String(event.event_type || '');
      const systemMessage = buildSystemMessage({
        id: String(event.id),
        text: String(event.event_data?.message || 'Evento de moderación del chat.'),
        timestamp: String(event.created_at || new Date().toISOString()),
        kind: 'moderation',
        eventType,
        targetUserId: event.event_data?.userId ? String(event.event_data.userId) : null,
        deletedMessageId: event.event_data?.deletedMessageId ? String(event.event_data.deletedMessageId) : null,
        clearedAll: Boolean(event.event_data?.clearedAll),
        reason: event.event_data?.reason ? String(event.event_data.reason) : null,
        cooldownSeconds: Number(event.event_data?.cooldownSeconds) || null,
      });

      if (eventType === 'chat_message_deleted') {
        const deletedMessageId = systemMessage.deletedMessageId;
        if (deletedMessageId) {
          setMessages((prev) => prev.filter((message) => message.id !== deletedMessageId));
        }

        if (systemMessage.clearedAll) {
          setMessages((prev) => {
            const systemOnly = prev.filter((message) => message.isSystem && message.id !== systemMessage.id);
            return sortMessagesByTimestamp([...systemOnly, systemMessage]);
          });
          return;
        }

        upsertSystemNotice(systemMessage);
        return;
      }

      if (eventType === 'chat_user_banned') {
        upsertSystemNotice(systemMessage);
        if (systemMessage.targetUserId && systemMessage.targetUserId === user?.id) {
          setChatBlockedReason(systemMessage.reason || 'El administrador bloqueó tu acceso al chat.');
        }
        return;
      }

      if (eventType === 'chat_user_unbanned') {
        upsertSystemNotice(systemMessage);
        if (systemMessage.targetUserId && systemMessage.targetUserId === user?.id) {
          setChatBlockedReason(null);
        }
        return;
      }

      if (eventType === 'chat_cooldown_updated') {
        if (systemMessage.cooldownSeconds) {
          setCooldownSeconds(systemMessage.cooldownSeconds);
        }
        upsertSystemNotice(systemMessage);
      }
    };

    const realtimeChannel = supabase
      .channel(`chat-events-${normalizedGameId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_events',
          filter: `game_id=eq.${normalizedGameId}`,
        },
        (payload) => {
          const event = payload.new as Record<string, any> | null;
          if (!event) return;

          if (event.event_type === 'chat_message') {
            const incomingMessage: Message = {
              id: String(event.id),
              gameId: normalizedGameId,
              userId: String(event.event_data?.userId || ''),
              username: String(event.event_data?.username || 'Sistema'),
              text: String(event.event_data?.text || ''),
              isAdmin: Boolean(event.event_data?.isAdmin),
              title: event.event_data?.title || null,
              timestamp: String(event.created_at || new Date().toISOString()),
            };

            upsertIncomingMessage(incomingMessage);
            if (incomingMessage.username !== playerName) {
              audio.playClick();
            }
            return;
          }

          if (['chat_message_deleted', 'chat_user_banned', 'chat_user_unbanned', 'chat_cooldown_updated'].includes(String(event.event_type))) {
            applyPersistedModerationEvent(event);
          }
        }
      )
      .subscribe((status) => {
        const isSubscribed = status === 'SUBSCRIBED';
        realtimeSubscribedRef.current = isSubscribed;

        if (isSubscribed) {
          void fetchAuthoritativeChatState(true);
        }
      });

    const syncInterval = window.setInterval(() => {
      if (!document.hidden) {
        void fetchAuthoritativeChatState();
      }
    }, CHAT_AUTHORITATIVE_SYNC_MS);

    const fallbackSyncInterval = window.setInterval(() => {
      if (!document.hidden && !realtimeSubscribedRef.current) {
        void fetchAuthoritativeChatState(true);
      }
    }, CHAT_FALLBACK_SYNC_MS);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void fetchAuthoritativeChatState(!realtimeSubscribedRef.current);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      pendingTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      pendingTimeoutsRef.current.clear();
      window.clearInterval(syncInterval);
      window.clearInterval(fallbackSyncInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      supabase.removeChannel(realtimeChannel);
      realtimeSubscribedRef.current = false;
    };
  }, [audio, fetchAuthoritativeChatState, normalizedGameId, playerName, user?.id]);

  const handleSendMessage = async () => {
    if (inputValue.trim().length === 0 || !normalizedGameId) return;
    if (chatBlockedReason) {
      sileo.error({
        title: 'Chat bloqueado',
        description: chatBlockedReason,
      });
      return;
    }
    if (!user?.is_admin && cooldownUntil > Date.now()) {
      sileo.error({
        title: 'Anti-spam activado',
        description: `Espera ${Math.ceil((cooldownUntil - Date.now()) / 1000)}s para volver a escribir.`,
      });
      return;
    }

    const validation = validateClientChatText(inputValue);
    if (!validation.ok) {
      sileo.error({
        title: validation.title,
        description: validation.description,
      });
      return;
    }

    const messageText = validation.message;

    const clientMessageKey = `${user?.id || 'guest'}:${messageText}:${Date.now()}`;
    pendingClientMessageRef.current = clientMessageKey;
    const optimisticMessage: Message = {
      id: `temp-${clientMessageKey}`,
      clientMessageId: clientMessageKey,
      gameId: normalizedGameId,
      userId: user?.id || 'guest',
      username: playerName,
      text: messageText,
      isAdmin: user?.is_admin || false,
      title: user?.equipped?.title || null,
      timestamp: new Date().toISOString(),
      pending: true,
    };

    setMessages((prev) => sortMessagesByTimestamp([...prev, optimisticMessage]));
    const optimisticTimeout = window.setTimeout(() => {
      setMessages((prev) => prev.map((message) =>
        message.clientMessageId === clientMessageKey
          ? { ...message, pending: false }
          : message
      ));
      pendingTimeoutsRef.current.delete(clientMessageKey);
      if (pendingClientMessageRef.current === clientMessageKey) {
        pendingClientMessageRef.current = null;
      }
    }, 2500);
    pendingTimeoutsRef.current.set(clientMessageKey, optimisticTimeout);

    const payload = {
      gameId: normalizedGameId,
      userId: user?.id || 'guest',
      username: playerName,
      text: messageText,
      isAdmin: user?.is_admin || false,
      title: user?.equipped?.title || null,
      clientMessageId: clientMessageKey,
    };

    try {
      const response = await authenticatedFetch('/api/game/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responsePayload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const code = String(responsePayload?.code || '');
        const remainingMs = Number(responsePayload?.remainingMs) || 0;

        if (code === 'chat_banned') {
          setChatBlockedReason(responsePayload?.description || 'El administrador bloqueó tu acceso al chat.');
        }

        if (code === 'cooldown' && remainingMs > 0) {
          setCooldownUntil(Date.now() + remainingMs);
        }

        clearPendingTimeout(clientMessageKey);
        setMessages((prev) => prev.filter((message) => message.clientMessageId !== clientMessageKey));
        pendingClientMessageRef.current = null;

        sileo.error({
          title: responsePayload?.title || 'No se pudo enviar el mensaje',
          description: responsePayload?.description || responsePayload?.error || 'Intenta nuevamente en unos segundos.',
        });
        return;
      }

      const persistedMessage = responsePayload?.payload as Message | undefined;
      if (persistedMessage) {
        upsertIncomingMessage(persistedMessage);
      }

      // traer canónico estado de inmediato  so pares ponerse al día rápidamente si tiempo real is degradado.
      void fetchAuthoritativeChatState(true);

      if (typeof responsePayload?.nextAllowedAt === 'string') {
        const nextAllowedAt = new Date(responsePayload.nextAllowedAt).getTime();
        if (Number.isFinite(nextAllowedAt) && nextAllowedAt > Date.now()) {
          setCooldownUntil(nextAllowedAt);
        }
      }

      clearPendingTimeout(clientMessageKey);
      pendingClientMessageRef.current = null;

      onSendMessage?.(messageText);
      audio.playClick();
      setInputValue('');
    } catch {
      clearPendingTimeout(clientMessageKey);
      setMessages((prev) => prev.filter((message) => message.clientMessageId !== clientMessageKey));
      pendingClientMessageRef.current = null;
      sileo.error({
        title: 'No se pudo enviar el mensaje',
        description: 'Intenta nuevamente en unos segundos.',
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      void handleSendMessage();
    }
  };

  const renderMessage = (msg: Message) => {
    const isMe = msg.username === playerName;

    if (msg.isSystem) {
      return (
        <div className="flex justify-center">
          <div className="max-w-[92%] rounded-full border border-white/10 bg-white/5 px-4 py-2 text-center text-[11px] font-medium text-white/70">
            {msg.text}
          </div>
        </div>
      );
    }

    return (
      <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
        <div className="flex items-center gap-1.5 mb-1">
          {msg.title && (
            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase border shrink-0 ${
              msg.title === 'title_boss' ? 'bg-amber-900/60 text-amber-300 border-amber-500/40' :
              msg.title === 'title_rookie' ? 'bg-orange-900/60 text-orange-300 border-orange-500/40' : 'bg-white/10 text-white/70 border-white/20'
            }`}>
              {msg.title === 'title_boss' ? '👑 Jefe/a' : msg.title === 'title_rookie' ? '🔥 Novato' : msg.title}
            </span>
          )}
          <span className={`text-xs font-semibold truncate max-w-30 ${msg.isAdmin ? 'text-panama-yellow' : 'text-white/80'}`}>
            {msg.isAdmin && !msg.title ? '👑 ' : ''}{msg.username}
          </span>
          <span className="text-[9px] text-white/40 shrink-0">
            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div
          className={`px-3 py-2 rounded-2xl text-sm max-w-[90%] wrap-break-word ${isMe
            ? 'bg-panama-blue text-white rounded-tr-none'
            : 'bg-white/10 text-white rounded-tl-none border border-white/5'
          }`}
        >
          {msg.text}
          {msg.pending ? (
            <span className="ml-2 text-[10px] text-white/60 uppercase tracking-wide">enviando…</span>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
      <div className="bg-white/5 px-4 py-3 border-b border-white/10">
        <h3 className="text-center text-lg font-bold text-white flex items-center justify-center gap-2">
          <span>💬</span> Chat de la Partida
        </h3>
      </div>

      <div
        ref={scrollContainerRef}
        data-virtual-ready={shouldVirtualize ? 'true' : 'false'}
        data-virtual-window={shouldVirtualize ? `visible-range/${messages.length}` : undefined}
        className="flex-1 overflow-hidden p-4"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-50">
            <span className="text-3xl mb-2">👋</span>
            <p className="text-center text-white text-sm">
              ¡Sé el primero en saludar!
            </p>
          </div>
        ) : shouldVirtualize ? (
          <Virtuoso
            ref={virtuosoRef}
            className="h-full"
            data={messages}
            defaultItemHeight={estimatedDefaultItemHeight}
            increaseViewportBy={{ top: CHAT_VIRTUAL_OVERSCAN_TOP, bottom: CHAT_VIRTUAL_OVERSCAN_BOTTOM }}
            computeItemKey={(_, msg) => msg.id}
            itemContent={(_, msg) => (
              <div className="pb-3 last:pb-0">{renderMessage(msg)}</div>
            )}
            followOutput="smooth"
          />
        ) : (
          <div ref={nonVirtualScrollRef} className="h-full overflow-y-auto space-y-3 pr-1">
            {messages.map((msg) => (
              <div key={msg.id}>{renderMessage(msg)}</div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 bg-white/5 border-t border-white/10">
        <div className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={MAX_CHAT_MESSAGE_LENGTH}
            placeholder={
              chatBlockedReason
                ? `Chat bloqueado: ${chatBlockedReason}`
                : cooldownUntil > Date.now()
                  ? `Anti-spam activo: espera ${Math.ceil((cooldownUntil - Date.now()) / 1000)}s`
                  : `Escribe un mensaje sin links...`
            }
            disabled={Boolean(chatBlockedReason) || cooldownUntil > Date.now()}
            className="w-full bg-black/50 border border-white/20 text-white rounded-xl px-4 py-3 pr-12 focus:outline-none focus:border-panama-blue transition-colors text-sm"
          />
          <button
            onClick={() => { void handleSendMessage(); }}
            disabled={inputValue.trim().length === 0 || Boolean(chatBlockedReason) || cooldownUntil > Date.now()}
            aria-label="Enviar mensaje"
            title="Enviar mensaje"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-white/10 hover:bg-panama-blue text-white transition-colors disabled:opacity-50 disabled:hover:bg-white/10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
