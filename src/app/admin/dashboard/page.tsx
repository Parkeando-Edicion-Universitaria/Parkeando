'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { m } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { sileo } from 'sileo';
import Logo from '@/components/ui/Logo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  BarChart2, Gamepad2, Users, Shield, ChevronLeft, ChevronDown,
  RefreshCw, XCircle, CheckCircle2, Globe,
  Wifi, Dices, MoreVertical, Ban, Trash2, AlertTriangle, FileText,
  Archive, MessageSquare, Clock3, Trophy, Activity
} from 'lucide-react';
import { Eye, EyeOff, BarChart } from 'lucide-react';
import AuthGuard from '@/components/auth/AuthGuard';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import dynamic from 'next/dynamic';
import { exportToExcel, exportToPDF } from '@/lib/export-utils';
import { truncateSingleLineWithPretext, wrapTextWithPretext } from '@/lib/pretext';
import { supabase } from '@/lib/supabase';

// const ThreeBackground = dinámico(() => import('@/components/admin/ThreeBackground'), { ssr: false });
const AdminCharts = dynamic(() => import('@/components/admin/AdminCharts'), { ssr: false });
const InteractiveMap = dynamic(() => import('@/components/admin/InteractiveMap'), { ssr: false });

// ─── Types ───────────────────────────────────────────────────────────────────

interface DashboardStats {
  totalUsers: number;
  totalGames: number;
  activeGames: number;
  waitingGames: number;
  finishedGames: number;
  onlineUsers: number;
  totalQuestions: number;
  recentGames: Array<{
    id: string;
    status: string;
    createdAt: string;
    startedAt: string | null;
    finishedAt: string | null;
    winner: string | null;
    playerCount: number;
    queueCount: number;
    durationMinutes: number | null;
  }>;
  today?: {
    wildcardsUsed: number;
    battles: number;
    jails: number;
    specialCells: number;
    inactiveQueueKicks: number;
    avgGameDurationMinutes: number | null;
  };
  topPlayers: Array<{ username: string; gamesWon: number; totalPoints: number }>;
}
interface GameSession {
  id: string;
  status: string;
  winner?: string | null;
  winnerName?: string | null;
  playerCount?: number;
  spectatorCount?: number;
  queueCount?: number;
  durationMinutes?: number | null;
  players?: Array<{
    id: string;
    userId: string;
    username: string;
    position: number;
    points: number;
    status: string;
    color: string;
    icon: string;
    wildcards?: unknown;
  }>;
  startedAt: string | null;
  finishedAt?: string | null;
  createdAt: string;
}
interface AdminUser {
  id: string;
  email: string;
  username: string;
  is_active: boolean;
  is_admin: boolean;
  is_super_admin?: boolean;
  created_at: string;
  last_auth_at?: string | null;
  last_ip_address?: string | null;
  last_seen_at?: string | null;
  current_location?: string | null;
  total_points?: number;
  games_won?: number;
  games_played?: number;
  ip_info?: {
    ip?: string;
    private?: boolean;
    message?: string;
    isp?: {
      asn?: string | null;
      org?: string | null;
      isp?: string | null;
    };
    location?: {
      country?: string | null;
      country_code?: string | null;
      city?: string | null;
      state?: string | null;
      timezone?: string | null;
      localtime?: string | null;
    };
    risk?: {
      is_mobile?: boolean | null;
      is_vpn?: boolean | null;
      is_tor?: boolean | null;
      is_proxy?: boolean | null;
      is_datacenter?: boolean | null;
      risk_score?: number | null;
    };
  };
}
interface LoginAttempt {
  id: string; user_id: string | null; ip_address: string;
  user_agent: string; success: boolean; attempted_at: string;
}
interface IPInfo {
  ip: string; private?: boolean;
  isp?: { asn: string; org: string; isp: string };
  location?: { country: string; country_code: string; city: string; state: string; timezone: string; latitude: number; longitude: number };
  risk?: { is_mobile: boolean; is_vpn: boolean; is_tor: boolean; is_proxy: boolean; is_datacenter: boolean; risk_score: number };
}
interface AdminChatMessage {
  id: string;
  gameId: string;
  createdAt: string;
  username: string;
  userId?: string | null;
  text: string;
  isAdmin?: boolean;
  title?: string | null;
}
interface AdminChatModerationEvent {
  id: string;
  gameId: string;
  eventType: string;
  createdAt: string;
  message: string;
  username?: string | null;
  userId?: string | null;
  actorName?: string | null;
  reason?: string | null;
}
interface AdminChatBan {
  id: string;
  gameId: string;
  userId: string;
  username: string;
  reason: string;
  bannedByName?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}
interface AdminChatRoom {
  gameId: string;
  status: string;
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  cooldownSeconds: number;
  participants: Array<{ userId: string | null; username: string }>;
  recentMessages: AdminChatMessage[];
  moderationEvents: AdminChatModerationEvent[];
  activeBans: AdminChatBan[];
  participantCount: number;
  messageCount: number;
}
interface ChatBlacklistTerm {
  id: string;
  term: string;
  isDefault: boolean;
  createdAt: string;
}

interface AdminUsersPayload {
  users: AdminUser[];
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}

type TabId = 'overview' | 'games' | 'history' | 'users' | 'security' | 'chats';

const HERO_KICKER = 'Centro de control';
const HERO_TITLE = 'Dashboard Administrativo';
const HERO_DESCRIPTION = 'Lectura operativa, sesiones activas, historial y moderación en una sola consola.';

const TABS: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
  { id: 'overview', label: 'Resumen', icon: <Activity className="w-4 h-4" /> },
  { id: 'games', label: 'Activas', icon: <Gamepad2 className="w-4 h-4" /> },
  { id: 'history', label: 'Historial', icon: <Archive className="w-4 h-4" /> },
  { id: 'users', label: 'Jugadores', icon: <Users className="w-4 h-4" /> },
  { id: 'chats', label: 'Chats', icon: <MessageSquare className="w-4 h-4" /> },
  { id: 'security', label: 'Seguridad', icon: <Shield className="w-4 h-4" /> },
];

const ADMIN_TEST_ROUTES = [
  {
    href: '/test/preguntas',
    label: 'Preguntas QA',
    description: 'Valida contenido largo, respuestas y estados del modal de preguntas.',
  },
  {
    href: '/test/qr-upload',
    label: 'QR Upload',
    description: 'Prueba lectura de QR por archivo y verificacion con la API interna.',
  },
  {
    href: '/test/ruleta',
    label: 'Ruleta',
    description: 'Simula choque en casilla y flujo visual del modal de Juega Vivo.',
  },
] as const;

const ONLINE_WINDOW_MS = 60_000;
type AdminToastPosition = 'top-center' | 'bottom-center';
const getAdminToastPosition = (): AdminToastPosition =>
  typeof window !== 'undefined' && window.innerWidth < 768 ? 'top-center' : 'bottom-center';
const USERS_PAGE_SIZE = 40;

const LOCATION_LABELS: Record<string, string> = {
  inicio: 'Inicio',
  lobby: 'Lobby',
  jugando: 'En partida',
  tienda: 'Tienda',
  admin: 'Admin',
  perfil: 'Perfil',
  reglas: 'Reglas',
  explorando: 'Explorando',
  offline: 'Sin señal',
};

const isUserOnline = (lastSeen?: string | null) => {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < ONLINE_WINDOW_MS;
};

const getLocationLabel = (location?: string | null) => LOCATION_LABELS[location || 'lobby'] || 'Explorando';

const formatCompactDate = (value?: string | null) => {
  if (!value) return 'Sin registro';
  return new Date(value).toLocaleDateString('es-PA', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatCompactTime = (value?: string | null) => {
  if (!value) return 'Sin hora';
  return new Date(value).toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' });
};

const formatRelativeLastSeen = (value?: string | null) => {
  if (!value) return 'Sin heartbeat';
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMinutes < 1) return 'Ahora mismo';
  if (diffMinutes === 1) return 'Hace 1 min';
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours === 1) return 'Hace 1 hora';
  return `Hace ${diffHours} horas`;
};

const formatCompactDateTime = (value?: string | null) => {
  if (!value) return 'Sin registro';
  return `${formatCompactDate(value)} · ${formatCompactTime(value)}`;
};

const formatIpAddress = (value?: string | null) => value || 'Sin IP registrada';
const isUuid = (value?: string | null) => Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));

const getIpLocationLabel = (ipInfo?: AdminUser['ip_info']) => {
  const city = ipInfo?.location?.city;
  const state = ipInfo?.location?.state;
  const country = ipInfo?.location?.country;
  return [city, state, country].filter(Boolean).join(', ') || 'Sin geolocalizacion';
};

const getProviderLabel = (ipInfo?: AdminUser['ip_info']) =>
  ipInfo?.isp?.org || ipInfo?.isp?.isp || 'Proveedor no identificado';

const getRiskFlags = (ipInfo?: AdminUser['ip_info']) => {
  if (ipInfo?.private) return ['LOCAL'];

  const flags: string[] = [];
  if (ipInfo?.risk?.is_vpn) flags.push('VPN');
  if (ipInfo?.risk?.is_proxy) flags.push('PROXY');
  if (ipInfo?.risk?.is_tor) flags.push('TOR');
  if (ipInfo?.risk?.is_datacenter) flags.push('DC');
  if (ipInfo?.risk?.is_mobile) flags.push('MOVIL');
  return flags;
};

const getRiskTone = (ipInfo?: AdminUser['ip_info']): 'emerald' | 'amber' | 'rose' | 'slate' => {
  if (ipInfo?.private) return 'slate';
  const score = ipInfo?.risk?.risk_score ?? 0;
  const hasRiskNetwork = Boolean(ipInfo?.risk?.is_vpn || ipInfo?.risk?.is_proxy || ipInfo?.risk?.is_tor || ipInfo?.risk?.is_datacenter);

  if (score >= 60 || hasRiskNetwork) return 'rose';
  if (score >= 25) return 'amber';
  if (score > 0) return 'emerald';
  return 'slate';
};

const getRiskSummary = (ipInfo?: AdminUser['ip_info']) => {
  if (ipInfo?.private) return 'Red privada/local';
  const score = ipInfo?.risk?.risk_score;
  if (typeof score === 'number') return `${score}/100`;
  return 'Sin score';
};

const looksLikeEmail = (value?: string | null) => Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));

const maskEmail = (value?: string | null) => {
  if (!value || !looksLikeEmail(value)) return 'Sin email visible';
  const [localPart = '', domain = ''] = value.split('@');
  if (!domain) return 'Sin email visible';

  const head = localPart.slice(0, Math.min(2, localPart.length));
  return `${head}${'•'.repeat(Math.max(3, localPart.length - head.length))}@${domain}`;
};

// ─── Componente principal ───────────────────────────────────────────────────────────

