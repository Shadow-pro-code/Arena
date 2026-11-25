import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AchievementMetric,
  ArenaId,
  AvatarConfig,
  CameraViewMode,
  ConsumableId,
  DailyChallengeProgress,
  DailyMetric,
  DeviceMode,
  GearId,
  GearSlot,
  GraphicsQuality,
  HudCustomizationConfig,
  KeyBindingsConfig,
  MatchResult,
  OverworldNodeKind,
  PlayerProfile,
  PowerId,
  PowerSlots,
  RenderEngineMode,
  SecretBossDef,
  StarterBlessing,
  StatKey,
  SystemTheme,
  WeaponId,
  WorldEventZoneDef,
} from '../types/game';
import { DEFAULT_HUD_CONFIG, DEFAULT_KEY_BINDINGS } from '../data/controlDefaults';
import {
  ACHIEVEMENT_DEFS,
  CONSUMABLES,
  DEFAULT_AVATAR,
  DEFAULT_TITLES,
  GEAR_ITEMS,
  INITIAL_QUESTS,
  MAP_CHALLENGES,
  NPC_JOBS,
  POWERS,
  SKILL_NETWORK_NODES,
  SKILL_SLOT_UNLOCK_COSTS,
  STAT_DEFINITIONS,
  WEAPONS,
  getTodayDateKey,
  pickDailyChallengesForDate,
  xpForNextLevel,
} from '../data/gameCatalog';
import { audioSynth } from '../engine/audioSynth';

const STORAGE_KEY = 'maydan_al_abtal_profile_v1';

const RESOURCE_MARK_VALUES: Record<OverworldNodeKind, number> = {
  herb: 8,
  ore: 12,
  crystal: 18,
};

function detectInitialDeviceMode(): DeviceMode {
  if (typeof window === 'undefined') return 'desktop';
  const narrow = window.innerWidth < 820;
  const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  return narrow || coarse ? 'mobile' : 'desktop';
}

function syncDailyChallenges(
  date: string | undefined,
  existing: DailyChallengeProgress[] | undefined
): { dailyChallengesDate: string; dailyChallenges: DailyChallengeProgress[] } {
  const today = getTodayDateKey();
  if (date === today && Array.isArray(existing) && existing.length > 0) {
    return { dailyChallengesDate: today, dailyChallenges: existing };
  }
  return {
    dailyChallengesDate: today,
    dailyChallenges: pickDailyChallengesForDate(today),
  };
}

function advanceDailyList(
  challenges: DailyChallengeProgress[],
  date: string,
  metric: DailyMetric,
  delta: number
): { dailyChallengesDate: string; dailyChallenges: DailyChallengeProgress[] } {
  const synced = syncDailyChallenges(date, challenges);
  if (delta <= 0) return synced;
  return {
    dailyChallengesDate: synced.dailyChallengesDate,
    dailyChallenges: synced.dailyChallenges.map((d) =>
      d.metric === metric ? { ...d, current: Math.min(d.target, d.current + delta) } : d
    ),
  };
}

export function getAchievementCurrentValue(profile: PlayerProfile, metric: AchievementMetric): number {
  switch (metric) {
    case 'kills':
      return profile.totalKills;
    case 'bossKills':
      return profile.bossKills;
    case 'secretBosses':
      return profile.defeatedSecretBossIds.length;
    case 'worldEvents':
      return profile.completedWorldEventIds.length;
    case 'crits':
      return profile.critsLanded;
    case 'fusions':
      return profile.fusionCasts;
    case 'chunks':
      return profile.exploredChunks.length;
    case 'regions':
      return profile.discoveredRegions.length;
    case 'rating':
      return profile.rating;
    case 'level':
      return profile.level;
    default:
      return 0;
  }
}

function createInitialProfile(): PlayerProfile {
  const today = getTodayDateKey();
  return {
    avatar: {
      ...DEFAULT_AVATAR,
      powerSlots: [...DEFAULT_AVATAR.powerSlots] as PowerSlots,
      stats: { ...DEFAULT_AVATAR.stats },
    },
    gold: 540,
    gems: 26,
    guildMarks: 15,
    xp: 0,
    level: 1,
    unspentStatPoints: 6,
    rating: 1000,
    wins: 0,
    losses: 0,
    totalKills: 0,
    bossKills: 0,
    critsLanded: 0,
    fusionCasts: 0,
    bestCombo: 0,
    missionsCompleted: 0,
    discoveredRegions: ['haven_village'],
    openedWorldChests: [],
    defeatedSecretBossIds: [],
    completedWorldEventIds: [],
    dailyChallengesDate: today,
    dailyChallenges: pickDailyChallengesForDate(today),
    claimedAchievements: [],
    unlockedTitles: DEFAULT_TITLES.map((t) => t.label),
    activeNpcJobs: {},
    completedNpcJobsCount: 0,
    gatheredResources: {
      herb: 0,
      ore: 0,
      crystal: 0,
    },
    hasSeenIntro: false,
    unlockedWeapons: ['vanguard_sword'],
    weaponLevels: {
      vanguard_sword: 1,
      shadow_daggers: 1,
      storm_hammer: 1,
      dragon_spear: 1,
      solar_bow: 1,
      void_staff: 1,
      arcane_tome: 1,
      crimson_wand: 1,
      radiant_scepter: 1,
      astral_censer: 1,
      bastion_mace: 1,
      aegis_greatshield: 1,
    },
    unlockedPowers: ['inferno_nova', 'holy_sanctuary', 'thunder_strike', 'shadow_blink'],
    powerLevels: {
      inferno_nova: 1,
      holy_sanctuary: 1,
      thunder_strike: 1,
      shadow_blink: 1,
    },
    unlockedSkillSlots: 1,
    unlockedNetworkNodes: ['node_core_awakening'],
    unlockedGear: [],
    equippedGear: {
      relic: null,
      armor_core: null,
      boots: null,
    },
    consumables: {
      elixir_heal: 2,
      scroll_energy: 1,
      tonic_fury: 1,
    },
    monsterKillsByType: {},
    claimedChallenges: [],
    exploredChunks: ['0,0'],
    warriorChests: 1,
    mythicChests: 0,
    quests: INITIAL_QUESTS.map((q) => ({ ...q })),
    systemTheme: 'royal_cyan',
    soundEnabled: true,
    quality: 'balanced',
    renderEngine: 'auto',
    cameraView: 'third_person',
    deviceMode: detectInitialDeviceMode(),
    landscapeLocked: false,
    favoriteArena: 'obsidian_citadel',
    keyBindings: { ...DEFAULT_KEY_BINDINGS },
    hudConfig: {
      ...DEFAULT_HUD_CONFIG,
      joystickOffset: { ...DEFAULT_HUD_CONFIG.joystickOffset },
      actionsOffset: { ...DEFAULT_HUD_CONFIG.actionsOffset },
      widgets: { ...DEFAULT_HUD_CONFIG.widgets },
    },
  };
}

function migrateStats(rawStats: Record<string, number> | undefined, baseStats: AvatarConfig['stats']): AvatarConfig['stats'] {
  const next = { ...baseStats };
  if (!rawStats) return next;

  for (const def of STAT_DEFINITIONS) {
    if (typeof rawStats[def.key] === 'number' && Number.isFinite(rawStats[def.key])) {
      next[def.key] = Math.max(1, Math.round(rawStats[def.key]));
    }
  }
  // Safe migration from legacy 4-stat 'pwr'
  if (typeof rawStats.pwr === 'number' && rawStats.int === undefined && rawStats.spr === undefined) {
    const legacyPwr = Math.max(3, Math.round(rawStats.pwr));
    next.int = Math.max(3, legacyPwr);
    next.spr = Math.max(3, Math.round((legacyPwr + 3) * 0.5));
  }
  return next;
}

function loadProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialProfile();
    const parsed = JSON.parse(raw) as Partial<PlayerProfile>;
    const base = createInitialProfile();

    // Merge quests safely while preserving saved progress & appending new quests
    const existingQuests = Array.isArray(parsed.quests) ? parsed.quests : [];
    const mergedQuests = INITIAL_QUESTS.map((defQ) => {
      const savedQ = existingQuests.find((sq) => sq.id === defQ.id);
      return savedQ ? { ...defQ, ...savedQ } : { ...defQ };
    });

    const parsedAvatar = parsed.avatar as (Partial<AvatarConfig> & { stats?: Record<string, number> }) | undefined;
    const rawSlots = Array.isArray(parsedAvatar?.powerSlots) ? parsedAvatar.powerSlots : [];
    const slot0: PowerId = rawSlots[0] || parsedAvatar?.powerId || base.avatar.powerSlots[0];
    const slot1: PowerId = rawSlots[1] || parsedAvatar?.secondaryPowerId || base.avatar.powerSlots[1];
    const slot2: PowerId = rawSlots[2] || base.avatar.powerSlots[2];
    const slot3: PowerId = rawSlots[3] || base.avatar.powerSlots[3];
    const powerSlots: PowerSlots = [slot0, slot1, slot2, slot3];

    return {
      ...base,
      ...parsed,
      guildMarks: typeof parsed.guildMarks === 'number' ? parsed.guildMarks : base.guildMarks,
      completedNpcJobsCount: typeof parsed.completedNpcJobsCount === 'number' ? parsed.completedNpcJobsCount : 0,
      hasSeenIntro: typeof parsed.hasSeenIntro === 'boolean' ? parsed.hasSeenIntro : false,
      avatar: {
        ...base.avatar,
        ...(parsedAvatar || {}),
        auraStyle: parsedAvatar?.auraStyle || base.avatar.auraStyle,
        powerId: slot0,
        secondaryPowerId: slot1,
        powerSlots,
        stats: migrateStats(parsedAvatar?.stats, base.avatar.stats),
      },
      weaponLevels: { ...base.weaponLevels, ...(parsed.weaponLevels || {}) },
      unlockedPowers:
        Array.isArray(parsed.unlockedPowers) && parsed.unlockedPowers.length > 0
          ? (Array.from(new Set([...parsed.unlockedPowers, 'holy_sanctuary', 'shadow_blink'])) as PowerId[])
          : base.unlockedPowers,
      powerLevels: { ...base.powerLevels, ...(parsed.powerLevels || {}) },
      unlockedSkillSlots:
        typeof parsed.unlockedSkillSlots === 'number' &&
        parsed.unlockedSkillSlots >= 1 &&
        parsed.unlockedSkillSlots <= 4
          ? (parsed.unlockedSkillSlots as 1 | 2 | 3 | 4)
          : 1,
      unlockedNetworkNodes:
        Array.isArray(parsed.unlockedNetworkNodes) && parsed.unlockedNetworkNodes.length > 0
          ? Array.from(new Set(['node_core_awakening', ...parsed.unlockedNetworkNodes]))
          : ['node_core_awakening'],
      unlockedGear: Array.isArray(parsed.unlockedGear) ? parsed.unlockedGear : [],
      equippedGear: { ...base.equippedGear, ...(parsed.equippedGear || {}) },
      consumables: { ...base.consumables, ...(parsed.consumables || {}) },
      gatheredResources: { ...base.gatheredResources, ...(parsed.gatheredResources || {}) },
      activeNpcJobs: { ...(parsed.activeNpcJobs || {}) },
      monsterKillsByType: { ...(parsed.monsterKillsByType || {}) },
      claimedChallenges: Array.isArray(parsed.claimedChallenges) ? parsed.claimedChallenges : [],
      discoveredRegions:
        Array.isArray(parsed.discoveredRegions) && parsed.discoveredRegions.length > 0
          ? Array.from(new Set(['haven_village', ...parsed.discoveredRegions]))
          : ['haven_village'],
      exploredChunks:
        Array.isArray(parsed.exploredChunks) && parsed.exploredChunks.length > 0
          ? Array.from(new Set(['0,0', ...parsed.exploredChunks])).slice(-800)
          : ['0,0'],
      openedWorldChests: Array.isArray(parsed.openedWorldChests) ? parsed.openedWorldChests : [],
      critsLanded: typeof parsed.critsLanded === 'number' ? parsed.critsLanded : 0,
      fusionCasts: typeof parsed.fusionCasts === 'number' ? parsed.fusionCasts : 0,
      defeatedSecretBossIds: Array.isArray(parsed.defeatedSecretBossIds) ? parsed.defeatedSecretBossIds : [],
      completedWorldEventIds: Array.isArray(parsed.completedWorldEventIds) ? parsed.completedWorldEventIds : [],
      ...syncDailyChallenges(parsed.dailyChallengesDate, parsed.dailyChallenges),
      claimedAchievements: Array.isArray(parsed.claimedAchievements) ? parsed.claimedAchievements : [],
      unlockedTitles: Array.from(
        new Set([
          ...DEFAULT_TITLES.map((t) => t.label),
          ...(Array.isArray(parsed.unlockedTitles) ? parsed.unlockedTitles : []),
          ...(parsedAvatar?.title ? [parsedAvatar.title] : []),
        ])
      ),
      systemTheme:
        parsed.systemTheme === 'crimson_abyss' || parsed.systemTheme === 'royal_cyan'
          ? parsed.systemTheme
          : 'royal_cyan',
      quality:
        parsed.quality === 'eco' ||
        parsed.quality === 'balanced' ||
        parsed.quality === 'high' ||
        parsed.quality === 'ultra' ||
        parsed.quality === 'mythic' ||
        parsed.quality === 'impossible'
          ? parsed.quality
          : base.quality,
      renderEngine:
        parsed.renderEngine === 'auto' ||
        parsed.renderEngine === 'canvas2d' ||
        parsed.renderEngine === 'webgl'
          ? parsed.renderEngine
          : 'auto',
      keyBindings: {
        ...DEFAULT_KEY_BINDINGS,
        ...(parsed.keyBindings && typeof parsed.keyBindings === 'object' ? parsed.keyBindings : {}),
      },
      hudConfig: {
        ...DEFAULT_HUD_CONFIG,
        ...(parsed.hudConfig && typeof parsed.hudConfig === 'object' ? parsed.hudConfig : {}),
        joystickOffset: {
          ...DEFAULT_HUD_CONFIG.joystickOffset,
          ...(parsed.hudConfig?.joystickOffset || {}),
        },
        actionsOffset: {
          ...DEFAULT_HUD_CONFIG.actionsOffset,
          ...(parsed.hudConfig?.actionsOffset || {}),
        },
        widgets: {
          ...DEFAULT_HUD_CONFIG.widgets,
          ...(parsed.hudConfig?.widgets || {}),
        },
      },
      quests: mergedQuests,
    };
  } catch {
    return createInitialProfile();
  }
}

export interface ChestRewardOutcome {
  chestType: 'warrior' | 'mythic';
  gold: number;
  gems: number;
  xp: number;
  statPoints: number;
  headline: string;
}

