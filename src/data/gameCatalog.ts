import type {
  AchievementDef,
  ArenaDef,
  ArenaId,
  ArenaModifierId,
  AvatarConfig,
  BasePowerId,
  ConsumableDef,
  ConsumableId,
  CraftingRecipeDef,
  CustomSkillDef,
  DailyChallengeDef,
  DailyChallengeProgress,
  GearDef,
  GearId,
  GearSetDef,
  GearSetId,
  GearSlot,
  MapChallengeDef,
  MaterialFinish,
  MonsterArchetype,
  MonsterDef,
  NpcJobDef,
  OverworldNodeDef,
  PowerDef,
  PowerId,
  QuestProgress,
  RivalChampion,
  SceneryPropDef,
  SecretBossDef,
  SkillElement,
  SkillMotionKind,
  SkillNetworkNodeDef,
  SkillRuneDef,
  SkillRuneId,
  TitleDef,
  WarriorRank,
  WeaponDef,
  WeaponId,
  WorldEventZoneDef,
} from '../types/game';
import { BUNDLED_IMAGES } from './bundledAssets';

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  vanguard_sword: {
    id: 'vanguard_sword',
    name: 'نصل الطليعة',
    role: 'melee',
    category: 'سيف طويل · هجومي',
    description: 'سيف متوازن بمدى واسع وضربات قوسية متتالية مثالية للمعارك المفتوحة.',
    damage: 24,
    heavyDamage: 46,
    range: 3.1,
    attackSpeed: 2.2,
    critBonus: 10,
    knockback: 4.5,
    isRanged: false,
    bladeColor: '#DCE4F0',
    hiltColor: '#D99124',
    energyColor: '#F59E0B',
    costGold: 0,
    costGems: 0,
    heavySkillName: 'شطْر الهلال',
  },
  shadow_daggers: {
    id: 'shadow_daggers',
    name: 'خناجر الظل المزدوجة',
    role: 'melee',
    category: 'نصال مزدوجة · هجومي',
    description: 'سلاح مزدوج فائق السرعة بفرصة ضربات حاسمة عالية واندفاع خاطف.',
    damage: 17,
    heavyDamage: 38,
    range: 2.5,
    attackSpeed: 3.5,
    critBonus: 26,
    knockback: 2.5,
    isRanged: false,
    bladeColor: '#A7B4C9',
    hiltColor: '#3B4254',
    energyColor: '#10B981',
    costGold: 320,
    costGems: 0,
    heavySkillName: 'ومضة الشبح',
  },
  storm_hammer: {
    id: 'storm_hammer',
    name: 'مطرقة العاصفة',
    role: 'melee',
    category: 'مطرقة ثقيلة · هجومي',
    description: 'ضربات ثقيلة تحطم دفاع الوحوش وتطلق موجة ارتدادية تدفع الخصوم بعيداً.',
    damage: 36,
    heavyDamage: 68,
    range: 3.0,
    attackSpeed: 1.45,
    critBonus: 12,
    knockback: 8.5,
    isRanged: false,
    bladeColor: '#6C7789',
    hiltColor: '#8B5A2B',
    energyColor: '#F97316',
    costGold: 550,
    costGems: 0,
    heavySkillName: 'زلزال المطرقة',
  },
  dragon_spear: {
    id: 'dragon_spear',
    name: 'رمح التنين القرمزي',
    role: 'melee',
    category: 'رمح حربي · هجومي',
    description: 'مدى طعن استثنائي يخترق صفوف الأعداء مع الحفاظ على مسافة آمنة.',
    damage: 27,
    heavyDamage: 54,
    range: 4.1,
    attackSpeed: 2.0,
    critBonus: 16,
    knockback: 5.5,
    isRanged: false,
    bladeColor: '#E8EDF5',
    hiltColor: '#991B1B',
    energyColor: '#EF4444',
    costGold: 780,
    costGems: 0,
    heavySkillName: 'اندفاع الرمح الخارق',
  },
  solar_bow: {
    id: 'solar_bow',
    name: 'قوس الشمس المصقول',
    role: 'melee',
    category: 'قوس بعيد المدى',
    description: 'يطلق سهام طاقة ثلاثية الأبعاد سريعة مع وابل ثلاثي في الهجمة الثقيلة.',
    damage: 22,
    heavyDamage: 32,
    range: 14.0,
    attackSpeed: 2.1,
    critBonus: 20,
    knockback: 3.0,
    isRanged: true,
    bladeColor: '#E59A24',
    hiltColor: '#5C3D24',
    energyColor: '#FBBF24',
    costGold: 950,
    costGems: 15,
    heavySkillName: 'وابل السهام الشمسية',
  },
  void_staff: {
    id: 'void_staff',
    name: 'صولجان النجم الداكن',
    role: 'magic',
    category: 'عصا سحرية · سحر',
    description: 'يطلق كرات طاقة موجهة نحو الأعداء وتفجير جاذبية واسع النطاق.',
    damage: 25,
    heavyDamage: 58,
    range: 13.0,
    attackSpeed: 1.85,
    critBonus: 15,
    knockback: 5.0,
    isRanged: true,
    bladeColor: '#CBD5E1',
    hiltColor: '#334155',
    energyColor: '#38BDF8',
    costGold: 680,
    costGems: 10,
    heavySkillName: 'انفجار الجاذبية',
  },
  arcane_tome: {
    id: 'arcane_tome',
    name: 'مخطوطة الشعلة الأزلية',
    role: 'magic',
    category: 'كتاب تعاويذ · سحر',
    description: 'يطلق شهباً سحرية مزدوجة من صفحاته العائمة ويفجر حلقة رونية نارية بالمهارة الثقيلة.',
    damage: 24,
    heavyDamage: 62,
    range: 13.5,
    attackSpeed: 2.05,
    critBonus: 18,
    knockback: 4.2,
    isRanged: true,
    bladeColor: '#7C2D12',
    hiltColor: '#F59E0B',
    energyColor: '#FB923C',
    costGold: 520,
    costGems: 0,
    heavySkillName: 'طوفان التعويذة',
  },
  crimson_wand: {
    id: 'crimson_wand',
    name: 'عصا العاصفة القرمزية',
    role: 'magic',
    category: 'عصا برق · سحر',
    description: 'سلاح سحري سريع يطلق طلقات متسلسلة تصعق الوحوش وتخترق الحشود.',
    damage: 21,
    heavyDamage: 52,
    range: 14.5,
    attackSpeed: 2.55,
    critBonus: 22,
    knockback: 3.5,
    isRanged: true,
    bladeColor: '#E11D48',
    hiltColor: '#1E293B',
    energyColor: '#F43F5E',
    costGold: 890,
    costGems: 12,
    heavySkillName: 'رعد العاصفة',
  },
  radiant_scepter: {
    id: 'radiant_scepter',
    name: 'صولجان النور الشافي',
    role: 'support',
    category: 'صولجان مبارك · دعم',
    description: 'سلاح دعم يعالجك بنسبة 6% مع كل ضربة مصيبة، ومهارته الثقيلة تطلق نبضة شفاء وطاقة.',
    damage: 20,
    heavyDamage: 42,
    range: 12.0,
    attackSpeed: 2.1,
    critBonus: 12,
    knockback: 4.5,
    isRanged: true,
    healOnHitPct: 0.06,
    bladeColor: '#FEF08A',
    hiltColor: '#0F766E',
    energyColor: '#10B981',
    costGold: 480,
    costGems: 0,
    heavySkillName: 'موجة الشفاء المبارك',
  },
  astral_censer: {
    id: 'astral_censer',
    name: 'كرة الأثير المقدس',
    role: 'support',
    category: 'جرم دعم · دعم',
    description: 'كرة طاقة تدور حولك وتطلق أشعة موجهة تشحن طاقة المهارات وتمنحك درعاً مؤقتاً عند الهجوم الثقيل.',
    damage: 23,
    heavyDamage: 48,
    range: 13.0,
    attackSpeed: 2.25,
    critBonus: 15,
    knockback: 5.0,
    isRanged: true,
    healOnHitPct: 0.04,
    bladeColor: '#A5F3FC',
    hiltColor: '#0284C7',
    energyColor: '#38BDF8',
    costGold: 840,
    costGems: 10,
    heavySkillName: 'هالة الإمداد الأثيرية',
  },
  bastion_mace: {
    id: 'bastion_mace',
    name: 'ترس الحصن وصولجان الصدّ',
    role: 'defense',
    category: 'سلاح ودرع · دفاع',
    description: 'يمنح +12% تقليل ضرر دائم، ويسحق الأعداء بضربة درع تسبب ذهولاً وارتداداً قوياً.',
    damage: 25,
    heavyDamage: 56,
    range: 3.1,
    attackSpeed: 1.85,
    critBonus: 10,
    knockback: 7.5,
    isRanged: false,
    armorBonus: 0.12,
    bladeColor: '#94A3B8',
    hiltColor: '#1E3A8A',
    energyColor: '#60A5FA',
    costGold: 460,
    costGems: 0,
    heavySkillName: 'صدمة الترس الحديدي',
  },
  aegis_greatshield: {
    id: 'aegis_greatshield',
    name: 'درع الحديد الأبدي العملاق',
    role: 'defense',
    category: 'درع حربي ثقيل · دفاع',
    description: 'يمنح +18% دفاع إضافي ويحول الصدّ إلى ارتداد مدمر مع موجة أرضية دافعة لكل المحيطين.',
    damage: 28,
    heavyDamage: 64,
    range: 3.4,
    attackSpeed: 1.6,
    critBonus: 8,
    knockback: 9.5,
    isRanged: false,
    armorBonus: 0.18,
    bladeColor: '#475569',
    hiltColor: '#D97706',
    energyColor: '#F59E0B',
    costGold: 920,
    costGems: 14,
    heavySkillName: 'حاجز الجبل المنيع',
  },
};

export const WEAPON_LIST: WeaponDef[] = Object.values(WEAPONS);

export const POWERS: Record<BasePowerId, PowerDef> = {
  inferno_nova: {
    id: 'inferno_nova',
    name: 'موجة اللهب',
    role: 'melee',
    tagline: 'انفجار ناري محيطي',
    description: 'تطلق حلقة نار ثلاثية الأبعاد حولك تدفع كل الخصوم وتلحق بهم ضرراً حارقاً.',
    cooldown: 0.85,
    energyCost: 30,
    damage: 54,
    radius: 6.0,
    color: '#F97316',
    element: 'fire',
    motionKind: 'aoe_burst',
    costGold: 0,
    costGems: 0,
  },
  thunder_strike: {
    id: 'thunder_strike',
    name: 'صاعقة السماء',
    role: 'magic',
    tagline: 'برق متسلسل وصعق',
    description: 'تستدعي صواعق ثلاثية الأبعاد تضرب أقرب ثلاثة خصوم وتشل حركتهم مؤقتاً.',
    cooldown: 0.9,
    energyCost: 34,
    damage: 58,
    radius: 9.5,
    color: '#38BDF8',
    element: 'lightning',
    motionKind: 'sky_rain',
    costGold: 0,
    costGems: 0,
  },
  crystal_aegis: {
    id: 'crystal_aegis',
    name: 'درع البلور',
    role: 'defense',
    tagline: 'حماية وارتداد ضرر',
    description: 'يحيط الأفتار بدرع بلوري دوّار يمتص 65% من الضرر لـ 5 ثوانٍ ويعيد شحن الصحة.',
    cooldown: 1.0,
    energyCost: 32,
    damage: 24,
    radius: 3.8,
    color: '#10B981',
    element: 'earth',
    motionKind: 'sanctuary_ward',
    costGold: 340,
    costGems: 0,
    statRequirements: { def: 7, vit: 7 },
  },
  shadow_blink: {
    id: 'shadow_blink',
    name: 'اندفاع الظل',
    role: 'melee',
    tagline: 'اختراق سريع وحرج',
    description: 'تندفع لمسافة بعيدة مخترقاً كل الخصوم في طريقك بضربة قاطعة فورية.',
    cooldown: 0.7,
    energyCost: 26,
    damage: 50,
    radius: 7.0,
    color: '#94A3B8',
    element: 'void',
    motionKind: 'dash_strike',
    costGold: 420,
    costGems: 0,
  },
  frost_vortex: {
    id: 'frost_vortex',
    name: 'زوبعة الجليد',
    role: 'magic',
    tagline: 'تجميد وإبطاء جماعي',
    description: 'إعصار جليدي ثلاثي الأبعاد يجمّد الوحوش والمنافسين ويبطئهم لـ 4 ثوانٍ.',
    cooldown: 0.9,
    energyCost: 34,
    damage: 46,
    radius: 6.8,
    color: '#60A5FA',
    element: 'frost',
    motionKind: 'aoe_burst',
    costGold: 560,
    costGems: 8,
    statRequirements: { int: 8, dex: 7 },
    requiredLevel: 2,
  },
  titan_overdrive: {
    id: 'titan_overdrive',
    name: 'غضب العملاق',
    role: 'melee',
    tagline: 'تضخم جسدي وقوة فائقة',
    description: 'يتضخم أفتارك بهالة ذهبية لـ 7 ثوانٍ مع +55% ضرر واستعادة صحة مع كل ضربة.',
    cooldown: 1.1,
    energyCost: 42,
    damage: 34,
    radius: 4.5,
    color: '#E59A24',
    element: 'earth',
    motionKind: 'sanctuary_ward',
    costGold: 780,
    costGems: 15,
    statRequirements: { str: 11, vit: 9 },
    requiredLevel: 3,
  },
  meteor_rain: {
    id: 'meteor_rain',
    name: 'مطر النيازك',
    role: 'magic',
    tagline: 'قصف سحري واسع النطاق',
    description: 'يسقط 4 نيازك متفجرة متتالية على الخصوم المحيطين بضرر ناري مدمر وموجات صدمة.',
    cooldown: 1.05,
    energyCost: 38,
    damage: 66,
    radius: 8.5,
    color: '#FB7185',
    element: 'fire',
    motionKind: 'sky_rain',
    costGold: 740,
    costGems: 12,
    statRequirements: { int: 11, spr: 8 },
    requiredLevel: 3,
  },
  holy_sanctuary: {
    id: 'holy_sanctuary',
    name: 'ملاذ الضوء الشافي',
    role: 'support',
    tagline: 'دعم واستشفاء + طاقة',
    description: 'يشفي 34% من الصحة فوراً ويدفع الأعداء للخلف مع منحك سرعة وشحن طاقة إضافي.',
    cooldown: 0.95,
    energyCost: 30,
    damage: 28,
    radius: 5.5,
    color: '#34D399',
    element: 'light',
    motionKind: 'sanctuary_ward',
    costGold: 450,
    costGems: 0,
  },
  iron_fortress: {
    id: 'iron_fortress',
    name: 'حصن الحديد الأبدي',
    role: 'defense',
    tagline: 'صمود مطلق وانعكاس',
    description: 'يفعّل درع الحصن مع مناعة قصيرة ضد الضربات وصدمة أرضية تقذف كل خصم قريب.',
    cooldown: 1.0,
    energyCost: 34,
    damage: 42,
    radius: 5.2,
    color: '#60A5FA',
    element: 'earth',
    motionKind: 'sanctuary_ward',
    costGold: 520,
    costGems: 0,
    statRequirements: { def: 10, vit: 8 },
    requiredLevel: 2,
  },
  arcane_beam: {
    id: 'arcane_beam',
    name: 'شعاع الهاوية السحري',
    role: 'magic',
    tagline: 'قفزة وطاقة مركزة',
    description: 'يطلق وابلاً مركزاً من الكرات السحرية الموجهة التي تصيب الخصوم من مسافات بعيدة.',
    cooldown: 0.85,
    energyCost: 32,
    damage: 60,
    radius: 12.0,
    color: '#A78BFA',
    element: 'void',
    motionKind: 'beam',
    costGold: 620,
    costGems: 8,
    statRequirements: { int: 9, spr: 8 },
    requiredLevel: 2,
  },
  mind_overclock: {
    id: 'mind_overclock',
    name: 'تسريع التفكير الذهني',
    role: 'magic',
    tagline: 'إدراك خارق يبطئ العالم 32%',
    description: 'يرفع تركيزك الذهني لـ 4 ثوانٍ فيتباطأ الأعداء والمقذوفات إلى 32% وتزداد سرعتك، بحد أقصى مرتين لكل موجة (تبريد 22ث).',
    cooldown: 22.0,
    energyCost: 65,
    damage: 28,
    radius: 13.0,
    color: '#22D3EE',
    secondaryColor: '#A855F7',
    element: 'lightning',
    motionKind: 'sanctuary_ward',
    costGold: 1350,
    costGems: 28,
    statRequirements: { int: 12, spr: 10 },
    requiredLevel: 4,
    maxUsesPerWave: 2,
  },
  fusion_plasma_tempest: {
    id: 'fusion_plasma_tempest',
    name: 'عاصفة البلازما المتفجرة',
    role: 'magic',
    tagline: 'مهارة مدمجة: لهب + صاعقة',
    description: 'تدمج موجة اللهب مع صاعقة السماء لإطلاق انفجار بلازمي مزدوج وصواعق متسلسلة تصعق الأعداء.',
    cooldown: 1.0,
    energyCost: 42,
    damage: 94,
    radius: 8.5,
    color: '#FB923C',
    secondaryColor: '#38BDF8',
    element: 'fire',
    secondaryElement: 'lightning',
    motionKind: 'aoe_burst',
    costGold: 0,
    costGems: 0,
    isFusion: true,
    fusionPair: ['inferno_nova', 'thunder_strike'],
    fusionCostGold: 680,
    fusionCostMarks: 16,
    statRequirements: { int: 10, str: 8 },
    requiredLevel: 3,
  },
  fusion_eternal_glacier: {
    id: 'fusion_eternal_glacier',
    name: 'هالة الخلود المتجمدة',
    role: 'support',
    tagline: 'مهارة مدمجة: صقيع + ملاذ الضوء',
    description: 'تشفي 42% من صحتك وتمنحك درعاً فورياً مع زوبعة جليدية تجمّد الخصوم المحيطين 5 ثوانٍ.',
    cooldown: 1.1,
    energyCost: 38,
    damage: 68,
    radius: 7.5,
    color: '#2DD4BF',
    secondaryColor: '#60A5FA',
    element: 'frost',
    secondaryElement: 'light',
    motionKind: 'sanctuary_ward',
    costGold: 0,
    costGems: 0,
    isFusion: true,
    fusionPair: ['frost_vortex', 'holy_sanctuary'],
    fusionCostGold: 740,
    fusionCostMarks: 18,
    statRequirements: { spr: 10, vit: 9 },
    requiredLevel: 3,
  },
  fusion_void_eclipse: {
    id: 'fusion_void_eclipse',
    name: 'شقّ الأبعاد الصاعق',
    role: 'melee',
    tagline: 'مهارة مدمجة: اندفاع الظل + شعاع الهاوية',
    description: 'اندفاعة فائقة السرعة عبر الأبعاد تطلق معها رشقة أثيرية موجهة تضاعف الضربات الحرجة.',
    cooldown: 0.85,
    energyCost: 36,
    damage: 88,
    radius: 9.5,
    color: '#C084FC',
    secondaryColor: '#F0ABFC',
    element: 'void',
    secondaryElement: 'void',
    motionKind: 'dash_strike',
    costGold: 0,
    costGems: 0,
    isFusion: true,
    fusionPair: ['shadow_blink', 'arcane_beam'],
    fusionCostGold: 820,
    fusionCostMarks: 22,
    statRequirements: { agi: 11, dex: 10 },
    requiredLevel: 4,
  },
  fusion_dragon_bastion: {
    id: 'fusion_dragon_bastion',
    name: 'قصف التنين المدرّع',
    role: 'defense',
    tagline: 'مهارة مدمجة: مطر النيازك + حصن الحديد',
    description: 'تفعّل درعاً منيعاً مع هبوط 5 نيازك تنينية ساحقة تحولك لقلعة متحركة.',
    cooldown: 1.15,
    energyCost: 46,
    damage: 98,
    radius: 9.2,
    color: '#F43F5E',
    secondaryColor: '#F59E0B',
    element: 'fire',
    secondaryElement: 'earth',
    motionKind: 'sky_rain',
    costGold: 0,
    costGems: 0,
    isFusion: true,
    fusionPair: ['meteor_rain', 'iron_fortress'],
    fusionCostGold: 950,
    fusionCostMarks: 26,
    statRequirements: { def: 12, int: 10 },
    requiredLevel: 4,
  },
};

