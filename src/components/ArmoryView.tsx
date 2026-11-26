import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowUpCircle,
  Check,
  Gift,
  Hammer,
  Lock,
  Shield,
  Sparkles,
  Swords,
  Trash2,
} from 'lucide-react';
import type {
  ConsumableId,
  GearId,
  GearSlot,
  OverworldNodeKind,
  PlayerProfile,
  WeaponId,
  WeaponRole,
} from '../types/game';
import {
  CONSUMABLE_LIST,
  CRAFTING_RECIPES,
  GEAR_ITEMS,
  GEAR_LIST,
  GEAR_SETS,
  RANK_META,
  WEAPONS,
  WEAPON_LIST,
  computeFighterDerivedStats,
  getGearRank,
  getWeaponRank,
} from '../data/gameCatalog';
import { AvatarPreview3D } from './AvatarPreview3D';

interface ArmoryViewProps {
  profile: PlayerProfile;
  onUnlockOrEquip: (weaponId: WeaponId) => { ok: boolean; message: string };
  onUpgradeWeapon: (weaponId: WeaponId, useStone?: boolean) => { ok: boolean; message: string };
  onUnlockOrEquipGear: (gearId: GearId) => { ok: boolean; message: string };
  onUpgradeGear?: (gearId: GearId, useStone?: boolean) => { ok: boolean; message: string };
  onUnequipGear: (slot: GearSlot) => void;
  onBuyConsumable: (id: ConsumableId, qty?: number) => { ok: boolean; message: string };
  onCraftRecipe?: (recipeId: string) => { ok: boolean; message: string };
  onBuyChest: (type: 'warrior' | 'mythic') => boolean;
}

type ShopTab = 'weapons' | 'gear' | 'consumables' | 'crafting';
type RoleFilter = 'all' | WeaponRole;
type GearFilter = 'all' | GearSlot;

const ROLE_LABELS: Record<WeaponRole, string> = {
  melee: 'قتال قريب',
  magic: 'سحر',
  support: 'دعم واستشفاء',
  defense: 'دفاع ودرع',
};

const GEAR_SLOTS: { slot: GearSlot; title: string }[] = [
  { slot: 'relic', title: 'تميمة / خاتم' },
  { slot: 'armor_core', title: 'نواة الدرع' },
  { slot: 'boots', title: 'حذاء وقفاز' },
];

