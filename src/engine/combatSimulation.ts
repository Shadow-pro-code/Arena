import type {
  ArenaDef,
  ArenaId,
  AvatarConfig,
  CameraViewMode,
  ConsumableId,
  GameMode,
  GearId,
  GearSlot,
  GraphicsQuality,
  KeyBindingsConfig,
  MatchResult,
  MonsterArchetype,
  OnlineFighterSnapshot,
  OverworldNodeDef,
  OverworldNodeKind,
  PowerId,
  RivalChampion,
  SceneryPropDef,
  SecretBossDef,
  WorldChestDef,
  WorldEventZoneDef,
  WorldFastTravelDef,
} from '../types/game';
import { DEFAULT_KEY_BINDINGS } from '../data/controlDefaults';
import {
  ARENAS,
  CONSUMABLES,
  MONSTERS,
  OVERWORLD_MAP,
  POWERS,
  RIVAL_CHAMPIONS,
  SECRET_WORLD_BOSSES,
  WEAPONS,
  WORLD_EVENT_ZONES,
  computeFighterDerivedStats,
  computeSkillNetworkBonuses,
} from '../data/gameCatalog';
import {
  Camera3D,
  RenderDashTrail,
  RenderFighter,
  RenderFloatingText,
  RenderLightningVfx,
  RenderMonster,
  RenderParticle,
  RenderPickup,
  RenderProjectile,
  RenderRingVfx,
  RenderScenePayload,
  RenderSlashVfx,
} from './renderer3d';
import { audioSynth } from './audioSynth';
import { CHUNK_SIZE, ChunkWorldStreamer, classifyChunkBiome } from './worldStreamer';

interface SimFighter extends RenderFighter {
  vx: number;
  vy: number;
  vz: number;
  energy: number;
  maxEnergy: number;
  attackCooldown: number;
  heavyCooldown: number;
  powerCooldown: number;
  secondaryCooldown: number;
  slotCooldowns: [number, number, number, number];
  dodgeCooldown: number;
  dodgeTimer: number;
  dodgeChainTimer: number;
  coyoteTimer: number;
  jumpBufferTimer: number;
  squashTimer: number;
  invulnTimer: number;
  shieldTimer: number;
  overdriveTimer: number;
  stunTimer: number;
  magmaTickTimer: number;
  onHighGround: boolean;
  terrainNote: string;
  isAi: boolean;
  aiDifficulty: number;
  aiDecisionTimer: number;
  aiStrafeDir: number;
  weaponLevel: number;
  statsDerived: ReturnType<typeof computeFighterDerivedStats>;
  isRemote?: boolean;
}

interface SimMonster extends RenderMonster {
  vx: number;
  vy: number;
  vz: number;
  attackCooldown: number;
  stunTimer: number;
  telegraphMax: number;
  pendingStrike: boolean;
  flankSlot: number;
  enraged: boolean;
  secretBossId?: string;
  eventZoneId?: string;
  dmgMult?: number;
}

interface SimProjectile extends RenderProjectile {
  ownerId: string;
  team: 'player1' | 'player2' | 'enemy';
  damage: number;
  knockback: number;
  life: number;
  homing: boolean;
  critical: boolean;
  chillEffect?: boolean;
}

interface SimParticle extends RenderParticle {
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}

interface SimFloatingText extends RenderFloatingText {
  vy: number;
  life: number;
  maxLife: number;
}

interface SimSlash extends RenderSlashVfx {
  life: number;
  maxLife: number;
}

interface SimRing extends RenderRingVfx {
  life: number;
  maxLife: number;
  growSpeed: number;
}

interface SimLightning extends RenderLightningVfx {
  life: number;
  maxLife: number;
}

interface SimDashTrail extends RenderDashTrail {
  life: number;
  maxLife: number;
}

interface PendingMeteor {
  x: number;
  z: number;
  delay: number;
  damage: number;
  ownerId: string;
  color: string;
}

export interface RadarPoint {
  x: number;
  z: number;
  kind:
    | 'player'
    | 'monster'
    | 'boss'
    | 'rival'
    | 'shrine_heal'
    | 'shrine_energy'
    | 'shrine_fury'
    | 'shrine_cd'
    | 'chest'
    | 'portal'
    | 'npc'
    | 'node'
    | 'waystone'
    | 'secret_boss'
    | 'event_zone';
}

export interface LiveMissionStatus {
  title: string;
  progress: number;
  target: number;
  rewardText: string;
}

export interface HudSnapshot {
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  wave: number;
  kills: number;
  combo: number;
  comboTimer: number;
  heavyCd: number;
  heavyMaxCd: number;
  powerCd: number;
  powerMaxCd: number;
  secondaryCd: number;
  secondaryMaxCd: number;
  slotCooldowns: [number, number, number, number];
  slotMaxCooldowns: [number, number, number, number];
  dodgeCd: number;
  sprintActive: boolean;
  playerX: number;
  playerZ: number;
  scoreP1: number;
  scoreP2: number;
  opponentName?: string;
  opponentHp?: number;
  opponentMaxHp?: number;
  bossName?: string;
  bossHp?: number;
  bossMaxHp?: number;
  elapsedSec: number;
  bannerText: string;
  fps: number;
  onlineCount: number;
  arenaRadius: number;
  playerYaw: number;
  radarPoints: RadarPoint[];
  onHighGround: boolean;
  terrainNote: string;
  activeMission: LiveMissionStatus | null;
  missionsDone: number;
  consumables: Record<ConsumableId, number>;
  isOverworld: boolean;
  currentRegionName?: string;
  nearbyInteractable?: {
    label: string;
    kind: 'chest' | 'npc' | 'portal' | 'node' | 'secret_boss' | 'event_zone';
    sublabel?: string;
  } | null;
  npcDialogue?: string | null;
  discoveredRegionsCount?: number;
  totalRegionsCount?: number;
  openedChestsCount?: number;
  totalChestsCount?: number;
  discoveredWaystonesCount?: number;
  totalWaystonesCount?: number;
  unlockedSkillSlots: 1 | 2 | 3 | 4;
  currentChunkKey?: string;
  activeChunksCount?: number;
  discoveredChunksCount?: number;
  currentBiomeColor?: string;
  activeSecretBossName?: string;
  activeEventZoneName?: string;
  activeEventProgress?: string;
}

export interface CombatInitOptions {
  mode: GameMode;
  arenaId: ArenaId;
  playerAvatar: AvatarConfig;
  playerWeaponLevel: number;
  equippedGear?: Record<GearSlot, GearId | null>;
  unlockedSkillSlots?: 1 | 2 | 3 | 4;
  powerLevels?: Partial<Record<PowerId, number>>;
  unlockedNetworkNodes?: string[];
  initialExploredChunks?: string[];
  onExploreChunk?: (chunkKey: string) => void;
  consumables?: Record<ConsumableId, number>;
  onConsumeItem?: (id: ConsumableId) => boolean;
  initialDiscoveredRegions?: string[];
  initialOpenedChests?: string[];
  initialDefeatedSecretBossIds?: string[];
  initialCompletedWorldEventIds?: string[];
  onDiscoverRegion?: (regionId: string, name: string, gold: number, xp: number) => void;
  onOpenWorldChest?: (chest: WorldChestDef) => void;
  onWarpPortal?: (arenaId: ArenaId) => void;
  onGatherNode?: (kind: OverworldNodeKind, label: string) => void;
  onOpenNpcWork?: (npcId: string) => void;
  onDefeatSecretBoss?: (boss: SecretBossDef) => void;
  onCompleteWorldEvent?: (zone: WorldEventZoneDef) => void;
  onCritLanded?: () => void;
  onFusionCast?: () => void;
  quality: GraphicsQuality;
  cameraView: CameraViewMode;
  keyBindings?: KeyBindingsConfig;
  showFloatingDamage?: boolean;
  rivalChampion?: RivalChampion;
  localP2Avatar?: AvatarConfig;
  onlineSelfId?: string;
  onOnlineStateSend?: (state: {
    x: number;
    y: number;
    z: number;
    yaw: number;
    animState: RenderFighter['animState'];
    animTimer: number;
    comboStep: number;
    shieldActive: boolean;
    overdriveActive: boolean;
    energy: number;
  }) => void;
  onOnlineHitSend?: (payload: {
    targetId: string;
    damage: number;
    critical: boolean;
    knockX: number;
    knockZ: number;
  }) => void;
  onOnlineVfxSend?: (payload: { kind: string; x: number; z: number; color: string; radius: number }) => void;
  onFinish: (result: MatchResult) => void;
}

export class CombatSimulation {
  public arena: ArenaDef;
  public mode: GameMode;
  public quality: GraphicsQuality;
  public cameraView: CameraViewMode;
  public paused = false;
  public finished = false;

  public fighters: SimFighter[] = [];
  public monsters: SimMonster[] = [];
  public projectiles: SimProjectile[] = [];
  public rings: SimRing[] = [];
  public slashes: SimSlash[] = [];
  public lightnings: SimLightning[] = [];
  public dashTrails: SimDashTrail[] = [];
  public pickups: RenderPickup[] = [];
  public particles: SimParticle[] = [];
  public floatingTexts: SimFloatingText[] = [];
  private pendingMeteors: PendingMeteor[] = [];

  public camera: Camera3D;
  private camYaw = 0;
  private camPitch = 0.42;
  private camZoom = 1.0;
  private shakeTimer = 0;
  private shakeIntensity = 0;
  private hitstopTimer = 0;
  private keyBindings: KeyBindingsConfig;
  private showFloatingDamage = true;

  private time = 0;
  private wave = 1;
  private waveDelayTimer = 0;
  private hazardTimer = 5.5;
  private pickupTimer = 7.0;
  private kills = 0;
  private bossKills = 0;
  private monsterKillsByType: Partial<Record<MonsterArchetype, number>> = {};
  private combo = 0;
  private maxCombo = 0;
  private comboTimer = 0;
  private damageDealt = 0;
  private scoreP1 = 0;
  private scoreP2 = 0;
  private bannerText = '';
  private bannerTimer = 0;
  private onlineSendTimer = 0;

  private missionIndex = 0;
  private missionProgress = 0;
  private missionsDone = 0;
  private bonusMissionGold = 0;
  private localConsumables: Record<ConsumableId, number>;

  private keys = new Set<string>();
  private virtualInput = { mx: 0, mz: 0 };
  private shrineCooldowns: Record<string, number> = {};
  private fpsSamples = 60;
  private idCounter = 1;

  private opts: CombatInitOptions;
  private rivalChampion: RivalChampion;

  private discoveredRegions = new Set<string>(['haven_village']);
  private discoveredWaystones = new Set<string>(['ws_haven']);
  private openedChests = new Set<string>();
  private nodeRespawns: Record<string, number> = {};
  private sprintActive = false;
  private bufferedAction: {
    kind: 'attack' | 'heavy' | 'skill0' | 'skill1' | 'skill2' | 'skill3' | 'dodge';
    expiresAt: number;
  } | null = null;
  private currentRegionName = 'قرية الملاذ الآمنة';
  private npcDialogue: string | null = null;
  private npcDialogueTimer = 0;
  private npcLineIdx = 0;
  private overworldRespawnTimer = 0;
  private unlockedSkillSlots: 1 | 2 | 3 | 4 = 1;
  private powerLevels: Partial<Record<PowerId, number>> = {};
  private unlockedNetworkNodes: string[] = ['node_core_awakening'];
  private chunkStreamer: ChunkWorldStreamer | null = null;
  private streamedProps: SceneryPropDef[] = [];
  private streamedNodes: OverworldNodeDef[] = [];
  private streamedChests: WorldChestDef[] = [];
  private streamedWaystones: WorldFastTravelDef[] = [];
  private currentChunkKey = '0,0';
  private activeChunksCount = 9;
  private currentBiomeColor = '#22C55E';
  private currentBiomeSkyTint = '#18365C';
  private critsLanded = 0;
  private fusionCasts = 0;
  private secretBossesDefeatedCount = 0;
  private worldEventsCompletedCount = 0;
  private defeatedSecretBossIds = new Set<string>();
  private completedWorldEventIds = new Set<string>();
  private activeEventZone: { def: WorldEventZoneDef; wave: number; waveCount: number } | null = null;
  private nearbyInteractable: {
    label: string;
    sublabel?: string;
    kind: 'chest' | 'npc' | 'portal' | 'node' | 'secret_boss' | 'event_zone';
    targetId: string;
    arenaId?: ArenaId;
  } | null = null;
  private roundResetTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(opts: CombatInitOptions) {
    this.opts = opts;
    this.mode = opts.mode;
    this.arena = opts.mode === 'world_explore' ? OVERWORLD_MAP : ARENAS[opts.arenaId];
    this.quality = opts.quality;
    this.cameraView = opts.cameraView;
    this.keyBindings = { ...DEFAULT_KEY_BINDINGS, ...(opts.keyBindings || {}) };
    this.showFloatingDamage = opts.showFloatingDamage ?? true;
    this.rivalChampion = opts.rivalChampion || RIVAL_CHAMPIONS[0];
    this.unlockedSkillSlots = opts.unlockedSkillSlots ?? 1;
    this.powerLevels = opts.powerLevels || {};
    this.unlockedNetworkNodes = opts.unlockedNetworkNodes || ['node_core_awakening'];
    if (opts.initialDiscoveredRegions) {
      opts.initialDiscoveredRegions.forEach((id) => this.discoveredRegions.add(id));
    }
    if (opts.initialOpenedChests) {
      opts.initialOpenedChests.forEach((id) => this.openedChests.add(id));
    }
    if (opts.initialDefeatedSecretBossIds) {
      opts.initialDefeatedSecretBossIds.forEach((id) => this.defeatedSecretBossIds.add(id));
    }
    if (opts.initialCompletedWorldEventIds) {
      opts.initialCompletedWorldEventIds.forEach((id) => this.completedWorldEventIds.add(id));
    }
    this.localConsumables = {
      elixir_heal: opts.consumables?.elixir_heal ?? 2,
      scroll_energy: opts.consumables?.scroll_energy ?? 1,
      tonic_fury: opts.consumables?.tonic_fury ?? 1,
    };

    if (this.mode === 'world_explore') {
      this.chunkStreamer = new ChunkWorldStreamer(OVERWORLD_MAP, opts.initialExploredChunks || ['0,0']);
    }

    this.camera = {
      pos: { x: 0, y: 10, z: 14 },
      target: { x: 0, y: 1.5, z: 0 },
      fov: 48,
      near: 0.45,
    };

    this.initEntities();
  }

  private nextId(prefix: string): string {
    return `${prefix}_${this.idCounter++}`;
  }

  public getTerrainHeight(x: number, z: number): number {
    let h = 0;
    for (const plat of this.arena.platforms) {
      if (Math.hypot(x - plat.x, z - plat.z) <= plat.radius) {
        if (plat.height > h) h = plat.height;
      }
    }
    return h;
  }

  private createFighter(
    id: string,
    avatar: AvatarConfig,
    x: number,
    z: number,
    yaw: number,
    team: RenderFighter['team'],
    weaponLevel: number,
    isAi: boolean,
    aiDifficulty = 0.7,
    isRemote = false,
    equippedGear?: Record<GearSlot, GearId | null>
  ): SimFighter {
    const derived = computeFighterDerivedStats(avatar, weaponLevel, equippedGear);
    const netBonus = team === 'player1' ? computeSkillNetworkBonuses(this.unlockedNetworkNodes) : null;
    const bonusMaxEnergy = derived.maxEnergy + (netBonus ? netBonus.bonusEnergy : 0);
    const groundY = this.getTerrainHeight(x, z);
    return {
      id,
      name: avatar.name,
      avatar,
      x,
      y: groundY,
      z,
      vx: 0,
      vy: 0,
      vz: 0,
      yaw,
      hp: derived.maxHp,
      maxHp: derived.maxHp,
      energy: bonusMaxEnergy,
      maxEnergy: bonusMaxEnergy,
      animState: 'idle',
      animTime: 0,
      walkPhase: 0,
      comboStep: 0,
      hitFlash: 0,
      shieldActive: false,
      overdriveActive: false,
      frozenTimer: 0,
      bankAngle: 0,
      squash: 1,
      isAirborne: false,
      team,
      attackCooldown: 0,
      heavyCooldown: 0,
      powerCooldown: 0,
      secondaryCooldown: 0,
      slotCooldowns: [0, 0, 0, 0],
      dodgeCooldown: 0,
      dodgeTimer: 0,
      dodgeChainTimer: 0,
      coyoteTimer: 0.12,
      jumpBufferTimer: 0,
      squashTimer: 0,
      invulnTimer: 0,
      shieldTimer: 0,
      overdriveTimer: 0,
      stunTimer: 0,
      magmaTickTimer: 0,
      onHighGround: groundY > 0.2,
      terrainNote: '',
      isAi,
      aiDifficulty,
      aiDecisionTimer: 0.4,
      aiStrafeDir: 1,
      weaponLevel,
      statsDerived: derived,
      isRemote,
    };
  }

  private initEntities() {
    const selfId = this.opts.onlineSelfId || 'p1';
    const startX = this.mode === 'pvp_ranked' || this.mode === 'pvp_local' ? -6.8 : 0;
    const startZ = this.mode === 'pvp_ranked' || this.mode === 'pvp_local' ? 0 : this.mode === 'world_explore' ? 8.2 : 6.2;
    const startYaw = this.mode === 'pvp_ranked' || this.mode === 'pvp_local' ? Math.PI / 2 : Math.PI;

    const p1 = this.createFighter(
      selfId,
      this.opts.playerAvatar,
      startX,
      startZ,
      startYaw,
      'player1',
      this.opts.playerWeaponLevel,
      false,
      0,
      false,
      this.opts.equippedGear
    );
    this.fighters.push(p1);

    if (this.mode === 'world_explore') {
      this.updateOverworldStreaming(p1.x, p1.z, true);
      this.showBanner('قارة إيثيريا (14,000م · بث الخريطة النشط) — استكشف المقاطع واجمع الموارد!', 3.2);
    } else if (this.mode === 'pvp_ranked') {
      const rival = this.createFighter(
        'rival_champ',
        this.rivalChampion.avatar,
        6.8,
        0,
        -Math.PI / 2,
        'enemy',
        Math.max(1, Math.min(4, Math.floor(this.rivalChampion.rating / 450))),
        true,
        this.rivalChampion.aiDifficulty
      );
      this.fighters.push(rival);
      this.showBanner(`نزال مصنف: ضد ${this.rivalChampion.name}`, 2.6);
    } else if (this.mode === 'pvp_local') {
      const p2Avatar = this.opts.localP2Avatar || RIVAL_CHAMPIONS[1].avatar;
      const p2 = this.createFighter('p2', p2Avatar, 6.8, 0, -Math.PI / 2, 'player2', 2, false);
      this.fighters.push(p2);
      this.showBanner('مبارزة محلية 1 ضد 1 — الجولة 1', 2.6);
    } else if (this.mode === 'pvp_online') {
      this.showBanner('ساحة التنافس المباشر أونلاين', 2.4);
    } else if (this.mode === 'monster_raid') {
      this.spawnWave(1);
      this.showBanner('غارة سلسلة الوحوش — الموجة 1 من 6', 2.4);
    } else if (this.mode === 'unified_clash') {
      this.spawnWave(1);
      this.showBanner('الميدان الموحد: وحوش + أبطال + مهام الخريطة!', 2.6);
    } else {
      this.spawnWave(1);
      this.showBanner('قتال حر — ابدأ السيطرة على الساحة!', 2.4);
    }

    const ambCount =
      this.quality === 'eco'
        ? 6
        : this.quality === 'balanced'
          ? 16
          : this.quality === 'high'
            ? 24
            : this.quality === 'impossible'
              ? 36
              : 32;
    for (let i = 0; i < ambCount; i++) {
      this.spawnAmbientMote();
    }
  }