export const POWER_LIST: PowerDef[] = Object.values(POWERS);
export const CORE_POWER_LIST: PowerDef[] = POWER_LIST.filter((p) => !p.isFusion);
export const FUSION_POWER_LIST: PowerDef[] = POWER_LIST.filter((p) => p.isFusion);

export function resolvePowerDef(id: PowerId, customSkills: CustomSkillDef[] = []): PowerDef {
  if (id in POWERS) {
    return POWERS[id as BasePowerId];
  }
  const found = customSkills.find((s) => s.id === id);
  if (found) return found;
  return POWERS.inferno_nova;
}

const STAT_SHORT_AR: Record<StatKey, string> = {
  str: 'قوة',
  agi: 'سرعة',
  vit: 'حيوية',
  int: 'ذكاء',
  def: 'دفاع',
  dex: 'دقة',
  spr: 'روح',
  lck: 'حظ',
};

export function checkPowerRequirements(
  power: PowerDef,
  stats: AvatarStats,
  playerLevel: number
): { met: boolean; missingLabels: string[]; allLabels: string[] } {
  const missingLabels: string[] = [];
  const allLabels: string[] = [];
  if (power.requiredLevel && power.requiredLevel > 1) {
    const lbl = `مستوى ${power.requiredLevel}`;
    allLabels.push(lbl);
    if (playerLevel < power.requiredLevel) {
      missingLabels.push(`${lbl} (حالي ${playerLevel})`);
    }
  }
  if (power.statRequirements) {
    (Object.keys(power.statRequirements) as StatKey[]).forEach((k) => {
      const req = power.statRequirements![k] || 0;
      if (req <= 0) return;
      const lbl = `${STAT_SHORT_AR[k]} ${req}`;
      allLabels.push(lbl);
      if ((stats[k] || 1) < req) {
        missingLabels.push(`${lbl} (حالي ${stats[k] || 1})`);
      }
    });
  }
  return { met: missingLabels.length === 0, missingLabels, allLabels };
}

export const RANK_META: Record<
  WarriorRank,
  { rank: WarriorRank; label: string; color: string; bg: string; border: string; perkDesc: string }
> = {
  E: { rank: 'E', label: 'رتبة E · مبتدئ', color: '#94A3B8', bg: 'rgba(148,163,184,0.14)', border: 'rgba(148,163,184,0.35)', perkDesc: 'كفاءة أساسية قياسية' },
  D: { rank: 'D', label: 'رتبة D · مجنّد', color: '#34D399', bg: 'rgba(52,211,153,0.14)', border: 'rgba(52,211,153,0.35)', perkDesc: '+6% ضرر وإتقان' },
  C: { rank: 'C', label: 'رتبة C · مبارز', color: '#38BDF8', bg: 'rgba(56,189,248,0.14)', border: 'rgba(56,189,248,0.38)', perkDesc: '+12% ضرر و+4% مدى' },
  B: { rank: 'B', label: 'رتبة B · فارس', color: '#A78BFA', bg: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.4)', perkDesc: '+18% ضرر واختراق دفاع' },
  A: { rank: 'A', label: 'رتبة A · نخبة', color: '#F59E0B', bg: 'rgba(245,158,11,0.16)', border: 'rgba(245,158,11,0.45)', perkDesc: '+25% ضرر وخفض تكلفة' },
  S: { rank: 'S', label: 'رتبة S · أسطوري', color: '#FB7185', bg: 'rgba(251,113,133,0.18)', border: 'rgba(251,113,133,0.5)', perkDesc: '+34% ضرر ورنين عنصري' },
  SS: { rank: 'SS', label: 'رتبة SS · خارق', color: '#FDE047', bg: 'rgba(253,224,71,0.2)', border: 'rgba(253,224,71,0.6)', perkDesc: '+45% سيادة مطلقة' },
};

const RANK_LADDER: WarriorRank[] = ['E', 'D', 'C', 'B', 'A', 'S', 'SS'];

export function getWeaponRank(weaponId: WeaponId, level = 1): WarriorRank {
  const def = WEAPONS[weaponId];
  const tierOffset = def && (def.costGems >= 12 || def.costGold >= 900) ? 2 : def && def.costGold >= 450 ? 1 : 0;
  const idx = Math.min(RANK_LADDER.length - 1, Math.max(0, level - 1 + tierOffset));
  return RANK_LADDER[idx];
}

export function getPowerRank(powerId: PowerId, level = 1, customSkills: CustomSkillDef[] = []): WarriorRank {
  const def = resolvePowerDef(powerId, customSkills);
  const fusionOffset = def.isFusion || def.isCustom ? 2 : def.costGems > 0 ? 1 : 0;
  const idx = Math.min(RANK_LADDER.length - 1, Math.max(0, level - 1 + fusionOffset));
  return RANK_LADDER[idx];
}

export function getGearRank(gearId: GearId, level = 1): WarriorRank {
  const def = GEAR_ITEMS[gearId];
  const tierOffset = def && def.costGems > 0 ? 1 : 0;
  const idx = Math.min(RANK_LADDER.length - 1, Math.max(0, level - 1 + tierOffset));
  return RANK_LADDER[idx];
}

export const ELEMENT_META: Record<SkillElement, { label: string; color: string; statusLabel: string }> = {
  fire: { label: 'لهب حارق', color: '#F97316', statusLabel: 'حرق مستمر' },
  frost: { label: 'صقيع متجمد', color: '#60A5FA', statusLabel: 'تجميد وإبطاء' },
  lightning: { label: 'صاعقة برق', color: '#38BDF8', statusLabel: 'صعق وشلل' },
  void: { label: 'هاوية وظل', color: '#C084FC', statusLabel: 'اختراق وحرجة' },
  light: { label: 'نور شافٍ', color: '#34D399', statusLabel: 'تطهير واستشفاء' },
  earth: { label: 'زلزال وصلابة', color: '#F59E0B', statusLabel: 'ارتجاج ودرع' },
};

export const SYNTHESIS_GEOMETRY_META: Record<SkillMotionKind, { label: string; desc: string }> = {
  aoe_burst: { label: 'انفجار حلقي محيطي', desc: 'موجة صدمة دائرية تدفع وتضرب كل خصم حول البطل' },
  dash_strike: { label: 'اندفاع قاطع خاطف', desc: 'اندفاعة فائقة تخترق الصفوف مع حصانة لحظية' },
  sky_rain: { label: 'قصف سماوي متتابع', desc: 'سقوط نيازك وصواعق من السماء على عدة أهداف' },
  beam: { label: 'وابل طاقة موجه', desc: 'إطلاق مقذوفات مركزة تتعقب الأعداء من بعيد' },
  sanctuary_ward: { label: 'هالة حماية ودعم', desc: 'تحصين واستعادة صحة أو مانا مع دفع الخصوم' },
};

export function synthesizeCustomSkill(
  skillA: PowerDef,
  skillB: PowerDef,
  customName: string
): CustomSkillDef {
  const motionKind: SkillMotionKind = skillA.motionKind || 'aoe_burst';
  const element: SkillElement = skillB.element || 'fire';
  const secondaryElement: SkillElement = skillA.element || 'lightning';
  const trimmedName = customName.trim().slice(0, 32) || `${skillA.name.split(' ')[0]} ${ELEMENT_META[element].label}`;
  const avgDamage = Math.round((skillA.damage + skillB.damage) * 0.78);
  const maxRadius = Number(Math.max(skillA.radius, skillB.radius, 6.2).toFixed(1));
  const avgMana = Math.max(24, Math.min(54, Math.round((skillA.energyCost + skillB.energyCost) * 0.56)));
  const id = `custom_${skillA.id}_${skillB.id}_${Date.now().toString(36).slice(-4)}`;

  return {
    id,
    name: trimmedName,
    role: skillA.role === 'support' || skillB.role === 'support' ? 'support' : skillA.role,
    tagline: `مهارة مدمجة: ${SYNTHESIS_GEOMETRY_META[motionKind].label} · ${ELEMENT_META[element].label}`,
    description: `دمج فريد يجمع حركة «${skillA.name}» مع عنصر «${ELEMENT_META[element].label}» من «${skillB.name}».`,
    cooldown: 0.95,
    energyCost: avgMana,
    damage: avgDamage,
    radius: maxRadius,
    color: skillB.color || ELEMENT_META[element].color,
    secondaryColor: skillA.color || '#FDE047',
    element,
    secondaryElement,
    motionKind,
    costGold: 0,
    costGems: 0,
    isFusion: true,
    isCustom: true,
    basePair: [skillA.id, skillB.id],
    fusionCostGold: 520,
    fusionCostMarks: 12,
    createdAt: Date.now(),
  };
}

export const SKILL_RUNES: Record<SkillRuneId, SkillRuneDef> = {
  standard: {
    id: 'standard',
    name: 'رونة متوازنة',
    shortDesc: 'الأداء القياسي للمهارة بدون تعديل',
    color: '#94A3B8',
    costGold: 0,
    costMarks: 0,
  },
  expand: {
    id: 'expand',
    name: 'رونة الاتساع',
    shortDesc: '+25% مدى التأثير · +15% مانا',
    color: '#38BDF8',
    costGold: 260,
    costMarks: 6,
  },
  siphon: {
    id: 'siphon',
    name: 'رونة الامتصاص',
    shortDesc: 'تعيد +12% صحة و+10 ستامينا عند الإصابة',
    color: '#10B981',
    costGold: 340,
    costMarks: 9,
  },
  haste: {
    id: 'haste',
    name: 'رونة التدفق',
    shortDesc: '-22% تكلفة مانا و-25% تأخير الإلقاء',
    color: '#F59E0B',
    costGold: 360,
    costMarks: 10,
  },
};

export const SKILL_RUNE_LIST: SkillRuneDef[] = Object.values(SKILL_RUNES);

export const SKILL_SLOT_UNLOCK_COSTS: Record<
  2 | 3 | 4,
  { gold: number; guildMarks: number; gems: number; keyHint: string; label: string }
> = {
  2: { gold: 450, guildMarks: 10, gems: 15, keyHint: '[R]', label: 'الخانة الثانية [R]' },
  3: { gold: 1100, guildMarks: 25, gems: 35, keyHint: '[Z]', label: 'الخانة الثالثة [Z]' },
  4: { gold: 2400, guildMarks: 50, gems: 70, keyHint: '[X]', label: 'الخانة الرابعة [X]' },
};

export const SKILL_NETWORK_NODES: SkillNetworkNodeDef[] = [
  {
    id: 'node_core_awakening',
    title: 'نواة يقظة النظام',
    description: 'نقطة الأصل في شبكة المهارات؛ ترفع كفاءة الضرر ونطاق كل المهارات تلقائياً.',
    branch: 'core',
    x: 50,
    y: 50,
    costGold: 0,
    costMarks: 0,
    bonusLabel: '+5% ضرر مهارات',
    effects: { dmgMult: 0.05 },
  },
  {
    id: 'node_fury_1',
    title: 'شعلة البطش I',
    description: 'تصقل قوة الانفجار والضربات السحرية والقتالية بنسبة 12%.',
    branch: 'fury',
    x: 22,
    y: 26,
    requires: 'node_core_awakening',
    costGold: 220,
    costMarks: 6,
    bonusLabel: '+12% ضرر مهارات',
    effects: { dmgMult: 0.12 },
  },
  {
    id: 'node_fury_2',
    title: 'غضب السيادة II',
    description: 'يرفع ضرر جميع المهارات النشطة والمدمجة بنسبة 18% إضافية.',
    branch: 'fury',
    x: 12,
    y: 12,
    requires: 'node_fury_1',
    costGold: 520,
    costMarks: 14,
    bonusLabel: '+18% ضرر مهارات',
    effects: { dmgMult: 0.18 },
  },
  {
    id: 'node_haste_1',
    title: 'تدفق الزمن I',
    description: 'يقلل زمن التبريد والانتظار لجميع المهارات بنسبة 10%.',
    branch: 'haste',
    x: 78,
    y: 26,
    requires: 'node_core_awakening',
    costGold: 220,
    costMarks: 6,
    bonusLabel: '-10% وقت تبريد',
    effects: { cdrMult: 0.1 },
  },
  {
    id: 'node_haste_2',
    title: 'سرعة البرق II',
    description: 'يختصر تبريد المهارات بنسبة 14% إضافية لاستمرارية القتال.',
    branch: 'haste',
    x: 88,
    y: 12,
    requires: 'node_haste_1',
    costGold: 540,
    costMarks: 15,
    bonusLabel: '-14% وقت تبريد',
    effects: { cdrMult: 0.14 },
  },
  {
    id: 'node_ether_1',
    title: 'ينبوع الأثير I',
    description: 'يزيد الحد الأقصى لطاقة البطل بمقدار +25 نقطة طاقة.',
    branch: 'ether',
    x: 22,
    y: 74,
    requires: 'node_core_awakening',
    costGold: 240,
    costMarks: 7,
    bonusLabel: '+25 طاقة قصوى',
    effects: { bonusEnergy: 25 },
  },
  {
    id: 'node_ether_2',
    title: 'كفاءة البلورات II',
    description: 'يخفض استهلاك الطاقة لكل المهارات بنسبة 18%.',
    branch: 'ether',
    x: 12,
    y: 88,
    requires: 'node_ether_1',
    costGold: 560,
    costMarks: 16,
    bonusLabel: '-18% استهلاك طاقة',
    effects: { energyCostMult: 0.18 },
  },
  {
    id: 'node_fusion_1',
    title: 'رنين المهارات I',
    description: 'يوسّع نطاق تأثير جميع المهارات بنسبة 16%.',
    branch: 'fusion',
    x: 78,
    y: 74,
    requires: 'node_core_awakening',
    costGold: 260,
    costMarks: 8,
    bonusLabel: '+16% مدى التأثير',
    effects: { radiusMult: 0.16 },
  },
  {
    id: 'node_fusion_master',
    title: 'سيادة الدمج الأسطورية II',
    description: 'يرفع قوة المهارات المدمجة بنسبة +26% ويمنح +10% ضرر عام.',
    branch: 'fusion',
    x: 88,
    y: 88,
    requires: 'node_fusion_1',
    costGold: 720,
    costMarks: 22,
    bonusLabel: '+26% قوة الدمج',
    effects: { fusionMult: 0.26, dmgMult: 0.1 },
  },
];

export function computeSkillNetworkBonuses(unlockedNodeIds: string[] = ['node_core_awakening']) {
  let dmgMult = 1;
  let cdrMult = 0;
  let radiusMult = 1;
  let energyCostMult = 1;
  let bonusEnergy = 0;
  let fusionMult = 1;

  for (const node of SKILL_NETWORK_NODES) {
    if (!unlockedNodeIds.includes(node.id)) continue;
    if (node.effects.dmgMult) dmgMult += node.effects.dmgMult;
    if (node.effects.cdrMult) cdrMult += node.effects.cdrMult;
    if (node.effects.radiusMult) radiusMult += node.effects.radiusMult;
    if (node.effects.energyCostMult) energyCostMult -= node.effects.energyCostMult;
    if (node.effects.bonusEnergy) bonusEnergy += node.effects.bonusEnergy;
    if (node.effects.fusionMult) fusionMult += node.effects.fusionMult;
  }

  return {
    dmgMult: Number(dmgMult.toFixed(2)),
    cdrMult: Math.min(0.45, Number(cdrMult.toFixed(2))),
    radiusMult: Number(radiusMult.toFixed(2)),
    energyCostMult: Math.max(0.5, Number(energyCostMult.toFixed(2))),
    bonusEnergy,
    fusionMult: Number(fusionMult.toFixed(2)),
  };
}

export const QUICK_CHAT_PHRASES: string[] = [
  'هيا نبدأ القتال!',
  'تجمعوا عند البوابة الآن!',
  'انتبهوا، الزعيم يقترب!',
  'أحتاج إلى دعم وشفاء!',
  'كفو! ضربة رائعة!',
  'من يريد مبارزة 1 ضد 1؟',
];