export function usePlayerProgress() {
  const [profile, setProfile] = useState<PlayerProfile>(loadProfile);
  const profileRef = useRef(profile);
  profileRef.current = profile;

  useEffect(() => {
    audioSynth.enabled = profile.soundEnabled;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // Ignore storage quota errors
    }
  }, [profile]);

  const applyXpGain = (
    currentLevel: number,
    currentXp: number,
    unspent: number,
    xpGain: number
  ) => {
    let level = currentLevel;
    let xp = currentXp + xpGain;
    let points = unspent;
    let needed = xpForNextLevel(level);
    while (xp >= needed) {
      xp -= needed;
      level += 1;
      points += 3;
      needed = xpForNextLevel(level);
    }
    return { level, xp, unspentStatPoints: points };
  };

  const completeIntro = useCallback((blessing: StarterBlessing) => {
    audioSynth.playReward();
    setProfile((prev) => {
      if (prev.hasSeenIntro) {
        return { ...prev, hasSeenIntro: true };
      }
      const nextStats = { ...prev.avatar.stats };
      let bonusGold = 0;
      let bonusGems = 0;
      let bonusMarks = 0;
      let bonusChests = 0;

      if (blessing === 'vanguard') {
        nextStats.str += 3;
        nextStats.def += 2;
        nextStats.vit += 2;
        bonusGold = 180;
      } else if (blessing === 'arcane') {
        nextStats.int += 3;
        nextStats.spr += 2;
        nextStats.dex += 2;
        bonusGems = 10;
        bonusGold = 140;
      } else {
        nextStats.lck += 3;
        nextStats.agi += 2;
        bonusMarks = 25;
        bonusGold = 280;
        bonusChests = 1;
      }

      return {
        ...prev,
        hasSeenIntro: true,
        starterBlessing: blessing,
        gold: prev.gold + bonusGold,
        gems: prev.gems + bonusGems,
        guildMarks: prev.guildMarks + bonusMarks,
        warriorChests: prev.warriorChests + bonusChests,
        avatar: {
          ...prev.avatar,
          stats: nextStats,
        },
      };
    });
  }, []);

  const updateAvatar = useCallback((nextAvatar: AvatarConfig, markForgeQuest = false) => {
    setProfile((prev) => ({
      ...prev,
      avatar: {
        ...nextAvatar,
        powerId: nextAvatar.powerSlots[0],
        secondaryPowerId: nextAvatar.powerSlots[1],
      },
      quests: markForgeQuest
        ? prev.quests.map((q) =>
            q.id === 'q_forge_avatar' ? { ...q, current: Math.max(q.current, 1) } : q
          )
        : prev.quests,
    }));
  }, []);

  const allocateStat = useCallback((stat: StatKey, delta: 1 | -1) => {
    setProfile((prev) => {
      if (delta === 1 && prev.unspentStatPoints <= 0) return prev;
      if (delta === -1 && prev.avatar.stats[stat] <= 1) return prev;
      return {
        ...prev,
        unspentStatPoints: prev.unspentStatPoints - delta,
        avatar: {
          ...prev.avatar,
          stats: {
            ...prev.avatar.stats,
            [stat]: prev.avatar.stats[stat] + delta,
          },
        },
      };
    });
  }, []);

  const unlockOrEquipWeapon = useCallback((weaponId: WeaponId): { ok: boolean; message: string } => {
    const def = WEAPONS[weaponId];
    const curr = profileRef.current;
    if (curr.unlockedWeapons.includes(weaponId)) {
      setProfile((prev) => ({ ...prev, avatar: { ...prev.avatar, weaponId } }));
      return { ok: true, message: `تم تجهيز ${def.name}` };
    }
    if (curr.gold < def.costGold || curr.gems < def.costGems) {
      return { ok: false, message: 'رصيد الذهب أو الجواهر غير كافٍ.' };
    }
    audioSynth.playReward();
    setProfile((prev) => {
      if (prev.unlockedWeapons.includes(weaponId)) return prev;
      return {
        ...prev,
        gold: prev.gold - def.costGold,
        gems: prev.gems - def.costGems,
        unlockedWeapons: [...prev.unlockedWeapons, weaponId],
        avatar: { ...prev.avatar, weaponId },
      };
    });
    return { ok: true, message: `تم شراء وتجهيز ${def.name}` };
  }, []);

  const upgradeWeapon = useCallback((weaponId: WeaponId): { ok: boolean; message: string } => {
    const curr = profileRef.current;
    const currentLv = curr.weaponLevels[weaponId] || 1;
    if (currentLv >= 5) {
      return { ok: false, message: 'وصل السلاح للحد الأقصى (المستوى 5).' };
    }
    const costGold = currentLv * 220;
    if (curr.gold < costGold) {
      return { ok: false, message: `تحتاج إلى ${costGold} ذهب للترقية.` };
    }
    audioSynth.playReward();
    const nextLv = currentLv + 1;
    setProfile((prev) => ({
      ...prev,
      gold: prev.gold - costGold,
      weaponLevels: { ...prev.weaponLevels, [weaponId]: nextLv },
      quests: prev.quests.map((q) =>
        q.id === 'q_upgrade_weapon' ? { ...q, current: Math.max(q.current, 1) } : q
      ),
    }));
    return { ok: true, message: `تمت ترقية السلاح إلى المستوى ${nextLv}` };
  }, []);

  const unlockOrEquipPower = useCallback(
    (powerId: PowerId, slotIndex: 0 | 1 | 2 | 3 = 0): { ok: boolean; message: string } => {
      const def = POWERS[powerId];
      const curr = profileRef.current;
      const slotKeys = ['[Q]', '[R]', '[Z]', '[X]'] as const;
      const slotTag = `الخانة ${slotIndex + 1} ${slotKeys[slotIndex]}`;

      if (slotIndex >= curr.unlockedSkillSlots) {
        return {
          ok: false,
          message: `${slotTag} مقفلة حالياً! اشترِ الخانة الإضافية أولاً لترفع عدد مهاراتك النشطة.`,
        };
      }

      const buildNextSlots = (slots: PowerSlots): PowerSlots => {
        const next = [...slots] as PowerSlots;
        next[slotIndex] = powerId;
        return next;
      };

      if (curr.unlockedPowers.includes(powerId)) {
        setProfile((prev) => {
          const nextSlots = buildNextSlots(prev.avatar.powerSlots);
          return {
            ...prev,
            avatar: {
              ...prev.avatar,
              powerSlots: nextSlots,
              powerId: nextSlots[0],
              secondaryPowerId: nextSlots[1],
            },
          };
        });
        return { ok: true, message: `تم تعيين ${def.name} في ${slotTag}` };
      }
      if (def.isFusion) {
        return { ok: false, message: 'هذه مهارة مدمجة — افتحها من مختبر دمج المهارات!' };
      }
      if (curr.gold < def.costGold || curr.gems < def.costGems) {
        return { ok: false, message: 'رصيد الذهب أو الجواهر غير كافٍ.' };
      }
      audioSynth.playReward();
      setProfile((prev) => {
        const nextSlots = buildNextSlots(prev.avatar.powerSlots);
        return {
          ...prev,
          gold: prev.gold - def.costGold,
          gems: prev.gems - def.costGems,
          unlockedPowers: prev.unlockedPowers.includes(powerId)
            ? prev.unlockedPowers
            : [...prev.unlockedPowers, powerId],
          powerLevels: {
            ...prev.powerLevels,
            [powerId]: prev.powerLevels[powerId] || 1,
          },
          avatar: {
            ...prev.avatar,
            powerSlots: nextSlots,
            powerId: nextSlots[0],
            secondaryPowerId: nextSlots[1],
          },
        };
      });
      return { ok: true, message: `تم فتح وتجهيز ${def.name} في ${slotTag}` };
    },
    []
  );

  const unlockNextSkillSlot = useCallback(
    (payWith: 'gold_marks' | 'gems'): { ok: boolean; message: string } => {
      const curr = profileRef.current;
      if (curr.unlockedSkillSlots >= 4) {
        return { ok: false, message: 'جميع خانات المهارات الأربع مفتوحة بالفعل!' };
      }
      const nextSlot = (curr.unlockedSkillSlots + 1) as 2 | 3 | 4;
      const cost = SKILL_SLOT_UNLOCK_COSTS[nextSlot];
      if (payWith === 'gold_marks') {
        if (curr.gold < cost.gold || curr.guildMarks < cost.guildMarks) {
          return {
            ok: false,
            message: `تحتاج إلى ${cost.gold} ذهب و ${cost.guildMarks} وسام نقابة لفتح ${cost.label}.`,
          };
        }
        audioSynth.playReward();
        setProfile((prev) => {
          if (prev.unlockedSkillSlots >= nextSlot) return prev;
          return {
            ...prev,
            gold: prev.gold - cost.gold,
            guildMarks: prev.guildMarks - cost.guildMarks,
            unlockedSkillSlots: nextSlot,
          };
        });
        return { ok: true, message: `تهانينا! تم فتح ${cost.label} بنجاح!` };
      } else {
        if (curr.gems < cost.gems) {
          return { ok: false, message: `تحتاج إلى ${cost.gems} جوهرة لفتح ${cost.label}.` };
        }
        audioSynth.playReward();
        setProfile((prev) => {
          if (prev.unlockedSkillSlots >= nextSlot) return prev;
          return {
            ...prev,
            gems: prev.gems - cost.gems,
            unlockedSkillSlots: nextSlot,
          };
        });
        return { ok: true, message: `تهانينا! تم فتح ${cost.label} بالجواهر!` };
      }
    },
    []
  );

  const upgradePower = useCallback((powerId: PowerId): { ok: boolean; message: string } => {
    const def = POWERS[powerId];
    const curr = profileRef.current;
    if (!curr.unlockedPowers.includes(powerId)) {
      return { ok: false, message: 'افتح المهارة أولاً قبل تطوير مستواها.' };
    }
    const currentLv = curr.powerLevels[powerId] || 1;
    if (currentLv >= 5) {
      return { ok: false, message: 'وصلت المهارة للحد الأقصى (المستوى 5).' };
    }
    const costGold = currentLv * (def.isFusion ? 320 : 220);
    const costMarks = currentLv * (def.isFusion ? 8 : 5);
    if (curr.gold < costGold || curr.guildMarks < costMarks) {
      return {
        ok: false,
        message: `تحتاج إلى ${costGold} ذهب و ${costMarks} وسام نقابة للتطوير.`,
      };
    }
    audioSynth.playReward();
    const nextLv = currentLv + 1;
    setProfile((prev) => ({
      ...prev,
      gold: prev.gold - costGold,
      guildMarks: prev.guildMarks - costMarks,
      powerLevels: {
        ...prev.powerLevels,
        [powerId]: nextLv,
      },
    }));
    return { ok: true, message: `تم تطوير ${def.name} إلى المستوى ${nextLv}!` };
  }, []);

  const unlockNetworkNode = useCallback((nodeId: string): { ok: boolean; message: string } => {
    const node = SKILL_NETWORK_NODES.find((n) => n.id === nodeId);
    const curr = profileRef.current;
    if (!node) return { ok: false, message: 'العقدة غير موجودة.' };
    if (curr.unlockedNetworkNodes.includes(nodeId)) {
      return { ok: false, message: 'هذه العقدة مفعّلة بالفعل.' };
    }
    if (node.requires && !curr.unlockedNetworkNodes.includes(node.requires)) {
      const reqNode = SKILL_NETWORK_NODES.find((n) => n.id === node.requires);
      return { ok: false, message: `يجب فتح «${reqNode?.title || 'العقدة السابقة'}» أولاً.` };
    }
    if (curr.gold < node.costGold || curr.guildMarks < node.costMarks) {
      return {
        ok: false,
        message: `تحتاج إلى ${node.costGold} ذهب و ${node.costMarks} وسام نقابة.`,
      };
    }
    audioSynth.playReward();
    setProfile((prev) => {
      if (prev.unlockedNetworkNodes.includes(nodeId)) return prev;
      return {
        ...prev,
        gold: prev.gold - node.costGold,
        guildMarks: prev.guildMarks - node.costMarks,
        unlockedNetworkNodes: [...prev.unlockedNetworkNodes, nodeId],
      };
    });
    return { ok: true, message: `تم تفعيل عقدة «${node.title}» (${node.bonusLabel})!` };
  }, []);

  const fusePowers = useCallback((fusionId: PowerId): { ok: boolean; message: string } => {
    const def = POWERS[fusionId];
    const curr = profileRef.current;
    if (!def || !def.isFusion || !def.fusionPair) {
      return { ok: false, message: 'وصفة دمج غير صالحة.' };
    }
    if (curr.unlockedPowers.includes(fusionId)) {
      return { ok: false, message: 'هذه المهارة المدمجة مفتوحة بالفعل! عيّنها في أي خانة نشطة.' };
    }
    const [pA, pB] = def.fusionPair;
    if (!curr.unlockedPowers.includes(pA) || !curr.unlockedPowers.includes(pB)) {
      return {
        ok: false,
        message: `يجب امتلاك كل من «${POWERS[pA].name}» و«${POWERS[pB].name}» أولاً.`,
      };
    }
    const lvA = curr.powerLevels[pA] || 1;
    const lvB = curr.powerLevels[pB] || 1;
    if (lvA < 2 || lvB < 2) {
      return {
        ok: false,
        message: `يجب ترقية «${POWERS[pA].name}» و«${POWERS[pB].name}» إلى المستوى 2 على الأقل للدمج!`,
      };
    }
    const goldCost = def.fusionCostGold || 700;
    const marksCost = def.fusionCostMarks || 16;
    if (curr.gold < goldCost || curr.guildMarks < marksCost) {
      return {
        ok: false,
        message: `تحتاج إلى ${goldCost} ذهب و ${marksCost} وسام نقابة لإتمام الدمج.`,
      };
    }
    audioSynth.playReward();
    setProfile((prev) => {
      if (prev.unlockedPowers.includes(fusionId)) return prev;
      const nextSlots = [...prev.avatar.powerSlots] as PowerSlots;
      nextSlots[0] = fusionId;
      return {
        ...prev,
        gold: prev.gold - goldCost,
        guildMarks: prev.guildMarks - marksCost,
        unlockedPowers: [...prev.unlockedPowers, fusionId],
        powerLevels: {
          ...prev.powerLevels,
          [fusionId]: 1,
        },
        avatar: {
          ...prev.avatar,
          powerSlots: nextSlots,
          powerId: nextSlots[0],
        },
      };
    });
    return { ok: true, message: `اندماج ناجح! فُتحت مهارة «${def.name}» وجهّزت في [Q]!` };
  }, []);

  const unlockOrEquipGear = useCallback((gearId: GearId): { ok: boolean; message: string } => {
    const def = GEAR_ITEMS[gearId];
    const curr = profileRef.current;
    const isUnlocked = curr.unlockedGear.includes(gearId);

    if (isUnlocked) {
      setProfile((prev) => ({
        ...prev,
        equippedGear: { ...prev.equippedGear, [def.slot]: gearId },
        quests: prev.quests.map((q) =>
          q.id === 'q_buy_gear' ? { ...q, current: Math.max(q.current, 1) } : q
        ),
      }));
      return { ok: true, message: `تم تجهيز ${def.name}` };
    }

    if (curr.gold < def.costGold || curr.gems < def.costGems) {
      return { ok: false, message: 'رصيد الذهب أو الجواهر غير كافٍ لشراء هذا السامان.' };
    }

    audioSynth.playReward();
    setProfile((prev) => ({
      ...prev,
      gold: prev.gold - def.costGold,
      gems: prev.gems - def.costGems,
      unlockedGear: prev.unlockedGear.includes(gearId) ? prev.unlockedGear : [...prev.unlockedGear, gearId],
      equippedGear: { ...prev.equippedGear, [def.slot]: gearId },
      quests: prev.quests.map((q) =>
        q.id === 'q_buy_gear' ? { ...q, current: Math.max(q.current, 1) } : q
      ),
    }));
    return { ok: true, message: `تم شراء وتجهيز ${def.name}!` };
  }, []);

  const unequipGearSlot = useCallback((slot: GearSlot) => {
    setProfile((prev) => ({
      ...prev,
      equippedGear: { ...prev.equippedGear, [slot]: null },
    }));
  }, []);

  const buyConsumable = useCallback((id: ConsumableId, qty = 1): { ok: boolean; message: string } => {
    const def = CONSUMABLES[id];
    const totalCost = def.costGold * qty;
    const curr = profileRef.current;
    if (curr.gold < totalCost) {
      return { ok: false, message: `تحتاج إلى ${totalCost} ذهب لشراء ${def.name}.` };
    }
    audioSynth.playReward();
    setProfile((prev) => ({
      ...prev,
      gold: prev.gold - totalCost,
      consumables: {
        ...prev.consumables,
        [id]: (prev.consumables[id] || 0) + qty,
      },
    }));
    return { ok: true, message: `تم شراء ${def.name} (×${qty})` };
  }, []);

  const consumeBattleItem = useCallback((id: ConsumableId): boolean => {
    const curr = profileRef.current;
    if ((curr.consumables[id] || 0) <= 0) return false;
    setProfile((prev) => ({
      ...prev,
      consumables: {
        ...prev.consumables,
        [id]: Math.max(0, (prev.consumables[id] || 0) - 1),
      },
    }));
    return true;
  }, []);

  const acceptNpcJob = useCallback((jobId: string): { ok: boolean; message: string } => {
    const job = NPC_JOBS[jobId];
    if (!job) return { ok: false, message: 'العقد غير موجود.' };
    audioSynth.playReward();
    setProfile((prev) => {
      const existing = prev.activeNpcJobs[jobId];
      if (existing && !existing.completed) return prev;
      return {
        ...prev,
        activeNpcJobs: {
          ...prev.activeNpcJobs,
          [jobId]: {
            progress: jobId === 'job_explore' ? Math.min(job.target, prev.discoveredRegions.length) : 0,
            completed: false,
          },
        },
      };
    });
    return { ok: true, message: `تم استلام عقد: ${job.title}` };
  }, []);

  const recordResourceGathered = useCallback((kind: OverworldNodeKind) => {
    audioSynth.playReward();
    setProfile((prev) => {
      const nextResources = {
        ...prev.gatheredResources,
        [kind]: (prev.gatheredResources[kind] || 0) + 1,
      };
      const nextJobs = { ...prev.activeNpcJobs };
      const matchingJobId =
        kind === 'herb' ? 'job_herbs' : kind === 'ore' ? 'job_ores' : 'job_crystals';
      const active = nextJobs[matchingJobId];
      const def = NPC_JOBS[matchingJobId];
      if (active && !active.completed && def) {
        nextJobs[matchingJobId] = {
          ...active,
          progress: Math.min(def.target, active.progress + 1),
        };
      }
      const dailySync = advanceDailyList(prev.dailyChallenges, prev.dailyChallengesDate, 'gather', 1);
      return {
        ...prev,
        ...dailySync,
        gatheredResources: nextResources,
        activeNpcJobs: nextJobs,
      };
    });
  }, []);

  const completeNpcJob = useCallback(
    (jobId: string): { ok: boolean; message: string } => {
      const def = NPC_JOBS[jobId];
      const curr = profileRef.current;
      const state = curr.activeNpcJobs[jobId];
      if (!def || !state || state.completed || state.progress < def.target) {
        return { ok: false, message: 'لم يكتمل شرط هذا العقد بعد.' };
      }
      audioSynth.playReward();
      setProfile((prev) => {
        const currentJob = prev.activeNpcJobs[jobId];
        if (!currentJob || currentJob.completed || currentJob.progress < def.target) return prev;
        const xpRes = applyXpGain(prev.level, prev.xp, prev.unspentStatPoints, def.rewardXp);
        return {
          ...prev,
          gold: prev.gold + def.rewardGold,
          gems: prev.gems + def.rewardGems,
          guildMarks: prev.guildMarks + def.rewardGuildMarks,
          level: xpRes.level,
          xp: xpRes.xp,
          unspentStatPoints: xpRes.unspentStatPoints,
          completedNpcJobsCount: prev.completedNpcJobsCount + 1,
          activeNpcJobs: {
            ...prev.activeNpcJobs,
            [jobId]: { ...currentJob, completed: true },
          },
        };
      });
      return {
        ok: true,
        message: `أحسنت! استلمت +${def.rewardGold} ذهب و +${def.rewardGuildMarks} وسام نقابة!`,
      };
    },
    []
  );

  const sellSingleResource = useCallback((kind: OverworldNodeKind): { ok: boolean; message: string } => {
    const curr = profileRef.current;
    const count = curr.gatheredResources[kind] || 0;
    if (count <= 0) {
      return { ok: false, message: 'لا تملك موارد من هذا النوع للبيع.' };
    }
    const marks = count * RESOURCE_MARK_VALUES[kind];
    audioSynth.playReward();
    setProfile((prev) => {
      const c = prev.gatheredResources[kind] || 0;
      if (c <= 0) return prev;
      return {
        ...prev,
        guildMarks: prev.guildMarks + c * RESOURCE_MARK_VALUES[kind],
        gatheredResources: { ...prev.gatheredResources, [kind]: 0 },
      };
    });
    return { ok: true, message: `تم صرف الموارد مقابل +${marks} وسام نقابة!` };
  }, []);

  const sellAllResourcesForMarks = useCallback((): { ok: boolean; message: string } => {
    const curr = profileRef.current;
    const totalMarks =
      (curr.gatheredResources.herb || 0) * RESOURCE_MARK_VALUES.herb +
      (curr.gatheredResources.ore || 0) * RESOURCE_MARK_VALUES.ore +
      (curr.gatheredResources.crystal || 0) * RESOURCE_MARK_VALUES.crystal;
    if (totalMarks <= 0) {
      return { ok: false, message: 'حقيبة الموارد فارغة حالياً.' };
    }
    audioSynth.playReward();
    setProfile((prev) => {
      const earned =
        (prev.gatheredResources.herb || 0) * RESOURCE_MARK_VALUES.herb +
        (prev.gatheredResources.ore || 0) * RESOURCE_MARK_VALUES.ore +
        (prev.gatheredResources.crystal || 0) * RESOURCE_MARK_VALUES.crystal;
      return {
        ...prev,
        guildMarks: prev.guildMarks + earned,
        gatheredResources: { herb: 0, ore: 0, crystal: 0 },
      };
    });
    return { ok: true, message: `تم بيع كل الموارد مقابل +${totalMarks} وسام نقابة!` };
  }, []);

  const exchangeGuildMarks = useCallback(
    (option: 'gold' | 'gems' | 'mythic_chest'): { ok: boolean; message: string } => {
      const curr = profileRef.current;
      if (option === 'gold') {
        if (curr.guildMarks < 20) return { ok: false, message: 'تحتاج إلى 20 وسام نقابة.' };
        audioSynth.playReward();
        setProfile((prev) => ({
          ...prev,
          guildMarks: prev.guildMarks - 20,
          gold: prev.gold + 300,
        }));
        return { ok: true, message: 'تم استبدال 20 وساماً مقابل +300 ذهب!' };
      }
      if (option === 'gems') {
        if (curr.guildMarks < 30) return { ok: false, message: 'تحتاج إلى 30 وسام نقابة.' };
        audioSynth.playReward();
        setProfile((prev) => ({
          ...prev,
          guildMarks: prev.guildMarks - 30,
          gems: prev.gems + 12,
        }));
        return { ok: true, message: 'تم استبدال 30 وساماً مقابل +12 جوهرة!' };
      }
      if (curr.guildMarks < 65) return { ok: false, message: 'تحتاج إلى 65 وسام نقابة.' };
      audioSynth.playReward();
      setProfile((prev) => ({
        ...prev,
        guildMarks: prev.guildMarks - 65,
        mythicChests: prev.mythicChests + 1,
      }));
      return { ok: true, message: 'تم استبدال 65 وساماً مقابل صندوق أسطوري!' };
    },
    []
  );

  const recordMatchResult = useCallback((res: MatchResult) => {
    setProfile((prev) => {
      const xpRes = applyXpGain(prev.level, prev.xp, prev.unspentStatPoints, res.xpEarned);
      const nextWins = prev.wins + (res.victory ? 1 : 0);
      const nextRating = Math.max(800, prev.rating + res.ratingDelta);
      const earnedWarriorChest = res.victory && nextWins % 2 === 0 ? 1 : 0;
      const earnedMythicChest = res.bossKills > 0 ? 1 : 0;

      const mergedMonsterKills = { ...prev.monsterKillsByType };
      if (res.monsterKillsByType) {
        for (const [k, v] of Object.entries(res.monsterKillsByType)) {
          const key = k as keyof typeof mergedMonsterKills;
          mergedMonsterKills[key] = (mergedMonsterKills[key] || 0) + (v || 0);
        }
      }

      const nextJobs = { ...prev.activeNpcJobs };
      const monsterJob = nextJobs.job_monsters;
      const monsterDef = NPC_JOBS.job_monsters;
      if (monsterJob && !monsterJob.completed && monsterDef && res.kills > 0) {
        nextJobs.job_monsters = {
          ...monsterJob,
          progress: Math.min(monsterDef.target, monsterJob.progress + res.kills),
        };
      }

      const updatedQuests = prev.quests.map((q) => {
        if (q.id === 'q_slay_10') {
          return { ...q, current: Math.min(q.target, q.current + res.kills) };
        }
        if (q.id === 'q_combo_8') {
          return { ...q, current: Math.min(q.target, Math.max(q.current, res.maxCombo)) };
        }
        if (
          q.id === 'q_pvp_win' &&
          res.victory &&
          (res.mode === 'pvp_ranked' ||
            res.mode === 'pvp_online' ||
            res.mode === 'pvp_local' ||
            res.mode === 'unified_clash')
        ) {
          return { ...q, current: Math.min(q.target, q.current + 1) };
        }
        if (q.id === 'q_boss_slayer' && res.bossKills > 0) {
          return { ...q, current: Math.min(q.target, q.current + res.bossKills) };
        }
        return q;
      });

      let dailySync = advanceDailyList(prev.dailyChallenges, prev.dailyChallengesDate, 'kills', res.kills);
      if (res.bossKills > 0) {
        dailySync = advanceDailyList(dailySync.dailyChallenges, dailySync.dailyChallengesDate, 'bossKills', res.bossKills);
      }
      if (
        res.victory &&
        (res.mode === 'pvp_ranked' || res.mode === 'pvp_online' || res.mode === 'pvp_local' || res.mode === 'unified_clash')
      ) {
        dailySync = advanceDailyList(dailySync.dailyChallenges, dailySync.dailyChallengesDate, 'pvpWins', 1);
      }

      return {
        ...prev,
        ...dailySync,
        gold: prev.gold + res.goldEarned,
        gems: prev.gems + res.gemsEarned,
        guildMarks: prev.guildMarks + Math.floor(res.kills * 1.5) + (res.bossKills > 0 ? 10 : 0),
        level: xpRes.level,
        xp: xpRes.xp,
        unspentStatPoints: xpRes.unspentStatPoints,
        rating: nextRating,
        wins: nextWins,
        losses: prev.losses + (res.victory ? 0 : 1),
        totalKills: prev.totalKills + res.kills,
        bossKills: prev.bossKills + res.bossKills,
        bestCombo: Math.max(prev.bestCombo, res.maxCombo),
        missionsCompleted: prev.missionsCompleted + (res.missionsDone || 0),
        monsterKillsByType: mergedMonsterKills,
        warriorChests: prev.warriorChests + earnedWarriorChest,
        mythicChests: prev.mythicChests + earnedMythicChest,
        activeNpcJobs: nextJobs,
        quests: updatedQuests,
      };
    });
  }, []);

  const claimQuest = useCallback((questId: string) => {
    setProfile((prev) => {
      const target = prev.quests.find((q) => q.id === questId);
      if (!target || target.claimed || target.current < target.target) return prev;
      audioSynth.playReward();
      const xpRes = applyXpGain(prev.level, prev.xp, prev.unspentStatPoints, target.rewardXp);
      return {
        ...prev,
        gold: prev.gold + target.rewardGold,
        gems: prev.gems + target.rewardGems,
        guildMarks: prev.guildMarks + 10,
        level: xpRes.level,
        xp: xpRes.xp,
        unspentStatPoints: xpRes.unspentStatPoints,
        warriorChests: prev.warriorChests + 1,
        quests: prev.quests.map((q) => (q.id === questId ? { ...q, claimed: true } : q)),
      };
    });
  }, []);

  const claimMapChallenge = useCallback((challengeId: string): boolean => {
    const ch = MAP_CHALLENGES.find((c) => c.id === challengeId);
    const curr = profileRef.current;
    if (!ch || curr.claimedChallenges.includes(challengeId)) return false;

    const currentVal =
      ch.metric === 'kills'
        ? curr.totalKills
        : ch.metric === 'bossKills'
          ? curr.bossKills
          : ch.metric === 'missions'
            ? curr.missionsCompleted
            : ch.metric === 'rating'
              ? curr.rating
              : ch.metric === 'regions'
                ? curr.discoveredRegions.length
                : 0;
    if (currentVal < ch.target) return false;

    audioSynth.playReward();
    setProfile((prev) => {
      if (prev.claimedChallenges.includes(challengeId)) return prev;
      const xpRes = applyXpGain(prev.level, prev.xp, prev.unspentStatPoints, ch.rewardXp);
      return {
        ...prev,
        gold: prev.gold + ch.rewardGold,
        gems: prev.gems + ch.rewardGems,
        guildMarks: prev.guildMarks + 18,
        level: xpRes.level,
        xp: xpRes.xp,
        unspentStatPoints: xpRes.unspentStatPoints,
        mythicChests: prev.mythicChests + 1,
        claimedChallenges: [...prev.claimedChallenges, challengeId],
      };
    });
    return true;
  }, []);

  const openChest = useCallback((chestType: 'warrior' | 'mythic'): ChestRewardOutcome | null => {
    const curr = profileRef.current;
    if (chestType === 'warrior' && curr.warriorChests <= 0) return null;
    if (chestType === 'mythic' && curr.mythicChests <= 0) return null;

    const gold =
      chestType === 'mythic'
        ? 360 + Math.floor(Math.random() * 240)
        : 150 + Math.floor(Math.random() * 120);
    const gems =
      chestType === 'mythic'
        ? 15 + Math.floor(Math.random() * 12)
        : 4 + Math.floor(Math.random() * 5);
    const xp = chestType === 'mythic' ? 200 : 95;
    const statPoints = chestType === 'mythic' ? 2 : 1;

    audioSynth.playReward();
    const outcome: ChestRewardOutcome = {
      chestType,
      gold,
      gems,
      xp,
      statPoints,
      headline: chestType === 'mythic' ? 'غنائم الصندوق الأسطوري' : 'غنائم صندوق المحارب',
    };

    setProfile((prev) => {
      if (chestType === 'warrior' && prev.warriorChests <= 0) return prev;
      if (chestType === 'mythic' && prev.mythicChests <= 0) return prev;
      const xpRes = applyXpGain(prev.level, prev.xp, prev.unspentStatPoints + statPoints, xp);
      return {
        ...prev,
        gold: prev.gold + gold,
        gems: prev.gems + gems,
        level: xpRes.level,
        xp: xpRes.xp,
        unspentStatPoints: xpRes.unspentStatPoints,
        warriorChests: chestType === 'warrior' ? prev.warriorChests - 1 : prev.warriorChests,
        mythicChests: chestType === 'mythic' ? prev.mythicChests - 1 : prev.mythicChests,
      };
    });
    return outcome;
  }, []);

  const buyChest = useCallback((chestType: 'warrior' | 'mythic'): boolean => {
    const curr = profileRef.current;
    if (chestType === 'warrior') {
      if (curr.gold < 260) return false;
      audioSynth.playReward();
      setProfile((prev) => ({ ...prev, gold: prev.gold - 260, warriorChests: prev.warriorChests + 1 }));
      return true;
    } else {
      if (curr.gems < 18) return false;
      audioSynth.playReward();
      setProfile((prev) => ({ ...prev, gems: prev.gems - 18, mythicChests: prev.mythicChests + 1 }));
      return true;
    }
  }, []);

  const recordRegionDiscovery = useCallback((regionId: string, gold: number, xp: number): boolean => {
    const curr = profileRef.current;
    if (curr.discoveredRegions.includes(regionId)) return false;
    audioSynth.playReward();
    setProfile((prev) => {
      if (prev.discoveredRegions.includes(regionId)) return prev;
      const nextRegions = [...prev.discoveredRegions, regionId];
      const xpRes = applyXpGain(prev.level, prev.xp, prev.unspentStatPoints, xp);
      const nextJobs = { ...prev.activeNpcJobs };
      const expJob = nextJobs.job_explore;
      const expDef = NPC_JOBS.job_explore;
      if (expJob && !expJob.completed && expDef) {
        nextJobs.job_explore = {
          ...expJob,
          progress: Math.min(expDef.target, nextRegions.length),
        };
      }
      return {
        ...prev,
        gold: prev.gold + gold,
        guildMarks: prev.guildMarks + 5,
        level: xpRes.level,
        xp: xpRes.xp,
        unspentStatPoints: xpRes.unspentStatPoints,
        discoveredRegions: nextRegions,
        activeNpcJobs: nextJobs,
        quests: prev.quests.map((q) =>
          q.id === 'q_explore_world' ? { ...q, current: Math.min(q.target, nextRegions.length) } : q
        ),
      };
    });
    return true;
  }, []);

  const recordWorldChestOpened = useCallback(
    (chestId: string, gold: number, gems: number, xp: number): boolean => {
      const curr = profileRef.current;
      if (curr.openedWorldChests.includes(chestId)) return false;
      audioSynth.playReward();
      setProfile((prev) => {
        if (prev.openedWorldChests.includes(chestId)) return prev;
        const xpRes = applyXpGain(prev.level, prev.xp, prev.unspentStatPoints, xp);
        return {
          ...prev,
          gold: prev.gold + gold,
          gems: prev.gems + gems,
          guildMarks: prev.guildMarks + 8,
          level: xpRes.level,
          xp: xpRes.xp,
          unspentStatPoints: xpRes.unspentStatPoints,
          openedWorldChests: [...prev.openedWorldChests, chestId],
        };
      });
      return true;
    },
    []
  );

  const recordChunkExplored = useCallback((chunkKey: string): boolean => {
    const curr = profileRef.current;
    if (curr.exploredChunks.includes(chunkKey)) return false;
    setProfile((prev) => {
      if (prev.exploredChunks.includes(chunkKey)) return prev;
      const xpRes = applyXpGain(prev.level, prev.xp, prev.unspentStatPoints, 18);
      const nextChunks = [...prev.exploredChunks, chunkKey];
      const capped = nextChunks.length > 800 ? nextChunks.slice(nextChunks.length - 800) : nextChunks;
      const dailySync = advanceDailyList(prev.dailyChallenges, prev.dailyChallengesDate, 'chunks', 1);
      return {
        ...prev,
        ...dailySync,
        gold: prev.gold + 20,
        level: xpRes.level,
        xp: xpRes.xp,
        unspentStatPoints: xpRes.unspentStatPoints,
        exploredChunks: capped,
      };
    });
    return true;
  }, []);

  const recordCritLanded = useCallback(() => {
    setProfile((prev) => {
      const dailySync = advanceDailyList(prev.dailyChallenges, prev.dailyChallengesDate, 'crits', 1);
      return {
        ...prev,
        ...dailySync,
        critsLanded: prev.critsLanded + 1,
      };
    });
  }, []);

  const recordFusionCast = useCallback(() => {
    setProfile((prev) => {
      const dailySync = advanceDailyList(prev.dailyChallenges, prev.dailyChallengesDate, 'fusions', 1);
      return {
        ...prev,
        ...dailySync,
        fusionCasts: prev.fusionCasts + 1,
      };
    });
  }, []);

  const recordSecretBossDefeated = useCallback((boss: SecretBossDef): boolean => {
    const curr = profileRef.current;
    if (curr.defeatedSecretBossIds.includes(boss.id)) return false;
    setProfile((prev) => {
      if (prev.defeatedSecretBossIds.includes(boss.id)) return prev;
      const xpRes = applyXpGain(prev.level, prev.xp, prev.unspentStatPoints, boss.rewardXp);
      const dailySync = advanceDailyList(prev.dailyChallenges, prev.dailyChallengesDate, 'bossKills', 1);
      const nextTitles =
        boss.unlockTitle && !prev.unlockedTitles.includes(boss.unlockTitle)
          ? [...prev.unlockedTitles, boss.unlockTitle]
          : prev.unlockedTitles;
      return {
        ...prev,
        ...dailySync,
        gold: prev.gold + boss.rewardGold,
        gems: prev.gems + boss.rewardGems,
        guildMarks: prev.guildMarks + boss.rewardMarks,
        bossKills: prev.bossKills + 1,
        level: xpRes.level,
        xp: xpRes.xp,
        unspentStatPoints: xpRes.unspentStatPoints,
        defeatedSecretBossIds: [...prev.defeatedSecretBossIds, boss.id],
        unlockedTitles: nextTitles,
      };
    });
    return true;
  }, []);

  const recordWorldEventCompleted = useCallback((zone: WorldEventZoneDef): boolean => {
    const curr = profileRef.current;
    if (curr.completedWorldEventIds.includes(zone.id)) return false;
    setProfile((prev) => {
      if (prev.completedWorldEventIds.includes(zone.id)) return prev;
      const xpRes = applyXpGain(prev.level, prev.xp, prev.unspentStatPoints, zone.rewardXp);
      return {
        ...prev,
        gold: prev.gold + zone.rewardGold,
        gems: prev.gems + zone.rewardGems,
        guildMarks: prev.guildMarks + zone.rewardMarks,
        level: xpRes.level,
        xp: xpRes.xp,
        unspentStatPoints: xpRes.unspentStatPoints,
        completedWorldEventIds: [...prev.completedWorldEventIds, zone.id],
      };
    });
    return true;
  }, []);

  const claimDailyChallenge = useCallback((dailyId: string): boolean => {
    const curr = profileRef.current;
    const synced = syncDailyChallenges(curr.dailyChallengesDate, curr.dailyChallenges);
    const target = synced.dailyChallenges.find((d) => d.id === dailyId);
    if (!target || target.claimed || target.current < target.target) return false;
    audioSynth.playDailyClaim();
    setProfile((prev) => {
      const s = syncDailyChallenges(prev.dailyChallengesDate, prev.dailyChallenges);
      const t = s.dailyChallenges.find((d) => d.id === dailyId);
      if (!t || t.claimed || t.current < t.target) return prev;
      const xpRes = applyXpGain(prev.level, prev.xp, prev.unspentStatPoints, t.rewardXp);
      return {
        ...prev,
        gold: prev.gold + t.rewardGold,
        gems: prev.gems + t.rewardGems,
        guildMarks: prev.guildMarks + t.rewardMarks,
        level: xpRes.level,
        xp: xpRes.xp,
        unspentStatPoints: xpRes.unspentStatPoints,
        dailyChallengesDate: s.dailyChallengesDate,
        dailyChallenges: s.dailyChallenges.map((d) => (d.id === dailyId ? { ...d, claimed: true } : d)),
      };
    });
    return true;
  }, []);

  const claimAchievement = useCallback((achId: string): boolean => {
    const ach = ACHIEVEMENT_DEFS.find((a) => a.id === achId);
    const curr = profileRef.current;
    if (!ach || curr.claimedAchievements.includes(achId)) return false;
    if (getAchievementCurrentValue(curr, ach.metric) < ach.target) return false;
    audioSynth.playAchievementUnlock();
    setProfile((prev) => {
      if (prev.claimedAchievements.includes(achId)) return prev;
      if (getAchievementCurrentValue(prev, ach.metric) < ach.target) return prev;
      const nextTitles = prev.unlockedTitles.includes(ach.rewardTitle)
        ? prev.unlockedTitles
        : [...prev.unlockedTitles, ach.rewardTitle];
      return {
        ...prev,
        gold: prev.gold + ach.rewardGold,
        gems: prev.gems + ach.rewardGems,
        guildMarks: prev.guildMarks + ach.rewardMarks,
        claimedAchievements: [...prev.claimedAchievements, achId],
        unlockedTitles: nextTitles,
      };
    });
    return true;
  }, []);

  const equipTitle = useCallback((title: string): boolean => {
    const curr = profileRef.current;
    if (!curr.unlockedTitles.includes(title)) return false;
    audioSynth.playDailyClaim();
    setProfile((prev) => ({
      ...prev,
      avatar: { ...prev.avatar, title },
    }));
    return true;
  }, []);

  const setSystemTheme = useCallback((systemTheme: SystemTheme) => {
    setProfile((prev) => ({ ...prev, systemTheme }));
  }, []);

  const setQuality = useCallback((quality: GraphicsQuality) => {
    setProfile((prev) => ({ ...prev, quality }));
  }, []);

  const setRenderEngine = useCallback((renderEngine: RenderEngineMode) => {
    setProfile((prev) => ({ ...prev, renderEngine }));
  }, []);

  const setCameraView = useCallback((cameraView: CameraViewMode) => {
    setProfile((prev) => ({ ...prev, cameraView }));
  }, []);

  const setSoundEnabled = useCallback((soundEnabled: boolean) => {
    setProfile((prev) => ({ ...prev, soundEnabled }));
  }, []);

  const setDeviceMode = useCallback((deviceMode: DeviceMode) => {
    setProfile((prev) => ({ ...prev, deviceMode }));
  }, []);

  const setLandscapeLocked = useCallback((landscapeLocked: boolean) => {
    setProfile((prev) => ({ ...prev, landscapeLocked }));
  }, []);

  const setFavoriteArena = useCallback((favoriteArena: ArenaId) => {
    setProfile((prev) => ({ ...prev, favoriteArena }));
  }, []);

  const setKeyBindings = useCallback((nextBindings: KeyBindingsConfig) => {
    setProfile((prev) => ({ ...prev, keyBindings: { ...nextBindings } }));
  }, []);

  const resetKeyBindings = useCallback(() => {
    setProfile((prev) => ({ ...prev, keyBindings: { ...DEFAULT_KEY_BINDINGS } }));
  }, []);

  const setHudConfig = useCallback(
    (updater: HudCustomizationConfig | ((prev: HudCustomizationConfig) => HudCustomizationConfig)) => {
      setProfile((prev) => ({
        ...prev,
        hudConfig: typeof updater === 'function' ? updater(prev.hudConfig) : updater,
      }));
    },
    []
  );

  const resetHudConfig = useCallback(() => {
    setProfile((prev) => ({
      ...prev,
      hudConfig: {
        ...DEFAULT_HUD_CONFIG,
        joystickOffset: { ...DEFAULT_HUD_CONFIG.joystickOffset },
        actionsOffset: { ...DEFAULT_HUD_CONFIG.actionsOffset },
        widgets: { ...DEFAULT_HUD_CONFIG.widgets },
      },
    }));
  }, []);

  return {
    profile,
    completeIntro,
    updateAvatar,
    allocateStat,
    unlockOrEquipWeapon,
    upgradeWeapon,
    unlockOrEquipPower,
    unlockNextSkillSlot,
    upgradePower,
    unlockNetworkNode,
    fusePowers,
    unlockOrEquipGear,
    unequipGearSlot,
    buyConsumable,
    consumeBattleItem,
    acceptNpcJob,
    recordResourceGathered,
    completeNpcJob,
    sellSingleResource,
    sellAllResourcesForMarks,
    exchangeGuildMarks,
    recordMatchResult,
    recordRegionDiscovery,
    recordWorldChestOpened,
    recordChunkExplored,
    recordCritLanded,
    recordFusionCast,
    recordSecretBossDefeated,
    recordWorldEventCompleted,
    claimDailyChallenge,
    claimAchievement,
    equipTitle,
    claimQuest,
    claimMapChallenge,
    openChest,
    buyChest,
    setSystemTheme,
    setQuality,
    setRenderEngine,
    setCameraView,
    setSoundEnabled,
    setDeviceMode,
    setLandscapeLocked,
    setFavoriteArena,
    setKeyBindings,
    resetKeyBindings,
    setHudConfig,
    resetHudConfig,
  };
}
