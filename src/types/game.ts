export type AppDestination = 'hub' | 'forge' | 'armory' | 'rewards' | 'pvp' | 'combat';

export type ArenaId =
  | 'obsidian_citadel'
  | 'magma_caldera'
  | 'glacier_spire'
  | 'sunstone_dunes'
  | 'celestial_sanctuary'
  | 'abyssal_colosseum';

export type GameMode =
  | 'unified_clash'
  | 'free_combat'
  | 'monster_raid'
  | 'world_explore'
  | 'pvp_ranked'
  | 'pvp_local'
  | 'pvp_online';

export type GraphicsQuality = 'eco' | 'balanced' | 'high' | 'ultra' | 'mythic' | 'impossible';

export type RenderEngineMode = 'auto' | 'canvas2d' | 'webgl';
export type ResolvedRenderEngine = 'canvas2d' | 'webgl';

export type KeyActionId =
  | 'moveForward'
  | 'moveBackward'
  | 'moveLeft'
  | 'moveRight'
  | 'attack'
  | 'heavy'
  | 'jump'
  | 'dodge'
  | 'block'
  | 'skill0'
  | 'skill1'
  | 'skill2'
  | 'skill3'
  | 'sprint'
  | 'interact'
  | 'map'
  | 'camera'
  | 'toggleHud'
  | 'potion1'
  | 'potion2'
  | 'potion3';

export type KeyBindingsConfig = Record<KeyActionId, string>;

export type MobileLayoutPreset = 'standard' | 'compact' | 'spread';

export interface HudWidgetVisibility {
  radar: boolean;
  mission: boolean;
  biomeStrip: boolean;
  fps: boolean;
  controlsHint: boolean;
  floatingDamage: boolean;
  bossBar: boolean;
}

export interface HudCustomizationConfig {
  zenMode: boolean;
  hudScale: number;
  hudOpacity: number;
  cameraSensitivity?: number;
  mobilePreset: MobileLayoutPreset;
  mobileButtonsScale: number;
  joystickOffset: { x: number; y: number };
  actionsOffset: { x: number; y: number };
  widgets: HudWidgetVisibility;
}

export type CameraViewMode =
  | 'third_person'
  | 'over_shoulder'
  | 'isometric_3d'
  | 'side_fighter'
  | 'top_tactical'
  | 'cinematic_free';

export type DeviceMode = 'desktop' | 'mobile';

export type BodyBuild = 'agile' | 'balanced' | 'heavy';

export type HeadStyle =
  | 'spiky_hair'
  | 'knight_helm'
  | 'shadow_hood'
  | 'war_crown'
  | 'tech_visor'
  | 'horned_helm'
  | 'phoenix_crest'
  | 'void_mask'
  | 'royal_crown_helm';

export type ArmorStyle =
  | 'tunic'
  | 'plate'
  | 'mystic'
  | 'titan_mail'
  | 'nomad_cloak'
  | 'dragon_scale'
  | 'arcane_robe'
  | 'paladin_aegis';

export type BackGearStyle =
  | 'none'
  | 'battle_cape'
  | 'energy_wings'
  | 'back_scabbard'
  | 'flame_halo'
  | 'frost_wings'
  | 'war_banner'
  | 'arcane_orbit';

export type AuraStyle = 'none' | 'ember_sparks' | 'frost_mist' | 'royal_gold' | 'void_pulse';

export type WeaponRole = 'melee' | 'magic' | 'support' | 'defense';

export type WeaponId =
  | 'vanguard_sword'
  | 'shadow_daggers'
  | 'storm_hammer'
  | 'dragon_spear'
  | 'solar_bow'
  | 'void_staff'
  | 'arcane_tome'
  | 'crimson_wand'
  | 'radiant_scepter'
  | 'astral_censer'
  | 'bastion_mace'
  | 'aegis_greatshield';

export type SystemTheme = 'royal_cyan' | 'crimson_abyss';

export type PowerId =
  | 'inferno_nova'
  | 'thunder_strike'
  | 'crystal_aegis'
  | 'shadow_blink'
  | 'frost_vortex'
  | 'titan_overdrive'
  | 'meteor_rain'
  | 'holy_sanctuary'
  | 'iron_fortress'
  | 'arcane_beam'
  | 'fusion_plasma_tempest'
  | 'fusion_eternal_glacier'
  | 'fusion_void_eclipse'
  | 'fusion_dragon_bastion';

export type GearSlot = 'relic' | 'armor_core' | 'boots';

export type GearId =
  | 'ring_vitality'
  | 'amulet_arcane'
  | 'ring_crit'
  | 'core_bastion'
  | 'core_dragon'
  | 'core_radiant'
  | 'boots_wind'
  | 'gauntlet_fury'
  | 'greaves_titan';