export const ArmoryView: React.FC<ArmoryViewProps> = ({
  profile,
  onUnlockOrEquip,
  onUpgradeWeapon,
  onUnlockOrEquipGear,
  onUpgradeGear,
  onUnequipGear,
  onBuyConsumable,
  onCraftRecipe,
  onBuyChest,
}) => {
  const [shopTab, setShopTab] = useState<ShopTab>('weapons');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [gearFilter, setGearFilter] = useState<GearFilter>('all');
  const [inspectedId, setInspectedId] = useState<WeaponId>(profile.avatar.weaponId);
  const [previewAct, setPreviewAct] = useState<'idle' | 'attack'>('attack');
  const [notice, setNotice] = useState('');
  const noticeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) {
        window.clearTimeout(noticeTimerRef.current);
      }
    };
  }, []);

  const inspected = WEAPONS[inspectedId];
  const isUnlocked = profile.unlockedWeapons.includes(inspectedId);
  const isEquipped = profile.avatar.weaponId === inspectedId;
  const level = profile.weaponLevels[inspectedId] || 1;
  const upgradeCost = level * 220;
  const scaledDmg = Math.round(inspected.damage * (1 + (level - 1) * 0.16));
  const scaledHeavy = Math.round(inspected.heavyDamage * (1 + (level - 1) * 0.16));
  const inspectedRank = getWeaponRank(inspectedId, level);
  const inspectedRankMeta = RANK_META[inspectedRank];

  const equippedWeapon = WEAPONS[profile.avatar.weaponId];
  const weaponLvEquipped = profile.weaponLevels[profile.avatar.weaponId] || 1;
  const eqScaledDmg = Math.round(equippedWeapon.damage * (1 + (weaponLvEquipped - 1) * 0.16));
  const eqScaledHeavy = Math.round(equippedWeapon.heavyDamage * (1 + (weaponLvEquipped - 1) * 0.16));

  const derivedWithGear = computeFighterDerivedStats(
    profile.avatar,
    weaponLvEquipped,
    profile.equippedGear,
    profile.gearLevels,
    profile.unlockedNetworkNodes
  );

  const filteredWeapons =
    roleFilter === 'all' ? WEAPON_LIST : WEAPON_LIST.filter((w) => w.role === roleFilter);
  const filteredGear =
    gearFilter === 'all' ? GEAR_LIST : GEAR_LIST.filter((g) => g.slot === gearFilter);

  const showNotice = (msg: string) => {
    setNotice(msg);
    if (noticeTimerRef.current) {
      window.clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = window.setTimeout(() => {
      setNotice('');
      noticeTimerRef.current = null;
    }, 2600);
  };

  return (
    <main className="ui-shell-container space-y-[var(--ui-section-gap)]">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E6B85C]/20 pb-5 landscape-compact-header">
        <div>
          <h1 className="font-display ui-section-title font-extrabold text-[#F1F5F9]">
            المتجر والترسانة والسامان والصياغة
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            أسلحة ومعدات برتب المحارب ({'E → SS'}) · مكافآت أطقم السامان · ترقية المستويات · وطاولة الصياغة من موارد القارة.
          </p>
        </div>
        <div className="text-sm text-[#CBD5E1] flex flex-wrap items-center gap-3 bg-[#101829]/85 border border-[#E6B85C]/20 rounded-xl px-4 py-2">
          <span>
            الذهب: <strong className="font-mono-num text-[#E6B85C]">{profile.gold}</strong>
          </span>
          <span aria-hidden="true" className="text-[#475569]">·</span>
          <span>
            الجواهر: <strong className="font-mono-num text-[#38BDF8]">{profile.gems}</strong>
          </span>
          <span aria-hidden="true" className="text-[#475569]">·</span>
          <span>
            الأوسمة: <strong className="font-mono-num text-[#10B981]">{profile.guildMarks}</strong>
          </span>
          <span aria-hidden="true" className="text-[#475569]">·</span>
          <span>
            أحجار الصقل: <strong className="font-mono-num text-[#FDE047]">{profile.sharpeningStones || 0}</strong>
          </span>
        </div>
      </div>

      {/* Store Main Tabs */}
      <div className="flex flex-nowrap items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto no-scrollbar">
        {(
          [
            { id: 'weapons', label: `1. متجر الأسلحة (${WEAPON_LIST.length})` },
            { id: 'gear', label: `2. السامان والأطقم (${GEAR_LIST.length})` },
            { id: 'consumables', label: `3. الجرعات والأدوات (${CONSUMABLE_LIST.length})` },
            { id: 'crafting', label: `4. طاولة الصياغة (${CRAFTING_RECIPES.length})` },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setShopTab(t.id)}
            className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              shopTab === t.id
                ? 'bg-[#E6B85C] text-[#0A0F1A] border-[#F5D076] shadow-md shadow-[#E6B85C]/15'
                : 'bg-[#121B2D]/90 text-[#CBD5E1] border-white/10 hover:text-[#F1F5F9]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {notice && (
        <div className="px-4 py-2.5 text-sm text-[#FDE68A] bg-[#1B1914] border border-[#E6B85C]/45 rounded-lg">
          {notice}
        </div>
      )}

      {/* TAB 1: WEAPONS */}
      {shopTab === 'weapons' && (
        <div className="space-y-5">
          {/* Role Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: 'all', label: 'جميع الأسلحة' },
                { id: 'melee', label: 'قتال قريب وقوس' },
                { id: 'magic', label: 'أسلحة السحر' },
                { id: 'support', label: 'أسلحة الدعم والاستشفاء' },
                { id: 'defense', label: 'أسلحة الدفاع والدرع' },
              ] as const
            ).map((rf) => (
              <button
                key={rf.id}
                type="button"
                onClick={() => setRoleFilter(rf.id)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md border transition-colors cursor-pointer ${
                  roleFilter === rf.id
                    ? 'bg-[#18253C] border-[#E6B85C] text-[#F1F5F9]'
                    : 'bg-[#121B2D]/90 border-white/10 text-[#94A3B8] hover:text-[#F1F5F9]'
                }`}
              >
                {rf.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 landscape-split-12 gap-6 items-stretch">
            {/* Live 3D Weapon Showcase */}
            <section className="lg:col-span-5 landscape-span-5 flex flex-col bg-[#121B2D]/90 backdrop-blur-md border border-[#E6B85C]/20 rounded-xl overflow-hidden shadow-xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0D1422]/60">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-base font-bold text-[#F1F5F9]">
                      {inspected.name}
                    </h2>
                    <span
                      className="text-[10px] font-mono-num font-extrabold px-1.5 py-0.5 rounded border"
                      style={{
                        color: inspectedRankMeta.color,
                        backgroundColor: inspectedRankMeta.bg,
                        borderColor: inspectedRankMeta.border,
                      }}
                    >
                      {inspectedRank}
                    </span>
                  </div>
                  <p className="text-xs text-[#94A3B8]">
                    {inspected.category} · المستوى <span className="font-mono-num">{level}/5</span> ({inspectedRankMeta.perkDesc})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewAct((a) => (a === 'attack' ? 'idle' : 'attack'))}
                  className="px-3 py-1.5 text-xs font-semibold text-[#F1F5F9] bg-[#18253C] hover:bg-[#223454] border border-[#E6B85C]/25 rounded-md cursor-pointer transition-colors"
                >
                  {previewAct === 'attack' ? 'إيقاف الحركة' : 'اختبار الضربة'}
                </button>
              </div>

              <AvatarPreview3D
                avatar={{ ...profile.avatar, weaponId: inspectedId }}
                quality={profile.quality}
                renderEngine={profile.renderEngine}
                weaponLevel={level}
                previewAction={previewAct}
                className="flex-1 h-[clamp(240px,36dvh,360px)] lg:h-auto lg:min-h-[320px] landscape-preview-box"
              />

              <div className="p-5 border-t border-white/10 bg-[#0D1422] space-y-4">
                <p className="text-xs text-[#CBD5E1] leading-relaxed">{inspected.description}</p>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#8F9BAE]">التخصص القتالي</span>
                    <span className="font-semibold text-[#38BDF8]">
                      {ROLE_LABELS[inspected.role]}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8F9BAE]">الضرر الأساسي</span>
                    <span className="font-mono-num font-semibold text-[#F2F4F8]">
                      {scaledDmg}
                      {!isEquipped && scaledDmg !== eqScaledDmg && (
                        <span className={`mr-1.5 ${scaledDmg > eqScaledDmg ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                          ({scaledDmg > eqScaledDmg ? '+' : ''}{scaledDmg - eqScaledDmg})
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8F9BAE]">مهارة السلاح ({inspected.heavySkillName})</span>
                    <span className="font-mono-num font-semibold text-[#F59E0B]">
                      {scaledHeavy}
                      {!isEquipped && scaledHeavy !== eqScaledHeavy && (
                        <span className={`mr-1.5 ${scaledHeavy > eqScaledHeavy ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                          ({scaledHeavy > eqScaledHeavy ? '+' : ''}{scaledHeavy - eqScaledHeavy})
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8F9BAE]">سرعة الهجوم / المدى</span>
                    <span className="font-mono-num text-[#F2F4F8]">
                      {inspected.attackSpeed} ض/ث · {inspected.range}م
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8F9BAE]">إضافة الضربة الحاسمة</span>
                    <span className="font-mono-num text-[#10B981]">
                      +{inspected.critBonus}%
                      {!isEquipped && inspected.critBonus !== equippedWeapon.critBonus && (
                        <span className={`mr-1.5 ${inspected.critBonus > equippedWeapon.critBonus ? 'text-[#34D399]' : 'text-[#EF4444]'}`}>
                          ({inspected.critBonus > equippedWeapon.critBonus ? '+' : ''}{inspected.critBonus - equippedWeapon.critBonus}%)
                        </span>
                      )}
                    </span>
                  </div>
                  {inspected.armorBonus ? (
                    <div className="flex justify-between">
                      <span className="text-[#8F9BAE]">مكافأة الدرع وتقليل الضرر</span>
                      <span className="font-mono-num text-[#60A5FA]">
                        +{Math.round(inspected.armorBonus * 100)}%
                      </span>
                    </div>
                  ) : null}
                  {inspected.healOnHitPct ? (
                    <div className="flex justify-between">
                      <span className="text-[#8F9BAE]">استشفاء عند كل إصابة</span>
                      <span className="font-mono-num text-[#10B981]">
                        +{Math.round(inspected.healOnHitPct * 100)}% صحة
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const res = onUnlockOrEquip(inspectedId);
                      showNotice(res.message);
                    }}
                    className={`flex-1 min-w-[140px] py-2.5 px-4 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                      isEquipped
                        ? 'bg-[#172B29] text-[#10B981] border border-[#10B981]/30'
                        : 'bg-[#E6B85C] hover:bg-[#F5D076] text-[#0A0F1A]'
                    }`}
                  >
                    {isEquipped ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>سلاحك النشط</span>
                      </>
                    ) : isUnlocked ? (
                      <>
                        <Swords className="w-4 h-4" />
                        <span>تجهيز السلاح</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>
                          شراء ({inspected.costGold} ذهب
                          {inspected.costGems > 0 ? ` + ${inspected.costGems} جوهرة` : ''})
                        </span>
                      </>
                    )}
                  </button>

                  {isUnlocked && level < 5 && (
                    <button
                      type="button"
                      onClick={() => {
                        const res = onUpgradeWeapon(inspectedId, false);
                        showNotice(res.message);
                      }}
                      className="py-2.5 px-3 text-xs font-bold text-[#F1F5F9] bg-[#18253C] hover:bg-[#223454] border border-white/15 rounded-lg flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                    >
                      <ArrowUpCircle className="w-4 h-4 text-[#E6B85C]" />
                      <span>ترقية ({upgradeCost} ذهب)</span>
                    </button>
                  )}

                  {isUnlocked && level < 5 && (profile.sharpeningStones || 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const res = onUpgradeWeapon(inspectedId, true);
                        showNotice(res.message);
                      }}
                      className="py-2.5 px-3 text-xs font-bold text-[#0A0F1A] bg-[#FDE047] hover:bg-[#FEF08A] rounded-lg flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>صقل مجاني (×1 حجر)</span>
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* 12-Weapon Grid */}
            <section className="lg:col-span-7 landscape-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4 content-start">
              {filteredWeapons.map((w) => {
                const unlocked = profile.unlockedWeapons.includes(w.id);
                const equipped = profile.avatar.weaponId === w.id;
                const selected = inspectedId === w.id;
                const lv = profile.weaponLevels[w.id] || 1;
                const dmg = Math.round(w.damage * (1 + (lv - 1) * 0.16));
                const wRank = getWeaponRank(w.id, lv);
                const wRankMeta = RANK_META[wRank];

                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setInspectedId(w.id)}
                    className={`p-4 rounded-xl border text-right transition-colors flex flex-col justify-between gap-3 cursor-pointer ${
                      selected
                        ? 'bg-[#18253C] border-[#E6B85C]'
                        : 'bg-[#121B2D]/90 border-white/10 hover:border-[#E6B85C]/40'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display text-base font-bold text-[#F1F5F9] flex items-center gap-1.5">
                          <span>{w.name}</span>
                          <span
                            className="text-[10px] font-mono-num px-1.5 py-0.5 rounded border"
                            style={{ color: wRankMeta.color, backgroundColor: wRankMeta.bg, borderColor: wRankMeta.border }}
                          >
                            {wRank}
                          </span>
                        </span>
                        <span className="text-xs font-mono-num text-[#94A3B8]">
                          {unlocked
                            ? `م${lv}`
                            : `${w.costGold} ذهب${w.costGems > 0 ? ` + ${w.costGems}ج` : ''}`}
                        </span>
                      </div>
                      <div className="text-xs text-[#94A3B8]">
                        {ROLE_LABELS[w.role]} · {w.isRanged ? 'بعيد المدى' : 'قتال قريب'}
                        {equipped ? ' · مُجهَّز الآن' : ''}
                      </div>
                      <p className="text-xs text-[#CBD5E1] leading-relaxed pt-1">{w.description}</p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-[#94A3B8] block text-[11px]">الضرر</span>
                          <span className="font-mono-num font-semibold text-[#E6B85C]">{dmg}</span>
                        </div>
                        <div>
                          <span className="text-[#94A3B8] block text-[11px]">السرعة</span>
                          <span className="font-mono-num font-semibold text-[#F1F5F9]">
                            {w.attackSpeed}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#94A3B8] block text-[11px]">المدى</span>
                          <span className="font-mono-num font-semibold text-[#38BDF8]">{w.range}م</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </section>
          </div>
        </div>
      )}

      {/* TAB 2: GEAR / SAMAN SHOP */}
      {shopTab === 'gear' && (
        <div className="space-y-6">
          {/* Equipped Saman Slots + Derived Stats */}
          <section className="bg-[#121B2D]/90 backdrop-blur-md border border-[#E6B85C]/20 rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-[#F1F5F9]">
                  خانات السامان المُجهَّزة حالياً
                </h2>
                <p className="text-xs text-[#94A3B8]">
                  تجمع هذه الخانات الثلاث مع عتاد الأفتار لرفع الصحة والضرر والسرعة والدرع مباشرة.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <span>
                  الصحة: <strong className="font-mono-num text-[#F1F5F9]">{derivedWithGear.maxHp}</strong>
                </span>
                <span>
                  الهجوم: <strong className="font-mono-num text-[#E6B85C]">{derivedWithGear.attackDamage}</strong>
                </span>
                <span>
                  السرعة: <strong className="font-mono-num text-[#38BDF8]">{derivedWithGear.moveSpeed}</strong>
                </span>
                <span>
                  الدفاع: <strong className="font-mono-num text-[#10B981]">{Math.round(derivedWithGear.armorReduction * 100)}%</strong>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {GEAR_SLOTS.map(({ slot, title }) => {
                const gId = profile.equippedGear[slot];
                const gear = gId ? GEAR_ITEMS[gId] : null;
                const gLv = gId ? profile.gearLevels?.[gId] || 1 : 1;
                return (
                  <div
                    key={slot}
                    className="p-4 rounded-lg bg-[#0D1422] border border-white/10 flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="text-[11px] text-[#94A3B8]">{title}</div>
                      {gear ? (
                        <>
                          <div className="font-display text-sm font-bold text-[#F1F5F9]">
                            {gear.name} <span className="font-mono-num text-xs text-[#38BDF8]">Lv.{gLv}</span>
                          </div>
                          <div className="text-xs text-[#CBD5E1]">{gear.description}</div>
                        </>
                      ) : (
                        <div className="text-xs text-[#64748B]">خانة فارغة — اختر سامان من المتجر</div>
                      )}
                    </div>
                    {gear && (
                      <button
                        type="button"
                        onClick={() => onUnequipGear(slot)}
                        title="إزالة القطعة"
                        className="p-2 rounded-md bg-[#18253C] hover:bg-[#2A1A1D] text-[#CBD5E1] hover:text-[#FCA5A5] border border-white/10 shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Active Gear Set Bonuses Bar */}
            <div className="pt-3 border-t border-white/10">
              {derivedWithGear.activeSetBonuses.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-bold text-[#E6B85C]">مكافآت الأطقم المفعّلة:</span>
                  {derivedWithGear.activeSetBonuses.map((sb, i) => (
                    <span
                      key={`${sb.setId}_${i}`}
                      className="px-2.5 py-1 rounded-lg bg-[#16233B] border border-[#38BDF8]/35 text-[#F1F5F9]"
                    >
                      <strong>{sb.name} ({sb.count}/3):</strong> {sb.label}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-[#94A3B8]">
                  نصيحة: جهّز قطعتين أو ثلاثاً من نفس الطقم (التنين الفتّاك، الحصن المنيع، الأثير والرياح) لتفعيل مكافآت الطقم!
                </div>
              )}
            </div>
          </section>

          {/* Slot Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: 'all', label: 'كل السامان' },
                { id: 'relic', label: 'التمائم والخواتم' },
                { id: 'armor_core', label: 'أنوية الدرع' },
                { id: 'boots', label: 'الأحذية والقفازات' },
              ] as const
            ).map((gf) => (
              <button
                key={gf.id}
                type="button"
                onClick={() => setGearFilter(gf.id)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md border transition-colors cursor-pointer ${
                  gearFilter === gf.id
                    ? 'bg-[#18253C] border-[#E6B85C] text-[#F1F5F9]'
                    : 'bg-[#121B2D]/90 border-white/10 text-[#94A3B8] hover:text-[#F1F5F9]'
                }`}
              >
                {gf.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredGear.map((g) => {
              const unlocked = profile.unlockedGear.includes(g.id);
              const equipped = profile.equippedGear[g.slot] === g.id;
              const gLv = profile.gearLevels?.[g.id] || 1;
              const gScale = 1 + (gLv - 1) * 0.16;
              const gRank = getGearRank(g.id, gLv);
              const gRankMeta = RANK_META[gRank];
              const setDef = g.setId ? GEAR_SETS[g.setId] : null;
              const eqSlotId = profile.equippedGear[g.slot];
              const eqSlotDef = eqSlotId && eqSlotId !== g.id ? GEAR_ITEMS[eqSlotId] : null;
              const eqSlotScale = eqSlotId ? 1 + ((profile.gearLevels?.[eqSlotId] || 1) - 1) * 0.16 : 1;
              const dmgDiff = eqSlotDef
                ? Math.round(g.dmgBonus * gScale) - Math.round(eqSlotDef.dmgBonus * eqSlotScale)
                : 0;
              const hpDiff = eqSlotDef
                ? Math.round(g.hpBonus * gScale) - Math.round(eqSlotDef.hpBonus * eqSlotScale)
                : 0;

              return (
                <div
                  key={g.id}
                  className={`p-5 rounded-xl border flex flex-col justify-between gap-4 ${
                    equipped
                      ? 'bg-[#18253C] border-[#E6B85C]'
                      : 'bg-[#121B2D]/90 border-white/10'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold" style={{ color: g.accentColor }}>
                        {g.slotLabel}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-[10px] font-mono-num font-extrabold px-1.5 py-0.5 rounded border"
                          style={{ color: gRankMeta.color, backgroundColor: gRankMeta.bg, borderColor: gRankMeta.border }}
                        >
                          {gRank} · Lv.{gLv}/5
                        </span>
                        <Shield className="w-4 h-4" style={{ color: g.accentColor }} />
                      </div>
                    </div>
                    <h3 className="font-display text-base font-bold text-[#F1F5F9]">{g.name}</h3>
                    {setDef && (
                      <div className="text-[11px] font-semibold" style={{ color: setDef.accentColor }}>
                        طقم: {setDef.name}
                      </div>
                    )}
                    <p className="text-xs text-[#CBD5E1] leading-relaxed">{g.description}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-mono-num text-[#CBD5E1] pt-1">
                      {g.hpBonus > 0 && <span>+{Math.round(g.hpBonus * gScale)} صحة</span>}
                      {g.dmgBonus > 0 && <span className="text-[#E6B85C]">+{Math.round(g.dmgBonus * gScale)} هجوم</span>}
                      {g.speedBonus > 0 && (
                        <span className="text-[#38BDF8]">+{(g.speedBonus * (1 + (gLv - 1) * 0.08)).toFixed(2)} سرعة</span>
                      )}
                      {g.armorBonus > 0 && (
                        <span className="text-[#10B981]">+{Math.round(g.armorBonus * (1 + (gLv - 1) * 0.1) * 100)}% درع</span>
                      )}
                      {g.critBonus > 0 && <span className="text-[#FDE047]">+{Math.round(g.critBonus * gScale)}% حاسمة</span>}
                      {g.pwrScaleBonus > 0 && (
                        <span className="text-[#C084FC]">+{Math.round(g.pwrScaleBonus * gScale * 100)}% قدرة</span>
                      )}
                    </div>
                    {eqSlotDef && (hpDiff !== 0 || dmgDiff !== 0) && (
                      <div className="text-[10px] font-mono-num text-[#94A3B8]">
                        مقارنة بالمجهّز:{' '}
                        {hpDiff !== 0 && (
                          <span className={hpDiff > 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}>
                            {hpDiff > 0 ? `+${hpDiff}` : hpDiff} صحة{' '}
                          </span>
                        )}
                        {dmgDiff !== 0 && (
                          <span className={dmgDiff > 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}>
                            {dmgDiff > 0 ? `+${dmgDiff}` : dmgDiff} هجوم
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {unlocked && onUpgradeGear && gLv < 5 && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => showNotice(onUpgradeGear(g.id, false).message)}
                          className="flex-1 py-1.5 px-2.5 text-[11px] font-bold rounded-lg bg-[#16233D] hover:bg-[#1F3154] text-[#E6B85C] border border-[#E6B85C]/30 cursor-pointer"
                        >
                          ترقية Lv.{gLv + 1} ({gLv * 210}ذ + {gLv * 4}وسام)
                        </button>
                        {(profile.sharpeningStones || 0) > 0 && (
                          <button
                            type="button"
                            onClick={() => showNotice(onUpgradeGear(g.id, true).message)}
                            className="py-1.5 px-2.5 text-[11px] font-bold rounded-lg bg-[#FDE047] hover:bg-[#FEF08A] text-[#0A0F1A] cursor-pointer"
                          >
                            حجر صقل
                          </button>
                        )}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        const res = onUnlockOrEquipGear(g.id);
                        showNotice(res.message);
                      }}
                      className={`w-full py-2.5 px-4 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                        equipped
                          ? 'bg-[#172B29] text-[#10B981] border border-[#10B981]/30'
                          : unlocked
                            ? 'bg-[#1D2B44] hover:bg-[#273A5C] text-[#F1F5F9]'
                            : 'bg-[#E6B85C] hover:bg-[#F5D076] text-[#0A0F1A]'
                      }`}
                    >
                      {equipped
                        ? 'مُجهَّز في الخانة'
                        : unlocked
                          ? 'تجهيز السامان'
                          : g.costGems > 0
                            ? `شراء (${g.costGold} ذهب + ${g.costGems} جوهرة)`
                            : `شراء (${g.costGold} ذهب)`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: CONSUMABLES & CHESTS */}
      {shopTab === 'consumables' && (
        <div className="space-y-6">
          <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {CONSUMABLE_LIST.map((item) => {
              const count = profile.consumables[item.id] || 0;
              return (
                <div
                  key={item.id}
                  className="p-5 rounded-xl bg-[#121B2D]/90 border border-white/10 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-base font-bold text-[#F1F5F9]">
                        {item.name}
                      </span>
                      <span
                        className="font-mono-num text-sm font-bold"
                        style={{ color: item.color }}
                      >
                        مخزونك: {count}
                      </span>
                    </div>
                    <p className="text-xs text-[#CBD5E1] leading-relaxed">{item.description}</p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        const res = onBuyConsumable(item.id, 1);
                        showNotice(res.message);
                      }}
                      className="flex-1 py-2.5 px-3 text-xs font-bold text-[#0A0F1A] bg-[#E6B85C] hover:bg-[#F5D076] rounded-lg cursor-pointer"
                    >
                      شراء ×1 ({item.costGold} ذهب)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const res = onBuyConsumable(item.id, 3);
                        showNotice(res.message);
                      }}
                      className="py-2.5 px-3 text-xs font-bold text-[#F1F5F9] bg-[#18253C] hover:bg-[#223454] border border-white/10 rounded-lg cursor-pointer"
                    >
                      ×3 ({item.costGold * 3} ذهب)
                    </button>
                  </div>
                </div>
              );
            })}
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-5 rounded-xl bg-[#121B2D]/90 border border-[#E6B85C]/25 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[#E6B85C]">
                  <Gift className="w-5 h-5" />
                  <h3 className="font-display text-base font-bold text-[#F1F5F9]">
                    صندوق المحارب (لديك: {profile.warriorChests})
                  </h3>
                </div>
                <p className="text-xs text-[#CBD5E1]">
                  يحتوي على ذهب وجواهر ونقطة قوة إضافية لتطوير أفتارك (تُفتح من قسم المهام والتحديات).
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const ok = onBuyChest('warrior');
                  showNotice(ok ? 'تم شراء صندوق المحارب!' : 'تحتاج 260 ذهباً.');
                }}
                className="px-4 py-2.5 text-xs font-bold text-[#0A0F1A] bg-[#E6B85C] hover:bg-[#F5D076] rounded-lg whitespace-nowrap cursor-pointer"
              >
                شراء (260 ذهب)
              </button>
            </div>

            <div className="p-5 rounded-xl bg-[#121B2D]/90 border border-[#38BDF8]/25 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[#38BDF8]">
                  <Sparkles className="w-5 h-5" />
                  <h3 className="font-display text-base font-bold text-[#F1F5F9]">
                    الصندوق الأسطوري (لديك: {profile.mythicChests})
                  </h3>
                </div>
                <p className="text-xs text-[#CBD5E1]">
                  يمنح جواهر كثيرة ونقطتي قوة إضافيتين لبناء مقاتل أسطوري.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const ok = onBuyChest('mythic');
                  showNotice(ok ? 'تم شراء الصندوق الأسطوري!' : 'تحتاج 18 جوهرة.');
                }}
                className="px-4 py-2.5 text-xs font-bold text-[#0A0F1A] bg-[#38BDF8] hover:bg-[#7DD3FC] rounded-lg whitespace-nowrap cursor-pointer"
              >
                شراء (18 جوهرة)
              </button>
            </div>
          </section>
        </div>
      )}

      {/* TAB 4: OVERWORLD RESOURCE CRAFTING WORKBENCH */}
      {shopTab === 'crafting' && (
        <div className="space-y-6">
          <section className="p-5 rounded-xl bg-[#121B2D]/90 border border-[#38BDF8]/30 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-bold text-[#F1F5F9] flex items-center gap-2">
                <Hammer className="w-5 h-5 text-[#E6B85C]" />
                <span>طاولة الصياغة والحرفيات — موارد إيثيريا</span>
              </h2>
              <p className="text-xs text-[#94A3B8] mt-1">
                حوّل الأعشاب والخام والبلورات التي جمعتها من القارة إلى أحجار صقل وأدوات تكتيكية قوية.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono-num">
              <span className="px-3 py-1.5 rounded-lg bg-[#0D1422] border border-white/10 text-[#22C55E]">
                أعشاب: {profile.gatheredResources.herb || 0}
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-[#0D1422] border border-white/10 text-[#F59E0B]">
                خام: {profile.gatheredResources.ore || 0}
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-[#0D1422] border border-white/10 text-[#38BDF8]">
                بلورات: {profile.gatheredResources.crystal || 0}
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-[#0D1422] border border-[#FDE047]/30 text-[#FDE047]">
                أحجار صقل: {profile.sharpeningStones || 0}
              </span>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {CRAFTING_RECIPES.map((rec) => {
              const resNames: Record<OverworldNodeKind, string> = {
                herb: 'أعشاب القمر',
                ore: 'خام أوريكالكوم',
                crystal: 'بلورات الأثير',
              };
              const canAfford =
                profile.gold >= rec.costGold &&
                Object.entries(rec.costResources).every(
                  ([k, req]) => (profile.gatheredResources[k as OverworldNodeKind] || 0) >= (req || 0)
                );

              return (
                <div
                  key={rec.id}
                  className="p-5 rounded-xl bg-[#121B2D]/90 border border-white/10 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display text-base font-bold text-[#F1F5F9]" style={{ color: rec.color }}>
                        {rec.name}
                      </h3>
                      <span className="font-mono-num text-xs text-[#E6B85C]">{rec.costGold} ذهب</span>
                    </div>
                    <p className="text-xs text-[#CBD5E1] leading-relaxed">{rec.description}</p>
                    <div className="flex flex-wrap gap-1.5 pt-1 text-[11px]">
                      {Object.entries(rec.costResources).map(([k, req]) => {
                        const kind = k as OverworldNodeKind;
                        const owned = profile.gatheredResources[kind] || 0;
                        const ok = owned >= (req || 0);
                        return (
                          <span
                            key={k}
                            className={`px-2 py-0.5 rounded font-mono-num border ${
                              ok
                                ? 'bg-[#102622] border-[#10B981]/35 text-[#6EE7B7]'
                                : 'bg-[#24131A] border-[#EF4444]/35 text-[#FCA5A5]'
                            }`}
                          >
                            {resNames[kind]}: {owned}/{req}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!canAfford || !onCraftRecipe}
                    onClick={() => {
                      if (onCraftRecipe) showNotice(onCraftRecipe(rec.id).message);
                    }}
                    className={`w-full py-2.5 px-4 text-xs font-bold rounded-lg transition-colors ${
                      canAfford
                        ? 'bg-[#E6B85C] hover:bg-[#F5D076] text-[#0A0F1A] cursor-pointer'
                        : 'bg-[#172033] text-[#64748B] cursor-not-allowed'
                    }`}
                  >
                    تصنيع الآن
                  </button>
                </div>
              );
            })}
          </section>
        </div>
      )}
    </main>
  );
};