export const GEAR_SETS: Record<GearSetId, GearSetDef> = {
  dragon: {
    id: 'dragon',
    name: 'طقم التنين الفتّاك',
    accentColor: '#EF4444',
    bonus2Label: '+15% ضرر الهجوم والمهارات',
    bonus3Label: '+18% حاسمة + 5% امتصاص صحة',
  },
  bastion: {
    id: 'bastion',
    name: 'طقم الحصن المنيع',
    accentColor: '#60A5FA',
    bonus2Label: '+90 صحة و+8% درع',
    bonus3Label: 'نافذة صدّ مثالي +0.12ث +18% تجديد ستامينا',
  },
  arcane: {
    id: 'arcane',
    name: 'طقم الأثير والرياح',
    accentColor: '#38BDF8',
    bonus2Label: '+25 مانا قصوى و+20% تعافي مانا',
    bonus3Label: '+16% مدى المهارات و+10% سرعة حركة',
  },
  wind: {
    id: 'wind',
    name: 'طقم الريح الخاطف',
    accentColor: '#2DD4BF',
    bonus2Label: '+12% سرعة ومراوغة',
    bonus3Label: '+20% تعافي ستامينا',
  },
};

export const GEAR_ITEMS: Record<GearId, GearDef> = {
  ring_vitality: {
    id: 'ring_vitality',
    name: 'خاتم الحياة المتجددة',
    slot: 'relic',
    slotLabel: 'تميمة / خاتم',
    setId: 'bastion',
    description: 'يزيد أقصى صحة +55 ويعزز تجديد الطاقة والستامينا في المعارك الطويلة.',
    hpBonus: 55,
    dmgBonus: 0,
    speedBonus: 0,
    armorBonus: 0.02,
    critBonus: 0,
    pwrScaleBonus: 0.05,
    costGold: 260,
    costGems: 0,
    accentColor: '#10B981',
  },
  amulet_arcane: {
    id: 'amulet_arcane',
    name: 'قلادة الحكمة السحرية',
    slot: 'relic',
    slotLabel: 'تميمة / خاتم',
    setId: 'arcane',
    description: 'ترفع قوة المهارات والقدرات الخارقة +20% وتزيد الطاقة الحرجة.',
    hpBonus: 15,
    dmgBonus: 4,
    speedBonus: 0,
    armorBonus: 0,
    critBonus: 5,
    pwrScaleBonus: 0.2,
    costGold: 420,
    costGems: 0,
    accentColor: '#38BDF8',
  },
  ring_crit: {
    id: 'ring_crit',
    name: 'خاتم عين الصقر',
    slot: 'relic',
    slotLabel: 'تميمة / خاتم',
    setId: 'dragon',
    description: 'يمنح +12% فرصة ضربة حاسمة و+7 ضرر هجومي مباشر.',
    hpBonus: 0,
    dmgBonus: 7,
    speedBonus: 0.25,
    armorBonus: 0,
    critBonus: 12,
    pwrScaleBonus: 0,
    costGold: 560,
    costGems: 5,
    accentColor: '#F59E0B',
  },
  core_bastion: {
    id: 'core_bastion',
    name: 'نواة الحصن المدرعة',
    slot: 'armor_core',
    slotLabel: 'نواة الدرع',
    setId: 'bastion',
    description: 'تضيف +8% تقليل ضرر و+45 صحة لمواجهة الزعماء.',
    hpBonus: 45,
    dmgBonus: 0,
    speedBonus: 0,
    armorBonus: 0.08,
    critBonus: 0,
    pwrScaleBonus: 0,
    costGold: 310,
    costGems: 0,
    accentColor: '#60A5FA',
  },
  core_dragon: {
    id: 'core_dragon',
    name: 'حراشف التنين الملتهب',
    slot: 'armor_core',
    slotLabel: 'نواة الدرع',
    setId: 'dragon',
    description: 'تدمج الصلابة بالهجومية: +60 صحة، +8 ضرر، و+5% درع.',
    hpBonus: 60,
    dmgBonus: 8,
    speedBonus: 0,
    armorBonus: 0.05,
    critBonus: 4,
    pwrScaleBonus: 0.08,
    costGold: 640,
    costGems: 8,
    accentColor: '#EF4444',
  },
  core_radiant: {
    id: 'core_radiant',
    name: 'وشاح الأثير المبارك',
    slot: 'armor_core',
    slotLabel: 'نواة الدرع',
    setId: 'arcane',
    description: 'يوازن الدفاع (+6%) مع تعزيز قوة الشفاء والسحر (+15%).',
    hpBonus: 35,
    dmgBonus: 3,
    speedBonus: 0.2,
    armorBonus: 0.06,
    critBonus: 0,
    pwrScaleBonus: 0.15,
    costGold: 490,
    costGems: 0,
    accentColor: '#34D399',
  },
  boots_wind: {
    id: 'boots_wind',
    name: 'خفّ الريح الخاطف',
    slot: 'boots',
    slotLabel: 'حذاء وقفاز قتالي',
    setId: 'arcane',
    description: 'يزيد سرعة الحركة +1.1 والضربة الحاسمة +6% للمناورة حول الوحوش.',
    hpBonus: 0,
    dmgBonus: 2,
    speedBonus: 1.1,
    armorBonus: 0,
    critBonus: 6,
    pwrScaleBonus: 0,
    costGold: 290,
    costGems: 0,
    accentColor: '#38BDF8',
  },
  gauntlet_fury: {
    id: 'gauntlet_fury',
    name: 'قفاز القبضة الذهبية',
    slot: 'boots',
    slotLabel: 'حذاء وقفاز قتالي',
    setId: 'dragon',
    description: 'يرفع ضرر السلاح الأساسي +11 ويزيد سرعة الحركة +0.4.',
    hpBonus: 15,
    dmgBonus: 11,
    speedBonus: 0.4,
    armorBonus: 0.02,
    critBonus: 5,
    pwrScaleBonus: 0,
    costGold: 540,
    costGems: 6,
    accentColor: '#F59E0B',
  },
  greaves_titan: {
    id: 'greaves_titan',
    name: 'ساقية العمالقة الثقيلة',
    slot: 'boots',
    slotLabel: 'حذاء وقفاز قتالي',
    setId: 'bastion',
    description: 'تمنح +80 صحة و+7% درع صلب لثبات أسطوري داخل الساحة.',
    hpBonus: 80,
    dmgBonus: 4,
    speedBonus: 0.2,
    armorBonus: 0.07,
    critBonus: 0,
    pwrScaleBonus: 0,
    costGold: 620,
    costGems: 6,
    accentColor: '#94A3B8',
  },
};

export const GEAR_LIST: GearDef[] = Object.values(GEAR_ITEMS);

export const CONSUMABLES: Record<ConsumableId, ConsumableDef> = {
  elixir_heal: {
    id: 'elixir_heal',
    name: 'جرعة الشفاء الملكية',
    description: 'تستعيد فوراً 40% من صحتك القصوى أثناء القتال.',
    costGold: 75,
    color: '#10B981',
  },
  scroll_energy: {
    id: 'scroll_energy',
    name: 'لفيفة الستامينا والمانا',
    description: 'تملأ شريط الستامينا والمانا 100% فوراً وتُزيل الإجهاد.',
    costGold: 85,
    color: '#38BDF8',
  },
  tonic_fury: {
    id: 'tonic_fury',
    name: 'إكسير غضب المعركة',
    description: 'يفعّل هالة التضخم (+55% ضرر وسرعة) لمدة 6.5 ثوانٍ.',
    costGold: 110,
    color: '#F59E0B',
  },
  stun_bomb: {
    id: 'stun_bomb',
    name: 'قنبلة الصعق التكتيكية',
    description: 'انفجار صاعق محيطي يشل الأعداء المحيطين 2.4 ثانية ويلحق ضرراً كهربائياً.',
    costGold: 120,
    color: '#38BDF8',
  },
  healing_ward: {
    id: 'healing_ward',
    name: 'شمعة التجديد المقدسة',
    description: 'تزرع هالة شفاء أرضية تدوم 6 ثوانٍ وتعالجك تدريجياً داخل نطاقها.',
    costGold: 135,
    color: '#34D399',
  },
  loot_elixir: {
    id: 'loot_elixir',
    name: 'إكسير الكنز والحظ',
    description: 'يرفع غنائم الذهب والخبرة بنسبة +35% طوال المعركة الحالية.',
    costGold: 160,
    color: '#FDE047',
  },
  treasure_compass: {
    id: 'treasure_compass',
    name: 'بوصلة الكنوز والأحداث',
    description: 'تكشف اتجاه أقرب صندوق أو حدث في إيثيريا وتمنح دفعة سرعة لحظية.',
    costGold: 95,
    color: '#A78BFA',
  },
};

export const CONSUMABLE_LIST: ConsumableDef[] = Object.values(CONSUMABLES);

export const CRAFTING_RECIPES: CraftingRecipeDef[] = [
  {
    id: 'craft_sharpening_stone',
    name: 'حجر صقل النصل',
    description: 'يموّل ترقية واحدة لأي سلاح أو سامان مجاناً دون دفع ذهب.',
    resultKind: 'sharpening_stone',
    resultQty: 1,
    costGold: 120,
    costResources: { ore: 3, crystal: 1 },
    color: '#E6B85C',
  },
  {
    id: 'craft_elixir_heal',
    name: 'جرعة شفاء ملكية (×2)',
    description: 'استخلاص أعشاب القارة لإنتاج جرعتي استشفاء سريع.',
    resultKind: 'consumable',
    resultConsumableId: 'elixir_heal',
    resultQty: 2,
    costGold: 45,
    costResources: { herb: 3 },
    color: '#10B981',
  },
  {
    id: 'craft_stun_bomb',
    name: 'قنبلة صعق تكتيكية (×2)',
    description: 'شحن بلورات البرق مع خام المعادن لصناعة قنبلتي صعق.',
    resultKind: 'consumable',
    resultConsumableId: 'stun_bomb',
    resultQty: 2,
    costGold: 75,
    costResources: { ore: 2, crystal: 2 },
    color: '#38BDF8',
  },
  {
    id: 'craft_healing_ward',
    name: 'شمعة تجديد مقدسة (×2)',
    description: 'مزيج الأعشاب والبلورات لإنتاج هالتي استشفاء ميدانية.',
    resultKind: 'consumable',
    resultConsumableId: 'healing_ward',
    resultQty: 2,
    costGold: 85,
    costResources: { herb: 2, crystal: 2 },
    color: '#34D399',
  },
  {
    id: 'craft_loot_elixir',
    name: 'إكسير الكنز والحظ (×1)',
    description: 'جرعة نادرة ترفع عوائد الغنائم في الساحات والغارات.',
    resultKind: 'consumable',
    resultConsumableId: 'loot_elixir',
    resultQty: 1,
    costGold: 90,
    costResources: { herb: 2, ore: 1, crystal: 2 },
    color: '#FDE047',
  },
];

export const ARENA_MODIFIERS: {
  id: ArenaModifierId;
  name: string;
  desc: string;
  rewardBonusPct: number;
  color: string;
}[] = [
  {
    id: 'frenzy',
    name: 'هيجان الوحوش',
    desc: 'الوحوش أسرع +22% وأشرس · +45% غنائم إضافية',
    rewardBonusPct: 45,
    color: '#F97316',
  },
  {
    id: 'no_potions',
    name: 'تحدي بلا جرعات',
    desc: 'ممنوع استخدام الجرعات أثناء المعركة · +55% غنائم',
    rewardBonusPct: 55,
    color: '#EF4444',
  },
  {
    id: 'elite_swarm',
    name: 'حشد النخبة',
    desc: '+45% صحة للوحوش وظهور إضافي · +65% غنائم',
    rewardBonusPct: 65,
    color: '#A855F7',
  },
  {
    id: 'glass_cannon',
    name: 'المدفع الزجاجي',
    desc: 'ضرر الجميع ×1.85 (معارك خاطفة) · +85% غنائم',
    rewardBonusPct: 85,
    color: '#FDE047',
  },
];

export const MATERIAL_FINISH_OPTIONS: { id: MaterialFinish; label: string; desc: string }[] = [
  { id: 'matte', label: 'مطفي حربي', desc: 'درع عملي بدون لمعان' },
  { id: 'metallic', label: 'فولاذ مصقول', desc: 'انعكاس معدني فاخر' },
  { id: 'runic', label: 'أثيري روني', desc: 'توهّج سحري خفيف على الحواف' },
];

export const SLASH_COLOR_OPTIONS: { label: string; color: string }[] = [
  { label: 'لون السلاح التلقائي', color: '' },
  { label: 'ذهبي ملكي', color: '#FDE047' },
  { label: 'أزرق برق', color: '#38BDF8' },
  { label: 'قرمزي ناري', color: '#FB7185' },
  { label: 'أرجواني هاوية', color: '#C084FC' },
  { label: 'زمردي أثيري', color: '#34D399' },
];

