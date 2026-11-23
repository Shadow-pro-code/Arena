import React, { useEffect, useRef, useState } from 'react';
import {
  Briefcase,
  Camera,
  CheckCircle2,
  Coins,
  Compass,
  Cpu,
  Flame,
  Gem,
  Gift,
  Heart,
  Lock,
  LogOut,
  Map as MapIcon,
  Maximize2,
  MessageSquare,
  Minimize2,
  Monitor,
  Palette,
  Pause,
  Play,
  RotateCw,
  Shield,
  Smartphone,
  Sparkles,
  Swords,
  Target,
  Volume2,
  VolumeX,
  Wind,
  X,
  Zap,
} from 'lucide-react';
import type {
  ArenaId,
  AvatarConfig,
  CameraViewMode,
  ChatMessage,
  ConnectionMode,
  ConsumableId,
  DeviceMode,
  GameMode,
  GraphicsQuality,
  MatchResult,
  OnlineFighterSnapshot,
  OnlineRoomSummary,
  OverworldNodeKind,
  PlayerProfile,
  RivalChampion,
  SecretBossDef,
  SystemTheme,
  WorldChestDef,
  WorldEventZoneDef,
} from '../types/game';
import {
  ARENAS,
  NPC_JOB_LIST,
  OVERWORLD_MAP,
  POWERS,
  SECRET_WORLD_BOSSES,
  WEAPONS,
  WORLD_EVENT_ZONES,
} from '../data/gameCatalog';
import { SoftwareRenderer3D } from '../engine/renderer3d';
import { CombatSimulation, HudSnapshot } from '../engine/combatSimulation';
import type { OnlineDamageEvent, OnlineVfxEvent } from '../hooks/useMultiplayerSocket';
import { SystemChatPanel } from './SystemChatPanel';
import { CHUNK_SIZE } from '../engine/worldStreamer';

interface ArenaCombatViewProps {
  profile: PlayerProfile;
  mode: GameMode;
  arenaId: ArenaId;
  rivalChampion?: RivalChampion;
  localP2Avatar?: AvatarConfig;
  onlineRoom?: OnlineRoomSummary | null;
  onlineSelfId?: string;
  onlineFighters?: OnlineFighterSnapshot[];
  koAnnouncement?: string;
  systemTheme?: SystemTheme;
  onToggleSystemTheme?: () => void;
  chatConnected?: boolean;
  chatMode?: ConnectionMode;
  worldMessages?: ChatMessage[];
  roomMessages?: ChatMessage[];
  onSendChat?: (
    channel: 'world' | 'room',
    text: string,
    senderName: string,
    senderRank: string,
    isQuick?: boolean
  ) => void;
  onOnlineStateSend?: (state: Record<string, unknown>) => void;
  onOnlineHitSend?: (payload: {
    targetId: string;
    damage: number;
    critical: boolean;
    knockX: number;
    knockZ: number;
  }) => void;
  onOnlineVfxSend?: (payload: { kind: string; x: number; z: number; color: string; radius: number }) => void;
  onBindOnlineListeners?: (
    onDamage: ((ev: OnlineDamageEvent) => void) | null,
    onVfx: ((ev: OnlineVfxEvent) => void) | null
  ) => void;
  onChangeQuality: (q: GraphicsQuality) => void;
  onChangeCamera: (c: CameraViewMode) => void;
  onChangeDeviceMode: (d: DeviceMode) => void;
  onToggleLandscape?: (locked: boolean) => void;
  onConsumeItem?: (id: ConsumableId) => boolean;
  onDiscoverRegion?: (regionId: string, name: string, gold: number, xp: number) => void;
  onOpenWorldChest?: (chest: WorldChestDef) => void;
  onGatherNode?: (kind: OverworldNodeKind, label: string) => void;
  onExploreChunk?: (chunkKey: string) => void;
  onDefeatSecretBoss?: (boss: SecretBossDef) => void;
  onCompleteWorldEvent?: (zone: WorldEventZoneDef) => void;
  onCritLanded?: () => void;
  onFusionCast?: () => void;
  onAcceptNpcJob?: (jobId: string) => { ok: boolean; message: string };
  onCompleteNpcJob?: (jobId: string) => { ok: boolean; message: string };
  onSellSingleResource?: (kind: OverworldNodeKind) => { ok: boolean; message: string };
  onSellAllResources?: () => { ok: boolean; message: string };
  onExchangeGuildMarks?: (option: 'gold' | 'gems' | 'mythic_chest') => { ok: boolean; message: string };
  onWarpFromWorld?: (arenaId: ArenaId) => void;
  onToggleSound: () => void;
  onMatchComplete: (result: MatchResult) => void;
  onExit: () => void;
}

const CAMERA_CYCLE: CameraViewMode[] = [
  'third_person',
  'over_shoulder',
  'isometric_3d',
  'side_fighter',
  'top_tactical',
  'cinematic_free',
];

const CAMERA_LABELS: Record<CameraViewMode, string> = {
  third_person: 'منظور ثالث',
  over_shoulder: 'خلف الكتف',
  isometric_3d: 'إيزومتري 3D',
  side_fighter: 'جانبي قتالي',
  top_tactical: 'علوي تكتيكي',
  cinematic_free: 'سينمائي حر',
};

const QUALITY_CYCLE: GraphicsQuality[] = ['eco', 'balanced', 'high', 'ultra', 'mythic'];

const QUALITY_LABELS: Record<GraphicsQuality, string> = {
  eco: 'اقتصادي',
  balanced: 'متوازن',
  high: 'عالي',
  ultra: 'فائق',
  mythic: 'أسطوري',
};

const SKILL_KEYS = ['[Q]', '[R]', '[Z]', '[X]'] as const;
const SKILL_ACCENTS = ['#38BDF8', '#C084FC', '#10B981', '#F59E0B'] as const;