function AdminContent() {
  const router = useRouter();
  const { authenticatedFetch, user, clearAuth } = useAuthStore();
  const viewerIsSuperAdmin = Boolean(user?.is_super_admin);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activeGames, setActiveGames] = useState<GameSession[]>([]);
  const [finishedGames, setFinishedGames] = useState<GameSession[]>([]);
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [usersTotalRecords, setUsersTotalRecords] = useState(0);
  const [chatEvents, setChatEvents] = useState<any[]>([]);
  const [chatRooms, setChatRooms] = useState<AdminChatRoom[]>([]);
  const [chatBlacklist, setChatBlacklist] = useState<ChatBlacklistTerm[]>([]);
  const [cooldownDrafts, setCooldownDrafts] = useState<Record<string, string>>({});
  const [newBlacklistTerm, setNewBlacklistTerm] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userPresenceFilter, setUserPresenceFilter] = useState<'all' | 'online' | 'offline' | 'in_game'>('all');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'players' | 'admins'>('all');
  const [revealedEmails, setRevealedEmails] = useState<Record<string, boolean>>({});
  const [selectedTab, setSelectedTab] = useState<TabId>('overview');
  const [pointsDialogUser, setPointsDialogUser] = useState<AdminUser | null>(null);
  const [pointsAmount, setPointsAmount] = useState('100');
  const [banDialogUser, setBanDialogUser] = useState<AdminUser | null>(null);
  const [banReason, setBanReason] = useState('Comportamiento indebido');
  const [chatBanDialog, setChatBanDialog] = useState<{ gameId: string; userId: string; username: string } | null>(null);
  const [chatBanReason, setChatBanReason] = useState('Spam o conducta inapropiada');
  const [dialogPending, setDialogPending] = useState(false);
  const chatRealtimeRefreshTimerRef = useRef<number | null>(null);
  const dashboardPollInFlightRef = useRef(false);

  const applyChatPayload = useCallback((chatPayload: any) => {
    setChatEvents(chatPayload.messages ?? []);
    setChatRooms(chatPayload.rooms ?? []);
    setChatBlacklist(chatPayload.blacklist ?? []);
    setCooldownDrafts((previous) => {
      const next = { ...previous };
      for (const room of chatPayload.rooms ?? []) {
        if (!next[room.gameId]) {
          next[room.gameId] = String(room.cooldownSeconds ?? 3);
        }
      }
      return next;
    });
  }, []);

  const loadChatData = useCallback(async () => {
    try {
      const chatsRes = await authenticatedFetch('/api/admin/chat?compact=1');

      if (chatsRes.status === 401 || chatsRes.status === 403) {
        router.push('/auth/login');
        return;
      }

      if (!chatsRes.ok) {
        console.error(`[AdminDashboard] /api/admin/chat respondió ${chatsRes.status}`);
        return;
      }

      const chatPayload = await chatsRes.json();
      applyChatPayload(chatPayload);
    } catch (error) {
      console.error('[AdminDashboard] Error al refrescar chats:', error);
    }
  }, [authenticatedFetch, applyChatPayload, router]);

  const loadDashboardData = useCallback(async (silent = false) => {
    if (dashboardPollInFlightRef.current) {
      return;
    }

    dashboardPollInFlightRef.current = true;

    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      type DashboardRequestKey = 'stats' | 'games' | 'attempts' | 'users' | 'chats';
      const requests: Array<[DashboardRequestKey, string]> = [
        ['stats', '/api/admin/stats'],
        ['games', '/api/admin/games?limit=60'],
      ];

      if (selectedTab === 'security') {
        requests.push(['attempts', '/api/admin/login-attempts']);
      }

      if (selectedTab === 'users') {
        requests.push(['users', `/api/admin/users?page=${usersPage}&limit=${USERS_PAGE_SIZE}`]);
      }

      if (selectedTab === 'chats') {
        requests.push(['chats', '/api/admin/chat?compact=1']);
      }

      const settled = await Promise.allSettled(
        requests.map(([, url]) => authenticatedFetch(url))
      );

      const responseMap: Partial<Record<DashboardRequestKey, Response>> = {};

      settled.forEach((result, index) => {
        const [key, url] = requests[index];
        if (result.status === 'fulfilled') {
          responseMap[key] = result.value;
          return;
        }

        console.error(`[AdminDashboard] Falló ${url}:`, result.reason);
      });

      const hasUnauthorized = Object.values(responseMap).some((response) =>
        response && (response.status === 401 || response.status === 403)
      );

      if (hasUnauthorized) {
        router.push('/auth/login');
        return;
      }

      const statsRes = responseMap.stats;
      if (statsRes?.ok) {
        setStats(await statsRes.json());
      } else if (statsRes) {
        console.error(`[AdminDashboard] /api/admin/stats respondió ${statsRes.status}`);
      }

      const gamesRes = responseMap.games;
      if (gamesRes?.ok) {
        const allGames: GameSession[] = (await gamesRes.json()).games ?? [];
        setActiveGames(allGames.filter(g => g.status !== 'finished'));
        setFinishedGames(allGames.filter(g => g.status === 'finished'));
      } else if (gamesRes) {
        console.error(`[AdminDashboard] /api/admin/games respondió ${gamesRes.status}`);
      }

      const attemptsRes = responseMap.attempts;
      if (attemptsRes?.ok) {
        setLoginAttempts((await attemptsRes.json()).attempts ?? []);
      } else if (attemptsRes) {
        console.error(`[AdminDashboard] /api/admin/login-attempts respondió ${attemptsRes.status}`);
      }

      const usersRes = responseMap.users;
      if (usersRes?.ok) {
        const usersPayload = (await usersRes.json()) as AdminUsersPayload;
        const nextUsers = usersPayload.users ?? [];
        const nextPage = usersPayload.page ?? usersPage;
        const nextTotal = usersPayload.total ?? nextUsers.length;
        const nextTotalPages = Math.max(1, usersPayload.totalPages ?? Math.ceil(nextTotal / USERS_PAGE_SIZE));

        setUsers(nextUsers);
        setUsersPage(nextPage);
        setUsersTotalRecords(nextTotal);
        setUsersTotalPages(nextTotalPages);
      } else if (usersRes) {
        console.error(`[AdminDashboard] /api/admin/users respondió ${usersRes.status}`);
      }

      const chatsRes = responseMap.chats;
      if (chatsRes?.ok) {
        const chatPayload = await chatsRes.json();
        applyChatPayload(chatPayload);
      } else if (chatsRes) {
        console.error(`[AdminDashboard] /api/admin/chat respondió ${chatsRes.status}`);
      }
    } catch (err) { console.error('[AdminDashboard]', err); }
    finally {
      dashboardPollInFlightRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [authenticatedFetch, applyChatPayload, router, selectedTab, usersPage]);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(() => {
      if (!document.hidden) {
        void loadDashboardData(true);
      }
    }, 45000);
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  useEffect(() => {
    if (selectedTab !== 'chats') return;

    const relevantChatEvents = new Set([
      'chat_message',
      'chat_message_deleted',
      'chat_user_banned',
      'chat_user_unbanned',
      'chat_cooldown_updated',
    ]);

    const channel = supabase
      .channel('admin-chat-events')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'game_events' },
        (payload) => {
          const nextEvent = payload.new as Record<string, any> | null;
          if (!nextEvent) return;

          const eventType = String(nextEvent.event_type || '');
          if (!relevantChatEvents.has(eventType)) return;

          if (chatRealtimeRefreshTimerRef.current) return;
          chatRealtimeRefreshTimerRef.current = window.setTimeout(() => {
            chatRealtimeRefreshTimerRef.current = null;
            void loadChatData();
          }, 1200);
        }
      )
      .subscribe();

    return () => {
      if (chatRealtimeRefreshTimerRef.current) {
        window.clearTimeout(chatRealtimeRefreshTimerRef.current);
        chatRealtimeRefreshTimerRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [loadChatData, selectedTab]);

  useEffect(() => {
    sileo.clear('top-center');
    sileo.clear('bottom-center');
    return () => {
      sileo.clear('top-center');
      sileo.clear('bottom-center');
    };
  }, []);

  const requestJson = async <T,>(url: string, init?: RequestInit): Promise<T> => {
    const response = await authenticatedFetch(url, init);
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.error || payload.message || 'No se pudo completar la acción');
    }

    return payload as T;
  };

  const clearAdminToasts = () => {
    sileo.clear('top-center');
    sileo.clear('bottom-center');
  };

  const ADMIN_TOAST_DURATION = 4000;
  const ADMIN_ACTION_TOAST_DURATION = 9000;

  const adminInfo = (title: string, description?: string) => {
    clearAdminToasts();
    sileo.info({
      title,
      description,
      duration: ADMIN_TOAST_DURATION,
      position: getAdminToastPosition(),
    });
  };

  const adminError = (title: string, description?: string) => {
    clearAdminToasts();
    sileo.error({
      title,
      description,
      duration: ADMIN_TOAST_DURATION,
      position: getAdminToastPosition(),
    });
  };

  const runAdminPromise = async <T,>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string | ((result: T) => string);
      description?: string | ((result: T) => string | undefined);
      errorTitle?: string;
      onSuccess?: (result: T) => Promise<void> | void;
    }
  ) => {
    clearAdminToasts();
    const result = await sileo.promise(promise, {
      loading: { title: options.loading },
      success: (resolved) => ({
        title: typeof options.success === 'function' ? options.success(resolved) : options.success,
        description: typeof options.description === 'function' ? options.description(resolved) : options.description,
        duration: ADMIN_TOAST_DURATION,
      }),
      error: (error) => ({
        title: options.errorTitle || 'No se pudo completar la acción',
        description: error instanceof Error ? error.message : 'Error inesperado',
        duration: ADMIN_TOAST_DURATION,
      }),
      position: getAdminToastPosition(),
    });

    if (options.onSuccess) {
      await options.onSuccess(result);
    }

    return result;
  };

  /** Recorta el username para títulos de toast y evita que rompa el ancho. */
  const toastName = (name: string, maxWidth = 160) => {
    if (typeof window === 'undefined') return name.slice(0, 16);
    return truncateSingleLineWithPretext(name, {
      font: '600 14px ui-sans-serif, system-ui, sans-serif',
      maxWidth,
      lineHeight: 20,
    });
  };

  const queueActionToast = (config: {
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => Promise<void>;
  }) => {
    const stableId = 'admin-action-confirm';
    clearAdminToasts();
    sileo.action({
      title: config.title,
      description: config.description,
      duration: ADMIN_ACTION_TOAST_DURATION,
      autopilot: { expand: 1, collapse: 6500 },
      position: getAdminToastPosition(),
      ...({ id: stableId } as any),
      button: {
        title: config.confirmLabel,
        onClick: async () => {
          try {
            await config.onConfirm();
          } catch (error) {
            // Evita propagar rechazos de promesas que pueden disparar la capa runtime de Next.js.
            console.error('[AdminDashboard] Acción administrativa fallida:', error);
          } finally {
            sileo.dismiss(stableId);
          }
        },
      },
    });
  };

  const gameAction = async (gameId: string, action: 'reset' | 'end') => {
    queueActionToast({
      title: action === 'reset' ? 'Resetear sesión' : 'Finalizar sesión',
      description:
        action === 'reset'
          ? 'La sesión se reiniciará para todos los conectados.'
          : 'Se cerrará la sesión sin contar como victoria.',
      confirmLabel: action === 'reset' ? 'Resetear' : 'Finalizar',
      onConfirm: async () => {
        await runAdminPromise(
          requestJson<{ message?: string }>(`/api/admin/games/${gameId}/${action}`, {
            method: 'POST',
            headers: action === 'end' ? { 'Content-Type': 'application/json' } : undefined,
            body: action === 'end'
              ? JSON.stringify({ reason: 'Finalizada por administración desde el panel' })
              : undefined,
          }),
          {
            loading: action === 'reset' ? 'Reseteando sesión...' : 'Finalizando sesión...',
            success: (result) => result.message || (action === 'reset' ? 'Sesión reseteada' : 'Sesión finalizada'),
            onSuccess: async () => {
              await loadDashboardData(true);
            },
          }
        );
      },
    });
  };

  const updateUser = async (userId: string, updates: any) => {
    await runAdminPromise(
      requestJson(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      }),
      {
        loading: 'Actualizando jugador...',
        success: 'Jugador actualizado',
        onSuccess: async () => {
          await loadDashboardData(true);
        },
      }
    );
  };

  const handleBanUser = async (user: AdminUser) => {
    if (user.is_super_admin) {
      adminInfo('Cuenta protegida', 'La cuenta super administradora está protegida contra acciones administrativas.');
      return;
    }

    if (user.is_admin && !viewerIsSuperAdmin) {
      adminInfo('Cuenta protegida', 'Solo el super administrador puede suspender o reactivar cuentas administradoras.');
      return;
    }

    if (!user.is_active) {
      queueActionToast({
        title: `Reactivar a ${toastName(user.username)}`,
        description: 'Recuperará acceso a la plataforma.',
        confirmLabel: 'Reactivar',
        onConfirm: async () => {
          await updateUser(user.id, { is_active: true, ban_reason: null });
        },
      });
      return;
    }

    setBanDialogUser(user);
    setBanReason('Comportamiento indebido');
  };

  const deleteUser = async (userId: string) => {
    const targetUser = users.find((user) => user.id === userId);
    if (targetUser?.is_super_admin) {
      adminInfo('Cuenta protegida', 'La cuenta super administradora no se puede eliminar desde este panel.');
      return;
    }
    if (targetUser?.is_admin) {
      adminInfo('Cuenta protegida', 'Las cuentas administradoras no se pueden eliminar desde este panel.');
      return;
    }
    queueActionToast({
      title: `Eliminar a ${toastName(targetUser?.username || 'este usuario')}`,
      description: 'Se borrarán permanentemente todos sus datos.',
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        await runAdminPromise(
          requestJson(`/api/admin/users/${userId}`, { method: 'DELETE' }),
          {
            loading: 'Eliminando cuenta...',
            success: 'Cuenta eliminada',
            onSuccess: async () => {
              await loadDashboardData(true);
            },
          }
        );
      },
    });
  };

  const resetUserStats = async (userId: string, mode: 'all' | 'points' | 'wins' = 'all') => {
    const targetUser = users.find((user) => user.id === userId);
    if (targetUser?.is_super_admin) {
      adminInfo('Cuenta protegida', 'No puedes resetear estadísticas de la cuenta super administradora.');
      return;
    }

    const copy =
      mode === 'points'
        ? {
            title: `Resetear puntos de ${toastName(targetUser?.username || 'este jugador')}`,
            description: 'Los puntos volverán a cero.',
            confirmLabel: 'Resetear puntos',
          }
        : mode === 'wins'
          ? {
              title: `Resetear victorias de ${toastName(targetUser?.username || 'este jugador')}`,
              description: 'Las victorias volverán a cero.',
              confirmLabel: 'Resetear victorias',
            }
          : {
              title: `Resetear stats de ${toastName(targetUser?.username || 'este jugador')}`,
              description: 'Puntos y victorias se reiniciarán a cero.',
              confirmLabel: 'Resetear stats',
            };
    queueActionToast({
      title: copy.title,
      description: copy.description,
      confirmLabel: copy.confirmLabel,
      onConfirm: async () => {
        await runAdminPromise(
          requestJson<{ message?: string }>(`/api/admin/users/${userId}/reset-stats`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode }),
          }),
          {
            loading: 'Reiniciando estadísticas...',
            success: (result) => result.message || 'Estadísticas reiniciadas',
            onSuccess: async () => {
              await loadDashboardData(true);
            },
          }
        );
      },
    });
  };

  const addPointsToUser = async (userId: string) => {
    const targetUser = users.find((user) => user.id === userId);
    if (!targetUser) return;
    if (targetUser.is_super_admin && !viewerIsSuperAdmin) {
      adminInfo('Cuenta protegida', 'No puedes otorgar puntos a la cuenta super administradora desde este panel.');
      return;
    }
    setPointsDialogUser(targetUser);
    setPointsAmount('100');
  };

  const kickUser = async (userId: string) => {
    const targetUser = users.find((user) => user.id === userId);
    if (targetUser?.is_super_admin) {
      adminInfo('Cuenta protegida', 'No puedes expulsar de la partida a la cuenta super administradora.');
      return;
    }
    queueActionToast({
      title: `Expulsar a ${toastName(targetUser?.username || 'este jugador')}`,
      description: 'Se retirará de la mesa actual.',
      confirmLabel: 'Expulsar',
      onConfirm: async () => {
        await runAdminPromise(
          requestJson<{ message?: string }>(`/api/admin/users/${userId}/kick`, { method: 'POST' }),
          {
            loading: 'Expulsando jugador de la mesa...',
            success: (result) => result.message || 'Jugador expulsado de la partida',
            onSuccess: async () => {
              await loadDashboardData(true);
            },
          }
        );
      },
    });
  };

  const deleteChat = async (eventId: string) => {
    if (!isUuid(eventId)) {
      adminInfo('Mensaje aún no sincronizado', 'Refresca el panel y vuelve a intentarlo cuando el chat tenga un id persistido.');
      return;
    }

    queueActionToast({
      title: 'Eliminar mensaje del chat',
      description: 'Este mensaje desaparecerá del historial moderado.',
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        await runAdminPromise(
          (async () => {
            const response = await authenticatedFetch(`/api/admin/chat/${eventId}`, { method: 'DELETE' });
            const payload = await response.json().catch(() => ({}));

            if (response.status === 404) {
              return {
                alreadyMissing: true,
                gameId: undefined,
                deletedMessageId: undefined,
                username: undefined,
              };
            }

            if (!response.ok) {
              throw new Error(payload.error || payload.message || 'No se pudo completar la acción');
            }

            return payload as {
              alreadyMissing?: boolean;
              gameId?: string;
              deletedMessageId?: string;
              username?: string;
            };
          })(),
          {
            loading: 'Eliminando mensaje...',
            success: (result) => result.alreadyMissing ? 'Mensaje ya no estaba disponible' : 'Mensaje eliminado',
            description: (result) => result.alreadyMissing ? 'El timeline se había quedado desactualizado y el mensaje ya no existe.' : undefined,
            onSuccess: async (result) => {
              await loadDashboardData(true);
            },
          }
        );
      },
    });
  };

  const clearRoomChat = async (gameId: string) => {
    queueActionToast({
      title: 'Limpiar chat',
      description: 'Se borrarán todos los mensajes de esta sala.',
      confirmLabel: 'Confirmar',
      onConfirm: async () => {
        await runAdminPromise(
          requestJson<{ clearedCount: number; notice: string }>(`/api/admin/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'clearRoomChat', gameId }),
          }),
          {
            loading: 'Limpiando chat de la sala...',
            success: (result) => result.clearedCount > 0 ? `Chat limpiado (${result.clearedCount} mensajes)` : 'Chat limpiado',
            description: (result) => result.notice,
            onSuccess: async (result) => {
              await loadDashboardData(true);
            },
          }
        );
      },
    });
  };

  const spectateGame = async (gameId: string, username: string) => {
    await runAdminPromise(
      requestJson<{ gameId: string }>(`/api/game/spectate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
      }),
      {
        loading: `Conectando a la mesa de ${username}...`,
        success: `Modo espectador activado para ${username}`,
        onSuccess: async (result) => {
          router.push(`/game/play?spectate=${result.gameId}`);
        },
      }
    );
  };

  const updateChatCooldown = async (gameId: string) => {
    const cooldownSeconds = Number(cooldownDrafts[gameId] || 3);
    if (!Number.isFinite(cooldownSeconds) || cooldownSeconds <= 0) {
      adminError('Cooldown inválido', 'Usa un número entero entre 1 y 120 segundos.');
      return;
    }

    await runAdminPromise(
      requestJson<{ cooldownSeconds: number }>(`/api/admin/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setCooldown', gameId, cooldownSeconds }),
      }),
      {
        loading: 'Actualizando cooldown del chat...',
        success: (result) => `Cooldown ajustado a ${result.cooldownSeconds}s`,
        onSuccess: async (result) => {
          setCooldownDrafts((prev) => ({ ...prev, [gameId]: String(result.cooldownSeconds) }));
          await loadDashboardData(true);
        },
      }
    );
  };

  const queueChatBanDialog = (gameId: string, userId: string | null, username: string) => {
    if (!userId) {
      adminInfo('Jugador no disponible', 'Ese participante no tiene userId persistido para aplicar un ban de chat.');
      return;
    }

    setChatBanDialog({ gameId, userId, username });
    setChatBanReason('Spam o conducta inapropiada');
  };

  const unbanChatUser = async (gameId: string, userId: string, username: string) => {
    await runAdminPromise(
      requestJson(`/api/admin/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unbanUser', gameId, userId, username }),
      }),
      {
        loading: `Levantando ban de chat a ${username}...`,
        success: `${username} puede volver a escribir`,
        onSuccess: async () => {
          await loadDashboardData(true);
        },
      }
    );
  };

  const addBlacklistWord = async () => {
    const normalized = newBlacklistTerm.trim().toLowerCase();
    if (!normalized) {
      adminInfo('Palabra vacía', 'Escribe una palabra antes de añadirla a la lista negra.');
      return;
    }

    await runAdminPromise(
      requestJson<{ term: ChatBlacklistTerm }>(`/api/admin/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'addBlacklistTerm', term: normalized }),
      }),
      {
        loading: 'Añadiendo palabra a la lista negra...',
        success: 'Palabra añadida',
        onSuccess: async () => {
          setNewBlacklistTerm('');
          await loadDashboardData(true);
        },
      }
    );
  };

  const removeBlacklistWord = async (term: ChatBlacklistTerm) => {
    await runAdminPromise(
      requestJson(`/api/admin/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'removeBlacklistTerm', id: term.id }),
      }),
      {
        loading: 'Eliminando palabra...',
        success: 'Palabra eliminada',
        onSuccess: async () => {
          await loadDashboardData(true);
        },
      }
    );
  };

  const handleExportUsers = async (type: 'pdf' | 'excel') => {
    const fileName = `jugadores_parkeando_${new Date().toISOString().split('T')[0]}`;
    const generatedAt = new Date().toLocaleString('es-PA');

    const toWinRate = (wins: number, played: number) =>
      played > 0 ? `${((wins / played) * 100).toFixed(1)}%` : '0%';

    const toPointsPerGame = (points: number, played: number) =>
      played > 0 ? Number((points / played).toFixed(1)) : 0;

    const getSegment = (played: number, winRatePct: number) => {
      if (played >= 20 && winRatePct >= 35) return 'Competitivo';
      if (played >= 10) return 'Activo';
      if (played >= 1) return 'Casual';
      return 'Nuevo';
    };

    const exportRows = users.map((u) => ({
      Usuario: u.username,
      Email: u.email,
      Pais: u.ip_info?.location?.country || 'N/D',
      Registro: new Date(u.created_at).toLocaleDateString('es-PA'),
      Rol: u.is_super_admin ? 'Super Administrador' : u.is_admin ? 'Administrador' : 'Jugador',
      Partidas: u.games_played || 0,
      Victorias: u.games_won || 0,
      WinRate: toWinRate(u.games_won || 0, u.games_played || 0),
      Puntos: u.total_points || 0,
      PuntosXPartida: toPointsPerGame(u.total_points || 0, u.games_played || 0),
      Segmento: getSegment(
        u.games_played || 0,
        (u.games_played || 0) > 0 ? ((u.games_won || 0) / (u.games_played || 0)) * 100 : 0
      ),
    }));

    const totalPlayed = users.reduce((sum, u) => sum + (u.games_played || 0), 0);
    const totalWins = users.reduce((sum, u) => sum + (u.games_won || 0), 0);
    const totalPoints = users.reduce((sum, u) => sum + (u.total_points || 0), 0);

    const summary = [
      { label: 'Total jugadores', value: usersTotalRecords > 0 ? usersTotalRecords : users.length },
      { label: 'Con partidas', value: users.filter((u) => (u.games_played || 0) > 0).length },
      { label: 'Administradores', value: users.filter((u) => u.is_admin).length },
      { label: 'Puntos totales', value: totalPoints },
      { label: 'Win rate global', value: totalPlayed > 0 ? `${((totalWins / totalPlayed) * 100).toFixed(1)}%` : '0%' },
      { label: 'Puntos promedio', value: users.length > 0 ? Number((totalPoints / users.length).toFixed(1)) : 0 },
      { label: 'Página exportada', value: `${usersPage}/${Math.max(1, usersTotalPages)}` },
    ];

    const orderedColumns = ['Usuario', 'Email', 'Pais', 'Registro', 'Rol', 'Partidas', 'Victorias', 'WinRate', 'Puntos', 'PuntosXPartida', 'Segmento'];

    if (type === 'excel') {
      exportToExcel(exportRows, fileName, 'Jugadores', {
        title: 'Listado de Jugadores - Parkeando',
        generatedAt,
        orderedColumns,
        summary,
      });
    } else {
      const columns = ['Usuario', 'Email', 'Pais', 'Registro', 'Rol', 'Partidas', 'Victorias', 'WinRate', 'Puntos', 'PuntosXPartida', 'Segmento'];
      const data = exportRows.map((row) => columns.map((column) => row[column as keyof typeof row]));

      await exportToPDF('Listado de Jugadores - Parkeando', columns, data, fileName, {
        generatedAt,
        orientation: 'landscape',
        summary,
        logoPath: '/icon.PNG',
      });
    }
  };

  const handleExportStats = () => {
    if (!stats) return;
    const fileName = `resumen_admin_${new Date().toISOString().split('T')[0]}`;
    const data = [
      { Métrica: 'Total Usuarios', Valor: stats.totalUsers },
      { Métrica: 'Total Partidas', Valor: stats.totalGames },
      { Métrica: 'Partidas Activas', Valor: stats.activeGames },
      { Métrica: 'Total Preguntas', Valor: stats.totalQuestions }
    ];
    exportToExcel(data, fileName, 'Resumen');
  };

  const sortedUsers = [...users].sort((a, b) => {
    const onlineDiff = Number(isUserOnline(b.last_seen_at)) - Number(isUserOnline(a.last_seen_at));
    if (onlineDiff !== 0) return onlineDiff;
    return (b.total_points || 0) - (a.total_points || 0);
  });

  const onlineUsers = users.filter((currentUser) => isUserOnline(currentUser.last_seen_at));
  const matchesUserFilters = (currentUser: AdminUser) => {
    const query = userSearch.trim().toLowerCase();
    const activeGame = activeGames.find((game) => game.players?.some((player) => player.userId === currentUser.id));
    const isOnline = isUserOnline(currentUser.last_seen_at);

    if (query) {
      const haystack = [
        currentUser.username,
        currentUser.email,
        currentUser.last_ip_address,
        currentUser.ip_info?.location?.country,
        currentUser.current_location,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (!haystack.includes(query)) return false;
    }

    if (userRoleFilter === 'admins' && !currentUser.is_admin) return false;
    if (userRoleFilter === 'players' && currentUser.is_admin) return false;
    if (userPresenceFilter === 'online' && !isOnline) return false;
    if (userPresenceFilter === 'offline' && isOnline) return false;
    if (userPresenceFilter === 'in_game' && activeGame?.status !== 'in_progress') return false;

    return true;
  };

  const filteredUsers = sortedUsers.filter(matchesUserFilters);
  const liveUsers = filteredUsers.filter((currentUser) => isUserOnline(currentUser.last_seen_at));
  const archivedUsers = filteredUsers.filter((currentUser) => !isUserOnline(currentUser.last_seen_at));
  const chatRoomsByGame = new Map(chatRooms.map((room) => [room.gameId, room]));
  const [heroTextWidth, setHeroTextWidth] = useState(0);
  const heroTextRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = heroTextRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return;

    const updateWidth = () => {
      const next = Math.max(120, Math.floor(node.clientWidth));
      setHeroTextWidth((prev) => (prev === next ? prev : next));
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const clampTextWithPretext = (
    source: string,
    font: string,
    lineHeight: number,
    maxLines: number,
  ) => {
    if (typeof window === 'undefined' || heroTextWidth <= 0) return source;

    const maxWidth = Math.max(120, heroTextWidth);
    const lines = wrapTextWithPretext(source, {
      font,
      maxWidth,
      lineHeight,
      whiteSpace: 'normal',
    });

    if (lines.length <= maxLines) return source;

    const safeMaxLines = Math.max(1, maxLines);
    const visible = lines.slice(0, safeMaxLines - 1);
    const remainder = lines.slice(safeMaxLines - 1).join(' ');
    const lastLine = truncateSingleLineWithPretext(remainder, {
      font,
      maxWidth,
      lineHeight,
    });

    return [...visible, lastLine].join('\n');
  };

  const heroKicker = useMemo(() => {
    if (typeof window === 'undefined' || heroTextWidth <= 0) return HERO_KICKER;
    return truncateSingleLineWithPretext(HERO_KICKER, {
      font: '700 11px ui-sans-serif, system-ui, sans-serif',
      maxWidth: Math.max(120, heroTextWidth),
      lineHeight: 14,
    });
  }, [heroTextWidth]);

  const heroTitle = useMemo(() => {
    return clampTextWithPretext(
      HERO_TITLE,
      '900 30px ui-sans-serif, system-ui, sans-serif',
      34,
      2
    );
  }, [heroTextWidth]);

  const heroDescription = useMemo(() => {
    const maxLines = heroTextWidth > 300 ? 3 : 4;
    return clampTextWithPretext(
      HERO_DESCRIPTION,
      '500 14px ui-sans-serif, system-ui, sans-serif',
      22,
      maxLines
    );
  }, [heroTextWidth]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Cargando panel de administración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background selection:bg-panama-blue/30 overflow-x-hidden font-sans">
      {/* dinámico fondo (Lobby Style) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-[760px] h-[760px] bg-cyan-500/7 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 left-0 w-[560px] h-[560px] bg-amber-500/5 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:60px_60px] opacity-100" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="v-stack gap-8 mb-10">
          <div className="flex flex-col gap-4 sm:gap-5 xl:flex-row xl:items-center xl:justify-between glass px-4 py-4 sm:px-6 sm:py-5 rounded-[1.75rem] sm:rounded-[2rem] border-white/10">
            <div className="flex flex-col items-start gap-3 sm:gap-4 md:flex-row md:items-center min-w-0">
              <div className="rounded-[1.25rem] sm:rounded-2xl bg-white/[0.03] border border-white/10 px-3 py-2.5 sm:px-4 sm:py-3 shrink-0">
                <Logo size="lg" className="leading-none" />
              </div>
              <div ref={heroTextRef} className="min-w-0 w-full md:w-auto">
                <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-cyan-300/80 whitespace-nowrap overflow-hidden text-ellipsis">{heroKicker}</p>
                <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight whitespace-pre-line leading-tight">{heroTitle}</h1>
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{heroDescription}</p>
              </div>
            </div>

            <div className="sm:hidden self-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 gap-2.5 rounded-full border-white/15 bg-white/[0.05] px-3.5 text-foreground/85 hover:bg-white/10 hover:text-foreground data-[state=open]:bg-white/12"
                  >
                    <span className="flex items-center gap-2">
                      <MoreVertical className="w-4 h-4" />
                      <span className="text-sm font-semibold">Acciones</span>
                    </span>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  side="bottom"
                  sideOffset={10}
                  className="w-[min(88vw,260px)] rounded-2xl border-white/15 bg-slate-950/92 p-1.5 backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.55)]"
                >
                  <DropdownMenuItem
                    disabled={refreshing}
                    onClick={() => loadDashboardData(true)}
                    className="gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground focus:bg-cyan-500/10 focus:text-cyan-200"
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Refrescar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push('/lobby')}
                    className="gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground focus:bg-white/10 focus:text-foreground"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Lobby
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem
                    onClick={() => { clearAuth(); router.push('/'); }}
                    className="gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-300 focus:bg-rose-500/10 focus:text-rose-300"
                  >
                    <XCircle className="w-4 h-4" />
                    Salir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="hidden w-full sm:flex sm:flex-wrap sm:items-center gap-3 xl:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadDashboardData(true)}
                disabled={refreshing}
                className="h-11 w-full justify-center px-4 rounded-xl border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground hover:bg-white/10 sm:h-10 sm:w-auto"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refrescar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/lobby')}
                className="h-11 w-full justify-center px-4 rounded-xl border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground sm:h-10 sm:w-auto"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Lobby
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => { clearAuth(); router.push('/'); }}
                className="h-11 w-full justify-center px-4 rounded-xl bg-rose-500/12 text-rose-300 border border-rose-500/20 hover:bg-rose-500/18 sm:h-10 sm:w-auto"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Salir
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <Badge className="px-3 py-1.5 bg-emerald-500/10 text-emerald-300 border-emerald-500/20 font-bold uppercase tracking-[0.2em]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-pulse" />
              Operativo
            </Badge>
            <Badge variant="outline" className="px-3 py-1.5 bg-white/5 border-white/10 text-foreground/80 uppercase tracking-[0.18em]">
              Admin: {user?.username}
            </Badge>
            <Badge variant="outline" className="px-3 py-1.5 bg-white/5 border-white/10 text-foreground/80 uppercase tracking-[0.18em]">
              {stats?.onlineUsers ?? onlineUsers.length} online
            </Badge>
            <Badge variant="outline" className="px-3 py-1.5 bg-white/5 border-white/10 text-foreground/80 uppercase tracking-[0.18em]">
              {activeGames.length} sesiones abiertas
            </Badge>
            <Badge variant="outline" className="px-3 py-1.5 bg-white/5 border-white/10 text-foreground/80 uppercase tracking-[0.18em]">
              {finishedGames.length} en historial
            </Badge>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:gap-4 xl:flex-row xl:items-center xl:justify-between mb-10">
          <div className="flex items-center gap-1.5 p-1.5 bg-white/5 rounded-2xl border border-white/10 overflow-x-auto max-w-full w-full overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`relative flex min-h-[46px] items-center gap-2.5 px-4 sm:px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                  selectedTab === tab.id
                    ? 'text-slate-950'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}
              >
                {selectedTab === tab.id && (
                  <m.div
                    layoutId="activeTabClean"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-300 shadow-[0_12px_40px_rgba(34,211,238,0.22)]"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.45 }}
                  />
                )}
                <span className="relative z-10">{tab.icon}</span>
                <span className="relative z-10">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex w-full items-center gap-2 flex-wrap xl:w-auto">
            {selectedTab === 'overview' && stats && (
              <Button variant="outline" size="sm" onClick={handleExportStats} className="h-11 w-full justify-center rounded-xl border-white/10 bg-white/5 hover:bg-white/10 sm:h-10 sm:w-auto">
                <BarChart className="w-4 h-4 mr-2 text-amber-300" /> Exportar resumen
              </Button>
            )}
            {selectedTab === 'users' && (
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
                <Button variant="outline" size="sm" onClick={() => { void handleExportUsers('excel'); }} className="h-11 w-full justify-center rounded-xl border-white/10 bg-white/5 hover:bg-white/10 sm:h-10 sm:w-auto">
                  <BarChart className="w-4 h-4 mr-2 text-emerald-300" /> Excel
                </Button>
                <Button variant="outline" size="sm" onClick={() => { void handleExportUsers('pdf'); }} className="h-11 w-full justify-center rounded-xl border-white/10 bg-white/5 hover:bg-white/10 sm:h-10 sm:w-auto">
                  <FileText className="w-4 h-4 mr-2 text-rose-300" /> PDF
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* pestaña: Overview */}
        {selectedTab === 'overview' && stats && (
          <div className="space-y-8">
            {/* Bento Grid Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <StatCard 
                title="Usuarios" 
                value={stats.totalUsers} 
                icon={<Users className="w-6 h-6" />} 
                accent="blue" 
                delay={0}
              />
              <StatCard 
                title="Online" 
                value={stats.onlineUsers} 
                icon={<Wifi className="w-6 h-6" />} 
                accent="green" 
                delay={0.1}
              />
              <StatCard 
                title="Abiertas" 
                value={(stats.activeGames || 0) + (stats.waitingGames || 0)} 
                icon={<Gamepad2 className="w-6 h-6" />} 
                accent="yellow" 
                delay={0.2}
              />
              <StatCard 
                title="Historial" 
                value={stats.finishedGames} 
                icon={<Archive className="w-6 h-6" />} 
                accent="red" 
                delay={0.3}
              />
            </div>

            {/* Charts & Reports fila */}
            <AdminCharts stats={stats} users={users} />

            <Card className="glass border-white/10 bg-transparent overflow-hidden">
              <CardContent className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      <Globe className="w-4 h-4 text-cyan-300" /> Rutas de testeo
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
                      Acceso rapido a vistas de QA para validar ruleta, preguntas y carga de QR desde el panel admin.
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-white/5 border-white/10 uppercase tracking-[0.18em] text-[10px] text-foreground/80">
                    Solo super admin
                  </Badge>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {ADMIN_TEST_ROUTES.map((route) => {
                    const locked = !viewerIsSuperAdmin;

                    return (
                      <Link
                        key={route.href}
                        href={route.href}
                        className={`group rounded-2xl border p-4 transition-all duration-200 ${locked
                          ? 'border-white/10 bg-white/3 opacity-65 pointer-events-none'
                          : 'border-cyan-500/20 bg-cyan-500/5 hover:border-cyan-400/45 hover:bg-cyan-500/10 hover:-translate-y-0.5'
                          }`}
                        aria-disabled={locked}
                        tabIndex={locked ? -1 : undefined}
                      >
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-300/90">
                          {route.label}
                        </p>
                        <p className="mt-2 font-mono text-xs text-foreground/85 break-all">{route.href}</p>
                        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{route.description}</p>
                      </Link>
                    );
                  })}
                </div>

                {!viewerIsSuperAdmin && (
                  <p className="mt-4 text-xs text-amber-300/90">
                    Tu cuenta no tiene permisos de super admin para abrir estas rutas de pruebas.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Map & Interaction fila */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <InteractiveMap users={users} />
              </div>
              <div className="lg:col-span-1">
                <Card className="glass border-white/10 bg-transparent h-full overflow-hidden">
                  <CardContent className="p-6">
                    <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-6 flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-300" /> Hall of Fame
                    </h2>
                    <div className="space-y-4">
                      {(stats.topPlayers ?? []).slice(0, 5).map((p, i) => (
                        <m.div 
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4 + (i * 0.05) }}
                          key={`${p.username}-${p.totalPoints}-${i}`} 
                          className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 flex items-center justify-center rounded-full bg-black/40 text-xs font-black border border-white/10 group-hover:border-cyan-400 transition-colors">
                              {i + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-foreground truncate">{p.username}</p>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-tight">{p.gamesWon} VICTORIAS</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-cyan-400/10 text-cyan-300 border-cyan-400/20 font-mono text-[10px]">
                            {p.totalPoints} PTS
                          </Badge>
                        </m.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* pestaña: Games */}
        {selectedTab === 'games' && (
          <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between px-2">
              <div>
                <h2 className="text-2xl font-black text-foreground tracking-tight">Sesiones activas</h2>
                <p className="text-sm text-muted-foreground">Partidas abiertas y salas de espera con chat moderable, cooldown por mesa y sanciones visibles.</p>
              </div>
              <Badge variant="secondary" className="bg-white/5 border-white/10 uppercase tracking-widest text-[9px]">
                {activeGames.length} ABIERTAS
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeGames.length === 0 ? (
                <div className="col-span-full glass rounded-[2rem] py-20 text-center border-white/5">
                  <Gamepad2 className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                  <p className="text-muted-foreground font-medium">No se detectan sesiones activas.</p>
                </div>
              ) : (
                activeGames.map((game, i) => (
                  <m.div
                    key={game.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass rounded-3xl p-4 sm:p-6 border-white/5 hover:border-cyan-400/20 transition-all duration-300 space-y-6"
                  >
                    {(() => {
                      const room = chatRoomsByGame.get(game.id);
                      const recentMessages = room?.recentMessages || [];
                      const roomBans = room?.activeBans || [];
                      const roomParticipants = room?.participants?.length
                        ? room.participants
                        : (game.players || []).map((player) => ({ userId: player.userId, username: player.username }));
                      const cooldownValue = cooldownDrafts[game.id] ?? String(room?.cooldownSeconds ?? 3);

                      return (
                        <>
                    <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start mb-6">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-11 h-11 rounded-2xl bg-white/5 flex items-center justify-center text-muted-foreground border border-white/10">
                          <Dices className="w-5 h-5" />
                        </div>
                        <div className="v-stack min-w-0">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">ID SESIÓN</p>
                          <p className="font-mono text-xs font-bold text-foreground break-all">#{game.id.slice(0, 12)}</p>
                        </div>
                      </div>
                      <Badge className={`w-fit rounded-lg px-2 text-[10px] font-bold ${
                        game.status === 'in_progress' 
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                      }`}>
                        {game.status === 'in_progress' ? 'EN CURSO' : 'EN ESPERA'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
                      <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                        <p className="text-[9px] text-muted-foreground uppercase font-bold mb-0.5 opacity-60">Jugadores</p>
                        <p className="text-lg font-bold text-foreground">{game.playerCount || 0}</p>
                      </div>
                      <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                        <p className="text-[9px] text-muted-foreground uppercase font-bold mb-0.5 opacity-60">Cola</p>
                        <p className="text-lg font-bold text-foreground">{game.queueCount || 0}</p>
                      </div>
                      <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                        <p className="text-[9px] text-muted-foreground uppercase font-bold mb-0.5 opacity-60">Creada</p>
                        <p className="text-sm font-bold text-foreground">{formatCompactTime(game.createdAt)}</p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      {game.status === 'in_progress' && (
                          <Button 
                            onClick={() => spectateGame(game.id, game.players?.[0]?.username || `mesa ${game.id.slice(0, 6)}`)} 
                            variant="outline" 
                            className="flex-1 rounded-xl h-11 text-[11px] font-bold uppercase tracking-widest border-white/10 hover:border-cyan-400/40 hover:bg-cyan-400/5 transition-all"
                          >
                            <Eye className="w-4 h-4 mr-2" /> Espectar
                          </Button>
                        )}
                        <Button 
                          onClick={() => gameAction(game.id, 'end')} 
                          variant="destructive" 
                          className="flex-1 rounded-xl h-11 text-[11px] font-bold uppercase tracking-widest bg-rose-500/10 text-rose-300 border-rose-500/20 hover:bg-rose-500/20"
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Finalizar
                        </Button>
                    </div>

                    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] pt-5 border-t border-white/5">
                      <div className="space-y-4">
                        <div className="space-y-3">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-300/75">Moderación de sala</p>
                            <h3 className="text-lg font-black text-foreground tracking-tight">Chat de #{game.id.slice(0, 8)}</h3>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="bg-white/5 border-white/10 uppercase tracking-widest text-[9px]">
                              {recentMessages.length} MENSAJES VISIBLES
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => clearRoomChat(game.id)}
                              className="rounded-xl border-rose-400/20 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15 w-full sm:w-auto"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Limpiar todo
                            </Button>
                          </div>
                        </div>

                        <div className="rounded-3xl border border-white/5 bg-white/[0.03] overflow-hidden">
                          {recentMessages.length === 0 ? (
                            <div className="px-5 py-10 text-center">
                              <MessageSquare className="w-10 h-10 text-muted-foreground/25 mx-auto mb-3" />
                              <p className="text-sm text-muted-foreground">Todavía no hay mensajes en esta sala.</p>
                            </div>
                          ) : (
                            <div className="max-h-[26rem] overflow-y-auto divide-y divide-white/5">
                              {recentMessages.map((message) => (
                                <div key={message.id} className="px-4 py-3 flex items-start gap-3 group">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-sm font-bold text-foreground">{message.username}</span>
                                      <span className="text-[10px] text-muted-foreground font-mono">{formatCompactTime(message.createdAt)}</span>
                                      {message.isAdmin ? (
                                        <Badge variant="outline" className="text-[8px] h-4 border-cyan-400/20 text-cyan-300">
                                          ADMIN
                                        </Badge>
                                      ) : null}
                                    </div>
                                    <p className="text-sm text-foreground/75 mt-1 leading-relaxed break-words">{message.text}</p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => deleteChat(message.id)}
                                    className="w-8 h-8 rounded-xl text-rose-300/60 hover:text-rose-200 hover:bg-rose-500/10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-4 space-y-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-300/75">Cooldown</p>
                              <h4 className="text-base font-black text-foreground">Penalización anti-spam</h4>
                            </div>
                            <Badge variant="outline" className="bg-white/5 border-white/10 text-[9px] uppercase tracking-widest">
                              {room?.cooldownSeconds ?? 3}s de castigo
                            </Badge>
                          </div>

                          <p className="text-xs text-muted-foreground">
                            Este tiempo sólo se aplica cuando alguien manda demasiados mensajes seguidos en poco tiempo.
                          </p>

                          <div className="flex flex-col sm:flex-row gap-2">
                            <Input
                              type="number"
                              min="1"
                              max="120"
                              value={cooldownValue}
                              onChange={(event) => setCooldownDrafts((prev) => ({ ...prev, [game.id]: event.target.value }))}
                              className="h-11 border-white/10 bg-black/20 text-white"
                            />
                            <Button
                              onClick={() => updateChatCooldown(game.id)}
                              className="h-11 w-full sm:w-auto rounded-xl bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                            >
                              <Clock3 className="w-4 h-4 mr-2" />
                              Guardar
                            </Button>
                          </div>
                        </div>

                        <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-4 space-y-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-rose-300/75">Control de chat</p>
                              <h4 className="text-base font-black text-foreground">Participantes moderables</h4>
                            </div>
                            <Badge variant="outline" className="bg-white/5 border-white/10 text-[9px] uppercase tracking-widest">
                              {roomParticipants.length} JUGADORES
                            </Badge>
                          </div>

                          <div className="space-y-2">
                            {roomParticipants.length === 0 ? (
                              <p className="text-sm text-muted-foreground">La mesa todavía no tiene participantes sincronizados.</p>
                            ) : (
                              roomParticipants.map((participant) => {
                                const activeBan = roomBans.find((ban) => ban.userId === participant.userId);
                                return (
                                  <div key={`${game.id}-${participant.userId || participant.username}`} className="flex flex-col items-start gap-3 rounded-2xl border border-white/5 bg-black/10 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0">
                                      <p className="text-sm font-bold text-foreground truncate">{participant.username}</p>
                                      <p className="text-[11px] text-muted-foreground truncate">
                                        {activeBan ? `Bloqueado: ${activeBan.reason}` : 'Puede escribir en esta sala'}
                                      </p>
                                    </div>
                                    {activeBan ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => unbanChatUser(game.id, activeBan.userId, activeBan.username)}
                                        className="w-full sm:w-auto rounded-xl border-emerald-400/20 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15"
                                      >
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        Levantar
                                      </Button>
                                    ) : (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => queueChatBanDialog(game.id, participant.userId, participant.username)}
                                        className="w-full sm:w-auto rounded-xl border-rose-400/20 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15"
                                      >
                                        <Ban className="w-4 h-4 mr-2" />
                                        Ban chat
                                      </Button>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>

                        <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-4 space-y-3">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-foreground/65">Sanciones activas</p>
                              <h4 className="text-base font-black text-foreground">Baneos de chat vigentes</h4>
                            </div>
                            <Badge variant="outline" className="bg-white/5 border-white/10 text-[9px] uppercase tracking-widest">
                              {roomBans.length} ACTIVOS
                            </Badge>
                          </div>

                          {roomBans.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No hay jugadores bloqueados del chat en esta sala.</p>
                          ) : (
                            <div className="space-y-2">
                              {roomBans.map((ban) => (
                                <div key={ban.id} className="rounded-2xl border border-rose-500/15 bg-rose-500/8 px-3 py-3">
                                  <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                      <p className="text-sm font-bold text-foreground">{ban.username}</p>
                                      <p className="text-[11px] text-rose-200/85 mt-1">{ban.reason}</p>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => unbanChatUser(game.id, ban.userId, ban.username)}
                                      className="text-emerald-200 hover:text-emerald-100 hover:bg-emerald-500/10 rounded-xl"
                                    >
                                      Levantar
                                    </Button>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground mt-2">
                                    {ban.bannedByName || 'Administración'} · {formatCompactDateTime(ban.createdAt)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                        </>
                      );
                    })()}
                  </m.div>
                ))
              )}
            </div>
          </m.div>
        )}

        {/* pestaña: History */}
        {selectedTab === 'history' && (
          <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between px-2">
              <div>
                <h2 className="text-2xl font-black text-foreground tracking-tight">Historial de partidas</h2>
                <p className="text-sm text-muted-foreground">Sesiones cerradas con trazabilidad de mesa, ventana de juego y participantes.</p>
              </div>
              <Badge variant="secondary" className="bg-white/5 border-white/10 uppercase tracking-widest text-[9px]">
                {finishedGames.length} CERRADAS
              </Badge>
            </div>

            {finishedGames.length === 0 ? (
              <div className="glass rounded-[2rem] border-white/5 py-20 text-center">
                <Archive className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">Todavía no hay partidas finalizadas en el historial cargado.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {finishedGames.map((game, index) => (
                  <m.div
                    key={game.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="glass rounded-3xl border border-white/5 p-4 sm:p-5 hover:border-amber-400/20 transition-all"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-5">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Sesión cerrada</p>
                        <h3 className="text-lg font-black text-foreground mt-1">#{game.id.slice(0, 8)}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Ganador: <span className="text-foreground font-semibold">{game.winnerName || 'Sin ganador registrado'}</span>
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge className="bg-amber-500/10 text-amber-300 border-amber-500/20 font-bold uppercase tracking-[0.2em]">
                          Finalizada
                        </Badge>
                        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                          {game.durationMinutes ? `${game.durationMinutes} min` : 'Duracion no disponible'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <HistoryMetric
                        label="Ventana"
                        value={formatCompactDate(game.createdAt)}
                        subtitle={`Inicio: ${formatCompactTime(game.startedAt)} · Cierre: ${formatCompactTime(game.finishedAt)}`}
                      />
                      <HistoryMetric
                        label="Mesa"
                        value={`${game.playerCount || 0} jugadores`}
                        subtitle={`Cola: ${game.queueCount || 0} · Estado final: ${game.status}`}
                      />
                      <HistoryMetric
                        label="Ganador"
                        value={game.winnerName || 'Sin ganador'}
                        subtitle={game.winner ? `User ID: ${game.winner.slice(0, 8)}...` : 'Sesion cerrada sin winner persistido'}
                      />
                      <HistoryMetric
                        label="Trazabilidad"
                        value={game.finishedAt ? formatCompactDateTime(game.finishedAt) : 'Sin cierre exacto'}
                        subtitle={`Sesion #${game.id.slice(0, 8)} · Creada ${formatCompactTime(game.createdAt)}`}
                      />
                    </div>

                    <div className="mt-4 rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Participantes</p>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-[0.18em]">
                          {game.players?.length || 0} en mesa
                        </span>
                      </div>

                      {game.players?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {game.players.map((player) => {
                            const isWinner = game.winner === player.userId;
                            return (
                              <span
                                key={`${game.id}-${player.userId}`}
                                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
                                  isWinner
                                    ? 'border-amber-400/25 bg-amber-400/10 text-amber-200'
                                    : 'border-white/10 bg-black/15 text-foreground/80'
                                }`}
                              >
                                {player.username}
                                {isWinner ? <span className="ml-2 text-[10px] font-black uppercase tracking-[0.16em]">Winner</span> : null}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No se guardaron jugadores en la traza disponible para esta sesion.</p>
                      )}
                    </div>
                  </m.div>
                ))}
              </div>
            )}
          </m.div>
        )}

        {/* pestaña: usuarios */}
        {selectedTab === 'users' && users && (
          <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between px-2">
              <div>
                <h2 className="text-2xl font-black text-foreground tracking-tight">Directorio de jugadores</h2>
                <p className="text-sm text-muted-foreground">Estado operativo, IP del jugador, inteligencia de red y acciones administrativas sin tarjetas comprimidas.</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-white/5 border-white/10 uppercase tracking-widest text-[9px]">
                  {filteredUsers.length} EN PÁGINA
                </Badge>
                <Badge variant="outline" className="bg-white/5 border-white/10 uppercase tracking-widest text-[9px] text-foreground/80">
                  {usersTotalRecords} TOTAL
                </Badge>
              </div>
            </div>

            <div className="glass rounded-[1.75rem] border border-white/5 p-3 sm:p-4">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(180px,0.7fr)_minmax(180px,0.7fr)]">
                <Input
                  value={userSearch}
                  onChange={(event) => setUserSearch(event.target.value)}
                  placeholder="Buscar por usuario, email, IP, país o ubicación"
                  className="border-white/10 bg-black/20 text-white"
                />
                <div className="relative">
                  <select
                    value={userPresenceFilter}
                    onChange={(event) => setUserPresenceFilter(event.target.value as typeof userPresenceFilter)}
                    title="Filtrar por presencia"
                    aria-label="Filtrar por presencia"
                    className="h-11 w-full appearance-none rounded-xl border border-white/10 bg-black/20 px-3 pr-10 text-sm text-white scheme-dark focus:outline-none focus:ring-1 focus:ring-cyan-400/40"
                  >
                    <option className="bg-zinc-950 text-white" value="all">Todas las presencias</option>
                    <option className="bg-zinc-950 text-white" value="online">Solo online</option>
                    <option className="bg-zinc-950 text-white" value="offline">Solo offline</option>
                    <option className="bg-zinc-950 text-white" value="in_game">Solo en partida</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" />
                </div>
                <div className="relative">
                  <select
                    value={userRoleFilter}
                    onChange={(event) => setUserRoleFilter(event.target.value as typeof userRoleFilter)}
                    title="Filtrar por rol"
                    aria-label="Filtrar por rol"
                    className="h-11 w-full appearance-none rounded-xl border border-white/10 bg-black/20 px-3 pr-10 text-sm text-white scheme-dark focus:outline-none focus:ring-1 focus:ring-cyan-400/40"
                  >
                    <option className="bg-zinc-950 text-white" value="all">Todos los roles</option>
                    <option className="bg-zinc-950 text-white" value="players">Solo jugadores</option>
                    <option className="bg-zinc-950 text-white" value="admins">Solo admins</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" />
                </div>
              </div>

              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  Página {usersPage} de {Math.max(1, usersTotalPages)} · {usersTotalRecords} registros
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={usersPage <= 1 || loading || refreshing}
                    onClick={() => setUsersPage((previous) => Math.max(1, previous - 1))}
                    className="h-9 rounded-xl border-white/10 bg-white/5 hover:bg-white/10"
                  >
                    Anterior
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={usersPage >= usersTotalPages || loading || refreshing}
                    onClick={() => setUsersPage((previous) => Math.min(Math.max(1, usersTotalPages), previous + 1))}
                    className="h-9 rounded-xl border-white/10 bg-white/5 hover:bg-white/10"
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </div>

            {[
              {
                key: 'live',
                title: 'Online ahora',
                description: 'Heartbeat reciente y contexto suficiente para moderar en caliente.',
                items: liveUsers,
                badgeTone: 'text-emerald-300',
              },
              {
                key: 'archive',
                title: 'Registro y seguimiento',
                description: 'Cuentas sin presencia reciente, ordenadas para auditoria y comportamiento historico.',
                items: archivedUsers,
                badgeTone: 'text-foreground/70',
              },
            ]
              .filter((section) => section.items.length > 0 || section.key === 'live')
              .map((section) => (
                <div key={section.key} className="space-y-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between px-2">
                    <div>
                      <h3 className="text-lg font-black text-foreground tracking-tight">{section.title}</h3>
                      <p className="text-sm text-muted-foreground">{section.description}</p>
                    </div>
                    <Badge variant="outline" className={`bg-white/5 border-white/10 uppercase tracking-widest text-[9px] ${section.badgeTone}`}>
                      {section.items.length} USUARIOS
                    </Badge>
                  </div>

                  {section.items.length === 0 ? (
                    <div className="glass rounded-[2rem] border border-white/5 py-12 text-center">
                      <Users className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No hay jugadores activos en este momento.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {section.items.map((u: AdminUser, i: number) => {
                        const isOnline = isUserOnline(u.last_seen_at);
                        const activeGame = activeGames.find((g) => g.players?.some((p) => p.userId === u.id));
                        const isInSession = !!activeGame;
                        // Reportar presencia en sala de juego solo cuando el heartbeat del usuario esté fresco.
                        // Un last_seen_at obsoleto indica desconexión; el registro en BD
                        // aún no se ha limpiado.
                        const canSpectate = isOnline && activeGame?.status === 'in_progress';
                        const isWaitingRoom = isOnline && activeGame?.status === 'waiting';
                        const ipFlags = getRiskFlags(u.ip_info);
                        const ipTone = getRiskTone(u.ip_info);
                        const presenceTone = canSpectate ? 'amber' : isWaitingRoom ? 'cyan' : isOnline ? 'emerald' : 'slate';
                        const vpnDetected = Boolean(u.ip_info?.risk?.is_vpn);
                        const presenceLabel = canSpectate
                          ? 'En partida'
                          : isWaitingRoom
                            ? 'En sala'
                            : isOnline
                              ? 'Heartbeat activo'
                              : 'Sin heartbeat';
                        const presenceLocation = canSpectate
                          ? `Mesa #${activeGame?.id.slice(0, 6)}`
                          : isWaitingRoom
                            ? `Sala #${activeGame?.id.slice(0, 6)}`
                            : getLocationLabel(u.current_location);
                        const presenceState = canSpectate
                          ? 'En partida'
                          : isWaitingRoom
                            ? 'En sala de espera'
                            : isOnline
                              ? 'Online'
                              : 'Offline';

                        return (
                          <m.div
                            key={u.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.02 }}
                            className="glass rounded-[2rem] p-4 sm:p-6 border border-white/5 hover:border-cyan-400/20 transition-all relative overflow-hidden"
                          >
                            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.18fr)_minmax(340px,0.82fr)]">
                              <div className="min-w-0">
                                <div className="flex flex-col items-start gap-4 sm:flex-row sm:gap-5 min-w-0">
                                  <div className="relative shrink-0">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white/10 to-white/[0.02] flex items-center justify-center text-2xl shadow-inner border border-white/10 font-black">
                                      {u.username?.[0]?.toUpperCase() || '?'}
                                    </div>
                                    <div
                                      className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-black/40 ${
                                        isOnline ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : 'bg-muted-foreground/30'
                                      }`}
                                    />
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h3 className="font-black text-xl text-foreground tracking-tight uppercase italic break-words [overflow-wrap:anywhere]">{u.username}</h3>
                                      {u.is_super_admin ? (
                                        <Badge className="bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-500/30 text-[9px] h-5 font-black uppercase tracking-[0.18em]">Super Admin</Badge>
                                      ) : u.is_admin ? (
                                        <Badge className="bg-rose-500/15 text-rose-300 border-rose-500/20 text-[9px] h-5 font-black uppercase tracking-[0.18em]">Admin</Badge>
                                      ) : null}
                                      {!u.is_active ? (
                                        <Badge className="bg-rose-500/10 text-rose-300 border-rose-500/20 text-[9px] h-5 font-black uppercase tracking-[0.18em]">Suspendido</Badge>
                                      ) : null}
                                    </div>

                                    <p className="mt-1 text-[11px] font-mono text-white/45 break-all">
                                      ID {u.id}
                                    </p>
                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                      <p className="min-w-0 text-sm text-foreground/80 break-all">
                                        {revealedEmails[u.id]
                                          ? (looksLikeEmail(u.email) ? u.email : 'Sin email visible')
                                          : maskEmail(u.email)}
                                      </p>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setRevealedEmails((prev) => ({ ...prev, [u.id]: !prev[u.id] }))}
                                        className="h-8 w-8 shrink-0 rounded-xl border border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/10 hover:text-white"
                                      >
                                        {revealedEmails[u.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                      </Button>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                                      Alta: {formatCompactDate(u.created_at)} · Ultimo acceso: {formatCompactDateTime(u.last_auth_at)}
                                    </p>

                                    <div className="flex flex-wrap items-center gap-2 mt-4">
                                      <Badge variant="outline" className="h-6 px-2.5 text-[10px] border-amber-400/20 text-amber-300 font-black tabular-nums">
                                        {u.total_points || 0} PTS
                                      </Badge>
                                      <Badge variant="outline" className="h-6 px-2.5 text-[10px] border-cyan-400/20 text-cyan-300 font-black tabular-nums">
                                        {u.games_won || 0} WINS
                                      </Badge>
                                      <Badge variant="outline" className="h-6 px-2.5 text-[10px] border-white/10 text-foreground/80 font-black tabular-nums">
                                        {u.games_played || 0} PARTIDAS
                                      </Badge>
                                    </div>

                                    <div className="flex flex-wrap gap-2 mt-4">
                                      <SignalPill
                                        label={presenceLabel}
                                        accent={presenceTone}
                                      />
                                      <SignalPill
                                        label={presenceLocation}
                                        accent="cyan"
                                      />
                                      <SignalPill label={formatRelativeLastSeen(u.last_seen_at)} accent="slate" />
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="grid sm:grid-cols-2 gap-3">
                                <TelemetryCard
                                  label="Presencia"
                                  value={presenceState}
                                  subtitle={`${presenceLocation} · ${formatRelativeLastSeen(u.last_seen_at)}`}
                                  accent={presenceTone}
                                />
                                <TelemetryCard
                                  label="IP del jugador"
                                  value={formatIpAddress(u.last_ip_address || u.ip_info?.ip)}
                                  subtitle={getIpLocationLabel(u.ip_info)}
                                  accent={u.ip_info?.private ? 'slate' : 'cyan'}
                                />
                                <TelemetryCard
                                  label="Infraestructura"
                                  value={getProviderLabel(u.ip_info)}
                                  subtitle={u.ip_info?.isp?.asn || u.ip_info?.message || 'Sin ASN ni descripcion de red'}
                                  accent="slate"
                                />
                                <TelemetryCard
                                  label="Riesgo / VPN"
                                  value={vpnDetected ? 'VPN detectada' : getRiskSummary(u.ip_info)}
                                  subtitle={
                                    ipFlags.length
                                      ? ipFlags.join(' · ')
                                      : u.ip_info?.private
                                        ? 'Red local o desarrollo'
                                        : 'Sin señales relevantes'
                                  }
                                  accent={ipTone}
                                />
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 mt-4">
                              {ipFlags.length ? (
                                ipFlags.map((flag) => (
                                  <SignalPill
                                    key={`${u.id}-${flag}`}
                                    label={flag}
                                    accent={flag === 'LOCAL' ? 'slate' : flag === 'MOVIL' ? 'amber' : 'rose'}
                                  />
                                ))
                              ) : (
                                <SignalPill label="Sin indicadores fuertes de red" accent="emerald" />
                              )}
                              {vpnDetected ? <SignalPill label="VPN detectada" accent="rose" /> : null}
                              {u.ip_info?.location?.country ? <SignalPill label={u.ip_info.location.country} accent="cyan" /> : null}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2 pt-4 mt-4 border-t border-white/5">
                              {canSpectate ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => spectateGame(activeGame!.id, u.username)}
                                  className="h-11 justify-center sm:justify-start rounded-xl bg-white/5 border-white/10 hover:border-cyan-400/30 hover:bg-cyan-400/5"
                                >
                                  <Eye className="w-4 h-4 text-cyan-300" />
                                  Espectar
                                </Button>
                              ) : null}
                              <Button variant="outline" size="sm" onClick={() => addPointsToUser(u.id)} className="h-11 justify-center sm:justify-start rounded-xl bg-white/5 border-white/10 hover:border-emerald-400/30 hover:bg-emerald-400/5">
                                <RefreshCw className="w-4 h-4 text-emerald-300" />
                                Otorgar puntos
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => resetUserStats(u.id, 'all')} className="h-11 justify-center sm:justify-start rounded-xl bg-white/5 border-white/10 hover:border-amber-400/30 hover:bg-amber-400/5">
                                <BarChart2 className="w-4 h-4 text-amber-300" />
                                Reset puntos+wins
                              </Button>
                              {!u.is_super_admin && (!u.is_admin || viewerIsSuperAdmin) ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleBanUser(u)}
                                  className={`h-11 justify-center sm:justify-start rounded-xl border-white/10 transition-all ${
                                    u.is_active
                                      ? 'bg-white/5 hover:border-rose-400/30 hover:bg-rose-400/5'
                                      : 'border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/15'
                                  }`}
                                >
                                  <Ban className={`w-4 h-4 ${u.is_active ? 'text-rose-300' : 'text-rose-200'}`} />
                                  {u.is_active ? 'Suspender' : 'Reactivar'}
                                </Button>
                              ) : (
                                <div className="h-11 rounded-xl border border-white/10 bg-white/5 px-4 flex items-center justify-center sm:justify-start text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-200/80">
                                  {u.is_super_admin ? 'Super admin protegido' : 'Cuenta admin protegida'}
                                </div>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" className="h-11 justify-between rounded-xl bg-white/5 border-white/10 hover:bg-white/10">
                                    <span className="inline-flex items-center gap-2">
                                      <MoreVertical className="w-4 h-4 text-muted-foreground" />
                                      Mas acciones
                                    </span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-black/90 backdrop-blur-xl border-white/10 rounded-2xl shadow-2xl">
                                  <DropdownMenuItem onClick={() => resetUserStats(u.id, 'points')} className="gap-2 text-amber-300 focus:text-amber-300 focus:bg-amber-500/10">
                                    <BarChart2 className="w-4 h-4" /> Reset puntos
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => resetUserStats(u.id, 'wins')} className="gap-2 text-cyan-300 focus:text-cyan-300 focus:bg-cyan-500/10">
                                    <Trophy className="w-4 h-4" /> Reset victorias
                                  </DropdownMenuItem>
                                  {viewerIsSuperAdmin && !u.is_super_admin && !u.is_admin ? (
                                    <DropdownMenuItem
                                      onClick={() => updateUser(u.id, { role: 'admin' })}
                                      className="gap-2 text-indigo-300 focus:text-indigo-300 focus:bg-indigo-500/10"
                                    >
                                      <Shield className="w-4 h-4" /> Dar rol admin
                                    </DropdownMenuItem>
                                  ) : null}
                                  {viewerIsSuperAdmin && !u.is_super_admin && u.is_admin ? (
                                    <DropdownMenuItem
                                      onClick={() => updateUser(u.id, { role: 'user' })}
                                      className="gap-2 text-violet-300 focus:text-violet-300 focus:bg-violet-500/10"
                                    >
                                      <Shield className="w-4 h-4" /> Quitar rol admin
                                    </DropdownMenuItem>
                                  ) : null}
                                  {isInSession ? (
                                    <DropdownMenuItem onClick={() => kickUser(u.id)} className="gap-2 text-amber-300 focus:text-amber-300 focus:bg-amber-500/10">
                                      <Gamepad2 className="w-4 h-4" /> Expulsar de partida
                                    </DropdownMenuItem>
                                  ) : null}
                                  {!u.is_admin ? (
                                    <>
                                      <DropdownMenuSeparator className="bg-white/10" />
                                      <DropdownMenuItem onClick={() => deleteUser(u.id)} className="gap-2 text-rose-300 focus:text-rose-300 focus:bg-rose-500/10">
                                        <Trash2 className="w-4 h-4" /> Borrar cuenta
                                      </DropdownMenuItem>
                                    </>
                                  ) : null}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </m.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
          </m.div>
        )}

        {/* pestaña: Chats */}
        {selectedTab === 'chats' && (
          <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between px-2">
              <div>
                <h2 className="text-2xl font-black text-foreground tracking-tight">Historial de chat por sala</h2>
                <p className="text-sm text-muted-foreground">Timeline resumido de cada mesa, con participantes, moderación y palabras bloqueadas.</p>
              </div>
              <Badge variant="outline" className="bg-white/5 border-white/10 uppercase tracking-widest text-[9px] font-bold">
                {chatRooms.length} SALAS
              </Badge>
            </div>

            <div className="glass rounded-3xl border-white/5 p-5 space-y-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-rose-300/75">Filtro global</p>
                  <h3 className="text-lg font-black text-foreground">Lista negra del chat</h3>
                  <p className="text-sm text-muted-foreground">Las palabras de este diccionario se censuran automáticamente en todas las salas.</p>
                </div>
                <Badge variant="outline" className="bg-white/5 border-white/10 uppercase tracking-widest text-[9px]">
                  {chatBlacklist.length} TÉRMINOS
                </Badge>
              </div>

              <div className="flex flex-col gap-3 md:flex-row">
                <Input
                  value={newBlacklistTerm}
                  onChange={(event) => setNewBlacklistTerm(event.target.value)}
                  placeholder="Añade una palabra o variación nueva"
                  className="border-white/10 bg-black/20 text-white"
                />
                <Button onClick={addBlacklistWord} className="rounded-xl bg-cyan-400 text-slate-950 hover:bg-cyan-300">
                  Añadir a la lista negra
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {chatBlacklist.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay palabras cargadas todavía.</p>
                ) : (
                  chatBlacklist.map((term) => (
                    <div key={term.id} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
                      term.isDefault ? 'border-white/10 bg-white/[0.04] text-foreground/80' : 'border-cyan-400/20 bg-cyan-400/10 text-cyan-200'
                    }`}>
                      <span>{term.term}</span>
                      {term.isDefault ? (
                        <span className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Base</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => removeBlacklistWord(term)}
                          title={`Eliminar termino ${term.term}`}
                          aria-label={`Eliminar termino ${term.term}`}
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/20 text-rose-200 hover:bg-rose-500/20"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {chatRooms.length === 0 ? (
              <div className="glass rounded-[2rem] border-white/5 py-20 text-center">
                <MessageSquare className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">Todavía no hay salas con historial de chat cargado.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {chatRooms.map((room, index) => (
                  <m.div
                    key={room.gameId}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="glass rounded-3xl border border-white/5 p-4 sm:p-5 space-y-4"
                  >
                    {(() => {
                      const roomTimeline = [
                        ...room.recentMessages.map((message) => ({
                          id: `message-${message.id}`,
                          createdAt: message.createdAt,
                          kind: 'message',
                          title: message.username,
                          body: message.text,
                          rawId: message.id,
                        })),
                        ...room.moderationEvents.map((event) => ({
                          id: `event-${event.id}`,
                          createdAt: event.createdAt,
                          kind: event.eventType,
                          title: event.actorName || 'Moderación',
                          body: event.message,
                          rawId: event.id,
                        })),
                      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

                      return (
                        <>
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Sala / partida</p>
                              <h3 className="text-lg font-black text-foreground mt-1">#{room.gameId.slice(0, 8)}</h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                {room.status === 'finished' ? 'Sala cerrada' : room.status === 'in_progress' ? 'Partida en curso' : 'Sala de espera'} · cooldown {room.cooldownSeconds}s
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge className={`${
                                room.status === 'finished'
                                  ? 'bg-white/5 text-foreground/70 border-white/10'
                                  : room.status === 'in_progress'
                                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                                    : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                              }`}>
                                {room.status === 'finished' ? 'CERRADA' : room.status === 'in_progress' ? 'EN CURSO' : 'EN ESPERA'}
                              </Badge>
                              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                                {room.messageCount} mensajes
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <HistoryMetric
                              label="Participantes"
                              value={`${room.participantCount} personas`}
                              subtitle={`Baneos activos: ${room.activeBans.length}`}
                            />
                            <HistoryMetric
                              label="Creada"
                              value={formatCompactDate(room.createdAt)}
                              subtitle={formatCompactTime(room.createdAt)}
                            />
                            <HistoryMetric
                              label="Último movimiento"
                              value={roomTimeline[0] ? formatCompactDate(roomTimeline[0].createdAt) : 'Sin actividad'}
                              subtitle={roomTimeline[0] ? formatCompactTime(roomTimeline[0].createdAt) : 'Aún sin eventos'}
                            />
                          </div>

                          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                            <div className="flex items-center justify-between gap-3 mb-3">
                              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Quiénes estuvieron</p>
                              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{room.participants.length} perfiles</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {room.participants.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No hay participantes vinculados a esta sala.</p>
                              ) : (
                                room.participants.map((participant) => (
                                  <span key={`${room.gameId}-${participant.userId || participant.username}`} className="inline-flex items-center rounded-full border border-white/10 bg-black/15 px-3 py-1.5 text-[11px] font-semibold text-foreground/85">
                                    {participant.username}
                                  </span>
                                ))
                              )}
                            </div>
                          </div>

                          <div className="rounded-2xl border border-white/5 bg-white/[0.03] overflow-hidden">
                            <div className="px-4 py-3 border-b border-white/5 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-300/75">Timeline del chat</p>
                              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{roomTimeline.length} eventos</span>
                            </div>
                            {roomTimeline.length === 0 ? (
                              <div className="px-4 py-10 text-center">
                                <p className="text-sm text-muted-foreground">Esta sala no dejó mensajes ni eventos de moderación.</p>
                              </div>
                            ) : (
                              <div className="max-h-[24rem] sm:max-h-[30rem] overflow-y-auto divide-y divide-white/5">
                                {roomTimeline.map((entry) => (
                                  <div key={entry.id} className="px-4 py-3 flex flex-col items-start gap-3 sm:flex-row">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-sm font-bold text-foreground">{entry.title}</span>
                                        <Badge variant="outline" className={`text-[8px] h-4 ${
                                          entry.kind === 'message'
                                            ? 'border-cyan-400/20 text-cyan-300'
                                            : 'border-amber-400/20 text-amber-300'
                                        }`}>
                                          {entry.kind === 'message' ? 'CHAT' : 'MOD'}
                                        </Badge>
                                        <span className="text-[10px] text-muted-foreground font-mono">{formatCompactDateTime(entry.createdAt)}</span>
                                      </div>
                                      <p className="text-sm text-foreground/75 mt-1 leading-relaxed">{entry.body}</p>
                                    </div>
                                    {entry.kind === 'message' ? (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => deleteChat(entry.rawId)}
                                        className="w-8 h-8 rounded-xl text-rose-300/60 hover:text-rose-200 hover:bg-rose-500/10 self-end sm:self-auto"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </m.div>
                ))}
              </div>
            )}
          </m.div>
        )}

        {/* pestaña: seguridad */}
        {selectedTab === 'security' && (
          <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <SecurityTab attempts={loginAttempts} fetchFn={authenticatedFetch} />
          </m.div>
        )}
      </div>

      <Dialog open={Boolean(pointsDialogUser)} onOpenChange={(open) => {
        if (!dialogPending && !open) {
          setPointsDialogUser(null);
        }
      }}>
        <DialogContent className="max-w-md rounded-[1.75rem] border-white/10 bg-zinc-950/95 text-white backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle>Otorgar puntos</DialogTitle>
            <DialogDescription>
              Regala puntos manuales a {pointsDialogUser?.username}. Esta acción sí impacta su acumulado administrativo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label htmlFor="admin-points-amount" className="block text-xs font-bold uppercase tracking-[0.2em] text-cyan-300/80">
              Cantidad
            </label>
            <Input
              id="admin-points-amount"
              type="number"
              min="1"
              step="1"
              value={pointsAmount}
              onChange={(event) => setPointsAmount(event.target.value)}
              className="border-white/10 bg-white/5 text-white"
              placeholder="100"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPointsDialogUser(null)}
              disabled={dialogPending}
              className="border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                const amount = Number(pointsAmount);
                if (!Number.isFinite(amount) || amount <= 0) {
                  adminError('Cantidad inválida', 'Introduce un número mayor que cero.');
                  return;
                }

                if (!pointsDialogUser) return;

                setDialogPending(true);
                try {
                  await runAdminPromise(
                    requestJson<{ message?: string }>(`/api/admin/users/${pointsDialogUser.id}/add-points`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ amount }),
                    }),
                    {
                      loading: `Otorgando ${amount} puntos...`,
                      success: (result) => result.message || `${amount} puntos entregados`,
                      onSuccess: async () => {
                        setPointsDialogUser(null);
                        await loadDashboardData(true);
                      },
                    }
                  );
                } finally {
                  setDialogPending(false);
                }
              }}
              disabled={dialogPending}
              className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"
            >
              {dialogPending ? 'Procesando...' : 'Otorgar puntos'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(banDialogUser)} onOpenChange={(open) => {
        if (!dialogPending && !open) {
          setBanDialogUser(null);
        }
      }}>
        <DialogContent className="max-w-lg rounded-[1.75rem] border-white/10 bg-zinc-950/95 text-white backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle>Suspender jugador</DialogTitle>
            <DialogDescription>
              El motivo se mostrará a la mesa si este baneo afecta una partida activa.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label htmlFor="admin-ban-reason" className="block text-xs font-bold uppercase tracking-[0.2em] text-rose-300/80">
              Motivo del baneo
            </label>
            <Input
              id="admin-ban-reason"
              value={banReason}
              onChange={(event) => setBanReason(event.target.value)}
              className="border-white/10 bg-white/5 text-white"
              placeholder="Comportamiento indebido"
              maxLength={140}
            />
            <p className="text-xs text-muted-foreground">
              Ejemplo: uso de VPN sospechosa, acoso en chat, manipulación de sesión o sabotaje de partida.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBanDialogUser(null)}
              disabled={dialogPending}
              className="border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (!banDialogUser) return;

                const normalizedReason = banReason.trim() || 'Moderación administrativa';

                setDialogPending(true);
                try {
                  await runAdminPromise(
                    requestJson(`/api/admin/users/${banDialogUser.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ is_active: false, ban_reason: normalizedReason }),
                    }),
                    {
                      loading: `Suspendiendo a ${banDialogUser.username}...`,
                      success: `${banDialogUser.username} fue suspendido`,
                      description: normalizedReason,
                      onSuccess: async () => {
                        setBanDialogUser(null);
                        await loadDashboardData(true);
                      },
                    }
                  );
                } finally {
                  setDialogPending(false);
                }
              }}
              disabled={dialogPending}
              className="bg-rose-500 text-white hover:bg-rose-400"
            >
              {dialogPending ? 'Aplicando...' : 'Suspender jugador'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(chatBanDialog)} onOpenChange={(open) => {
        if (!dialogPending && !open) {
          setChatBanDialog(null);
        }
      }}>
        <DialogContent className="max-w-lg rounded-[1.75rem] border-white/10 bg-zinc-950/95 text-white backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle>Bloquear del chat</DialogTitle>
            <DialogDescription>
              {chatBanDialog?.username} no podrá volver a escribir en el chat de esta sala hasta que levantes el bloqueo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label htmlFor="admin-chat-ban-reason" className="block text-xs font-bold uppercase tracking-[0.2em] text-rose-300/80">
              Motivo visible
            </label>
            <Input
              id="admin-chat-ban-reason"
              value={chatBanReason}
              onChange={(event) => setChatBanReason(event.target.value)}
              className="border-white/10 bg-white/5 text-white"
              placeholder="Spam o conducta inapropiada"
              maxLength={140}
            />
            <p className="text-xs text-muted-foreground">
              Este motivo se mostrará en la sala y quedará guardado en el historial de moderación.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setChatBanDialog(null)}
              disabled={dialogPending}
              className="border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (!chatBanDialog) return;

                const normalizedReason = chatBanReason.trim() || 'Moderación de chat';
                setDialogPending(true);
                try {
                  await runAdminPromise(
                    requestJson(`/api/admin/chat`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        action: 'banUser',
                        gameId: chatBanDialog.gameId,
                        userId: chatBanDialog.userId,
                        username: chatBanDialog.username,
                        reason: normalizedReason,
                      }),
                    }),
                    {
                      loading: `Bloqueando a ${chatBanDialog.username} del chat...`,
                      success: `${chatBanDialog.username} fue bloqueado del chat`,
                      description: normalizedReason,
                      onSuccess: async () => {
                        setChatBanDialog(null);
                        await loadDashboardData(true);
                      },
                    }
                  );
                } finally {
                  setDialogPending(false);
                }
              }}
              disabled={dialogPending}
              className="bg-rose-500 text-white hover:bg-rose-400"
            >
              {dialogPending ? 'Aplicando...' : 'Bloquear del chat'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── StatCard ────────────────────────────────────────────────────────────────

function StatCard({ title, value, icon, accent, delay = 0 }: {
  title: string; value: number; icon: React.ReactNode; accent: string; delay?: number;
}) {
  const accentColors: Record<string, string> = {
    blue: 'text-cyan-300 bg-cyan-400/5 border-cyan-400/10',
    green: 'text-emerald-300 bg-emerald-400/5 border-emerald-400/10',
    red: 'text-rose-300 bg-rose-400/5 border-rose-400/10',
    yellow: 'text-amber-300 bg-amber-400/5 border-amber-400/10',
  };

  return (
    <m.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      whileHover={{ y: -4 }}
      className="relative glass rounded-3xl p-6 border border-white/5 transition-all duration-300 hover:border-white/10"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-2xl ${accentColors[accent]} transition-all duration-300`}>
          {icon}
        </div>
      </div>
      
      <div className="space-y-0.5">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
          {title}
        </p>
        <p className="text-3xl font-black text-foreground tracking-tight">
          {value?.toLocaleString() ?? 0}
        </p>
      </div>
    </m.div>
  );
}

function HistoryMetric({ label, value, subtitle }: { label: string; value: string; subtitle?: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3">
      <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p className="text-sm font-black text-foreground mt-2">{value}</p>
      {subtitle ? <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{subtitle}</p> : null}
    </div>
  );
}

function InfoTile({ label, value, accent }: { label: string; value: string; accent: 'amber' | 'emerald' | 'cyan' | 'slate' }) {
  const accents = {
    amber: 'border-amber-400/20 bg-amber-400/5 text-amber-300',
    emerald: 'border-emerald-400/20 bg-emerald-400/5 text-emerald-300',
    cyan: 'border-cyan-400/20 bg-cyan-400/5 text-cyan-300',
    slate: 'border-white/10 bg-white/[0.03] text-foreground/80',
  };

  return (
    <div className={`rounded-2xl border p-3 ${accents[accent]}`}>
      <p className="text-[9px] font-bold uppercase tracking-[0.22em] opacity-70">{label}</p>
      <p className="text-sm font-black text-foreground mt-2 leading-tight">{value}</p>
    </div>
  );
}

function TelemetryCard({
  label,
  value,
  subtitle,
  accent,
}: {
  label: string;
  value: string;
  subtitle?: string;
  accent: 'amber' | 'emerald' | 'cyan' | 'rose' | 'slate';
}) {
  const accents = {
    amber: 'border-amber-400/20 bg-amber-400/5 text-amber-300',
    emerald: 'border-emerald-400/20 bg-emerald-400/5 text-emerald-300',
    cyan: 'border-cyan-400/20 bg-cyan-400/5 text-cyan-300',
    rose: 'border-rose-400/20 bg-rose-400/5 text-rose-300',
    slate: 'border-white/10 bg-white/[0.03] text-foreground/80',
  };

  return (
    <div className={`rounded-2xl border p-4 ${accents[accent]}`}>
      <p className="text-[9px] font-bold uppercase tracking-[0.22em] opacity-70">{label}</p>
      <p className="text-sm font-black text-foreground mt-2 leading-snug break-words">{value}</p>
      {subtitle ? <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">{subtitle}</p> : null}
    </div>
  );
}

function SignalPill({
  label,
  accent,
}: {
  label: string;
  accent: 'amber' | 'emerald' | 'rose' | 'slate' | 'cyan';
}) {
  const tones = {
    amber: 'border-amber-400/20 bg-amber-400/5 text-amber-300',
    emerald: 'border-emerald-400/20 bg-emerald-400/5 text-emerald-300',
    rose: 'border-rose-400/20 bg-rose-400/5 text-rose-300',
    cyan: 'border-cyan-400/20 bg-cyan-400/5 text-cyan-300',
    slate: 'border-white/10 bg-white/[0.03] text-foreground/75',
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${tones[accent]}`}>
      {label}
    </span>
  );
}

// ─── seguridad pestaña ─────────────────────────────────────────────────────────────

function SecurityTab({ attempts, fetchFn }: {
  attempts: LoginAttempt[];
  fetchFn: (url: string, opts?: RequestInit) => Promise<Response>;
}) {
  const [selected, setSelected] = useState<LoginAttempt | null>(null);
  const [ipInfo, setIpInfo] = useState<IPInfo | null>(null);
  const [ipLoading, setIpLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'failed' | 'success'>('all');

  const filteredAttempts = attempts.filter(a => {
    if (filter === 'failed') return !a.success;
    if (filter === 'success') return a.success;
    return true;
  });
  const failedCount = attempts.filter(a => !a.success).length;
  const successCount = attempts.filter(a => a.success).length;

  // seguridad Intelligence: Detection of Suspicious Activity
  const ipAttempts = attempts.reduce((acc, curr) => {
    acc[curr.ip_address] = (acc[curr.ip_address] || 0) + (curr.success ? 0 : 1);
    return acc;
  }, {} as Record<string, number>);

  const suspiciousIPs = Object.entries(ipAttempts)
    .filter(([_, count]) => count >= 5)
    .map(([ip, count]) => ({ ip, count, reason: 'Posible Fuerza Bruta' }));

  const lookupIP = async (attempt: LoginAttempt) => {
    setSelected(attempt); setIpInfo(null); setIpLoading(true);
    try {
      const res = await fetchFn(`/api/admin/ip-info?ip=${encodeURIComponent(attempt.ip_address)}`);
      if (res.ok) setIpInfo(await res.json());
    } finally { setIpLoading(false); }
  };

  return (
    <div className="space-y-6">
      {/* seguridad Alerts / Suspicious Events */}
      {suspiciousIPs.length > 0 && (
        <m.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-panama-red/10 border border-panama-red/30 rounded-3xl p-4 mb-4"
        >
          <h4 className="text-[10px] font-black text-panama-red uppercase tracking-widest mb-3 flex items-center gap-2">
            <AlertTriangle className="w-3 h-3" /> Alertas Críticas Detectadas
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {suspiciousIPs.map(alert => (
              <div key={alert.ip} className="bg-black/20 rounded-xl p-3 border border-panama-red/20 flex items-center justify-between">
                <div className="v-stack gap-0.5">
                  <p className="text-xs font-mono font-bold text-foreground">{alert.ip}</p>
                  <p className="text-[9px] text-panama-red/80 font-bold uppercase">{alert.reason}</p>
                </div>
                <Badge className="bg-panama-red/20 text-panama-red border-0 text-[10px] font-black">{alert.count} FALLOS</Badge>
              </div>
            ))}
          </div>
        </m.div>
      )}

      {/* seguridad Overviews Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Intentos', value: attempts.length, accent: 'blue' },
          { label: 'Accesos Fallidos', value: failedCount, accent: 'red' },
          { label: 'Accesos Exitosos', value: successCount, accent: 'green' },
        ].map(s => (
          <div key={s.label} className="glass rounded-2xl p-5 border border-white/5 flex flex-col items-center justify-center text-center">
            <p className={`text-3xl font-black mb-1 ${
              s.accent === 'red' ? 'text-panama-red' : 
              s.accent === 'green' ? 'text-green-500' : 
              'text-panama-blue'
            }`}>
              {s.value}
            </p>
            <p className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase opacity-60">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Logs List */}
        <div className="flex-1 glass rounded-3xl overflow-hidden flex flex-col h-[400px] lg:h-[500px] border border-white/5">
          <div className="flex bg-white/5 border-b border-white/5 p-1">
            {(['all', 'failed', 'success'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-all rounded-xl ${
                  filter === f 
                    ? 'bg-white/10 text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}>
                {f === 'all' ? 'Ver Todos' : f === 'failed' ? 'Bloqueados' : 'Autorizados'}
              </button>
            ))}
          </div>
          <div className="overflow-y-auto flex-1 no-scrollbar">
            {filteredAttempts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-30">
                <Shield className="w-12 h-12 mb-3" />
                <p className="text-sm font-medium italic">Sin registros de auditoría</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filteredAttempts.slice(0, 100).map(attempt => (
                  <button key={attempt.id} onClick={() => lookupIP(attempt)}
                    className={`w-full flex items-start gap-4 p-4 hover:bg-white/[0.03] transition-all text-left ${selected?.id === attempt.id ? 'bg-white/[0.05] border-l-2 border-panama-blue' : 'border-l-2 border-transparent'}`}>
                    <div className="mt-1">
                      {attempt.success 
                        ? <CheckCircle2 className="w-4 h-4 text-green-500/60" /> 
                        : <XCircle className="w-4 h-4 text-panama-red/60" />
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground text-sm font-mono font-bold tracking-tight mb-0.5">{attempt.ip_address}</p>
                      <div className="flex items-center gap-2 opacity-50">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{new Date(attempt.attempted_at).toLocaleTimeString('es-PA')}</p>
                        <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                        <p className="text-[10px] font-medium text-muted-foreground truncate">{attempt.user_agent?.split(' ')[0]}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Info Detail */}
        <div className="lg:w-80 glass rounded-3xl p-6 border border-white/5 flex flex-col min-h-[400px]">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30">
              <Globe className="w-12 h-12 mb-4" />
              <p className="text-xs font-bold uppercase tracking-widest leading-loose">Selecciona un registro<br/>para auditar</p>
            </div>
          ) : ipLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <RefreshCw className="w-8 h-8 text-panama-blue animate-spin opacity-50" />
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Consultando Inteligencia...</p>
            </div>
          ) : ipInfo ? (
            <div className="v-stack gap-6">
              <div className="v-stack gap-2">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">DIRECCIÓN IP</p>
                <h3 className="font-bold flex items-center gap-2 text-foreground">
                   <Wifi className="w-4 h-4 text-panama-blue" />
                   <span className="font-mono text-lg">{ipInfo.ip}</span>
                </h3>
                {ipInfo.private && (
                  <Badge className="bg-panama-yellow/10 text-panama-yellow border-panama-yellow/20 w-fit font-bold">⚠️ RED PRIVADA</Badge>
                )}
              </div>

              {!ipInfo.private && (
                <>
                  {ipInfo.risk && (
                    <div className="v-stack gap-3">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Análisis de Riesgo</p>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { label: 'VPN', val: ipInfo.risk.is_vpn },
                          { label: 'Tor', val: ipInfo.risk.is_tor },
                          { label: 'Proxy', val: ipInfo.risk.is_proxy },
                        ].map(item => (
                          <Badge key={item.label} className={`rounded-xl px-2 py-0.5 text-[9px] font-bold ${
                            item.val ? 'bg-panama-red/10 text-panama-red border-panama-red/20' : 'bg-green-500/10 text-green-500 border-green-500/20'
                          }`}>
                            {item.label}
                          </Badge>
                        ))}
                      </div>
                      <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                        <div className="flex justify-between items-center mb-1">
                           <span className="text-[10px] font-bold text-muted-foreground">SCORE</span>
                           <span className={`text-xs font-black ${ipInfo.risk.risk_score > 50 ? 'text-panama-red' : 'text-green-500'}`}>
                             {ipInfo.risk.risk_score}/100
                           </span>
                        </div>
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                           <div className={`h-full ${ipInfo.risk.risk_score > 50 ? 'bg-panama-red' : 'bg-green-500'}`} style={{ width: `${ipInfo.risk.risk_score}%` }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {ipInfo.location && (
                    <div className="v-stack gap-2 group">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Geolocalización</p>
                      <div className="p-3 bg-white/5 rounded-2xl border border-white/5 v-stack gap-2">
                        <p className="text-xs font-bold text-foreground flex items-center gap-2">
                          <span className="text-base">🌍</span> {ipInfo.location.country}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-medium pl-6">
                           {ipInfo.location.city}, {ipInfo.location.state}
                        </p>
                        <p className="text-[10px] font-mono text-muted-foreground/50 pl-6 uppercase">
                           TZ: {ipInfo.location.timezone}
                        </p>
                      </div>
                    </div>
                  )}

                  {ipInfo.isp && (
                    <div className="v-stack gap-2 pt-2 border-t border-white/5">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Infraestructura</p>
                      <p className="text-[11px] font-bold text-foreground/80 leading-snug">
                         {ipInfo.isp.org}
                      </p>
                      <p className="text-[9px] font-mono text-muted-foreground/60">{ipInfo.isp.asn}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center italic text-xs text-muted-foreground opacity-50">
              Error de conexión con ipquery
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <AuthGuard requireAdmin>
      <AdminContent />
    </AuthGuard>
  );
}