export const ARENAS: Record<ArenaId, ArenaDef & { id: ArenaId }> = {
  obsidian_citadel: {
    id: 'obsidian_citadel',
    name: 'قلعة الغسق الحجرية',
    subtitle: 'مدرج ملكي عملاق بقطر 96م ومنصات عرش مرتفعة وبوابات نصر',
    description:
      'خريطة قتالية موسّعة بقطر 96م تضم منصة عرش مركزية (+12% ضرر)، ثلاث شرفات حصن، حلقة تسارع، ومحرابي دعم.',
    imagePath: BUNDLED_IMAGES.arenaObsidian,
    radius: 48.0,
    skyTop: '#080D1A',
    skyMid: '#18243D',
    skyHorizon: '#634E4A',
    fogColor: '#131B2E',
    floorMain: '#252D3D',
    floorAlt: '#1C2332',
    floorTrim: '#E6B85C',
    platformWall: '#101622',
    pillarColor: '#3A465C',
    pillarAccent: '#E6B85C',
    ambientParticleColor: '#FBBF24',
    hazardType: 'none',
    rewardMultiplier: 1.08,
    pillars: [
      { x: -22.5, z: -22.5, radius: 1.75, height: 7.2, style: 'column' },
      { x: 22.5, z: -22.5, radius: 1.75, height: 7.2, style: 'column' },
      { x: -22.5, z: 22.5, radius: 1.75, height: 7.2, style: 'column' },
      { x: 22.5, z: 22.5, radius: 1.75, height: 7.2, style: 'column' },
    ],
    platforms: [
      {
        id: 'cit_throne',
        x: 0,
        z: 0,
        radius: 8.6,
        height: 0.85,
        color: '#313B4F',
        trimColor: '#E6B85C',
        label: 'منصة التاج (+12% ضرر)',
      },
      {
        id: 'cit_bastion_n',
        x: 0,
        z: -31.5,
        radius: 6.0,
        height: 0.65,
        color: '#2A3346',
        trimColor: '#38BDF8',
      },
      {
        id: 'cit_bastion_e',
        x: 33.5,
        z: 0,
        radius: 5.2,
        height: 0.6,
        color: '#2A3346',
        trimColor: '#38BDF8',
      },
      {
        id: 'cit_bastion_w',
        x: -33.5,
        z: 0,
        radius: 5.2,
        height: 0.6,
        color: '#2A3346',
        trimColor: '#10B981',
      },
    ],
    terrainZones: [
      {
        id: 'cit_rune',
        x: 0,
        z: 29.5,
        radius: 5.8,
        kind: 'rune_pad',
        label: 'حلقة التسارع',
        color: '#38BDF8',
      },
    ],
    shrines: [
      { id: 'obs_heal', x: -33.5, z: 0, kind: 'heal', label: 'محراب الاستشفاء', color: '#10B981' },
      { id: 'obs_energy', x: 33.5, z: 0, kind: 'energy', label: 'بؤرة الطاقة', color: '#38BDF8' },
    ],
    arches: [
      { x: 0, z: -44.5, rotY: 0, width: 8.8, height: 7.6 },
      { x: 0, z: 44.5, rotY: 0, width: 8.8, height: 7.6 },
    ],
    componentsSummary: [
      { title: 'منصة التاج + 3 شرفات حصن (96م)', detail: 'تضاريس مرتفعة رحبة تمنح +12% ضرر ومدى رؤية سيادي.' },
      { title: '4 أعمدة مشاعل وبوابتا نصر', detail: 'مصدات بازلتية متباعدة تسمح بمناورات السحر والقوس والحركة الحرة.' },
      { title: 'حلقة تسارع ومحرابا دعم', detail: 'دائرة رونية في الجنوب لزيادة السرعة ومحرابان متقابلان للصحة والطاقة.' },
    ],
  },
  magma_caldera: {
    id: 'magma_caldera',
    name: 'فوهة البركان الملتهب',
    subtitle: 'منصات أوبسيديان متدرجة بقطر 100م فوق بحيرات الحمم المشتعلة',
    description:
      'ساحة بركانية عملاقة بقطر 100م تضم قمة مرتفعة، برك حمم مشتعلة، نواة غضب، وينبوع صمود (+28% غنائم).',
    imagePath: BUNDLED_IMAGES.arenaMagma,
    radius: 50.0,
    skyTop: '#14090B',
    skyMid: '#3C1612',
    skyHorizon: '#BD4B1E',
    fogColor: '#27110E',
    floorMain: '#231D24',
    floorAlt: '#1A151B',
    floorTrim: '#F97316',
    platformWall: '#120C10',
    pillarColor: '#2E262C',
    pillarAccent: '#FB923C',
    ambientParticleColor: '#FB923C',
    hazardType: 'lava_vents',
    rewardMultiplier: 1.28,
    pillars: [
      { x: -24.0, z: 0, radius: 1.8, height: 7.4, style: 'obsidian' },
      { x: 24.0, z: 0, radius: 1.8, height: 7.4, style: 'obsidian' },
      { x: 0, z: -24.0, radius: 1.8, height: 7.4, style: 'obsidian' },
      { x: 0, z: 24.0, radius: 1.8, height: 7.4, style: 'obsidian' },
    ],
    platforms: [
      {
        id: 'mag_peak',
        x: 0,
        z: 0,
        radius: 8.2,
        height: 0.95,
        color: '#342529',
        trimColor: '#F97316',
        label: 'قمة الفوهة (+12% ضرر)',
      },
      {
        id: 'mag_ledge_w',
        x: -32.0,
        z: -16.5,
        radius: 6.2,
        height: 0.7,
        color: '#2C2024',
        trimColor: '#10B981',
      },
      {
        id: 'mag_ledge_e',
        x: 32.0,
        z: 16.5,
        radius: 5.8,
        height: 0.68,
        color: '#2C2024',
        trimColor: '#F59E0B',
      },
    ],
    terrainZones: [
      {
        id: 'mag_pool_1',
        x: 19.5,
        z: -19.5,
        radius: 5.5,
        kind: 'magma_pool',
        label: 'بركة حمم',
        color: '#EA580C',
      },
      {
        id: 'mag_pool_2',
        x: -19.5,
        z: 19.5,
        radius: 5.5,
        kind: 'magma_pool',
        label: 'بركة حمم',
        color: '#EA580C',
      },
    ],
    shrines: [
      { id: 'mag_fury', x: 0, z: 0, kind: 'fury', label: 'نواة الغضب البركاني', color: '#F97316' },
      { id: 'mag_heal', x: -32.0, z: -16.5, kind: 'heal', label: 'ينبوع الصمود', color: '#10B981' },
    ],
    arches: [
      { x: -46.0, z: 0, rotY: Math.PI / 2, width: 7.8, height: 7.2 },
      { x: 46.0, z: 0, rotY: Math.PI / 2, width: 7.8, height: 7.2 },
    ],
    componentsSummary: [
      { title: 'قمة الفوهة والأرصفة المرتفعة (100م)', detail: '3 مرتفعات صخرية واسعة تحميك من حمم الأرضية وتزيد ضرر هجماتك.' },
      { title: 'برك حمم وفوهات متفجرة', detail: 'مخاطر بيئية متباعدة تكافئ المقاتلين الجريئين +28% غنائم.' },
      { title: '4 مسلات أوبسيديان وبوابتان', detail: 'تغطية تكتيكية واسعة أثناء موجات سلسلة الوحوش والزعماء.' },
    ],
  },
  glacier_spire: {
    id: 'glacier_spire',
    name: 'قمة الجليد الأبدي',
    subtitle: 'هضبة بلورية مترامية بقطر 104م تحت الشفق وبحيرات صقيع عاكسة',
    description:
      'ساحة جليدية واسعة بقطر 104م تضم 3 شرفات مرتفعة، بحيرتي صقيع مسرّعتين للحركة، وبلورة شفق (+18% غنائم).',
    imagePath: BUNDLED_IMAGES.arenaGlacier,
    radius: 52.0,
    skyTop: '#091628',
    skyMid: '#183754',
    skyHorizon: '#5C8EB3',
    fogColor: '#162C44',
    floorMain: '#283F57',
    floorAlt: '#1F3247',
    floorTrim: '#38BDF8',
    platformWall: '#132132',
    pillarColor: '#5683AA',
    pillarAccent: '#BAE6FD',
    ambientParticleColor: '#E0F2FE',
    hazardType: 'frost_pulse',
    rewardMultiplier: 1.18,
    pillars: [
      { x: -22.5, z: -22.5, radius: 1.65, height: 7.6, style: 'ice' },
      { x: 22.5, z: -22.5, radius: 1.65, height: 7.6, style: 'ice' },
      { x: -22.5, z: 22.5, radius: 1.65, height: 7.6, style: 'ice' },
      { x: 22.5, z: 22.5, radius: 1.65, height: 7.6, style: 'ice' },
    ],
    platforms: [
      {
        id: 'ice_dais_c',
        x: 0,
        z: 0,
        radius: 8.4,
        height: 0.82,
        color: '#325270',
        trimColor: '#38BDF8',
        label: 'مرتفع الشفق (+12% ضرر)',
      },
      {
        id: 'ice_dais_s',
        x: 0,
        z: 34.0,
        radius: 6.2,
        height: 0.62,
        color: '#2D4A66',
        trimColor: '#10B981',
      },
      {
        id: 'ice_dais_n',
        x: 0,
        z: -34.0,
        radius: 6.0,
        height: 0.62,
        color: '#2D4A66',
        trimColor: '#7DD3FC',
      },
    ],
    terrainZones: [
      {
        id: 'ice_patch_w',
        x: -31.0,
        z: 0,
        radius: 7.2,
        kind: 'ice_patch',
        label: 'جليد الانزلاق السريع',
        color: '#7DD3FC',
      },
      {
        id: 'ice_patch_e',
        x: 31.0,
        z: 0,
        radius: 7.2,
        kind: 'ice_patch',
        label: 'جليد الانزلاق السريع',
        color: '#7DD3FC',
      },
    ],
    shrines: [
      { id: 'ice_energy', x: 0, z: -34.0, kind: 'energy', label: 'بلورة الشفق', color: '#38BDF8' },
      { id: 'ice_heal', x: 0, z: 34.0, kind: 'heal', label: 'قلب الصقيع', color: '#10B981' },
    ],
    arches: [
      { x: -48.0, z: 0, rotY: Math.PI / 2, width: 8.0, height: 7.4 },
      { x: 48.0, z: 0, rotY: Math.PI / 2, width: 8.0, height: 7.4 },
    ],
    componentsSummary: [
      { title: 'مرتفع الشفق والشرفات (104م)', detail: 'تدرّجات جليدية واسعة تعطي مدى رؤية ومناورة مثاليين للأسلحة البعيدة.' },
      { title: 'بحيرات الصقيع الانزلاقية', detail: 'حلبات جليد شرقاً وغرباً تزيد سرعة الحركة والمراوغة +24% فوقها.' },
      { title: '4 بلورات شفقية عملاقة', detail: 'مصدات جليدية صافية +18% غنائم للمواجهات التنافسية وموجات الوحوش.' },
    ],
  },
  sunstone_dunes: {
    id: 'sunstone_dunes',
    name: 'معبد رمال الشمس',
    subtitle: 'فناء صحراوي هائل بقطر 112م ومدرجات هرمية وواحة استشفاء',
    description:
      'ساحة قتال حرة بقطر 112م تضم مدرجاً هرمياً عملاقاً، واحة شفاء طبيعية، ومذبح شمس مع مسلات ذهبية (+15% غنائم).',
    imagePath: BUNDLED_IMAGES.arenaSunstone,
    radius: 56.0,
    skyTop: '#1A161F',
    skyMid: '#6E4C2D',
    skyHorizon: '#DFA95F',
    fogColor: '#4E3926',
    floorMain: '#5C4A36',
    floorAlt: '#4C3D2D',
    floorTrim: '#E6B85C',
    platformWall: '#33261A',
    pillarColor: '#9C7E54',
    pillarAccent: '#FDE68A',
    ambientParticleColor: '#FCD34D',
    hazardType: 'sand_gust',
    rewardMultiplier: 1.15,
    pillars: [
      { x: -25.0, z: -16.0, radius: 1.7, height: 8.0, style: 'obelisk' },
      { x: 25.0, z: -16.0, radius: 1.7, height: 8.0, style: 'obelisk' },
      { x: -25.0, z: 16.0, radius: 1.7, height: 8.0, style: 'obelisk' },
      { x: 25.0, z: 16.0, radius: 1.7, height: 8.0, style: 'obelisk' },
    ],
    platforms: [
      {
        id: 'sun_ziggurat',
        x: 0,
        z: 0,
        radius: 10.2,
        height: 0.92,
        color: '#735B40',
        trimColor: '#E6B85C',
        label: 'مدرج الشمس المرتفع (+12% ضرر)',
      },
      {
        id: 'sun_altar_w',
        x: -37.5,
        z: 0,
        radius: 6.2,
        height: 0.7,
        color: '#6A533A',
        trimColor: '#F59E0B',
      },
    ],
    terrainZones: [
      {
        id: 'sun_oasis',
        x: 37.5,
        z: 0,
        radius: 7.4,
        kind: 'healing_spring',
        label: 'واحة التجديد',
        color: '#10B981',
      },
    ],
    shrines: [
      { id: 'sun_fury', x: -37.5, z: 0, kind: 'fury', label: 'مذبح الشمس', color: '#F59E0B' },
      { id: 'sun_heal', x: 37.5, z: 0, kind: 'heal', label: 'واحة المعبد', color: '#10B981' },
    ],
    arches: [
      { x: 0, z: -51.5, rotY: 0, width: 8.8, height: 8.0 },
      { x: 0, z: 51.5, rotY: 0, width: 8.8, height: 8.0 },
    ],
    componentsSummary: [
      { title: 'مدرج الشمس العملاق والمنصة الغربية (112م)', detail: 'مساحة قتالية رحبة بمدرج مركزي مهيب وممرات التفاف مفتوحة.' },
      { title: 'واحة المعبد الاستشفائية', detail: 'نبع مائي واسع يعالج صحتك باستمرار أثناء القتال والتنافس.' },
      { title: '4 مسلات وبوابتا شمس', detail: 'معالم إيسيكاي صحراوية فخمة تمنح +15% غنائم وتجربة قتال مفتوحة.' },
    ],
  },
  celestial_sanctuary: {
    id: 'celestial_sanctuary',
    name: 'الحرم السماوي المعلق',
    subtitle: 'جزيرة رخام سماوية بقطر 108م فوق السحب بدوائر نور وتسارع روني',
    description:
      'ساحة جديدة فوق بحر الغيوم بقطر 108م تضم رواق أعمدة رخامية، حلقتي تسارع ذهبيتين، ومنصة شفاء مباركة (+22% غنائم).',
    imagePath: BUNDLED_IMAGES.arenaCelestial,
    radius: 54.0,
    skyTop: '#0B1E3D',
    skyMid: '#2D609E',
    skyHorizon: '#F3D29A',
    fogColor: '#376294',
    floorMain: '#CBD5E1',
    floorAlt: '#94A3B8',
    floorTrim: '#E6B85C',
    platformWall: '#64748B',
    pillarColor: '#E2E8F0',
    pillarAccent: '#38BDF8',
    ambientParticleColor: '#FDE68A',
    hazardType: 'none',
    rewardMultiplier: 1.22,
    pillars: [
      { x: -24.0, z: -24.0, radius: 1.55, height: 8.0, style: 'column' },
      { x: 24.0, z: -24.0, radius: 1.55, height: 8.0, style: 'column' },
      { x: -24.0, z: 24.0, radius: 1.55, height: 8.0, style: 'column' },
      { x: 24.0, z: 24.0, radius: 1.55, height: 8.0, style: 'column' },
      { x: 0, z: -34.0, radius: 1.55, height: 7.2, style: 'column' },
      { x: 0, z: 34.0, radius: 1.55, height: 7.2, style: 'column' },
    ],
    platforms: [
      {
        id: 'cel_sanctum',
        x: 0,
        z: 0,
        radius: 9.2,
        height: 0.85,
        color: '#E2E8F0',
        trimColor: '#E6B85C',
        label: 'مذبح النور العلوي (+12% ضرر)',
      },
      {
        id: 'cel_wing_e',
        x: 36.0,
        z: 0,
        radius: 6.4,
        height: 0.65,
        color: '#CBD5E1',
        trimColor: '#38BDF8',
      },
      {
        id: 'cel_wing_w',
        x: -36.0,
        z: 0,
        radius: 6.4,
        height: 0.65,
        color: '#CBD5E1',
        trimColor: '#10B981',
      },
    ],
    terrainZones: [
      {
        id: 'cel_rune_n',
        x: 0,
        z: -21.0,
        radius: 5.5,
        kind: 'rune_pad',
        label: 'دائرة الريح السماوية',
        color: '#38BDF8',
      },
      {
        id: 'cel_spring_s',
        x: 0,
        z: 21.0,
        radius: 5.5,
        kind: 'healing_spring',
        label: 'نبع الغيوم المبارك',
        color: '#10B981',
      },
    ],
    shrines: [
      { id: 'cel_heal', x: -36.0, z: 0, kind: 'heal', label: 'نعمة السماء', color: '#10B981' },
      { id: 'cel_energy', x: 36.0, z: 0, kind: 'energy', label: 'منارة الأثير', color: '#38BDF8' },
    ],
    arches: [
      { x: 0, z: -49.5, rotY: 0, width: 9.2, height: 8.2 },
      { x: 0, z: 49.5, rotY: 0, width: 9.2, height: 8.2 },
    ],
    componentsSummary: [
      { title: 'شرفات الرخام فوق الغيوم (108م)', detail: 'رؤية مشرقة صافية مع 6 أعمدة إغريقية تكتيكية ومرتفعات متصلة.' },
      { title: 'دائرة تسارع + نبع شفاء', detail: 'موازنة هجومية ودفاعية مثالية في منتصف الميدان.' },
      { title: 'مكافأة استكشاف سماوية +22%', detail: 'تمنح غنائم وذهب إضافي في التحديات الفردية والجماعية.' },
    ],
  },
  abyssal_colosseum: {
    id: 'abyssal_colosseum',
    name: 'كولوسيوم الهاوية المظلم',
    subtitle: 'أعظم حلبة قتال أسطورية بقطر 120م وسط كهف الجمشت والبلورات البنفسجية',
    description:
      'أضخم ساحة معارك في اللعبة بقطر 120م! تضم 4 شرفات كريستال، مسلات هاوية عائمة، محرابي غضب وشفا، ومضاعف غنائم +35%.',
    imagePath: BUNDLED_IMAGES.arenaAbyssal,
    radius: 60.0,
    skyTop: '#070412',
    skyMid: '#1C113A',
    skyHorizon: '#5B21B6',
    fogColor: '#160D2B',
    floorMain: '#1E1B2E',
    floorAlt: '#151324',
    floorTrim: '#A855F7',
    platformWall: '#0C0A17',
    pillarColor: '#2E264D',
    pillarAccent: '#C084FC',
    ambientParticleColor: '#C084FC',
    hazardType: 'frost_pulse',
    rewardMultiplier: 1.35,
    pillars: [
      { x: -27.0, z: -27.0, radius: 1.85, height: 8.6, style: 'obsidian' },
      { x: 27.0, z: -27.0, radius: 1.85, height: 8.6, style: 'obsidian' },
      { x: -27.0, z: 27.0, radius: 1.85, height: 8.6, style: 'obsidian' },
      { x: 27.0, z: 27.0, radius: 1.85, height: 8.6, style: 'obsidian' },
    ],
    platforms: [
      {
        id: 'aby_core',
        x: 0,
        z: 0,
        radius: 11.0,
        height: 1.0,
        color: '#2A2247',
        trimColor: '#A855F7',
        label: 'عرش الهاوية الأسطوري (+12% ضرر)',
      },
      {
        id: 'aby_n',
        x: 0,
        z: -41.0,
        radius: 6.8,
        height: 0.72,
        color: '#231C3B',
        trimColor: '#38BDF8',
      },
      {
        id: 'aby_s',
        x: 0,
        z: 41.0,
        radius: 6.8,
        height: 0.72,
        color: '#231C3B',
        trimColor: '#F59E0B',
      },
    ],
    terrainZones: [
      {
        id: 'aby_rune_w',
        x: -39.0,
        z: 0,
        radius: 6.8,
        kind: 'rune_pad',
        label: 'ممر البعد السريع',
        color: '#A855F7',
      },
      {
        id: 'aby_rune_e',
        x: 39.0,
        z: 0,
        radius: 6.8,
        kind: 'rune_pad',
        label: 'ممر البعد السريع',
        color: '#38BDF8',
      },
    ],
    shrines: [
      { id: 'aby_fury', x: 0, z: 41.0, kind: 'fury', label: 'مذبح العملاق', color: '#F59E0B' },
      { id: 'aby_energy', x: 0, z: -41.0, kind: 'energy', label: 'قلب الجمشت', color: '#C084FC' },
      { id: 'aby_heal', x: -39.0, z: 0, kind: 'heal', label: 'ينبوع الأثير', color: '#10B981' },
    ],
    arches: [
      { x: -55.0, z: 0, rotY: Math.PI / 2, width: 9.0, height: 8.6 },
      { x: 55.0, z: 0, rotY: Math.PI / 2, width: 9.0, height: 8.6 },
    ],
    componentsSummary: [
      { title: 'كولوسيوم الهاوية بقطر 120 متر', detail: 'أوسع ميدان معارك لاختبار أقصى مهاراتك ضد أسراب الوحوش والعمالقة.' },
      { title: 'ثلاثة محاريب وممرا تسارع', detail: 'دعم مستمر للصحة والغضب والطاقة لتسهيل القتال الملحمي الطويل.' },
      { title: 'أعلى عائد غنائم (+35%)', detail: 'مثالي لجمع الذهب والجواهر السريع وتحدي عملاق الهاوية.' },
    ],
  },
};

export const ARENA_LIST: (ArenaDef & { id: ArenaId })[] = Object.values(ARENAS);

// Peaceful Work Contracts offered by Overworld NPCs
export const NPC_JOBS: Record<string, NpcJobDef> = {
  job_herbs: {
    id: 'job_herbs',
    npcId: 'npc_lyra',
    title: 'جمع أعشاب القمر للخيمياء',
    description: 'اجمع 3 من أعشاب القمر المنتشرة في المرج الهامس وغابة الزمرد لإعداد جرعات الشفاء.',
    kind: 'gather_herb',
    target: 3,
    rewardGold: 220,
    rewardGuildMarks: 4,
    rewardGems: 4,
    rewardXp: 150,
  },
  job_ores: {
    id: 'job_ores',
    npcId: 'npc_bronn',
    title: 'تعدين خام الأوريكالكوم',
    description: 'استخرج 3 قطع من خام الحديد والمعدن النادر قرب ضفاف النهر الفضي وهضبة التنين.',
    kind: 'gather_ore',
    target: 3,
    rewardGold: 260,
    rewardGuildMarks: 5,
    rewardGems: 5,
    rewardXp: 180,
  },
  job_crystals: {
    id: 'job_crystals',
    npcId: 'npc_salim',
    title: 'شحن بلورات الأثير للقافلة',
    description: 'اجمع 3 بلورات أثير متوهجة من بحيرة الكريستال ومرصد النجوم لتجارة القافلة.',
    kind: 'gather_crystal',
    target: 3,
    rewardGold: 300,
    rewardGuildMarks: 6,
    rewardGems: 6,
    rewardXp: 210,
  },
  job_monsters: {
    id: 'job_monsters',
    npcId: 'npc_kael',
    title: 'عقد النقابة: تطهير الطرق التجارية',
    description: 'اقضِ على 6 وحوش برية في أقاليم إيثيريا المفتوحة لحماية القوافل المسالمة.',
    kind: 'hunt_monsters',
    target: 6,
    rewardGold: 340,
    rewardGuildMarks: 7,
    rewardGems: 7,
    rewardXp: 240,
  },
  job_explore: {
    id: 'job_explore',
    npcId: 'npc_orion',
    title: 'رسم خرائط إيثيريا التسعة',
    description: 'اكتشف 4 أقاليم مختلفة عبر السفر أو البوابات داخل قارة إيثيريا الكبرى.',
    kind: 'explore_regions',
    target: 4,
    rewardGold: 380,
    rewardGuildMarks: 8,
    rewardGems: 10,
    rewardXp: 280,
  },
};