export type ConsumableId = 'elixir_heal' | 'scroll_energy' | 'tonic_fury';

export type MonsterArchetype =
  | 'ash_stalker'
  | 'ember_imp'
  | 'venom_crawler'
  | 'frost_specter'
  | 'obsidian_golem'
  | 'wraith_knight'
  | 'shadow_reaper'
  | 'magma_boss'
  | 'void_colossus';

export type StatKey = 'str' | 'agi' | 'vit' | 'int' | 'def' | 'dex' | 'spr' | 'lck';

export type AvatarStats = Record<StatKey, number>;

export type PowerSlots = [PowerId, PowerId, PowerId, PowerId];

export interface AvatarConfig {
  name: string;
  title: string;
  build: BodyBuild;
  heightScale: number;
  shoulderScale: number;
  skinTone: string;
  headStyle: HeadStyle;
  helmetColor: string;
  eyeGlow: string;
  armorStyle: ArmorStyle;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backGear: BackGearStyle;
  auraStyle: AuraStyle;
  weaponId: WeaponId;
  powerId: PowerId;
  secondaryPowerId: PowerId;
  powerSlots: PowerSlots;
  stats: AvatarStats;
}

export interface WeaponDef {
  id: WeaponId;
  name: string;
  role: WeaponRole;
  category: string;
  description: string;
  damage: number;
  heavyDamage: number;
  range: number;
  attackSpeed: number;
  critBonus: number;
  knockback: number;
  isRanged: boolean;
  armorBonus?: number;
  healOnHitPct?: number;
  bladeColor: string;
  hiltColor: string;
  energyColor: string;
  costGold: number;
  costGems: number;
  heavySkillName: string;
}

export interface PowerDef {
  id: PowerId;
  name: string;
  role: WeaponRole;
  tagline: string;
  description: string;
  cooldown: number;
  energyCost: number;
  damage: number;
  radius: number;
  color: string;
  costGold: number;
  costGems: number;
  isFusion?: boolean;
  fusionPair?: [PowerId, PowerId];
  fusionCostGold?: number;
  fusionCostMarks?: number;
}

export interface SkillNetworkNodeDef {
  id: string;
  title: string;
  description: string;
  branch: 'core' | 'fury' | 'haste' | 'ether' | 'fusion';
  x: number;
  y: number;
  requires?: string;
  costGold: number;
  costMarks: number;
  bonusLabel: string;
  effects: {
    dmgMult?: number;
    cdrMult?: number;
    radiusMult?: number;
    energyCostMult?: number;
    bonusEnergy?: number;
    fusionMult?: number;
  };
}

export interface ChatMessage {
  id: string;
  channel: 'world' | 'room';
  roomCode?: string;
  senderId: string;
  senderName: string;
  senderRank: string;
  text: string;
  isQuick?: boolean;
  isSystem?: boolean;
  timestamp: number;
}

export interface GearDef {
  id: GearId;
  name: string;
  slot: GearSlot;
  slotLabel: string;
  description: string;
  hpBonus: number;
  dmgBonus: number;
  speedBonus: number;
  armorBonus: number;
  critBonus: number;
  pwrScaleBonus: number;
  costGold: number;
  costGems: number;
  accentColor: string;
}

export interface ConsumableDef {
  id: ConsumableId;
  name: string;
  description: string;
  costGold: number;
  color: string;
}

export interface MonsterDef {
  id: MonsterArchetype;
  name: string;
  tier: number;
  roleLabel: string;
  description: string;
  maxHp: number;
  damage: number;
  speed: number;
  attackRange: number;
  scale: number;
  bodyColor: string;
  accentColor: string;
  eyeColor: string;
  isRanged: boolean;
  isBoss: boolean;
  goldReward: number;
  xpReward: number;
}

export interface PillarDef {
  x: number;
  z: number;
  radius: number;
  height: number;
  style: 'column' | 'obsidian' | 'ice' | 'obelisk';
}

export interface PlatformDef {
  id: string;
  x: number;
  z: number;
  radius: number;
  height: number;
  color: string;
  trimColor: string;
  label?: string;
}

export interface TerrainZoneDef {
  id: string;
  x: number;
  z: number;
  radius: number;
  kind: 'magma_pool' | 'ice_patch' | 'healing_spring' | 'rune_pad' | 'meadow' | 'water_lake' | 'ash_land';
  label: string;
  color: string;
}

export interface ShrineDef {
  id: string;
  x: number;
  z: number;
  kind: 'heal' | 'energy' | 'fury';
  label: string;
  color: string;
}

export interface SceneryPropDef {
  id: string;
  kind: 'pine_tree' | 'cottage' | 'fountain' | 'crystal_cluster' | 'boulder' | 'ruin_pillar' | 'campfire';
  x: number;
  z: number;
  scale?: number;
  rotY?: number;
  color?: string;
  accentColor?: string;
}

