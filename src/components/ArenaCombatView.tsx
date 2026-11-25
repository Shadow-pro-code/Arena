import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  Briefcase,
  Camera,
  CheckCircle2,
  Coins,
  Compass,
  Cpu,
  Eye,
  EyeOff,
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
  Sliders,
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
  HudCustomizationConfig,
  KeyBindingsConfig,
  MatchResult,
  OnlineFighterSnapshot,
  OnlineRoomSummary,
  OverworldNodeKind,
  PlayerProfile,
  RenderEngineMode,
  ResolvedRenderEngine,
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
import { WebGLRenderer3D } from '../engine/webglRenderer3d';
import { resolveRenderEngine } from '../engine/webglCapability';
import { CombatSimulation, HudSnapshot } from '../engine/combatSimulation';
import type { OnlineDamageEvent, OnlineVfxEvent } from '../hooks/useMultiplayerSocket';
import { SystemChatPanel } from './SystemChatPanel';
import { HudCustomizerModal } from './HudCustomizerModal';
import { CHUNK_SIZE } from '../engine/worldStreamer';
import { useAdaptiveUI } from '../hooks/useAdaptiveUI';
import {
  DEFAULT_HUD_CONFIG,
  DEFAULT_KEY_BINDINGS,
  formatKeyCodeLabel,
} from '../data/controlDefaults';

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
  onChangeRenderEngine?: (mode: RenderEngineMode) => void;
  onChangeKeyBindings?: (next: KeyBindingsConfig) => void;
  onResetKeyBindings?: () => void;
  onChangeHudConfig?: (next: HudCustomizationConfig) => void;
  onResetHudConfig?: () => void;
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

const QUALITY_CYCLE: GraphicsQuality[] = ['eco', 'balanced', 'high', 'ultra', 'mythic', 'impossible'];