export const NPC_JOB_LIST: NpcJobDef[] = Object.values(NPC_JOBS);

// Build Rich Overworld Scenery & Nodes for the 1400m (radius: 700m, 100x area!) Continent
function generateOverworldScenery(): SceneryPropDef[] {
  const props: SceneryPropDef[] = [
    // Haven Village Central Sanctuary (0,0)
    { id: 'fountain_main', kind: 'fountain', x: 0, z: 0, scale: 1.4 },
    { id: 'house_nw', kind: 'cottage', x: -16, z: -14, scale: 1.25, rotY: 0.75, color: '#D8CFC2', accentColor: '#991B1B' },
    { id: 'house_ne', kind: 'cottage', x: 16, z: -14, scale: 1.2, rotY: -0.75, color: '#D8CFC2', accentColor: '#1D4E7A' },
    { id: 'house_sw', kind: 'cottage', x: -16, z: 14, scale: 1.15, rotY: 2.35, color: '#CBBFA9', accentColor: '#B45309' },
    { id: 'house_se', kind: 'cottage', x: 16, z: 14, scale: 1.15, rotY: -2.35, color: '#D8CFC2', accentColor: '#0F6A52' },
    { id: 'house_guild', kind: 'cottage', x: 0, z: -23, scale: 1.45, rotY: 0, color: '#E2D9C8', accentColor: '#C9841A' },
    { id: 'camp_orion', kind: 'campfire', x: 7.5, z: -6.5, scale: 1.05 },
    { id: 'camp_bronn', kind: 'campfire', x: -12.5, z: 5.5, scale: 1.15 },
  ];

  // Whispering Meadow & Haven outskirts trees
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    const dist = 58 + (i % 4) * 26;
    props.push({
      id: `meadow_tree_${i}`,
      kind: 'pine_tree',
      x: Math.round(Math.cos(a) * dist),
      z: Math.round(Math.sin(a) * dist - 40),
      scale: 1.25 + (i % 3) * 0.2,
    });
  }

  // Northern Emerald Forest (-180, -340) dense pine grove
  for (let i = 0; i < 42; i++) {
    const a = i * 2.39996;
    const r = 18 + Math.sqrt(i + 1) * 18;
    props.push({
      id: `forest_tree_${i}`,
      kind: i % 9 === 0 ? 'campfire' : 'pine_tree',
      x: Math.round(-180 + Math.cos(a) * r),
      z: Math.round(-340 + Math.sin(a) * r),
      scale: 1.35 + (i % 4) * 0.2,
    });
  }

  // Silver River & Mines (175, -240)
  for (let i = 0; i < 18; i++) {
    const a = i * 1.9;
    const r = 16 + (i % 6) * 16;
    props.push({
      id: `river_prop_${i}`,
      kind: i % 2 === 0 ? 'boulder' : 'pine_tree',
      x: Math.round(175 + Math.cos(a) * r),
      z: Math.round(-240 + Math.sin(a) * r),
      scale: 1.3 + (i % 3) * 0.25,
      color: i % 2 === 0 ? '#64748B' : undefined,
    });
  }

  // Forgotten Ruins (360, -40) ancient columns & cottages
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    const r = 20 + (i % 3) * 32;
    props.push({
      id: `ruin_prop_${i}`,
      kind: i % 5 === 0 ? 'boulder' : 'ruin_pillar',
      x: Math.round(360 + Math.cos(a) * r),
      z: Math.round(-40 + Math.sin(a) * r),
      scale: 1.25 + (i % 3) * 0.2,
    });
  }

  // Crystal Lake (40, 340) shimmering crystals & pines
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    const r = 24 + (i % 4) * 24;
    props.push({
      id: `lake_prop_${i}`,
      kind: i % 2 === 0 ? 'crystal_cluster' : 'pine_tree',
      x: Math.round(40 + Math.cos(a) * r),
      z: Math.round(340 + Math.sin(a) * r),
      scale: 1.35 + (i % 3) * 0.2,
      color: i % 2 === 0 ? '#38BDF8' : undefined,
    });
  }

  // Arcane Observatory (310, 290)
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const r = 22 + (i % 3) * 26;
    props.push({
      id: `arc_prop_${i}`,
      kind: i % 3 === 0 ? 'ruin_pillar' : 'crystal_cluster',
      x: Math.round(310 + Math.cos(a) * r),
      z: Math.round(290 + Math.sin(a) * r),
      scale: 1.4,
      color: '#A855F7',
    });
  }

  // Dragon Ridge (-390, 60) volcanic rocks
  for (let i = 0; i < 24; i++) {
    const a = i * 2.1;
    const r = 20 + (i % 5) * 24;
    props.push({
      id: `dragon_prop_${i}`,
      kind: i % 6 === 0 ? 'campfire' : 'boulder',
      x: Math.round(-390 + Math.cos(a) * r),
      z: Math.round(60 + Math.sin(a) * r),
      scale: 1.45 + (i % 3) * 0.25,
      color: '#3A2A2D',
    });
  }

  // Frost Peaks (-280, -440)
  for (let i = 0; i < 20; i++) {
    const a = i * 1.7;
    const r = 20 + (i % 4) * 26;
    props.push({
      id: `frost_prop_${i}`,
      kind: i % 2 === 0 ? 'crystal_cluster' : 'boulder',
      x: Math.round(-280 + Math.cos(a) * r),
      z: Math.round(-440 + Math.sin(a) * r),
      scale: 1.45,
      color: i % 2 === 0 ? '#7DD3FC' : '#475569',
    });
  }

  return props;
}

const OVERWORLD_NODES: OverworldNodeDef[] = [
  // Herbs in Whispering Meadow & Emerald Forest
  { id: 'node_herb_1', kind: 'herb', label: 'عشبة القمر', x: -18, z: -72, regionId: 'whispering_meadow', color: '#10B981' },
  { id: 'node_herb_2', kind: 'herb', label: 'عشبة القمر', x: 24, z: -115, regionId: 'whispering_meadow', color: '#10B981' },
  { id: 'node_herb_3', kind: 'herb', label: 'عشبة القمر', x: -45, z: -158, regionId: 'whispering_meadow', color: '#22C55E' },
  { id: 'node_herb_4', kind: 'herb', label: 'عشبة الزمرد', x: -140, z: -280, regionId: 'emerald_forest', color: '#22C55E' },
  { id: 'node_herb_5', kind: 'herb', label: 'عشبة الزمرد', x: -205, z: -365, regionId: 'emerald_forest', color: '#10B981' },
  { id: 'node_herb_6', kind: 'herb', label: 'عشبة الزمرد', x: -120, z: -380, regionId: 'emerald_forest', color: '#34D399' },
  // Ores in Silver River & Dragon Ridge
  { id: 'node_ore_1', kind: 'ore', label: 'خام الفضة', x: 135, z: -180, regionId: 'silver_river', color: '#F59E0B' },
  { id: 'node_ore_2', kind: 'ore', label: 'خام الفضة', x: 195, z: -250, regionId: 'silver_river', color: '#FBBF24' },
  { id: 'node_ore_3', kind: 'ore', label: 'خام الفضة', x: 215, z: -210, regionId: 'silver_river', color: '#F59E0B' },
  { id: 'node_ore_4', kind: 'ore', label: 'خام التنين', x: -330, z: 35, regionId: 'dragon_ridge', color: '#F97316' },
  { id: 'node_ore_5', kind: 'ore', label: 'خام التنين', x: -410, z: 85, regionId: 'dragon_ridge', color: '#FB923C' },
  { id: 'node_ore_6', kind: 'ore', label: 'خام أطلال', x: 320, z: -20, regionId: 'forgotten_ruins', color: '#E6B85C' },
  // Crystals in Crystal Lake, Arcane Observatory & Frost Peaks
  { id: 'node_crys_1', kind: 'crystal', label: 'بلورة الكريستال', x: 15, z: 265, regionId: 'crystal_lake', color: '#38BDF8' },
  { id: 'node_crys_2', kind: 'crystal', label: 'بلورة الكريستال', x: 75, z: 360, regionId: 'crystal_lake', color: '#7DD3FC' },
  { id: 'node_crys_3', kind: 'crystal', label: 'بلورة الكريستال', x: -30, z: 380, regionId: 'crystal_lake', color: '#38BDF8' },
  { id: 'node_crys_4', kind: 'crystal', label: 'بلورة الأثير', x: 280, z: 255, regionId: 'arcane_observatory', color: '#A855F7' },
  { id: 'node_crys_5', kind: 'crystal', label: 'بلورة الأثير', x: 340, z: 320, regionId: 'arcane_observatory', color: '#C084FC' },
  { id: 'node_crys_6', kind: 'crystal', label: 'بلورة الصقيع', x: -260, z: -410, regionId: 'frost_peaks', color: '#7DD3FC' },
];