export type NpcRole = 'guide' | 'guild_master' | 'blacksmith' | 'alchemist' | 'merchant';

export interface WorldNpcDef {
  id: string;
  name: string;
  title: string;
  role: NpcRole;
  serviceLabel: string;
  x: number;
  z: number;
  yaw: number;
  robeColor: string;
  accentColor: string;
  jobIds: string[];
  lines: string[];
}

export type OverworldNodeKind = 'herb' | 'ore' | 'crystal';

export interface OverworldNodeDef {
  id: string;
  kind: OverworldNodeKind;
  label: string;
  x: number;
  z: number;
  regionId: string;
  color: string;
}

export interface WorldFastTravelDef {
  id: string;
  name: string;
  regionId: string;
  x: number;
  z: number;
  color: string;
}

export interface NpcJobDef {
  id: string;
  npcId: string;
  title: string;
  description: string;
  kind: 'gather_herb' | 'gather_ore' | 'gather_crystal' | 'hunt_monsters' | 'explore_regions';
  target: number;
  rewardGold: number;
  rewardGuildMarks: number;
  rewardGems: number;
  rewardXp: number;
}

export interface WorldChestDef {
  id: string;
  x: number;
  z: number;
  tier: 'standard' | 'mythic';
  regionId: string;
  gold: number;
  gems: number;
  xp: number;
}

export interface WorldPortalDef {
  id: string;
  arenaId: ArenaId;
  label: string;
  x: number;
  z: number;
  color: string;
}

export interface WorldRegionDef {
  id: string;
  name: string;
  subtitle: string;
  x: number;
  z: number;
  radius: number;
  color: string;
  safeZone?: boolean;
  monsterPool?: MonsterArchetype[];
  rewardGold: number;
  rewardXp: number;
}

export interface ArenaDef {
  id: ArenaId | 'etheria_overworld';
  name: string;
  subtitle: string;
  description: string;
  imagePath: string;
  radius: number;
  isOverworld?: boolean;
  skyTop: string;
  skyMid: string;
  skyHorizon: string;
  fogColor: string;
  floorMain: string;
  floorAlt: string;
  floorTrim: string;
  platformWall: string;
  pillarColor: string;
  pillarAccent: string;
  ambientParticleColor: string;
  hazardType: 'none' | 'lava_vents' | 'frost_pulse' | 'sand_gust';
  rewardMultiplier: number;
  pillars: PillarDef[];
  platforms: PlatformDef[];
  terrainZones: TerrainZoneDef[];
  shrines: ShrineDef[];
  arches: { x: number; z: number; rotY: number; width: number; height: number }[];
  sceneryProps?: SceneryPropDef[];
  worldNpcs?: WorldNpcDef[];
  worldChests?: WorldChestDef[];
  worldPortals?: WorldPortalDef[];
  worldNodes?: OverworldNodeDef[];
  worldWaystones?: WorldFastTravelDef[];
  regions?: WorldRegionDef[];
  componentsSummary: { title: string; detail: string }[];
}

export interface QuestProgress {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  rewardGold: number;
  rewardGems: number;
  rewardXp: number;
  claimed: boolean;
  category: 'combat' | 'pvp' | 'forge';
}

export interface MapChallengeDef {
  id: string;
  title: string;
  arenaId: ArenaId | 'etheria_overworld';
  description: string;
  metric: 'kills' | 'bossKills' | 'missions' | 'rating' | 'regions';
  target: number;
  rewardGold: number;
  rewardGems: number;
  rewardXp: number;
}

export interface RivalChampion {
  id: string;
  name: string;
  rankTitle: string;
  rating: number;
  wins: number;
  arenaFavorite: ArenaId;
  avatar: AvatarConfig;
  aiDifficulty: number;
}

export type StarterBlessing = 'vanguard' | 'arcane' | 'fortune';

export type ConnectionMode = 'live_server' | 'static_local' | 'connecting';

export interface SecretBossDef {
  id: string;
  name: string;
  title: string;
  archetype: MonsterArchetype;
  hpMult: number;
  dmgMult: number;
  scaleMult: number;
  chunkX: number;
  chunkZ: number;
  x: number;
  z: number;
  accentColor: string;
  auraColor: string;
  rewardGold: number;
  rewardGems: number;
  rewardMarks: number;
  rewardXp: number;
  unlockTitle?: string;
}

export interface WorldEventZoneDef {
  id: string;
  name: string;
  kind: 'ether_storm' | 'meteor_rift' | 'blood_altar';
  description: string;
  chunkX: number;
  chunkZ: number;
  x: number;
  z: number;
  radius: number;
  color: string;
  waveCount: number;
  rewardGold: number;
  rewardGems: number;
  rewardMarks: number;
  rewardXp: number;
}

