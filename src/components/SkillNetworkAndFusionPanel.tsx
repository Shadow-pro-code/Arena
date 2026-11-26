import React, { useState } from 'react';
import {
  ArrowUpCircle,
  Award,
  Coins,
  Edit3,
  Flame,
  Gem,
  GitMerge,
  Lock,
  Network,
  RotateCcw,
  Sparkles,
  Unlock,
  Wand2,
} from 'lucide-react';
import type { CustomSkillDef, PlayerProfile, PowerId, SkillRuneId } from '../types/game';
import {
  CORE_POWER_LIST,
  ELEMENT_META,
  FUSION_POWER_LIST,
  RANK_META,
  SKILL_NETWORK_NODES,
  SKILL_RUNES,
  SKILL_RUNE_LIST,
  SKILL_SLOT_UNLOCK_COSTS,
  SYNTHESIS_GEOMETRY_META,
  checkPowerRequirements,
  computeSkillNetworkBonuses,
  getPowerRank,
  resolvePowerDef,
} from '../data/gameCatalog';

interface SkillNetworkAndFusionPanelProps {
  profile: PlayerProfile;
  powerSlotTarget: 0 | 1 | 2 | 3;
  onSelectSlotTarget: (slot: 0 | 1 | 2 | 3) => void;
  onUnlockOrEquipPower: (
    powerId: PowerId,
    slotIndex: 0 | 1 | 2 | 3,
    deckIndex?: 0 | 1
  ) => { ok: boolean; message: string };
  onSetActiveSkillDeck?: (deckIndex: 0 | 1) => void;
  onUnlockNextSkillSlot: (payWith: 'gold_marks' | 'gems') => { ok: boolean; message: string };
  onUpgradePower: (powerId: PowerId) => { ok: boolean; message: string };
  onUnlockNetworkNode: (nodeId: string) => { ok: boolean; message: string };
  onRespecNetworkNodes?: () => { ok: boolean; message: string };
  onUnlockOrEquipRune?: (powerId: PowerId, runeId: SkillRuneId) => { ok: boolean; message: string };
  onFusePowers: (fusionId: PowerId) => { ok: boolean; message: string };
  onSynthesizeDynamicSkill?: (
    skillAId: PowerId,
    skillBId: PowerId,
    customName: string
  ) => { ok: boolean; message: string; createdSkill?: CustomSkillDef };
  onRenameCustomSkill?: (skillId: string, newName: string) => boolean;
  onNotify: (msg: string) => void;
  onTriggerPreviewPower: () => void;
}

type SkillsSubTab = 'slots' | 'network' | 'fusion';

const SKILL_SLOT_META: { index: 0 | 1 | 2 | 3; keyLabel: string; title: string; color: string }[] = [
  { index: 0, keyLabel: 'Q', title: 'الخانة 1', color: '#38BDF8' },
  { index: 1, keyLabel: 'R', title: 'الخانة 2', color: '#C084FC' },
  { index: 2, keyLabel: 'Z', title: 'الخانة 3', color: '#10B981' },
  { index: 3, keyLabel: 'X', title: 'الخانة 4', color: '#F59E0B' },
];

const BRANCH_COLORS: Record<string, string> = {
  core: '#E6B85C',
  fury: '#F97316',
  haste: '#38BDF8',
  ether: '#10B981',
  fusion: '#C084FC',
};