  private updateOverworldStreaming(px: number, pz: number, initial = false) {
    if (!this.chunkStreamer) return;
    const res = this.chunkStreamer.update(px, pz, this.quality);
    if (!res.changed && !initial) return;

    this.currentChunkKey = res.currentChunkKey;
    this.activeChunksCount = res.activeChunksCount;
    this.currentBiomeColor = res.currentBiomeColor;
    const biomeSpec = classifyChunkBiome(res.currentChunkCoord.cx, res.currentChunkCoord.cz);
    this.currentBiomeSkyTint = biomeSpec.skyTint;
    this.streamedProps = res.activeProps;
    this.streamedNodes = res.activeNodes;
    this.streamedChests = res.activeChests;
    this.streamedWaystones = res.activeWaystones;

    for (const nk of res.newlyEnteredKeys) {
      this.opts.onExploreChunk?.(nk);
      if (!initial && nk !== '0,0') {
        this.spawnFloatingText(px, 2.8, pz, `مقطع جديد [${nk}] +20 ذهب`, '#38BDF8', 1.08);
      }
    }

    // Unload distant monsters cleanly when chunks unload (protect active secret bosses & event mobs)
    const maxMonsterDist = CHUNK_SIZE * (res.streamRadiusChunks + 1.5);
    this.monsters = this.monsters.filter(
      (m) => Boolean(m.secretBossId) || Boolean(m.eventZoneId) || Math.hypot(m.x - px, m.z - pz) <= maxMonsterDist
    );

    // Spawn chunk monsters up to cap (22 active monsters for optimal framerate)
    for (const spot of res.pendingPatrols) {
      if (this.monsters.length >= 22) break;
      this.spawnSingleOverworldMonster(spot.archetype, spot.x, spot.z);
    }
  }

  private spawnSingleOverworldMonster(archetype: MonsterArchetype, x: number, z: number) {
    if (Math.hypot(x, z) < 22) return;
    const def = MONSTERS[archetype] || MONSTERS.ash_stalker;
    this.monsters.push({
      id: this.nextId('wmon'),
      archetype,
      name: def.name,
      x,
      y: this.getTerrainHeight(x, z),
      z,
      vx: 0,
      vy: 0,
      vz: 0,
      yaw: Math.random() * Math.PI * 2,
      hp: def.maxHp,
      maxHp: def.maxHp,
      walkPhase: Math.random() * 5,
      attackTimer: 0,
      attackCooldown: 1.0 + Math.random() * 0.8,
      telegraphTimer: 0,
      telegraphMax: 0.75,
      telegraphRadius: def.isBoss ? 4.8 : 2.9,
      pendingStrike: false,
      hitFlash: 0,
      frozenTimer: 0,
      stunTimer: 0,
      isBoss: def.isBoss,
      flankSlot: this.idCounter % 5,
      enraged: false,
    });
  }

  private spawnOverworldBiomesMonsters(targetCount: number) {
    const p1 = this.getPlayer1();
    const px = p1 ? p1.x : 0;
    const pz = p1 ? p1.z : 0;
    const coord = { cx: Math.round(px / CHUNK_SIZE), cz: Math.round(pz / CHUNK_SIZE) };
    const biome = classifyChunkBiome(coord.cx, coord.cz);
    if (!biome.monsters || biome.monsters.length === 0) return;

    let attempts = 0;
    while (this.monsters.length < Math.min(20, targetCount) && attempts < 14) {
      attempts++;
      const ang = Math.random() * Math.PI * 2;
      const dist = 28 + Math.random() * 75;
      const mx = px + Math.cos(ang) * dist;
      const mz = pz + Math.sin(ang) * dist;
      if (Math.hypot(mx, mz) < 26 || Math.hypot(mx, mz) > this.arena.radius - 12) continue;
      const arch = biome.monsters[Math.floor(Math.random() * biome.monsters.length)];
      this.spawnSingleOverworldMonster(arch, mx, mz);
    }
  }

  public showBanner(text: string, duration = 2.2) {
    this.bannerText = text;
    this.bannerTimer = duration;
  }

  public setKey(code: string, down: boolean) {
    if (down) {
      this.keys.add(code);
      this.handleInstantKeyPress(code);
    } else {
      this.keys.delete(code);
    }
  }

  public setVirtualMove(mx: number, mz: number) {
    this.virtualInput.mx = mx;
    this.virtualInput.mz = mz;
  }

  public setKeyBindings(kb: KeyBindingsConfig) {
    this.keyBindings = { ...DEFAULT_KEY_BINDINGS, ...kb };
  }

  public setShowFloatingDamage(show: boolean) {
    this.showFloatingDamage = show;
  }

  public rotateCameraYaw(delta: number) {
    this.camYaw += delta;
  }

  public rotateCamera(dYaw: number, dPitch = 0) {
    this.camYaw += dYaw;
    if (dPitch !== 0) {
      this.camPitch = Math.max(0.08, Math.min(1.25, this.camPitch + dPitch));
    }
  }

  public zoomCamera(delta: number) {
    this.camZoom = Math.max(0.65, Math.min(1.5, this.camZoom + delta));
  }

  public syncOnlineFighters(remoteSnapshots: OnlineFighterSnapshot[]) {
    if (this.mode !== 'pvp_online') return;
    const selfId = this.opts.onlineSelfId;
    const seen = new Set<string>();
    for (const snap of remoteSnapshots) {
      if (snap.id === selfId) {
        const self = this.getPlayer1();
        if (self) {
          self.hp = snap.hp;
          self.maxHp = snap.maxHp;
          this.scoreP1 = snap.kills;
        }
        continue;
      }
      seen.add(snap.id);
      const existing = this.fighters.find((f) => f.id === snap.id);
      if (existing) {
        existing.x += (snap.x - existing.x) * 0.45;
        existing.z += (snap.z - existing.z) * 0.45;
        existing.y = this.getTerrainHeight(existing.x, existing.z);
        existing.yaw = snap.yaw;
        existing.hp = snap.hp;
        existing.maxHp = snap.maxHp;
        existing.animState = snap.animState;
        existing.animTime = snap.animTimer;
        existing.comboStep = snap.comboStep;
        existing.shieldActive = snap.shieldActive;
        existing.overdriveActive = snap.overdriveActive;
      } else {
        const rf = this.createFighter(
          snap.id,
          snap.avatar,
          snap.x,
          snap.z,
          snap.yaw,
          'enemy',
          snap.weaponLevel,
          false,
          0,
          true
        );
        rf.hp = snap.hp;
        rf.maxHp = snap.maxHp;
        this.fighters.push(rf);
        this.showBanner(`انضم المقاتل ${snap.name} إلى الساحة!`, 2.2);
      }
    }
    this.fighters = this.fighters.filter((f) => !f.isRemote || seen.has(f.id));
  }

  public applyOnlineDamageEvent(ev: {
    attackerId: string;
    targetId: string;
    damage: number;
    critical: boolean;
    hp: number;
    knockX: number;
    knockZ: number;
  }) {
    const target = this.fighters.find((f) => f.id === ev.targetId);
    if (!target) return;
    target.hp = ev.hp;
    target.hitFlash = 1;
    target.vx += ev.knockX;
    target.vz += ev.knockZ;
    this.spawnFloatingText(
      target.x,
      target.y + 2.2,
      target.z,
      ev.critical ? `حاسمة -${ev.damage}!` : `-${ev.damage}`,
      ev.critical ? '#FDE047' : '#F87171',
      ev.critical ? 1.25 : 1.0
    );
    this.spawnBurst(target.x, target.y + 1.2, target.z, ev.critical ? '#F59E0B' : '#EF4444', 8);
    audioSynth.playHit(ev.critical);
    if (ev.targetId === this.getPlayer1()?.id) {
      this.addCameraShake(0.2, 0.3);
    }
  }

  public applyOnlineVfx(ev: { kind: string; x: number; z: number; color: string; radius: number }) {
    this.rings.push({
      x: ev.x,
      y: this.getTerrainHeight(ev.x, ev.z) + 0.08,
      z: ev.z,
      radius: 0.6,
      maxRadius: ev.radius,
      color: ev.color,
      alpha: 0.9,
      life: 0.45,
      maxLife: 0.45,
      growSpeed: ev.radius * 2.1,
    });
    this.spawnBurst(ev.x, 1.0, ev.z, ev.color, 10);
  }

  public getPlayer1(): SimFighter | undefined {
    return this.fighters.find((f) => f.team === 'player1');
  }

  public getPlayer2(): SimFighter | undefined {
    return this.fighters.find((f) => f.team === 'player2');
  }

  public toggleSprint() {
    this.sprintActive = !this.sprintActive;
    const bonusText = this.mode === 'world_explore' ? '+75% سرعة' : '+22% رشاقة قتالية';
    this.showBanner(this.sprintActive ? `تم تفعيل الركض السريع (${bonusText})` : 'عودة إلى المشي العادي', 1.4);
  }

  public teleportPlayer(x: number, z: number, label: string) {
    const p1 = this.getPlayer1();
    if (!p1 || this.mode !== 'world_explore') return;
    p1.x = x;
    p1.z = z;
    p1.y = this.getTerrainHeight(x, z);
    p1.vx = 0;
    p1.vz = 0;
    p1.invulnTimer = 1.5;
    audioSynth.playPower();
    this.spawnBurst(x, p1.y + 1.2, z, '#38BDF8', 18);
    this.rings.push({
      x,
      y: p1.y + 0.1,
      z,
      radius: 0.5,
      maxRadius: 4.5,
      color: '#38BDF8',
      alpha: 0.95,
      life: 0.48,
      maxLife: 0.48,
      growSpeed: 9,
    });
    this.showBanner(`انتقال سريع إلى: ${label}`, 2.4);
  }

  private queueOrRunPlayerAction(
    kind: 'attack' | 'heavy' | 'skill0' | 'skill1' | 'skill2' | 'skill3' | 'dodge'
  ) {
    const p1 = this.getPlayer1();
    if (!p1 || p1.hp <= 0) return;
    const ran = this.executeBufferedKind(p1, kind);
    if (!ran) {
      this.bufferedAction = { kind, expiresAt: this.time + 0.16 };
    } else {
      this.bufferedAction = null;
    }
  }

  private executeBufferedKind(
    fighter: SimFighter,
    kind: 'attack' | 'heavy' | 'skill0' | 'skill1' | 'skill2' | 'skill3' | 'dodge'
  ): boolean {
    if (kind === 'attack') return this.triggerPrimaryAttack(fighter);
    if (kind === 'heavy') return this.triggerHeavySkill(fighter);
    if (kind === 'skill0') return this.triggerSkillSlot(fighter, 0);
    if (kind === 'skill1') return this.triggerSkillSlot(fighter, 1);
    if (kind === 'skill2') return this.triggerSkillSlot(fighter, 2);
    if (kind === 'skill3') return this.triggerSkillSlot(fighter, 3);
    if (kind === 'dodge') return this.triggerDodge(fighter);
    return false;
  }

  private triggerJump(fighter: SimFighter): boolean {
    if (fighter.stunTimer > 0) return false;
    const groundY = this.getTerrainHeight(fighter.x, fighter.z);
    const canJumpNow = fighter.y <= groundY + 0.08 || fighter.coyoteTimer > 0;
    if (!canJumpNow) {
      fighter.jumpBufferTimer = 0.14;
      return false;
    }
    fighter.vy = 11.4 + Math.min(2.4, fighter.avatar.stats.agi * 0.08);
    fighter.y = Math.max(fighter.y, groundY + 0.04);
    fighter.coyoteTimer = 0;
    fighter.jumpBufferTimer = 0;
    fighter.isAirborne = true;
    fighter.squash = 1.18;
    fighter.squashTimer = 0.16;
    if (fighter.team === 'player1') {
      audioSynth.playJump();
    }
    this.spawnBurst(fighter.x, groundY + 0.15, fighter.z, '#E2E8F0', 5);
    return true;
  }

  private handleInstantKeyPress(code: string) {
    if (this.paused || this.finished) return;
    const p1 = this.getPlayer1();
    const kb = this.keyBindings;
    if (p1 && p1.hp > 0) {
      if (code === kb.jump) this.triggerJump(p1);
      else if (code === kb.attack) this.queueOrRunPlayerAction('attack');
      else if (code === kb.heavy) this.queueOrRunPlayerAction('heavy');
      else if (code === kb.skill0) this.queueOrRunPlayerAction('skill0');
      else if (code === kb.skill1) this.queueOrRunPlayerAction('skill1');
      else if (code === kb.skill2) this.queueOrRunPlayerAction('skill2');
      else if (code === kb.skill3) this.queueOrRunPlayerAction('skill3');
      else if (code === kb.sprint) this.toggleSprint();
      else if (code === kb.dodge || (kb.dodge === 'ShiftLeft' && code === 'ShiftRight'))
        this.queueOrRunPlayerAction('dodge');
      else if (code === kb.interact) this.triggerInteract();
      else if (code === kb.potion1) this.triggerConsumable('elixir_heal');
      else if (code === kb.potion2) this.triggerConsumable('scroll_energy');
      else if (code === kb.potion3) this.triggerConsumable('tonic_fury');
      else if (code === 'Equal' || code === 'NumpadAdd') this.zoomCamera(-0.1);
      else if (code === 'Minus' || code === 'NumpadSubtract') this.zoomCamera(0.1);
    }
    if (this.mode === 'pvp_local') {
      const p2 = this.getPlayer2();
      if (p2 && p2.hp > 0) {
        if (code === 'KeyK') this.triggerPrimaryAttack(p2);
        else if (code === 'KeyL') this.triggerHeavySkill(p2);
        else if (code === 'KeyO') this.triggerSkillSlot(p2, 0);
        else if (code === 'KeyP') this.triggerDodge(p2);
      }
    }
  }

  public triggerPlayer1Action(
    action:
      | 'attack'
      | 'heavy'
      | 'power'
      | 'secondary'
      | 'skill0'
      | 'skill1'
      | 'skill2'
      | 'skill3'
      | 'dodge'
      | 'jump'
      | 'block_start'
      | 'block_end'
      | 'interact'
      | 'sprint'
  ) {
    if (this.paused || this.finished) return;
    const p1 = this.getPlayer1();
    if (!p1 || p1.hp <= 0) return;
    if (action === 'attack') this.queueOrRunPlayerAction('attack');
    else if (action === 'heavy') this.queueOrRunPlayerAction('heavy');
    else if (action === 'power' || action === 'skill0') this.queueOrRunPlayerAction('skill0');
    else if (action === 'secondary' || action === 'skill1') this.queueOrRunPlayerAction('skill1');
    else if (action === 'skill2') this.queueOrRunPlayerAction('skill2');
    else if (action === 'skill3') this.queueOrRunPlayerAction('skill3');
    else if (action === 'dodge') this.queueOrRunPlayerAction('dodge');
    else if (action === 'jump') this.triggerJump(p1);
    else if (action === 'interact') this.triggerInteract();
    else if (action === 'sprint') this.toggleSprint();
    else if (action === 'block_start') this.keys.add(this.keyBindings.block);
    else if (action === 'block_end') this.keys.delete(this.keyBindings.block);
  }

  public triggerInteract() {
    if (this.mode !== 'world_explore' || !this.nearbyInteractable) return;
    const p1 = this.getPlayer1();
    if (!p1) return;
    const target = this.nearbyInteractable;

    if (target.kind === 'chest') {
      const chestList = this.mode === 'world_explore' ? this.streamedChests : this.arena.worldChests || [];
      const chest = chestList.find((c) => c.id === target.targetId);
      if (!chest || this.openedChests.has(chest.id)) return;
      this.openedChests.add(chest.id);
      this.bonusMissionGold += chest.gold;
      this.opts.onOpenWorldChest?.(chest);
      audioSynth.playReward();
      this.spawnBurst(chest.x, this.getTerrainHeight(chest.x, chest.z) + 1.0, chest.z, '#E6B85C', 18);
      this.rings.push({
        x: chest.x,
        y: this.getTerrainHeight(chest.x, chest.z) + 0.12,
        z: chest.z,
        radius: 0.4,
        maxRadius: 3.6,
        color: '#E6B85C',
        alpha: 0.95,
        life: 0.48,
        maxLife: 0.48,
        growSpeed: 8,
      });
      this.spawnFloatingText(
        chest.x,
        this.getTerrainHeight(chest.x, chest.z) + 2.5,
        chest.z,
        `+${chest.gold} ذهب و +${chest.gems} جواهر`,
        '#FDE047',
        1.25
      );
      const chestLabel = chest.tier === 'mythic' ? 'الصندوق الأسطوري' : 'صندوق الكنز';
      this.showBanner(`فتحت ${chestLabel}! (+${chest.gold} ذهب، +${chest.gems} جواهر، +${chest.xp} خبرة)`, 2.8);
    } else if (target.kind === 'node') {
      const nodeList = this.mode === 'world_explore' ? this.streamedNodes : this.arena.worldNodes || [];
      const node = nodeList.find((n) => n.id === target.targetId);
      if (!node || (this.nodeRespawns[node.id] || 0) > 0) return;
      this.nodeRespawns[node.id] = 18.0;
      this.opts.onGatherNode?.(node.kind, node.label);
      audioSynth.playReward();
      this.spawnBurst(node.x, 1.0, node.z, '#34D399', 14);
      this.spawnFloatingText(node.x, 2.2, node.z, `+1 ${node.label}`, '#34D399', 1.15);
      this.showBanner(`جمعت: ${node.label} (أُضيف إلى حقيبة الموارد وعقود النقابة)`, 2.4);
    } else if (target.kind === 'npc') {
      const npc = this.arena.worldNpcs?.find((n) => n.id === target.targetId);
      if (!npc) return;
      const line = npc.lines[this.npcLineIdx % npc.lines.length];
      this.npcLineIdx += 1;
      this.npcDialogue = `${npc.name}: «${line}»`;
      this.npcDialogueTimer = 6.0;
      const heal = Math.round(p1.maxHp * 0.25);
      p1.hp = Math.min(p1.maxHp, p1.hp + heal);
      p1.energy = p1.maxEnergy;
      audioSynth.playReward();
      this.spawnFloatingText(p1.x, p1.y + 2.4, p1.z, `بركة ${npc.name} (+صحة وطاقة)`, '#38BDF8', 1.12);
      this.opts.onOpenNpcWork?.(npc.id);
    } else if (target.kind === 'portal' && target.arenaId) {
      audioSynth.playPower();
      this.opts.onWarpPortal?.(target.arenaId);
    } else if (target.kind === 'secret_boss') {
      const sb = SECRET_WORLD_BOSSES.find((b) => b.id === target.targetId);
      if (!sb || this.defeatedSecretBossIds.has(sb.id)) return;
      if (this.monsters.some((m) => m.secretBossId === sb.id && m.hp > 0)) return;
      const def = MONSTERS[sb.archetype] || MONSTERS.magma_boss;
      const bossHp = Math.round(def.maxHp * sb.hpMult);
      const sx = sb.x + 5.5;
      const sz = sb.z + 5.5;
      this.monsters.push({
        id: this.nextId('sboss'),
        archetype: sb.archetype,
        name: sb.name,
        x: sx,
        y: this.getTerrainHeight(sx, sz),
        z: sz,
        vx: 0,
        vy: 0,
        vz: 0,
        yaw: Math.atan2(p1.x - sx, p1.z - sz),
        hp: bossHp,
        maxHp: bossHp,
        walkPhase: 0,
        attackTimer: 0,
        attackCooldown: 1.1,
        telegraphTimer: 0,
        telegraphMax: 0.72,
        telegraphRadius: 5.2,
        pendingStrike: false,
        hitFlash: 0,
        frozenTimer: 0,
        stunTimer: 0,
        isBoss: true,
        flankSlot: 0,
        enraged: false,
        secretBossId: sb.id,
        dmgMult: sb.dmgMult,
      });
      audioSynth.playWorldEventHorn();
      this.addCameraShake(0.32, 0.42);
      this.rings.push({
        x: sx,
        y: 0.14,
        z: sz,
        radius: 0.8,
        maxRadius: 9.5,
        color: sb.accentColor,
        alpha: 0.98,
        life: 0.65,
        maxLife: 0.65,
        growSpeed: 14,
        isFusion: true,
        secondaryColor: '#FEF08A',
      });
      this.spawnBurst(sx, 1.8, sz, sb.accentColor, 26);
      this.showBanner(`ظهر الزعيم السري: ${sb.name} (${sb.title})!`, 3.6);
    } else if (target.kind === 'event_zone') {
      const evt = WORLD_EVENT_ZONES.find((z) => z.id === target.targetId);
      if (!evt || this.completedWorldEventIds.has(evt.id) || this.activeEventZone) return;
      this.activeEventZone = { def: evt, wave: 1, waveCount: evt.waveCount };
      this.spawnWorldEventWave(evt, 1);
      audioSynth.playWorldEventHorn();
      this.addCameraShake(0.24, 0.34);
      this.rings.push({
        x: evt.x,
        y: 0.14,
        z: evt.z,
        radius: 1.0,
        maxRadius: evt.radius,
        color: evt.color,
        alpha: 0.94,
        life: 0.65,
        maxLife: 0.65,
        growSpeed: 22,
        isFusion: true,
        secondaryColor: '#FFFFFF',
      });
      this.showBanner(`بدأ حدث القارة: ${evt.name} — الموجة 1 من ${evt.waveCount}!`, 3.4);
    }
  }