const QUALITY_LABELS: Record<GraphicsQuality, string> = {
  eco: 'اقتصادي',
  balanced: 'متوازن',
  high: 'عالي',
  ultra: 'فائق',
  mythic: 'أسطوري',
  impossible: 'مستحيلة',
};

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
  onChangeRenderEngine,
  onChangeKeyBindings,
  onResetKeyBindings,
  onChangeHudConfig,
  onResetHudConfig,
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
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const simRef = useRef<CombatSimulation | null>(null);
  const rendererRef = useRef<SoftwareRenderer3D | null>(null);
  const webglRendererRef = useRef<WebGLRenderer3D | null>(null);
  const dragCamRef = useRef<{
    active: boolean;
    lastX: number;
    lastY: number;
    moved: number;
    pointerType: string;
    button: number;
  }>({ active: false, lastX: 0, lastY: 0, moved: 0, pointerType: 'mouse', button: 0 });

  const keyBindings = profile.keyBindings || DEFAULT_KEY_BINDINGS;
  const hudConfig = profile.hudConfig || DEFAULT_HUD_CONFIG;
  const keyBindingsRef = useRef(keyBindings);
  keyBindingsRef.current = keyBindings;
  const hudConfigRef = useRef(hudConfig);
  hudConfigRef.current = hudConfig;

  const [forcedFallbackEngine, setForcedFallbackEngine] = useState<'canvas2d' | null>(null);
  const [engineToast, setEngineToast] = useState('');
  const resolvedEngine: ResolvedRenderEngine =
    forcedFallbackEngine ?? resolveRenderEngine(profile.renderEngine || 'auto');

  useEffect(() => {
    setForcedFallbackEngine(null);
  }, [profile.renderEngine]);

  const joystickRef = useRef<HTMLDivElement | null>(null);
  const joyKnobElRef = useRef<HTMLDivElement | null>(null);
  const joyPointerIdRef = useRef<number | null>(null);
  const camPointerIdRef = useRef<number | null>(null);

  const setJoyKnobVisual = (x: number, y: number, active: boolean) => {
    const knob = joyKnobElRef.current;
    if (!knob) return;
    knob.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${active ? 1.06 : 1})`;
  };

  const [paused, setPaused] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [sessionNonce, setSessionNonce] = useState(0);
  const [showWorldMap, setShowWorldMap] = useState(false);
  const [worldMapScope, setWorldMapScope] = useState<'kingdom' | 'continent'>('kingdom');
  const [showChatDrawer, setShowChatDrawer] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [showUtilityDrawer, setShowUtilityDrawer] = useState(false);
  const [activeNpcId, setActiveNpcId] = useState<string | null>(null);
  const [npcNotice, setNpcNotice] = useState('');

  const showWorldMapRef = useRef(showWorldMap);
  showWorldMapRef.current = showWorldMap;
  const activeNpcIdRef = useRef(activeNpcId);
  activeNpcIdRef.current = activeNpcId;
  const showChatDrawerRef = useRef(showChatDrawer);
  showChatDrawerRef.current = showChatDrawer;
  const showCustomizerRef = useRef(showCustomizer);
  showCustomizerRef.current = showCustomizer;
  const showUtilityDrawerRef = useRef(showUtilityDrawer);
  showUtilityDrawerRef.current = showUtilityDrawer;

  const [landscapeMode, setLandscapeMode] = useState<boolean>(profile.landscapeLocked);
  const adaptive = useAdaptiveUI({
    deviceMode: profile.deviceMode,
    landscapeLocked: landscapeMode,
    hudConfig,
  });

  const useCssLandscapeRotation = adaptive.useCssLandscapeRotation;
  const useCssLandscapeRef = useRef(useCssLandscapeRotation);
  useCssLandscapeRef.current = useCssLandscapeRotation;
  const isCompactLandscape = adaptive.isShortLandscape || useCssLandscapeRotation;
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
  const showTouchControls = adaptive.showTouchControls;
  const anyOverlayOpen =
    paused || showWorldMap || showChatDrawer || showCustomizer || Boolean(activeNpcId) || Boolean(matchResult);
  const anyOverlayOpenRef = useRef(anyOverlayOpen);
  anyOverlayOpenRef.current = anyOverlayOpen;

  // Pause simulation automatically when modal overlays are active
  useEffect(() => {
    if (simRef.current) {
      simRef.current.paused = anyOverlayOpen;
    }
    if (anyOverlayOpen) {
      setShowUtilityDrawer(false);
    }
  }, [anyOverlayOpen]);

  // Clean up fullscreen/orientation lock on unmount
  useEffect(() => {
    return () => {
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
  }, [adaptive.useCssLandscapeRotation, adaptive.rawWidth, adaptive.rawHeight]);

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

  // Sync live quality, camera, keybindings, and floating damage setting into active simulation
  useEffect(() => {
    if (simRef.current) {
      simRef.current.quality = profile.quality;
      simRef.current.cameraView = profile.cameraView;
      simRef.current.setKeyBindings(keyBindings);
      simRef.current.setShowFloatingDamage(hudConfig.widgets.floatingDamage);
    }
  }, [profile.quality, profile.cameraView, keyBindings, hudConfig.widgets.floatingDamage]);

  // Reset virtual joystick when switching to desktop touch-off mode
  useEffect(() => {
    if (!showTouchControls) {
      simRef.current?.setVirtualMove(0, 0);
      setJoyKnobVisual(0, 0, false);
    }
  }, [showTouchControls]);

  // Sync incoming online fighters snapshots
  useEffect(() => {
    if (mode === 'pvp_online' && simRef.current && onlineFighters) {
      simRef.current.syncOnlineFighters(onlineFighters);
    }
  }, [mode, onlineFighters]);

  // Initialize simulation & Dual-Engine 3D Loop (WebGL 1/2 OR Canvas2D)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let activeWebGL: WebGLRenderer3D | null = null;
    let overlayCtx: CanvasRenderingContext2D | null = null;
    let swCtx: CanvasRenderingContext2D | null = null;
    let effectiveEngine: ResolvedRenderEngine = resolvedEngine;

    if (effectiveEngine === 'webgl') {
      try {
        activeWebGL = new WebGLRenderer3D(canvas, profile.quality, () => {
          setEngineToast('تم التحويل للمحرك الخفيف مؤقتاً بعد فقدان سياق WebGL');
          setForcedFallbackEngine('canvas2d');
        });
        webglRendererRef.current = activeWebGL;
        rendererRef.current = null;
        if (overlayCanvasRef.current) {
          overlayCtx = overlayCanvasRef.current.getContext('2d');
        }
      } catch {
        effectiveEngine = 'canvas2d';
        setEngineToast('تعذّر تشغيل WebGL — يعمل المحرك الخفيف تلقائياً');
        setForcedFallbackEngine('canvas2d');
        return;
      }
    }

    if (effectiveEngine === 'canvas2d') {
      swCtx = canvas.getContext('2d', { alpha: false });
      if (!swCtx) return;
      rendererRef.current = new SoftwareRenderer3D();
      webglRendererRef.current = null;
    }

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
      keyBindings,
      showFloatingDamage: hudConfig.widgets.floatingDamage,
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
      const baseW = Math.max(320, Math.floor(canvas.clientWidth || (useCssLandscapeRef.current ? rect.height : rect.width)));
      const baseH = Math.max(200, Math.floor(canvas.clientHeight || (useCssLandscapeRef.current ? rect.width : rect.height)));

      if (activeWebGL) {
        activeWebGL.setSize(baseW, baseH);
        const ov = overlayCanvasRef.current;
        if (ov) {
          const ovDpr = Math.min(window.devicePixelRatio || 1, 2);
          const ovW = Math.max(320, Math.floor(baseW * ovDpr));
          const ovH = Math.max(200, Math.floor(baseH * ovDpr));
          if (ov.width !== ovW || ov.height !== ovH) {
            ov.width = ovW;
            ov.height = ovH;
          }
        }
        return;
      }

      const scale =
        q === 'eco'
          ? 0.72
          : q === 'balanced'
            ? Math.min(window.devicePixelRatio || 1, 1.18)
            : q === 'high'
              ? Math.min(window.devicePixelRatio || 1, 1.35)
              : q === 'ultra'
                ? Math.min(window.devicePixelRatio || 1, 1.65)
                : q === 'mythic'
                  ? Math.min(window.devicePixelRatio || 1, 1.85)
                  : Math.min(window.devicePixelRatio || 1, 2.0);
      const w = Math.max(360, Math.floor(baseW * scale));
      const h = Math.max(220, Math.floor(baseH * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };

    resizeCanvasFnRef.current = resize;
    let resizeRafId = 0;
    const scheduleResize = () => {
      if (resizeRafId) cancelAnimationFrame(resizeRafId);
      resizeRafId = requestAnimationFrame(() => {
        resizeRafId = 0;
        if (!disposedLoop) resize();
      });
    };
    const ro = new ResizeObserver(scheduleResize);
    ro.observe(canvas.parentElement || canvas);
    resize();

    const handleKeyDown = (e: KeyboardEvent) => {
      const kb = keyBindingsRef.current;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', kb.jump].includes(e.code)) {
        e.preventDefault();
      }
      if (e.code === 'Escape') {
        if (showUtilityDrawerRef.current) {
          setShowUtilityDrawer(false);
          return;
        }
        if (showCustomizerRef.current) {
          setShowCustomizer(false);
          return;
        }
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
      if (showCustomizerRef.current) return;

      if (e.code === kb.toggleHud) {
        onChangeHudConfig?.({ ...hudConfigRef.current, zenMode: !hudConfigRef.current.zenMode });
        return;
      }
      if (e.code === kb.map && mode === 'world_explore') {
        setActiveNpcId(null);
        setShowChatDrawer(false);
        setShowWorldMap((prev) => !prev);
        return;
      }
      if (showWorldMapRef.current || activeNpcIdRef.current || showChatDrawerRef.current) return;

      if (e.code === kb.camera) {
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
    let scheduledFrame: { cancel: () => void } | null = null;
    let disposedLoop = false;
    let lastTime = performance.now();
    let hudTimer = 0;
    let lastQuality = sim.quality;

    const frame = () => {
      if (disposedLoop) return;
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      if (sim.quality !== lastQuality) {
        lastQuality = sim.quality;
        resize();
      }

      sim.step(dt);
      const payload = sim.getRenderPayload();

      if (activeWebGL) {
        activeWebGL.renderScene(payload, sim.camera, overlayCtx);
      } else if (swCtx) {
        rendererRef.current?.renderScene(swCtx, canvas.width, canvas.height, sim.camera, payload);
      }

      hudTimer += dt;
      if (hudTimer >= 0.08 && !anyOverlayOpenRef.current) {
        hudTimer = 0;
        setHud(sim.getHudSnapshot());
      }

      if (activeWebGL) {
        scheduledFrame = activeWebGL.scheduleNextFrame(frame);
      } else {
        rafId = requestAnimationFrame(frame);
      }
    };

    if (activeWebGL) {
      scheduledFrame = activeWebGL.scheduleNextFrame(frame);
    } else {
      rafId = requestAnimationFrame(frame);
    }

    return () => {
      disposedLoop = true;
      cancelAnimationFrame(rafId);
      if (resizeRafId) cancelAnimationFrame(resizeRafId);
      scheduledFrame?.cancel();
      ro.disconnect();
      sim.dispose();
      if (activeWebGL) {
        activeWebGL.dispose();
        webglRendererRef.current = null;
      }
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
  }, [mode, arenaId, sessionNonce, resolvedEngine]);

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
    if (camPointerIdRef.current !== null && e.pointerType === 'touch') return;
    camPointerIdRef.current = e.pointerId;
    dragCamRef.current = {
      active: true,
      lastX: e.clientX,
      lastY: e.clientY,
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
    if (!dragCamRef.current.active || camPointerIdRef.current !== e.pointerId) return;
    const rawDx = e.clientX - dragCamRef.current.lastX;
    const rawDy = e.clientY - dragCamRef.current.lastY;
    dragCamRef.current.lastX = e.clientX;
    dragCamRef.current.lastY = e.clientY;

    const horizDelta = useCssLandscapeRef.current ? rawDy : rawDx;
    const vertDelta = useCssLandscapeRef.current ? -rawDx : rawDy;
    dragCamRef.current.moved += Math.abs(horizDelta) + Math.abs(vertDelta);

    if (Math.abs(horizDelta) > 0.45 || Math.abs(vertDelta) > 0.45) {
      const sens = hudConfigRef.current.cameraSensitivity ?? 1;
      simRef.current?.rotateCamera(horizDelta * 0.0085 * sens, vertDelta * 0.0055 * sens);
    }
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (camPointerIdRef.current !== null && camPointerIdRef.current !== e.pointerId) return;
    if (
      dragCamRef.current.active &&
      (isMobile || dragCamRef.current.pointerType === 'touch') &&
      dragCamRef.current.moved < 8
    ) {
      simRef.current?.triggerPlayer1Action('attack');
    }
    camPointerIdRef.current = null;
    dragCamRef.current.active = false;
  };

  const handleCanvasWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (anyOverlayOpen) return;
    simRef.current?.zoomCamera(e.deltaY > 0 ? 0.08 : -0.08);
  };

  const updateJoystickFromPointer = (clientX: number, clientY: number) => {
    const el = joystickRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = Math.max(22, (useCssLandscapeRef.current ? rect.height : rect.width) * 0.36);

    const rawDx = clientX - cx;
    const rawDy = clientY - cy;

    let dx = useCssLandscapeRef.current ? rawDy : rawDx;
    let dy = useCssLandscapeRef.current ? -rawDx : rawDy;

    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }

    const norm = Math.min(1, dist / maxR);
    if (norm < 0.06) {
      setJoyKnobVisual(dx * 0.4, dy * 0.4, true);
      simRef.current?.setVirtualMove(0, 0);
      return;
    }

    const rescaled = Math.pow((norm - 0.06) / 0.94, 1.05);
    const inv = dist > 0 ? rescaled / norm : 0;
    setJoyKnobVisual(dx, dy, true);
    simRef.current?.setVirtualMove((dx / maxR) * inv, (dy / maxR) * inv);
  };

  const handleJoyDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    joyPointerIdRef.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore synthetic capture failures
    }
    updateJoystickFromPointer(e.clientX, e.clientY);
  };

  const handleJoyMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joyPointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    updateJoystickFromPointer(e.clientX, e.clientY);
  };

  const handleJoyEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joyPointerIdRef.current !== null && joyPointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore synthetic release failures
    }
    joyPointerIdRef.current = null;
    setJoyKnobVisual(0, 0, false);
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

  const useNarrowPortraitStack = adaptive.effectiveWidth < 560 && !isCompactLandscape;

  return (
    <div
      data-landscape-compact={isCompactLandscape ? 'true' : undefined}
      style={
        useCssLandscapeRotation
          ? {
              width: `${adaptive.effectiveWidth}px`,
              height: `${adaptive.effectiveHeight}px`,
              transform: 'rotate(90deg)',
              transformOrigin: 'top left',
              position: 'fixed',
              top: 0,
              left: `${adaptive.rawWidth}px`,
            }
          : {
              width: '100vw',
              height: '100dvh',
              position: 'fixed',
              top: 0,
              left: 0,
            }
      }
      className="z-40 bg-[#0A0F1A] select-none overflow-hidden touch-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Full-Viewport Dual-Engine 3D Stage (WebGL 1/2 OR Canvas2D) */}
      <canvas
        key={`stage_${resolvedEngine}`}
        ref={canvasRef}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onPointerCancel={handleCanvasPointerUp}
        onWheel={handleCanvasWheel}
        className="absolute inset-0 w-full h-full block cursor-crosshair touch-none"
      />

      {resolvedEngine === 'webgl' && (
        <canvas
          ref={overlayCanvasRef}
          className="pointer-events-none absolute inset-0 w-full h-full z-[1]"
        />
      )}

      {/* Engine Failover Notice */}
      {engineToast && (
        <div className="pointer-events-none fixed top-14 inset-x-0 z-30 flex justify-center px-4">
          <div className="bg-[#0B101D]/95 border border-amber-400/50 text-amber-200 px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2">
            <span>{engineToast}</span>
            <button
              type="button"
              onClick={() => setEngineToast('')}
              className="pointer-events-auto text-slate-300 hover:text-white"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Zen Mode Persistent Restore Button */}
      {hudConfig.zenMode && !anyOverlayOpen && (
        <button
          type="button"
          onClick={() => onChangeHudConfig?.({ ...hudConfig, zenMode: false })}
          title={`إظهار واجهة القتال (${formatKeyCodeLabel(keyBindings.toggleHud)})`}
          className="absolute top-3 left-3 z-20 px-3 py-1.5 rounded-xl bg-[#0B101D]/92 border border-cyan-400/45 text-cyan-200 text-xs font-bold flex items-center gap-1.5 shadow-lg cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>إظهار الواجهة</span>
        </button>
      )}

      {/* Top HUD Layer — True mathematical CSS Grid centering on >=560px/landscape, non-overlapping Row-2 stack on narrow portrait */}
      {!hudConfig.zenMode && (
      <div
        style={{
          opacity: hudConfig.hudOpacity,
          paddingTop: useCssLandscapeRotation ? '0.45rem' : 'max(0.45rem, var(--safe-top))',
          paddingInlineStart: useCssLandscapeRotation ? 'max(0.65rem, var(--safe-top))' : 'max(0.5rem, var(--safe-left))',
          paddingInlineEnd: useCssLandscapeRotation ? 'max(0.65rem, var(--safe-bottom))' : 'max(0.5rem, var(--safe-right))',
        }}
        className={`pointer-events-none absolute top-0 inset-x-0 z-10 grid items-start ${
          useNarrowPortraitStack
            ? 'grid-cols-2 gap-1.5 pb-1.5'
            : 'grid-cols-[1fr_auto_1fr] gap-2'
        } ${isCompactLandscape ? 'pb-1' : 'pb-2 sm:pb-3'}`}
      >
        {/* Top-Right (in RTL Col 1): Slim Player Bar + Compact Mini-Radar */}
        <div
          style={
            adaptive.hudAutoScale !== 1
              ? { transform: `scale(${adaptive.hudAutoScale})`, transformOrigin: 'top right' }
              : undefined
          }
          className={`col-start-1 row-start-1 justify-self-start flex items-start shrink-0 ${
            isCompactLandscape ? 'flex-row gap-1.5' : 'flex-col gap-1.5'
          }`}
        >
          <div
            style={{ width: `${adaptive.playerCardWidthPx}px` }}
            className={`pointer-events-auto bg-[#0B101D]/92 border border-[#E6B85C]/30 rounded-xl space-y-1 ${
              isCompactLandscape ? 'px-2 py-1.5' : 'px-2.5 py-2'
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
          {hudConfig.widgets.radar && (
          <div className="pointer-events-auto bg-[#0B101D]/92 border border-[#38BDF8]/30 rounded-xl p-1 flex flex-col items-center gap-0.5">
            <svg
              viewBox={radarViewBox}
              style={{ width: `${adaptive.radarSizePx}px`, height: `${adaptive.radarSizePx}px` }}
              className="rounded-lg"
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
                <span>خريطة [{formatKeyCodeLabel(keyBindings.map)}]</span>
              </button>
            )}
          </div>
          )}
        </div>

        {/* Top-Center: Dead-Center Grid Track (or centered Row 2 on narrow portrait phones) */}
        <div
          style={{ maxWidth: `${adaptive.centerStripMaxPx}px` }}
          className={`flex flex-col items-center gap-1 min-w-0 shrink ${
            useNarrowPortraitStack
              ? 'col-span-2 row-start-2 justify-self-center'
              : 'col-start-2 row-start-1 justify-self-center'
          }`}
        >
          {(hudConfig.widgets.biomeStrip || !hud.isOverworld) && (
          <div
            className={`bg-[#0B101D]/92 border border-[#E6B85C]/30 rounded-xl text-[#F1F5F9] flex items-center gap-1.5 whitespace-nowrap max-w-full ${
              isCompactLandscape ? 'px-2 py-1 text-[10px]' : 'px-2.5 sm:px-3.5 py-1.5 text-[11px] sm:text-xs'
            }`}
          >
            <span className="font-display font-bold text-[#E6B85C] truncate max-w-[100px] sm:max-w-none">
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
            {hudConfig.widgets.fps && (
              <>
                <span className="hidden sm:inline text-[#475569]">·</span>
                <span className="hidden sm:inline font-mono-num text-[#94A3B8]">
                  {hud.fps} FPS · {resolvedEngine === 'webgl' ? 'WebGL' : '2D'}
                </span>
              </>
            )}
          </div>
          )}

          {hudConfig.widgets.mission && hud.activeMission && !hud.isOverworld && (
            <div className="bg-[#0B101D]/92 border border-[#38BDF8]/30 rounded-lg px-2 py-0.5 flex items-center justify-between gap-2 text-[10px] sm:text-[11px] max-w-full">
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
            <div className="bg-[#0B101D]/92 border border-[#38BDF8]/45 rounded-lg px-2.5 py-0.5 flex items-center gap-2 text-[10px] sm:text-[11px] max-w-full">
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
            <div className="bg-[#181028]/92 border border-[#A855F7]/50 rounded-lg px-2.5 py-0.5 flex items-center gap-1.5 text-[10px] sm:text-[11px] max-w-full">
              <Flame className="w-3 h-3 text-[#E879F9] shrink-0" />
              <span className="font-bold text-[#F3E8FF] truncate">مزار زعيم سري: {hud.activeSecretBossName}</span>
            </div>
          )}

          {hudConfig.widgets.bossBar && hud.bossName && hud.bossHp !== undefined && hud.bossMaxHp && (
            <div className="w-full max-w-[240px] sm:max-w-[288px] bg-[#0B101D]/92 border border-[#F97316]/45 rounded-lg px-2 py-1 space-y-0.5">
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

          {hudConfig.widgets.bossBar &&
            (mode === 'pvp_ranked' || mode === 'pvp_local' || mode === 'unified_clash') &&
            hud.opponentName &&
            hud.opponentHp !== undefined &&
            hud.opponentMaxHp && (
              <div className="w-full max-w-[220px] sm:max-w-[272px] bg-[#0B101D]/92 border border-white/15 rounded-lg px-2 py-1 space-y-0.5">
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

        {/* Top-Left (in RTL Col 3 / Row 1 Col 2 on narrow portrait): Adaptive Utility & Customizer Strip */}
        <div
          style={
            adaptive.hudAutoScale !== 1
              ? { transform: `scale(${adaptive.hudAutoScale})`, transformOrigin: 'top left' }
              : undefined
          }
          className={`pointer-events-auto relative flex items-center justify-end gap-1 shrink-0 row-start-1 justify-self-end ${
            useNarrowPortraitStack ? 'col-start-2' : 'col-start-3'
          }`}
        >
          {adaptive.topBarDensity === 'minimal_drawer' ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setShowUtilityDrawer(false);
                  setShowCustomizer(true);
                }}
                title="تخصيص الواجهة والأزرار والمحرك والجودة"
                className="min-h-[32px] px-2 py-1 text-[10px] font-bold rounded-lg border flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer bg-[#102036] hover:bg-[#183052] text-cyan-200 border-cyan-400/40"
              >
                <Sliders className="w-3.5 h-3.5 text-cyan-300" />
                <span>تخصيص</span>
              </button>

              <button
                type="button"
                onClick={() => setShowUtilityDrawer((v) => !v)}
                aria-expanded={showUtilityDrawer}
                title="أدوات العرض والكاميرا والتحكم"
                className={`min-h-[32px] px-2 py-1 text-[10px] font-bold rounded-lg border flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
                  showUtilityDrawer
                    ? 'system-btn-primary'
                    : 'bg-[#0B101D]/92 text-[#F1F5F9] border-white/15 hover:bg-[#16223A]'
                }`}
              >
                <Cpu className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span>أدوات</span>
              </button>

              <button
                type="button"
                onClick={togglePause}
                title="إيقاف مؤقت (Esc)"
                className="min-h-[32px] min-w-[32px] flex items-center justify-center p-1 text-[#F1F5F9] bg-[#0B101D]/92 hover:bg-[#16223A] border border-white/15 rounded-lg shrink-0 cursor-pointer"
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
                className="min-h-[32px] px-2 py-1 text-[10px] font-bold text-[#FCA5A5] bg-[#24131A]/95 hover:bg-[#381A22] border border-[#EF4444]/40 rounded-lg flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>

              {showUtilityDrawer && (
                <div className="absolute top-full left-0 mt-1.5 w-52 max-w-[82vw] bg-[#0B101D]/96 border border-[#38BDF8]/40 rounded-xl p-2 shadow-2xl grid grid-cols-2 gap-1.5 z-30">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUtilityDrawer(false);
                      onChangeHudConfig?.({ ...hudConfig, zenMode: true });
                    }}
                    className="px-2 py-1.5 rounded-lg bg-[#131D32] hover:bg-[#1B2B49] border border-white/10 text-[11px] font-semibold text-[#F1F5F9] flex items-center gap-1.5 cursor-pointer"
                  >
                    <EyeOff className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    <span className="truncate">إخفاء HUD</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onChangeDeviceMode(isMobile ? 'desktop' : 'mobile')}
                    className={`px-2 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer ${
                      isMobile
                        ? 'bg-[#E6B85C] text-[#0A0F1A] border-[#FDE68A]/50'
                        : 'bg-[#131D32] text-[#F1F5F9] border-white/10'
                    }`}
                  >
                    {isMobile ? <Smartphone className="w-3.5 h-3.5 shrink-0" /> : <Monitor className="w-3.5 h-3.5 text-[#E6B85C] shrink-0" />}
                    <span className="truncate">{isMobile ? 'هاتف' : 'حاسوب'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleLandscape}
                    className={`px-2 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer ${
                      landscapeMode
                        ? 'bg-[#38BDF8] text-[#0A0F1A] border-[#BAE6FD]/60'
                        : 'bg-[#131D32] text-[#F1F5F9] border-white/10'
                    }`}
                  >
                    {landscapeMode ? <Minimize2 className="w-3.5 h-3.5 shrink-0" /> : <Maximize2 className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />}
                    <span className="truncate">{landscapeMode ? 'إنهاء أفقي' : 'وضع أفقي'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCycleCamera}
                    className="px-2 py-1.5 rounded-lg bg-[#131D32] hover:bg-[#1B2B49] border border-white/10 text-[11px] font-semibold text-[#F1F5F9] flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-[#E6B85C] shrink-0" />
                    <span className="truncate">{CAMERA_LABELS[profile.cameraView]}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCycleQuality}
                    className="px-2 py-1.5 rounded-lg bg-[#131D32] hover:bg-[#1B2B49] border border-white/10 text-[11px] font-semibold text-[#F1F5F9] flex items-center gap-1.5 cursor-pointer"
                  >
                    <Cpu className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
                    <span className="truncate">{QUALITY_LABELS[profile.quality]}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => simRef.current?.rotateCamera(Math.PI / 4, 0)}
                    className="px-2 py-1.5 rounded-lg bg-[#131D32] hover:bg-[#1B2B49] border border-white/10 text-[11px] font-semibold text-[#F1F5F9] flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">تدوير 45°</span>
                  </button>

                  <button
                    type="button"
                    onClick={onToggleSound}
                    className="px-2 py-1.5 rounded-lg bg-[#131D32] hover:bg-[#1B2B49] border border-white/10 text-[11px] font-semibold text-[#F1F5F9] flex items-center gap-1.5 cursor-pointer"
                  >
                    {profile.soundEnabled ? <Volume2 className="w-3.5 h-3.5 shrink-0" /> : <VolumeX className="w-3.5 h-3.5 shrink-0" />}
                    <span className="truncate">{profile.soundEnabled ? 'كتم' : 'تفعيل'}</span>
                  </button>

                  {onSendChat && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowUtilityDrawer(false);
                        setShowChatDrawer((prev) => !prev);
                      }}
                      className="px-2 py-1.5 rounded-lg bg-[#131D32] hover:bg-[#1B2B49] border border-white/10 text-[11px] font-semibold text-[#38BDF8] flex items-center gap-1.5 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">الدردشة</span>
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-wrap items-center justify-end gap-1">
              <button
                type="button"
                onClick={() => setShowCustomizer(true)}
                title="تخصيص الواجهة والأزرار والمحرك والجودة"
                className="min-h-[34px] px-2 py-1 text-[11px] sm:text-xs font-bold rounded-lg border flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer bg-[#102036] hover:bg-[#183052] text-cyan-200 border-cyan-400/40"
              >
                <Sliders className="w-3.5 h-3.5 text-cyan-300" />
                <span>تخصيص</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeHudConfig?.({ ...hudConfig, zenMode: true })}
                title={`إخفاء الواجهة (${formatKeyCodeLabel(keyBindings.toggleHud)})`}
                className="min-h-[34px] min-w-[34px] flex items-center justify-center p-1 text-[#F1F5F9] bg-[#0B101D]/92 hover:bg-[#16223A] border border-white/15 rounded-lg shrink-0 cursor-pointer"
              >
                <EyeOff className="w-3.5 h-3.5 text-slate-300" />
              </button>

              <button
                type="button"
                onClick={() => onChangeDeviceMode(isMobile ? 'desktop' : 'mobile')}
                title="تحويل وضع التحكم بين الهاتف والحاسوب"
                className={`min-h-[34px] px-2 py-1 text-[11px] sm:text-xs font-bold rounded-lg border flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  isMobile
                    ? 'bg-[#E6B85C] text-[#0A0F1A] border-[#FDE68A]/50'
                    : 'bg-[#0B101D]/92 text-[#F1F5F9] border-white/15 hover:bg-[#16223A]'
                }`}
              >
                {isMobile ? <Smartphone className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5 text-[#E6B85C]" />}
                {adaptive.topBarDensity === 'full' && <span>{isMobile ? 'هاتف' : 'حاسوب'}</span>}
              </button>

              <button
                type="button"
                onClick={handleToggleLandscape}
                title="فتح الشاشة بوضع أفقي وملء الشاشة"
                className={`min-h-[34px] px-2 py-1 text-[11px] sm:text-xs font-bold rounded-lg border flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  landscapeMode
                    ? 'bg-[#38BDF8] text-[#0A0F1A] border-[#BAE6FD]/60'
                    : 'bg-[#0B101D]/92 text-[#F1F5F9] border-white/15 hover:bg-[#16223A]'
                }`}
              >
                {landscapeMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5 text-[#38BDF8]" />}
                {adaptive.topBarDensity === 'full' && <span>{landscapeMode ? 'إنهاء الأفقي' : 'أفقي'}</span>}
              </button>

              <button
                type="button"
                onClick={handleCycleCamera}
                title={`الكاميرا: ${CAMERA_LABELS[profile.cameraView]}`}
                className="min-h-[34px] px-2 py-1 text-[11px] sm:text-xs font-semibold text-[#F1F5F9] bg-[#0B101D]/92 hover:bg-[#16223A] border border-white/15 rounded-lg flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-[#E6B85C]" />
                {adaptive.topBarDensity === 'full' && <span className="hidden lg:inline">{CAMERA_LABELS[profile.cameraView]}</span>}
              </button>

              <button
                type="button"
                onClick={handleCycleQuality}
                title={`الجودة: ${QUALITY_LABELS[profile.quality]}`}
                className="min-h-[34px] px-2 py-1 text-[11px] sm:text-xs font-semibold text-[#F1F5F9] bg-[#0B101D]/92 hover:bg-[#16223A] border border-white/15 rounded-lg flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Cpu className="w-3.5 h-3.5 text-[#38BDF8]" />
                {adaptive.topBarDensity === 'full' && <span className="hidden lg:inline">{QUALITY_LABELS[profile.quality]}</span>}
              </button>

              <button
                type="button"
                onClick={() => simRef.current?.rotateCamera(Math.PI / 4, 0)}
                title="تدوير زاوية الكاميرا"
                className="min-h-[34px] min-w-[34px] flex items-center justify-center p-1 text-[#F1F5F9] bg-[#0B101D]/92 hover:bg-[#16223A] border border-white/15 rounded-lg shrink-0 cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={onToggleSound}
                title="تبديل الصوت"
                className="min-h-[34px] min-w-[34px] flex items-center justify-center p-1 text-[#F1F5F9] bg-[#0B101D]/92 hover:bg-[#16223A] border border-white/15 rounded-lg shrink-0 cursor-pointer"
              >
                {profile.soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>

              {onSendChat && (
                <button
                  type="button"
                  onClick={() => setShowChatDrawer((prev) => !prev)}
                  title="دردشة العالم والغرفة الحية"
                  className={`min-h-[34px] min-w-[34px] px-2 py-1 text-[11px] font-bold rounded-lg border flex items-center justify-center gap-1 shrink-0 cursor-pointer transition-colors ${
                    showChatDrawer
                      ? 'system-btn-primary'
                      : 'bg-[#0B101D]/92 text-[#38BDF8] hover:bg-[#16223A] border-white/15'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  {adaptive.topBarDensity === 'full' && <span className="hidden lg:inline">الدردشة</span>}
                </button>
              )}

              <button
                type="button"
                onClick={togglePause}
                title="إيقاف مؤقت (Esc)"
                className="min-h-[34px] min-w-[34px] flex items-center justify-center p-1 text-[#F1F5F9] bg-[#0B101D]/92 hover:bg-[#16223A] border border-white/15 rounded-lg shrink-0 cursor-pointer"
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
                className="min-h-[34px] px-2.5 py-1 text-[11px] sm:text-xs font-bold text-[#FCA5A5] bg-[#24131A]/95 hover:bg-[#381A22] border border-[#EF4444]/40 rounded-lg flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>خروج</span>
              </button>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Peaceful NPC Dialogue Toast */}
      {hud.npcDialogue && !matchResult && !activeNpcId && (
        <div
          className={`pointer-events-none absolute inset-x-0 z-20 flex justify-center px-4 ${
            isCompactLandscape ? 'top-12' : useNarrowPortraitStack ? 'top-28' : 'top-16 sm:top-20'
          }`}
        >
          <div className="max-w-lg bg-[#0B101D]/95 border border-[#10B981]/50 rounded-xl px-3.5 py-2 text-center shadow-lg">
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
            isCompactLandscape ? 'top-16' : useNarrowPortraitStack ? 'top-32' : 'top-24 sm:top-28'
          }`}
        >
          <div className="bg-[#0B101D]/92 border border-[#E6B85C]/50 px-4 py-1.5 rounded-xl font-display text-xs sm:text-base font-bold text-[#FEF3C7] text-center shadow-lg">
            {koAnnouncement || hud.bannerText}
          </div>
        </div>
      )}

      {/* Overworld Proximity Interact Prompt (Chests / Nodes / Peaceful NPCs / Portals) */}
      {hud.nearbyInteractable && !anyOverlayOpen && (
        <div
          className={`pointer-events-none absolute inset-x-0 z-20 flex justify-center px-4 ${
            isCompactLandscape ? 'bottom-2.5' : showTouchControls ? 'bottom-44' : 'bottom-20'
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
            {!showTouchControls && (
              <span className="font-mono-num text-xs font-extrabold bg-[#0A0F1A]/15 px-2 py-0.5 rounded">
                [G]
              </span>
            )}
          </button>
        </div>
      )}

      {/* TOUCH / MOBILE MODE: Adaptive Anti-Collision 360° Joystick + 4-Skill Deck + Jump */}
      {showTouchControls && !anyOverlayOpen && !hudConfig.zenMode && (
        <>
          {/* Right Thumb: Consumables + Sprint/Map + 360° Analog Joystick */}
          <div
            onPointerDown={(e) => e.stopPropagation()}
            onPointerMove={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            style={{
              opacity: hudConfig.hudOpacity,
              transform:
                adaptive.touchDeckAutoScale !== 1 || hudConfig.joystickOffset.x !== 0 || hudConfig.joystickOffset.y !== 0
                  ? `translate(${hudConfig.joystickOffset.x}px, ${hudConfig.joystickOffset.y}px) scale(${adaptive.touchDeckAutoScale})`
                  : undefined,
              transformOrigin: 'bottom right',
              bottom: useCssLandscapeRotation ? '0.5rem' : 'max(0.5rem, var(--safe-bottom))',
              right: useCssLandscapeRotation ? 'max(0.65rem, var(--safe-top))' : 'max(0.5rem, var(--safe-right))',
            }}
            className={`absolute z-20 flex flex-col items-end touch-none ${
              hudConfig.mobilePreset === 'spread' ? 'gap-2' : 'gap-1'
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
                className="min-w-[34px] min-h-[34px] px-1 rounded-xl bg-[#0B101D]/92 border border-[#10B981]/50 disabled:opacity-35 text-[#10B981] flex flex-col items-center justify-center text-[9px] font-bold"
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
                className="min-w-[34px] min-h-[34px] px-1 rounded-xl bg-[#0B101D]/92 border border-[#38BDF8]/50 disabled:opacity-35 text-[#38BDF8] flex flex-col items-center justify-center text-[9px] font-bold"
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
                className="min-w-[34px] min-h-[34px] px-1 rounded-xl bg-[#0B101D]/92 border border-[#E6B85C]/50 disabled:opacity-35 text-[#E6B85C] flex flex-col items-center justify-center text-[9px] font-bold"
              >
                <Flame className="w-3.5 h-3.5" />
                <span className="font-mono-num">{hud.consumables.tonic_fury}</span>
              </button>
              <button
                type="button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  simRef.current?.triggerPlayer1Action('sprint');
                }}
                className={`min-w-[34px] min-h-[34px] px-1.5 rounded-xl border flex flex-col items-center justify-center text-[9px] font-bold ${
                  hud.sprintActive
                    ? 'bg-[#38BDF8] text-[#0A0F1A] border-[#BAE6FD]'
                    : 'bg-[#0B101D]/92 text-[#38BDF8] border-[#38BDF8]/40'
                }`}
              >
                <Wind className="w-3.5 h-3.5" />
                <span>ركض</span>
              </button>
              {hud.isOverworld && isCompactLandscape && (
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setShowWorldMap(true);
                  }}
                  className="min-w-[34px] min-h-[34px] px-1.5 rounded-xl border border-[#38BDF8]/45 bg-[#102036] text-[#38BDF8] flex flex-col items-center justify-center text-[9px] font-bold"
                >
                  <MapIcon className="w-3.5 h-3.5" />
                  <span>خريطة</span>
                </button>
              )}
            </div>

            <div
              ref={joystickRef}
              onPointerDown={handleJoyDown}
              onPointerMove={handleJoyMove}
              onPointerUp={handleJoyEnd}
              onPointerCancel={handleJoyEnd}
              style={{ width: `${adaptive.joystickSizePx}px`, height: `${adaptive.joystickSizePx}px` }}
              className="relative rounded-full bg-[#0B101D]/82 border-2 border-[#E6B85C]/40 flex items-center justify-center touch-none cursor-grab active:cursor-grabbing"
            >
              <div className="absolute inset-3 rounded-full border border-white/10 pointer-events-none" />
              <div
                ref={joyKnobElRef}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#E6B85C]/95 border-2 border-[#FEF3C7] shadow-lg pointer-events-none will-change-transform"
              />
            </div>
          </div>

          {/* Left Thumb: Responsive 4-Skill Deck (2x2 on narrow portrait, 1x4 otherwise) + Jump + Dodge + Guard + Attack */}
          <div
            onPointerDown={(e) => e.stopPropagation()}
            onPointerMove={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            style={{
              opacity: hudConfig.hudOpacity,
              transform:
                adaptive.touchDeckAutoScale !== 1 || hudConfig.actionsOffset.x !== 0 || hudConfig.actionsOffset.y !== 0
                  ? `translate(${hudConfig.actionsOffset.x}px, ${hudConfig.actionsOffset.y}px) scale(${adaptive.touchDeckAutoScale})`
                  : undefined,
              transformOrigin: 'bottom left',
              bottom: useCssLandscapeRotation ? '0.5rem' : 'max(0.5rem, var(--safe-bottom))',
              left: useCssLandscapeRotation ? 'max(0.65rem, var(--safe-bottom))' : 'max(0.5rem, var(--safe-left))',
            }}
            className={`absolute z-20 flex flex-col items-start touch-none ${
              hudConfig.mobilePreset === 'spread' ? 'gap-2' : 'gap-1.5'
            }`}
          >
            {/* Row 1: 4 Labeled Skill Tiles */}
            <div
              className={
                adaptive.touchDeckLayout === 'narrow_portrait'
                  ? 'grid grid-cols-2 gap-1'
                  : 'flex items-center gap-1'
              }
            >
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
                      width: `${adaptive.skillTileWidthPx}px`,
                      minHeight: `${adaptive.skillTileHeightPx}px`,
                      borderColor: locked ? 'rgba(100,116,139,0.4)' : `${SKILL_ACCENTS[idx]}88`,
                    }}
                    className={`px-1.5 py-1 rounded-xl border text-[#F1F5F9] flex flex-col items-center justify-center gap-0.5 transition-transform ${
                      locked
                        ? 'bg-[#080C15]/92 opacity-55 cursor-not-allowed'
                        : 'bg-[#101A2F]/95 disabled:opacity-40 active:scale-95'
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

            {/* Row 2: Jump + Dodge + Guard + Heavy + Primary Attack */}
            <div className="flex items-end gap-1">
              <button
                type="button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  simRef.current?.triggerPlayer1Action('jump');
                }}
                style={{ width: `${adaptive.actionBtnSizePx}px`, height: `${adaptive.actionBtnSizePx}px` }}
                className="rounded-xl bg-[#0F2438]/95 border border-cyan-400/55 text-cyan-200 flex flex-col items-center justify-center gap-0.5 active:scale-95 shrink-0"
              >
                <ArrowUp className="w-4 h-4 text-cyan-300" />
                <span className="text-[9px] font-bold">قفز</span>
              </button>

              <button
                type="button"
                disabled={hud.dodgeCd > 0}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  simRef.current?.triggerPlayer1Action('dodge');
                }}
                style={{ width: `${adaptive.actionBtnSizePx}px`, height: `${adaptive.actionBtnSizePx}px` }}
                className="rounded-xl bg-[#121B2D]/95 border border-white/20 disabled:opacity-45 text-[#F1F5F9] flex flex-col items-center justify-center gap-0.5 active:scale-95 shrink-0"
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
                style={{ width: `${adaptive.actionBtnSizePx}px`, height: `${adaptive.actionBtnSizePx}px` }}
                className="rounded-xl bg-[#121B2D]/95 border border-white/20 text-[#F1F5F9] flex flex-col items-center justify-center gap-0.5 active:bg-[#22324F] shrink-0"
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
                style={{ minHeight: `${adaptive.actionBtnSizePx}px` }}
                className="min-w-[46px] sm:min-w-[56px] max-w-[66px] sm:max-w-[74px] px-1.5 rounded-xl bg-[#16223A]/95 border-2 border-[#E6B85C]/65 disabled:opacity-45 text-[#F1F5F9] flex flex-col items-center justify-center gap-0.5 active:scale-95 shrink-0"
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
                style={{
                  width: `${adaptive.actionBtnSizePx + (adaptive.tier === 'xs_portrait' ? 6 : 10)}px`,
                  height: `${adaptive.actionBtnSizePx + (adaptive.tier === 'xs_portrait' ? 6 : 10)}px`,
                }}
                className="rounded-full bg-[#E6B85C] active:bg-[#F5D076] text-[#0A0F1A] border-2 border-[#FEF3C7] font-bold flex flex-col items-center justify-center gap-0.5 shadow-lg active:scale-95 shrink-0"
              >
                <Swords className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-[9px] sm:text-[10px] font-extrabold">هجوم</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* DESKTOP MODE: Compact Bottom Interactive Action Bar with Jump & Dynamic Keybindings */}
      {!showTouchControls && !anyOverlayOpen && !hudConfig.zenMode && (
        <div
          style={{
            opacity: hudConfig.hudOpacity,
            transform: adaptive.hudAutoScale !== 1 ? `scale(${adaptive.hudAutoScale})` : undefined,
            transformOrigin: 'bottom center',
            bottom: useCssLandscapeRotation ? '0.5rem' : 'max(0.625rem, var(--safe-bottom))',
          }}
          className="absolute inset-x-0 z-10 px-3 flex flex-col items-center gap-1.5 pointer-events-none"
        >
          <div className="pointer-events-auto max-w-[96vw] flex flex-wrap items-center justify-center gap-1.5 bg-[#0B101D]/94 border border-[#E6B85C]/30 rounded-xl p-1.5">
            <button
              type="button"
              onClick={() => simRef.current?.triggerPlayer1Action('attack')}
              className="px-3 py-1.5 rounded-lg bg-[#E6B85C] hover:bg-[#F5D076] text-[#0A0F1A] font-bold text-xs flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Swords className="w-3.5 h-3.5" />
              <span>هجوم</span>
              <span className="font-mono-num text-[10px] opacity-80">[{formatKeyCodeLabel(keyBindings.attack)}]</span>
            </button>

            <button
              type="button"
              onClick={() => simRef.current?.triggerPlayer1Action('jump')}
              className="px-2.5 py-1.5 rounded-lg bg-[#0F2438] hover:bg-[#173552] text-cyan-200 font-semibold text-xs border border-cyan-400/40 flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowUp className="w-3.5 h-3.5 text-cyan-300" />
              <span>قفز</span>
              <span className="font-mono-num text-[10px] text-cyan-300/80">[{formatKeyCodeLabel(keyBindings.jump)}]</span>
            </button>

            <button
              type="button"
              disabled={hud.heavyCd > 0}
              onClick={() => simRef.current?.triggerPlayer1Action('heavy')}
              className="px-2.5 py-1.5 rounded-lg bg-[#16223A] hover:bg-[#203050] disabled:opacity-50 text-[#F1F5F9] font-semibold text-xs border border-white/10 flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-[#E6B85C]" />
              <span className="max-w-[90px] truncate">
                {hud.heavyCd > 0 ? `${hud.heavyCd}ث` : weapon.heavySkillName}
              </span>
              <span className="font-mono-num text-[10px] text-[#94A3B8]">[{formatKeyCodeLabel(keyBindings.heavy)}]</span>
            </button>

            {/* 4 Skill Slots (Gated to unlockedSkillSlots) */}
            {slotPowers.map((sp, idx) => {
              const locked = idx >= hud.unlockedSkillSlots;
              const cd = hud.slotCooldowns[idx] || 0;
              const actionKey = (`skill${idx}`) as 'skill0' | 'skill1' | 'skill2' | 'skill3';
              const keyLabel = formatKeyCodeLabel(keyBindings[actionKey]);
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
                  title={locked ? `خانة مقفلة [${keyLabel}] — افتحها من ورشة المهارات` : sp.name}
                  style={{ borderColor: locked ? 'rgba(100,116,139,0.4)' : `${SKILL_ACCENTS[idx]}55` }}
                  className={`px-2.5 py-1.5 rounded-lg font-semibold text-xs border flex items-center gap-1 whitespace-nowrap shrink-0 ${
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
                  <span className="font-mono-num text-[10px] text-[#94A3B8]">[{keyLabel}]</span>
                </button>
              );
            })}

            <button
              type="button"
              disabled={hud.dodgeCd > 0}
              onClick={() => simRef.current?.triggerPlayer1Action('dodge')}
              className="px-2.5 py-1.5 rounded-lg bg-[#121B2D] hover:bg-[#1E2B45] disabled:opacity-50 text-[#F1F5F9] font-semibold text-xs border border-white/10 flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Wind className="w-3.5 h-3.5 text-[#10B981]" />
              <span>{hud.dodgeCd > 0 ? `${hud.dodgeCd}ث` : 'مراوغة'}</span>
              <span className="font-mono-num text-[10px] text-[#94A3B8]">[{formatKeyCodeLabel(keyBindings.dodge)}]</span>
            </button>

            <button
              type="button"
              onPointerDown={() => simRef.current?.triggerPlayer1Action('block_start')}
              onPointerUp={() => simRef.current?.triggerPlayer1Action('block_end')}
              onPointerLeave={() => simRef.current?.triggerPlayer1Action('block_end')}
              className="px-2.5 py-1.5 rounded-lg bg-[#121B2D] hover:bg-[#1E2B45] text-[#F1F5F9] font-semibold text-xs border border-white/10 flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5 text-[#94A3B8]" />
              <span>صدّ</span>
              <span className="font-mono-num text-[10px] text-[#94A3B8]">[{formatKeyCodeLabel(keyBindings.block)}]</span>
            </button>

            <button
              type="button"
              onClick={() => simRef.current?.triggerPlayer1Action('sprint')}
              className={`px-2.5 py-1.5 rounded-lg font-semibold text-xs border flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
                hud.sprintActive
                  ? 'bg-[#38BDF8] text-[#0A0F1A] border-[#BAE6FD]'
                  : 'bg-[#121B2D] hover:bg-[#1E2B45] text-[#F1F5F9] border-white/10'
              }`}
            >
              <Wind className="w-3.5 h-3.5" />
              <span>ركض</span>
              <span className="font-mono-num text-[10px] opacity-80">[{formatKeyCodeLabel(keyBindings.sprint)}]</span>
            </button>

            {hud.isOverworld && (
              <button
                type="button"
                onClick={() => setShowWorldMap(true)}
                className="px-2.5 py-1.5 rounded-lg bg-[#102036] hover:bg-[#183052] text-[#38BDF8] font-semibold text-xs border border-[#38BDF8]/35 flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span>خريطة</span>
                <span className="font-mono-num text-[10px]">[{formatKeyCodeLabel(keyBindings.map)}]</span>
              </button>
            )}

            {/* Consumables Quick Belt */}
            <div className="flex items-center gap-1 border-r border-white/10 pr-2 mr-1">
              <button
                type="button"
                disabled={hud.consumables.elixir_heal <= 0}
                onClick={() => simRef.current?.triggerConsumable('elixir_heal')}
                title={`جرعة الشفاء الملكية [${formatKeyCodeLabel(keyBindings.potion1)}]`}
                className="px-2 py-1.5 rounded bg-[#11241E] hover:bg-[#17332A] disabled:opacity-35 text-[#10B981] text-xs font-mono-num flex items-center gap-1 cursor-pointer"
              >
                <Heart className="w-3.5 h-3.5" />
                <span>{hud.consumables.elixir_heal}</span>
              </button>
              <button
                type="button"
                disabled={hud.consumables.scroll_energy <= 0}
                onClick={() => simRef.current?.triggerConsumable('scroll_energy')}
                title={`لفيفة الطاقة [${formatKeyCodeLabel(keyBindings.potion2)}]`}
                className="px-2 py-1.5 rounded bg-[#10202C] hover:bg-[#172E40] disabled:opacity-35 text-[#38BDF8] text-xs font-mono-num flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{hud.consumables.scroll_energy}</span>
              </button>
              <button
                type="button"
                disabled={hud.consumables.tonic_fury <= 0}
                onClick={() => simRef.current?.triggerConsumable('tonic_fury')}
                title={`إكسير غضب المعركة [${formatKeyCodeLabel(keyBindings.potion3)}]`}
                className="px-2 py-1.5 rounded bg-[#261D10] hover:bg-[#382A16] disabled:opacity-35 text-[#E6B85C] text-xs font-mono-num flex items-center gap-1 cursor-pointer"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>{hud.consumables.tonic_fury}</span>
              </button>
            </div>
          </div>

          {hudConfig.widgets.controlsHint && adaptive.showDesktopShortcutLine && (
          <p className="text-[11px] text-[#94A3B8] bg-[#0B101D]/90 px-3 py-0.5 rounded border border-white/5">
            {formatKeyCodeLabel(keyBindings.moveForward)}/{formatKeyCodeLabel(keyBindings.moveBackward)}/{formatKeyCodeLabel(keyBindings.moveLeft)}/{formatKeyCodeLabel(keyBindings.moveRight)} حركة · {formatKeyCodeLabel(keyBindings.jump)} قفز · {formatKeyCodeLabel(keyBindings.attack)} أو النقر هجوم · اسحب لتدوير الكاميرا 360° · عجلة الفأرة للتقريب
          </p>
          )}
        </div>
      )}

      {/* Overworld Fast-Travel Continent Map Modal [M] */}
      {showWorldMap && hud.isOverworld && !matchResult && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute inset-0 z-30 bg-[#070B14]/92 flex flex-col p-2 sm:p-5 overflow-y-auto overscroll-contain"
        >
          <div className="m-auto w-full max-w-4xl max-h-full landscape-modal-card flex flex-col isekai-panel rounded-2xl overflow-hidden">
            <div className="landscape-modal-header flex items-center justify-between gap-2 border-b border-white/10 p-3 sm:px-6 sm:pt-5 sm:pb-3 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Compass className="w-5 h-5 text-[#E6B85C] shrink-0" />
                <div className="min-w-0">
                  <h2 className="font-display text-sm sm:text-xl font-extrabold text-[#F8FAFC] truncate">
                    خريطة قارة إيثيريا العظمى (14,000م · بث القطاعات 100×)
                  </h2>
                  <p className="landscape-modal-subtitle text-[11px] sm:text-xs text-[#94A3B8] truncate">
                    القطاع الحالي <span className="font-mono-num text-[#38BDF8]">[{hud.currentChunkKey || '0,0'}]</span> · المكتشف:{' '}
                    <span className="font-mono-num text-[#E6B85C]">{profile.exploredChunks.length}</span> قطاعاً · انقر على حجر انتقال مفتوح للسفر الفوري.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWorldMap(false)}
                className="p-2 rounded-lg bg-[#16223A] hover:bg-[#223254] text-[#F1F5F9] cursor-pointer shrink-0"
                aria-label="إغلاق الخريطة"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="landscape-modal-body flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 landscape-split-12 gap-3.5 sm:gap-5 items-start">
              {/* Interactive Continent SVG Map (Toggle Kingdom 1400m vs Streamed Continent 14000m) */}
              <div className="lg:col-span-6 landscape-span-5 bg-[#0A0F1A] border border-white/10 rounded-xl p-2.5 sm:p-3 flex flex-col items-center gap-2">
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
              <div className="lg:col-span-6 landscape-span-7 grid grid-cols-1 sm:grid-cols-2 gap-2">
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
        </div>
      )}

      {/* Peaceful NPC Work & Economy Modal */}
      {activeNpcDef && !matchResult && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute inset-0 z-30 bg-[#070B14]/92 flex flex-col p-2 sm:p-6 overflow-y-auto overscroll-contain"
        >
          <div className="m-auto w-full max-w-2xl max-h-full landscape-modal-card flex flex-col isekai-panel rounded-2xl overflow-hidden">
            <div className="landscape-modal-header flex items-start justify-between gap-3 border-b border-white/10 p-3.5 sm:px-6 sm:pt-5 sm:pb-3 shrink-0">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold" style={{ color: activeNpcDef.accentColor }}>
                  <Briefcase className="w-4 h-4" />
                  <span>{activeNpcDef.title}</span>
                </div>
                <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#F8FAFC] mt-0.5">
                  {activeNpcDef.name}
                </h2>
                <p className="landscape-modal-subtitle text-xs text-[#10B981] mt-1">
                  تم شفاء 25% من صحتك واستعادة طاقتك الكاملة عبر {activeNpcDef.name} ({activeNpcDef.serviceLabel})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveNpcId(null)}
                className="p-2 rounded-lg bg-[#16223A] hover:bg-[#223254] text-[#F1F5F9] cursor-pointer shrink-0"
                aria-label="إغلاق النافذة"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="landscape-modal-body flex-1 min-h-0 overflow-y-auto overscroll-contain p-3.5 sm:p-6 space-y-4 sm:space-y-5">
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
        </div>
      )}

      {/* Live In-Game Chat Drawer */}
      {showChatDrawer && !matchResult && onSendChat && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute inset-0 z-30 bg-[#070B14]/88 flex flex-col p-2.5 sm:p-5 overflow-y-auto overscroll-contain"
        >
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
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute inset-0 z-30 bg-[#0A0F1A]/90 flex flex-col p-2.5 sm:p-4 overflow-y-auto overscroll-contain"
        >
          <div className="m-auto w-full max-w-sm max-h-full overflow-y-auto overscroll-contain system-window rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4 text-center">
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
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute inset-0 z-30 bg-[#0A0F1A]/92 flex flex-col p-2.5 sm:p-4 overflow-y-auto overscroll-contain"
        >
          <div className="m-auto w-full max-w-lg max-h-full overflow-y-auto overscroll-contain isekai-panel rounded-2xl p-4 sm:p-7 space-y-4 sm:space-y-5">
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

      {/* HUD, Keybindings, Quality & Dual-Engine Customizer Modal */}
      <HudCustomizerModal
        open={showCustomizer}
        onClose={() => setShowCustomizer(false)}
        renderEngine={profile.renderEngine || 'auto'}
        onChangeRenderEngine={(m) => onChangeRenderEngine?.(m)}
        quality={profile.quality}
        onChangeQuality={onChangeQuality}
        hudConfig={hudConfig}
        onChangeHudConfig={(cfg) => onChangeHudConfig?.(cfg)}
        onResetHudConfig={() => onResetHudConfig?.()}
        keyBindings={keyBindings}
        onChangeKeyBindings={(kb) => onChangeKeyBindings?.(kb)}
        onResetKeyBindings={() => onResetKeyBindings?.()}
      />
    </div>
  );
};