// Main Open-World Exploration Map (100x Chunked World Streaming! radius: 7000m -> diameter: 14,000m!)
export const OVERWORLD_MAP: ArenaDef = {
  id: 'etheria_overworld',
  name: 'قارة إيثيريا العظمى (بث قطاعات 14,000م)',
  subtitle: 'عالم إيسيكاي متدفق 100 ضعف (قطر 14,000م): تحميل ذكي للقطاعات، 9 أقاليم، 5 شخصيات مسالمة، ونقاط انتقال سريعة',
  description:
    'خريطة الاستكشاف الأساسية ببث القطاعات (Chunked World Loading) بقطر 14,000 متر! تحمّل المناطق عند الاقتراب فقط لحماية الأجهزة الضعيفة، وتضم قرية الملاذ و5 شخصيات مسالمة وأقاليم وغابات وكنوزاً لا تنتهي.',
  imagePath: BUNDLED_IMAGES.worldEtheria,
  radius: 7000.0,
  isOverworld: true,
  skyTop: '#071124',
  skyMid: '#18365C',
  skyHorizon: '#8CC4D6',
  fogColor: '#172E47',
  floorMain: '#284538',
  floorAlt: '#213B30',
  floorTrim: '#E6B85C',
  platformWall: '#152026',
  pillarColor: '#566478',
  pillarAccent: '#38BDF8',
  ambientParticleColor: '#FDE68A',
  hazardType: 'none',
  rewardMultiplier: 1.25,
  pillars: [
    { x: 350, z: -45, radius: 1.6, height: 6.8, style: 'column' },
    { x: 372, z: -28, radius: 1.6, height: 5.8, style: 'column' },
    { x: 345, z: -15, radius: 1.6, height: 7.2, style: 'column' },
    { x: -378, z: 52, radius: 1.75, height: 6.8, style: 'obsidian' },
    { x: -402, z: 75, radius: 1.75, height: 7.4, style: 'obsidian' },
    { x: 300, z: 278, radius: 1.5, height: 7.0, style: 'ice' },
    { x: 324, z: 302, radius: 1.5, height: 7.0, style: 'ice' },
  ],
  platforms: [
    {
      id: 'ow_plaza',
      x: 0,
      z: 0,
      radius: 13.5,
      height: 0.48,
      color: '#465264',
      trimColor: '#E6B85C',
      label: 'ساحة ملاذ المسافرين ونقابة المغامرين',
    },
    {
      id: 'ow_meadow_outpost',
      x: 0,
      z: -145,
      radius: 11.0,
      height: 0.52,
      color: '#3D5248',
      trimColor: '#10B981',
      label: 'بستان الأعشاب الهادئ',
    },
    {
      id: 'ow_ruins_dais',
      x: 360,
      z: -40,
      radius: 14.0,
      height: 0.72,
      color: '#3F4A5C',
      trimColor: '#38BDF8',
      label: 'أطلال البرج المنسي',
    },
    {
      id: 'ow_dragon_ridge',
      x: -390,
      z: 60,
      radius: 15.0,
      height: 1.0,
      color: '#3D2B2F',
      trimColor: '#F97316',
      label: 'هضبة التنين (+12% ضرر)',
    },
    {
      id: 'ow_lake_pier',
      x: 40,
      z: 300,
      radius: 8.5,
      height: 0.55,
      color: '#6E5338',
      trimColor: '#38BDF8',
      label: 'رصيف بحيرة الكريستال',
    },
    {
      id: 'ow_observatory_dais',
      x: 310,
      z: 290,
      radius: 12.0,
      height: 0.8,
      color: '#2F2747',
      trimColor: '#A855F7',
      label: 'مرصد النجوم السحري',
    },
  ],
  terrainZones: [
    {
      id: 'ow_haven_spring',
      x: 0,
      z: 0,
      radius: 9.5,
      kind: 'healing_spring',
      label: 'نافورة التجديد الآمنة',
      color: '#10B981',
    },
    {
      id: 'ow_meadow_zone',
      x: 0,
      z: -145,
      radius: 46.0,
      kind: 'meadow',
      label: 'المرج الهامس',
      color: '#22C55E',
    },
    {
      id: 'ow_forest_meadow',
      x: -180,
      z: -340,
      radius: 65.0,
      kind: 'meadow',
      label: 'غابة الزمرد العظمى',
      color: '#10B981',
    },
    {
      id: 'ow_crystal_water',
      x: 40,
      z: 345,
      radius: 58.0,
      kind: 'water_lake',
      label: 'بحيرة الكريستال',
      color: '#0EA5E9',
    },
    {
      id: 'ow_dragon_ash',
      x: -390,
      z: 60,
      radius: 62.0,
      kind: 'ash_land',
      label: 'أرض الرماد البركاني',
      color: '#F97316',
    },
    {
      id: 'ow_speed_road_n',
      x: 0,
      z: -72,
      radius: 8.5,
      kind: 'rune_pad',
      label: 'درب السفر السريع الشمالي',
      color: '#38BDF8',
    },
    {
      id: 'ow_speed_road_e',
      x: 175,
      z: -20,
      radius: 9.5,
      kind: 'rune_pad',
      label: 'درب القافلة الشرقي',
      color: '#E6B85C',
    },
  ],
  shrines: [
    { id: 'ow_shrine_n', x: 0, z: -138, kind: 'energy', label: 'منارة المرج', color: '#38BDF8' },
    { id: 'ow_shrine_f', x: -180, z: -320, kind: 'heal', label: 'ينبوع الزمرد', color: '#10B981' },
    { id: 'ow_shrine_s', x: 40, z: 295, kind: 'heal', label: 'ينبوع البحيرة', color: '#10B981' },
    { id: 'ow_shrine_w', x: -340, z: 58, kind: 'fury', label: 'نصب القوة', color: '#F59E0B' },
    { id: 'ow_shrine_e', x: 335, z: -38, kind: 'energy', label: 'مسلة الأطلال', color: '#38BDF8' },
  ],
  arches: [
    { x: 0, z: -32.0, rotY: 0, width: 7.2, height: 6.2 },
    { x: 32.0, z: 0, rotY: Math.PI / 2, width: 7.2, height: 6.2 },
    { x: 0, z: 32.0, rotY: 0, width: 7.2, height: 6.2 },
    { x: -32.0, z: 0, rotY: Math.PI / 2, width: 7.2, height: 6.2 },
  ],
  regions: [
    {
      id: 'haven_village',
      name: 'قرية ملاذ المسافرين (منطقة آمنة)',
      subtitle: 'القرية المركزية، مبنى نقابة المغامرين، 5 شخصيات مسالمة، وبوابات الساحات الست',
      x: 0,
      z: 0,
      radius: 42,
      color: '#E6B85C',
      safeZone: true,
      rewardGold: 80,
      rewardXp: 90,
    },
    {
      id: 'whispering_meadow',
      name: 'المرج الهامس',
      subtitle: 'مروج عشبية هادئة غنية بأعشاب القمر للخيمياء وبعض ذئاب الرماد',
      x: 0,
      z: -145,
      radius: 95,
      color: '#22C55E',
      monsterPool: ['ash_stalker', 'ember_imp'],
      rewardGold: 110,
      rewardXp: 120,
    },
    {
      id: 'emerald_forest',
      name: 'غابة الزمرد الشمالية',
      subtitle: 'غابة صنوبر مترامية الأطراف، موارد عشبية نادرة، وزواحف السموم',
      x: -180,
      z: -340,
      radius: 145,
      color: '#10B981',
      monsterPool: ['ash_stalker', 'venom_crawler', 'ember_imp'],
      rewardGold: 150,
      rewardXp: 160,
    },
    {
      id: 'silver_river',
      name: 'ضفاف النهر الفضي والمناجم',
      subtitle: 'وادي تعدين واسع غني بخامات الفضة والحديد لحرفة الحدادة',
      x: 175,
      z: -240,
      radius: 120,
      color: '#F59E0B',
      monsterPool: ['obsidian_golem', 'ash_stalker', 'venom_crawler'],
      rewardGold: 165,
      rewardXp: 175,
    },
    {
      id: 'forgotten_ruins',
      name: 'أطلال الإمبراطورية المنسية',
      subtitle: 'بقايا معبد قديم مترامٍ يحرسه أشباح النصل وحراس البازلت',
      x: 360,
      z: -40,
      radius: 140,
      color: '#38BDF8',
      monsterPool: ['wraith_knight', 'obsidian_golem', 'ash_stalker'],
      rewardGold: 190,
      rewardXp: 210,
    },
    {
      id: 'crystal_lake',
      name: 'بحيرة الكريستال الجنوبية',
      subtitle: 'بحيرة شفقية صافية غنية ببلورات الأثير وأطياف الصقيع',
      x: 40,
      z: 340,
      radius: 145,
      color: '#0EA5E9',
      monsterPool: ['frost_specter', 'venom_crawler'],
      rewardGold: 175,
      rewardXp: 190,
    },
    {
      id: 'arcane_observatory',
      name: 'مرصد النجوم السحري',
      subtitle: 'مجمع فلكي عريق يفيض بطاقة الأثير والبلورات البنفسجية النادرة',
      x: 310,
      z: 290,
      radius: 125,
      color: '#A855F7',
      monsterPool: ['frost_specter', 'wraith_knight', 'shadow_reaper'],
      rewardGold: 220,
      rewardXp: 240,
    },
    {
      id: 'dragon_ridge',
      name: 'هضبة التنين البركانية',
      subtitle: 'مرتفعات نارية غربية يسكنها حاصدو الظلال وأغلى الكنوز الأسطورية',
      x: -390,
      z: 60,
      radius: 155,
      color: '#F97316',
      monsterPool: ['shadow_reaper', 'obsidian_golem', 'ember_imp'],
      rewardGold: 260,
      rewardXp: 280,
    },
    {
      id: 'frost_peaks',
      name: 'قمم الصقيع الأبدي',
      subtitle: 'جبال جليدية شاهقة في أقصى الشمال الغربي مليئة بالبلورات النقية',
      x: -280,
      z: -440,
      radius: 140,
      color: '#7DD3FC',
      monsterPool: ['frost_specter', 'wraith_knight', 'shadow_reaper'],
      rewardGold: 245,
      rewardXp: 265,
    },
  ],
  worldNpcs: [
    {
      id: 'npc_orion',
      name: 'الحكيم أوريون',
      title: 'مرشد عالم إيثيريا',
      role: 'guide',
      serviceLabel: 'شفاء مجاني + عقد استكشاف',
      x: 6.5,
      z: -5.5,
      yaw: -0.65,
      robeColor: '#1E3A5F',
      accentColor: '#38BDF8',
      jobIds: ['job_explore'],
      lines: [
        'مرحباً بك أيها المستدعى في قارة إيثيريا! مساحة هذا العالم تضاعفت مئة مرة لاستكشاف حقيقي.',
        'تحاور مع رفاقك في القرية: رئيس النقابة كايل، الحدّاد برون، الخيميائية ليرا، والتاجر سليم.',
        'استخدم أحجار الانتقال السريع [M] للتنقل الفوري بين الأقاليم التسعة بعد اكتشافها!',
      ],
    },
    {
      id: 'npc_kael',
      name: 'القائد كايل',
      title: 'رئيس نقابة المغامرين',
      role: 'guild_master',
      serviceLabel: 'عقود العمل + صرف شارات النقابة',
      x: -2.0,
      z: -16.5,
      yaw: 0.1,
      robeColor: '#7C2D12',
      accentColor: '#E6B85C',
      jobIds: ['job_monsters'],
      lines: [
        'نقابة إيثيريا تكافئ كل مقاتل يطهّر الطرق التجارية بشهادات العمل والذهب!',
        'كل عقد عمل تنفذه يمنحك شارات النقابة التي يمكنك تحويلها إلى جواهر وصناديق أو بيع مواردك.',
      ],
    },
    {
      id: 'npc_bronn',
      name: 'الحدّاد برون',
      title: 'حرفي الأسلحة والدروع',
      role: 'blacksmith',
      serviceLabel: 'تعدين الخام + شحذ السلاح (+30% هجوم)',
      x: -11.0,
      z: 3.5,
      yaw: 0.9,
      robeColor: '#3F3F46',
      accentColor: '#F97316',
      jobIds: ['job_ores'],
      lines: [
        'أحضر لي خام الفضة أو التنين من وادي النهر الفضي وسأصقل نصلك مجاناً للمعركة القادمة!',
        'نصال الأبطال تُصنع من العزم والعمل الدؤوب وليس القتال وحده.',
      ],
    },
    {
      id: 'npc_lyra',
      name: 'الخيميائية ليرا',
      title: 'صانعة الإكسير والأعشاب',
      role: 'alchemist',
      serviceLabel: 'جمع الأعشاب + تزويد بجرعة شفاء',
      x: 11.5,
      z: 3.5,
      yaw: -0.95,
      robeColor: '#0F6A52',
      accentColor: '#10B981',
      jobIds: ['job_herbs'],
      lines: [
        'أعشاب القمر في المرج الهامس شمال القرية هي سر جرعات الشفاء الملكية لدينا.',
        'أتمم عقد جمع الأعشاب وسأمنحك ذهباً وشارات نقابة وجرعة شفاء فورية!',
      ],
    },
    {
      id: 'npc_salim',
      name: 'التاجر سليم',
      title: 'وسيط قوافل إيثيريا',
      role: 'merchant',
      serviceLabel: 'تجارة الموارد + عقود البلورات',
      x: 11.0,
      z: -10.5,
      yaw: -2.2,
      robeColor: '#5B21B6',
      accentColor: '#FBBF24',
      jobIds: ['job_crystals'],
      lines: [
        'قوافلي تعبر بين القرى التسع وتشتري كل الأعشاب والخامات والبلورات التي تجمعها بأسعار مجزية!',
        'بلورات الأثير في بحيرة الكريستال ومرصد النجوم هي الأغلى في القارة.',
      ],
    },
  ],
  worldNodes: OVERWORLD_NODES,
  worldWaystones: [
    { id: 'ws_haven', name: 'ساحة قرية الملاذ', regionId: 'haven_village', x: 0, z: 6, color: '#E6B85C' },
    { id: 'ws_meadow', name: 'المرج الهامس', regionId: 'whispering_meadow', x: 0, z: -135, color: '#22C55E' },
    { id: 'ws_forest', name: 'قلب غابة الزمرد', regionId: 'emerald_forest', x: -175, z: -325, color: '#10B981' },
    { id: 'ws_river', name: 'مناجم النهر الفضي', regionId: 'silver_river', x: 170, z: -225, color: '#F59E0B' },
    { id: 'ws_ruins', name: 'الأطلال المنسية', regionId: 'forgotten_ruins', x: 350, z: -32, color: '#38BDF8' },
    { id: 'ws_lake', name: 'بحيرة الكريستال', regionId: 'crystal_lake', x: 40, z: 295, color: '#0EA5E9' },
    { id: 'ws_observatory', name: 'مرصد النجوم', regionId: 'arcane_observatory', x: 300, z: 280, color: '#A855F7' },
    { id: 'ws_dragon', name: 'هضبة التنين', regionId: 'dragon_ridge', x: -375, z: 58, color: '#F97316' },
    { id: 'ws_frost', name: 'قمم الصقيع', regionId: 'frost_peaks', x: -270, z: -420, color: '#7DD3FC' },
  ],
  worldChests: [
    { id: 'chest_meadow_1', x: -22, z: -155, tier: 'standard', regionId: 'whispering_meadow', gold: 140, gems: 4, xp: 90 },
    { id: 'chest_forest_1', x: -165, z: -310, tier: 'standard', regionId: 'emerald_forest', gold: 170, gems: 5, xp: 110 },
    { id: 'chest_forest_2', x: -215, z: -375, tier: 'standard', regionId: 'emerald_forest', gold: 190, gems: 5, xp: 120 },
    { id: 'chest_river_1', x: 185, z: -245, tier: 'standard', regionId: 'silver_river', gold: 200, gems: 6, xp: 130 },
    { id: 'chest_ruins_1', x: 365, z: -42, tier: 'mythic', regionId: 'forgotten_ruins', gold: 310, gems: 10, xp: 180 },
    { id: 'chest_ruins_2', x: 330, z: 12, tier: 'standard', regionId: 'forgotten_ruins', gold: 185, gems: 5, xp: 120 },
    { id: 'chest_lake_1', x: 18, z: 325, tier: 'standard', regionId: 'crystal_lake', gold: 195, gems: 6, xp: 130 },
    { id: 'chest_lake_2', x: 92, z: 365, tier: 'standard', regionId: 'crystal_lake', gold: 210, gems: 6, xp: 140 },
    { id: 'chest_obs_mythic', x: 318, z: 296, tier: 'mythic', regionId: 'arcane_observatory', gold: 340, gems: 12, xp: 200 },
    { id: 'chest_ridge_1', x: -355, z: 95, tier: 'standard', regionId: 'dragon_ridge', gold: 220, gems: 7, xp: 150 },
    { id: 'chest_ridge_mythic', x: -405, z: 58, tier: 'mythic', regionId: 'dragon_ridge', gold: 420, gems: 15, xp: 240 },
    { id: 'chest_frost_mythic', x: -292, z: -450, tier: 'mythic', regionId: 'frost_peaks', gold: 390, gems: 14, xp: 230 },
  ],
  worldPortals: [
    { id: 'portal_citadel', arenaId: 'obsidian_citadel', label: 'بوابة قلعة الغسق', x: 0, z: -26, color: '#E6B85C' },
    { id: 'portal_magma', arenaId: 'magma_caldera', label: 'بوابة فوهة البركان', x: -26, z: 0, color: '#F97316' },
    { id: 'portal_glacier', arenaId: 'glacier_spire', label: 'بوابة قمة الجليد', x: 0, z: 26, color: '#38BDF8' },
    { id: 'portal_sunstone', arenaId: 'sunstone_dunes', label: 'بوابة معبد الشمس', x: 26, z: 0, color: '#FBBF24' },
    { id: 'portal_celestial', arenaId: 'celestial_sanctuary', label: 'بوابة الحرم السماوي', x: 20, z: -20, color: '#10B981' },
    { id: 'portal_abyssal', arenaId: 'abyssal_colosseum', label: 'بوابة كولوسيوم الهاوية', x: -20, z: 20, color: '#A855F7' },
  ],
  sceneryProps: generateOverworldScenery(),
  componentsSummary: [
    { title: 'قارة 14,000م ببث القطاعات (100 ضعف المساحة)', detail: 'تحمّل قطاعات 240م × 240م تلقائياً حول اللاعب وتفرّغ البعيدة لأداء 60 FPS ثابت.' },
    { title: '5 شخصيات مسالمة ونظام عمل واقتصاد نقابة', detail: 'تعاقد مع ليرا وبرون وكايل وسليم لجمع الموارد وكسب شارات النقابة والذهب.' },
    { title: 'كنوز متجددة بالقطاعات + 6 بوابات ساحات', detail: 'استكشاف لا محدود بعيداً عن القتال الإلزامي مع حفظ دائم لكل ما تفتحه وتجمعه.' },
  ],
};

export const MONSTERS: Record<MonsterArchetype, MonsterDef> = {
  ash_stalker: {
    id: 'ash_stalker',
    name: 'ذئب الرماد',
    tier: 1,
    roleLabel: 'مفترس سريع',
    description: 'يتحرك في أسراب ويلتف حول الأفتار من الجوانب لهجمات خاطفة.',
    maxHp: 85,
    damage: 13,
    speed: 6.5,
    attackRange: 2.1,
    scale: 0.92,
    bodyColor: '#47505E',
    accentColor: '#F59E0B',
    eyeColor: '#FBBF24',
    isRanged: false,
    isBoss: false,
    goldReward: 22,
    xpReward: 26,
  },
  ember_imp: {
    id: 'ember_imp',
    name: 'جني اللهب',
    tier: 1,
    roleLabel: 'رامي ناري',
    description: 'يحلق بعيداً ويرمي كرات نار ويتراجع عند اقترابك منه.',
    maxHp: 74,
    damage: 15,
    speed: 5.0,
    attackRange: 10.2,
    scale: 0.85,
    bodyColor: '#9A2E1B',
    accentColor: '#FB923C',
    eyeColor: '#FEF08A',
    isRanged: true,
    isBoss: false,
    goldReward: 26,
    xpReward: 32,
  },
  venom_crawler: {
    id: 'venom_crawler',
    name: 'زاحف السموم',
    tier: 2,
    roleLabel: 'مندفع خاطف',
    description: 'وحش سريع يختبئ قرب الأعمدة ثم يندفع نحوك بهجمة مسمومة مفاجئة.',
    maxHp: 112,
    damage: 18,
    speed: 7.4,
    attackRange: 2.3,
    scale: 0.98,
    bodyColor: '#1E3A2F',
    accentColor: '#10B981',
    eyeColor: '#A3E635',
    isRanged: false,
    isBoss: false,
    goldReward: 34,
    xpReward: 40,
  },
  frost_specter: {
    id: 'frost_specter',
    name: 'طيف الصقيع',
    tier: 2,
    roleLabel: 'ساحر جليد',
    description: 'ساحر طائر يطلق كرات صقيع عن بُعد تبطئ حركتك عند الإصابة.',
    maxHp: 120,
    damage: 19,
    speed: 4.8,
    attackRange: 11.5,
    scale: 0.98,
    bodyColor: '#1E3A5F',
    accentColor: '#38BDF8',
    eyeColor: '#E0F2FE',
    isRanged: true,
    isBoss: false,
    goldReward: 38,
    xpReward: 44,
  },
  obsidian_golem: {
    id: 'obsidian_golem',
    name: 'حارس البازلت',
    tier: 3,
    roleLabel: 'مدرّع ثقيل',
    description: 'عملاق صخري بصلابة عالية يضرب الأرض بموجة ارتدادية تحذر بدائرة حمراء.',
    maxHp: 225,
    damage: 26,
    speed: 3.3,
    attackRange: 2.9,
    scale: 1.4,
    bodyColor: '#363C47',
    accentColor: '#EA580C',
    eyeColor: '#F97316',
    isRanged: false,
    isBoss: false,
    goldReward: 50,
    xpReward: 58,
  },
  wraith_knight: {
    id: 'wraith_knight',
    name: 'شبح النصل',
    tier: 3,
    roleLabel: 'مبارز نخبوي',
    description: 'فارس شبحي يقاتل بسيف طاقة ويلتف بسرعة لاختراق دفاعاتك.',
    maxHp: 165,
    damage: 22,
    speed: 5.8,
    attackRange: 3.0,
    scale: 1.1,
    bodyColor: '#252B3B',
    accentColor: '#38BDF8',
    eyeColor: '#7DD3FC',
    isRanged: false,
    isBoss: false,
    goldReward: 45,
    xpReward: 52,
  },
  shadow_reaper: {
    id: 'shadow_reaper',
    name: 'حاصد الظلال',
    tier: 4,
    roleLabel: 'نخبة قاتل',
    description: 'كائن ظلامي نخبوي سريع الضربات يرافق موجات المنتصف والزعماء.',
    maxHp: 250,
    damage: 28,
    speed: 6.4,
    attackRange: 3.2,
    scale: 1.22,
    bodyColor: '#181824',
    accentColor: '#C084FC',
    eyeColor: '#F43F5E',
    isRanged: false,
    isBoss: false,
    goldReward: 68,
    xpReward: 78,
  },
  magma_boss: {
    id: 'magma_boss',
    name: 'سيد الحمم المدرّع',
    tier: 5,
    roleLabel: 'زعيم الفئة الأولى',
    description: 'زعيم ميدان يطلق موجات نارية محيطية ويدخل طور الغضب عند انخفاض صحته دون 50%.',
    maxHp: 640,
    damage: 34,
    speed: 4.1,
    attackRange: 3.9,
    scale: 1.85,
    bodyColor: '#2B1F23',
    accentColor: '#F97316',
    eyeColor: '#FDE047',
    isRanged: false,
    isBoss: true,
    goldReward: 195,
    xpReward: 220,
  },
  void_colossus: {
    id: 'void_colossus',
    name: 'عملاق الهاوية الأسطوري',
    tier: 6,
    roleLabel: 'زعيم السلسلة الأعلى',
    description: 'أقوى وحوش السلسلة! يجمع بين ضربات الهاوية الدائرية وإطلاق شهب الظلام.',
    maxHp: 880,
    damage: 39,
    speed: 4.3,
    attackRange: 4.2,
    scale: 2.05,
    bodyColor: '#1B162C',
    accentColor: '#A855F7',
    eyeColor: '#38BDF8',
    isRanged: false,
    isBoss: true,
    goldReward: 290,
    xpReward: 340,
  },
};

export const MONSTER_LIST: MonsterDef[] = Object.values(MONSTERS).sort((a, b) => a.tier - b.tier);

export const MAP_CHALLENGES: MapChallengeDef[] = [
  {
    id: 'ch_citadel_slayer',
    title: 'تحدي حارس القلعة',
    arenaId: 'obsidian_citadel',
    description: 'اهزم 25 وحشاً في ساحات الميدان لإثبات سيطرتك على قلعة الغسق.',
    metric: 'kills',
    target: 25,
    rewardGold: 360,
    rewardGems: 12,
    rewardXp: 240,
  },
  {
    id: 'ch_missions_master',
    title: 'مستكشف الخرائط الواسعة',
    arenaId: 'sunstone_dunes',
    description: 'أكمل 3 مهام ميدانية حية داخل الخرائط الواسعة (السيطرة على المرتفعات، المحاريب، والصيد السريع).',
    metric: 'missions',
    target: 3,
    rewardGold: 420,
    rewardGems: 15,
    rewardXp: 280,
  },
  {
    id: 'ch_boss_chain',
    title: 'كاسر سلسلة الزعماء',
    arenaId: 'abyssal_colosseum',
    description: 'اقضِ على 2 من زعماء الساحة (سيد الحمم أو عملاق الهاوية).',
    metric: 'bossKills',
    target: 2,
    rewardGold: 550,
    rewardGems: 22,
    rewardXp: 360,
  },
  {
    id: 'ch_glacier_rank',
    title: 'نخبة الحرم السماوي',
    arenaId: 'celestial_sanctuary',
    description: 'ارفع تصنيفك في المنافسة إلى 1150 نقطة عبر النزالات أو الميدان الموحد.',
    metric: 'rating',
    target: 1150,
    rewardGold: 480,
    rewardGems: 18,
    rewardXp: 300,
  },
  {
    id: 'ch_world_explorer',
    title: 'فاتح أقاليم إيثيريا الكبرى',
    arenaId: 'etheria_overworld',
    description: 'استكشف قارة إيثيريا 1400م واكتشف 6 أقاليم رئيسية عبر الرحلات البرية.',
    metric: 'regions',
    target: 6,
    rewardGold: 620,
    rewardGems: 24,
    rewardXp: 420,
  },
];