  private spawnWorldEventWave(evt: WorldEventZoneDef, wave: number) {
    const pool: MonsterArchetype[] =
      evt.kind === 'ether_storm'
        ? ['frost_specter', 'wraith_knight', 'ash_stalker']
        : evt.kind === 'meteor_rift'
          ? ['ember_imp', 'obsidian_golem', 'ash_stalker']
          : ['wraith_knight', 'venom_crawler', 'obsidian_golem'];
    const count = 3 + wave;
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + wave * 0.6;
      const mx = evt.x + Math.cos(ang) * 9.5;
      const mz = evt.z + Math.sin(ang) * 9.5;
      const arch = pool[(i + wave) % pool.length];
      const def = MONSTERS[arch] || MONSTERS.ash_stalker;
      const hp = Math.round(def.maxHp * (1 + wave * 0.22));
      this.monsters.push({
        id: this.nextId('evmon'),
        archetype: arch,
        name: `${def.name} (حدث)`,
        x: mx,
        y: this.getTerrainHeight(mx, mz),
        z: mz,
        vx: 0,
        vy: 0,
        vz: 0,
        yaw: Math.random() * Math.PI * 2,
        hp,
        maxHp: hp,
        walkPhase: Math.random() * 5,
        attackTimer: 0,
        attackCooldown: 0.9 + Math.random() * 0.6,
        telegraphTimer: 0,
        telegraphMax: 0.72,
        telegraphRadius: def.isBoss ? 4.8 : 2.9,
        pendingStrike: false,
        hitFlash: 0,
        frozenTimer: 0,
        stunTimer: 0,
        isBoss: def.isBoss,
        flankSlot: i % 5,
        enraged: false,
        eventZoneId: evt.id,
      });
    }
  }

  public triggerConsumable(id: ConsumableId): boolean {
    if (this.paused || this.finished) return false;
    const p1 = this.getPlayer1();
    if (!p1 || p1.hp <= 0) return false;
    if ((this.localConsumables[id] || 0) <= 0) return false;

    if (this.opts.onConsumeItem && !this.opts.onConsumeItem(id)) {
      return false;
    }
    this.localConsumables[id] = Math.max(0, (this.localConsumables[id] || 0) - 1);
    const def = CONSUMABLES[id];

    if (id === 'elixir_heal') {
      const amt = Math.round(p1.maxHp * 0.4);
      p1.hp = Math.min(p1.maxHp, p1.hp + amt);
      this.spawnFloatingText(p1.x, p1.y + 2.5, p1.z, `+${amt} شفاء ملكي`, def.color, 1.2);
      audioSynth.playReward();
    } else if (id === 'scroll_energy') {
      p1.energy = p1.maxEnergy;
      for (let i = 0; i < 4; i++) {
        p1.slotCooldowns[i] = p1.slotCooldowns[i] * 0.5;
      }
      p1.powerCooldown = p1.slotCooldowns[0];
      p1.secondaryCooldown = p1.slotCooldowns[1];
      this.spawnFloatingText(p1.x, p1.y + 2.5, p1.z, 'طاقة كاملة!', def.color, 1.2);
      audioSynth.playPower();
    } else if (id === 'tonic_fury') {
      p1.overdriveTimer = Math.max(p1.overdriveTimer, 6.5);
      p1.overdriveActive = true;
      this.spawnFloatingText(p1.x, p1.y + 2.5, p1.z, 'إكسير الغضب!', def.color, 1.25);
      audioSynth.playPower();
    }

    this.spawnBurst(p1.x, p1.y + 1.1, p1.z, def.color, 12);
    this.rings.push({
      x: p1.x,
      y: p1.y + 0.1,
      z: p1.z,
      radius: 0.4,
      maxRadius: 3.2,
      color: def.color,
      alpha: 0.9,
      life: 0.4,
      maxLife: 0.4,
      growSpeed: 7.5,
    });
    return true;
  }

  private findNearestHostile(attacker: { id?: string; team: RenderFighter['team']; x: number; z: number }): {
    x: number;
    z: number;
    dist: number;
  } | null {
    let best: { x: number; z: number; dist: number } | null = null;
    for (const m of this.monsters) {
      if (m.hp <= 0) continue;
      const d = Math.hypot(m.x - attacker.x, m.z - attacker.z);
      if (!best || d < best.dist) best = { x: m.x, z: m.z, dist: d };
    }
    for (const f of this.fighters) {
      if (f.id === attacker.id || f.team === attacker.team || f.hp <= 0) continue;
      const d = Math.hypot(f.x - attacker.x, f.z - attacker.z);
      if (!best || d < best.dist) best = { x: f.x, z: f.z, dist: d };
    }
    return best;
  }

  private triggerPrimaryAttack(fighter: SimFighter): boolean {
    if (fighter.attackCooldown > 0 || fighter.stunTimer > 0 || fighter.dodgeTimer > 0) return false;
    const weapon = WEAPONS[fighter.avatar.weaponId] || WEAPONS.vanguard_sword;
    const nearest = this.findNearestHostile(fighter);
    if (nearest && nearest.dist < (weapon.isRanged ? 16 : 6.0)) {
      fighter.yaw = Math.atan2(nearest.x - fighter.x, nearest.z - fighter.z);
    }

    const rollChainBonus = fighter.dodgeChainTimer > 0;
    if (rollChainBonus) {
      fighter.dodgeChainTimer = 0;
    }

    fighter.comboStep = (fighter.comboStep + 1) % 3;
    const comboMult = fighter.comboStep === 2 ? 1.3 : 1.0;
    const overdriveMult = fighter.overdriveActive ? 1.55 : 1.0;
    const highGroundMult = fighter.onHighGround ? 1.12 : 1.0;
    const rollMult = rollChainBonus ? 1.15 : 1.0;
    const baseDmg = fighter.statsDerived.attackDamage * comboMult * overdriveMult * highGroundMult * rollMult;
    const isCrit = Math.random() * 100 < fighter.statsDerived.critChance + (rollChainBonus ? 12 : 0);
    const dmg = Math.round(baseDmg * (isCrit ? 1.65 : 1));

    fighter.animState = 'attack';
    fighter.animTime = 0;
    fighter.attackCooldown = 1 / (weapon.attackSpeed * fighter.statsDerived.attackSpeedMult);

    if (rollChainBonus && !weapon.isRanged) {
      fighter.vx += Math.sin(fighter.yaw) * 6.4;
      fighter.vz += Math.cos(fighter.yaw) * 6.4;
      audioSynth.playRollCombo();
      if (fighter.team === 'player1') {
        this.spawnFloatingText(fighter.x, fighter.y + 2.4, fighter.z, 'ضربة التفاف +15%!', '#38BDF8', 1.08);
      }
    } else {
      audioSynth.playSwing(
        weapon.id === 'shadow_daggers' || weapon.id === 'crimson_wand'
          ? 1.45
          : weapon.id === 'storm_hammer' || weapon.id === 'aegis_greatshield'
            ? 0.72
            : 1.0
      );
    }

    if (weapon.isRanged) {
      const speed =
        weapon.id === 'solar_bow'
          ? 23
          : weapon.id === 'crimson_wand'
            ? 24
            : weapon.id === 'arcane_tome'
              ? 17
              : 16;

      if (weapon.id === 'arcane_tome') {
        // Twin arcane embers
        [-0.12, 0.12].forEach((offset) => {
          const a = fighter.yaw + offset;
          this.projectiles.push({
            id: this.nextId('proj'),
            ownerId: fighter.id,
            team: fighter.team,
            x: fighter.x + Math.sin(a) * 0.9,
            y: fighter.y + 1.25,
            z: fighter.z + Math.cos(a) * 0.9,
            vx: Math.sin(a) * speed,
            vz: Math.cos(a) * speed,
            color: weapon.energyColor,
            coreColor: '#FFFFFF',
            radius: 0.25,
            kind: 'orb',
            damage: Math.round(dmg * 0.62),
            knockback: weapon.knockback * 0.7,
            life: 1.4,
            homing: true,
            critical: isCrit,
          });
        });
      } else {
        this.projectiles.push({
          id: this.nextId('proj'),
          ownerId: fighter.id,
          team: fighter.team,
          x: fighter.x + Math.sin(fighter.yaw) * 0.9,
          y: fighter.y + 1.25,
          z: fighter.z + Math.cos(fighter.yaw) * 0.9,
          vx: Math.sin(fighter.yaw) * speed,
          vz: Math.cos(fighter.yaw) * speed,
          color: weapon.energyColor,
          coreColor: '#FFFFFF',
          radius: weapon.role === 'magic' || weapon.role === 'support' ? 0.32 : 0.22,
          kind: weapon.id === 'solar_bow' ? 'arrow' : 'orb',
          damage: dmg,
          knockback: weapon.knockback,
          life: 1.45,
          homing: weapon.id === 'void_staff' || weapon.id === 'astral_censer',
          critical: isCrit,
        });
      }
    } else {
      fighter.vx += Math.sin(fighter.yaw) * 2.6;
      fighter.vz += Math.cos(fighter.yaw) * 2.6;

      this.slashes.push({
        x: fighter.x,
        y: fighter.y + 1.15 * fighter.avatar.heightScale,
        z: fighter.z,
        yaw: fighter.yaw,
        radius: weapon.range * 0.92,
        arcSpread: weapon.id === 'dragon_spear' ? 0.85 : 2.15,
        color: weapon.energyColor,
        alpha: 0.88,
        tilt: fighter.comboStep === 1 ? -0.48 : 0.48,
        life: isCrit ? 0.28 : 0.22,
        maxLife: isCrit ? 0.28 : 0.22,
        critical: isCrit,
      });

      this.applyMeleeHitCone(fighter, weapon.range, weapon.id === 'dragon_spear' ? 0.65 : 1.4, dmg, weapon.knockback, isCrit);
    }
    return true;
  }

  private triggerHeavySkill(fighter: SimFighter): boolean {
    if (fighter.heavyCooldown > 0 || fighter.stunTimer > 0) return false;
    const weapon = WEAPONS[fighter.avatar.weaponId] || WEAPONS.vanguard_sword;
    const nearest = this.findNearestHostile(fighter);
    if (nearest && nearest.dist < 15) {
      fighter.yaw = Math.atan2(nearest.x - fighter.x, nearest.z - fighter.z);
    }

    const overdriveMult = fighter.overdriveActive ? 1.55 : 1.0;
    const highGroundMult = fighter.onHighGround ? 1.12 : 1.0;
    const isCrit = Math.random() * 100 < fighter.statsDerived.critChance + 15;
    const dmg = Math.round(fighter.statsDerived.heavyDamage * overdriveMult * highGroundMult * (isCrit ? 1.55 : 1));

    fighter.animState = 'heavy';
    fighter.animTime = 0;
    fighter.heavyCooldown = 4.2 * (1 - fighter.statsDerived.cooldownReduction);
    fighter.attackCooldown = 0.28;

    audioSynth.playSwing(0.65);

    if (weapon.id === 'solar_bow') {
      [-0.22, 0, 0.22].forEach((offset) => {
        const a = fighter.yaw + offset;
        this.projectiles.push({
          id: this.nextId('proj'),
          ownerId: fighter.id,
          team: fighter.team,
          x: fighter.x + Math.sin(a) * 0.9,
          y: fighter.y + 1.25,
          z: fighter.z + Math.cos(a) * 0.9,
          vx: Math.sin(a) * 24,
          vz: Math.cos(a) * 24,
          color: weapon.energyColor,
          coreColor: '#FFFFFF',
          radius: 0.24,
          kind: 'arrow',
          damage: dmg,
          knockback: 4.5,
          life: 1.35,
          homing: false,
          critical: isCrit,
        });
      });
    } else if (weapon.role === 'magic') {
      const cx = nearest && nearest.dist < 11 ? nearest.x : fighter.x + Math.sin(fighter.yaw) * 4.5;
      const cz = nearest && nearest.dist < 11 ? nearest.z : fighter.z + Math.cos(fighter.yaw) * 4.5;
      if (weapon.id === 'crimson_wand') {
        this.lightnings.push({ x: cx, z: cz, color: weapon.energyColor, alpha: 1, seed: Math.random() * 99, life: 0.36, maxLife: 0.36 });
      }
      this.rings.push({
        x: cx,
        y: this.getTerrainHeight(cx, cz) + 0.1,
        z: cz,
        radius: 0.5,
        maxRadius: 4.9,
        color: weapon.energyColor,
        alpha: 0.92,
        life: 0.42,
        maxLife: 0.42,
        growSpeed: 11.2,
      });
      this.applyRadialDamage(fighter, cx, cz, 4.9, dmg, 7.5, isCrit);
      this.spawnBurst(cx, 1.0, cz, weapon.energyColor, 14);
    } else if (weapon.role === 'support') {
      // Support heavy skill heals & restores energy/shield + radial light pulse
      const healAmt = Math.round(fighter.maxHp * 0.18);
      fighter.hp = Math.min(fighter.maxHp, fighter.hp + healAmt);
      fighter.energy = Math.min(fighter.maxEnergy, fighter.energy + 22);
      if (weapon.id === 'astral_censer') {
        fighter.shieldTimer = Math.max(fighter.shieldTimer, 3.0);
        fighter.shieldActive = true;
      }
      this.spawnFloatingText(fighter.x, fighter.y + 2.4, fighter.z, `+${healAmt} شفاء ودعم`, weapon.energyColor, 1.15);
      this.rings.push({
        x: fighter.x,
        y: fighter.y + 0.1,
        z: fighter.z,
        radius: 0.5,
        maxRadius: 4.8,
        color: weapon.energyColor,
        alpha: 0.92,
        life: 0.45,
        maxLife: 0.45,
        growSpeed: 10.5,
      });
      this.applyRadialDamage(fighter, fighter.x, fighter.z, 4.8, dmg, 7.0, isCrit);
      this.spawnBurst(fighter.x, fighter.y + 1.2, fighter.z, weapon.energyColor, 14);
    } else if (weapon.role === 'defense') {
      // Shield bash + shockwave + brief stun on enemies!
      fighter.vx += Math.sin(fighter.yaw) * 6.5;
      fighter.vz += Math.cos(fighter.yaw) * 6.5;
      const rad = 4.6;
      this.rings.push({
        x: fighter.x,
        y: fighter.y + 0.1,
        z: fighter.z,
        radius: 0.6,
        maxRadius: rad,
        color: weapon.energyColor,
        alpha: 0.92,
        life: 0.4,
        maxLife: 0.4,
        growSpeed: 11.5,
      });
      for (const m of this.monsters) {
        if (m.hp > 0 && Math.hypot(m.x - fighter.x, m.z - fighter.z) <= rad + 0.6) {
          m.stunTimer = Math.max(m.stunTimer, 1.6);
        }
      }
      for (const f of this.fighters) {
        if (f.id !== fighter.id && f.team !== fighter.team && f.hp > 0 && Math.hypot(f.x - fighter.x, f.z - fighter.z) <= rad + 0.6) {
          f.stunTimer = Math.max(f.stunTimer, 1.1);
        }
      }
      this.applyRadialDamage(fighter, fighter.x, fighter.z, rad, dmg, weapon.knockback * 1.35, isCrit);
      if (fighter.team === 'player1') this.addCameraShake(0.18, 0.3);
    } else {
      // Heavy melee leap cleave / hammer quake / spear lunge
      fighter.vx += Math.sin(fighter.yaw) * 7.2;
      fighter.vz += Math.cos(fighter.yaw) * 7.2;
      if (weapon.id === 'storm_hammer' || weapon.id === 'vanguard_sword') {
        fighter.vy = 5.4; // Luxurious 3D airborne leap strike!
      }
      const radius = weapon.id === 'storm_hammer' ? 4.6 : weapon.range * 1.32;
      this.slashes.push({
        x: fighter.x,
        y: fighter.y + 1.15,
        z: fighter.z,
        yaw: fighter.yaw,
        radius,
        arcSpread: weapon.id === 'storm_hammer' ? Math.PI * 1.9 : 2.65,
        color: weapon.energyColor,
        alpha: 0.96,
        tilt: 0.18,
        life: isCrit ? 0.38 : 0.32,
        maxLife: isCrit ? 0.38 : 0.32,
        critical: isCrit,
      });
      if (weapon.id === 'storm_hammer') {
        this.rings.push({
          x: fighter.x,
          y: fighter.y + 0.08,
          z: fighter.z,
          radius: 0.6,
          maxRadius: 4.8,
          color: weapon.energyColor,
          alpha: 0.9,
          life: 0.38,
          maxLife: 0.38,
          growSpeed: 12,
        });
        this.applyRadialDamage(fighter, fighter.x, fighter.z, 4.8, dmg, weapon.knockback * 1.3, isCrit);
      } else {
        this.applyMeleeHitCone(fighter, radius, 1.85, dmg, weapon.knockback * 1.4, isCrit);
      }
      if (fighter.team === 'player1') this.addCameraShake(0.16, 0.28);
    }

    if (this.mode === 'pvp_online' && fighter.team === 'player1') {
      this.opts.onOnlineVfxSend?.({
        kind: 'heavy',
        x: fighter.x,
        z: fighter.z,
        color: weapon.energyColor,
        radius: 4.0,
      });
    }
    return true;
  }

  private triggerSkillSlot(fighter: SimFighter, slotIdx: 0 | 1 | 2 | 3): boolean {
    if (fighter.team === 'player1' && slotIdx >= this.unlockedSkillSlots) {
      this.showBanner(`الخانة ${slotIdx + 1} مقفلة! اشترِ خانة جديدة من شبكة المهارات لزيادة المهارات النشطة.`, 2.0);
      return false;
    }

    const slots = fighter.avatar.powerSlots;
    const powerId: PowerId =
      slots?.[slotIdx] || (slotIdx === 0 ? fighter.avatar.powerId : fighter.avatar.secondaryPowerId);
    const power = POWERS[powerId] || POWERS.inferno_nova;
    const skillLv = fighter.team === 'player1' ? (this.powerLevels[powerId] || 1) : 1;
    const netBonus = fighter.team === 'player1' ? computeSkillNetworkBonuses(this.unlockedNetworkNodes) : null;
    const effEnergyCost = Math.round(power.energyCost * (netBonus ? netBonus.energyCostMult : 1));
    const effRadius = Number(
      (power.radius * (1 + (skillLv - 1) * 0.08) * (netBonus ? netBonus.radiusMult : 1)).toFixed(2)
    );

    const cd = fighter.slotCooldowns[slotIdx];
    if (cd > 0 || fighter.energy < effEnergyCost || fighter.stunTimer > 0) return false;

    fighter.energy -= effEnergyCost;
    const cdFactor = Math.max(
      0.35,
      1 - fighter.statsDerived.cooldownReduction - (netBonus ? netBonus.cdrMult : 0) - (skillLv - 1) * 0.06
    );
    const effCd = power.cooldown * cdFactor;
    fighter.slotCooldowns[slotIdx] = effCd;
    if (slotIdx === 0) fighter.powerCooldown = effCd;
    if (slotIdx === 1) fighter.secondaryCooldown = effCd;

    fighter.animState = 'power';
    fighter.animTime = 0;

    const highGroundMult = fighter.onHighGround ? 1.12 : 1.0;
    const lvMult = 1 + (skillLv - 1) * 0.18;
    const netDmgMult = netBonus ? netBonus.dmgMult : 1;
    const fusionBonusMult = power.isFusion && netBonus ? netBonus.fusionMult : 1;
    const scaledDmg = Math.round(
      power.damage * fighter.statsDerived.powerScale * highGroundMult * lvMult * netDmgMult * fusionBonusMult
    );
    if (power.isFusion) {
      audioSynth.playFusionCast();
      if (fighter.team === 'player1') {
        this.fusionCasts += 1;
        this.opts.onFusionCast?.();
        this.addCameraShake(0.32, 0.44);
      }
      this.rings.push({
        x: fighter.x,
        y: fighter.y + 0.12,
        z: fighter.z,
        radius: 0.8,
        maxRadius: effRadius * 1.08,
        color: power.color,
        alpha: 0.96,
        life: 0.58,
        maxLife: 0.58,
        growSpeed: effRadius * 2.35,
        isFusion: true,
        secondaryColor: '#FDE047',
      });
    } else {
      audioSynth.playPower();
      if (fighter.team === 'player1') this.addCameraShake(0.22, 0.34);
    }

    if (power.id === 'inferno_nova') {
      this.rings.push({
        x: fighter.x,
        y: fighter.y + 0.1,
        z: fighter.z,
        radius: 0.6,
        maxRadius: effRadius,
        color: power.color,
        alpha: 0.95,
        life: 0.48,
        maxLife: 0.48,
        growSpeed: effRadius * 2.2,
      });
      this.spawnBurst(fighter.x, fighter.y + 1.2, fighter.z, '#F97316', 18);
      this.applyRadialDamage(fighter, fighter.x, fighter.z, effRadius, scaledDmg, 11.0, true);
    } else if (power.id === 'thunder_strike') {
      const targets: Array<{ x: number; z: number; apply: () => void }> = [];
      for (const m of this.monsters) {
        if (m.hp <= 0) continue;
        const d = Math.hypot(m.x - fighter.x, m.z - fighter.z);
        if (d <= effRadius) {
          targets.push({
            x: m.x,
            z: m.z,
            apply: () => {
              m.stunTimer = Math.max(m.stunTimer, 1.4);
              this.damageMonster(fighter, m, scaledDmg, 3, true);
            },
          });
        }
      }
      for (const f of this.fighters) {
        if (f.id === fighter.id || f.team === fighter.team || f.hp <= 0) continue;
        const d = Math.hypot(f.x - fighter.x, f.z - fighter.z);
        if (d <= effRadius) {
          targets.push({
            x: f.x,
            z: f.z,
            apply: () => {
              f.stunTimer = Math.max(f.stunTimer, 1.1);
              this.damageFighter(fighter, f, scaledDmg, 4, true);
            },
          });
        }
      }
      targets.sort((a, b) => Math.hypot(a.x - fighter.x, a.z - fighter.z) - Math.hypot(b.x - fighter.x, b.z - fighter.z));
      const chosen = targets.slice(0, 3);
      if (chosen.length === 0) {
        this.lightnings.push({
          x: fighter.x + Math.sin(fighter.yaw) * 4,
          z: fighter.z + Math.cos(fighter.yaw) * 4,
          color: power.color,
          alpha: 1,
          seed: Math.random() * 100,
          life: 0.35,
          maxLife: 0.35,
        });
      } else {
        chosen.forEach((t) => {
          this.lightnings.push({
            x: t.x,
            z: t.z,
            color: power.color,
            alpha: 1,
            seed: Math.random() * 100,
            life: 0.38,
            maxLife: 0.38,
          });
          this.spawnBurst(t.x, 1.3, t.z, '#38BDF8', 10);
          t.apply();
        });
      }
    } else if (power.id === 'crystal_aegis') {
      fighter.shieldTimer = 5.2;
      fighter.shieldActive = true;
      const heal = Math.round(fighter.maxHp * 0.18);
      fighter.hp = Math.min(fighter.maxHp, fighter.hp + heal);
      this.spawnFloatingText(fighter.x, fighter.y + 2.3, fighter.z, `+${heal} صحة ودرع`, '#10B981', 1.15);
      this.rings.push({
        x: fighter.x,
        y: fighter.y + 0.1,
        z: fighter.z,
        radius: 0.5,
        maxRadius: effRadius,
        color: '#10B981',
        alpha: 0.85,
        life: 0.4,
        maxLife: 0.4,
        growSpeed: effRadius * 2.1,
      });
      this.applyRadialDamage(fighter, fighter.x, fighter.z, effRadius, Math.round(scaledDmg * 0.7), 6.5, false);
    } else if (power.id === 'shadow_blink') {
      const dashDist = 6.2;
      const sx = fighter.x;
      const sz = fighter.z;
      for (let k = 0; k < 3; k++) {
        this.dashTrails.push({
          x: sx + Math.sin(fighter.yaw) * (k * 2.0),
          y: fighter.y,
          z: sz + Math.cos(fighter.yaw) * (k * 2.0),
          yaw: fighter.yaw,
          color: fighter.avatar.accentColor,
          alpha: 0.85,
          hScale: fighter.avatar.heightScale,
          life: 0.35,
          maxLife: 0.35,
        });
      }
      fighter.x += Math.sin(fighter.yaw) * dashDist;
      fighter.z += Math.cos(fighter.yaw) * dashDist;
      fighter.invulnTimer = 0.5;
      this.constrainToArena(fighter);
      this.spawnBurst(fighter.x, fighter.y + 1.1, fighter.z, '#E2E8F0', 14);
      this.applyRadialDamage(fighter, (sx + fighter.x) * 0.5, (sz + fighter.z) * 0.5, 3.8, scaledDmg, 5.5, true);
      this.applyRadialDamage(fighter, fighter.x, fighter.z, 3.0, Math.round(scaledDmg * 0.65), 5.0, true);
    } else if (power.id === 'frost_vortex') {
      this.rings.push({
        x: fighter.x,
        y: fighter.y + 0.1,
        z: fighter.z,
        radius: 0.6,
        maxRadius: effRadius,
        color: '#60A5FA',
        alpha: 0.9,
        life: 0.55,
        maxLife: 0.55,
        growSpeed: effRadius * 2,
      });
      this.spawnBurst(fighter.x, fighter.y + 1.2, fighter.z, '#93C5FD', 18);
      for (const m of this.monsters) {
        if (m.hp <= 0) continue;
        if (Math.hypot(m.x - fighter.x, m.z - fighter.z) <= effRadius) {
          m.frozenTimer = 4.2;
          this.damageMonster(fighter, m, scaledDmg, 3.5, false);
        }
      }
      for (const f of this.fighters) {
        if (f.id === fighter.id || f.team === fighter.team || f.hp <= 0) continue;
        if (Math.hypot(f.x - fighter.x, f.z - fighter.z) <= effRadius) {
          f.frozenTimer = 3.2;
          this.damageFighter(fighter, f, scaledDmg, 3.5, false);
        }
      }
    } else if (power.id === 'titan_overdrive') {
      fighter.overdriveTimer = 7.2;
      fighter.overdriveActive = true;
      fighter.vy = 5.0;
      this.spawnFloatingText(fighter.x, fighter.y + 2.6, fighter.z, 'غضب العملاق!', '#F59E0B', 1.25);
      this.rings.push({
        x: fighter.x,
        y: fighter.y + 0.1,
        z: fighter.z,
        radius: 0.6,
        maxRadius: effRadius,
        color: '#F59E0B',
        alpha: 0.92,
        life: 0.45,
        maxLife: 0.45,
        growSpeed: effRadius * 2,
      });
      this.applyRadialDamage(fighter, fighter.x, fighter.z, effRadius, Math.round(scaledDmg * 0.8), 9, false);
    } else if (power.id === 'meteor_rain') {
      fighter.vy = 4.5;
      this.spawnFloatingText(fighter.x, fighter.y + 2.5, fighter.z, 'مطر النيازك!', power.color, 1.2);
      for (let i = 0; i < 4; i++) {
        const a = fighter.yaw + (i - 1.5) * 0.55;
        const dist = 3.5 + i * 1.4;
        const tx = fighter.x + Math.sin(a) * dist;
        const tz = fighter.z + Math.cos(a) * dist;
        this.pendingMeteors.push({
          x: tx,
          z: tz,
          delay: 0.15 + i * 0.22,
          damage: Math.round(scaledDmg * 0.58),
          ownerId: fighter.id,
          color: power.color,
        });
      }
    } else if (power.id === 'holy_sanctuary') {
      const heal = Math.round(fighter.maxHp * 0.34);
      fighter.hp = Math.min(fighter.maxHp, fighter.hp + heal);
      fighter.energy = Math.min(fighter.maxEnergy, fighter.energy + 25);
      this.spawnFloatingText(fighter.x, fighter.y + 2.5, fighter.z, `+${heal} ملاذ النور`, power.color, 1.22);
      this.rings.push({
        x: fighter.x,
        y: fighter.y + 0.1,
        z: fighter.z,
        radius: 0.6,
        maxRadius: effRadius,
        color: power.color,
        alpha: 0.92,
        life: 0.5,
        maxLife: 0.5,
        growSpeed: effRadius * 2.1,
      });
      this.spawnBurst(fighter.x, fighter.y + 1.2, fighter.z, power.color, 16);
      this.applyRadialDamage(fighter, fighter.x, fighter.z, effRadius, scaledDmg, 9.5, false);
    } else if (power.id === 'iron_fortress') {
      fighter.shieldTimer = 5.5;
      fighter.shieldActive = true;
      fighter.invulnTimer = 1.4;
      this.spawnFloatingText(fighter.x, fighter.y + 2.5, fighter.z, 'حصن الحديد!', power.color, 1.2);
      this.rings.push({
        x: fighter.x,
        y: fighter.y + 0.1,
        z: fighter.z,
        radius: 0.6,
        maxRadius: effRadius,
        color: power.color,
        alpha: 0.94,
        life: 0.45,
        maxLife: 0.45,
        growSpeed: effRadius * 2.3,
      });
      this.applyRadialDamage(fighter, fighter.x, fighter.z, effRadius, scaledDmg, 11.5, true);
    } else if (power.id === 'arcane_beam') {
      fighter.vy = 4.2;
      [-0.24, -0.08, 0.08, 0.24].forEach((offset) => {
        const a = fighter.yaw + offset;
        this.projectiles.push({
          id: this.nextId('proj'),
          ownerId: fighter.id,
          team: fighter.team,
          x: fighter.x + Math.sin(a) * 1.0,
          y: fighter.y + 1.35,
          z: fighter.z + Math.cos(a) * 1.0,
          vx: Math.sin(a) * 20,
          vz: Math.cos(a) * 20,
          color: power.color,
          coreColor: '#FFFFFF',
          radius: 0.34,
          kind: 'orb',
          damage: Math.round(scaledDmg * 0.48),
          knockback: 4.8,
          life: 1.5,
          homing: true,
          critical: true,
        });
      });
    } else if (power.id === 'fusion_plasma_tempest') {
      this.spawnFloatingText(fighter.x, fighter.y + 2.7, fighter.z, 'عاصفة البلازما!', '#FB923C', 1.35);
      this.rings.push({
        x: fighter.x,
        y: fighter.y + 0.1,
        z: fighter.z,
        radius: 0.7,
        maxRadius: effRadius,
        color: '#FB923C',
        alpha: 0.96,
        life: 0.55,
        maxLife: 0.55,
        growSpeed: effRadius * 2.1,
      });
      this.rings.push({
        x: fighter.x,
        y: fighter.y + 0.15,
        z: fighter.z,
        radius: 0.4,
        maxRadius: effRadius * 0.8,
        color: '#38BDF8',
        alpha: 0.9,
        life: 0.42,
        maxLife: 0.42,
        growSpeed: effRadius * 2.4,
      });
      this.spawnBurst(fighter.x, fighter.y + 1.3, fighter.z, '#FB923C', 22);
      this.applyRadialDamage(fighter, fighter.x, fighter.z, effRadius, Math.round(scaledDmg * 0.75), 11.5, true);
      let lightningCount = 0;
      for (const m of this.monsters) {
        if (m.hp > 0 && Math.hypot(m.x - fighter.x, m.z - fighter.z) <= effRadius + 2 && lightningCount < 4) {
          lightningCount++;
          m.stunTimer = Math.max(m.stunTimer, 1.8);
          this.lightnings.push({ x: m.x, z: m.z, color: '#38BDF8', alpha: 1, seed: Math.random() * 100, life: 0.42, maxLife: 0.42 });
          this.damageMonster(fighter, m, Math.round(scaledDmg * 0.45), 3, true);
        }
      }
    } else if (power.id === 'fusion_eternal_glacier') {
      const heal = Math.round(fighter.maxHp * 0.42);
      fighter.hp = Math.min(fighter.maxHp, fighter.hp + heal);
      fighter.shieldTimer = 5.5;
      fighter.shieldActive = true;
      this.spawnFloatingText(fighter.x, fighter.y + 2.7, fighter.z, `+${heal} خلود متجمد!`, '#2DD4BF', 1.32);
      this.rings.push({
        x: fighter.x,
        y: fighter.y + 0.12,
        z: fighter.z,
        radius: 0.6,
        maxRadius: effRadius,
        color: '#2DD4BF',
        alpha: 0.95,
        life: 0.6,
        maxLife: 0.6,
        growSpeed: effRadius * 2,
      });
      this.spawnBurst(fighter.x, fighter.y + 1.2, fighter.z, '#7DD3FC', 22);
      for (const m of this.monsters) {
        if (m.hp > 0 && Math.hypot(m.x - fighter.x, m.z - fighter.z) <= effRadius) {
          m.frozenTimer = 5.0;
          this.damageMonster(fighter, m, scaledDmg, 5.5, true);
        }
      }
      for (const f of this.fighters) {
        if (f.id !== fighter.id && f.team !== fighter.team && f.hp > 0 && Math.hypot(f.x - fighter.x, f.z - fighter.z) <= effRadius) {
          f.frozenTimer = 4.0;
          this.damageFighter(fighter, f, scaledDmg, 5.5, true);
        }
      }
    } else if (power.id === 'fusion_void_eclipse') {
      const sx = fighter.x;
      const sz = fighter.z;
      for (let k = 0; k < 4; k++) {
        this.dashTrails.push({
          x: sx + Math.sin(fighter.yaw) * (k * 1.9),
          y: fighter.y,
          z: sz + Math.cos(fighter.yaw) * (k * 1.9),
          yaw: fighter.yaw,
          color: '#C084FC',
          alpha: 0.92,
          hScale: fighter.avatar.heightScale,
          life: 0.42,
          maxLife: 0.42,
        });
      }
      fighter.x += Math.sin(fighter.yaw) * 7.5;
      fighter.z += Math.cos(fighter.yaw) * 7.5;
      fighter.invulnTimer = 0.75;
      this.constrainToArena(fighter);
      this.spawnFloatingText(fighter.x, fighter.y + 2.6, fighter.z, 'شقّ الأبعاد!', '#C084FC', 1.32);
      this.applyRadialDamage(fighter, (sx + fighter.x) * 0.5, (sz + fighter.z) * 0.5, 4.5, Math.round(scaledDmg * 0.7), 6.0, true);
      [-0.36, -0.18, 0, 0.18, 0.36].forEach((offset) => {
        const a = fighter.yaw + offset;
        this.projectiles.push({
          id: this.nextId('proj'),
          ownerId: fighter.id,
          team: fighter.team,
          x: fighter.x + Math.sin(a) * 0.9,
          y: fighter.y + 1.35,
          z: fighter.z + Math.cos(a) * 0.9,
          vx: Math.sin(a) * 22,
          vz: Math.cos(a) * 22,
          color: '#C084FC',
          coreColor: '#F0ABFC',
          radius: 0.38,
          kind: 'orb',
          damage: Math.round(scaledDmg * 0.42),
          knockback: 5.5,
          life: 1.65,
          homing: true,
          critical: true,
        });
      });
    } else if (power.id === 'fusion_dragon_bastion') {
      fighter.shieldTimer = 6.2;
      fighter.shieldActive = true;
      fighter.invulnTimer = 1.6;
      fighter.vy = 4.6;
      this.spawnFloatingText(fighter.x, fighter.y + 2.7, fighter.z, 'قصف التنين المدرّع!', '#F43F5E', 1.35);
      this.rings.push({
        x: fighter.x,
        y: fighter.y + 0.12,
        z: fighter.z,
        radius: 0.6,
        maxRadius: effRadius,
        color: '#F43F5E',
        alpha: 0.96,
        life: 0.55,
        maxLife: 0.55,
        growSpeed: effRadius * 2.2,
      });
      this.applyRadialDamage(fighter, fighter.x, fighter.z, effRadius * 0.65, Math.round(scaledDmg * 0.55), 11.5, true);
      for (let i = 0; i < 5; i++) {
        const a = fighter.yaw + (i - 2) * 0.5;
        const dist = 3.2 + i * 1.35;
        this.pendingMeteors.push({
          x: fighter.x + Math.sin(a) * dist,
          z: fighter.z + Math.cos(a) * dist,
          delay: 0.12 + i * 0.18,
          damage: Math.round(scaledDmg * 0.52),
          ownerId: fighter.id,
          color: '#F43F5E',
        });
      }
    }

    if (this.mode === 'pvp_online' && fighter.team === 'player1') {
      this.opts.onOnlineVfxSend?.({
        kind: power.id,
        x: fighter.x,
        z: fighter.z,
        color: power.color,
        radius: effRadius,
      });
    }
    return true;
  }

  private triggerDodge(fighter: SimFighter): boolean {
    if (fighter.dodgeCooldown > 0 || fighter.stunTimer > 0) return false;
    fighter.dodgeTimer = 0.24;
    fighter.dodgeChainTimer = 0.55;
    fighter.invulnTimer = 0.38;
    fighter.attackCooldown = Math.min(fighter.attackCooldown, 0.1);
    fighter.dodgeCooldown = Math.max(0.65, 1.3 - fighter.avatar.stats.agi * 0.038);
    fighter.animState = 'dodge';
    fighter.animTime = 0;
    this.dashTrails.push({
      x: fighter.x,
      y: fighter.y,
      z: fighter.z,
      yaw: fighter.yaw,
      color: fighter.avatar.accentColor,
      alpha: 0.85,
      hScale: fighter.avatar.heightScale,
      life: 0.28,
      maxLife: 0.28,
    });
    fighter.vx = Math.sin(fighter.yaw) * 16.5;
    fighter.vz = Math.cos(fighter.yaw) * 16.5;
    audioSynth.playDodge();
    this.spawnBurst(fighter.x, fighter.y + 0.4, fighter.z, '#CBD5E1', 6);
    return true;
  }

  private applyMeleeHitCone(
    attacker: SimFighter,
    range: number,
    halfAngleRad: number,
    damage: number,
    knockback: number,
    critical: boolean
  ) {
    const fx = Math.sin(attacker.yaw);
    const fz = Math.cos(attacker.yaw);

    for (const m of this.monsters) {
      if (m.hp <= 0) continue;
      const dx = m.x - attacker.x;
      const dz = m.z - attacker.z;
      const dist = Math.hypot(dx, dz);
      const monRad = (MONSTERS[m.archetype]?.scale || 1) * 0.7;
      if (dist <= range + monRad) {
        const dot = dist > 0.01 ? (dx * fx + dz * fz) / dist : 1;
        if (dot >= Math.cos(halfAngleRad) || dist < 1.2) {
          this.damageMonster(attacker, m, damage, knockback, critical);
        }
      }
    }

    for (const f of this.fighters) {
      if (f.id === attacker.id || f.team === attacker.team || f.hp <= 0) continue;
      const dx = f.x - attacker.x;
      const dz = f.z - attacker.z;
      const dist = Math.hypot(dx, dz);
      if (dist <= range + 0.75) {
        const dot = dist > 0.01 ? (dx * fx + dz * fz) / dist : 1;
        if (dot >= Math.cos(halfAngleRad) || dist < 1.2) {
          this.damageFighter(attacker, f, damage, knockback, critical);
        }
      }
    }
  }

  private applyRadialDamage(
    attacker: SimFighter,
    cx: number,
    cz: number,
    radius: number,
    damage: number,
    knockback: number,
    critical: boolean
  ) {
    for (const m of this.monsters) {
      if (m.hp <= 0) continue;
      if (Math.hypot(m.x - cx, m.z - cz) <= radius + (MONSTERS[m.archetype]?.scale || 1) * 0.6) {
        this.damageMonster(attacker, m, damage, knockback, critical);
      }
    }
    for (const f of this.fighters) {
      if (f.id === attacker.id || f.team === attacker.team || f.hp <= 0) continue;
      if (Math.hypot(f.x - cx, f.z - cz) <= radius + 0.6) {
        this.damageFighter(attacker, f, damage, knockback, critical);
      }
    }
  }

  private applyWeaponOnHitEffects(attacker: SimFighter, damage: number) {
    const weapon = WEAPONS[attacker.avatar.weaponId];
    if (weapon?.healOnHitPct && attacker.hp > 0) {
      const heal = Math.max(2, Math.round(damage * weapon.healOnHitPct));
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
    }
    if (attacker.overdriveActive && attacker.hp > 0) {
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + Math.round(damage * 0.16));
    }
  }

  private damageMonster(
    attacker: SimFighter,
    monster: SimMonster,
    damage: number,
    knockback: number,
    critical: boolean
  ) {
    monster.hp = Math.max(0, monster.hp - damage);
    monster.hitFlash = 1.0;

    // Enrage trigger for Bosses below 50% HP
    if (monster.isBoss && !monster.enraged && monster.hp > 0 && monster.hp < monster.maxHp * 0.5) {
      monster.enraged = true;
      this.spawnFloatingText(monster.x, monster.y + 3.6, monster.z, 'غضب الزعيم!', '#F97316', 1.3);
      this.rings.push({
        x: monster.x,
        y: monster.y + 0.1,
        z: monster.z,
        radius: 0.6,
        maxRadius: 5.5,
        color: '#F97316',
        alpha: 0.9,
        life: 0.45,
        maxLife: 0.45,
        growSpeed: 12,
      });
    }

    const dx = monster.x - attacker.x;
    const dz = monster.z - attacker.z;
    const d = Math.hypot(dx, dz) || 1;
    const kbScale = monster.isBoss ? 0.28 : 1.0;
    monster.vx += (dx / d) * knockback * kbScale;
    monster.vz += (dz / d) * knockback * kbScale;

    this.applyWeaponOnHitEffects(attacker, damage);

    if (attacker.team === 'player1') {
      this.damageDealt += damage;
      this.combo += 1;
      this.comboTimer = 3.5;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
      attacker.energy = Math.min(attacker.maxEnergy, attacker.energy + 7);
      if (critical) {
        this.critsLanded += 1;
        this.opts.onCritLanded?.();
        this.hitstopTimer = Math.max(this.hitstopTimer, 0.045);
        this.addCameraShake(0.14, 0.26);
        audioSynth.playCriticalSlash();
        if (this.quality !== 'eco') {
          this.lightnings.push({
            x: monster.x,
            z: monster.z,
            color: '#FDE047',
            alpha: 0.82,
            seed: Math.random() * 100,
            life: 0.2,
            maxLife: 0.2,
          });
        }
      }
    }

    audioSynth.playHit(critical);
    this.spawnBurst(monster.x, monster.y + 1.1, monster.z, critical ? '#FDE047' : '#F87171', critical ? 16 : 6);
    this.spawnFloatingText(
      monster.x,
      monster.y + (monster.isBoss ? 3.2 : 2.1),
      monster.z,
      critical ? `حاسمة -${damage}!` : `-${damage}`,
      critical ? '#FDE047' : '#F8FAFC',
      critical ? 1.32 : 1.0
    );

    if (monster.hp <= 0) {
      this.kills += 1;
      this.monsterKillsByType[monster.archetype] = (this.monsterKillsByType[monster.archetype] || 0) + 1;
      if (monster.isBoss && !monster.secretBossId) this.bossKills += 1;
      this.advanceMissionProgress('kill', 1);
      audioSynth.playKo();
      this.spawnBurst(monster.x, monster.y + 1.2, monster.z, MONSTERS[monster.archetype].accentColor, 20);

      if (monster.secretBossId && !this.defeatedSecretBossIds.has(monster.secretBossId)) {
        const sb = SECRET_WORLD_BOSSES.find((b) => b.id === monster.secretBossId);
        if (sb) {
          this.defeatedSecretBossIds.add(sb.id);
          this.secretBossesDefeatedCount += 1;
          this.opts.onDefeatSecretBoss?.(sb);
          audioSynth.playAchievementUnlock();
          this.rings.push({
            x: monster.x,
            y: 0.14,
            z: monster.z,
            radius: 0.8,
            maxRadius: 9.0,
            color: sb.accentColor,
            alpha: 0.98,
            life: 0.65,
            maxLife: 0.65,
            growSpeed: 14,
            isFusion: true,
            secondaryColor: '#FDE047',
          });
          this.spawnFloatingText(monster.x, 3.6, monster.z, `سقط ${sb.name}!`, '#FDE047', 1.4);
          this.showBanner(
            `انتصار أسطوري! هزمت الزعيم السري ${sb.name} (+${sb.rewardGold} ذهب، +${sb.rewardGems} جوهرة، +${sb.rewardMarks} شارة)`,
            4.2
          );
        }
      }

      if (Math.random() < 0.48 || monster.isBoss) {
        this.pickups.push({
          id: this.nextId('pk'),
          x: monster.x,
          z: monster.z,
          kind: Math.random() < 0.52 ? 'heal' : Math.random() < 0.7 ? 'energy' : 'gold',
          bobPhase: Math.random() * 6,
        });
      }
    }
  }

  private damageFighter(
    attacker: SimFighter | null,
    target: SimFighter,
    rawDamage: number,
    knockback: number,
    critical: boolean
  ) {
    if (target.invulnTimer > 0 || target.hp <= 0) return;

    if (this.mode === 'pvp_online' && target.isRemote && attacker?.team === 'player1') {
      const dx = target.x - attacker.x;
      const dz = target.z - attacker.z;
      const d = Math.hypot(dx, dz) || 1;
      this.opts.onOnlineHitSend?.({
        targetId: target.id,
        damage: rawDamage,
        critical,
        knockX: (dx / d) * knockback * 0.7,
        knockZ: (dz / d) * knockback * 0.7,
      });
      this.damageDealt += rawDamage;
      this.combo += 1;
      this.comboTimer = 3.2;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
      return;
    }

    let finalDmg = rawDamage * (1 - target.statsDerived.armorReduction);
    if (target.shieldActive) finalDmg *= 0.35;

    const targetWeapon = WEAPONS[target.avatar.weaponId];
    if (target.animState === 'block') {
      finalDmg *= targetWeapon?.role === 'defense' ? 0.16 : 0.28;
      audioSynth.playParry();
      this.spawnFloatingText(target.x, target.y + 2.3, target.z, 'صدّ!', '#38BDF8', 1.12);
      if (attacker) {
        attacker.stunTimer = Math.max(attacker.stunTimer, targetWeapon?.role === 'defense' ? 0.85 : 0.45);
        // Defense weapons reflect 35% of blocked damage back!
        if (targetWeapon?.role === 'defense') {
          const reflectDmg = Math.max(5, Math.round(rawDamage * 0.35));
          attacker.hp = Math.max(1, attacker.hp - reflectDmg);
          this.spawnFloatingText(attacker.x, attacker.y + 2.1, attacker.z, `انعكاس -${reflectDmg}`, '#60A5FA', 1.0);
        }
      }
    } else {
      audioSynth.playHit(critical);
    }

    const dmg = Math.max(1, Math.round(finalDmg));
    target.hp = Math.max(0, target.hp - dmg);
    target.hitFlash = 1.0;

    if (attacker) {
      const dx = target.x - attacker.x;
      const dz = target.z - attacker.z;
      const d = Math.hypot(dx, dz) || 1;
      target.vx += (dx / d) * knockback;
      target.vz += (dz / d) * knockback;
      this.applyWeaponOnHitEffects(attacker, dmg);

      if (attacker.team === 'player1') {
        this.damageDealt += dmg;
        this.combo += 1;
        this.comboTimer = 3.4;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;
        attacker.energy = Math.min(attacker.maxEnergy, attacker.energy + 8);
        if (critical) {
          this.critsLanded += 1;
          this.opts.onCritLanded?.();
          this.hitstopTimer = Math.max(this.hitstopTimer, 0.04);
          this.addCameraShake(0.13, 0.24);
          audioSynth.playCriticalSlash();
        }
      }
    }

    if (target.team === 'player1') {
      this.addCameraShake(0.14, 0.25);
    }

    this.spawnBurst(target.x, target.y + 1.2, target.z, critical ? '#F59E0B' : '#EF4444', 9);
    this.spawnFloatingText(
      target.x,
      target.y + 2.3,
      target.z,
      critical ? `حاسمة -${dmg}!` : `-${dmg}`,
      target.team === 'player1' ? '#F87171' : critical ? '#FDE047' : '#F8FAFC',
      critical ? 1.22 : 1.0
    );

    if (target.hp <= 0) {
      target.animState = 'dead';
      audioSynth.playKo();
      this.handleFighterDefeat(target);
    }
  }

  private handleFighterDefeat(defeated: SimFighter) {
    if (this.mode === 'pvp_local') {
      if (defeated.team === 'player2') this.scoreP1 += 1;
      else this.scoreP2 += 1;

      if (this.scoreP1 >= 2 || this.scoreP2 >= 2) {
        this.finishMatch(this.scoreP1 >= 2);
      } else {
        this.showBanner(`النتيجة ${this.scoreP1} - ${this.scoreP2} — جولة جديدة!`, 2.2);
        if (this.roundResetTimer) {
          clearTimeout(this.roundResetTimer);
        }
        this.roundResetTimer = setTimeout(() => {
          this.roundResetTimer = null;
          if (this.finished) return;
          const p1 = this.getPlayer1();
          const p2 = this.getPlayer2();
          if (p1) {
            p1.hp = p1.maxHp;
            p1.energy = 100;
            p1.x = -6.8;
            p1.z = 0;
            p1.animState = 'idle';
          }
          if (p2) {
            p2.hp = p2.maxHp;
            p2.energy = 100;
            p2.x = 6.8;
            p2.z = 0;
            p2.animState = 'idle';
          }
        }, 1200);
      }
      return;
    }

    if (this.mode === 'pvp_ranked') {
      this.finishMatch(defeated.team !== 'player1');
      return;
    }

    if (this.mode === 'pvp_online') {
      return;
    }

    if (this.mode === 'world_explore' && defeated.team === 'player1') {
      // Safe Overworld respawn at Haven Village Fountain!
      defeated.hp = defeated.maxHp;
      defeated.energy = defeated.maxEnergy;
      defeated.x = 0;
      defeated.z = 5.5;
      defeated.y = this.getTerrainHeight(0, 5.5);
      defeated.vx = 0;
      defeated.vz = 0;
      defeated.invulnTimer = 2.5;
      defeated.animState = 'idle';
      this.showBanner('أُعيد إحياؤك بسلام عند نافورة قرية الملاذ!', 2.6);
      this.spawnBurst(defeated.x, defeated.y + 1.2, defeated.z, '#38BDF8', 16);
      return;
    }

    if (defeated.team === 'player1') {
      this.finishMatch(false);
    } else {
      this.kills += 1;
      this.advanceMissionProgress('kill', 1);
      if (this.mode === 'unified_clash') {
        this.scoreP1 += 1;
        this.showBanner(`أسقطت البطل المنافس ${defeated.name}! (+14 تصنيف)`, 2.2);
        this.pickups.push({
          id: this.nextId('pk'),
          x: defeated.x,
          z: defeated.z,
          kind: 'heal',
          bobPhase: 0,
        });
      }
      this.fighters = this.fighters.filter((f) => f.id !== defeated.id);
    }
  }

  private getActiveMissionDef(): { id: 'highground' | 'shrine' | 'kill'; title: string; target: number; rewardText: string } | null {
    if (this.mode === 'pvp_ranked' || this.mode === 'pvp_local' || this.mode === 'pvp_online') return null;
    const cycle = this.missionIndex % 3;
    if (cycle === 0) {
      return { id: 'highground', title: 'سيطر على المرتفع 4 ثوانٍ', target: 4, rewardText: '+80 ذهب وشفاء' };
    }
    if (cycle === 1) {
      return { id: 'shrine', title: 'فعّل محرابين في الخريطة', target: 2, rewardText: '+100 ذهب وطاقة' };
    }
    return { id: 'kill', title: 'اهزم 5 أعداء بسرعة', target: 5, rewardText: '+120 ذهب وغضب' };
  }

  private advanceMissionProgress(kind: 'highground' | 'shrine' | 'kill', amount: number) {
    const def = this.getActiveMissionDef();
    if (!def || def.id !== kind) return;
    this.missionProgress += amount;
    if (this.missionProgress >= def.target) {
      this.missionProgress = 0;
      this.missionIndex += 1;
      this.missionsDone += 1;
      const p1 = this.getPlayer1();
      if (def.id === 'highground') {
        this.bonusMissionGold += 80;
        if (p1) p1.hp = Math.min(p1.maxHp, p1.hp + Math.round(p1.maxHp * 0.25));
      } else if (def.id === 'shrine') {
        this.bonusMissionGold += 100;
        if (p1) p1.energy = p1.maxEnergy;
      } else {
        this.bonusMissionGold += 120;
        if (p1) {
          p1.overdriveTimer = Math.max(p1.overdriveTimer, 4.5);
          p1.overdriveActive = true;
        }
      }
      audioSynth.playReward();
      this.showBanner(`أُنجزت المهمة الميدانية! (${def.rewardText})`, 2.6);
    }
  }

  private spawnWave(waveNum: number) {
    this.wave = waveNum;
    const isMagmaBossWave = waveNum === 3 || (waveNum % 3 === 0 && waveNum < 6);
    const isVoidColossusWave = waveNum >= 6 && waveNum % 3 === 0;
    const count = this.mode === 'unified_clash' ? Math.min(7, 2 + waveNum) : Math.min(8, 3 + waveNum);

    const pool: MonsterArchetype[] =
      waveNum === 1
        ? ['ash_stalker', 'ember_imp', 'venom_crawler']
        : waveNum === 2
          ? ['ash_stalker', 'ember_imp', 'venom_crawler', 'frost_specter', 'obsidian_golem']
          : waveNum === 3
            ? ['ember_imp', 'venom_crawler', 'frost_specter', 'obsidian_golem', 'wraith_knight']
            : ['venom_crawler', 'frost_specter', 'obsidian_golem', 'wraith_knight', 'shadow_reaper'];

    for (let i = 0; i < count; i++) {
      const arch = pool[Math.floor(Math.random() * pool.length)];
      this.spawnMonster(arch, waveNum, i);
    }

    if (this.mode === 'unified_clash') {
      const champ = RIVAL_CHAMPIONS[(waveNum - 1) % RIVAL_CHAMPIONS.length];
      const ang = (waveNum * 1.9 + 0.6) % (Math.PI * 2);
      const spawnR = this.arena.radius - 4.5;
      const rival = this.createFighter(
        this.nextId('unified_rival'),
        champ.avatar,
        Math.cos(ang) * spawnR,
        Math.sin(ang) * spawnR,
        0,
        'enemy',
        Math.min(4, 1 + Math.floor(waveNum / 2)),
        true,
        Math.min(0.9, 0.58 + (waveNum - 1) * 0.06)
      );
      const hpScale = waveNum === 1 ? 0.68 : 0.78 + waveNum * 0.08;
      rival.maxHp = Math.round(rival.maxHp * hpScale);
      rival.hp = rival.maxHp;
      this.fighters.push(rival);

      if (isVoidColossusWave) {
        this.spawnMonster('void_colossus', waveNum, 99);
        this.showBanner(`الموجة ${waveNum}: عملاق الهاوية + البطل ${champ.name}!`, 3.2);
      } else if (isMagmaBossWave) {
        this.spawnMonster('magma_boss', waveNum, 99);
        this.showBanner(`الموجة ${waveNum}: سيد الحمم + البطل ${champ.name}!`, 3.0);
      } else {
        this.showBanner(`الموجة ${waveNum} — سلسلة الوحوش + البطل ${champ.name}!`, 2.5);
      }
      return;
    }

    if (isVoidColossusWave || (this.mode === 'monster_raid' && waveNum === 6)) {
      this.spawnMonster('void_colossus', waveNum, 99);
      this.showBanner('تحذير: ظهر زعيم السلسلة الأعلى «عملاق الهاوية الأسطوري»!', 3.2);
    } else if (isMagmaBossWave) {
      this.spawnMonster('magma_boss', waveNum, 99);
      this.showBanner('تحذير: ظهر زعيم الساحة «سيد الحمم المدرّع»!', 3.0);
    } else if (this.mode === 'free_combat' && waveNum >= 2) {
      const champ = RIVAL_CHAMPIONS[(waveNum - 2) % RIVAL_CHAMPIONS.length];
      const ang = Math.random() * Math.PI * 2;
      const rival = this.createFighter(
        this.nextId('free_rival'),
        champ.avatar,
        Math.cos(ang) * (this.arena.radius - 4.0),
        Math.sin(ang) * (this.arena.radius - 4.0),
        0,
        'enemy',
        1,
        true,
        0.62
      );
      rival.maxHp = Math.round(rival.maxHp * 0.72);
      rival.hp = rival.maxHp;
      this.fighters.push(rival);
      this.showBanner(`الموجة ${waveNum} — اقتحم المقاتل ${champ.name} الساحة!`, 2.6);
    } else {
      this.showBanner(
        this.mode === 'monster_raid' ? `غارة سلسلة الوحوش — الموجة ${waveNum} من 6` : `الموجة ${waveNum} — استعد للقتال!`,
        2.2
      );
    }
  }

  private spawnMonster(archetype: MonsterArchetype, waveNum: number, slot: number) {
    const def = MONSTERS[archetype];
    const ang = Math.random() * Math.PI * 2;
    const dist = this.arena.radius - 3.0;
    const scaleHp = 1 + (waveNum - 1) * 0.14;
    const hp = Math.round(def.maxHp * scaleHp);
    const x = Math.cos(ang) * dist;
    const z = Math.sin(ang) * dist;

    this.monsters.push({
      id: this.nextId('mon'),
      archetype,
      name: def.name,
      x,
      y: this.getTerrainHeight(x, z),
      z,
      vx: 0,
      vy: 0,
      vz: 0,
      yaw: Math.atan2(-Math.cos(ang), -Math.sin(ang)),
      hp,
      maxHp: hp,
      walkPhase: Math.random() * 5,
      attackTimer: 0,
      attackCooldown: 0.9 + Math.random() * 0.8,
      telegraphTimer: 0,
      telegraphMax: 0.75,
      telegraphRadius: def.isBoss ? 4.8 : 2.9,
      pendingStrike: false,
      hitFlash: 0,
      frozenTimer: 0,
      stunTimer: 0,
      isBoss: def.isBoss,
      flankSlot: slot % 5,
      enraged: false,
    });
  }

  public dispose() {
    if (this.roundResetTimer) {
      clearTimeout(this.roundResetTimer);
      this.roundResetTimer = null;
    }
    this.finished = true;
  }

  public finishMatch(victory: boolean) {
    if (this.finished) return;
    this.finished = true;
    if (this.roundResetTimer) {
      clearTimeout(this.roundResetTimer);
      this.roundResetTimer = null;
    }

    const mult = this.arena.rewardMultiplier;
    const baseGold =
      this.mode === 'pvp_ranked'
        ? victory
          ? 240
          : 75
        : this.mode === 'pvp_local'
          ? 140
          : this.mode === 'pvp_online'
            ? 120 + this.scoreP1 * 90
            : this.mode === 'unified_clash'
              ? this.kills * 28 + this.bossKills * 165 + this.scoreP1 * 90 + (victory ? 180 : 50)
              : this.kills * 26 + this.bossKills * 150 + (victory ? 180 : 40);

    const p1 = this.getPlayer1();
    const lootMult = p1?.statsDerived.lootMultiplier ?? 1;
    const goldEarned = Math.round((baseGold * mult + this.bonusMissionGold) * lootMult);
    const gemsEarned =
      this.bossKills * 9 +
      this.missionsDone * 2 +
      (this.mode === 'unified_clash' ? this.scoreP1 * 3 : 0) +
      (victory && (this.mode === 'pvp_ranked' || this.mode === 'monster_raid' || this.mode === 'unified_clash') ? 10 : 0) +
      Math.floor(this.wave / 3) * 3;
    const xpEarned = Math.round(
      (this.kills * 24 + this.wave * 35 + this.scoreP1 * 35 + this.missionsDone * 45 + (victory ? 120 : 35)) * mult * lootMult
    );
    const ratingDelta =
      this.mode === 'pvp_ranked'
        ? victory
          ? 34
          : -16
        : this.mode === 'pvp_online'
          ? this.scoreP1 * 18
          : this.mode === 'unified_clash'
            ? this.scoreP1 * 14 + (this.wave >= 3 ? 12 : 0)
            : 0;

    if (victory) audioSynth.playReward();

    const resultArenaId: ArenaId =
      this.arena.id === 'etheria_overworld' ? this.opts.arenaId : (this.arena.id as ArenaId);

    this.opts.onFinish({
      mode: this.mode,
      arenaId: resultArenaId,
      victory,
      kills: this.kills,
      bossKills: this.bossKills,
      critsLanded: this.critsLanded,
      fusionCasts: this.fusionCasts,
      secretBossesDefeated: this.secretBossesDefeatedCount,
      worldEventsCompleted: this.worldEventsCompletedCount,
      waveReached: this.wave,
      maxCombo: this.maxCombo,
      damageDealt: Math.round(this.damageDealt),
      durationSec: Math.round(this.time),
      goldEarned,
      gemsEarned,
      xpEarned,
      ratingDelta,
      missionsDone: this.missionsDone,
      monsterKillsByType: { ...this.monsterKillsByType },
      opponentName: this.mode === 'pvp_ranked' ? this.rivalChampion.name : undefined,
      p1Score: this.scoreP1,
      p2Score: this.scoreP2,
    });
  }

  public step(rawDt: number) {
    if (this.paused || this.finished) return;
    const dt = Math.min(0.05, Math.max(0.001, rawDt));
    this.fpsSamples = this.fpsSamples * 0.92 + (1 / dt) * 0.08;

    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return;
    }

    this.time += dt;
    if (this.bannerTimer > 0) this.bannerTimer -= dt;
    if (this.npcDialogueTimer > 0) {
      this.npcDialogueTimer -= dt;
      if (this.npcDialogueTimer <= 0) this.npcDialogue = null;
    }
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }
    if (this.shakeTimer > 0) this.shakeTimer -= dt;

    // 0. Pending Meteors from meteor_rain power
    if (this.pendingMeteors.length > 0) {
      const nextMeteors: PendingMeteor[] = [];
      for (const met of this.pendingMeteors) {
        met.delay -= dt;
        if (met.delay <= 0) {
          const owner = this.fighters.find((f) => f.id === met.ownerId);
          const gy = this.getTerrainHeight(met.x, met.z);
          this.rings.push({
            x: met.x,
            y: gy + 0.08,
            z: met.z,
            radius: 0.4,
            maxRadius: 3.8,
            color: met.color,
            alpha: 0.95,
            filled: true,
            life: 0.4,
            maxLife: 0.4,
            growSpeed: 9.5,
          });
          this.spawnBurst(met.x, gy + 1.2, met.z, met.color, 14);
          if (owner) this.applyRadialDamage(owner, met.x, met.z, 3.8, met.damage, 6.5, true);
        } else {
          nextMeteors.push(met);
        }
      }
      this.pendingMeteors = nextMeteors;
    }

    // 1. Update Fighters
    for (const f of this.fighters) {
      this.updateFighter(f, dt);
    }

    // 2. Update Monsters
    for (const m of this.monsters) {
      this.updateMonster(m, dt);
    }
    this.monsters = this.monsters.filter((m) => m.hp > 0);

    // 3. Wave progression OR Overworld Biome Exploration
    if (this.mode === 'world_explore') {
      this.overworldRespawnTimer += dt;
      if (this.overworldRespawnTimer >= 5.5 && this.monsters.length < 18) {
        this.overworldRespawnTimer = 0;
        this.spawnOverworldBiomesMonsters(18);
      }
      for (const nodeId of Object.keys(this.nodeRespawns)) {
        if (this.nodeRespawns[nodeId] > 0) {
          this.nodeRespawns[nodeId] = Math.max(0, this.nodeRespawns[nodeId] - dt);
        }
      }
      const exploreP1 = this.getPlayer1();
      if (exploreP1 && exploreP1.hp > 0) {
        this.updateOverworldStreaming(exploreP1.x, exploreP1.z);
        this.updateOverworldExplore(exploreP1, dt);
      }
    } else if (this.mode === 'unified_clash' || this.mode === 'free_combat' || this.mode === 'monster_raid') {
      const hostileFighters = this.fighters.filter((f) => f.team === 'enemy' && f.hp > 0);
      if (this.monsters.length === 0 && hostileFighters.length === 0) {
        if (this.mode === 'monster_raid' && this.wave >= 6) {
          this.finishMatch(true);
          return;
        }
        this.waveDelayTimer += dt;
        if (this.waveDelayTimer >= 1.8) {
          this.waveDelayTimer = 0;
          this.spawnWave(this.wave + 1);
        }
      }
    }

    // 4. Arena Environmental Hazards (e.g., Magma Vents)
    if (this.arena.hazardType === 'lava_vents') {
      this.hazardTimer -= dt;
      if (this.hazardTimer <= 0) {
        this.hazardTimer = 6.5;
        const ang = Math.random() * Math.PI * 2;
        const dist = 5.5 + Math.random() * (this.arena.radius - 7.5);
        const hx = Math.cos(ang) * dist;
        const hz = Math.sin(ang) * dist;
        this.rings.push({
          x: hx,
          y: 0.08,
          z: hz,
          radius: 0.5,
          maxRadius: 3.1,
          color: '#F97316',
          alpha: 0.9,
          filled: true,
          life: 0.8,
          maxLife: 0.8,
          growSpeed: 3.4,
        });
        this.spawnBurst(hx, 0.6, hz, '#FB923C', 10);
        for (const f of this.fighters) {
          if (f.hp > 0 && !f.onHighGround && Math.hypot(f.x - hx, f.z - hz) < 2.8) {
            this.damageFighter(null, f, 15, 4, false);
          }
        }
      }
    }

    // 5. Pickups Spawn & Collection
    this.pickupTimer -= dt;
    if (this.pickupTimer <= 0 && this.pickups.length < 4 && this.mode !== 'pvp_online') {
      this.pickupTimer = 9.5;
      const a = Math.random() * Math.PI * 2;
      const r = 3.0 + Math.random() * (this.arena.radius - 6);
      this.pickups.push({
        id: this.nextId('pk'),
        x: Math.cos(a) * r,
        z: Math.sin(a) * r,
        kind: Math.random() < 0.55 ? 'heal' : 'energy',
        bobPhase: Math.random() * 6,
      });
    }

    const p1 = this.getPlayer1();
    if (p1 && p1.hp > 0) {
      if (p1.onHighGround) {
        this.advanceMissionProgress('highground', dt);
      }

      this.pickups = this.pickups.filter((pk) => {
        if (Math.hypot(p1.x - pk.x, p1.z - pk.z) < 1.65) {
          if (pk.kind === 'heal') {
            const amt = Math.round(p1.maxHp * 0.24);
            p1.hp = Math.min(p1.maxHp, p1.hp + amt);
            this.spawnFloatingText(p1.x, p1.y + 2.4, p1.z, `+${amt} صحة`, '#10B981', 1.1);
          } else if (pk.kind === 'energy') {
            p1.energy = p1.maxEnergy;
            this.spawnFloatingText(p1.x, p1.y + 2.4, p1.z, 'طاقة كاملة!', '#38BDF8', 1.1);
          } else {
            this.bonusMissionGold += 30;
            this.spawnFloatingText(p1.x, p1.y + 2.4, p1.z, '+30 ذهب', '#F59E0B', 1.1);
          }
          audioSynth.playReward();
          return false;
        }
        return true;
      });
    }

    // 5b. Interactive 3D Arena Shrines (Player1 OR Smart Rival AI can activate!)
    for (const shrine of this.arena.shrines) {
      const rem = this.shrineCooldowns[shrine.id] || 0;
      if (rem > 0) {
        this.shrineCooldowns[shrine.id] = Math.max(0, rem - dt);
        continue;
      }
      for (const fighter of this.fighters) {
        if (fighter.hp <= 0 || fighter.isRemote) continue;
        if (Math.hypot(fighter.x - shrine.x, fighter.z - shrine.z) < 2.2) {
          this.shrineCooldowns[shrine.id] = 15.0;
          const baseH = this.getTerrainHeight(shrine.x, shrine.z);
          if (shrine.kind === 'heal') {
            const healAmt = Math.round(fighter.maxHp * 0.28);
            fighter.hp = Math.min(fighter.maxHp, fighter.hp + healAmt);
            this.spawnFloatingText(shrine.x, baseH + 2.6, shrine.z, `${shrine.label}: +${healAmt}`, '#10B981', 1.15);
            audioSynth.playReward();
          } else if (shrine.kind === 'energy') {
            fighter.energy = fighter.maxEnergy;
            for (let sIdx = 0; sIdx < 4; sIdx++) {
              fighter.slotCooldowns[sIdx] = Math.max(0, fighter.slotCooldowns[sIdx] - 3.5);
            }
            fighter.powerCooldown = fighter.slotCooldowns[0];
            fighter.secondaryCooldown = fighter.slotCooldowns[1];
            this.spawnFloatingText(shrine.x, baseH + 2.6, shrine.z, `${shrine.label}: طاقة!`, '#38BDF8', 1.15);
            audioSynth.playReward();
          } else {
            fighter.overdriveTimer = Math.max(fighter.overdriveTimer, 5.5);
            fighter.overdriveActive = true;
            this.spawnFloatingText(shrine.x, baseH + 2.6, shrine.z, `${shrine.label}: +55% قوة!`, '#F59E0B', 1.2);
            audioSynth.playPower();
          }
          if (fighter.team === 'player1') {
            this.advanceMissionProgress('shrine', 1);
          }
          this.rings.push({
            x: shrine.x,
            y: baseH + 0.1,
            z: shrine.z,
            radius: 0.5,
            maxRadius: 3.4,
            color: shrine.color,
            alpha: 0.9,
            life: 0.45,
            maxLife: 0.45,
            growSpeed: 7.2,
          });
          this.spawnBurst(shrine.x, baseH + 1.3, shrine.z, shrine.color, 12);
          break;
        }
      }
    }

    // 6. Update Projectiles & VFX
    this.updateProjectiles(dt);
    this.updateVfx(dt);

    // 7. Update Online Network Sync (20 Hz)
    if (this.mode === 'pvp_online' && p1) {
      this.onlineSendTimer += dt;
      if (this.onlineSendTimer >= 0.05) {
        this.onlineSendTimer = 0;
        this.opts.onOnlineStateSend?.({
          x: p1.x,
          y: p1.y,
          z: p1.z,
          yaw: p1.yaw,
          animState: p1.animState,
          animTimer: p1.animTime,
          comboStep: p1.comboStep,
          shieldActive: p1.shieldActive,
          overdriveActive: p1.overdriveActive,
          energy: p1.energy,
        });
      }
    }

    // 8. Smooth 3D Camera Choreography
    this.updateCamera(dt);
  }

  private updateFighter(f: SimFighter, dt: number) {
    if (f.hitFlash > 0) f.hitFlash = Math.max(0, f.hitFlash - dt * 4.5);
    if (f.frozenTimer > 0) f.frozenTimer = Math.max(0, f.frozenTimer - dt);
    if (f.stunTimer > 0) f.stunTimer = Math.max(0, f.stunTimer - dt);
    if (f.invulnTimer > 0) f.invulnTimer = Math.max(0, f.invulnTimer - dt);
    if (f.attackCooldown > 0) f.attackCooldown = Math.max(0, f.attackCooldown - dt);
    if (f.heavyCooldown > 0) f.heavyCooldown = Math.max(0, f.heavyCooldown - dt);
    if (f.powerCooldown > 0) f.powerCooldown = Math.max(0, f.powerCooldown - dt);
    if (f.secondaryCooldown > 0) f.secondaryCooldown = Math.max(0, f.secondaryCooldown - dt);
    for (let i = 0; i < 4; i++) {
      if (f.slotCooldowns[i] > 0) f.slotCooldowns[i] = Math.max(0, f.slotCooldowns[i] - dt);
    }
    if (f.dodgeCooldown > 0) f.dodgeCooldown = Math.max(0, f.dodgeCooldown - dt);
    if (f.dodgeTimer > 0) f.dodgeTimer = Math.max(0, f.dodgeTimer - dt);
    if (f.dodgeChainTimer > 0) f.dodgeChainTimer = Math.max(0, f.dodgeChainTimer - dt);
    if (f.coyoteTimer > 0) f.coyoteTimer = Math.max(0, f.coyoteTimer - dt);
    if (f.jumpBufferTimer > 0) f.jumpBufferTimer = Math.max(0, f.jumpBufferTimer - dt);
    if (f.squashTimer > 0) f.squashTimer = Math.max(0, f.squashTimer - dt);
    if (f.magmaTickTimer > 0) f.magmaTickTimer = Math.max(0, f.magmaTickTimer - dt);

    if (f.shieldTimer > 0) {
      f.shieldTimer -= dt;
      if (f.shieldTimer <= 0) f.shieldActive = false;
    }
    if (f.overdriveTimer > 0) {
      f.overdriveTimer -= dt;
      if (f.overdriveTimer <= 0) f.overdriveActive = false;
    }

    if (f.isRemote || f.hp <= 0) return;

    // Drain 150ms input buffer if ready
    if (f.team === 'player1' && this.bufferedAction) {
      if (this.time > this.bufferedAction.expiresAt) {
        this.bufferedAction = null;
      } else if (this.executeBufferedKind(f, this.bufferedAction.kind)) {
        this.bufferedAction = null;
      }
    }

    f.energy = Math.min(f.maxEnergy, f.energy + f.statsDerived.energyRegen * dt);
    f.animTime += dt;

    // Terrain zone & elevation detection
    const groundY = this.getTerrainHeight(f.x, f.z);
    if (f.y <= groundY + 0.08 && f.vy <= 0) {
      f.coyoteTimer = 0.12;
      if (f.jumpBufferTimer > 0 && f.team === 'player1') {
        this.triggerJump(f);
      }
    }

    f.onHighGround = groundY > 0.25;
    let zoneSpeedMult = 1.0;
    f.terrainNote = f.onHighGround ? 'مرتفع تكتيكي (+12% ضرر)' : '';

    if (this.mode === 'world_explore' && Math.hypot(f.x, f.z) <= 22) {
      f.hp = Math.min(f.maxHp, f.hp + f.maxHp * 0.045 * dt);
      f.terrainNote = 'قرية الملاذ (أمان وتجديد صحة)';
    }

    for (const tz of this.arena.terrainZones) {
      if (Math.hypot(f.x - tz.x, f.z - tz.z) <= tz.radius) {
        if (tz.kind === 'ice_patch' || tz.kind === 'rune_pad') {
          zoneSpeedMult = 1.24;
          f.terrainNote = `${tz.label} (+24% سرعة)`;
        } else if (tz.kind === 'healing_spring') {
          f.hp = Math.min(f.maxHp, f.hp + f.maxHp * 0.032 * dt);
          f.terrainNote = `${tz.label} (تجديد صحة)`;
        } else if (tz.kind === 'meadow') {
          zoneSpeedMult = 1.1;
          f.terrainNote = `${tz.label} (حركة مرنة)`;
        } else if (tz.kind === 'water_lake') {
          f.terrainNote = `${tz.label}`;
        } else if (tz.kind === 'ash_land') {
          f.terrainNote = `${tz.label} (منطقة وحوش نخبة)`;
        } else if (tz.kind === 'magma_pool' && f.y <= groundY + 0.25 && !f.shieldActive) {
          f.terrainNote = 'تحذير: بركة حمم!';
          if (f.magmaTickTimer <= 0) {
            f.magmaTickTimer = 1.25;
            this.damageFighter(null, f, 10, 1.5, false);
          }
        }
      }
    }

    const sprintMult =
      f.team === 'player1' && this.sprintActive ? (this.mode === 'world_explore' ? 1.75 : 1.22) : 1.0;
    const speedMult = (f.frozenTimer > 0 ? 0.5 : 1.0) * (f.overdriveActive ? 1.15 : 1.0) * zoneSpeedMult * sprintMult;
    let moveX = 0;
    let moveZ = 0;
    let blocking = false;

    if (f.team === 'player1') {
      const kb = this.keyBindings;
      if (this.keys.has(kb.moveForward) || (this.mode !== 'pvp_local' && this.keys.has('ArrowUp'))) moveZ -= 1;
      if (this.keys.has(kb.moveBackward) || (this.mode !== 'pvp_local' && this.keys.has('ArrowDown'))) moveZ += 1;
      if (this.keys.has(kb.moveLeft) || (this.mode !== 'pvp_local' && this.keys.has('ArrowLeft'))) moveX -= 1;
      if (this.keys.has(kb.moveRight) || (this.mode !== 'pvp_local' && this.keys.has('ArrowRight'))) moveX += 1;

      if (Math.abs(this.virtualInput.mx) > 0.05 || Math.abs(this.virtualInput.mz) > 0.05) {
        moveX += this.virtualInput.mx;
        moveZ += this.virtualInput.mz;
      }
      blocking = this.keys.has(kb.block);
    } else if (f.team === 'player2') {
      if (this.keys.has('ArrowUp')) moveZ -= 1;
      if (this.keys.has('ArrowDown')) moveZ += 1;
      if (this.keys.has('ArrowLeft')) moveX -= 1;
      if (this.keys.has('ArrowRight')) moveX += 1;
      blocking = this.keys.has('KeyM');
    } else if (f.isAi) {
      const aiMove = this.computeAiFighterControl(f, dt);
      moveX = aiMove.mx;
      moveZ = aiMove.mz;
      blocking = aiMove.blocking;
    }

    if (!f.isAi && (moveX !== 0 || moveZ !== 0)) {
      const len = Math.hypot(moveX, moveZ) || 1;
      moveX /= len;
      moveZ /= len;
      const cos = Math.cos(this.camYaw);
      const sin = Math.sin(this.camYaw);
      const rx = moveX * cos + moveZ * sin;
      const rz = -moveX * sin + moveZ * cos;
      moveX = rx;
      moveZ = rz;
    }

    let targetBank = 0;
    if (f.stunTimer <= 0 && f.dodgeTimer <= 0) {
      if (blocking && !f.isAirborne) {
        f.animState = 'block';
        f.vx *= Math.pow(0.04, dt);
        f.vz *= Math.pow(0.04, dt);
      } else if (Math.abs(moveX) > 0.01 || Math.abs(moveZ) > 0.01) {
        const sp = f.statsDerived.moveSpeed * speedMult;
        const accel = f.isAirborne ? 13.5 : 17.5;
        f.vx += (moveX * sp - f.vx) * Math.min(1, dt * accel);
        f.vz += (moveZ * sp - f.vz) * Math.min(1, dt * accel);
        const desiredYaw = Math.atan2(moveX, moveZ);
        let diffYaw = desiredYaw - f.yaw;
        while (diffYaw > Math.PI) diffYaw -= Math.PI * 2;
        while (diffYaw < -Math.PI) diffYaw += Math.PI * 2;
        if (f.animState !== 'attack' && f.animState !== 'heavy' && f.animState !== 'power') {
          f.yaw += diffYaw * (1 - Math.exp(-16 * dt));
          f.animState = 'run';
          targetBank = Math.max(-0.26, Math.min(0.26, diffYaw * 0.42));
        }
        f.walkPhase += dt * (sp / 5.6) * (f.isAirborne ? 0.35 : 1);
      } else {
        const damp = f.isAirborne ? 0.35 : 0.008;
        f.vx *= Math.pow(damp, dt);
        f.vz *= Math.pow(damp, dt);
        if (f.animState === 'run' || f.animState === 'block') {
          f.animState = 'idle';
        }
      }
    } else {
      f.vx *= Math.pow(0.25, dt);
      f.vz *= Math.pow(0.25, dt);
    }

    f.bankAngle = (f.bankAngle || 0) + (targetBank - (f.bankAngle || 0)) * (1 - Math.exp(-12 * dt));

    if (
      (f.animState === 'attack' && f.animTime > 0.3) ||
      (f.animState === 'heavy' && f.animTime > 0.44) ||
      (f.animState === 'power' && f.animTime > 0.46) ||
      (f.animState === 'dodge' && f.dodgeTimer <= 0)
    ) {
      f.animState = 'idle';
    }

    f.x += f.vx * dt;
    f.z += f.vz * dt;
    this.constrainToArena(f);

    // Smooth vertical platform stepping + airborne jump gravity + landing squash
    const targetGround = this.getTerrainHeight(f.x, f.z);
    if (f.vy > 0 || f.y > targetGround + 0.03) {
      f.isAirborne = true;
      const prevVy = f.vy;
      f.vy -= 26.5 * dt;
      f.y += f.vy * dt;
      if (f.y <= targetGround) {
        f.y = targetGround;
        f.vy = 0;
        f.isAirborne = false;
        if (prevVy < -2.6) {
          f.squash = 0.78;
          f.squashTimer = 0.18;
          this.spawnBurst(f.x, targetGround + 0.1, f.z, '#CBD5E1', 5);
          if (f.team === 'player1') {
            audioSynth.playLand();
          }
        }
      }
    } else {
      f.isAirborne = false;
      f.y += (targetGround - f.y) * Math.min(1, dt * 14);
    }

    const desiredSquash = f.squashTimer > 0 ? (f.squash ?? 1) : f.isAirborne ? 1.1 : 1.0;
    f.squash = (f.squash ?? 1) + (desiredSquash - (f.squash ?? 1)) * (1 - Math.exp(-15 * dt));
  }

  private computeAiFighterControl(ai: SimFighter, dt: number): { mx: number; mz: number; blocking: boolean } {
    const p1 = this.getPlayer1();
    if (!p1 || p1.hp <= 0) return { mx: 0, mz: 0, blocking: false };

    ai.aiDecisionTimer -= dt;
    if (ai.aiDecisionTimer <= 0) {
      ai.aiDecisionTimer = 0.45 + Math.random() * 0.65;
      ai.aiStrafeDir = Math.random() < 0.5 ? -1 : 1;
    }

    // Smart AI Shrine Seeking: seek active Heal Shrine if HP < 55%, or close Fury Shrine
    if (ai.hp < ai.maxHp * 0.55) {
      for (const sh of this.arena.shrines) {
        if (sh.kind === 'heal' && (this.shrineCooldowns[sh.id] || 0) <= 0) {
          const sx = sh.x - ai.x;
          const sz = sh.z - ai.z;
          const sd = Math.hypot(sx, sz) || 1;
          ai.yaw = Math.atan2(sx, sz);
          return { mx: sx / sd, mz: sz / sd, blocking: false };
        }
      }
    } else {
      for (const sh of this.arena.shrines) {
        if (sh.kind === 'fury' && (this.shrineCooldowns[sh.id] || 0) <= 0) {
          const sx = sh.x - ai.x;
          const sz = sh.z - ai.z;
          const sd = Math.hypot(sx, sz);
          if (sd < 7.5) {
            ai.yaw = Math.atan2(sx, sz);
            return { mx: sx / (sd || 1), mz: sz / (sd || 1), blocking: false };
          }
        }
      }
    }

    const dx = p1.x - ai.x;
    const dz = p1.z - ai.z;
    const dist = Math.hypot(dx, dz) || 1;
    ai.yaw = Math.atan2(dx, dz);

    const weapon = WEAPONS[ai.avatar.weaponId] || WEAPONS.vanguard_sword;
    const idealDist = weapon.isRanged ? 8.6 : weapon.range * 0.85;

    // Reactive dodge/block against incoming heavy or power
    if (dist < 4.5 && (p1.animState === 'heavy' || p1.animState === 'power')) {
      if (ai.dodgeCooldown <= 0 && Math.random() < ai.aiDifficulty * 0.68) {
        ai.yaw = Math.atan2(-dz * ai.aiStrafeDir, dx * ai.aiStrafeDir);
        this.triggerDodge(ai);
        return { mx: 0, mz: 0, blocking: false };
      }
      if (Math.random() < ai.aiDifficulty * 0.45) {
        return { mx: 0, mz: 0, blocking: true };
      }
    }

    // Use Active Skills smartly in AI combat
    if (dist < 7.5 && ai.slotCooldowns[0] <= 0 && ai.energy >= 45 && Math.random() < 0.045 * ai.aiDifficulty) {
      this.triggerSkillSlot(ai, 0);
      return { mx: 0, mz: 0, blocking: false };
    }
    if (ai.slotCooldowns[1] <= 0 && ai.energy >= 40 && (ai.hp < ai.maxHp * 0.7 || dist < 6) && Math.random() < 0.035 * ai.aiDifficulty) {
      this.triggerSkillSlot(ai, 1);
      return { mx: 0, mz: 0, blocking: false };
    }

    if (dist <= weapon.range + 0.5) {
      if (ai.heavyCooldown <= 0 && Math.random() < 0.055 * ai.aiDifficulty) {
        this.triggerHeavySkill(ai);
      } else if (ai.attackCooldown <= 0 && Math.random() < 0.16 * ai.aiDifficulty) {
        this.triggerPrimaryAttack(ai);
      }
      return {
        mx: (-dz / dist) * ai.aiStrafeDir * 0.6,
        mz: (dx / dist) * ai.aiStrafeDir * 0.6,
        blocking: false,
      };
    }

    const dir = dist > idealDist ? 1 : -0.65;
    return {
      mx: (dx / dist) * dir + (-dz / dist) * ai.aiStrafeDir * 0.28,
      mz: (dz / dist) * dir + (dx / dist) * ai.aiStrafeDir * 0.28,
      blocking: false,
    };
  }

  private updateMonster(m: SimMonster, dt: number) {
    if (m.hitFlash > 0) m.hitFlash = Math.max(0, m.hitFlash - dt * 4.5);
    if (m.frozenTimer > 0) m.frozenTimer = Math.max(0, m.frozenTimer - dt);
    if (m.stunTimer > 0) m.stunTimer = Math.max(0, m.stunTimer - dt);
    if (m.attackTimer > 0) m.attackTimer = Math.max(0, m.attackTimer - dt);
    if (m.attackCooldown > 0) m.attackCooldown = Math.max(0, m.attackCooldown - dt);

    const def = MONSTERS[m.archetype] || MONSTERS.ash_stalker;
    const p1 = this.getPlayer1();
    if (!p1 || p1.hp <= 0) return;

    const dx = p1.x - m.x;
    const dz = p1.z - m.z;
    const dist = Math.hypot(dx, dz) || 1;
    const speedMult = (m.frozenTimer > 0 ? 0.42 : 1.0) * (m.enraged ? 1.25 : 1.0);

    // Overworld leash: don't aggro from across the continent or chase player into Haven Safe Village
    if (this.mode === 'world_explore') {
      const p1InSafeVillage = Math.hypot(p1.x, p1.z) <= 17.5;
      if (dist > 20 || p1InSafeVillage) {
        m.vx *= Math.pow(0.08, dt);
        m.vz *= Math.pow(0.08, dt);
        m.telegraphTimer = 0;
        m.pendingStrike = false;
        const dOrigin = Math.hypot(m.x, m.z);
        if (dOrigin < 19.0 && dOrigin > 0.1) {
          m.x = (m.x / dOrigin) * 19.2;
          m.z = (m.z / dOrigin) * 19.2;
        }
        return;
      }
    }

    if (m.telegraphTimer > 0) {
      m.telegraphTimer -= dt;
      m.vx *= 0.85;
      m.vz *= 0.85;
      if (m.telegraphTimer <= 0 && m.pendingStrike) {
        m.pendingStrike = false;
        m.attackTimer = 0.36;
        if (m.archetype === 'venom_crawler') {
          // Toxic Lunge Dash!
          m.vx = (dx / dist) * 14.5;
          m.vz = (dz / dist) * 14.5;
        }
        this.rings.push({
          x: m.x,
          y: m.y + 0.08,
          z: m.z,
          radius: 0.5,
          maxRadius: m.telegraphRadius,
          color: def.accentColor,
          alpha: 0.9,
          life: 0.35,
          maxLife: 0.35,
          growSpeed: m.telegraphRadius * 2.8,
        });
        this.spawnBurst(m.x, m.y + 0.8, m.z, def.accentColor, 12);
        if (Math.hypot(p1.x - m.x, p1.z - m.z) <= m.telegraphRadius + 0.45) {
          this.damageFighter(null, p1, def.damage, m.isBoss ? 9.5 : 6.5, m.isBoss);
        }
        // Void Colossus fires 3 dark void orbs after slam!
        if (m.archetype === 'void_colossus') {
          const baseAng = Math.atan2(dx, dz);
          [-0.35, 0, 0.35].forEach((off) => {
            const a = baseAng + off;
            this.projectiles.push({
              id: this.nextId('mp'),
              ownerId: m.id,
              team: 'enemy',
              x: m.x + Math.sin(a) * 1.1,
              y: m.y + 1.5,
              z: m.z + Math.cos(a) * 1.1,
              vx: Math.sin(a) * 12.5,
              vz: Math.cos(a) * 12.5,
              color: def.accentColor,
              coreColor: '#38BDF8',
              radius: 0.34,
              kind: 'orb',
              damage: Math.round(def.damage * 0.72),
              knockback: 5,
              life: 2.0,
              homing: false,
              critical: false,
            });
          });
        }
      }
    } else if (m.stunTimer <= 0) {
      m.yaw = Math.atan2(dx, dz);

      if (def.isRanged && dist < 4.2) {
        // Ranged monsters kite away smartly when player rushes them!
        const sp = def.speed * speedMult * 0.88;
        m.vx += (-(dx / dist) * sp - m.vx) * Math.min(1, dt * 6);
        m.vz += (-(dz / dist) * sp - m.vz) * Math.min(1, dt * 6);
        m.walkPhase += dt * (sp / 4.2);
      } else if (dist > def.attackRange) {
        // Smart Flanking Angle offset so monsters surround instead of stacking linearly!
        const flankAng = m.yaw + (m.flankSlot - 2) * (dist > 4.5 ? 0.42 : 0.12);
        const sp = def.speed * speedMult;
        m.vx += (Math.sin(flankAng) * sp - m.vx) * Math.min(1, dt * 6);
        m.vz += (Math.cos(flankAng) * sp - m.vz) * Math.min(1, dt * 6);
        m.walkPhase += dt * (sp / 4.2);
      } else {
        m.vx *= Math.pow(0.08, dt);
        m.vz *= Math.pow(0.08, dt);
        if (m.attackCooldown <= 0) {
          const cdMult = m.enraged ? 0.76 : 1.0;
          if (def.isRanged) {
            m.attackCooldown = 1.75 * cdMult;
            m.attackTimer = 0.25;
            this.projectiles.push({
              id: this.nextId('mp'),
              ownerId: m.id,
              team: 'enemy',
              x: m.x + (dx / dist) * 0.8,
              y: m.y + 1.2,
              z: m.z + (dz / dist) * 0.8,
              vx: (dx / dist) * 12.2,
              vz: (dz / dist) * 12.2,
              color: m.archetype === 'frost_specter' ? '#38BDF8' : '#F97316',
              coreColor: '#FEF08A',
              radius: 0.28,
              kind: 'fireball',
              damage: def.damage,
              knockback: 4,
              life: 1.85,
              homing: false,
              critical: false,
              chillEffect: m.archetype === 'frost_specter',
            });
          } else if (m.archetype === 'obsidian_golem' || m.archetype === 'venom_crawler' || m.isBoss) {
            m.telegraphTimer = m.archetype === 'venom_crawler' ? 0.45 : m.isBoss ? 0.7 : 0.78;
            m.pendingStrike = true;
            m.attackCooldown = (m.isBoss ? 2.0 : 2.4) * cdMult;
          } else {
            m.attackCooldown = 1.2 * cdMult;
            m.attackTimer = 0.28;
            if (dist <= def.attackRange + 0.75) {
              this.damageFighter(null, p1, def.damage, 4.2, false);
            }
          }
        }
      }
    }

    for (const other of this.monsters) {
      if (other.id === m.id) continue;
      const sx = m.x - other.x;
      const sz = m.z - other.z;
      const sd = Math.hypot(sx, sz);
      if (sd > 0.01 && sd < 1.48) {
        m.vx += (sx / sd) * 3.8 * dt;
        m.vz += (sz / sd) * 3.8 * dt;
      }
    }

    m.x += m.vx * dt;
    m.z += m.vz * dt;
    if (this.mode === 'world_explore') {
      const dCenter = Math.hypot(m.x, m.z);
      if (dCenter < 18.8 && dCenter > 0.1) {
        m.x = (m.x / dCenter) * 18.8;
        m.z = (m.z / dCenter) * 18.8;
      }
    }
    this.constrainToArena(m);
    const groundY = this.getTerrainHeight(m.x, m.z);
    m.y += (groundY - m.y) * Math.min(1, dt * 12);
  }

  private updateOverworldExplore(p1: SimFighter, _dt: number) {
    // Region discovery check (or biome chunk name fallback)
    const regions = this.arena.regions || [];
    const coord = { cx: Math.round(p1.x / CHUNK_SIZE), cz: Math.round(p1.z / CHUNK_SIZE) };
    const chunkBiome = classifyChunkBiome(coord.cx, coord.cz);
    let matchedRegionName = chunkBiome.name;
    for (const reg of regions) {
      if (Math.hypot(p1.x - reg.x, p1.z - reg.z) <= reg.radius) {
        matchedRegionName = reg.name;
        if (!this.discoveredRegions.has(reg.id)) {
          this.discoveredRegions.add(reg.id);
          this.bonusMissionGold += reg.rewardGold;
          this.opts.onDiscoverRegion?.(reg.id, reg.name, reg.rewardGold, reg.rewardXp);
          audioSynth.playReward();
          this.showBanner(`اكتشفت إقليماً جديداً: ${reg.name}! (+${reg.rewardGold} ذهب، +${reg.rewardXp} خبرة)`, 3.2);
          this.spawnFloatingText(p1.x, p1.y + 2.6, p1.z, `إقليم جديد: ${reg.name}`, '#38BDF8', 1.2);
        }
        break;
      }
    }
    this.currentRegionName = matchedRegionName;

    // Auto-discover Waystones when passing nearby
    for (const ws of this.arena.worldWaystones || []) {
      if (!this.discoveredWaystones.has(ws.id) && Math.hypot(p1.x - ws.x, p1.z - ws.z) <= 10.5) {
        this.discoveredWaystones.add(ws.id);
        audioSynth.playReward();
        this.showBanner(`تم تفعيل حجر انتقال: ${ws.name} (اضغط [M] للانتقال السريع)`, 3.0);
        this.spawnFloatingText(ws.x, 3.4, ws.z, `تم تفعيل ${ws.name}`, '#38BDF8', 1.2);
      }
    }

    // Proximity Interactable check using streamed chunks (Chest -> Gatherable Node -> Peaceful NPC -> Portal)
    let best: typeof this.nearbyInteractable = null;
    let bestDist = Infinity;

    for (const chest of this.streamedChests) {
      if (this.openedChests.has(chest.id)) continue;
      const d = Math.hypot(p1.x - chest.x, p1.z - chest.z);
      if (d <= 4.0 && d < bestDist) {
        bestDist = d;
        const chestLabel = chest.tier === 'mythic' ? 'الصندوق الأسطوري' : 'صندوق الكنز';
        best = {
          kind: 'chest',
          targetId: chest.id,
          label: `افتح ${chestLabel}`,
          sublabel: `+${chest.gold} ذهب و ${chest.gems} جواهر`,
        };
      }
    }

    for (const node of this.streamedNodes) {
      if ((this.nodeRespawns[node.id] || 0) > 0) continue;
      const d = Math.hypot(p1.x - node.x, p1.z - node.z);
      if (d <= 3.8 && d < bestDist) {
        bestDist = d;
        best = {
          kind: 'node',
          targetId: node.id,
          label: `اجمع ${node.label}`,
          sublabel: 'مورد لحقيبة النقابة والعقود',
        };
      }
    }

    for (const npc of this.arena.worldNpcs || []) {
      const d = Math.hypot(p1.x - npc.x, p1.z - npc.z);
      if (d <= 4.2 && d < bestDist) {
        bestDist = d;
        best = {
          kind: 'npc',
          targetId: npc.id,
          label: `تحدّث مع ${npc.name} (${npc.serviceLabel})`,
          sublabel: npc.title,
        };
      }
    }

    for (const portal of this.arena.worldPortals || []) {
      const d = Math.hypot(p1.x - portal.x, p1.z - portal.z);
      if (d <= 4.0 && d < bestDist) {
        bestDist = d;
        best = {
          kind: 'portal',
          targetId: portal.id,
          arenaId: portal.arenaId,
          label: `ادخل ${portal.label}`,
          sublabel: 'انتقال فوري إلى ساحة القتال',
        };
      }
    }

    for (const sb of SECRET_WORLD_BOSSES) {
      if (this.defeatedSecretBossIds.has(sb.id)) continue;
      if (this.monsters.some((m) => m.secretBossId === sb.id && m.hp > 0)) continue;
      const d = Math.hypot(p1.x - sb.x, p1.z - sb.z);
      if (d <= 5.5 && d < bestDist) {
        bestDist = d;
        best = {
          kind: 'secret_boss',
          targetId: sb.id,
          label: `استدعِ الزعيم السري: ${sb.name}`,
          sublabel: `${sb.title} · جائزة +${sb.rewardGold} ذهب ولقب حصري`,
        };
      }
    }

    for (const evt of WORLD_EVENT_ZONES) {
      if (this.completedWorldEventIds.has(evt.id) || this.activeEventZone) continue;
      const d = Math.hypot(p1.x - evt.x, p1.z - evt.z);
      if (d <= 6.5 && d < bestDist) {
        bestDist = d;
        best = {
          kind: 'event_zone',
          targetId: evt.id,
          label: `ابدأ الحدث الديناميكي: ${evt.name}`,
          sublabel: `${evt.waveCount} موجات · +${evt.rewardGold} ذهب و +${evt.rewardGems} جوهرة`,
        };
      }
    }

    // Track active dynamic event zone wave progression
    if (this.activeEventZone) {
      const evt = this.activeEventZone.def;
      const remaining = this.monsters.filter((m) => m.hp > 0 && m.eventZoneId === evt.id).length;
      if (remaining === 0) {
        if (this.activeEventZone.wave < this.activeEventZone.waveCount) {
          this.activeEventZone.wave += 1;
          this.spawnWorldEventWave(evt, this.activeEventZone.wave);
          audioSynth.playWorldEventHorn();
          this.showBanner(`${evt.name} — الموجة ${this.activeEventZone.wave} من ${this.activeEventZone.waveCount}!`, 3.0);
        } else {
          this.completedWorldEventIds.add(evt.id);
          this.worldEventsCompletedCount += 1;
          this.opts.onCompleteWorldEvent?.(evt);
          audioSynth.playAchievementUnlock();
          this.rings.push({
            x: evt.x,
            y: 0.14,
            z: evt.z,
            radius: 0.8,
            maxRadius: 9.5,
            color: evt.color,
            alpha: 0.98,
            life: 0.65,
            maxLife: 0.65,
            growSpeed: 15,
            isFusion: true,
            secondaryColor: '#FDE047',
          });
          this.spawnFloatingText(p1.x, p1.y + 2.7, p1.z, `اكتمل حدث: ${evt.name}!`, '#38BDF8', 1.3);
          this.showBanner(
            `انتصر الأثير! أكملت ${evt.name} (+${evt.rewardGold} ذهب، +${evt.rewardGems} جوهرة، +${evt.rewardMarks} شارة)`,
            4.0
          );
          this.activeEventZone = null;
        }
      }
    }

    this.nearbyInteractable = best;
  }

  private constrainToArena(ent: { x: number; z: number; vx?: number; vz?: number }) {
    const maxR = this.arena.radius - 0.85;
    const dist = Math.hypot(ent.x, ent.z);
    if (dist > maxR) {
      ent.x = (ent.x / dist) * maxR;
      ent.z = (ent.z / dist) * maxR;
    }

    for (const pillar of this.arena.pillars) {
      const dx = ent.x - pillar.x;
      const dz = ent.z - pillar.z;
      const d = Math.hypot(dx, dz);
      const minD = pillar.radius + 0.65;
      if (d > 0.001 && d < minD) {
        ent.x = pillar.x + (dx / d) * minD;
        ent.z = pillar.z + (dz / d) * minD;
      }
    }
  }

  private updateProjectiles(dt: number) {
    const alive: SimProjectile[] = [];
    for (const p of this.projectiles) {
      p.life -= dt;
      if (p.life <= 0) continue;

      if (p.homing && p.team === 'player1') {
        const target = this.findNearestHostile({ team: p.team, x: p.x, z: p.z });
        if (target && target.dist < 11) {
          const dx = target.x - p.x;
          const dz = target.z - p.z;
          const d = Math.hypot(dx, dz) || 1;
          const sp = Math.hypot(p.vx, p.vz);
          p.vx += ((dx / d) * sp - p.vx) * dt * 4.8;
          p.vz += ((dz / d) * sp - p.vz) * dt * 4.8;
        }
      }

      p.x += p.vx * dt;
      p.z += p.vz * dt;

      let hitSolid = false;
      for (const pillar of this.arena.pillars) {
        if (Math.hypot(p.x - pillar.x, p.z - pillar.z) < pillar.radius + p.radius) {
          hitSolid = true;
          this.spawnBurst(p.x, p.y, p.z, p.color, 5);
          break;
        }
      }
      if (hitSolid) continue;

      const ownerFighter = this.fighters.find((f) => f.id === p.ownerId) || null;
      if (p.team !== 'enemy') {
        for (const m of this.monsters) {
          if (m.hp <= 0) continue;
          if (Math.hypot(p.x - m.x, p.z - m.z) < (MONSTERS[m.archetype]?.scale || 1) * 0.8 + p.radius) {
            if (ownerFighter) this.damageMonster(ownerFighter, m, p.damage, p.knockback, p.critical);
            hitSolid = true;
            break;
          }
        }
      }
      if (hitSolid) continue;

      for (const f of this.fighters) {
        if (f.id === p.ownerId || f.team === p.team || f.hp <= 0) continue;
        if (Math.hypot(p.x - f.x, p.z - f.z) < 0.85 + p.radius) {
          if (p.chillEffect) f.frozenTimer = Math.max(f.frozenTimer, 1.3);
          this.damageFighter(ownerFighter, f, p.damage, p.knockback, p.critical);
          hitSolid = true;
          break;
        }
      }
      if (!hitSolid) alive.push(p);
    }
    this.projectiles = alive;
  }

  private updateVfx(dt: number) {
    this.slashes = this.slashes.filter((s) => {
      s.life -= dt;
      s.alpha = Math.max(0, (s.life / s.maxLife) * 0.88);
      return s.life > 0;
    });

    this.rings = this.rings.filter((r) => {
      r.life -= dt;
      r.radius = Math.min(r.maxRadius, r.radius + r.growSpeed * dt);
      r.alpha = Math.max(0, (r.life / r.maxLife) * 0.9);
      return r.life > 0;
    });

    this.lightnings = this.lightnings.filter((l) => {
      l.life -= dt;
      l.alpha = Math.max(0, l.life / l.maxLife);
      return l.life > 0;
    });

    this.dashTrails = this.dashTrails.filter((d) => {
      d.life -= dt;
      d.alpha = Math.max(0, (d.life / d.maxLife) * 0.82);
      return d.life > 0;
    });

    this.floatingTexts = this.floatingTexts.filter((ft) => {
      ft.life -= dt;
      ft.y += ft.vy * dt;
      ft.alpha = Math.max(0, ft.life / ft.maxLife);
      return ft.life > 0;
    });

    this.particles = this.particles.filter((pt) => {
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.z += pt.vz * dt;
      pt.alpha = Math.max(0, pt.life / pt.maxLife);
      return pt.life > 0;
    });

    const targetMotes = this.quality === 'eco' ? 5 : this.quality === 'balanced' ? 16 : 26;
    if (this.particles.length < targetMotes && Math.random() < 0.3) {
      this.spawnAmbientMote();
    }
  }

  private spawnAmbientMote() {
    const p1 = this.getPlayer1();
    const cx = this.mode === 'world_explore' && p1 ? p1.x : 0;
    const cz = this.mode === 'world_explore' && p1 ? p1.z : 0;
    const maxR = this.mode === 'world_explore' ? 52 : this.arena.radius;
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * maxR;
    const isSnow = this.arena.id === 'glacier_spire';
    this.particles.push({
      x: cx + Math.cos(a) * r,
      y: isSnow ? 5 + Math.random() * 4 : 0.4 + Math.random() * 2.5,
      z: cz + Math.sin(a) * r,
      vx: (Math.random() - 0.5) * 0.6,
      vy: isSnow ? -1.1 : 0.7 + Math.random() * 0.6,
      vz: (Math.random() - 0.5) * 0.6,
      size: isSnow ? 4 : 3.2,
      color: this.arena.ambientParticleColor,
      alpha: 0.55,
      life: 2.5 + Math.random() * 2,
      maxLife: 4.5,
    });
  }

  private spawnBurst(x: number, y: number, z: number, color: string, count: number) {
    const actual = this.quality === 'eco' ? Math.max(3, Math.floor(count * 0.45)) : count;
    for (let i = 0; i < actual; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1.8 + Math.random() * 4.5;
      this.particles.push({
        x,
        y,
        z,
        vx: Math.cos(a) * sp,
        vy: 1.5 + Math.random() * 3.8,
        vz: Math.sin(a) * sp,
        size: 3.5 + Math.random() * 3,
        color,
        alpha: 0.95,
        life: 0.35 + Math.random() * 0.3,
        maxLife: 0.65,
      });
    }
  }

  private spawnFloatingText(x: number, y: number, z: number, text: string, color: string, scale = 1.0) {
    this.floatingTexts.push({
      x: x + (Math.random() - 0.5) * 0.4,
      y,
      z,
      vy: 1.65,
      text,
      color,
      alpha: 1,
      scale,
      life: 0.95,
      maxLife: 0.95,
    });
  }

  private addCameraShake(duration: number, intensity: number) {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    this.shakeTimer = Math.max(this.shakeTimer, duration);
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  private updateCamera(dt: number) {
    const p1 = this.getPlayer1();
    if (!p1) return;

    let focusX = p1.x;
    let focusZ = p1.z;

    if (this.mode === 'pvp_local' || this.mode === 'pvp_ranked') {
      const opp = this.fighters.find((f) => f.team !== 'player1');
      if (opp) {
        focusX = (p1.x + opp.x) * 0.5;
        focusZ = (p1.z + opp.z) * 0.5;
      }
    }

    let baseDist = 11.8;
    let basePitch = 0.44;
    let targetY = 1.55 + p1.y * 0.42;
    let sideX = 0;
    let sideZ = 0;

    if (this.cameraView === 'third_person') {
      baseDist = 11.8;
      basePitch = 0.44;
      targetY = 1.6 + p1.y * 0.42;
      this.camera.fov = 50;
    } else if (this.cameraView === 'over_shoulder') {
      baseDist = 6.8;
      basePitch = 0.25;
      sideX = Math.cos(this.camYaw) * 1.15;
      sideZ = -Math.sin(this.camYaw) * 1.15;
      targetY = 1.65 + p1.y * 0.42;
      this.camera.fov = 54;
    } else if (this.cameraView === 'isometric_3d') {
      baseDist = 19.6;
      basePitch = 0.66;
      targetY = 1.0 + p1.y * 0.35;
      this.camera.fov = 44;
    } else if (this.cameraView === 'top_tactical') {
      baseDist = 23.8;
      basePitch = 1.04;
      targetY = 0.6 + p1.y * 0.3;
      this.camera.fov = 45;
    } else if (this.cameraView === 'cinematic_free') {
      baseDist = 9.4;
      basePitch = 0.22;
      targetY = 1.85 + p1.y * 0.42;
      this.camera.fov = 58;
    } else {
      // side_fighter
      baseDist = 13.4;
      basePitch = 0.26;
      targetY = 1.55 + p1.y * 0.42;
      this.camera.fov = 46;
    }

    const effPitch = Math.max(0.06, Math.min(1.32, basePitch + (this.camPitch - 0.42)));
    const dist = baseDist * this.camZoom;
    const horizDist = dist * Math.cos(effPitch);
    const vertOffset = dist * Math.sin(effPitch);

    const shoulderLookBias = this.cameraView === 'over_shoulder' ? 2.1 : 0;
    const desiredPos = {
      x: focusX + Math.sin(this.camYaw) * horizDist + sideX,
      y: Math.max(1.1, p1.y + 1.25 + vertOffset),
      z: focusZ + Math.cos(this.camYaw) * horizDist + sideZ,
    };
    const desiredTarget = {
      x: focusX - Math.sin(this.camYaw) * shoulderLookBias + sideX * 0.38,
      y: targetY,
      z: focusZ - Math.cos(this.camYaw) * shoulderLookBias + sideZ * 0.38,
    };

    const lerp = 1 - Math.exp(-9.5 * dt);
    this.camera.pos.x += (desiredPos.x - this.camera.pos.x) * lerp;
    this.camera.pos.y += (desiredPos.y - this.camera.pos.y) * lerp;
    this.camera.pos.z += (desiredPos.z - this.camera.pos.z) * lerp;

    this.camera.target.x += (desiredTarget.x - this.camera.target.x) * lerp;
    this.camera.target.y += (desiredTarget.y - this.camera.target.y) * lerp;
    this.camera.target.z += (desiredTarget.z - this.camera.target.z) * lerp;

    if (this.shakeTimer > 0) {
      const mag = this.shakeIntensity * (this.shakeTimer / 0.25);
      this.camera.pos.x += (Math.random() - 0.5) * mag;
      this.camera.pos.y += (Math.random() - 0.5) * mag;
    }
  }

  public getRenderPayload(): RenderScenePayload {
    const gatheredNodeIds = Object.entries(this.nodeRespawns)
      .filter(([, rem]) => rem > 0)
      .map(([id]) => id);
    const activeArena =
      this.mode === 'world_explore'
        ? {
            ...this.arena,
            sceneryProps: this.streamedProps,
            worldNodes: this.streamedNodes,
            worldChests: this.streamedChests,
            worldWaystones: this.streamedWaystones,
          }
        : this.arena;

    return {
      arena: activeArena,
      time: this.time,
      quality: this.quality,
      fighters: this.fighters,
      monsters: this.monsters,
      projectiles: this.projectiles,
      rings: this.rings,
      slashes: this.slashes,
      lightnings: this.lightnings,
      dashTrails: this.dashTrails,
      pickups: this.pickups,
      particles: this.particles,
      floatingTexts: this.floatingTexts,
      shrineCooldowns: { ...this.shrineCooldowns },
      showFloorLabels: true,
      showFloatingDamage: this.showFloatingDamage,
      openedChests: Array.from(this.openedChests),
      gatheredNodeIds,
      discoveredWaystoneIds: Array.from(this.discoveredWaystones),
      nearbyInteractable: this.nearbyInteractable
        ? { label: this.nearbyInteractable.label, kind: this.nearbyInteractable.kind }
        : null,
      isOverworld: this.mode === 'world_explore',
      biomeSkyTint: this.mode === 'world_explore' ? this.currentBiomeSkyTint : undefined,
      secretBossShrines: this.mode === 'world_explore' ? SECRET_WORLD_BOSSES : undefined,
      defeatedSecretBossIds: Array.from(this.defeatedSecretBossIds),
      worldEventZones: this.mode === 'world_explore' ? WORLD_EVENT_ZONES : undefined,
      completedWorldEventIds: Array.from(this.completedWorldEventIds),
      activeEventZoneId: this.activeEventZone?.def.id,
    };
  }

  public getHudSnapshot(): HudSnapshot {
    const p1 = this.getPlayer1();
    const opp = this.fighters.find((f) => f.team !== 'player1' && f.hp > 0);
    const boss = this.monsters.find((m) => m.isBoss && m.hp > 0);
    const cdr = p1 ? p1.statsDerived.cooldownReduction : 0;
    const netBonus = computeSkillNetworkBonuses(this.unlockedNetworkNodes);
    const slots = p1?.avatar.powerSlots || [
      p1?.avatar.powerId || 'inferno_nova',
      p1?.avatar.secondaryPowerId || 'holy_sanctuary',
      'thunder_strike',
      'shadow_blink',
    ];
    const calcSlotMax = (sIdx: 0 | 1 | 2 | 3) => {
      const pId = slots[sIdx];
      const lv = this.powerLevels[pId] || 1;
      const factor = Math.max(0.35, 1 - cdr - netBonus.cdrMult - (lv - 1) * 0.06);
      return Number(((POWERS[pId]?.cooldown || 6) * factor).toFixed(1));
    };
    const slotMaxCooldowns: [number, number, number, number] = [
      calcSlotMax(0),
      calcSlotMax(1),
      calcSlotMax(2),
      calcSlotMax(3),
    ];
    const slotCooldowns: [number, number, number, number] = p1
      ? [
          Number(p1.slotCooldowns[0].toFixed(1)),
          Number(p1.slotCooldowns[1].toFixed(1)),
          Number(p1.slotCooldowns[2].toFixed(1)),
          Number(p1.slotCooldowns[3].toFixed(1)),
        ]
      : [0, 0, 0, 0];

    const radarPoints: RadarPoint[] = [];
    if (p1) {
      radarPoints.push({ x: p1.x, z: p1.z, kind: 'player' });
    }
    for (const s of this.arena.shrines) {
      const cd = this.shrineCooldowns[s.id] || 0;
      radarPoints.push({
        x: s.x,
        z: s.z,
        kind:
          cd > 0
            ? 'shrine_cd'
            : s.kind === 'heal'
              ? 'shrine_heal'
              : s.kind === 'energy'
                ? 'shrine_energy'
                : 'shrine_fury',
      });
    }
    if (this.mode === 'world_explore') {
      for (const c of this.streamedChests) {
        if (!this.openedChests.has(c.id)) radarPoints.push({ x: c.x, z: c.z, kind: 'chest' });
      }
      for (const nNode of this.streamedNodes) {
        if ((this.nodeRespawns[nNode.id] || 0) <= 0) {
          radarPoints.push({ x: nNode.x, z: nNode.z, kind: 'node' });
        }
      }
      for (const ws of this.arena.worldWaystones || []) {
        radarPoints.push({ x: ws.x, z: ws.z, kind: 'waystone' });
      }
      for (const pr of this.arena.worldPortals || []) {
        radarPoints.push({ x: pr.x, z: pr.z, kind: 'portal' });
      }
      for (const n of this.arena.worldNpcs || []) {
        radarPoints.push({ x: n.x, z: n.z, kind: 'npc' });
      }
      for (const sb of SECRET_WORLD_BOSSES) {
        if (!this.defeatedSecretBossIds.has(sb.id)) {
          radarPoints.push({ x: sb.x, z: sb.z, kind: 'secret_boss' });
        }
      }
      for (const evt of WORLD_EVENT_ZONES) {
        if (!this.completedWorldEventIds.has(evt.id)) {
          radarPoints.push({ x: evt.x, z: evt.z, kind: 'event_zone' });
        }
      }
    }
    for (const m of this.monsters) {
      if (m.hp <= 0) continue;
      if (this.mode === 'world_explore' && p1 && Math.hypot(m.x - p1.x, m.z - p1.z) > 180) continue;
      radarPoints.push({ x: m.x, z: m.z, kind: m.isBoss ? 'boss' : 'monster' });
    }
    for (const f of this.fighters) {
      if (f.team === 'player1' || f.hp <= 0) continue;
      radarPoints.push({ x: f.x, z: f.z, kind: 'rival' });
    }

    const missionDef = this.getActiveMissionDef();
    const activeSecretBoss = this.monsters.find((m) => Boolean(m.secretBossId) && m.hp > 0);
    const activeEventRem = this.activeEventZone
      ? this.monsters.filter((m) => m.hp > 0 && m.eventZoneId === this.activeEventZone!.def.id).length
      : 0;

    return {
      hp: p1 ? Math.round(p1.hp) : 0,
      maxHp: p1 ? p1.maxHp : 100,
      energy: p1 ? Math.round(p1.energy) : 0,
      maxEnergy: p1 ? p1.maxEnergy : 100,
      wave: this.wave,
      kills: this.kills,
      combo: this.combo,
      comboTimer: this.comboTimer,
      heavyCd: p1 ? Number(p1.heavyCooldown.toFixed(1)) : 0,
      heavyMaxCd: Number((4.2 * (1 - cdr)).toFixed(1)),
      powerCd: slotCooldowns[0],
      powerMaxCd: slotMaxCooldowns[0],
      secondaryCd: slotCooldowns[1],
      secondaryMaxCd: slotMaxCooldowns[1],
      slotCooldowns,
      slotMaxCooldowns,
      dodgeCd: p1 ? Number(p1.dodgeCooldown.toFixed(1)) : 0,
      sprintActive: this.sprintActive,
      playerX: p1 ? Math.round(p1.x) : 0,
      playerZ: p1 ? Math.round(p1.z) : 0,
      scoreP1: this.scoreP1,
      scoreP2: this.scoreP2,
      opponentName: opp?.name,
      opponentHp: opp ? Math.round(opp.hp) : undefined,
      opponentMaxHp: opp?.maxHp,
      bossName: boss?.name,
      bossHp: boss ? Math.round(boss.hp) : undefined,
      bossMaxHp: boss?.maxHp,
      elapsedSec: Math.floor(this.time),
      bannerText: this.bannerTimer > 0 ? this.bannerText : '',
      fps: Math.round(this.fpsSamples),
      onlineCount: this.fighters.length,
      arenaRadius: this.arena.radius,
      playerYaw: p1 ? p1.yaw : 0,
      radarPoints,
      onHighGround: p1 ? p1.onHighGround : false,
      terrainNote: p1 ? p1.terrainNote : '',
      activeMission: missionDef
        ? {
            title: missionDef.title,
            progress: Math.min(missionDef.target, Math.floor(this.missionProgress)),
            target: missionDef.target,
            rewardText: missionDef.rewardText,
          }
        : null,
      missionsDone: this.missionsDone,
      consumables: { ...this.localConsumables },
      isOverworld: this.mode === 'world_explore',
      currentRegionName: this.mode === 'world_explore' ? this.currentRegionName : undefined,
      nearbyInteractable: this.nearbyInteractable
        ? {
            label: this.nearbyInteractable.label,
            kind: this.nearbyInteractable.kind,
            sublabel: this.nearbyInteractable.sublabel,
          }
        : null,
      npcDialogue: this.npcDialogue,
      discoveredRegionsCount: this.discoveredRegions.size,
      totalRegionsCount: this.arena.regions?.length || 0,
      openedChestsCount: this.openedChests.size,
      totalChestsCount: Math.max(this.arena.worldChests?.length || 0, this.streamedChests.length),
      discoveredWaystonesCount: this.discoveredWaystones.size,
      totalWaystonesCount: this.arena.worldWaystones?.length || 0,
      unlockedSkillSlots: this.unlockedSkillSlots,
      currentChunkKey: this.mode === 'world_explore' ? this.currentChunkKey : undefined,
      activeChunksCount: this.mode === 'world_explore' ? this.activeChunksCount : undefined,
      discoveredChunksCount: this.chunkStreamer ? this.chunkStreamer.getExploredCount() : undefined,
      currentBiomeColor: this.mode === 'world_explore' ? this.currentBiomeColor : undefined,
      activeSecretBossName: activeSecretBoss?.name,
      activeEventZoneName: this.activeEventZone?.def.name,
      activeEventProgress: this.activeEventZone
        ? `موجة ${this.activeEventZone.wave}/${this.activeEventZone.waveCount} · متبقي ${activeEventRem}`
        : undefined,
    };
  }
}