export const SkillNetworkAndFusionPanel: React.FC<SkillNetworkAndFusionPanelProps> = ({
  profile,
  powerSlotTarget,
  onSelectSlotTarget,
  onUnlockOrEquipPower,
  onSetActiveSkillDeck,
  onUnlockNextSkillSlot,
  onUpgradePower,
  onUnlockNetworkNode,
  onRespecNetworkNodes,
  onUnlockOrEquipRune,
  onFusePowers,
  onSynthesizeDynamicSkill,
  onRenameCustomSkill,
  onNotify,
  onTriggerPreviewPower,
}) => {
  const [subTab, setSubTab] = useState<SkillsSubTab>('slots');
  const [editingDeck, setEditingDeck] = useState<0 | 1>(profile.avatar.activeDeckIndex === 1 ? 1 : 0);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('node_core_awakening');
  const [synthA, setSynthA] = useState<PowerId>(profile.unlockedPowers[0] || 'inferno_nova');
  const [synthB, setSynthB] = useState<PowerId>(profile.unlockedPowers[1] || 'thunder_strike');
  const [synthName, setSynthName] = useState<string>('');
  const [editingCustomId, setEditingCustomId] = useState<string | null>(null);
  const [editingCustomName, setEditingCustomName] = useState<string>('');

  const activeDeckSlots =
    editingDeck === 1
      ? (profile.avatar.secondaryPowerSlots || profile.avatar.powerSlots)
      : profile.avatar.powerSlots;

  const netBonuses = computeSkillNetworkBonuses(profile.unlockedNetworkNodes);
  const nextLockedSlot = profile.unlockedSkillSlots < 4 ? ((profile.unlockedSkillSlots + 1) as 2 | 3 | 4) : null;
  const nextSlotCost = nextLockedSlot ? SKILL_SLOT_UNLOCK_COSTS[nextLockedSlot] : null;
  const selectedNode = SKILL_NETWORK_NODES.find((n) => n.id === selectedNodeId) || SKILL_NETWORK_NODES[0];

  const customSkills = profile.customSkills || [];
  const allEquippablePowers = [
    ...customSkills,
    ...CORE_POWER_LIST,
    ...FUSION_POWER_LIST.filter((fp) => profile.unlockedPowers.includes(fp.id)),
  ];
  const unlockedSkillDefs = profile.unlockedPowers.map((id) => resolvePowerDef(id, customSkills));
  const synthDefA = resolvePowerDef(synthA, customSkills);
  const synthDefB = resolvePowerDef(synthB, customSkills);
  const previewMotion = synthDefA.motionKind || 'aoe_burst';
  const previewElement = synthDefB.element || 'fire';
  const previewClassicMatch = FUSION_POWER_LIST.find(
    (fp) =>
      fp.fusionPair &&
      ((fp.fusionPair[0] === synthA && fp.fusionPair[1] === synthB) ||
        (fp.fusionPair[1] === synthA && fp.fusionPair[0] === synthB))
  );
  const previewClassicReq = previewClassicMatch
    ? checkPowerRequirements(previewClassicMatch, profile.avatar.stats, profile.level)
    : null;

  return (
    <div className="space-y-5">
      {/* Header & Economy Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/10">
        <div>
          <h3 className="font-display text-base font-bold text-[#F8FAFC] flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: 'var(--sys-accent)' }} />
            <span>نظام المهارات: التخصيص والتطوير والشبكة والدمج</span>
          </h3>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            تبدأ بخانة نشطة واحدة [Q] — افتح الخانات [R] [Z] [X] تدريجياً، وطوّر شبكة المهارات وادمج القوى.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono-num">
          <span className="flex items-center gap-1 text-[#E6B85C]">
            <Coins className="w-3.5 h-3.5" /> {profile.gold}
          </span>
          <span className="flex items-center gap-1 text-[#38BDF8]">
            <Gem className="w-3.5 h-3.5" /> {profile.gems}
          </span>
          <span className="flex items-center gap-1 text-[#10B981]">
            <Award className="w-3.5 h-3.5" /> {profile.guildMarks} وسام
          </span>
        </div>
      </div>

      {/* Sub-Navigation */}
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            { id: 'slots', label: `الخانات والتطوير (${profile.unlockedSkillSlots}/4)`, icon: Sparkles },
            {
              id: 'network',
              label: `شبكة المهارات (${profile.unlockedNetworkNodes.length}/${SKILL_NETWORK_NODES.length})`,
              icon: Network,
            },
            { id: 'fusion', label: `دمج المهارات (${FUSION_POWER_LIST.length})`, icon: GitMerge },
          ] as const
        ).map((st) => {
          const Icon = st.icon;
          const active = subTab === st.id;
          return (
            <button
              key={st.id}
              type="button"
              onClick={() => setSubTab(st.id)}
              className={`min-h-[42px] px-2.5 py-2 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                active
                  ? 'system-btn-primary'
                  : 'system-card text-[#CBD5E1] hover:text-[#F8FAFC]'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{st.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUB-TAB 1: ACTIVE SLOTS + PROGRESSIVE UNLOCKER + POWER UPGRADING */}
      {subTab === 'slots' && (
        <div className="space-y-4">
          {/* Dual Skill Deck Selector (Deck 1 vs Deck 2) */}
          <div className="p-2.5 rounded-xl bg-[#090F1D] border border-[#38BDF8]/30 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-[#CBD5E1]">
              <strong className="text-[#F8FAFC]">نظام الطقمين المزدوج (8 مهارات):</strong>{' '}
              <span className="text-[#94A3B8]">بدّل بين الطقم 1 والطقم 2 فورياً داخل القتال بزر [N]!</span>
            </div>
            <div className="flex items-center gap-1.5">
              {([0, 1] as const).map((dIdx) => {
                const isSelected = editingDeck === dIdx;
                const isDefaultActive = (profile.avatar.activeDeckIndex ?? 0) === dIdx;
                return (
                  <button
                    key={`deck_${dIdx}`}
                    type="button"
                    onClick={() => {
                      setEditingDeck(dIdx);
                      onSetActiveSkillDeck?.(dIdx);
                      onNotify(`يتم الآن تعديل وتنشيط طقم المهارات ${dIdx + 1}`);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer transition-colors ${
                      isSelected
                        ? dIdx === 1
                          ? 'bg-[#102944] text-[#38BDF8] border-[#38BDF8]'
                          : 'bg-[#292011] text-[#E6B85C] border-[#E6B85C]'
                        : 'bg-[#0E1629] text-[#94A3B8] border-white/10 hover:text-[#F8FAFC]'
                    }`}
                  >
                    طقم {dIdx + 1} {isDefaultActive ? '• نشط' : ''}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4-Slot Selector with Lock Indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {SKILL_SLOT_META.map((slot) => {
              const isUnlocked = slot.index < profile.unlockedSkillSlots;
              const equippedPower = resolvePowerDef(activeDeckSlots[slot.index], customSkills);
              const equippedLv = equippedPower ? profile.powerLevels[equippedPower.id] || 1 : 1;
              const isSelected = powerSlotTarget === slot.index;

              return (
                <button
                  key={slot.index}
                  type="button"
                  onClick={() => {
                    if (isUnlocked) {
                      onSelectSlotTarget(slot.index);
                    } else {
                      onNotify(`الخانة ${slot.index + 1} [${slot.keyLabel}] مقفلة — افتحها من الشريط بالأسفل أولاً.`);
                    }
                  }}
                  className={`p-3 rounded-xl border text-right transition-all ${
                    !isUnlocked
                      ? 'bg-[#080D18]/80 border-white/10 opacity-70 cursor-not-allowed'
                      : isSelected
                        ? 'bg-[#172542] border-[var(--sys-accent)] shadow-md cursor-pointer'
                        : 'system-card cursor-pointer'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-[#94A3B8] flex items-center gap-1">
                      {!isUnlocked && <Lock className="w-3 h-3 text-[#F59E0B]" />}
                      <span>{slot.title}</span>
                    </span>
                    <span
                      className="font-mono-num font-extrabold px-1.5 py-0.5 rounded bg-[#0A0F1A]"
                      style={{ color: isUnlocked ? slot.color : '#64748B' }}
                    >
                      [{slot.keyLabel}]
                    </span>
                  </div>
                  <div className="font-display text-xs sm:text-sm font-bold text-[#F8FAFC] truncate">
                    {isUnlocked ? equippedPower?.name : 'خانة مقفلة'}
                  </div>
                  <div className="text-[10px] font-mono-num text-[#38BDF8] mt-0.5">
                    {isUnlocked ? `المستوى ${equippedLv}/5` : 'تحتاج إلى فتح'}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Progressive Slot Unlocker Card */}
          {nextLockedSlot && nextSlotCost ? (
            <div className="system-card rounded-xl p-4 border-[var(--sys-accent)]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-[#E6B85C]">
                  <Unlock className="w-4 h-4" />
                  <span>فتح {nextSlotCost.label} لتوسيع ترسانة القتال</span>
                </div>
                <p className="text-xs text-[#94A3B8]">
                  افتح الخانة باستخدام الذهب وشارات النقابة معاً، أو عبر الجواهر مباشرة.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const res = onUnlockNextSkillSlot('gold_marks');
                    onNotify(res.message);
                  }}
                  className="min-h-[40px] px-3.5 py-2 text-xs font-bold rounded-lg bg-[#E6B85C] hover:bg-[#F5D076] text-[#0A0F1A] flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>
                    {nextSlotCost.gold} ذهب + {nextSlotCost.guildMarks} وسام
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const res = onUnlockNextSkillSlot('gems');
                    onNotify(res.message);
                  }}
                  className="min-h-[40px] px-3.5 py-2 text-xs font-bold rounded-lg bg-[#162742] hover:bg-[#1F3558] text-[#38BDF8] border border-[#38BDF8]/40 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Gem className="w-3.5 h-3.5" />
                  <span>{nextSlotCost.gems} جوهرة</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="px-4 py-2.5 rounded-xl bg-[#102622] border border-[#10B981]/35 text-xs font-semibold text-[#6EE7B7]">
              جميع خانات المهارات الأربع [Q] [R] [Z] [X] مفتوحة ومتاحة للاستخدام في القتال!
            </div>
          )}

          {/* Owned + Core + Unlocked Fusion Powers List (Equip & Level 1-5 Upgrade) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {allEquippablePowers.map((pw) => {
              const unlocked = profile.unlockedPowers.includes(pw.id);
              const lv = profile.powerLevels[pw.id] || 1;
              const scaledDamage = Math.round(pw.damage * (1 + (lv - 1) * 0.18));
              const upgGold = lv * (pw.isFusion ? 320 : 220);
              const upgMarks = lv * (pw.isFusion ? 8 : 5);

              const activeSlotIndices = SKILL_SLOT_META.filter(
                (s) => s.index < profile.unlockedSkillSlots && activeDeckSlots[s.index] === pw.id
              ).map((s) => `[${s.keyLabel}]`);

              const effectiveTarget: 0 | 1 | 2 | 3 =
                powerSlotTarget < profile.unlockedSkillSlots ? powerSlotTarget : 0;
              const isActiveInTarget = activeDeckSlots[effectiveTarget] === pw.id;
              const targetKey = SKILL_SLOT_META[effectiveTarget].keyLabel;
              const rank = getPowerRank(pw.id, lv, customSkills);
              const rankMeta = RANK_META[rank];
              const elMeta = ELEMENT_META[pw.element || 'fire'];
              const equippedRuneId: SkillRuneId = profile.equippedRunes?.[pw.id] || 'standard';
              const req = checkPowerRequirements(pw, profile.avatar.stats, profile.level);

              return (
                <div
                  key={pw.id}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 ${
                    pw.isCustom
                      ? 'bg-[#122038]/90 border-[#38BDF8]/55'
                      : pw.isFusion
                        ? 'bg-[#1F1233]/90 border-[#C084FC]/55'
                        : activeSlotIndices.length > 0
                          ? 'bg-[#14223D] border-[var(--sys-accent)]/60'
                          : 'system-card'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-sm font-bold text-[#F8FAFC] flex items-center gap-1.5 min-w-0">
                        {pw.isCustom ? (
                          <Wand2 className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
                        ) : pw.isFusion ? (
                          <Flame className="w-3.5 h-3.5 text-[#C084FC] shrink-0" />
                        ) : null}
                        <span className="truncate">{pw.name}</span>
                        {pw.isCustom && onRenameCustomSkill && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCustomId(pw.id);
                              setEditingCustomName(pw.name);
                            }}
                            title="تغيير اسم المهارة"
                            className="text-[#94A3B8] hover:text-[#38BDF8] cursor-pointer shrink-0"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className="text-[10px] font-mono-num font-extrabold px-1.5 py-0.5 rounded border"
                          style={{ color: rankMeta.color, backgroundColor: rankMeta.bg, borderColor: rankMeta.border }}
                        >
                          {rank}
                        </span>
                        <span className="text-[11px] font-mono-num text-[#38BDF8]">
                          {unlocked ? `Lv.${lv}/5` : 'مقفلة'}
                        </span>
                      </div>
                    </div>

                    {editingCustomId === pw.id && onRenameCustomSkill && (
                      <div className="flex items-center gap-1.5 pt-1">
                        <input
                          type="text"
                          maxLength={32}
                          value={editingCustomName}
                          onChange={(e) => setEditingCustomName(e.target.value)}
                          className="flex-1 px-2 py-1 text-xs bg-[#0A0F1A] border border-[#38BDF8]/40 rounded text-[#F1F5F9]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (onRenameCustomSkill(pw.id, editingCustomName)) {
                              onNotify('تم تحديث اسم المهارة المبتكرة!');
                            }
                            setEditingCustomId(null);
                          }}
                          className="px-2 py-1 text-[11px] font-bold bg-[#38BDF8] text-[#0A0F1A] rounded cursor-pointer"
                        >
                          حفظ
                        </button>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-mono-num text-[#94A3B8]">
                      <span style={{ color: elMeta.color }}>{elMeta.label}</span>
                      <span>·</span>
                      <span>ضرر {scaledDamage}</span>
                      <span>·</span>
                      <span className="text-[#38BDF8]">{pw.energyCost} مانا</span>
                      <span>·</span>
                      <span>مدى {pw.radius}م</span>
                      {pw.maxUsesPerWave && (
                        <>
                          <span>·</span>
                          <span className="text-[#F59E0B] font-bold">حد: {pw.maxUsesPerWave}/موجة</span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-[#CBD5E1] leading-snug">{pw.description}</p>
                    {(req.allLabels.length > 0 || !req.met) && (
                      <div
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border flex flex-wrap items-center gap-1.5 ${
                          req.met
                            ? 'bg-[#0C1D1A] border-[#10B981]/30 text-[#6EE7B7]'
                            : 'bg-[#231216] border-[#EF4444]/40 text-[#FCA5A5]'
                        }`}
                      >
                        {req.met ? <Unlock className="w-3 h-3 shrink-0" /> : <Lock className="w-3 h-3 shrink-0" />}
                        <span>
                          {req.met
                            ? `متطلبات مكتملة: ${req.allLabels.join(' · ')}`
                            : `مقفلة — ينقصك: ${req.missingLabels.join(' · ')}`}
                        </span>
                      </div>
                    )}

                    {/* Skill Runes Row */}
                    {unlocked && onUnlockOrEquipRune && (
                      <div className="pt-1.5 space-y-1">
                        <div className="text-[10px] text-[#94A3B8]">
                          الرونة النشطة: <strong style={{ color: SKILL_RUNES[equippedRuneId].color }}>{SKILL_RUNES[equippedRuneId].name}</strong>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {SKILL_RUNE_LIST.map((r) => {
                            const ownedRune = profile.unlockedRunes?.includes(r.id) || r.id === 'standard';
                            const isEq = equippedRuneId === r.id;
                            return (
                              <button
                                key={r.id}
                                type="button"
                                title={r.shortDesc}
                                onClick={() => {
                                  const res = onUnlockOrEquipRune(pw.id, r.id);
                                  onNotify(res.message);
                                }}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer transition-colors ${
                                  isEq
                                    ? 'bg-[#172844] text-[#F8FAFC]'
                                    : ownedRune
                                      ? 'bg-[#0B1220] text-[#CBD5E1] border-white/15 hover:border-white/35'
                                      : 'bg-[#080C16] text-[#94A3B8] border-white/10 hover:border-[#E6B85C]/40'
                                }`}
                                style={isEq ? { borderColor: r.color, color: r.color } : undefined}
                              >
                                {r.name}
                                {!ownedRune ? ` (${r.costGold}ذ)` : ''}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
                    {unlocked && lv < 5 ? (
                      <button
                        type="button"
                        onClick={() => {
                          const res = onUpgradePower(pw.id);
                          onNotify(res.message);
                          if (res.ok) onTriggerPreviewPower();
                        }}
                        className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-[#16233D] hover:bg-[#1F3154] text-[#E6B85C] border border-[#E6B85C]/30 flex items-center gap-1 cursor-pointer"
                      >
                        <ArrowUpCircle className="w-3.5 h-3.5" />
                        <span>
                          تطوير ({upgGold}ذ + {upgMarks}وسام)
                        </span>
                      </button>
                    ) : unlocked ? (
                      <span className="text-[11px] font-bold text-[#10B981]">الحد الأقصى Lv.5 ({rank})</span>
                    ) : (
                      <span className="text-[11px] text-[#94A3B8]">{pw.tagline}</span>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        const res = onUnlockOrEquipPower(pw.id, effectiveTarget, editingDeck);
                        onNotify(res.message);
                        if (res.ok) onTriggerPreviewPower();
                      }}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                        !req.met
                          ? 'bg-[#241318] text-[#FCA5A5] border border-[#EF4444]/40'
                          : isActiveInTarget
                            ? 'bg-[#132924] text-[#10B981] border border-[#10B981]/40'
                            : unlocked
                              ? 'bg-[#1D2D4D] hover:bg-[#273C66] text-[#F1F5F9]'
                              : 'system-btn-primary'
                      }`}
                    >
                      {!req.met && <Lock className="w-3 h-3 shrink-0" />}
                      <span>
                        {!req.met
                          ? 'متطلبات ناقصة'
                          : isActiveInTarget
                            ? `مجهزة [${targetKey}]`
                            : unlocked
                              ? `تعيين [${targetKey}]`
                              : pw.costGems > 0
                                ? `شراء (${pw.costGold} + ${pw.costGems}ج)`
                                : `شراء (${pw.costGold} ذهب)`}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: INTERACTIVE 9-NODE SKILL NETWORK */}
      {subTab === 'network' && (
        <div className="space-y-4">
          {/* Cumulative Active Bonuses Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center text-[11px]">
            <div className="system-card rounded-lg p-2">
              <div className="text-[#94A3B8]">مضاعف الضرر</div>
              <div className="font-mono-num font-bold text-[#F97316] mt-0.5">{netBonuses.dmgMult}x</div>
            </div>
            <div className="system-card rounded-lg p-2">
              <div className="text-[#94A3B8]">تقليص التبريد</div>
              <div className="font-mono-num font-bold text-[#38BDF8] mt-0.5">
                -{Math.round(netBonuses.cdrMult * 100)}%
              </div>
            </div>
            <div className="system-card rounded-lg p-2">
              <div className="text-[#94A3B8]">مدى المهارات</div>
              <div className="font-mono-num font-bold text-[#E6B85C] mt-0.5">{netBonuses.radiusMult}x</div>
            </div>
            <div className="system-card rounded-lg p-2">
              <div className="text-[#94A3B8]">طاقة قصوى إضافية</div>
              <div className="font-mono-num font-bold text-[#10B981] mt-0.5">+{netBonuses.bonusEnergy}</div>
            </div>
            <div className="system-card rounded-lg p-2">
              <div className="text-[#94A3B8]">توفير الطاقة</div>
              <div className="font-mono-num font-bold text-[#2DD4BF] mt-0.5">
                {Math.round((1 - netBonuses.energyCostMult) * 100)}%
              </div>
            </div>
            <div className="system-card rounded-lg p-2">
              <div className="text-[#94A3B8]">قوة الدمج</div>
              <div className="font-mono-num font-bold text-[#C084FC] mt-0.5">{netBonuses.fusionMult}x</div>
            </div>
          </div>

          {/* Interactive SVG + Node Constellation */}
          <div className="relative h-[300px] sm:h-[330px] rounded-xl bg-[#070B16] border border-white/10 overflow-hidden">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
              {SKILL_NETWORK_NODES.map((node) => {
                if (!node.requires) return null;
                const parent = SKILL_NETWORK_NODES.find((p) => p.id === node.requires);
                if (!parent) return null;
                const bothUnlocked =
                  profile.unlockedNetworkNodes.includes(node.id) &&
                  profile.unlockedNetworkNodes.includes(parent.id);
                return (
                  <line
                    key={`edge_${node.id}`}
                    x1={parent.x}
                    y1={parent.y}
                    x2={node.x}
                    y2={node.y}
                    stroke={bothUnlocked ? BRANCH_COLORS[node.branch] || '#38BDF8' : '#334155'}
                    strokeWidth={bothUnlocked ? 1.1 : 0.65}
                    strokeDasharray={bothUnlocked ? undefined : '2 1.5'}
                  />
                );
              })}
            </svg>

            {SKILL_NETWORK_NODES.map((node) => {
              const unlocked = profile.unlockedNetworkNodes.includes(node.id);
              const parentOk = !node.requires || profile.unlockedNetworkNodes.includes(node.requires);
              const isSelected = selectedNode.id === node.id;
              const col = BRANCH_COLORS[node.branch] || '#38BDF8';
              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => setSelectedNodeId(node.id)}
                  style={{
                    left: `${node.x}%`,
                    top: `${node.y}%`,
                    borderColor: unlocked ? col : isSelected ? '#F8FAFC' : 'rgba(255,255,255,0.2)',
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 px-2 py-1.5 rounded-lg border-2 text-[10px] sm:text-[11px] font-bold transition-transform cursor-pointer ${
                    unlocked
                      ? 'bg-[#13223D] text-[#F8FAFC] shadow-lg'
                      : parentOk
                        ? 'bg-[#0E1629] text-[#CBD5E1] hover:scale-105'
                        : 'bg-[#080C16] text-[#64748B] opacity-75'
                  } ${isSelected ? 'scale-110 ring-2 ring-white/40 z-10' : ''}`}
                >
                  <div className="flex items-center gap-1 whitespace-nowrap">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: col }} />
                    <span>{node.title}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Node Inspector & Unlock Action */}
          <div className="system-card rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className="font-display text-sm font-bold"
                  style={{ color: BRANCH_COLORS[selectedNode.branch] }}
                >
                  {selectedNode.title}
                </span>
                <span className="text-[11px] font-mono-num px-2 py-0.5 rounded bg-[#0A101D] text-[#38BDF8]">
                  {selectedNode.bonusLabel}
                </span>
              </div>
              <p className="text-xs text-[#CBD5E1]">{selectedNode.description}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {profile.unlockedNetworkNodes.includes(selectedNode.id) ? (
                <span className="px-3.5 py-2 rounded-lg bg-[#112722] border border-[#10B981]/35 text-xs font-bold text-[#10B981] inline-block">
                  مُفعَّلة في الشبكة
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const res = onUnlockNetworkNode(selectedNode.id);
                    onNotify(res.message);
                  }}
                  className="min-h-[42px] px-4 py-2 text-xs font-bold rounded-lg system-btn-primary cursor-pointer whitespace-nowrap"
                >
                  تفعيل ({selectedNode.costGold} ذهب + {selectedNode.costMarks} وسام)
                </button>
              )}

              {onRespecNetworkNodes && profile.unlockedNetworkNodes.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const res = onRespecNetworkNodes();
                    onNotify(res.message);
                  }}
                  className="min-h-[42px] px-3 py-2 text-xs font-bold rounded-lg bg-[#241418] hover:bg-[#351B22] text-[#FCA5A5] border border-[#EF4444]/35 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>إعادة توزيع واسترداد</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: UNIVERSAL DYNAMIC SYNTHESIS + CLASSIC FUSION LABORATORY */}
      {subTab === 'fusion' && (
        <div className="space-y-4">
          {/* Universal Dynamic Skill Synthesis Matrix */}
          {onSynthesizeDynamicSkill && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-[#0F1B33] to-[#1A1130] border border-[#38BDF8]/45 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="font-display text-sm sm:text-base font-bold text-[#F8FAFC] flex items-center gap-1.5">
                    <Wand2 className="w-4 h-4 text-[#38BDF8]" />
                    <span>مختبر الدمج الشبكي الحر وابتكار المهارات</span>
                  </h4>
                  <p className="text-[11px] text-[#94A3B8] mt-0.5">
                    اختر أي مهارتين مفتوحتين: تحدد المهارة الأولى «الشكل القتالي» والثانية «العنصر»، أو يكتشف النظام وصفة كلاسيكية تلقائياً!
                  </p>
                </div>
                <span className="font-mono-num text-[11px] px-2.5 py-1 rounded bg-[#0A0F1A] border border-[#38BDF8]/30 text-[#38BDF8]">
                  المبتكرة: {customSkills.length}/12
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <label className="space-y-1">
                  <span className="text-[#CBD5E1] font-semibold">المهارة الأساسية (الشكل القتالي)</span>
                  <select
                    value={synthA}
                    onChange={(e) => setSynthA(e.target.value as PowerId)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0A0F1A] border border-white/15 text-[#F8FAFC]"
                  >
                    {unlockedSkillDefs.map((pw) => (
                      <option key={`sa_${pw.id}`} value={pw.id}>
                        {pw.name} ({SYNTHESIS_GEOMETRY_META[pw.motionKind || 'aoe_burst'].label})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-[#CBD5E1] font-semibold">المهارة الثانوية (العنصر والتأثير)</span>
                  <select
                    value={synthB}
                    onChange={(e) => setSynthB(e.target.value as PowerId)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0A0F1A] border border-white/15 text-[#F8FAFC]"
                  >
                    {unlockedSkillDefs.map((pw) => (
                      <option key={`sb_${pw.id}`} value={pw.id}>
                        {pw.name} ({ELEMENT_META[pw.element || 'fire'].label})
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="p-3 rounded-lg bg-[#0A0F1A]/85 border border-white/10 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                {previewClassicMatch ? (
                  <div className="space-y-1 text-[#E9D5FF]">
                    <div>
                      <span className="font-bold text-[#C084FC]">تطابق وصفة أسطورية: </span>
                      {previewClassicMatch.name} (تُفتح تلقائياً عند توفر المستوى 2 لكل منهما)
                    </div>
                    {previewClassicReq && !previewClassicReq.met && (
                      <div className="text-[11px] font-bold text-[#FCA5A5]">
                        متطلبات السمات الناقصة: {previewClassicReq.missingLabels.join(' · ')}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <div className="font-bold text-[#F8FAFC]">
                      المزيج الناتج: <span className="text-[#38BDF8]">{SYNTHESIS_GEOMETRY_META[previewMotion].label}</span> +{' '}
                      <span style={{ color: ELEMENT_META[previewElement].color }}>{ELEMENT_META[previewElement].label}</span>
                    </div>
                    <div className="text-[11px] text-[#94A3B8]">
                      ضرر تقديري {Math.round((synthDefA.damage + synthDefB.damage) * 0.78)} · مدى{' '}
                      {Math.max(synthDefA.radius, synthDefB.radius, 6.2).toFixed(1)}م · يطبق حالة «{ELEMENT_META[previewElement].statusLabel}»
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  maxLength={32}
                  value={synthName}
                  onChange={(e) => setSynthName(e.target.value)}
                  placeholder="سمِّ مهارتك الجديدة (اختياري) مثال: إعصار الجحيم..."
                  className="flex-1 px-3 py-2 text-xs bg-[#0A0F1A] border border-white/15 rounded-lg text-[#F8FAFC] focus:outline-none focus:border-[#38BDF8]"
                />
                <button
                  type="button"
                  onClick={() => {
                    const res = onSynthesizeDynamicSkill(synthA, synthB, synthName);
                    onNotify(res.message);
                    if (res.ok) {
                      setSynthName('');
                      onTriggerPreviewPower();
                    }
                  }}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-[#38BDF8] to-[#818CF8] text-[#0A0F1A] hover:brightness-105 cursor-pointer whitespace-nowrap"
                >
                  {previewClassicMatch ? 'إتمام الوصفة الكلاسيكية' : 'دمج وابتكار (520ذ + 12وسام)'}
                </button>
              </div>
            </div>
          )}

          <div className="p-3 rounded-xl bg-[#160F29] border border-[#C084FC]/35 text-xs text-[#E9D5FF]">
            الوصفات الكلاسيكية الثابتة (تتطلب فتح المهارتين وترقيتهما إلى <strong>المستوى 2</strong> على الأقل):
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {FUSION_POWER_LIST.map((fusion) => {
              const isUnlocked = profile.unlockedPowers.includes(fusion.id);
              const [pA, pB] = fusion.fusionPair || ['inferno_nova', 'thunder_strike'];
              const defA = resolvePowerDef(pA, customSkills);
              const defB = resolvePowerDef(pB, customSkills);
              const ownedA = profile.unlockedPowers.includes(pA);
              const ownedB = profile.unlockedPowers.includes(pB);
              const lvA = profile.powerLevels[pA] || 1;
              const lvB = profile.powerLevels[pB] || 1;
              const readyA = ownedA && lvA >= 2;
              const readyB = ownedB && lvB >= 2;
              const req = checkPowerRequirements(fusion, profile.avatar.stats, profile.level);

              return (
                <div
                  key={fusion.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                    isUnlocked
                      ? 'bg-[#1D1233] border-[#C084FC]'
                      : 'system-card border-[#C084FC]/30'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-base font-bold text-[#F8FAFC] flex items-center gap-1.5">
                        <GitMerge className="w-4 h-4 text-[#C084FC]" />
                        <span>{fusion.name}</span>
                      </span>
                      <span className="font-mono-num text-[11px] text-[#E6B85C]">
                        ضرر {fusion.damage} · مدى {fusion.radius}م
                      </span>
                    </div>
                    <p className="text-xs text-[#CBD5E1] leading-relaxed">{fusion.description}</p>
                    {req.allLabels.length > 0 && (
                      <div
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1.5 ${
                          req.met
                            ? 'bg-[#0C1D1A] border-[#10B981]/30 text-[#6EE7B7]'
                            : 'bg-[#231216] border-[#EF4444]/40 text-[#FCA5A5]'
                        }`}
                      >
                        {req.met ? <Unlock className="w-3 h-3 shrink-0" /> : <Lock className="w-3 h-3 shrink-0" />}
                        <span>
                          {req.met
                            ? `المتطلبات مكتملة: ${req.allLabels.join(' · ')}`
                            : `ينقصك للدمج: ${req.missingLabels.join(' · ')}`}
                        </span>
                      </div>
                    )}

                    {/* Recipe Ingredients */}
                    <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                      <div
                        className={`p-2 rounded-lg border ${
                          readyA
                            ? 'bg-[#102622] border-[#10B981]/45 text-[#6EE7B7]'
                            : 'bg-[#0A101E] border-white/10 text-[#94A3B8]'
                        }`}
                      >
                        <div className="font-bold truncate">{defA.name}</div>
                        <div className="font-mono-num mt-0.5">
                          {ownedA ? `Lv.${lvA}/2+` : 'غير مفتوحة'}
                        </div>
                      </div>
                      <div
                        className={`p-2 rounded-lg border ${
                          readyB
                            ? 'bg-[#102622] border-[#10B981]/45 text-[#6EE7B7]'
                            : 'bg-[#0A101E] border-white/10 text-[#94A3B8]'
                        }`}
                      >
                        <div className="font-bold truncate">{defB.name}</div>
                        <div className="font-mono-num mt-0.5">
                          {ownedB ? `Lv.${lvB}/2+` : 'غير مفتوحة'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                    {isUnlocked ? (
                      <span className="text-xs font-bold text-[#10B981]">
                        مهارة مدمجة جاهزة (يمكن تجهيزها من تبويب الخانات)
                      </span>
                    ) : (
                      <>
                        <span className="text-[11px] font-mono-num text-[#E6B85C]">
                          {fusion.fusionCostGold} ذهب + {fusion.fusionCostMarks} وسام
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const res = onFusePowers(fusion.id);
                            onNotify(res.message);
                            if (res.ok) onTriggerPreviewPower();
                          }}
                          className={`min-h-[38px] px-3.5 py-1.5 text-xs font-bold rounded-lg cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                            req.met
                              ? 'system-btn-primary'
                              : 'bg-[#241318] text-[#FCA5A5] border border-[#EF4444]/40'
                          }`}
                        >
                          {!req.met && <Lock className="w-3 h-3 shrink-0" />}
                          <span>{req.met ? 'دمج وصناعة المهارة' : 'متطلبات ناقصة'}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