export const ArenaCombatView: React.FC<ArenaCombatViewProps> = ({
  profile,
  mode,
  arenaId,
  rivalChampion,
  localP2Avatar,
  onlineRoom,
  onlineSelfId,
  onlineFighters,
  koAnnouncement,
  systemTheme = 'royal_cyan',
  onToggleSystemTheme,
  chatConnected = false,
  chatMode,
  worldMessages = [],
  roomMessages = [],
  onSendChat,
  onOnlineStateSend,
  onOnlineHitSend,
  onOnlineVfxSend,
  onBindOnlineListeners,
  onChangeQuality,
  onChangeCamera,
  onChangeDeviceMode,
  onToggleLandscape,
  onConsumeItem,
  onDiscoverRegion,
  onOpenWorldChest,
  onGatherNode,
  onExploreChunk,
  onDefeatSecretBoss,
  onCompleteWorldEvent,
  onCritLanded,
  onFusionCast,
  onAcceptNpcJob,
  onCompleteNpcJob,
  onSellSingleResource,
  onSellAllResources,
  onExchangeGuildMarks,
  onWarpFromWorld,
  onToggleSound,
  onMatchComplete,
  onExit,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const simRef = useRef<CombatSimulation | null>(null);
  const rendererRef = useRef<SoftwareRenderer3D | null>(null);
  const dragCamRef = useRef<{
    active: boolean;
    lastAxis: number;
    moved: number;
    pointerType: string;
    button: number;
  }>({ active: false, lastAxis: 0, moved: 0, pointerType: 'mouse', button: 0 });

  const joystickRef = useRef<HTMLDivElement | null>(null);
  const [joyKnob, setJoyKnob] = useState<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });

  const [paused, setPaused] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [sessionNonce, setSessionNonce] = useState(0);
  const [showWorldMap, setShowWorldMap] = useState(false);
  const [worldMapScope, setWorldMapScope] = useState<'kingdom' | 'continent'>('kingdom');
  const [showChatDrawer, setShowChatDrawer] = useState(false);
  const [activeNpcId, setActiveNpcId] = useState<string | null>(null);
  const [npcNotice, setNpcNotice] = useState('');

  const showWorldMapRef = useRef(showWorldMap);
  showWorldMapRef.current = showWorldMap;
  const activeNpcIdRef = useRef(activeNpcId);
  activeNpcIdRef.current = activeNpcId;
  const showChatDrawerRef = useRef(showChatDrawer);
  showChatDrawerRef.current = showChatDrawer;

  const [landscapeMode, setLandscapeMode] = useState<boolean>(profile.landscapeLocked);
  const [viewportSize, setViewportSize] = useState<{ w: number; h: number }>(() => {
    if (typeof window === 'undefined') return { w: 1280, h: 720 };
    const vv = window.visualViewport;
    return {
      w: Math.round(vv?.width || window.innerWidth),
      h: Math.round(vv?.height || window.innerHeight),
    };
  });

  const isPortraitViewport = viewportSize.h > viewportSize.w;
  const useCssLandscapeRotation = landscapeMode && isPortraitViewport;
  const useCssLandscapeRef = useRef(useCssLandscapeRotation);
  useCssLandscapeRef.current = useCssLandscapeRotation;
  const isCompactLandscape =
    useCssLandscapeRotation || (viewportSize.h <= 520 && viewportSize.w >= viewportSize.h);
  const resizeCanvasFnRef = useRef<(() => void) | null>(null);
  const npcToastTimerRef = useRef<number | null>(null);

  const displayMap = mode === 'world_explore' ? OVERWORLD_MAP : ARENAS[arenaId];
  const weapon = WEAPONS[profile.avatar.weaponId];
  const slotPowers = profile.avatar.powerSlots.map((pid) => POWERS[pid] || POWERS.inferno_nova);

  const [hud, setHud] = useState<HudSnapshot>({
    hp: 200,
    maxHp: 200,
    energy: 100,
    maxEnergy: 100,
    wave: 1,
    kills: 0,
    combo: 0,
    comboTimer: 0,
    heavyCd: 0,
    heavyMaxCd: 4.2,
    powerCd: 0,
    powerMaxCd: slotPowers[0].cooldown,
    secondaryCd: 0,
    secondaryMaxCd: slotPowers[1].cooldown,
    slotCooldowns: [0, 0, 0, 0],
    slotMaxCooldowns: [
      slotPowers[0].cooldown,
      slotPowers[1].cooldown,
      slotPowers[2].cooldown,
      slotPowers[3].cooldown,
    ],
    dodgeCd: 0,
    sprintActive: false,
    playerX: 0,
    playerZ: 6,
    scoreP1: 0,
    scoreP2: 0,
    elapsedSec: 0,
    bannerText: '',
    fps: 60,
    onlineCount: 1,
    arenaRadius: displayMap.radius,
    playerYaw: 0,
    radarPoints: [],
    onHighGround: false,
    terrainNote: '',
    activeMission: null,
    missionsDone: 0,
    consumables: {
      elixir_heal: profile.consumables.elixir_heal || 0,
      scroll_energy: profile.consumables.scroll_energy || 0,
      tonic_fury: profile.consumables.tonic_fury || 0,
    },
    isOverworld: mode === 'world_explore',
    currentRegionName: mode === 'world_explore' ? 'قرية الملاذ الآمنة' : undefined,
    nearbyInteractable: null,
    npcDialogue: null,
    discoveredRegionsCount: profile.discoveredRegions.length,
    totalRegionsCount: OVERWORLD_MAP.regions?.length || 9,
    openedChestsCount: profile.openedWorldChests.length,
    totalChestsCount: OVERWORLD_MAP.worldChests?.length || 12,
    discoveredWaystonesCount: profile.discoveredRegions.length,
    totalWaystonesCount: OVERWORLD_MAP.worldWaystones?.length || 9,
    unlockedSkillSlots: profile.unlockedSkillSlots,
    currentChunkKey: '0,0',
    activeChunksCount: 9,
    discoveredChunksCount: profile.exploredChunks.length,
    currentBiomeColor: '#22C55E',
  });

  const isMobile = profile.deviceMode === 'mobile';
  const anyOverlayOpen =
    paused || showWorldMap || showChatDrawer || Boolean(activeNpcId) || Boolean(matchResult);

  // Pause simulation automatically when modal overlays are active
  useEffect(() => {
    if (simRef.current) {
      simRef.current.paused = anyOverlayOpen;
    }
  }, [anyOverlayOpen]);

  // Track exact pixel viewport size via visualViewport for immediate portrait/landscape fit
  useEffect(() => {
    const syncViewport = () => {
      const vv = window.visualViewport;
      const w = Math.round(vv?.width || window.innerWidth);
      const h = Math.round(vv?.height || window.innerHeight);
      setViewportSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };
    syncViewport();
    window.addEventListener('resize', syncViewport);
    window.addEventListener('orientationchange', syncViewport);
    window.visualViewport?.addEventListener('resize', syncViewport);
    return () => {
      window.removeEventListener('resize', syncViewport);
      window.removeEventListener('orientationchange', syncViewport);
      window.visualViewport?.removeEventListener('resize', syncViewport);
      try {
        (screen.orientation as { unlock?: () => void })?.unlock?.();
        if (document.fullscreenElement) {
          document.exitFullscreen?.().catch(() => undefined);
        }
      } catch {
        // Ignore browser restrictions
      }
    };
  }, []);

  // Re-sync WebCanvas resolution immediately when rotating or resizing viewport
  useEffect(() => {
    resizeCanvasFnRef.current?.();
    const raf = requestAnimationFrame(() => resizeCanvasFnRef.current?.());
    return () => cancelAnimationFrame(raf);
  }, [useCssLandscapeRotation, viewportSize.w, viewportSize.h]);

  const handleToggleLandscape = async () => {
    const next = !landscapeMode;
    setLandscapeMode(next);
    onToggleLandscape?.(next);

    try {
      if (next) {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen().catch(() => undefined);
        }
        const orient = screen.orientation as { lock?: (mode: string) => Promise<void> } | undefined;
        if (orient?.lock) {
          await orient.lock('landscape').catch(() => undefined);
        }
      } else {
        const orient = screen.orientation as { unlock?: () => void } | undefined;
        orient?.unlock?.();
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen().catch(() => undefined);
        }
      }
    } catch {
      // Fallback CSS landscape rotation handles browsers/iframes that disallow orientation lock
    }
  };

  // Sync live quality & camera changes straight into active simulation
  useEffect(() => {
    if (simRef.current) {
      simRef.current.quality = profile.quality;
      simRef.current.cameraView = profile.cameraView;
    }
  }, [profile.quality, profile.cameraView]);

  // Reset virtual joystick when switching to desktop mode
  useEffect(() => {
    if (!isMobile) {
      simRef.current?.setVirtualMove(0, 0);
      setJoyKnob({ x: 0, y: 0, active: false });
    }
  }, [isMobile]);

  // Sync incoming online fighters snapshots
  useEffect(() => {
    if (mode === 'pvp_online' && simRef.current && onlineFighters) {
      simRef.current.syncOnlineFighters(onlineFighters);
    }
  }, [mode, onlineFighters]);

  // Initialize simulation & 60fps pure Canvas2D 3D loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    rendererRef.current = new SoftwareRenderer3D();

    const sim = new CombatSimulation({
      mode,
      arenaId,
      playerAvatar: profile.avatar,
      playerWeaponLevel: profile.weaponLevels[profile.avatar.weaponId] || 1,
      equippedGear: profile.equippedGear,
      unlockedSkillSlots: profile.unlockedSkillSlots,
      powerLevels: profile.powerLevels,
      unlockedNetworkNodes: profile.unlockedNetworkNodes,
      initialExploredChunks: profile.exploredChunks,
      onExploreChunk,
      consumables: profile.consumables,
      onConsumeItem,
      initialDiscoveredRegions: profile.discoveredRegions,
      initialOpenedChests: profile.openedWorldChests,
      initialDefeatedSecretBossIds: profile.defeatedSecretBossIds,
      initialCompletedWorldEventIds: profile.completedWorldEventIds,
      onDiscoverRegion,
      onOpenWorldChest,
      onGatherNode,
      onDefeatSecretBoss,
      onCompleteWorldEvent,
      onCritLanded,
      onFusionCast,
      onOpenNpcWork: (npcId) => {
        setNpcNotice('');
        setActiveNpcId(npcId);
      },
      onWarpPortal: (targetArenaId) => {
        onWarpFromWorld?.(targetArenaId);
      },
      quality: profile.quality,
      cameraView: profile.cameraView,
      rivalChampion,
      localP2Avatar,
      onlineSelfId,
      onOnlineStateSend,
      onOnlineHitSend,
      onOnlineVfxSend,
      onFinish: (res) => {
        setMatchResult(res);
        onMatchComplete(res);
      },
    });
    simRef.current = sim;
    setMatchResult(null);
    setPaused(false);
    setShowWorldMap(false);
    setShowChatDrawer(false);
    setActiveNpcId(null);

    if (mode === 'pvp_online' && onBindOnlineListeners) {
      onBindOnlineListeners(
        (dmgEv) => sim.applyOnlineDamageEvent(dmgEv),
        (vfxEv) => sim.applyOnlineVfx(vfxEv)
      );
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const q = simRef.current?.quality || 'balanced';
      const scale =
        q === 'eco'
          ? 0.72
          : q === 'balanced'
            ? 1.0
            : q === 'high'
              ? Math.min(window.devicePixelRatio || 1, 1.35)
              : q === 'ultra'
                ? Math.min(window.devicePixelRatio || 1, 1.65)
                : Math.min(window.devicePixelRatio || 1, 2.0);
      const baseW = canvas.clientWidth || (useCssLandscapeRef.current ? rect.height : rect.width);
      const baseH = canvas.clientHeight || (useCssLandscapeRef.current ? rect.width : rect.height);
      const w = Math.max(360, Math.floor(baseW * scale));
      const h = Math.max(220, Math.floor(baseH * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };

    resizeCanvasFnRef.current = resize;
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      if (e.code === 'Escape') {
        if (showChatDrawerRef.current) {
          setShowChatDrawer(false);
          return;
        }
        if (activeNpcIdRef.current) {
          setActiveNpcId(null);
          return;
        }
        if (showWorldMapRef.current) {
          setShowWorldMap(false);
          return;
        }
        setPaused((prev) => !prev);
        return;
      }
      if (e.code === 'KeyM' && mode === 'world_explore') {
        setActiveNpcId(null);
        setShowChatDrawer(false);
        setShowWorldMap((prev) => !prev);
        return;
      }
      if (showWorldMapRef.current || activeNpcIdRef.current || showChatDrawerRef.current) return;

      if (e.code === 'KeyV') {
        const idx = CAMERA_CYCLE.indexOf(sim.cameraView);
        const nextView = CAMERA_CYCLE[(idx + 1) % CAMERA_CYCLE.length];
        onChangeCamera(nextView);
        return;
      }
      sim.setKey(e.code, true);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      sim.setKey(e.code, false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    let rafId = 0;
    let lastTime = performance.now();
    let hudTimer = 0;
    let lastQuality = sim.quality;

    const frame = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      if (sim.quality !== lastQuality) {
        lastQuality = sim.quality;
        resize();
      }

      sim.step(dt);
      rendererRef.current?.renderScene(ctx, canvas.width, canvas.height, sim.camera, sim.getRenderPayload());

      hudTimer += dt;
      if (hudTimer >= 0.08) {
        hudTimer = 0;
        setHud(sim.getHudSnapshot());
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      sim.dispose();
      if (npcToastTimerRef.current) {
        window.clearTimeout(npcToastTimerRef.current);
        npcToastTimerRef.current = null;
      }
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (mode === 'pvp_online' && onBindOnlineListeners) {
        onBindOnlineListeners(null, null);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, arenaId, sessionNonce]);

  const togglePause = () => {
    setPaused((prev) => !prev);
  };

  const handleCycleCamera = () => {
    const idx = CAMERA_CYCLE.indexOf(profile.cameraView);
    onChangeCamera(CAMERA_CYCLE[(idx + 1) % CAMERA_CYCLE.length]);
  };

  const handleCycleQuality = () => {
    const idx = QUALITY_CYCLE.indexOf(profile.quality);
    onChangeQuality(QUALITY_CYCLE[(idx + 1) % QUALITY_CYCLE.length]);
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (anyOverlayOpen) return;
    const axis = useCssLandscapeRef.current ? e.clientY : e.clientX;
    dragCamRef.current = {
      active: true,
      lastAxis: axis,
      moved: 0,
      pointerType: e.pointerType,
      button: e.button,
    };
    if (!isMobile && e.pointerType !== 'touch') {
      if (e.button === 2) {
        simRef.current?.triggerPlayer1Action('heavy');
      } else if (e.button === 0) {
        simRef.current?.triggerPlayer1Action('attack');
      }
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragCamRef.current.active) return;
    const axis = useCssLandscapeRef.current ? e.clientY : e.clientX;
    const dx = axis - dragCamRef.current.lastAxis;
    dragCamRef.current.lastAxis = axis;
    dragCamRef.current.moved += Math.abs(dx);
    if (Math.abs(dx) > 0.8) {
      simRef.current?.rotateCameraYaw(dx * 0.0085);
    }
  };

  const handleCanvasPointerUp = () => {
    if (
      dragCamRef.current.active &&
      (isMobile || dragCamRef.current.pointerType === 'touch') &&
      dragCamRef.current.moved < 8
    ) {
      simRef.current?.triggerPlayer1Action('attack');
    }
    dragCamRef.current.active = false;
  };

  const updateJoystickFromPointer = (clientX: number, clientY: number) => {
    const el = joystickRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = (useCssLandscapeRef.current ? rect.height : rect.width) * 0.36;

    const rawDx = clientX - cx;
    const rawDy = clientY - cy;

    let dx = useCssLandscapeRef.current ? rawDy : rawDx;
    let dy = useCssLandscapeRef.current ? -rawDx : rawDy;

    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    setJoyKnob({ x: dx, y: dy, active: true });
    simRef.current?.setVirtualMove(dx / maxR, dy / maxR);
  };

  const handleJoyDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    updateJoystickFromPointer(e.clientX, e.clientY);
  };

  const handleJoyMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!joyKnob.active) return;
    e.stopPropagation();
    updateJoystickFromPointer(e.clientX, e.clientY);
  };

  const handleJoyEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setJoyKnob({ x: 0, y: 0, active: false });
    simRef.current?.setVirtualMove(0, 0);
  };

  const showNpcToast = (msg: string) => {
    setNpcNotice(msg);
    if (npcToastTimerRef.current) {
      window.clearTimeout(npcToastTimerRef.current);
    }
    npcToastTimerRef.current = window.setTimeout(() => {
      setNpcNotice('');
      npcToastTimerRef.current = null;
    }, 3000);
  };

  const hpPct = Math.max(0, Math.min(100, Math.round((hud.hp / Math.max(1, hud.maxHp)) * 100)));
  const energyPct = Math.max(0, Math.min(100, Math.round((hud.energy / Math.max(1, hud.maxEnergy)) * 100)));

  // Minimap viewport: zoomed local radar in 1400m Overworld, full arena view in battle arenas
  const radarViewBox = hud.isOverworld
    ? `${hud.playerX - 95} ${hud.playerZ - 95} 190 190`
    : `${-(hud.arenaRadius + 3)} ${-(hud.arenaRadius + 3)} ${(hud.arenaRadius + 3) * 2} ${(hud.arenaRadius + 3) * 2}`;
  const radarDotScale = hud.isOverworld ? 1.55 : Math.max(1, hud.arenaRadius / 32);

  const activeNpcDef = activeNpcId
    ? OVERWORLD_MAP.worldNpcs?.find((n) => n.id === activeNpcId) || null
    : null;
  const activeNpcJobs = activeNpcDef
    ? NPC_JOB_LIST.filter((j) => j.npcId === activeNpcDef.id)
    : [];

  return (
    <div
      style={
        useCssLandscapeRotation
          ? {
              width: `${viewportSize.h}px`,
              height: `${viewportSize.w}px`,
              transform: 'rotate(90deg)',
              transformOrigin: 'top left',
              position: 'fixed',
              top: 0,
              left: `${viewportSize.w}px`,
            }
          : {
              width: `${viewportSize.w}px`,
              height: `${viewportSize.h}px`,
              position: 'fixed',
              top: 0,
              left: 0,
            }
      }
      className="z-40 bg-[#0A0F1A] select-none overflow-hidden touch-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Full-Viewport 3D Pure Canvas2D Stage */}
      <canvas
        ref={canvasRef}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onPointerCancel={handleCanvasPointerUp}
        className="w-full h-full block cursor-crosshair touch-none"
      />

      {/* Top HUD Layer — Slim, Contemporary Manhwa & Immediately Fitted to Portrait/Landscape */}
      <div
        className={`pointer-events-none absolute top-0 inset-x-0 z-10 flex items-start justify-between gap-1.5 sm:gap-2 ${
          isCompactLandscape ? 'px-2 py-1.5' : 'px-2.5 py-2 sm:px-4 sm:py-3'
        }`}
      >
        {/* Top-Right (in RTL): Slim Player Bar + Compact Mini-Radar (side-by-side in landscape) */}
        <div
          className={`flex items-start shrink-0 ${
            isCompactLandscape ? 'flex-row gap-1.5' : 'flex-col gap-1.5'
          }`}
        >
          <div
            className={`pointer-events-auto bg-[#0B101D]/88 backdrop-blur-md border border-[#E6B85C]/25 rounded-xl space-y-1 ${
              isCompactLandscape ? 'px-2 py-1.5 w-36' : 'px-2.5 py-2 w-40 sm:w-60'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] sm:text-xs gap-1">
              <span className="font-display font-bold text-[#F8FAFC] truncate">
                {profile.avatar.name}
              </span>
              <span className="font-mono-num text-[#E6B85C] font-semibold shrink-0">
                {hud.hp}/{hud.maxHp}
              </span>
            </div>
            <div className="w-full h-1.5 sm:h-2 bg-[#162034] rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-150 ${
                  hpPct > 35 ? 'bg-gradient-to-r from-[#10B981] to-[#34D399]' : 'bg-[#EF4444]'
                }`}
                style={{ width: `${hpPct}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-[#94A3B8] gap-1">
              <span className="truncate">{slotPowers[0].name}</span>
              <span className="font-mono-num text-[#38BDF8] shrink-0">{energyPct}%</span>
            </div>
            <div className="w-full h-1 bg-[#162034] rounded-full overflow-hidden">
              <div className="h-full bg-[#38BDF8] transition-all duration-100" style={{ width: `${energyPct}%` }} />
            </div>

            {(hud.combo >= 2 || hud.terrainNote || hud.sprintActive) && (
              <div className="flex items-center justify-between gap-2 text-[9px] sm:text-[10px] pt-0.5">
                {hud.combo >= 2 ? (
                  <span className="text-[#E6B85C] font-display font-extrabold">
                    كومبو {hud.combo}x
                  </span>
                ) : hud.sprintActive ? (
                  <span className="text-[#38BDF8] font-bold">ركض سريع</span>
                ) : (
                  <span />
                )}
                {hud.terrainNote && (
                  <span className="text-[#7DD3FC] font-medium truncate">{hud.terrainNote}</span>
                )}
              </div>
            )}
          </div>

          {/* Compact Tactical / Zoomed Continent Mini-Radar */}
          <div className="pointer-events-auto bg-[#0B101D]/85 backdrop-blur-md border border-[#38BDF8]/25 rounded-xl p-1 flex flex-col items-center gap-0.5">
            <svg
              viewBox={radarViewBox}
              className={`${
                isCompactLandscape ? 'w-12 h-12' : 'w-15 h-15 sm:w-22 sm:h-22'
              } rounded-lg`}
              aria-label="خريطة الرادار التكتيكية"
            >
              <circle
                cx={0}
                cy={0}
                r={hud.arenaRadius}
                fill="#0D1422"
                fillOpacity={0.92}
                stroke={displayMap.floorTrim}
                strokeWidth={Math.max(1.2, hud.arenaRadius * 0.02)}
                strokeOpacity={0.75}
              />
              {displayMap.regions?.map((reg) => (
                <circle
                  key={reg.id}
                  cx={reg.x}
                  cy={reg.z}
                  r={reg.radius}
                  fill={reg.color}
                  fillOpacity={0.14}
                  stroke={reg.color}
                  strokeOpacity={0.4}
                  strokeWidth={1.5}
                />
              ))}
              {displayMap.platforms.map((pl) => (
                <circle
                  key={pl.id}
                  cx={pl.x}
                  cy={pl.z}
                  r={pl.radius}
                  fill={pl.trimColor}
                  fillOpacity={0.18}
                />
              ))}
              {displayMap.pillars.map((p, i) => (
                <circle
                  key={`rp_${i}`}
                  cx={p.x}
                  cy={p.z}
                  r={Math.max(1.2, p.radius)}
                  fill="#475569"
                  fillOpacity={0.75}
                />
              ))}
              {hud.radarPoints.map((pt, idx) => {
                if (pt.kind === 'player') {
                  const deg = (hud.playerYaw * 180) / Math.PI;
                  return (
                    <g key={`r_${idx}`} transform={`translate(${pt.x}, ${pt.z}) rotate(${deg}) scale(${radarDotScale})`}>
                      <polygon points="0,2.4 -1.6,-1.6 1.6,-1.6" fill="#F8FAFC" stroke="#E6B85C" strokeWidth={0.45} />
                    </g>
                  );
                }
                if (pt.kind === 'chest') {
                  return (
                    <rect
                      key={`r_${idx}`}
                      x={pt.x - 1.4 * radarDotScale}
                      y={pt.z - 1.4 * radarDotScale}
                      width={2.8 * radarDotScale}
                      height={2.8 * radarDotScale}
                      rx={0.4}
                      fill="#E6B85C"
                      stroke="#FEF08A"
                      strokeWidth={0.4}
                    />
                  );
                }
                if (pt.kind === 'node') {
                  return <circle key={`r_${idx}`} cx={pt.x} cy={pt.z} r={1.3 * radarDotScale} fill="#34D399" />;
                }
                if (pt.kind === 'waystone') {
                  return (
                    <rect
                      key={`r_${idx}`}
                      x={pt.x - 1.5 * radarDotScale}
                      y={pt.z - 1.5 * radarDotScale}
                      width={3 * radarDotScale}
                      height={3 * radarDotScale}
                      transform={`rotate(45 ${pt.x} ${pt.z})`}
                      fill="#C084FC"
                      stroke="#FFFFFF"
                      strokeWidth={0.35}
                    />
                  );
                }
                if (pt.kind === 'portal') {
                  return <circle key={`r_${idx}`} cx={pt.x} cy={pt.z} r={1.9 * radarDotScale} fill="#38BDF8" stroke="#FFFFFF" strokeWidth={0.45} />;
                }
                if (pt.kind === 'npc') {
                  return <circle key={`r_${idx}`} cx={pt.x} cy={pt.z} r={1.8 * radarDotScale} fill="#10B981" stroke="#FFFFFF" strokeWidth={0.45} />;
                }
                if (
                  pt.kind === 'shrine_heal' ||
                  pt.kind === 'shrine_energy' ||
                  pt.kind === 'shrine_fury' ||
                  pt.kind === 'shrine_cd'
                ) {
                  const fill =
                    pt.kind === 'shrine_heal'
                      ? '#10B981'
                      : pt.kind === 'shrine_energy'
                        ? '#38BDF8'
                        : pt.kind === 'shrine_fury'
                          ? '#E6B85C'
                          : '#475569';
                  return <circle key={`r_${idx}`} cx={pt.x} cy={pt.z} r={1.3 * radarDotScale} fill={fill} />;
                }
                if (pt.kind === 'boss') {
                  return (
                    <circle
                      key={`r_${idx}`}
                      cx={pt.x}
                      cy={pt.z}
                      r={2.1 * radarDotScale}
                      fill="#F97316"
                      stroke="#FEF08A"
                      strokeWidth={0.5}
                    />
                  );
                }
                if (pt.kind === 'secret_boss') {
                  return (
                    <rect
                      key={`r_${idx}`}
                      x={pt.x - 1.8 * radarDotScale}
                      y={pt.z - 1.8 * radarDotScale}
                      width={3.6 * radarDotScale}
                      height={3.6 * radarDotScale}
                      transform={`rotate(45 ${pt.x} ${pt.z})`}
                      fill="#A855F7"
                      stroke="#FDE68A"
                      strokeWidth={0.5}
                    />
                  );
                }
                if (pt.kind === 'event_zone') {
                  return (
                    <circle
                      key={`r_${idx}`}
                      cx={pt.x}
                      cy={pt.z}
                      r={2.5 * radarDotScale}
                      fill="#38BDF8"
                      fillOpacity={0.22}
                      stroke="#38BDF8"
                      strokeWidth={0.55}
                    />
                  );
                }
                if (pt.kind === 'rival') {
                  return (
                    <circle
                      key={`r_${idx}`}
                      cx={pt.x}
                      cy={pt.z}
                      r={1.5 * radarDotScale}
                      fill="#E879F9"
                      stroke="#FFFFFF"
                      strokeWidth={0.35}
                    />
                  );
                }
                return <circle key={`r_${idx}`} cx={pt.x} cy={pt.z} r={1.0 * radarDotScale} fill="#EF4444" />;
              })}
            </svg>

            {hud.isOverworld && !isCompactLandscape && (
              <button
                type="button"
                onClick={() => setShowWorldMap(true)}
                className="w-full py-0.5 px-1.5 text-[10px] font-bold text-[#38BDF8] bg-[#101E33] hover:bg-[#162945] border border-[#38BDF8]/30 rounded flex items-center justify-center gap-1 cursor-pointer"
              >
                <MapIcon className="w-3 h-3" />
                <span>خريطة [M]</span>
              </button>
            )}
          </div>
        </div>

        {/* Top-Center: Always-Visible Compact Arena / Overworld Status Strip */}
        <div className="flex flex-col items-center gap-1 min-w-0 max-w-[36%] sm:max-w-md">
          <div
            className={`bg-[#0B101D]/88 backdrop-blur-md border border-[#E6B85C]/25 rounded-xl text-[#F1F5F9] flex items-center gap-1.5 whitespace-nowrap max-w-full ${
              isCompactLandscape ? 'px-2 py-1 text-[10px]' : 'px-2.5 sm:px-3.5 py-1.5 text-[11px] sm:text-xs'
            }`}
          >
            <span className="font-display font-bold text-[#E6B85C] truncate max-w-[90px] sm:max-w-none">
              {hud.isOverworld ? hud.currentRegionName || displayMap.name : displayMap.name}
            </span>
            <span className="text-[#475569]">·</span>
            {hud.isOverworld ? (
              <span className="font-mono-num text-[#38BDF8] truncate">
                [{hud.currentChunkKey || '0,0'}] · {hud.discoveredRegionsCount}/{hud.totalRegionsCount}
              </span>
            ) : mode === 'pvp_local' ? (
              <span className="font-mono-num font-bold">
                {hud.scoreP1} — {hud.scoreP2}
              </span>
            ) : mode === 'pvp_ranked' ? (
              <span className="truncate max-w-[75px] sm:max-w-none">{hud.opponentName || rivalChampion?.name}</span>
            ) : mode === 'pvp_online' && onlineRoom ? (
              <span className="font-mono-num">
                {onlineRoom.code} · {hud.onlineCount}م
              </span>
            ) : (
              <span className="font-mono-num">
                موجة {hud.wave} · <strong className="text-[#E6B85C]">{hud.kills}</strong>
              </span>
            )}
            <span className="hidden sm:inline text-[#475569]">·</span>
            <span className="hidden sm:inline font-mono-num text-[#94A3B8]">{hud.fps} FPS</span>
          </div>

          {hud.activeMission && !hud.isOverworld && (
            <div className="bg-[#0B101D]/85 backdrop-blur-md border border-[#38BDF8]/30 rounded-lg px-2 py-0.5 flex items-center justify-between gap-2 text-[10px] sm:text-[11px] max-w-full">
              <span className="flex items-center gap-1 text-[#E0F2FE] truncate">
                <Target className="w-3 h-3 text-[#38BDF8] shrink-0" />
                <span className="truncate">{hud.activeMission.title}</span>
              </span>
              <span className="font-mono-num text-[#38BDF8] font-bold shrink-0">
                {hud.activeMission.progress}/{hud.activeMission.target}
              </span>
            </div>
          )}

          {hud.activeEventZoneName && (
            <div className="bg-[#0B101D]/88 backdrop-blur-md border border-[#38BDF8]/45 rounded-lg px-2.5 py-0.5 flex items-center gap-2 text-[10px] sm:text-[11px] max-w-full">
              <Sparkles className="w-3 h-3 text-[#38BDF8] shrink-0" />
              <span className="font-bold text-[#E0F2FE] truncate">{hud.activeEventZoneName}</span>
              {hud.activeEventProgress && (
                <span className="font-mono-num text-[#38BDF8] font-bold shrink-0">
                  {hud.activeEventProgress}
                </span>
              )}
            </div>
          )}

          {hud.activeSecretBossName && !hud.bossName && (
            <div className="bg-[#181028]/88 backdrop-blur-md border border-[#A855F7]/50 rounded-lg px-2.5 py-0.5 flex items-center gap-1.5 text-[10px] sm:text-[11px] max-w-full">
              <Flame className="w-3 h-3 text-[#E879F9] shrink-0" />
              <span className="font-bold text-[#F3E8FF] truncate">مزار زعيم سري: {hud.activeSecretBossName}</span>
            </div>
          )}

          {hud.bossName && hud.bossHp !== undefined && hud.bossMaxHp && (
            <div
              className={`${
                isCompactLandscape ? 'w-44' : 'w-48 sm:w-72'
              } bg-[#0B101D]/85 backdrop-blur-md border border-[#F97316]/45 rounded-lg px-2 py-1 space-y-0.5`}
            >
              <div className="flex justify-between text-[10px] sm:text-[11px]">
                <span className="font-display font-bold text-[#FB923C] truncate">{hud.bossName}</span>
                <span className="font-mono-num text-[#FED7AA]">
                  {hud.bossHp}/{hud.bossMaxHp}
                </span>
              </div>
              <div className="w-full h-1.5 bg-[#231917] rounded overflow-hidden">
                <div
                  className="h-full bg-[#F97316]"
                  style={{ width: `${Math.round((hud.bossHp / hud.bossMaxHp) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {(mode === 'pvp_ranked' || mode === 'pvp_local' || mode === 'unified_clash') &&
            hud.opponentName &&
            hud.opponentHp !== undefined &&
            hud.opponentMaxHp && (
              <div
                className={`${
                  isCompactLandscape ? 'w-40' : 'w-44 sm:w-68'
                } bg-[#0B101D]/85 backdrop-blur-md border border-white/15 rounded-lg px-2 py-1 space-y-0.5`}
              >
                <div className="flex justify-between text-[10px] sm:text-[11px]">
                  <span className="font-display font-bold text-[#F1F5F9] truncate">
                    {hud.opponentName}
                  </span>
                  <span className="font-mono-num text-[#FCA5A5]">
                    {hud.opponentHp}/{hud.opponentMaxHp}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#22171A] rounded overflow-hidden">
                  <div
                    className="h-full bg-[#EF4444]"
                    style={{ width: `${Math.round((hud.opponentHp / hud.opponentMaxHp) * 100)}%` }}
                  />
                </div>
              </div>
            )}
        </div>

        {/* Top-Left (in RTL): Full Utility Strip — Always Accessible on Mobile & Desktop */}
        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-1 max-w-[38%] sm:max-w-none shrink-0">
          <button
            type="button"
            onClick={() => onChangeDeviceMode(isMobile ? 'desktop' : 'mobile')}
            title="تحويل وضع التحكم بين الهاتف والحاسوب"
            className={`${
              isCompactLandscape ? 'min-h-[32px] px-1.5 text-[10px]' : 'min-h-[34px] px-2 text-[11px] sm:text-xs'
            } py-1 font-bold rounded-lg border flex items-center gap-1 whitespace-nowrap cursor-pointer backdrop-blur-md transition-colors ${
              isMobile
                ? 'bg-[#E6B85C] text-[#0A0F1A] border-[#FDE68A]/50'
                : 'bg-[#0B101D]/85 text-[#F1F5F9] border-white/15 hover:bg-[#16223A]'
            }`}
          >
            {isMobile ? <Smartphone className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5 text-[#E6B85C]" />}
            <span className="hidden sm:inline">{isMobile ? 'هاتف' : 'حاسوب'}</span>
          </button>

          <button
            type="button"
            onClick={handleToggleLandscape}
            title="فتح الشاشة بوضع أفقي وملء الشاشة"
            className={`${
              isCompactLandscape ? 'min-h-[32px] px-1.5 text-[10px]' : 'min-h-[34px] px-2 text-[11px] sm:text-xs'
            } py-1 font-bold rounded-lg border flex items-center gap-1 whitespace-nowrap cursor-pointer backdrop-blur-md transition-colors ${
              landscapeMode
                ? 'bg-[#38BDF8] text-[#0A0F1A] border-[#BAE6FD]/60'
                : 'bg-[#0B101D]/85 text-[#F1F5F9] border-white/15 hover:bg-[#16223A]'
            }`}
          >
            {landscapeMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5 text-[#38BDF8]" />}
            <span className="hidden sm:inline">{landscapeMode ? 'إنهاء الأفقي' : 'أفقي'}</span>
          </button>

          <button
            type="button"
            onClick={handleCycleCamera}
            title={`الكاميرا: ${CAMERA_LABELS[profile.cameraView]}`}
            className={`${
              isCompactLandscape ? 'min-h-[32px] px-1.5 text-[10px]' : 'min-h-[34px] px-2 text-[11px] sm:text-xs'
            } py-1 font-semibold text-[#F1F5F9] bg-[#0B101D]/85 hover:bg-[#16223A] backdrop-blur-md border border-white/10 rounded-lg flex items-center gap-1 whitespace-nowrap cursor-pointer`}
          >
            <Camera className="w-3.5 h-3.5 text-[#E6B85C]" />
            <span className="hidden lg:inline">{CAMERA_LABELS[profile.cameraView]}</span>
          </button>

          <button
            type="button"
            onClick={handleCycleQuality}
            title={`الجودة: ${QUALITY_LABELS[profile.quality]}`}
            className={`${
              isCompactLandscape ? 'min-h-[32px] px-1.5 text-[10px]' : 'min-h-[34px] px-2 text-[11px] sm:text-xs'
            } py-1 font-semibold text-[#F1F5F9] bg-[#0B101D]/85 hover:bg-[#16223A] backdrop-blur-md border border-white/10 rounded-lg flex items-center gap-1 whitespace-nowrap cursor-pointer`}
          >
            <Cpu className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span className="hidden lg:inline">{QUALITY_LABELS[profile.quality]}</span>
          </button>

          <button
            type="button"
            onClick={() => simRef.current?.rotateCameraYaw(Math.PI / 4)}
            title="تدوير زاوية الكاميرا"
            className={`${
              isCompactLandscape ? 'min-h-[32px] min-w-[32px]' : 'min-h-[34px] min-w-[34px]'
            } flex items-center justify-center p-1 text-[#F1F5F9] bg-[#0B101D]/85 hover:bg-[#16223A] backdrop-blur-md border border-white/10 rounded-lg cursor-pointer`}
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onToggleSound}
            title="تبديل الصوت"
            className={`${
              isCompactLandscape ? 'min-h-[32px] min-w-[32px]' : 'min-h-[34px] min-w-[34px]'
            } flex items-center justify-center p-1 text-[#F1F5F9] bg-[#0B101D]/85 hover:bg-[#16223A] backdrop-blur-md border border-white/10 rounded-lg cursor-pointer`}
          >
            {profile.soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {onSendChat && (
            <button
              type="button"
              onClick={() => setShowChatDrawer((prev) => !prev)}
              title="دردشة العالم والغرفة الحية"
              className={`${
                isCompactLandscape ? 'min-h-[32px] min-w-[32px] px-1.5 text-[10px]' : 'min-h-[34px] min-w-[34px] px-2 text-[11px]'
              } py-1 font-bold rounded-lg border flex items-center justify-center gap-1 cursor-pointer backdrop-blur-md transition-colors ${
                showChatDrawer
                  ? 'system-btn-primary'
                  : 'bg-[#0B101D]/85 text-[#38BDF8] hover:bg-[#16223A] border-white/10'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">الدردشة</span>
            </button>
          )}

          <button
            type="button"
            onClick={togglePause}
            title="إيقاف مؤقت (Esc)"
            className={`${
              isCompactLandscape ? 'min-h-[32px] min-w-[32px]' : 'min-h-[34px] min-w-[34px]'
            } flex items-center justify-center p-1 text-[#F1F5F9] bg-[#0B101D]/85 hover:bg-[#16223A] backdrop-blur-md border border-white/10 rounded-lg cursor-pointer`}
          >
            {paused ? <Play className="w-3.5 h-3.5 text-[#E6B85C]" /> : <Pause className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => {
              if (mode === 'pvp_online') {
                simRef.current?.finishMatch(hud.scoreP1 > 0);
              } else {
                onExit();
              }
            }}
            title="خروج من الساحة"
            className={`${
              isCompactLandscape ? 'min-h-[32px] px-2 text-[10px]' : 'min-h-[34px] px-2.5 text-[11px] sm:text-xs'
            } py-1 font-bold text-[#FCA5A5] bg-[#24131A]/90 hover:bg-[#381A22] border border-[#EF4444]/35 rounded-lg flex items-center gap-1 whitespace-nowrap cursor-pointer`}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">خروج</span>
          </button>
        </div>
      </div>

      {/* Peaceful NPC Dialogue Toast */}
      {hud.npcDialogue && !matchResult && !activeNpcId && (
        <div
          className={`pointer-events-none absolute inset-x-0 z-20 flex justify-center px-4 ${
            isCompactLandscape ? 'top-12' : 'top-16 sm:top-20'
          }`}
        >
          <div className="max-w-lg bg-[#0B101D]/92 backdrop-blur-md border border-[#10B981]/50 rounded-xl px-3.5 py-2 text-center shadow-lg">
            <p className="font-display text-xs sm:text-sm font-bold text-[#A7F3D0]">
              {hud.npcDialogue}
            </p>
          </div>
        </div>
      )}

      {/* Wave / Region Discovery / KO Center Banner */}
      {(hud.bannerText || koAnnouncement) && !matchResult && (
        <div
          className={`pointer-events-none absolute inset-x-0 z-10 flex justify-center px-4 ${
            isCompactLandscape ? 'top-16' : 'top-24 sm:top-28'
          }`}
        >
          <div className="bg-[#0B101D]/85 backdrop-blur-md border border-[#E6B85C]/50 px-4 py-1.5 rounded-xl font-display text-xs sm:text-base font-bold text-[#FEF3C7] text-center shadow-lg">
            {koAnnouncement || hud.bannerText}
          </div>
        </div>
      )}

      {/* Overworld Proximity Interact Prompt (Chests / Nodes / Peaceful NPCs / Portals) */}
      {hud.nearbyInteractable && !anyOverlayOpen && (
        <div
          className={`pointer-events-none absolute inset-x-0 z-20 flex justify-center px-4 ${
            isCompactLandscape ? 'bottom-3' : isMobile ? 'bottom-40' : 'bottom-20'
          }`}
        >
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              simRef.current?.triggerPlayer1Action('interact');
            }}
            className="pointer-events-auto min-h-[42px] px-4 py-2 rounded-xl bg-gradient-to-r from-[#E6B85C] to-[#F5D076] text-[#0A0F1A] border-2 border-[#FEF3C7] shadow-xl flex items-center gap-2.5 active:scale-95 transition-transform cursor-pointer"
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <div className="text-right">
              <div className="font-display text-xs sm:text-sm font-extrabold">
                {hud.nearbyInteractable.label}
              </div>
              {hud.nearbyInteractable.sublabel && (
                <div className="text-[10px] font-semibold opacity-85">
                  {hud.nearbyInteractable.sublabel}
                </div>
              )}
            </div>
            {!isMobile && (
              <span className="font-mono-num text-xs font-extrabold bg-[#0A0F1A]/15 px-2 py-0.5 rounded">
                [G]
              </span>
            )}
          </button>
        </div>
      )}

      {/* MOBILE MODE: Ergonomic 360° Joystick + Labeled Manhwa 4-Skill Command Deck */}
      {isMobile && !anyOverlayOpen && (
        <>
          {/* Right Thumb: Consumables + Sprint/Map (Overworld) + 360° Analog Joystick */}
          <div
            className={`absolute z-20 flex flex-col items-end gap-1 ${
              isCompactLandscape ? 'bottom-2 right-2.5' : 'bottom-3 right-3 gap-1.5'
            }`}
          >
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={hud.consumables.elixir_heal <= 0}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  simRef.current?.triggerConsumable('elixir_heal');
                }}
                aria-label="جرعة الشفاء"
                className={`${
                  isCompactLandscape ? 'min-w-[34px] min-h-[34px] px-1' : 'min-w-[40px] min-h-[40px] px-1.5'
                } rounded-xl bg-[#0B101D]/88 border border-[#10B981]/50 disabled:opacity-35 text-[#10B981] flex flex-col items-center justify-center text-[9px] font-bold`}
              >
                <Heart className="w-3.5 h-3.5" />
                <span className="font-mono-num">{hud.consumables.elixir_heal}</span>
              </button>
              <button
                type="button"
                disabled={hud.consumables.scroll_energy <= 0}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  simRef.current?.triggerConsumable('scroll_energy');
                }}
                aria-label="لفيفة الطاقة"
                className={`${
                  isCompactLandscape ? 'min-w-[34px] min-h-[34px] px-1' : 'min-w-[40px] min-h-[40px] px-1.5'
                } rounded-xl bg-[#0B101D]/88 border border-[#38BDF8]/50 disabled:opacity-35 text-[#38BDF8] flex flex-col items-center justify-center text-[9px] font-bold`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="font-mono-num">{hud.consumables.scroll_energy}</span>
              </button>
              <button
                type="button"
                disabled={hud.consumables.tonic_fury <= 0}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  simRef.current?.triggerConsumable('tonic_fury');
                }}
                aria-label="إكسير الغضب"
                className={`${
                  isCompactLandscape ? 'min-w-[34px] min-h-[34px] px-1' : 'min-w-[40px] min-h-[40px] px-1.5'
                } rounded-xl bg-[#0B101D]/88 border border-[#E6B85C]/50 disabled:opacity-35 text-[#E6B85C] flex flex-col items-center justify-center text-[9px] font-bold`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span className="font-mono-num">{hud.consumables.tonic_fury}</span>
              </button>
              {hud.isOverworld && (
                <>
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      simRef.current?.triggerPlayer1Action('sprint');
                    }}
                    className={`${
                      isCompactLandscape ? 'min-w-[34px] min-h-[34px] px-1.5' : 'min-w-[40px] min-h-[40px] px-1.5'
                    } rounded-xl border flex flex-col items-center justify-center text-[9px] font-bold ${
                      hud.sprintActive
                        ? 'bg-[#38BDF8] text-[#0A0F1A] border-[#BAE6FD]'
                        : 'bg-[#0B101D]/88 text-[#38BDF8] border-[#38BDF8]/40'
                    }`}
                  >
                    <Wind className="w-3.5 h-3.5" />
                    <span>ركض</span>
                  </button>
                  {isCompactLandscape && (
                    <button
                      type="button"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        setShowWorldMap(true);
                      }}
                      className="min-w-[34px] min-h-[34px] px-1.5 rounded-xl border border-[#38BDF8]/45 bg-[#102036]/90 text-[#38BDF8] flex flex-col items-center justify-center text-[9px] font-bold"
                    >
                      <MapIcon className="w-3.5 h-3.5" />
                      <span>خريطة</span>
                    </button>
                  )}
                </>
              )}
            </div>

            <div
              ref={joystickRef}
              onPointerDown={handleJoyDown}
              onPointerMove={handleJoyMove}
              onPointerUp={handleJoyEnd}
              onPointerCancel={handleJoyEnd}
              className={`relative rounded-full bg-[#0B101D]/65 backdrop-blur-sm border-2 border-[#E6B85C]/35 flex items-center justify-center touch-none cursor-grab active:cursor-grabbing ${
                isCompactLandscape ? 'w-22 h-22' : 'w-28 h-28 sm:w-32 sm:h-32'
              }`}
            >
              <div className="absolute inset-3 rounded-full border border-white/10 pointer-events-none" />
              <div
                className={`${
                  isCompactLandscape ? 'w-9 h-9' : 'w-11 h-11 sm:w-12 sm:h-12'
                } rounded-full bg-[#E6B85C]/95 border-2 border-[#FEF3C7] shadow-lg pointer-events-none transition-transform duration-75`}
                style={{
                  transform: `translate(${joyKnob.x}px, ${joyKnob.y}px)`,
                }}
              />
            </div>
          </div>

          {/* Left Thumb: Manhwa Labeled 4 Skill Tiles + Dodge + Guard + Heavy + Attack */}
          <div
            className={`absolute z-20 flex flex-col items-start touch-none ${
              isCompactLandscape ? 'bottom-2 left-2.5 gap-1' : 'bottom-3 left-3 gap-1.5'
            }`}
          >
            {/* Row 1: 4 Labeled Skill Tiles (matching Desktop readability) */}
            <div className="flex items-center gap-1">
              {slotPowers.map((sp, idx) => {
                const locked = idx >= hud.unlockedSkillSlots;
                const cd = hud.slotCooldowns[idx] || 0;
                const lowEnergy = hud.energy < sp.energyCost;
                const actionKey = (`skill${idx}`) as 'skill0' | 'skill1' | 'skill2' | 'skill3';
                return (
                  <button
                    key={`${sp.id}_${idx}`}
                    type="button"
                    disabled={locked || cd > 0 || lowEnergy}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      if (!locked) {
                        simRef.current?.triggerPlayer1Action(actionKey);
                      }
                    }}
                    style={{
                      borderColor: locked ? 'rgba(100,116,139,0.4)' : `${SKILL_ACCENTS[idx]}88`,
                    }}
                    className={`${
                      isCompactLandscape
                        ? 'min-w-[56px] max-w-[74px] min-h-[38px] px-1.5 py-1'
                        : 'min-w-[64px] max-w-[82px] min-h-[44px] px-2 py-1'
                    } rounded-xl border text-[#F1F5F9] flex flex-col items-center justify-center gap-0.5 backdrop-blur-md transition-transform ${
                      locked
                        ? 'bg-[#080C15]/85 opacity-55 cursor-not-allowed'
                        : 'bg-[#101A2F]/92 disabled:opacity-40 active:scale-95'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full gap-1 text-[9px] font-mono-num">
                      {locked ? (
                        <Lock className="w-3 h-3 text-[#94A3B8] shrink-0" />
                      ) : (
                        <Sparkles className="w-3 h-3 shrink-0" style={{ color: SKILL_ACCENTS[idx] }} />
                      )}
                      <span className={cd > 0 ? 'text-[#FBBF24] font-bold' : 'text-[#94A3B8]'}>
                        {locked ? 'مقفلة' : cd > 0 ? `${cd}ث` : `${sp.energyCost}⚡`}
                      </span>
                    </div>
                    <span className="text-[9.5px] font-bold leading-tight truncate w-full text-center">
                      {locked ? `خانة ${idx + 1}` : sp.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Row 2: Dodge + Guard + Labeled Heavy + Primary Attack */}
            <div className="flex items-end gap-1.5">
              <button
                type="button"
                disabled={hud.dodgeCd > 0}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  simRef.current?.triggerPlayer1Action('dodge');
                }}
                className={`${
                  isCompactLandscape ? 'min-w-[46px] min-h-[40px] px-1.5' : 'w-12 h-12 min-w-[48px] min-h-[48px]'
                } rounded-xl bg-[#121B2D]/92 border border-white/20 disabled:opacity-45 text-[#F1F5F9] flex flex-col items-center justify-center gap-0.5 active:scale-95`}
              >
                <Wind className="w-3.5 h-3.5 text-[#10B981]" />
                <span className="text-[9px] font-semibold">
                  {hud.dodgeCd > 0 ? `${hud.dodgeCd}ث` : 'مراوغة'}
                </span>
              </button>

              <button
                type="button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  simRef.current?.triggerPlayer1Action('block_start');
                }}
                onPointerUp={(e) => {
                  e.stopPropagation();
                  simRef.current?.triggerPlayer1Action('block_end');
                }}
                onPointerLeave={() => simRef.current?.triggerPlayer1Action('block_end')}
                onPointerCancel={() => simRef.current?.triggerPlayer1Action('block_end')}
                className={`${
                  isCompactLandscape ? 'min-w-[44px] min-h-[40px] px-1.5' : 'w-12 h-12 min-w-[48px] min-h-[48px]'
                } rounded-xl bg-[#121B2D]/92 border border-white/20 text-[#F1F5F9] flex flex-col items-center justify-center gap-0.5 active:bg-[#22324F]`}
              >
                <Shield className="w-3.5 h-3.5 text-[#94A3B8]" />
                <span className="text-[9px] font-semibold">صدّ</span>
              </button>

              <button
                type="button"
                disabled={hud.heavyCd > 0}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  simRef.current?.triggerPlayer1Action('heavy');
                }}
                className={`${
                  isCompactLandscape ? 'min-w-[62px] max-w-[78px] min-h-[44px] px-1.5' : 'min-w-[68px] max-w-[84px] min-h-[50px] px-2'
                } rounded-xl bg-[#16223A]/95 border-2 border-[#E6B85C]/65 disabled:opacity-45 text-[#F1F5F9] flex flex-col items-center justify-center gap-0.5 active:scale-95`}
              >
                <Zap className="w-4 h-4 text-[#E6B85C]" />
                <span className="text-[9px] font-bold truncate w-full text-center">
                  {hud.heavyCd > 0 ? `${hud.heavyCd}ث` : weapon.heavySkillName}
                </span>
              </button>

              <button
                type="button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  simRef.current?.triggerPlayer1Action('attack');
                }}
                className={`${
                  isCompactLandscape ? 'w-13 h-13 min-w-[52px] min-h-[52px]' : 'w-16 h-16 min-w-[64px] min-h-[64px]'
                } rounded-full bg-[#E6B85C] active:bg-[#F5D076] text-[#0A0F1A] border-2 border-[#FEF3C7] font-bold flex flex-col items-center justify-center gap-0.5 shadow-lg active:scale-95`}
              >
                <Swords className={isCompactLandscape ? 'w-5 h-5' : 'w-6 h-6'} />
                <span className={isCompactLandscape ? 'text-[10px] font-extrabold' : 'text-xs font-extrabold'}>
                  هجوم
                </span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* DESKTOP MODE: Compact Bottom Interactive Action Bar with 4 Skills */}
      {!isMobile && !anyOverlayOpen && (
        <div className="absolute bottom-2.5 inset-x-0 z-10 px-3 flex flex-col items-center gap-1.5 pointer-events-none">
          <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 bg-[#0B101D]/90 backdrop-blur-md border border-[#E6B85C]/25 rounded-xl p-1.5">
            <button
              type="button"
              onClick={() => simRef.current?.triggerPlayer1Action('attack')}
              className="px-3 py-1.5 rounded-lg bg-[#E6B85C] hover:bg-[#F5D076] text-[#0A0F1A] font-bold text-xs flex items-center gap-1 cursor-pointer"
            >
              <Swords className="w-3.5 h-3.5" />
              <span>هجوم</span>
              <span className="font-mono-num text-[10px] opacity-80">[Space]</span>
            </button>

            <button
              type="button"
              disabled={hud.heavyCd > 0}
              onClick={() => simRef.current?.triggerPlayer1Action('heavy')}
              className="px-2.5 py-1.5 rounded-lg bg-[#16223A] hover:bg-[#203050] disabled:opacity-50 text-[#F1F5F9] font-semibold text-xs border border-white/10 flex items-center gap-1 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-[#E6B85C]" />
              <span className="max-w-[90px] truncate">
                {hud.heavyCd > 0 ? `${hud.heavyCd}ث` : weapon.heavySkillName}
              </span>
              <span className="font-mono-num text-[10px] text-[#94A3B8]">[E]</span>
            </button>

            {/* 4 Skill Slots (Gated to unlockedSkillSlots) */}
            {slotPowers.map((sp, idx) => {
              const locked = idx >= hud.unlockedSkillSlots;
              const cd = hud.slotCooldowns[idx] || 0;
              const actionKey = (`skill${idx}`) as 'skill0' | 'skill1' | 'skill2' | 'skill3';
              return (
                <button
                  key={`${sp.id}_bar_${idx}`}
                  type="button"
                  disabled={locked || cd > 0 || hud.energy < sp.energyCost}
                  onClick={() => {
                    if (!locked) {
                      simRef.current?.triggerPlayer1Action(actionKey);
                    }
                  }}
                  title={locked ? `خانة مقفلة ${SKILL_KEYS[idx]} — افتحها من ورشة المهارات` : sp.name}
                  style={{ borderColor: locked ? 'rgba(100,116,139,0.4)' : `${SKILL_ACCENTS[idx]}55` }}
                  className={`px-2.5 py-1.5 rounded-lg font-semibold text-xs border flex items-center gap-1 ${
                    locked
                      ? 'bg-[#0B101B] text-[#64748B] opacity-55 cursor-not-allowed'
                      : 'bg-[#141E36] hover:bg-[#1E2B4B] disabled:opacity-45 text-[#F1F5F9] cursor-pointer'
                  }`}
                >
                  {locked ? (
                    <Lock className="w-3.5 h-3.5 shrink-0 text-[#64748B]" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 shrink-0" style={{ color: SKILL_ACCENTS[idx] }} />
                  )}
                  <span className="max-w-[85px] truncate">
                    {locked ? 'مقفلة' : cd > 0 ? `${cd}ث` : sp.name}
                  </span>
                  <span className="font-mono-num text-[10px] text-[#94A3B8]">{SKILL_KEYS[idx]}</span>
                </button>
              );
            })}

            <button
              type="button"
              disabled={hud.dodgeCd > 0}
              onClick={() => simRef.current?.triggerPlayer1Action('dodge')}
              className="px-2.5 py-1.5 rounded-lg bg-[#121B2D] hover:bg-[#1E2B45] disabled:opacity-50 text-[#F1F5F9] font-semibold text-xs border border-white/10 flex items-center gap-1 cursor-pointer"
            >
              <Wind className="w-3.5 h-3.5 text-[#10B981]" />
              <span>{hud.dodgeCd > 0 ? `${hud.dodgeCd}ث` : 'مراوغة'}</span>
              <span className="font-mono-num text-[10px] text-[#94A3B8]">[Shift]</span>
            </button>

            <button
              type="button"
              onPointerDown={() => simRef.current?.triggerPlayer1Action('block_start')}
              onPointerUp={() => simRef.current?.triggerPlayer1Action('block_end')}
              onPointerLeave={() => simRef.current?.triggerPlayer1Action('block_end')}
              className="px-2.5 py-1.5 rounded-lg bg-[#121B2D] hover:bg-[#1E2B45] text-[#F1F5F9] font-semibold text-xs border border-white/10 flex items-center gap-1 cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5 text-[#94A3B8]" />
              <span>صدّ</span>
              <span className="font-mono-num text-[10px] text-[#94A3B8]">[F]</span>
            </button>

            {hud.isOverworld && (
              <>
                <button
                  type="button"
                  onClick={() => simRef.current?.triggerPlayer1Action('sprint')}
                  className={`px-2.5 py-1.5 rounded-lg font-semibold text-xs border flex items-center gap-1 cursor-pointer ${
                    hud.sprintActive
                      ? 'bg-[#38BDF8] text-[#0A0F1A] border-[#BAE6FD]'
                      : 'bg-[#121B2D] hover:bg-[#1E2B45] text-[#F1F5F9] border-white/10'
                  }`}
                >
                  <Wind className="w-3.5 h-3.5" />
                  <span>ركض</span>
                  <span className="font-mono-num text-[10px] opacity-80">[C]</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowWorldMap(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#102036] hover:bg-[#183052] text-[#38BDF8] font-semibold text-xs border border-[#38BDF8]/35 flex items-center gap-1 cursor-pointer"
                >
                  <MapIcon className="w-3.5 h-3.5" />
                  <span>خريطة</span>
                  <span className="font-mono-num text-[10px]">[M]</span>
                </button>
              </>
            )}

            {/* Consumables Quick Belt */}
            <div className="flex items-center gap-1 border-r border-white/10 pr-2 mr-1">
              <button
                type="button"
                disabled={hud.consumables.elixir_heal <= 0}
                onClick={() => simRef.current?.triggerConsumable('elixir_heal')}
                title="جرعة الشفاء الملكية [1]"
                className="px-2 py-1.5 rounded bg-[#11241E] hover:bg-[#17332A] disabled:opacity-35 text-[#10B981] text-xs font-mono-num flex items-center gap-1 cursor-pointer"
              >
                <Heart className="w-3.5 h-3.5" />
                <span>{hud.consumables.elixir_heal}</span>
              </button>
              <button
                type="button"
                disabled={hud.consumables.scroll_energy <= 0}
                onClick={() => simRef.current?.triggerConsumable('scroll_energy')}
                title="لفيفة الطاقة [2]"
                className="px-2 py-1.5 rounded bg-[#10202C] hover:bg-[#172E40] disabled:opacity-35 text-[#38BDF8] text-xs font-mono-num flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{hud.consumables.scroll_energy}</span>
              </button>
              <button
                type="button"
                disabled={hud.consumables.tonic_fury <= 0}
                onClick={() => simRef.current?.triggerConsumable('tonic_fury')}
                title="إكسير غضب المعركة [3]"
                className="px-2 py-1.5 rounded bg-[#261D10] hover:bg-[#382A16] disabled:opacity-35 text-[#E6B85C] text-xs font-mono-num flex items-center gap-1 cursor-pointer"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>{hud.consumables.tonic_fury}</span>
              </button>
            </div>
          </div>

          <p className="hidden md:block text-[11px] text-[#94A3B8]/90 bg-[#0B101D]/65 px-3 py-0.5 rounded">
            WASD حركة · Q/R/Z/X أربع مهارات · E ثقيلة · G تفاعل{hud.isOverworld ? ' · C ركض · M خريطة' : ''} · V كاميرا
          </p>
        </div>
      )}

      {/* Overworld Fast-Travel Continent Map Modal [M] */}
      {showWorldMap && hud.isOverworld && !matchResult && (
        <div className="absolute inset-0 z-30 bg-[#070B14]/88 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-4xl max-h-[94%] overflow-y-auto isekai-panel rounded-2xl p-3.5 sm:p-6 space-y-4 sm:space-y-5 my-auto">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-[#E6B85C]" />
                <div>
                  <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#F8FAFC]">
                    خريطة قارة إيثيريا العظمى (14,000م · بث القطاعات 100×)
                  </h2>
                  <p className="text-xs text-[#94A3B8]">
                    القطاع الحالي <span className="font-mono-num text-[#38BDF8]">[{hud.currentChunkKey || '0,0'}]</span> · المكتشف:{' '}
                    <span className="font-mono-num text-[#E6B85C]">{profile.exploredChunks.length}</span> قطاعاً · انقر على حجر انتقال مفتوح للسفر الفوري.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWorldMap(false)}
                className="p-2 rounded-lg bg-[#16223A] hover:bg-[#223254] text-[#F1F5F9] cursor-pointer"
                aria-label="إغلاق الخريطة"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Interactive Continent SVG Map (Toggle Kingdom 1400m vs Streamed Continent 14000m) */}
              <div className="lg:col-span-6 bg-[#0A0F1A] border border-white/10 rounded-xl p-3 flex flex-col items-center gap-2">
                <div className="w-full flex items-center justify-between gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setWorldMapScope('kingdom')}
                    className={`flex-1 py-1.5 px-2 rounded-lg font-bold border cursor-pointer ${
                      worldMapScope === 'kingdom'
                        ? 'system-btn-primary'
                        : 'bg-[#0F172A] border-white/10 text-[#94A3B8]'
                    }`}
                  >
                    القلب الملكي (9 أقاليم)
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorldMapScope('continent')}
                    className={`flex-1 py-1.5 px-2 rounded-lg font-bold border cursor-pointer ${
                      worldMapScope === 'continent'
                        ? 'system-btn-primary'
                        : 'bg-[#0F172A] border-white/10 text-[#94A3B8]'
                    }`}
                  >
                    القارة الكاملة (14,000م)
                  </button>
                </div>

                {worldMapScope === 'kingdom' ? (
                  <svg viewBox="-720 -720 1440 1440" className="w-full max-w-[340px] aspect-square">
                    <circle cx={0} cy={0} r={700} fill="#0F1829" stroke="#E6B85C" strokeOpacity={0.35} strokeWidth={8} />
                    {OVERWORLD_MAP.regions?.map((reg) => {
                      const discovered = profile.discoveredRegions.includes(reg.id);
                      return (
                        <g key={reg.id}>
                          <circle
                            cx={reg.x}
                            cy={reg.z}
                            r={reg.radius}
                            fill={reg.color}
                            fillOpacity={discovered ? 0.22 : 0.08}
                            stroke={reg.color}
                            strokeOpacity={discovered ? 0.75 : 0.28}
                            strokeWidth={5}
                          />
                          <text
                            x={reg.x}
                            y={reg.z - reg.radius * 0.25}
                            textAnchor="middle"
                            fill="#F1F5F9"
                            fontSize={36}
                            fontWeight="700"
                          >
                            {reg.name}
                          </text>
                        </g>
                      );
                    })}
                    {OVERWORLD_MAP.worldChests?.map((c) => {
                      const opened = profile.openedWorldChests.includes(c.id);
                      return (
                        <rect
                          key={c.id}
                          x={c.x - 14}
                          y={c.z - 14}
                          width={28}
                          height={28}
                          rx={4}
                          fill={opened ? '#475569' : '#E6B85C'}
                          opacity={opened ? 0.45 : 0.95}
                        />
                      );
                    })}
                    {OVERWORLD_MAP.worldWaystones?.map((ws) => (
                      <circle
                        key={ws.id}
                        cx={ws.x}
                        cy={ws.z}
                        r={20}
                        fill={ws.color}
                        stroke="#FFFFFF"
                        strokeWidth={5}
                      />
                    ))}
                    <circle cx={hud.playerX} cy={hud.playerZ} r={26} fill="#38BDF8" fillOpacity={0.28} />
                    <circle cx={hud.playerX} cy={hud.playerZ} r={14} fill="#F8FAFC" stroke="#E6B85C" strokeWidth={6} />
                  </svg>
                ) : (
                  <svg viewBox="-7150 -7150 14300 14300" className="w-full max-w-[340px] aspect-square">
                    <circle cx={0} cy={0} r={7000} fill="#09101E" stroke="#38BDF8" strokeOpacity={0.45} strokeWidth={70} />
                    <circle cx={0} cy={0} r={4200} fill="none" stroke="#94A3B8" strokeOpacity={0.2} strokeWidth={40} strokeDasharray="180 180" />
                    <circle cx={0} cy={0} r={700} fill="#14233C" fillOpacity={0.65} stroke="#E6B85C" strokeOpacity={0.7} strokeWidth={45} />
                    {profile.exploredChunks.map((key) => {
                      const [cxStr, czStr] = key.split(',');
                      const cx = Number(cxStr) * CHUNK_SIZE;
                      const cz = Number(czStr) * CHUNK_SIZE;
                      if (!Number.isFinite(cx) || !Number.isFinite(cz)) return null;
                      return (
                        <rect
                          key={`chk_${key}`}
                          x={cx - CHUNK_SIZE / 2}
                          y={cz - CHUNK_SIZE / 2}
                          width={CHUNK_SIZE}
                          height={CHUNK_SIZE}
                          fill="#38BDF8"
                          fillOpacity={0.28}
                          stroke="#38BDF8"
                          strokeOpacity={0.55}
                          strokeWidth={16}
                        />
                      );
                    })}
                    {WORLD_EVENT_ZONES.map((ez) => {
                      const done = profile.completedWorldEventIds.includes(ez.id);
                      return (
                        <g key={`ez_${ez.id}`}>
                          <circle
                            cx={ez.x}
                            cy={ez.z}
                            r={Math.max(220, ez.radius)}
                            fill={done ? '#475569' : ez.color}
                            fillOpacity={done ? 0.08 : 0.2}
                            stroke={done ? '#64748B' : '#38BDF8'}
                            strokeWidth={45}
                            strokeDasharray="110 70"
                          />
                        </g>
                      );
                    })}
                    {SECRET_WORLD_BOSSES.map((sb) => {
                      const defeated = profile.defeatedSecretBossIds.includes(sb.id);
                      return (
                        <rect
                          key={`sb_${sb.id}`}
                          x={sb.x - 165}
                          y={sb.z - 165}
                          width={330}
                          height={330}
                          transform={`rotate(45 ${sb.x} ${sb.z})`}
                          fill={defeated ? '#475569' : '#A855F7'}
                          stroke={defeated ? '#64748B' : '#FDE68A'}
                          strokeWidth={48}
                          opacity={defeated ? 0.55 : 1}
                        />
                      );
                    })}
                    <circle cx={hud.playerX} cy={hud.playerZ} r={320} fill="#E6B85C" fillOpacity={0.28} />
                    <circle cx={hud.playerX} cy={hud.playerZ} r={140} fill="#F8FAFC" stroke="#E6B85C" strokeWidth={55} />
                  </svg>
                )}

                <div className="flex flex-wrap justify-center gap-3 text-[11px] text-[#CBD5E1] pt-1">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F8FAFC] border border-[#E6B85C]" /> موقعك الحالي
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#38BDF8]" /> قطاع مُستكشَف
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#E6B85C]" /> صندوق كنز
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rotate-45 bg-[#A855F7] border border-[#FDE68A]" /> زعيم سري
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full border-2 border-[#38BDF8]" /> منطقة حدث
                  </span>
                </div>
              </div>

              {/* 9 Waystones Fast Travel Grid */}
              <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {OVERWORLD_MAP.worldWaystones?.map((ws) => {
                  const unlocked =
                    ws.regionId === 'haven_village' || profile.discoveredRegions.includes(ws.regionId);
                  return (
                    <button
                      key={ws.id}
                      type="button"
                      disabled={!unlocked}
                      onClick={() => {
                        simRef.current?.teleportPlayer(ws.x, ws.z, ws.name);
                        setShowWorldMap(false);
                      }}
                      className={`p-3 rounded-xl border text-right transition-colors flex items-center justify-between gap-2 ${
                        unlocked
                          ? 'bg-[#101A2F] hover:bg-[#192847] border-[#E6B85C]/30 cursor-pointer'
                          : 'bg-[#0C1220] border-white/5 opacity-55 cursor-not-allowed'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="font-display text-sm font-bold text-[#F1F5F9]">
                          {ws.name}
                        </div>
                        <div className="text-[11px] text-[#94A3B8]">
                          {unlocked ? 'متاح للانتقال الفوري' : 'استكشف الإقليم لفتح الحجر'}
                        </div>
                      </div>
                      <Sparkles className="w-4 h-4 shrink-0" style={{ color: unlocked ? ws.color : '#64748B' }} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Peaceful NPC Work & Economy Modal */}
      {activeNpcDef && !matchResult && (
        <div className="absolute inset-0 z-30 bg-[#070B14]/88 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-2xl max-h-[94%] overflow-y-auto isekai-panel rounded-2xl p-3.5 sm:p-6 space-y-4 sm:space-y-5 my-auto">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold" style={{ color: activeNpcDef.accentColor }}>
                  <Briefcase className="w-4 h-4" />
                  <span>{activeNpcDef.title}</span>
                </div>
                <h2 className="font-display text-xl font-extrabold text-[#F8FAFC] mt-0.5">
                  {activeNpcDef.name}
                </h2>
                <p className="text-xs text-[#10B981] mt-1">
                  تم شفاء 25% من صحتك واستعادة طاقتك الكاملة عبر {activeNpcDef.name} ({activeNpcDef.serviceLabel})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveNpcId(null)}
                className="p-2 rounded-lg bg-[#16223A] hover:bg-[#223254] text-[#F1F5F9] cursor-pointer"
                aria-label="إغلاق النافذة"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0C1322] border border-white/10 text-xs sm:text-sm text-[#E2E8F0] leading-relaxed">
              «{activeNpcDef.lines[0]}»
            </div>

            {npcNotice && (
              <div className="px-3.5 py-2 text-xs text-[#FDE68A] bg-[#1B1914] border border-[#E6B85C]/45 rounded-lg">
                {npcNotice}
              </div>
            )}

            {/* NPC Contracts */}
            <div className="space-y-2.5">
              <h3 className="font-display text-sm font-bold text-[#E6B85C]">
                عقود العمل المتاحة لدى {activeNpcDef.name}
              </h3>
              {activeNpcJobs.map((job) => {
                const state = profile.activeNpcJobs[job.id];
                const isAccepted = Boolean(state);
                const isCompleted = Boolean(state?.completed);
                const progress = state?.progress || 0;
                const canComplete = isAccepted && !isCompleted && progress >= job.target;
                return (
                  <div
                    key={job.id}
                    className="p-4 rounded-xl bg-[#101829] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="font-display text-sm font-bold text-[#F1F5F9]">{job.title}</div>
                      <p className="text-xs text-[#94A3B8]">{job.description}</p>
                      <div className="text-xs font-mono-num text-[#CBD5E1]">
                        التقدم: <strong className="text-[#38BDF8]">{progress}/{job.target}</strong> · المكافأة: +{job.rewardGold} ذهب · +{job.rewardGems} جوهرة · +{job.rewardGuildMarks} وسام نقابة
                      </div>
                    </div>
                    <div className="shrink-0">
                      {isCompleted ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#10B981] bg-[#132924] rounded-lg">
                          <CheckCircle2 className="w-3.5 h-3.5" /> مكتمل
                        </span>
                      ) : canComplete ? (
                        <button
                          type="button"
                          onClick={() => {
                            const res = onCompleteNpcJob?.(job.id);
                            if (res) showNpcToast(res.message);
                          }}
                          className="px-4 py-2 text-xs font-bold text-[#0A0F1A] bg-[#E6B85C] hover:bg-[#F5D076] rounded-lg cursor-pointer"
                        >
                          تسليم العقد والمكافأة
                        </button>
                      ) : isAccepted ? (
                        <span className="px-3 py-1.5 text-xs font-semibold text-[#38BDF8] bg-[#102036] rounded-lg inline-block">
                          عقد نشط
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const res = onAcceptNpcJob?.(job.id);
                            if (res) showNpcToast(res.message);
                          }}
                          className="px-4 py-2 text-xs font-bold text-[#F1F5F9] bg-[#182640] hover:bg-[#23375C] border border-[#E6B85C]/30 rounded-lg cursor-pointer"
                        >
                          قبول العقد
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Resource Trade & Guild Marks Exchange */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-[#0D1422] border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#F1F5F9]">بيع مواردك للنقابة</span>
                  <span className="font-mono-num text-[#10B981]">
                    شاراتك: {profile.guildMarks}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-[11px] font-mono-num text-center">
                  <button
                    type="button"
                    disabled={profile.gatheredResources.herb <= 0}
                    onClick={() => {
                      const res = onSellSingleResource?.('herb');
                      if (res) showNpcToast(res.message);
                    }}
                    className="p-2 rounded bg-[#142034] disabled:opacity-40 text-[#CBD5E1] hover:text-white cursor-pointer"
                  >
                    أعشاب ({profile.gatheredResources.herb})
                  </button>
                  <button
                    type="button"
                    disabled={profile.gatheredResources.ore <= 0}
                    onClick={() => {
                      const res = onSellSingleResource?.('ore');
                      if (res) showNpcToast(res.message);
                    }}
                    className="p-2 rounded bg-[#142034] disabled:opacity-40 text-[#CBD5E1] hover:text-white cursor-pointer"
                  >
                    خام ({profile.gatheredResources.ore})
                  </button>
                  <button
                    type="button"
                    disabled={profile.gatheredResources.crystal <= 0}
                    onClick={() => {
                      const res = onSellSingleResource?.('crystal');
                      if (res) showNpcToast(res.message);
                    }}
                    className="p-2 rounded bg-[#142034] disabled:opacity-40 text-[#CBD5E1] hover:text-white cursor-pointer"
                  >
                    بلور ({profile.gatheredResources.crystal})
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const res = onSellAllResources?.();
                    if (res) showNpcToast(res.message);
                  }}
                  className="w-full py-2 text-xs font-bold text-[#0A0F1A] bg-[#10B981] hover:bg-[#34D399] rounded-lg cursor-pointer"
                >
                  بيع كل الموارد مقابل شارات
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0D1422] border border-white/10 space-y-2">
                <div className="text-xs font-bold text-[#F1F5F9]">استبدال شارات النقابة</div>
                <div className="grid grid-cols-1 gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      const res = onExchangeGuildMarks?.('gold');
                      if (res) showNpcToast(res.message);
                    }}
                    className="py-1.5 px-3 rounded bg-[#16223A] hover:bg-[#203050] flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5 text-[#E6B85C]">
                      <Coins className="w-3.5 h-3.5" /> +300 ذهب
                    </span>
                    <span className="font-mono-num text-[#94A3B8]">20 وسام</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const res = onExchangeGuildMarks?.('gems');
                      if (res) showNpcToast(res.message);
                    }}
                    className="py-1.5 px-3 rounded bg-[#16223A] hover:bg-[#203050] flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5 text-[#38BDF8]">
                      <Gem className="w-3.5 h-3.5" /> +12 جوهرة
                    </span>
                    <span className="font-mono-num text-[#94A3B8]">30 وسام</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const res = onExchangeGuildMarks?.('mythic_chest');
                      if (res) showNpcToast(res.message);
                    }}
                    className="py-1.5 px-3 rounded bg-[#16223A] hover:bg-[#203050] flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5 text-[#C084FC]">
                      <Gift className="w-3.5 h-3.5" /> صندوق أسطوري
                    </span>
                    <span className="font-mono-num text-[#94A3B8]">65 وسام</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live In-Game Chat Drawer */}
      {showChatDrawer && !matchResult && onSendChat && (
        <div className="absolute inset-0 z-30 bg-[#070B14]/75 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-5 overflow-y-auto">
          <SystemChatPanel
            playerName={profile.avatar.name}
            playerRating={profile.rating}
            connected={chatConnected}
            connectionMode={chatMode}
            activeRoom={onlineRoom}
            worldMessages={worldMessages}
            roomMessages={roomMessages}
            onSendChat={onSendChat}
            compact
            onClose={() => setShowChatDrawer(false)}
          />
        </div>
      )}

      {/* Pause Overlay */}
      {paused && !matchResult && (
        <div className="absolute inset-0 z-30 bg-[#0A0F1A]/80 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-sm max-h-[94%] overflow-y-auto system-window rounded-2xl p-4 sm:p-6 space-y-3.5 sm:space-y-5 text-center my-auto">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#F8FAFC]">اللعبة متوقفة مؤقتاً</h2>
            <p className="text-xs text-[#94A3B8]">
              يمكنك التحويل بين وضع الهاتف والحاسوب، تفعيل الوضع الأفقي، تبديل مظهر النظام، أو تعديل جودة الأداء.
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={togglePause}
                className="w-full py-2 sm:py-2.5 text-sm font-bold system-btn-primary rounded-xl cursor-pointer"
              >
                استئناف المغامرة
              </button>
              {onToggleSystemTheme && (
                <button
                  type="button"
                  onClick={onToggleSystemTheme}
                  className="w-full py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-[#F1F5F9] bg-[#16223A] hover:bg-[#203050] border border-white/15 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Palette className="w-4 h-4" style={{ color: 'var(--sys-primary)' }} />
                  <span>
                    تبديل السمة: {systemTheme === 'royal_cyan' ? 'النظام الملكي' : 'الهاوية البنفسجية'}
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setSessionNonce((n) => n + 1)}
                className="w-full py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-[#F1F5F9] bg-[#16223A] hover:bg-[#203050] border border-white/10 rounded-xl cursor-pointer"
              >
                إعادة البدء
              </button>
              <button
                type="button"
                onClick={onExit}
                className="w-full py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-[#FCA5A5] bg-[#24131A] hover:bg-[#351B22] border border-[#EF4444]/30 rounded-xl cursor-pointer"
              >
                العودة إلى القائمة الرئيسية
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Victory / Match Summary Modal */}
      {matchResult && (
        <div className="absolute inset-0 z-30 bg-[#0A0F1A]/85 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-lg max-h-[94%] overflow-y-auto isekai-panel rounded-2xl p-4 sm:p-7 space-y-4 sm:space-y-6 my-auto">
            <div className="text-center space-y-1.5">
              <p className="text-xs font-semibold text-[#E6B85C]">
                {displayMap.name} · المدة{' '}
                <span className="font-mono-num">{matchResult.durationSec}ث</span>
              </p>
              <h2 className="font-display text-3xl font-extrabold text-[#F8FAFC]">
                {matchResult.victory ? 'انتصار مستحق!' : 'انتهت المعركة'}
              </h2>
              {matchResult.mode === 'pvp_local' && (
                <p className="text-sm text-[#9AA6B8]">
                  النتيجة النهائية: اللاعب 1 ({matchResult.p1Score}) — ({matchResult.p2Score}) اللاعب 2
                </p>
              )}
              {(matchResult.missionsDone || 0) > 0 && (
                <p className="text-xs text-[#38BDF8] font-semibold">
                  مهام ميدانية منجزة داخل الخريطة: {matchResult.missionsDone}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-lg bg-[#10141C] border border-white/5">
                <div className="text-[11px] text-[#8F9BAE]">المهزومون</div>
                <div className="font-mono-num text-lg font-bold text-[#F2F4F8] mt-0.5">
                  {matchResult.kills}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[#10141C] border border-white/5">
                <div className="text-[11px] text-[#8F9BAE]">أعلى كومبو</div>
                <div className="font-mono-num text-lg font-bold text-[#F59E0B] mt-0.5">
                  {matchResult.maxCombo}x
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[#10141C] border border-white/5">
                <div className="text-[11px] text-[#8F9BAE]">الضرر الكلي</div>
                <div className="font-mono-num text-lg font-bold text-[#F2F4F8] mt-0.5">
                  {matchResult.damageDealt}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[#10141C] border border-white/5">
                <div className="text-[11px] text-[#8F9BAE]">الموجة</div>
                <div className="font-mono-num text-lg font-bold text-[#38BDF8] mt-0.5">
                  {matchResult.waveReached}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-[#1A212C] border border-[#E59A24]/30 flex flex-wrap items-center justify-around gap-3 text-sm">
              <div>
                <span className="text-[#8F9BAE]">الذهب: </span>
                <strong className="font-mono-num text-[#F59E0B]">+{matchResult.goldEarned}</strong>
              </div>
              <div>
                <span className="text-[#8F9BAE]">الخبرة: </span>
                <strong className="font-mono-num text-[#10B981]">+{matchResult.xpEarned} XP</strong>
              </div>
              {matchResult.gemsEarned > 0 && (
                <div>
                  <span className="text-[#8F9BAE]">الجواهر: </span>
                  <strong className="font-mono-num text-[#38BDF8]">+{matchResult.gemsEarned}</strong>
                </div>
              )}
              {matchResult.ratingDelta !== 0 && (
                <div>
                  <span className="text-[#8F9BAE]">التصنيف: </span>
                  <strong
                    className={`font-mono-num ${
                      matchResult.ratingDelta > 0 ? 'text-[#10B981]' : 'text-[#F87171]'
                    }`}
                  >
                    {matchResult.ratingDelta > 0 ? `+${matchResult.ratingDelta}` : matchResult.ratingDelta}
                  </strong>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSessionNonce((n) => n + 1)}
                className="flex-1 py-3 text-sm font-bold text-[#0D1015] bg-[#E59A24] hover:bg-[#F59E0B] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                لعب مجدداً
              </button>
              <button
                type="button"
                onClick={onExit}
                className="flex-1 py-3 text-sm font-semibold text-[#F2F4F8] bg-[#1D2533] hover:bg-[#283244] border border-white/10 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                العودة إلى الساحة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
