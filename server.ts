import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import type {
  ArenaId,
  AvatarConfig,
  ChatMessage,
  LeaderboardEntry,
  OnlineFighterSnapshot,
  OnlineRoomSummary,
  WeaponId,
} from './src/types/game';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawPort = Number(process.env.PORT);
const PORT =
  Number.isFinite(rawPort) && rawPort >= 1 && rawPort <= 65535 ? Math.floor(rawPort) : 3000;
const IS_PRODUCTION =
  process.env.NODE_ENV === 'production' || process.argv.includes('--prod');

const VALID_ARENAS = new Set<ArenaId>([
  'obsidian_citadel',
  'magma_caldera',
  'glacier_spire',
  'sunstone_dunes',
  'celestial_sanctuary',
  'abyssal_colosseum',
]);

const VALID_WEAPONS = new Set<WeaponId>([
  'vanguard_sword',
  'shadow_daggers',
  'storm_hammer',
  'dragon_spear',
  'solar_bow',
  'void_staff',
  'arcane_tome',
  'crimson_wand',
  'radiant_scepter',
  'astral_censer',
  'bastion_mace',
  'aegis_greatshield',
]);

const VALID_ANIM_STATES = new Set<OnlineFighterSnapshot['animState']>([
  'idle',
  'run',
  'attack',
  'heavy',
  'power',
  'dodge',
  'block',
  'hurt',
  'dead',
]);

const VALID_VFX_KINDS = new Set([
  'slash',
  'heavy',
  'power',
  'explosion',
  'frost',
  'thunder',
  'holy',
  'void',
  'fusion',
]);

function finiteOr(value: unknown, fallback: number): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function sanitizeText(raw: unknown, fallback: string, maxLen: number): string {
  const cleaned = String(raw ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLen);
  return cleaned || fallback;
}

function sanitizeColor(raw: unknown, fallback: string): string {
  const str = String(raw ?? '').trim();
  return /^#[0-9A-Fa-f]{3,8}$/.test(str) ? str : fallback;
}

function sanitizeArenaId(raw: unknown): ArenaId {
  return typeof raw === 'string' && VALID_ARENAS.has(raw as ArenaId)
    ? (raw as ArenaId)
    : 'obsidian_citadel';
}

function sanitizeWeaponId(raw: unknown): WeaponId {
  return typeof raw === 'string' && VALID_WEAPONS.has(raw as WeaponId)
    ? (raw as WeaponId)
    : 'vanguard_sword';
}

