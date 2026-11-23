import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ArenaId,
  AvatarConfig,
  ChatMessage,
  ConnectionMode,
  LeaderboardEntry,
  OnlineFighterSnapshot,
  OnlineRoomSummary,
  WeaponId,
} from '../types/game';
import { RIVAL_CHAMPIONS } from '../data/gameCatalog';

export interface OnlineDamageEvent {
  attackerId: string;
  targetId: string;
  damage: number;
  critical: boolean;
  hp: number;
  knockX: number;
  knockZ: number;
}

export interface OnlineVfxEvent {
  playerId: string;
  kind: string;
  x: number;
  z: number;
  color: string;
  radius: number;
}

const SERVER_URL_STORAGE_KEY = 'maydan_custom_server_url';
const LOCAL_CHAT_STORAGE_KEY = 'maydan_local_world_chat_v1';
const BROADCAST_CHANNEL_NAME = 'maydan_etheria_local_net';

function isLikelyStaticHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h.endsWith('github.io') ||
    h.endsWith('pages.dev') ||
    h.endsWith('netlify.app') ||
    h.endsWith('vercel.app') ||
    h.endsWith('surge.sh')
  );
}

function normalizeServerBaseUrl(rawUrl: string): string {
  const clean = rawUrl.trim().replace(/\/+$/, '');
  if (!clean) return '';
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(clean) ? clean : `https://${clean}`;
  try {
    const parsed = new URL(candidate);
    if (!['http:', 'https:', 'ws:', 'wss:'].includes(parsed.protocol)) {
      return '';
    }
    return parsed.origin.replace(/\/+$/, '');
  } catch {
    return '';
  }
}

function buildDefaultStaticLeaderboard(playerEntry?: {
  id: string;
  name: string;
  rating: number;
  wins: number;
  weaponId: WeaponId;
  rankTitle?: string;
}): LeaderboardEntry[] {
  const base: LeaderboardEntry[] = RIVAL_CHAMPIONS.map((c) => ({
    id: c.id,
    name: c.name,
    rating: c.rating,
    wins: c.wins,
    weaponId: c.avatar.weaponId,
    rankTitle: c.rankTitle,
    championId: c.id,
  }));
  if (playerEntry) {
    base.push({
      id: playerEntry.id,
      name: playerEntry.name,
      rating: playerEntry.rating,
      wins: playerEntry.wins,
      weaponId: playerEntry.weaponId,
      rankTitle: playerEntry.rankTitle,
      isLiveUser: true,
    });
  }
  return base.sort((a, b) => b.rating - a.rating);
}

function loadLocalWorldChat(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(LOCAL_CHAT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ChatMessage[]).slice(-40) : [];
  } catch {
    return [];
  }
}

function saveLocalWorldChat(messages: ChatMessage[]) {
  try {
    localStorage.setItem(LOCAL_CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-40)));
  } catch {
    // Ignore quota limits
  }
}