export type DailyMetric = 'kills' | 'crits' | 'fusions' | 'bossKills' | 'chunks' | 'gather' | 'pvpWins';

export interface DailyChallengeDef {
  id: string;
  title: string;
  description: string;
  metric: DailyMetric;
  target: number;
  rewardGold: number;
  rewardGems: number;
  rewardMarks: number;
  rewardXp: number;
}

export interface DailyChallengeProgress extends DailyChallengeDef {
  current: number;
  claimed: boolean;
}

export type AchievementMetric =
  | 'kills'
  | 'bossKills'
  | 'secretBosses'
  | 'worldEvents'
  | 'crits'
  | 'fusions'
  | 'chunks'
  | 'regions'
  | 'rating'
  | 'level';

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  metric: AchievementMetric;
  target: number;
  rewardTitle: string;
  rewardGold: number;
  rewardGems: number;
  rewardMarks: number;
}

export interface TitleDef {
  id: string;
  label: string;
  source: string;
  accentColor: string;
}

export interface PlayerProfile {
  avatar: AvatarConfig;
  gold: number;
  gems: number;
  guildMarks: number;
  xp: number;
  level: number;
  rating: number;
  wins: number;
  losses: number;
  totalKills: number;
  bossKills: number;
  critsLanded: number;
  fusionCasts: number;
  bestCombo: number;
  missionsCompleted: number;
  unspentStatPoints: number;
  warriorChests: number;
  mythicChests: number;
  unlockedWeapons: WeaponId[];
  weaponLevels: Partial<Record<WeaponId, number>>;
  unlockedPowers: PowerId[];
  powerLevels: Partial<Record<PowerId, number>>;
  unlockedSkillSlots: 1 | 2 | 3 | 4;
  unlockedNetworkNodes: string[];
  unlockedGear: GearId[];
  equippedGear: Record<GearSlot, GearId | null>;
  consumables: Record<ConsumableId, number>;
  monsterKillsByType: Partial<Record<MonsterArchetype, number>>;
  claimedChallenges: string[];
  discoveredRegions: string[];
  exploredChunks: string[];
  openedWorldChests: string[];
  defeatedSecretBossIds: string[];
  completedWorldEventIds: string[];
  dailyChallengesDate: string;
  dailyChallenges: DailyChallengeProgress[];
  claimedAchievements: string[];
  unlockedTitles: string[];
  activeNpcJobs: Record<string, { progress: number; completed: boolean }>;
  completedNpcJobsCount: number;
  gatheredResources: Record<OverworldNodeKind, number>;
  hasSeenIntro: boolean;
  starterBlessing?: StarterBlessing;
  quests: QuestProgress[];
  systemTheme: SystemTheme;
  quality: GraphicsQuality;
  renderEngine: RenderEngineMode;
  cameraView: CameraViewMode;
  deviceMode: DeviceMode;
  landscapeLocked: boolean;
  soundEnabled: boolean;
  favoriteArena: ArenaId;
  keyBindings: KeyBindingsConfig;
  hudConfig: HudCustomizationConfig;
}

export interface MatchResult {
  mode: GameMode;
  arenaId: ArenaId;
  victory: boolean;
  kills: number;
  bossKills: number;
  critsLanded?: number;
  fusionCasts?: number;
  secretBossesDefeated?: number;
  worldEventsCompleted?: number;
  waveReached: number;
  maxCombo: number;
  damageDealt: number;
  durationSec: number;
  goldEarned: number;
  gemsEarned: number;
  xpEarned: number;
  ratingDelta: number;
  missionsDone: number;
  monsterKillsByType?: Partial<Record<MonsterArchetype, number>>;
  opponentName?: string;
  p1Score?: number;
  p2Score?: number;
}

export interface OnlineRoomSummary {
  id: string;
  code: string;
  name: string;
  arenaId: ArenaId;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  status: 'open' | 'fighting';
}

export interface OnlineFighterSnapshot {
  id: string;
  name: string;
  avatar: AvatarConfig;
  x: number;
  y: number;
  z: number;
  yaw: number;
  hp: number;
  maxHp: number;
  energy: number;
  animState: 'idle' | 'run' | 'attack' | 'heavy' | 'power' | 'dodge' | 'block' | 'hurt' | 'dead';
  animTimer: number;
  comboStep: number;
  shieldActive: boolean;
  overdriveActive: boolean;
  kills: number;
  weaponLevel: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  rating: number;
  wins: number;
  weaponId: WeaponId;
  rankTitle?: string;
  championId?: string;
  isLiveUser?: boolean;
}