function sanitizeAvatar(raw: unknown, fallback: AvatarConfig): AvatarConfig {
  if (!raw || typeof raw !== 'object') return fallback;
  const src = raw as Partial<AvatarConfig>;
  const name = sanitizeText(src.name, fallback.name, 22);
  const title = sanitizeText(src.title, fallback.title, 28);
  const weaponId = sanitizeWeaponId(src.weaponId);

  const safeStats = {
    str: clamp(Math.round(finiteOr(src.stats?.str, fallback.stats.str)), 1, 99),
    agi: clamp(Math.round(finiteOr(src.stats?.agi, fallback.stats.agi)), 1, 99),
    vit: clamp(Math.round(finiteOr(src.stats?.vit, fallback.stats.vit)), 1, 99),
    int: clamp(Math.round(finiteOr(src.stats?.int, fallback.stats.int)), 1, 99),
    def: clamp(Math.round(finiteOr(src.stats?.def, fallback.stats.def)), 1, 99),
    dex: clamp(Math.round(finiteOr(src.stats?.dex, fallback.stats.dex)), 1, 99),
    spr: clamp(Math.round(finiteOr(src.stats?.spr, fallback.stats.spr)), 1, 99),
    lck: clamp(Math.round(finiteOr(src.stats?.lck, fallback.stats.lck)), 1, 99),
  };

  return {
    ...fallback,
    name,
    title,
    build:
      src.build === 'agile' || src.build === 'balanced' || src.build === 'heavy'
        ? src.build
        : fallback.build,
    heightScale: clamp(finiteOr(src.heightScale, fallback.heightScale), 0.85, 1.2),
    shoulderScale: clamp(finiteOr(src.shoulderScale, fallback.shoulderScale), 0.85, 1.25),
    skinTone: sanitizeColor(src.skinTone, fallback.skinTone),
    headStyle: typeof src.headStyle === 'string' ? (src.headStyle as AvatarConfig['headStyle']) : fallback.headStyle,
    helmetColor: sanitizeColor(src.helmetColor, fallback.helmetColor),
    eyeGlow: sanitizeColor(src.eyeGlow, fallback.eyeGlow),
    armorStyle: typeof src.armorStyle === 'string' ? (src.armorStyle as AvatarConfig['armorStyle']) : fallback.armorStyle,
    primaryColor: sanitizeColor(src.primaryColor, fallback.primaryColor),
    secondaryColor: sanitizeColor(src.secondaryColor, fallback.secondaryColor),
    accentColor: sanitizeColor(src.accentColor, fallback.accentColor),
    backGear: typeof src.backGear === 'string' ? (src.backGear as AvatarConfig['backGear']) : fallback.backGear,
    auraStyle: typeof src.auraStyle === 'string' ? (src.auraStyle as AvatarConfig['auraStyle']) : fallback.auraStyle,
    weaponId,
    powerId: typeof src.powerId === 'string' ? (src.powerId as AvatarConfig['powerId']) : fallback.powerId,
    secondaryPowerId:
      typeof src.secondaryPowerId === 'string'
        ? (src.secondaryPowerId as AvatarConfig['secondaryPowerId'])
        : fallback.secondaryPowerId,
    powerSlots:
      Array.isArray(src.powerSlots) && src.powerSlots.length === 4
        ? (src.powerSlots.map((p, idx) =>
            typeof p === 'string' ? p : fallback.powerSlots[idx]
          ) as AvatarConfig['powerSlots'])
        : fallback.powerSlots,
    stats: safeStats,
  };
}

interface ServerPlayer {
  id: string;
  ws: WebSocket;
  isAlive: boolean;
  roomId: string | null;
  snapshot: OnlineFighterSnapshot;
  lastHitSentAt: number;
  lastChatSentAt: number;
  respawnTimer: ReturnType<typeof setTimeout> | null;
}

interface ServerRoom {
  id: string;
  code: string;
  name: string;
  arenaId: ArenaId;
  hostName: string;
  maxPlayers: number;
  players: Map<string, ServerPlayer>;
  messages: ChatMessage[];
  createdAt: number;
}

const rooms = new Map<string, ServerRoom>();
const players = new Map<string, ServerPlayer>();
const worldChatHistory: ChatMessage[] = [];

function pushWorldChat(msg: ChatMessage) {
  worldChatHistory.push(msg);
  if (worldChatHistory.length > 50) {
    worldChatHistory.shift();
  }
}

function broadcastAll(payload: unknown) {
  for (const p of players.values()) {
    sendJson(p.ws, payload);
  }
}

const leaderboard: LeaderboardEntry[] = [
  {
    id: 'champ_omar',
    name: 'عمر الأسطوري',
    rankTitle: 'الأسطوري',
    rating: 1920,
    wins: 94,
    weaponId: 'dragon_spear',
    championId: 'champ_omar',
  },
  {
    id: 'champ_sara',
    name: 'سارة الشمس',
    rankTitle: 'البلاتيني',
    rating: 1680,
    wins: 68,
    weaponId: 'solar_bow',
    championId: 'champ_sara',
  },
  {
    id: 'champ_khalid',
    name: 'خالد الصاعقة',
    rankTitle: 'الذهبي',
    rating: 1460,
    wins: 47,
    weaponId: 'storm_hammer',
    championId: 'champ_khalid',
  },
  {
    id: 'champ_layla',
    name: 'ليلى الظل',
    rankTitle: 'الفضي',
    rating: 1240,
    wins: 29,
    weaponId: 'shadow_daggers',
    championId: 'champ_layla',
  },
  {
    id: 'champ_zaid',
    name: 'زيد العاصف',
    rankTitle: 'البرونزي',
    rating: 1050,
    wins: 14,
    weaponId: 'vanguard_sword',
    championId: 'champ_zaid',
  },
];