export const STAT_DEFINITIONS: {
  key: keyof AvatarConfig['stats'];
  short: string;
  label: string;
  desc: string;
  color: string;
}[] = [
  { key: 'str', short: 'القوة', label: 'القوة الجسدية (STR)', desc: 'ترفع ضرر السلاح والهجمات الثقيلة', color: '#F97316' },
  { key: 'agi', short: 'الرشاقة', label: 'الرشاقة والسرعة (AGI)', desc: 'ترفع سرعة الجري وتقلل تبريد المراوغة', color: '#38BDF8' },
  { key: 'vit', short: 'الحيوية', label: 'الحيوية والصحة (VIT)', desc: 'تزيد أقصى نقاط الصحة والاستدامة', color: '#10B981' },
  { key: 'int', short: 'الذكاء', label: 'الذكاء السحري (INT)', desc: 'تضاعف ضرر القوى الخارقة والمهارات', color: '#A855F7' },
  { key: 'def', short: 'الدفاع', label: 'الصلابة الدفاعية (DEF)', desc: 'ترفع تقليل الضرر المستلم وصلابة الصدّ', color: '#60A5FA' },
  { key: 'dex', short: 'البراعة', label: 'البراعة القتالية (DEX)', desc: 'ترفع سرعة الضربات وتقلل تبريد المهارات', color: '#E6B85C' },
  { key: 'spr', short: 'الروح', label: 'الروح والطاقة (SPR)', desc: 'تزيد سعة شريط الطاقة وسرعة شحنها', color: '#2DD4BF' },
  { key: 'lck', short: 'الحظ', label: 'الحظ والغنائم (LCK)', desc: 'تزيد فرصة الضربة الحاسمة ومضاعف الذهب', color: '#FDE047' },
];

export const SKIN_TONES = [
  { id: 'sand', label: 'قمحي دافئ', color: '#D6A57C' },
  { id: 'bronze', label: 'برونزي', color: '#B57B52' },
  { id: 'fair', label: 'فاتح', color: '#E8C5A8' },
  { id: 'deep', label: 'داكن غني', color: '#704832' },
  { id: 'obsidian', label: 'حجر أوبسيديان', color: '#39404F' },
  { id: 'steel', label: 'معدني فولاذي', color: '#8A97AB' },
  { id: 'frost', label: 'جليدي شاحب', color: '#AECAD6' },
  { id: 'ember', label: 'رماد بركاني', color: '#5A3A35' },
];

export const ARMOR_SWATCHES = [
  { label: 'فولاذ داكن', color: '#2B3442' },
  { label: 'قرمزي ملكي', color: '#991B1B' },
  { label: 'ذهبي مصهور', color: '#C9841A' },
  { label: 'زمردي حربي', color: '#0F6A52' },
  { label: 'أزرق فولاذي', color: '#1D4E7A' },
  { label: 'عاجي قديم', color: '#CFC6B6' },
  { label: 'نحاسي برونزي', color: '#8A522C' },
  { label: 'فحمي ليلي', color: '#181D24' },
  { label: 'أرجواني سحري', color: '#5B21B6' },
];

export const GLOW_SWATCHES = [
  { label: 'كهرماني', color: '#F59E0B' },
  { label: 'جليدي', color: '#38BDF8' },
  { label: 'زمردي', color: '#10B981' },
  { label: 'قرمزي', color: '#EF4444' },
  { label: 'شمسي', color: '#FDE047' },
  { label: 'أرجواني', color: '#A855F7' },
  { label: 'فضي', color: '#E2E8F0' },
];

export const DEFAULT_AVATAR: AvatarConfig = {
  name: 'طارق النصل',
  title: 'مستدعى إيثيريا',
  build: 'balanced',
  heightScale: 1.0,
  shoulderScale: 1.05,
  skinTone: '#D6A57C',
  headStyle: 'knight_helm',
  helmetColor: '#2B3442',
  eyeGlow: '#F59E0B',
  armorStyle: 'plate',
  primaryColor: '#2B3442',
  secondaryColor: '#C9841A',
  accentColor: '#F59E0B',
  backGear: 'battle_cape',
  auraStyle: 'ember_sparks',
  weaponId: 'vanguard_sword',
  powerId: 'inferno_nova',
  secondaryPowerId: 'holy_sanctuary',
  powerSlots: ['inferno_nova', 'holy_sanctuary', 'thunder_strike', 'shadow_blink'],
  secondaryPowerSlots: ['thunder_strike', 'shadow_blink', 'inferno_nova', 'holy_sanctuary'],
  activeDeckIndex: 0,
  stats: {
    str: 6,
    agi: 5,
    vit: 6,
    int: 5,
    def: 5,
    dex: 5,
    spr: 5,
    lck: 4,
  },
};

export const RIVAL_CHAMPIONS: RivalChampion[] = [
  {
    id: 'champ_zaid',
    name: 'زيد العاصف',
    rankTitle: 'فارس البرونز',
    rating: 1050,
    wins: 14,
    arenaFavorite: 'obsidian_citadel',
    aiDifficulty: 0.62,
    avatar: {
      name: 'زيد العاصف',
      title: 'حارس البوابة',
      build: 'balanced',
      heightScale: 1.0,
      shoulderScale: 1.0,
      skinTone: '#D6A57C',
      headStyle: 'spiky_hair',
      helmetColor: '#2B3442',
      eyeGlow: '#F59E0B',
      armorStyle: 'tunic',
      primaryColor: '#1D4E7A',
      secondaryColor: '#CFC6B6',
      accentColor: '#38BDF8',
      backGear: 'back_scabbard',
      auraStyle: 'none',
      weaponId: 'vanguard_sword',
      powerId: 'thunder_strike',
      secondaryPowerId: 'crystal_aegis',
      powerSlots: ['thunder_strike', 'crystal_aegis', 'inferno_nova', 'shadow_blink'],
      stats: { str: 6, agi: 6, vit: 5, int: 5, def: 5, dex: 6, spr: 5, lck: 4 },
    },
  },
  {
    id: 'champ_layla',
    name: 'ليلى الظل',
    rankTitle: 'قاتلة الفضة',
    rating: 1240,
    wins: 29,
    arenaFavorite: 'glacier_spire',
    aiDifficulty: 0.72,
    avatar: {
      name: 'ليلى الظل',
      title: 'خنجر الصقيع',
      build: 'agile',
      heightScale: 0.94,
      shoulderScale: 0.92,
      skinTone: '#E8C5A8',
      headStyle: 'shadow_hood',
      helmetColor: '#181D24',
      eyeGlow: '#10B981',
      armorStyle: 'nomad_cloak',
      primaryColor: '#181D24',
      secondaryColor: '#0F6A52',
      accentColor: '#10B981',
      backGear: 'frost_wings',
      auraStyle: 'frost_mist',
      weaponId: 'shadow_daggers',
      powerId: 'shadow_blink',
      secondaryPowerId: 'frost_vortex',
      powerSlots: ['shadow_blink', 'frost_vortex', 'thunder_strike', 'holy_sanctuary'],
      stats: { str: 6, agi: 11, vit: 5, int: 6, def: 4, dex: 10, spr: 6, lck: 8 },
    },
  },
  {
    id: 'champ_khalid',
    name: 'خالد الصاعقة',
    rankTitle: 'بطل الذهب',
    rating: 1460,
    wins: 47,
    arenaFavorite: 'magma_caldera',
    aiDifficulty: 0.82,
    avatar: {
      name: 'خالد الصاعقة',
      title: 'محطم الدروع',
      build: 'heavy',
      heightScale: 1.12,
      shoulderScale: 1.22,
      skinTone: '#B57B52',
      headStyle: 'horned_helm',
      helmetColor: '#2B3442',
      eyeGlow: '#F97316',
      armorStyle: 'titan_mail',
      primaryColor: '#991B1B',
      secondaryColor: '#C9841A',
      accentColor: '#F59E0B',
      backGear: 'flame_halo',
      auraStyle: 'ember_sparks',
      weaponId: 'bastion_mace',
      powerId: 'iron_fortress',
      secondaryPowerId: 'inferno_nova',
      powerSlots: ['iron_fortress', 'inferno_nova', 'titan_overdrive', 'crystal_aegis'],
      stats: { str: 10, agi: 5, vit: 11, int: 5, def: 11, dex: 6, spr: 6, lck: 5 },
    },
  },
  {
    id: 'champ_sara',
    name: 'سارة الشمس',
    rankTitle: 'ساحرة البلاتين',
    rating: 1680,
    wins: 68,
    arenaFavorite: 'celestial_sanctuary',
    aiDifficulty: 0.88,
    avatar: {
      name: 'سارة الشمس',
      title: 'صقر السماء',
      build: 'agile',
      heightScale: 0.98,
      shoulderScale: 0.96,
      skinTone: '#D6A57C',
      headStyle: 'phoenix_crest',
      helmetColor: '#C9841A',
      eyeGlow: '#FDE047',
      armorStyle: 'arcane_robe',
      primaryColor: '#5B21B6',
      secondaryColor: '#C9841A',
      accentColor: '#F59E0B',
      backGear: 'arcane_orbit',
      auraStyle: 'royal_gold',
      weaponId: 'arcane_tome',
      powerId: 'meteor_rain',
      secondaryPowerId: 'holy_sanctuary',
      powerSlots: ['meteor_rain', 'holy_sanctuary', 'arcane_beam', 'frost_vortex'],
      stats: { str: 6, agi: 9, vit: 7, int: 13, def: 6, dex: 9, spr: 11, lck: 8 },
    },
  },
  {
    id: 'champ_omar',
    name: 'عمر الأسطوري',
    rankTitle: 'سيد الميدان',
    rating: 1920,
    wins: 94,
    arenaFavorite: 'abyssal_colosseum',
    aiDifficulty: 0.95,
    avatar: {
      name: 'عمر الأسطوري',
      title: 'قاهر الهاوية',
      build: 'heavy',
      heightScale: 1.14,
      shoulderScale: 1.18,
      skinTone: '#39404F',
      headStyle: 'royal_crown_helm',
      helmetColor: '#181D24',
      eyeGlow: '#38BDF8',
      armorStyle: 'paladin_aegis',
      primaryColor: '#181D24',
      secondaryColor: '#C9841A',
      accentColor: '#38BDF8',
      backGear: 'war_banner',
      auraStyle: 'void_pulse',
      weaponId: 'dragon_spear',
      powerId: 'titan_overdrive',
      secondaryPowerId: 'arcane_beam',
      powerSlots: ['titan_overdrive', 'arcane_beam', 'meteor_rain', 'iron_fortress'],
      stats: { str: 12, agi: 9, vit: 11, int: 10, def: 10, dex: 10, spr: 9, lck: 8 },
    },
  },
];

export const INITIAL_QUESTS: QuestProgress[] = [
  {
    id: 'q_slay_10',
    title: 'صياد الوحوش',
    description: 'اهزم 10 وحوش في القتال الموحد أو غارة الوحوش.',
    target: 10,
    current: 0,
    rewardGold: 220,
    rewardGems: 5,
    rewardXp: 120,
    claimed: false,
    category: 'combat',
  },
  {
    id: 'q_combo_8',
    title: 'إيقاع لا يتوقف',
    description: 'حقق سلسلة ضربات متتالية (كومبو) من 8 ضربات في معركة واحدة.',
    target: 8,
    current: 0,
    rewardGold: 180,
    rewardGems: 5,
    rewardXp: 100,
    claimed: false,
    category: 'combat',
  },
  {
    id: 'q_pvp_win',
    title: 'إثبات الجدارة',
    description: 'حقق انتصاراً واحداً في نزال التنافس المباشر أو الميدان الموحد.',
    target: 1,
    current: 0,
    rewardGold: 300,
    rewardGems: 10,
    rewardXp: 180,
    claimed: false,
    category: 'pvp',
  },
  {
    id: 'q_boss_slayer',
    title: 'قاهر العمالقة',
    description: 'اهزم أحد زعماء الساحة (سيد الحمم أو عملاق الهاوية).',
    target: 1,
    current: 0,
    rewardGold: 450,
    rewardGems: 18,
    rewardXp: 280,
    claimed: false,
    category: 'combat',
  },
  {
    id: 'q_forge_avatar',
    title: 'هوية المقاتل',
    description: 'خصّص أفتارك واحفظ تعديلاتك في ورشة بناء الأفتار.',
    target: 1,
    current: 0,
    rewardGold: 150,
    rewardGems: 5,
    rewardXp: 80,
    claimed: false,
    category: 'forge',
  },
  {
    id: 'q_upgrade_weapon',
    title: 'صقل النصل',
    description: 'قم بترقية أي سلاح في الترسانة إلى المستوى 2 أو أعلى.',
    target: 1,
    current: 0,
    rewardGold: 240,
    rewardGems: 8,
    rewardXp: 140,
    claimed: false,
    category: 'forge',
  },
  {
    id: 'q_buy_gear',
    title: 'تجهيز السامان',
    description: 'اشترِ وجهّز أي قطعة سامان (خاتم، نواة درع، أو حذاء) من المتجر.',
    target: 1,
    current: 0,
    rewardGold: 260,
    rewardGems: 8,
    rewardXp: 150,
    claimed: false,
    category: 'forge',
  },
  {
    id: 'q_explore_world',
    title: 'رحّالة قارة إيثيريا',
    description: 'تجوّل في الخريطة الأساسية واكتشف 4 أقاليم جديدة.',
    target: 4,
    current: 0,
    rewardGold: 340,
    rewardGems: 14,
    rewardXp: 220,
    claimed: false,
    category: 'combat',
  },
];

export const STAT_BREAKPOINTS_INFO: {
  key: keyof AvatarConfig['stats'];
  label: string;
  formulaDesc: string;
  exampleBonus: string;
}[] = [
  { key: 'str', label: 'القوة (STR)', formulaDesc: '+2.2 ضرر + دفع +1.8%/نقطة', exampleBonus: 'تأثير ارتداد وضربات أثقل' },
  { key: 'agi', label: 'الرشاقة (AGI)', formulaDesc: '+0.2 سرعة + قفز +2.4% + مراوغة أبعد', exampleBonus: 'قفزة أعلى ومسافة دحرجة أوسع' },
  { key: 'vit', label: 'الحيوية (VIT)', formulaDesc: '+18 صحة + 1.4 ستامينا/ث + تجديد خارج القتال', exampleBonus: 'تحمل أطول للصدّ والركض' },
  { key: 'int', label: 'الذكاء (INT)', formulaDesc: '+7.5% قوة مهارات + مدى +1.6% + +0.85 مانا/ث', exampleBonus: 'حجم انفجار أوسع وتعافي أسرع' },
  { key: 'def', label: 'الدفاع (DEF)', formulaDesc: '+1.6% درع + نافذة صدّ مثالي أطول', exampleBonus: 'يعكس الصدّ المثالي دون ضرر' },
  { key: 'dex', label: 'البراعة (DEX)', formulaDesc: '+2.2% سرعة ضرب + +1.1 تعافي ستامينا/ث', exampleBonus: 'إنهاء كومبو أسرع وتعب أقل' },
  { key: 'spr', label: 'الروح (SPR)', formulaDesc: '+6 مانا قصوى + +1.35 مانا/ث', exampleBonus: 'إلقاء مهارات متواصل بلا توقف' },
  { key: 'lck', label: 'الحظ (LCK)', formulaDesc: '+1.35% حاسمة + مضاعف ضرر حرج + موارد مضاعفة', exampleBonus: 'ضربات حاسمة مدمرة وغنائم أغنى' },
];