export function useMultiplayerSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const broadcastRef = useRef<BroadcastChannel | null>(null);
  const reconnectTimer = useRef<number | null>(null);
  const koTimerRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);
  const damageListenerRef = useRef<((ev: OnlineDamageEvent) => void) | null>(null);
  const vfxListenerRef = useRef<((ev: OnlineVfxEvent) => void) | null>(null);

  const [customServerUrl, setCustomServerUrlState] = useState<string>(() => {
    try {
      return localStorage.getItem(SERVER_URL_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });

  const [connected, setConnected] = useState(false);
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('connecting');
  const [playerId, setPlayerId] = useState<string>('local_hero');
  const [onlinePlayers, setOnlinePlayers] = useState(1);
  const [rooms, setRooms] = useState<OnlineRoomSummary[]>([]);
  const [activeRoom, setActiveRoom] = useState<OnlineRoomSummary | null>(null);
  const [roomFighters, setRoomFighters] = useState<OnlineFighterSnapshot[]>([]);
  const [roomError, setRoomError] = useState<string>('');
  const [koAnnouncement, setKoAnnouncement] = useState<string>('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => buildDefaultStaticLeaderboard());
  const [worldMessages, setWorldMessages] = useState<ChatMessage[]>(loadLocalWorldChat);
  const [roomMessages, setRoomMessages] = useState<ChatMessage[]>([]);

  const resolveHttpBase = useCallback(
    (overrideUrl?: string): string => {
      if (typeof window === 'undefined') return '';
      const custom = normalizeServerBaseUrl(overrideUrl ?? customServerUrl);
      if (custom) {
        return custom.replace(/^ws/i, 'http');
      }
      const envUrl = normalizeServerBaseUrl(String(import.meta.env.VITE_MULTIPLAYER_URL || ''));
      if (envUrl) {
        return envUrl.replace(/^ws/i, 'http');
      }
      if (!isLikelyStaticHost(window.location.hostname)) {
        return window.location.origin;
      }
      return '';
    },
    [customServerUrl]
  );

  const fetchLeaderboard = useCallback(
    async (overrideUrl?: string) => {
      const base = resolveHttpBase(overrideUrl);
      if (!base) {
        setLeaderboard((prev) => (prev.length > 0 ? prev : buildDefaultStaticLeaderboard()));
        return;
      }
      try {
        const res = await fetch(`${base}/api/leaderboard`);
        if (res.ok) {
          const data = (await res.json()) as { leaderboard: LeaderboardEntry[] };
          if (Array.isArray(data.leaderboard) && data.leaderboard.length > 0) {
            setLeaderboard(data.leaderboard);
            return;
          }
        }
      } catch {
        // Fallback smoothly to static/local leaderboard
      }
      setLeaderboard((prev) => (prev.length > 0 ? prev : buildDefaultStaticLeaderboard()));
    },
    [resolveHttpBase]
  );

  const reportLeaderboard = useCallback(
    async (payload: { id: string; name: string; rating: number; wins: number; weaponId: WeaponId; rankTitle?: string }) => {
      const base = resolveHttpBase();
      if (base && connectionMode === 'live_server') {
        try {
          const res = await fetch(`${base}/api/leaderboard/report`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (res.ok) {
            const data = (await res.json()) as { leaderboard: LeaderboardEntry[] };
            setLeaderboard(data.leaderboard || []);
            return;
          }
        } catch {
          // Fallback to local leaderboard merge
        }
      }
      setLeaderboard(buildDefaultStaticLeaderboard(payload));
    },
    [resolveHttpBase, connectionMode]
  );

  const connect = useCallback(
    (overrideUrl?: string) => {
      if (typeof window === 'undefined') return;
      if (reconnectTimer.current) {
        window.clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
        wsRef.current = null;
      }

      const httpBase = resolveHttpBase(overrideUrl);
      if (!httpBase) {
        setConnected(false);
        setConnectionMode('static_local');
        setRooms([]);
        setOnlinePlayers(1);
        setLeaderboard((prev) => (prev.length > 0 ? prev : buildDefaultStaticLeaderboard()));
        return;
      }

      const wsUrl = `${httpBase.replace(/^http/i, 'ws')}/ws/arena`;
      setConnectionMode('connecting');

      let ws: WebSocket;
      try {
        ws = new WebSocket(wsUrl);
      } catch {
        setConnected(false);
        setConnectionMode('static_local');
        return;
      }
      wsRef.current = ws;

      ws.onopen = () => {
        retryCountRef.current = 0;
        setConnected(true);
        setConnectionMode('live_server');
        setRoomError('');
      };

      ws.onmessage = (event) => {
        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(String(event.data));
        } catch {
          return;
        }

        const type = String(msg.type || '');
        if (type === 'connected') {
          setPlayerId(String(msg.playerId || ''));
          setRooms((msg.rooms as OnlineRoomSummary[]) || []);
          setOnlinePlayers(Number(msg.onlinePlayers) || 1);
          if (Array.isArray(msg.worldHistory)) {
            setWorldMessages(msg.worldHistory as ChatMessage[]);
          }
        } else if (type === 'rooms:list') {
          setRooms((msg.rooms as OnlineRoomSummary[]) || []);
          setOnlinePlayers(Number(msg.onlinePlayers) || 1);
        } else if (type === 'room:joined') {
          setRoomError('');
          setActiveRoom(msg.room as OnlineRoomSummary);
          setRoomFighters((msg.fighters as OnlineFighterSnapshot[]) || []);
          if (Array.isArray(msg.roomHistory)) {
            setRoomMessages(msg.roomHistory as ChatMessage[]);
          }
        } else if (type === 'room:state') {
          setActiveRoom(msg.room as OnlineRoomSummary);
          setRoomFighters((msg.fighters as OnlineFighterSnapshot[]) || []);
        } else if (type === 'player:delta') {
          const updated = msg.fighter as OnlineFighterSnapshot;
          if (!updated) return;
          setRoomFighters((prev) => {
            const exists = prev.some((f) => f.id === updated.id);
            if (!exists) return [...prev, updated];
            return prev.map((f) => (f.id === updated.id ? updated : f));
          });
        } else if (type === 'player:left') {
          const leftId = String(msg.playerId || '');
          setRoomFighters((prev) => prev.filter((f) => f.id !== leftId));
        } else if (type === 'player:damaged') {
          damageListenerRef.current?.({
            attackerId: String(msg.attackerId || ''),
            targetId: String(msg.targetId || ''),
            damage: Number(msg.damage) || 0,
            critical: Boolean(msg.critical),
            hp: Number(msg.hp) || 0,
            knockX: Number(msg.knockX) || 0,
            knockZ: Number(msg.knockZ) || 0,
          });
        } else if (type === 'player:vfx') {
          vfxListenerRef.current?.({
            playerId: String(msg.playerId || ''),
            kind: String(msg.kind || 'slash'),
            x: Number(msg.x) || 0,
            z: Number(msg.z) || 0,
            color: String(msg.color || '#F59E0B'),
            radius: Number(msg.radius) || 4,
          });
        } else if (type === 'player:ko') {
          const killerName = String(msg.killerName || '');
          const victimName = String(msg.victimName || '');
          setKoAnnouncement(`${killerName} أطاح بـ ${victimName}!`);
          if (koTimerRef.current) {
            window.clearTimeout(koTimerRef.current);
          }
          koTimerRef.current = window.setTimeout(() => {
            setKoAnnouncement('');
            koTimerRef.current = null;
          }, 2800);
        } else if (type === 'chat:message') {
          const chatMsg = msg.message as ChatMessage | undefined;
          if (!chatMsg || !chatMsg.id) return;
          if (chatMsg.channel === 'room') {
            setRoomMessages((prev) => {
              if (prev.some((m) => m.id === chatMsg.id)) return prev;
              const next = [...prev, chatMsg];
              return next.length > 60 ? next.slice(-60) : next;
            });
          } else {
            setWorldMessages((prev) => {
              if (prev.some((m) => m.id === chatMsg.id)) return prev;
              const next = [...prev, chatMsg];
              return next.length > 60 ? next.slice(-60) : next;
            });
          }
        } else if (type === 'room:left') {
          setActiveRoom(null);
          setRoomFighters([]);
          setRoomMessages([]);
        } else if (type === 'room:error') {
          setRoomError(String(msg.message || 'تعذر الانضمام إلى الغرفة'));
        }
      };

      ws.onclose = () => {
        setConnected(false);
        const hasExplicitServer = Boolean((overrideUrl ?? customServerUrl).trim() || import.meta.env.VITE_MULTIPLAYER_URL);
        const maxRetries = hasExplicitServer ? 2 : 1;
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current += 1;
          reconnectTimer.current = window.setTimeout(() => connect(overrideUrl), 2400);
        } else {
          // Stop infinite WS retry spam cleanly and switch into Local Broadcast Mode
          setConnectionMode('static_local');
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    },
    [resolveHttpBase, customServerUrl]
  );

  // Local BroadcastChannel listener for static deployments & cross-tab sync
  useEffect(() => {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;
    const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    broadcastRef.current = bc;
    bc.onmessage = (ev) => {
      const data = ev.data as { type?: string; message?: ChatMessage } | undefined;
      if (!data || data.type !== 'chat:message' || !data.message?.id) return;
      const chatMsg = data.message;
      if (chatMsg.channel === 'room') {
        setRoomMessages((prev) => (prev.some((m) => m.id === chatMsg.id) ? prev : [...prev, chatMsg].slice(-60)));
      } else {
        setWorldMessages((prev) => {
          if (prev.some((m) => m.id === chatMsg.id)) return prev;
          const next = [...prev, chatMsg].slice(-60);
          saveLocalWorldChat(next);
          return next;
        });
      }
    };
    return () => {
      bc.close();
      broadcastRef.current = null;
    };
  }, []);

  useEffect(() => {
    connect();
    fetchLeaderboard();
    return () => {
      if (reconnectTimer.current) window.clearTimeout(reconnectTimer.current);
      if (koTimerRef.current) window.clearTimeout(koTimerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [connect, fetchLeaderboard]);

  const setCustomServerUrl = useCallback(
    (rawUrl: string) => {
      const trimmed = rawUrl.trim();
      setCustomServerUrlState(trimmed);
      try {
        if (trimmed) {
          localStorage.setItem(SERVER_URL_STORAGE_KEY, trimmed);
        } else {
          localStorage.removeItem(SERVER_URL_STORAGE_KEY);
        }
      } catch {
        // Ignore storage error
      }
      retryCountRef.current = 0;
      connect(trimmed);
      fetchLeaderboard(trimmed);
    },
    [connect, fetchLeaderboard]
  );

  const send = useCallback((payload: unknown) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  const refreshRooms = useCallback(() => {
    send({ type: 'rooms:list' });
  }, [send]);

  const createRoom = useCallback(
    (params: { roomName: string; arenaId: ArenaId; avatar: AvatarConfig; maxHp: number; weaponLevel: number }) => {
      setRoomError('');
      if (!connected) {
        setRoomError('الغرف الأونلاين تحتاج خادم WebSocket نشطاً. يمكنك ضبط رابط الخادم أدناه أو خوض النزالات المصنفة محلياً.');
        return;
      }
      send({ type: 'room:create', ...params });
    },
    [connected, send]
  );

  const joinRoom = useCallback(
    (params: { codeOrId: string; avatar: AvatarConfig; maxHp: number; weaponLevel: number }) => {
      setRoomError('');
      if (!connected) {
        setRoomError('الغرف الأونلاين تحتاج خادم WebSocket نشطاً.');
        return;
      }
      send({ type: 'room:join', ...params });
    },
    [connected, send]
  );

  const leaveRoom = useCallback(() => {
    send({ type: 'room:leave' });
    setActiveRoom(null);
    setRoomFighters([]);
    setRoomMessages([]);
  }, [send]);

  const sendChatMessage = useCallback(
    (
      channel: 'world' | 'room',
      text: string,
      senderName: string,
      senderRank: string,
      isQuick = false
    ) => {
      const clean = text.trim().slice(0, 180);
      if (!clean) return;

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        send({
          type: 'chat:send',
          channel,
          text: clean,
          senderName,
          senderRank,
          isQuick,
        });
        return;
      }

      // Local / Static-host BroadcastChannel mode
      const localMsg: ChatMessage = {
        id: `lmsg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        channel,
        senderId: playerId || 'local_hero',
        senderName,
        senderRank,
        text: clean,
        timestamp: Date.now(),
        isQuick,
      };
      if (channel === 'room') {
        setRoomMessages((prev) => [...prev, localMsg].slice(-60));
      } else {
        setWorldMessages((prev) => {
          const next = [...prev, localMsg].slice(-60);
          saveLocalWorldChat(next);
          return next;
        });
      }
      try {
        broadcastRef.current?.postMessage({ type: 'chat:message', message: localMsg });
      } catch {
        // Ignore broadcast error
      }
    },
    [playerId, send]
  );

  const sendPlayerState = useCallback(
    (state: Record<string, unknown>) => {
      send({ type: 'player:state', ...state });
    },
    [send]
  );

  const sendPlayerHit = useCallback(
    (payload: { targetId: string; damage: number; critical: boolean; knockX: number; knockZ: number }) => {
      send({ type: 'player:hit', ...payload });
    },
    [send]
  );

  const sendPlayerVfx = useCallback(
    (payload: { kind: string; x: number; z: number; color: string; radius: number }) => {
      send({ type: 'player:vfx', ...payload });
    },
    [send]
  );

  const setCombatListeners = useCallback(
    (
      onDamage: ((ev: OnlineDamageEvent) => void) | null,
      onVfx: ((ev: OnlineVfxEvent) => void) | null
    ) => {
      damageListenerRef.current = onDamage;
      vfxListenerRef.current = onVfx;
    },
    []
  );

  return {
    connected,
    connectionMode,
    customServerUrl,
    setCustomServerUrl,
    playerId,
    onlinePlayers,
    rooms,
    activeRoom,
    roomFighters,
    roomError,
    koAnnouncement,
    leaderboard,
    worldMessages,
    roomMessages,
    refreshRooms,
    createRoom,
    joinRoom,
    leaveRoom,
    sendChatMessage,
    sendPlayerState,
    sendPlayerHit,
    sendPlayerVfx,
    setCombatListeners,
    fetchLeaderboard,
    reportLeaderboard,
  };
}