function getRankTitle(rating: number): string {
  if (rating >= 1850) return 'الأسطوري';
  if (rating >= 1600) return 'البلاتيني';
  if (rating >= 1350) return 'الذهبي';
  if (rating >= 1120) return 'الفضي';
  return 'البرونزي';
}

function generateRoomCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const a = letters[Math.floor(Math.random() * letters.length)];
    const b = letters[Math.floor(Math.random() * letters.length)];
    const num = Math.floor(10 + Math.random() * 89);
    const candidate = `${a}${b}-${num}`;
    const exists = Array.from(rooms.values()).some((r) => r.code === candidate);
    if (!exists) return candidate;
  }
  return `AR-${Math.floor(100 + Math.random() * 899)}`;
}

function getRoomSummaries(): OnlineRoomSummary[] {
  return Array.from(rooms.values())
    .filter((r) => r.players.size > 0)
    .map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      arenaId: r.arenaId,
      playerCount: r.players.size,
      maxPlayers: r.maxPlayers,
      hostName: r.hostName,
      status: r.players.size >= 2 ? 'fighting' : 'open',
    }));
}

function sendJson(ws: WebSocket, payload: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastRoom(room: ServerRoom, payload: unknown, excludeId?: string) {
  for (const [pid, p] of room.players.entries()) {
    if (excludeId && pid === excludeId) continue;
    sendJson(p.ws, payload);
  }
}

function broadcastRoomState(room: ServerRoom) {
  const fighters = Array.from(room.players.values()).map((p) => p.snapshot);
  broadcastRoom(room, {
    type: 'room:state',
    room: {
      id: room.id,
      code: room.code,
      name: room.name,
      arenaId: room.arenaId,
      playerCount: room.players.size,
      maxPlayers: room.maxPlayers,
      hostName: room.hostName,
      status: room.players.size >= 2 ? 'fighting' : 'open',
    },
    fighters,
  });
}

function leaveCurrentRoom(player: ServerPlayer) {
  if (player.respawnTimer) {
    clearTimeout(player.respawnTimer);
    player.respawnTimer = null;
  }
  if (!player.roomId) return;
  const room = rooms.get(player.roomId);
  player.roomId = null;
  if (!room) return;
  room.players.delete(player.id);
  if (room.players.size === 0) {
    rooms.delete(room.id);
  } else {
    broadcastRoom(room, { type: 'player:left', playerId: player.id });
    broadcastRoomState(room);
  }
}

function spawnPositionForIndex(idx: number): { x: number; z: number; yaw: number } {
  const angle = (idx * Math.PI * 2) / 4 + Math.PI / 4;
  return {
    x: Math.cos(angle) * 6.5,
    z: Math.sin(angle) * 6.5,
    yaw: Math.atan2(-Math.cos(angle), -Math.sin(angle)),
  };
}

function upsertLeaderboard(entry: {
  id: string;
  name: string;
  rating: number;
  wins: number;
  weaponId: WeaponId;
  rankTitle?: string;
}) {
  const cleanName = sanitizeText(entry.name, 'مقاتل', 24);
  const safeRating = clamp(Math.round(entry.rating), 800, 4000);
  const safeWins = clamp(Math.round(entry.wins), 0, 100000);
  const safeWeapon = sanitizeWeaponId(entry.weaponId);
  const computedTitle = sanitizeText(entry.rankTitle, getRankTitle(safeRating), 22);

  const existing = leaderboard.find((l) => l.id === entry.id);
  if (existing) {
    existing.name = cleanName;
    existing.rating = safeRating;
    existing.wins = safeWins;
    existing.weaponId = safeWeapon;
    existing.rankTitle = getRankTitle(safeRating);
  } else {
    leaderboard.push({
      id: entry.id,
      name: cleanName,
      rankTitle: computedTitle || getRankTitle(safeRating),
      rating: safeRating,
      wins: safeWins,
      weaponId: safeWeapon,
      isLiveUser: true,
    });
  }
  leaderboard.sort((a, b) => b.rating - a.rating);
  if (leaderboard.length > 30) {
    leaderboard.length = 30;
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '32kb' }));

  // Allow cross-origin static builds (e.g. GitHub Pages) to connect to this public arena API
  app.use('/api', (_req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (_req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      onlinePlayers: players.size,
      activeRooms: getRoomSummaries().length,
      uptimeSec: Math.round(process.uptime()),
      mode: IS_PRODUCTION ? 'production' : 'development',
    });
  });

  app.get('/api/rooms', (_req, res) => {
    res.json({ rooms: getRoomSummaries(), onlinePlayers: players.size });
  });

  app.get('/api/leaderboard', (_req, res) => {
    res.json({ leaderboard });
  });

  app.post('/api/leaderboard/report', (req, res) => {
    const body = req.body as {
      id?: unknown;
      name?: unknown;
      rating?: unknown;
      wins?: unknown;
      weaponId?: unknown;
      rankTitle?: unknown;
    };
    const cleanId = sanitizeText(body?.id, '', 40);
    const cleanName = sanitizeText(body?.name, '', 24);
    const ratingNum = typeof body?.rating === 'number' ? body.rating : Number.NaN;
    if (!body || !cleanId || !cleanName || !Number.isFinite(ratingNum)) {
      res.status(400).json({ error: 'بيانات غير مكتملة أو غير صالحة' });
      return;
    }
    const winsNum =
      typeof body.wins === 'number' && Number.isFinite(body.wins) ? body.wins : 0;
    upsertLeaderboard({
      id: cleanId,
      name: cleanName,
      rating: ratingNum,
      wins: winsNum,
      weaponId: sanitizeWeaponId(body.weaponId),
      rankTitle: typeof body.rankTitle === 'string' ? body.rankTitle : undefined,
    });
    res.json({ leaderboard });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({
    server,
    path: '/ws/arena',
    maxPayload: 64 * 1024,
  });

  const heartbeatInterval = setInterval(() => {
    for (const player of players.values()) {
      if (!player.isAlive) {
        player.ws.terminate();
        continue;
      }
      player.isAlive = false;
      player.ws.ping();
    }
  }, 30000);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  wss.on('connection', (ws) => {
    const playerId = `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const defaultSnap: OnlineFighterSnapshot = {
      id: playerId,
      name: 'مقاتل',
      avatar: {
        name: 'مقاتل',
        title: 'مبارز',
        build: 'balanced',
        heightScale: 1,
        shoulderScale: 1,
        skinTone: '#D6A57C',
        headStyle: 'knight_helm',
        helmetColor: '#2B3442',
        eyeGlow: '#F59E0B',
        armorStyle: 'plate',
        primaryColor: '#2B3442',
        secondaryColor: '#C9841A',
        accentColor: '#F59E0B',
        backGear: 'battle_cape',
        auraStyle: 'none',
        weaponId: 'vanguard_sword',
        powerId: 'inferno_nova',
        secondaryPowerId: 'holy_sanctuary',
        powerSlots: ['inferno_nova', 'holy_sanctuary', 'thunder_strike', 'shadow_blink'],
        stats: { str: 6, agi: 5, vit: 6, int: 5, def: 5, dex: 5, spr: 5, lck: 4 },
      },
      weaponLevel: 1,
      x: 0,
      y: 0,
      z: 0,
      yaw: 0,
      hp: 200,
      maxHp: 200,
      energy: 100,
      animState: 'idle',
      animTimer: 0,
      comboStep: 0,
      shieldActive: false,
      overdriveActive: false,
      kills: 0,
    };

    const serverPlayer: ServerPlayer = {
      id: playerId,
      ws,
      isAlive: true,
      roomId: null,
      snapshot: defaultSnap,
      lastHitSentAt: 0,
      lastChatSentAt: 0,
      respawnTimer: null,
    };

    players.set(playerId, serverPlayer);

    ws.on('pong', () => {
      serverPlayer.isAlive = true;
    });

    sendJson(ws, {
      type: 'connected',
      playerId,
      rooms: getRoomSummaries(),
      onlinePlayers: players.size,
      worldHistory: worldChatHistory,
    });

    ws.on('message', (raw) => {
      let msg: Record<string, unknown>;
      try {
        const parsed = JSON.parse(String(raw));
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;
        msg = parsed as Record<string, unknown>;
      } catch {
        return;
      }

      const type = String(msg.type || '');

      if (type === 'rooms:list') {
        sendJson(ws, { type: 'rooms:list', rooms: getRoomSummaries(), onlinePlayers: players.size });
        return;
      }

      if (type === 'room:create') {
        leaveCurrentRoom(serverPlayer);
        const arenaId = sanitizeArenaId(msg.arenaId);
        const avatar = sanitizeAvatar(msg.avatar, serverPlayer.snapshot.avatar);
        const maxHp = clamp(Math.round(finiteOr(msg.maxHp, 220)), 120, 600);
        const weaponLevel = clamp(Math.round(finiteOr(msg.weaponLevel, 1)), 1, 5);
        const roomName = sanitizeText(msg.roomName, `ساحة ${avatar.name}`, 32);

        const roomId = `room_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
        const code = generateRoomCode();
        const spawn = spawnPositionForIndex(0);

        serverPlayer.snapshot = {
          ...serverPlayer.snapshot,
          name: avatar.name,
          avatar,
          weaponLevel,
          x: spawn.x,
          y: 0,
          z: spawn.z,
          yaw: spawn.yaw,
          hp: maxHp,
          maxHp,
          energy: 100,
          animState: 'idle',
          kills: 0,
        };

        const room: ServerRoom = {
          id: roomId,
          code,
          name: roomName,
          arenaId,
          hostName: avatar.name,
          maxPlayers: 4,
          players: new Map([[playerId, serverPlayer]]),
          messages: [
            {
              id: `sys_${Date.now().toString(36)}`,
              channel: 'room',
              roomCode: code,
              senderId: 'system',
              senderName: 'النظام',
              senderRank: 'مشرف',
              text: `تم فتح غرفة ${roomName} (رمز الانضمام: ${code})`,
              isSystem: true,
              timestamp: Date.now(),
            },
          ],
          createdAt: Date.now(),
        };

        rooms.set(roomId, room);
        serverPlayer.roomId = roomId;

        sendJson(ws, {
          type: 'room:joined',
          playerId,
          room: {
            id: room.id,
            code: room.code,
            name: room.name,
            arenaId: room.arenaId,
            playerCount: room.players.size,
            maxPlayers: room.maxPlayers,
            hostName: room.hostName,
            status: 'open',
          },
          fighters: [serverPlayer.snapshot],
          roomHistory: room.messages,
        });
        return;
      }

      if (type === 'room:join') {
        const codeOrId = sanitizeText(msg.codeOrId, '', 32).toUpperCase();
        if (!codeOrId) {
          sendJson(ws, { type: 'room:error', message: 'يرجى إدخال رمز الغرفة.' });
          return;
        }
        const targetRoom = Array.from(rooms.values()).find(
          (r) => r.code.toUpperCase() === codeOrId || r.id.toUpperCase() === codeOrId
        );
        if (!targetRoom) {
          sendJson(ws, { type: 'room:error', message: 'لم يتم العثور على الغرفة. تحقق من الرمز.' });
          return;
        }
        if (targetRoom.players.size >= targetRoom.maxPlayers) {
          sendJson(ws, { type: 'room:error', message: 'الغرفة ممتلئة حالياً.' });
          return;
        }

        leaveCurrentRoom(serverPlayer);
        const avatar = sanitizeAvatar(msg.avatar, serverPlayer.snapshot.avatar);
        const maxHp = clamp(Math.round(finiteOr(msg.maxHp, 220)), 120, 600);
        const weaponLevel = clamp(Math.round(finiteOr(msg.weaponLevel, 1)), 1, 5);
        const spawn = spawnPositionForIndex(targetRoom.players.size);

        serverPlayer.snapshot = {
          ...serverPlayer.snapshot,
          name: avatar.name,
          avatar,
          weaponLevel,
          x: spawn.x,
          y: 0,
          z: spawn.z,
          yaw: spawn.yaw,
          hp: maxHp,
          maxHp,
          energy: 100,
          animState: 'idle',
          kills: 0,
        };

        targetRoom.players.set(playerId, serverPlayer);
        serverPlayer.roomId = targetRoom.id;

        const fighters = Array.from(targetRoom.players.values()).map((p) => p.snapshot);
        const joinChat: ChatMessage = {
          id: `sys_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
          channel: 'room',
          roomCode: targetRoom.code,
          senderId: 'system',
          senderName: 'النظام',
          senderRank: 'مشرف',
          text: `انضم ${serverPlayer.snapshot.name} إلى ساحة الغرفة.`,
          isSystem: true,
          timestamp: Date.now(),
        };
        targetRoom.messages.push(joinChat);
        if (targetRoom.messages.length > 50) targetRoom.messages.shift();

        sendJson(ws, {
          type: 'room:joined',
          playerId,
          room: {
            id: targetRoom.id,
            code: targetRoom.code,
            name: targetRoom.name,
            arenaId: targetRoom.arenaId,
            playerCount: targetRoom.players.size,
            maxPlayers: targetRoom.maxPlayers,
            hostName: targetRoom.hostName,
            status: targetRoom.players.size >= 2 ? 'fighting' : 'open',
          },
          fighters,
          roomHistory: targetRoom.messages,
        });
        broadcastRoomState(targetRoom);
        broadcastRoom(targetRoom, { type: 'chat:message', message: joinChat }, playerId);
        return;
      }

      if (type === 'room:leave') {
        leaveCurrentRoom(serverPlayer);
        sendJson(ws, { type: 'room:left' });
        return;
      }

      if (type === 'player:state') {
        if (!serverPlayer.roomId) return;
        const room = rooms.get(serverPlayer.roomId);
        if (!room) return;
        if (serverPlayer.snapshot.hp <= 0) return;

        serverPlayer.snapshot.x = clamp(finiteOr(msg.x, serverPlayer.snapshot.x), -65, 65);
        serverPlayer.snapshot.y = clamp(finiteOr(msg.y, serverPlayer.snapshot.y), 0, 10);
        serverPlayer.snapshot.z = clamp(finiteOr(msg.z, serverPlayer.snapshot.z), -65, 65);
        serverPlayer.snapshot.yaw = clamp(finiteOr(msg.yaw, serverPlayer.snapshot.yaw), -Math.PI * 4, Math.PI * 4);

        const nextAnim = String(msg.animState || 'idle') as OnlineFighterSnapshot['animState'];
        serverPlayer.snapshot.animState = VALID_ANIM_STATES.has(nextAnim) ? nextAnim : 'idle';
        serverPlayer.snapshot.animTimer = clamp(finiteOr(msg.animTimer, 0), 0, 5);
        serverPlayer.snapshot.comboStep = clamp(Math.floor(finiteOr(msg.comboStep, 0)), 0, 6);
        serverPlayer.snapshot.shieldActive = Boolean(msg.shieldActive);
        serverPlayer.snapshot.overdriveActive = Boolean(msg.overdriveActive);
        serverPlayer.snapshot.energy = clamp(finiteOr(msg.energy, serverPlayer.snapshot.energy), 0, 100);

        broadcastRoom(
          room,
          {
            type: 'player:delta',
            fighter: serverPlayer.snapshot,
          },
          playerId
        );
        return;
      }

      if (type === 'player:hit') {
        if (!serverPlayer.roomId) return;
        const room = rooms.get(serverPlayer.roomId);
        if (!room) return;
        const now = Date.now();
        if (now - serverPlayer.lastHitSentAt < 140) return;
        serverPlayer.lastHitSentAt = now;

        const targetId = String(msg.targetId || '');
        const target = room.players.get(targetId);
        if (!target || target.id === playerId || target.snapshot.hp <= 0 || serverPlayer.snapshot.hp <= 0) {
          return;
        }

        const rawDamage = clamp(finiteOr(msg.damage, 20), 5, 115);
        const isCritical = Boolean(msg.critical);
        const knockX = clamp(finiteOr(msg.knockX, 0), -8, 8);
        const knockZ = clamp(finiteOr(msg.knockZ, 0), -8, 8);
        const finalDamage = target.snapshot.shieldActive ? Math.round(rawDamage * 0.35) : Math.round(rawDamage);

        target.snapshot.hp = Math.max(0, target.snapshot.hp - finalDamage);
        broadcastRoom(room, {
          type: 'player:damaged',
          attackerId: playerId,
          targetId,
          damage: finalDamage,
          critical: isCritical,
          hp: target.snapshot.hp,
          knockX,
          knockZ,
        });

        if (target.snapshot.hp <= 0) {
          serverPlayer.snapshot.kills += 1;
          broadcastRoom(room, {
            type: 'player:ko',
            killerId: playerId,
            killerName: serverPlayer.snapshot.name,
            victimId: targetId,
            victimName: target.snapshot.name,
            killerKills: serverPlayer.snapshot.kills,
          });

          if (target.respawnTimer) {
            clearTimeout(target.respawnTimer);
          }
          // Respawn defeated fighter after 2.6 seconds so online arena stays lively
          target.respawnTimer = setTimeout(() => {
            target.respawnTimer = null;
            const liveRoom = rooms.get(room.id);
            if (!liveRoom) return;
            const liveTarget = liveRoom.players.get(targetId);
            if (!liveTarget || liveTarget.roomId !== room.id) return;
            const spawn = spawnPositionForIndex(Math.floor(Math.random() * 4));
            liveTarget.snapshot.hp = liveTarget.snapshot.maxHp;
            liveTarget.snapshot.x = spawn.x;
            liveTarget.snapshot.z = spawn.z;
            liveTarget.snapshot.animState = 'idle';
            broadcastRoomState(liveRoom);
          }, 2600);
        }
        return;
      }

      if (type === 'player:vfx') {
        if (!serverPlayer.roomId) return;
        const room = rooms.get(serverPlayer.roomId);
        if (!room) return;
        const rawKind = String(msg.kind || 'slash');
        broadcastRoom(
          room,
          {
            type: 'player:vfx',
            playerId,
            kind: VALID_VFX_KINDS.has(rawKind) ? rawKind : 'slash',
            x: clamp(finiteOr(msg.x, 0), -65, 65),
            z: clamp(finiteOr(msg.z, 0), -65, 65),
            color: sanitizeColor(msg.color, '#F59E0B'),
            radius: clamp(finiteOr(msg.radius, 4), 1, 12),
          },
          playerId
        );
        return;
      }

      if (type === 'chat:send') {
        const now = Date.now();
        if (now - serverPlayer.lastChatSentAt < 450) return;
        const text = sanitizeText(msg.text, '', 180);
        if (!text) return;
        serverPlayer.lastChatSentAt = now;

        const requestedChannel = msg.channel === 'room' ? 'room' : 'world';
        const senderName = sanitizeText(msg.senderName, serverPlayer.snapshot.name, 24);
        const senderRank = sanitizeText(msg.senderRank, 'مغامر', 18);
        const isQuick = Boolean(msg.isQuick);

        if (requestedChannel === 'room' && serverPlayer.roomId) {
          const room = rooms.get(serverPlayer.roomId);
          if (!room) return;
          const chatMsg: ChatMessage = {
            id: `msg_${now.toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
            channel: 'room',
            roomCode: room.code,
            senderId: playerId,
            senderName,
            senderRank,
            text,
            isQuick,
            timestamp: now,
          };
          room.messages.push(chatMsg);
          if (room.messages.length > 50) room.messages.shift();
          broadcastRoom(room, { type: 'chat:message', message: chatMsg });
        } else {
          const chatMsg: ChatMessage = {
            id: `msg_${now.toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
            channel: 'world',
            senderId: playerId,
            senderName,
            senderRank,
            text,
            isQuick,
            timestamp: now,
          };
          pushWorldChat(chatMsg);
          broadcastAll({ type: 'chat:message', message: chatMsg });
        }
      }
    });

    ws.on('close', () => {
      leaveCurrentRoom(serverPlayer);
      players.delete(playerId);
    });
  });

  if (!IS_PRODUCTION) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    const indexPath = path.join(distPath, 'index.html');
    if (!fs.existsSync(indexPath)) {
      console.error('Production build not found at dist/index.html. Run "npm run build" first.');
      process.exit(1);
    }
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(indexPath);
    });
  }

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `Port ${PORT} is already in use. Close the other process or set PORT=3001 in .env before starting.`
      );
    } else {
      console.error('Server error:', err);
    }
    process.exit(1);
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Maydan Al-Abtal server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