export function computeFighterDerivedStats(
  avatar: AvatarConfig,
  weaponLevel = 1,
  equippedGear?: Record<GearSlot, GearId | null>,
  gearLevels?: Partial<Record<GearId, number>>,
  unlockedNetworkNodes?: string[]
) {
  const weapon = WEAPONS[avatar.weaponId] || WEAPONS.vanguard_sword;
  const st = avatar.stats;
  const buildHpBonus = avatar.build === 'heavy' ? 45 : avatar.build === 'agile' ? -15 : 10;
  const buildSpeedBonus = avatar.build === 'agile' ? 1.15 : avatar.build === 'heavy' ? -0.6 : 0.2;
  const buildDamageBonus = avatar.build === 'heavy' ? 5 : 0;

  let gearHp = 0;
  let gearDmg = 0;
  let gearSpeed = 0;
  let gearArmor = 0;
  let gearCrit = 0;
  let gearPwrScale = 0;
  const setCounts: Record<GearSetId, number> = { dragon: 0, bastion: 0, arcane: 0, wind: 0 };

  if (equippedGear) {
    (['relic', 'armor_core', 'boots'] as GearSlot[]).forEach((slot) => {
      const gId = equippedGear[slot];
      if (gId && GEAR_ITEMS[gId]) {
        const g = GEAR_ITEMS[gId];
        const gLv = gearLevels?.[gId] || 1;
        const gScale = 1 + (gLv - 1) * 0.16;
        gearHp += Math.round(g.hpBonus * gScale);
        gearDmg += Math.round(g.dmgBonus * gScale);
        gearSpeed += Number((g.speedBonus * (1 + (gLv - 1) * 0.08)).toFixed(2));
        gearArmor += g.armorBonus * (1 + (gLv - 1) * 0.1);
        gearCrit += Math.round(g.critBonus * gScale);
        gearPwrScale += g.pwrScaleBonus * gScale;
        if (g.setId) setCounts[g.setId] += 1;
      }
    });
  }

  const activeSetBonuses: { setId: GearSetId; count: number; name: string; label: string }[] = [];
  let setDmgMult = 1;
  let setCritBonus = 0;
  let setLifestealPct = 0;
  let setHpBonus = 0;
  let setArmorBonus = 0;
  let setParryBonus = 0;
  let setStaminaRegenMult = 1;
  let setManaBonus = 0;
  let setManaRegenMult = 1;
  let setRadiusMult = 1;
  let setSpeedMult = 1;

  if (setCounts.dragon >= 2) {
    setDmgMult += 0.15;
    activeSetBonuses.push({ setId: 'dragon', count: setCounts.dragon, name: GEAR_SETS.dragon.name, label: GEAR_SETS.dragon.bonus2Label });
  }
  if (setCounts.dragon >= 3) {
    setCritBonus += 18;
    setLifestealPct += 0.05;
    activeSetBonuses.push({ setId: 'dragon', count: setCounts.dragon, name: GEAR_SETS.dragon.name, label: GEAR_SETS.dragon.bonus3Label });
  }
  if (setCounts.bastion >= 2) {
    setHpBonus += 90;
    setArmorBonus += 0.08;
    activeSetBonuses.push({ setId: 'bastion', count: setCounts.bastion, name: GEAR_SETS.bastion.name, label: GEAR_SETS.bastion.bonus2Label });
  }
  if (setCounts.bastion >= 3) {
    setParryBonus += 0.12;
    setStaminaRegenMult += 0.18;
    activeSetBonuses.push({ setId: 'bastion', count: setCounts.bastion, name: GEAR_SETS.bastion.name, label: GEAR_SETS.bastion.bonus3Label });
  }
  if (setCounts.arcane >= 2) {
    setManaBonus += 25;
    setManaRegenMult += 0.2;
    activeSetBonuses.push({ setId: 'arcane', count: setCounts.arcane, name: GEAR_SETS.arcane.name, label: GEAR_SETS.arcane.bonus2Label });
  }
  if (setCounts.arcane >= 3) {
    setRadiusMult += 0.16;
    setSpeedMult += 0.1;
    activeSetBonuses.push({ setId: 'arcane', count: setCounts.arcane, name: GEAR_SETS.arcane.name, label: GEAR_SETS.arcane.bonus3Label });
  }

  const netBonus = unlockedNetworkNodes ? computeSkillNetworkBonuses(unlockedNetworkNodes) : null;
  const levelMult = 1 + (weaponLevel - 1) * 0.16;
  const maxHp = Math.round(140 + (st.vit || 5) * 18 + (st.def || 5) * 4 + buildHpBonus + gearHp + setHpBonus);
  const magicBonus = weapon.role === 'magic' || weapon.role === 'support' ? (st.int || 5) * 1.9 : (st.int || 5) * 0.6;
  const attackDamage = Math.round(
    (weapon.damage * levelMult + (st.str || 5) * 2.2 + magicBonus + buildDamageBonus + gearDmg) * setDmgMult
  );
  const heavyDamage = Math.round(
    (weapon.heavyDamage * levelMult + (st.str || 5) * 3.1 + magicBonus * 1.25 + buildDamageBonus * 1.4 + gearDmg * 1.3) * setDmgMult
  );
  const moveSpeed = Number(
    ((6.3 + (st.agi || 5) * 0.2 + (st.dex || 5) * 0.06 + buildSpeedBonus + gearSpeed) * setSpeedMult).toFixed(2)
  );
  const critChance = Math.min(82, Math.round(weapon.critBonus + (st.agi || 5) * 0.9 + (st.lck || 4) * 1.35 + gearCrit + setCritBonus));
  const critMult = Number((1.6 + Math.min(0.65, (st.lck || 4) * 0.025)).toFixed(2));
  const powerScale = Number(((1 + (st.int || 5) * 0.075 + (st.spr || 5) * 0.025 + gearPwrScale) * setDmgMult).toFixed(2));

  // Dual-Resource Economy: Stamina (Physical maneuvers) + Mana (Skills/Spells)
  const maxStamina = Math.round(90 + (st.vit || 5) * 5 + (st.agi || 5) * 2 + (avatar.build === 'heavy' ? 10 : 0));
  const staminaRegen = Number(
    ((18 + (st.vit || 5) * 1.4 + (st.dex || 5) * 1.1) * setStaminaRegenMult).toFixed(1)
  );
  const maxMana = Math.round(95 + (st.spr || 5) * 6 + (st.int || 5) * 2 + setManaBonus + (netBonus ? netBonus.bonusEnergy : 0));
  const manaRegen = Number(
    ((10.5 + (st.spr || 5) * 1.35 + (st.int || 5) * 0.85 + (weapon.role === 'support' ? 4.0 : 0)) * setManaRegenMult).toFixed(1)
  );

  const armorReduction = Math.min(
    0.66,
    0.04 + (st.def || 5) * 0.016 + (st.vit || 5) * 0.005 + (avatar.build === 'heavy' ? 0.05 : 0) + (weapon.armorBonus || 0) + gearArmor + setArmorBonus
  );
  const attackSpeedMult = Number((1 + Math.min(0.55, (st.dex || 5) * 0.022)).toFixed(2));
  const cooldownReduction = Number(Math.min(0.36, (st.dex || 5) * 0.015).toFixed(2));
  const lootMultiplier = Number((1 + (st.lck || 4) * 0.035).toFixed(2));

  // Tangible Physical & Tactical Stat Perks
  const knockbackMult = Number((1 + (st.str || 5) * 0.018).toFixed(2));
  const jumpHeightMult = Number((1 + Math.min(0.38, (st.agi || 5) * 0.022)).toFixed(2));
  const dodgeDistMult = Number((1 + Math.min(0.45, (st.agi || 5) * 0.025)).toFixed(2));
  const parryWindowSec = Number(Math.min(0.46, 0.22 + (st.def || 5) * 0.009 + setParryBonus).toFixed(2));
  const powerRadiusMult = Number(((1 + Math.min(0.4, (st.int || 5) * 0.016)) * setRadiusMult).toFixed(2));
  const outOfCombatHpRegen = Number(((st.vit || 5) * 0.55).toFixed(1));
  const resourceYieldMult = Number((1 + (st.lck || 4) * 0.04).toFixed(2));

  return {
    maxHp,
    attackDamage,
    heavyDamage,
    moveSpeed,
    critChance,
    critMult,
    powerScale,
    maxStamina,
    staminaRegen,
    maxMana,
    manaRegen,
    maxEnergy: maxMana,
    energyRegen: manaRegen,
    armorReduction,
    attackSpeedMult,
    cooldownReduction,
    lootMultiplier,
    knockbackMult,
    jumpHeightMult,
    dodgeDistMult,
    parryWindowSec,
    powerRadiusMult,
    outOfCombatHpRegen,
    resourceYieldMult,
    setLifestealPct,
    activeSetBonuses,
  };
}

export function getRankLabel(rating: number): string {
  if (rating >= 1850) return 'الأسطوري';
  if (rating >= 1600) return 'البلاتيني';
  if (rating >= 1350) return 'الذهبي';
  if (rating >= 1120) return 'الفضي';
  return 'البرونزي';
}

export function xpForNextLevel(level: number): number {
  return Math.round(180 * Math.pow(1.28, level - 1));
}

export const SECRET_WORLD_BOSSES: SecretBossDef[] = [
  {
    id: 'sb_crimson_ignis',
    name: 'إغنيس القرمزي، وريث البركان',
    title: 'سيد الحمم السري',
    archetype: 'magma_boss',
    hpMult: 1.55,
    dmgMult: 1.35,
    scaleMult: 1.38,
    chunkX: 4,
    chunkZ: 0,
    x: 960,
    z: 0,
    accentColor: '#F97316',
    auraColor: '#EF4444',
    rewardGold: 950,
    rewardGems: 28,
    rewardMarks: 45,
    rewardXp: 520,
    unlockTitle: 'سليل الجحيم القرمزي',
  },
  {
    id: 'sb_abyss_malakor',
    name: 'مالاكور هاوية الصمت',
    title: 'تاج الفراغ الأبدي',
    archetype: 'void_colossus',
    hpMult: 1.75,
    dmgMult: 1.45,
    scaleMult: 1.45,
    chunkX: -5,
    chunkZ: 2,
    x: -1200,
    z: 480,
    accentColor: '#A855F7',
    auraColor: '#C084FC',
    rewardGold: 1200,
    rewardGems: 35,
    rewardMarks: 60,
    rewardXp: 680,
    unlockTitle: 'قاهر الهاوية الصامتة',
  },
  {
    id: 'sb_glacier_valkor',
    name: 'فالكور حارس الصقيع الأزلي',
    title: 'شبح القطب الجليدي',
    archetype: 'wraith_knight',
    hpMult: 1.6,
    dmgMult: 1.4,
    scaleMult: 1.32,
    chunkX: 2,
    chunkZ: -6,
    x: 480,
    z: -1440,
    accentColor: '#38BDF8',
    auraColor: '#7DD3FC',
    rewardGold: 1080,
    rewardGems: 32,
    rewardMarks: 52,
    rewardXp: 600,
    unlockTitle: 'صائد الصقيع الأزلي',
  },
  {
    id: 'sb_obsidian_kranos',
    name: 'كرانوس حارس السديم العتيق',
    title: 'عملاق البازلت المحرّم',
    archetype: 'obsidian_golem',
    hpMult: 1.9,
    dmgMult: 1.5,
    scaleMult: 1.5,
    chunkX: -6,
    chunkZ: -5,
    x: -1440,
    z: -1200,
    accentColor: '#EAB308',
    auraColor: '#FDE047',
    rewardGold: 1450,
    rewardGems: 42,
    rewardMarks: 75,
    rewardXp: 820,
    unlockTitle: 'فارس البازلت المطلق',
  },
];

export const WORLD_EVENT_ZONES: WorldEventZoneDef[] = [
  {
    id: 'evt_ether_storm_east',
    name: 'عاصفة الأثير العظمى',
    kind: 'ether_storm',
    description: 'اضطراب سحري يجذب موجتين من وحوش الأثير المتشظية في سهول الشرق.',
    chunkX: 2,
    chunkZ: 2,
    x: 480,
    z: 480,
    radius: 20,
    color: '#38BDF8',
    waveCount: 2,
    rewardGold: 520,
    rewardGems: 16,
    rewardMarks: 28,
    rewardXp: 340,
  },
  {
    id: 'evt_meteor_rift_south',
    name: 'صدع النيازك الملتهب',
    kind: 'meteor_rift',
    description: 'شظايا نجمية ساقطة تفتح بوابة لهجمات العفاريت وعمالقة الصخر.',
    chunkX: -3,
    chunkZ: 4,
    x: -720,
    z: 960,
    radius: 20,
    color: '#F97316',
    waveCount: 2,
    rewardGold: 620,
    rewardGems: 19,
    rewardMarks: 34,
    rewardXp: 400,
  },
  {
    id: 'evt_blood_altar_west',
    name: 'مذبح الدم العتيق',
    kind: 'blood_altar',
    description: 'أطلال ملعونة تستدعي فرسان الأطياف وأسياد السموم لحماية الكنز.',
    chunkX: -4,
    chunkZ: -2,
    x: -960,
    z: -480,
    radius: 22,
    color: '#EF4444',
    waveCount: 2,
    rewardGold: 740,
    rewardGems: 22,
    rewardMarks: 40,
    rewardXp: 460,
  },
  {
    id: 'evt_celestial_convergence',
    name: 'تقاطع البلورات الأزلي',
    kind: 'ether_storm',
    description: 'نقطة التقاء طاقة القارة الحرة — تحدٍ مكثف لمقاتلي الرتب العليا.',
    chunkX: 5,
    chunkZ: -4,
    x: 1200,
    z: -960,
    radius: 22,
    color: '#A855F7',
    waveCount: 2,
    rewardGold: 860,
    rewardGems: 26,
    rewardMarks: 48,
    rewardXp: 540,
  },
];

export const DAILY_CHALLENGE_POOL: DailyChallengeDef[] = [
  {
    id: 'daily_slay_15',
    title: 'حصاد الوحوش اليومي',
    description: 'اهزم 15 وحشاً في القارة المفتوحة أو وضع الغارة.',
    metric: 'kills',
    target: 15,
    rewardGold: 320,
    rewardGems: 12,
    rewardMarks: 18,
    rewardXp: 210,
  },
  {
    id: 'daily_crits_12',
    title: 'دقة النصل الحاسمة',
    description: 'سجّل 12 ضربة حرجة في أي معركة.',
    metric: 'crits',
    target: 12,
    rewardGold: 280,
    rewardGems: 10,
    rewardMarks: 15,
    rewardXp: 180,
  },
  {
    id: 'daily_fusions_3',
    title: 'انفجار المهارات المدمجة',
    description: 'أطلق 3 مهارات قتالية فائقة أو مهارات دمج.',
    metric: 'fusions',
    target: 3,
    rewardGold: 350,
    rewardGems: 14,
    rewardMarks: 20,
    rewardXp: 240,
  },
  {
    id: 'daily_boss_1',
    title: 'إسقاط عملاق',
    description: 'اهزم زعيماً واحداً أو زعيماً سرياً اليوم.',
    metric: 'bossKills',
    target: 1,
    rewardGold: 420,
    rewardGems: 16,
    rewardMarks: 25,
    rewardXp: 280,
  },
  {
    id: 'daily_chunks_4',
    title: 'مسح قطاعات إيثيريا',
    description: 'استكشف 4 قطاعات جديدة في الخريطة المبثوثة.',
    metric: 'chunks',
    target: 4,
    rewardGold: 300,
    rewardGems: 11,
    rewardMarks: 18,
    rewardXp: 200,
  },
  {
    id: 'daily_gather_5',
    title: 'جامع موارد القارة',
    description: 'اجمع 5 موارد (خام، بلورات، أو أعشاب) من إيثيريا.',
    metric: 'gather',
    target: 5,
    rewardGold: 260,
    rewardGems: 10,
    rewardMarks: 16,
    rewardXp: 170,
  },
  {
    id: 'daily_pvp_1',
    title: 'تفوّق النزال',
    description: 'احسم نزال تنافس واحد لصالحك.',
    metric: 'pvpWins',
    target: 1,
    rewardGold: 390,
    rewardGems: 15,
    rewardMarks: 24,
    rewardXp: 260,
  },
  {
    id: 'daily_slay_25',
    title: 'تطهير الحدود',
    description: 'اهزم 25 وحشاً لحماية طرق القوافل.',
    metric: 'kills',
    target: 25,
    rewardGold: 480,
    rewardGems: 18,
    rewardMarks: 30,
    rewardXp: 320,
  },
];

export function getTodayDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function pickDailyChallengesForDate(dateKey: string): DailyChallengeProgress[] {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  const pool = [...DAILY_CHALLENGE_POOL];
  const picked: DailyChallengeProgress[] = [];
  for (let i = 0; i < 3 && pool.length > 0; i++) {
    const idx = (hash + i * 7) % pool.length;
    const def = pool.splice(idx, 1)[0];
    picked.push({
      ...def,
      current: 0,
      claimed: false,
    });
  }
  return picked;
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    id: 'ach_first_blood_50',
    title: 'جلاد جحافل إيثيريا',
    description: 'اهزم 50 وحشاً في مختلف الميادين والقارة المفتوحة.',
    metric: 'kills',
    target: 50,
    rewardTitle: 'جلاد الوحوش',
    rewardGold: 450,
    rewardGems: 15,
    rewardMarks: 25,
  },
  {
    id: 'ach_slayer_250',
    title: 'عاصفة النصل الأبدية',
    description: 'اهزم 250 وحشاً لتثبيت هيمنتك القتالية.',
    metric: 'kills',
    target: 250,
    rewardTitle: 'سيد المذابح',
    rewardGold: 1100,
    rewardGems: 35,
    rewardMarks: 60,
  },
  {
    id: 'ach_crit_master',
    title: 'عين الصياد الملكي',
    description: 'نفّذ 40 ضربة حرجة قاتلة عبر مهاراتك وسلاحك.',
    metric: 'crits',
    target: 40,
    rewardTitle: 'عين الصقر الحاسمة',
    rewardGold: 620,
    rewardGems: 22,
    rewardMarks: 35,
  },
  {
    id: 'ach_fusion_architect',
    title: 'مهندس الدمج السماوي',
    description: 'أطلق 15 مهارة دمج أو قدرة قتالية قصوى.',
    metric: 'fusions',
    target: 15,
    rewardTitle: 'حكيم الدمج الملكي',
    rewardGold: 700,
    rewardGems: 24,
    rewardMarks: 40,
  },
  {
    id: 'ach_boss_hunter',
    title: 'مُحطّم التواجد الطاغي',
    description: 'اهزم 5 زعماء أقوياء في الغارات والساحات.',
    metric: 'bossKills',
    target: 5,
    rewardTitle: 'مُبيد العمالقة',
    rewardGold: 850,
    rewardGems: 28,
    rewardMarks: 48,
  },
  {
    id: 'ach_secret_boss_first',
    title: 'كاشف المزارات المحرّمة',
    description: 'اهزم أول زعيم سري في أطراف قارة إيثيريا.',
    metric: 'secretBosses',
    target: 1,
    rewardTitle: 'صائد الأساطير السرية',
    rewardGold: 900,
    rewardGems: 30,
    rewardMarks: 55,
  },
  {
    id: 'ach_secret_boss_all',
    title: 'سيد الأختام الأربعة',
    description: 'اهزم جميع الزعماء السريين الأربعة في القارة.',
    metric: 'secretBosses',
    target: 4,
    rewardTitle: 'العاهل المطلق لإيثيريا',
    rewardGold: 2200,
    rewardGems: 75,
    rewardMarks: 140,
  },
  {
    id: 'ach_world_events',
    title: 'حامي توازن الأثير',
    description: 'أكمل 3 مناطق أحداث ديناميكية في القارة المفتوحة.',
    metric: 'worldEvents',
    target: 3,
    rewardTitle: 'حارس الصدع الأزلي',
    rewardGold: 980,
    rewardGems: 32,
    rewardMarks: 58,
  },
  {
    id: 'ach_chunk_explorer',
    title: 'رّسام الخرائط المجهولة',
    description: 'افتح وبث 20 قطاعاً في قارة إيثيريا الشاسعة.',
    metric: 'chunks',
    target: 20,
    rewardTitle: 'رائد الآفاق المئة',
    rewardGold: 750,
    rewardGems: 25,
    rewardMarks: 45,
  },
  {
    id: 'ach_arena_rating',
    title: 'عرش الأبطال الأسطوري',
    description: 'وصل بتصنيف النزال إلى 1450 نقطة.',
    metric: 'rating',
    target: 1450,
    rewardTitle: 'بطل الميدان المتوّج',
    rewardGold: 1200,
    rewardGems: 40,
    rewardMarks: 70,
  },
];

export const DEFAULT_TITLES: TitleDef[] = [
  { id: 't_novice', label: 'مبارز ناشئ', source: 'لقب البداية', accentColor: '#94A3B8' },
  { id: 't_summoned', label: 'البطل المستدعى', source: 'بوابة الاستدعاء', accentColor: '#38BDF8' },
  { id: 't_sword', label: 'سيف إيثيريا', source: 'لقب الحرس الملكي', accentColor: '#F59E0B' },
];

export const EXCLUSIVE_TITLES: TitleDef[] = [
  ...DEFAULT_TITLES,
  ...ACHIEVEMENT_DEFS.map((a) => ({
    id: `t_${a.id}`,
    label: a.rewardTitle,
    source: `إنجاز: ${a.title}`,
    accentColor: '#EAB308',
  })),
  ...SECRET_WORLD_BOSSES.filter((b) => Boolean(b.unlockTitle)).map((b) => ({
    id: `t_${b.id}`,
    label: b.unlockTitle as string,
    source: `زعيم سري: ${b.name}`,
    accentColor: b.accentColor,
  })),
];


