import React, { useEffect, useRef, useState } from 'react';
import {
  Award,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  Coins,
  Compass,
  Crown,
  Gem,
  Gift,
  Medal,
  PackageOpen,
  ShieldAlert,
  Skull,
  Sparkles,
  Trophy,
} from 'lucide-react';
import type { OverworldNodeKind, PlayerProfile } from '../types/game';
import type { ChestRewardOutcome } from '../hooks/usePlayerProgress';
import { getAchievementCurrentValue } from '../hooks/usePlayerProgress';
import {
  ACHIEVEMENT_DEFS,
  ARENAS,
  MAP_CHALLENGES,
  MONSTER_LIST,
  NPC_JOB_LIST,
  OVERWORLD_MAP,
  SECRET_WORLD_BOSSES,
  getRankLabel,
  xpForNextLevel,
} from '../data/gameCatalog';

interface RewardsViewProps {
  profile: PlayerProfile;
  onClaimQuest: (questId: string) => void;
  onClaimChallenge: (challengeId: string) => boolean;
  onClaimDaily?: (dailyId: string) => boolean;
  onClaimAchievement?: (achId: string) => boolean;
  onEquipTitle?: (title: string) => boolean;
  onOpenChest: (type: 'warrior' | 'mythic') => ChestRewardOutcome | null;
  onBuyChest: (type: 'warrior' | 'mythic') => boolean;
  onAcceptNpcJob: (jobId: string) => { ok: boolean; message: string };
  onCompleteNpcJob: (jobId: string) => { ok: boolean; message: string };
  onSellSingleResource: (kind: OverworldNodeKind) => { ok: boolean; message: string };
  onSellAllResources: () => { ok: boolean; message: string };
  onExchangeGuildMarks: (option: 'gold' | 'gems' | 'mythic_chest') => { ok: boolean; message: string };
}

export const RewardsView: React.FC<RewardsViewProps> = ({
  profile,
  onClaimQuest,
  onClaimChallenge,
  onClaimDaily,
  onClaimAchievement,
  onEquipTitle,
  onOpenChest,
  onBuyChest,
  onAcceptNpcJob,
  onCompleteNpcJob,
  onSellSingleResource,
  onSellAllResources,
  onExchangeGuildMarks,
}) => {
  const [openedReward, setOpenedReward] = useState<ChestRewardOutcome | null>(null);
  const [notice, setNotice] = useState('');
  const noticeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) {
        window.clearTimeout(noticeTimerRef.current);
      }
    };
  }, []);

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

  const handleOpen = (type: 'warrior' | 'mythic') => {
    const res = onOpenChest(type);
    if (!res) {
      showNotice('لا تملك صناديق من هذا النوع حالياً.');
      return;
    }
    setOpenedReward(res);
  };

  const handleBuy = (type: 'warrior' | 'mythic') => {
    const ok = onBuyChest(type);
    if (!ok) {
      showNotice(
        type === 'warrior'
          ? 'تحتاج 260 ذهباً لشراء صندوق المحارب.'
          : 'تحتاج 18 جوهرة لشراء الصندوق الأسطوري.'
      );
    } else {
      showNotice(type === 'warrior' ? 'تم شراء صندوق المحارب!' : 'تم شراء الصندوق الأسطوري!');
    }
  };

  const nextXp = xpForNextLevel(profile.level);
  const completedCount = profile.quests.filter((q) => q.claimed).length;
  const totalResources =
    (profile.gatheredResources.herb || 0) +
    (profile.gatheredResources.ore || 0) +
    (profile.gatheredResources.crystal || 0);

  return (
    <main className="max-w-[1360px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-9">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E6B85C]/20 pb-5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#F2F4F8]">
            عقود النقابة والمهام وسلسلة الوحوش
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            تعاقد مع الشخصيات المسالمة في قارة إيثيريا، بِع مواردك مقابل أوسمة النقابة، وأنجز مهام وتحديات الساحات.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-[#9AA6B8]">
          <span>
            المستوى <strong className="font-mono-num text-[#F2F4F8]">{profile.level}</strong> ({profile.xp}/{nextXp} XP)
          </span>
          <span aria-hidden="true">·</span>
          <span>
            الذهب: <strong className="font-mono-num text-[#E6B85C]">{profile.gold}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            الجواهر: <strong className="font-mono-num text-[#38BDF8]">{profile.gems}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            الأوسمة: <strong className="font-mono-num text-[#10B981]">{profile.guildMarks}</strong>
          </span>
        </div>
      </div>

      {notice && (
        <div className="px-4 py-2.5 text-sm text-[#FDE68A] bg-[#241E14] border border-[#E6B85C]/45 rounded-lg">
          {notice}
        </div>
      )}

      {/* Loot Reveal Banner */}
      {openedReward && (
        <section className="p-5 rounded-xl bg-[#1A212C] border border-[#E6B85C] flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-display text-lg font-bold text-[#E6B85C]">
              {openedReward.headline}
            </h2>
            <p className="text-sm text-[#F2F4F8]">
              حصلت على{' '}
              <span className="font-mono-num font-bold text-[#E6B85C]">+{openedReward.gold} ذهب</span>
              {' · '}
              <span className="font-mono-num font-bold text-[#38BDF8]">+{openedReward.gems} جوهرة</span>
              {' · '}
              <span className="font-mono-num font-bold text-[#10B981]">+{openedReward.xp} خبرة</span>
              {' · '}
              <span className="font-mono-num font-bold text-white">+{openedReward.statPoints} نقطة سمات للأفتار</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpenedReward(null)}
            className="px-4 py-2 text-xs font-bold text-[#0D1015] bg-[#E6B85C] hover:bg-[#F5D076] rounded-lg cursor-pointer"
          >
            إغلاق
          </button>
        </section>
      )}

      {/* Daily Rotating Challenges */}
      <section className="isekai-panel rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3.5">
          <div>
            <h2 className="font-display text-xl font-bold text-[#F8FAFC] flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-[#38BDF8]" />
              <span>التحديات اليومية المتجددة</span>
            </h2>
            <p className="text-xs text-[#94A3B8] mt-1">
              تتجدد 3 تحديات يومياً تلقائياً بتوقيت جهازك — أكملها لجمع الذهب، الجواهر، أوسمة النقابة، والخبرة.
            </p>
          </div>
          <span className="font-mono-num text-xs px-3 py-1.5 rounded-lg bg-[#0B1220] border border-[#38BDF8]/35 text-[#38BDF8]">
            تاريخ اليوم: {profile.dailyChallengesDate}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {profile.dailyChallenges.map((dc) => {
            const pct = Math.min(100, Math.round((dc.current / dc.target) * 100));
            const ready = dc.current >= dc.target && !dc.claimed;
            return (
              <div
                key={dc.id}
                className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                  ready ? 'bg-[#15243D] border-[#38BDF8]' : 'bg-[#0B1220] border-white/10'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-sm font-bold text-[#F8FAFC]">{dc.title}</h3>
                    <span className="font-mono-num text-xs text-[#38BDF8] font-bold">
                      {Math.min(dc.current, dc.target)}/{dc.target}
                    </span>
                  </div>
                  <p className="text-xs text-[#94A3B8] leading-snug">{dc.description}</p>
                  <div className="w-full h-1.5 bg-[#162136] rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${dc.claimed ? 'bg-[#10B981]' : 'bg-[#38BDF8]'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5 text-[11px]">
                  <span className="font-mono-num text-[#E6B85C]">
                    +{dc.rewardGold}ذ · +{dc.rewardGems}ج · +{dc.rewardMarks}وسام
                  </span>
                  {dc.claimed ? (
                    <span className="text-[#10B981] font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> مُسلَّم
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={!ready}
                      onClick={() => {
                        if (onClaimDaily?.(dc.id)) {
                          showNotice(`أحسنت! استلمت مكافأة التحدي اليومي «${dc.title}»!`);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                        ready
                          ? 'bg-[#38BDF8] hover:bg-[#7DD3FC] text-[#0A0F1A] cursor-pointer'
                          : 'bg-[#1B253A] text-[#64748B] cursor-not-allowed'
                      }`}
                    >
                      استلام
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Permanent Achievements & Exclusive Hero Titles */}
      <section className="isekai-panel rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3.5">
          <div>
            <h2 className="font-display text-xl font-bold text-[#F8FAFC] flex items-center gap-2">
              <Crown className="w-5 h-5 text-[#E6B85C]" />
              <span>الإنجازات الدائمة والألقاب الحصرية</span>
            </h2>
            <p className="text-xs text-[#94A3B8] mt-1">
              كل إنجاز يمنح لقباً قتالياً حصرياً يُضاف إلى هويتك ويمكن تجهيزه فوراً بجانب اسم بطلك في الميادين والقوائم.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-3 py-1.5 rounded-lg bg-[#0B1220] border border-[#E6B85C]/35 text-[#CBD5E1]">
              اللقب النشط: <strong className="text-[#E6B85C]">«{profile.avatar.title}»</strong>
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-[#0B1220] border border-white/10 font-mono-num text-[#38BDF8]">
              الألقاب المفتوحة: {profile.unlockedTitles.length}
            </span>
          </div>
        </div>

        {/* Secret Boss Unlocked Titles Quick Bar */}
        {SECRET_WORLD_BOSSES.some((b) => profile.defeatedSecretBossIds.includes(b.id)) && (
          <div className="p-3.5 rounded-xl bg-[#0B1220] border border-[#A855F7]/30 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-[#C084FC]">ألقاب الزعماء السريين المفتوحة:</span>
            <div className="flex flex-wrap gap-2">
              {SECRET_WORLD_BOSSES.filter(
                (b) => b.unlockTitle && profile.unlockedTitles.includes(b.unlockTitle)
              ).map((b) => {
                const equipped = profile.avatar.title === b.unlockTitle;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      if (b.unlockTitle && onEquipTitle?.(b.unlockTitle)) {
                        showNotice(`تم تجهيز اللقب الحصري «${b.unlockTitle}»!`);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      equipped
                        ? 'bg-[#E6B85C] text-[#0A0F1A] border-[#FDE68A]'
                        : 'bg-[#161F33] hover:bg-[#223150] text-[#E2E8F0] border-white/15'
                    }`}
                  >
                    {b.unlockTitle} {equipped ? '· مجهّز' : ''}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ACHIEVEMENT_DEFS.map((ach) => {
            const val = getAchievementCurrentValue(profile, ach.metric);
            const pct = Math.min(100, Math.round((val / ach.target) * 100));
            const claimed = profile.claimedAchievements.includes(ach.id);
            const ready = val >= ach.target && !claimed;
            const titleUnlocked = profile.unlockedTitles.includes(ach.rewardTitle);
            const titleEquipped = profile.avatar.title === ach.rewardTitle;

            return (
              <div
                key={ach.id}
                className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                  ready
                    ? 'bg-[#1A243B] border-[#E6B85C]'
                    : claimed
                      ? 'bg-[#0E1728] border-[#10B981]/30'
                      : 'bg-[#0B1220] border-white/10'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#E6B85C]">
                        <Medal className="w-3.5 h-3.5" />
                        <span>لقب حصري: «{ach.rewardTitle}»</span>
                      </div>
                      <h3 className="font-display text-sm sm:text-base font-bold text-[#F8FAFC] mt-0.5">
                        {ach.title}
                      </h3>
                    </div>
                    <span className="font-mono-num text-xs text-[#CBD5E1] shrink-0">
                      {Math.min(val, ach.target)}/{ach.target}
                    </span>
                  </div>
                  <p className="text-xs text-[#94A3B8] leading-snug">{ach.description}</p>
                  <div className="w-full h-1.5 bg-[#162136] rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${claimed ? 'bg-[#10B981]' : 'bg-[#E6B85C]'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5 text-[11px]">
                  <span className="font-mono-num text-[#CBD5E1]">
                    +{ach.rewardGold}ذ · +{ach.rewardGems}ج · +{ach.rewardMarks}وسام
                  </span>
                  <div className="flex items-center gap-2">
                    {titleUnlocked && (
                      <button
                        type="button"
                        disabled={titleEquipped}
                        onClick={() => {
                          if (onEquipTitle?.(ach.rewardTitle)) {
                            showNotice(`تم تجهيز اللقب «${ach.rewardTitle}» على شخصيتك!`);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                          titleEquipped
                            ? 'bg-[#132A24] text-[#10B981] border border-[#10B981]/40 cursor-default'
                            : 'bg-[#1C2A45] hover:bg-[#293D63] text-[#F8FAFC] cursor-pointer'
                        }`}
                      >
                        {titleEquipped ? 'اللقب مجهّز' : 'تجهيز اللقب'}
                      </button>
                    )}
                    {!claimed && (
                      <button
                        type="button"
                        disabled={!ready}
                        onClick={() => {
                          if (onClaimAchievement?.(ach.id)) {
                            showNotice(`مبارك! فتحت الإنجاز واللقب الحصري «${ach.rewardTitle}»!`);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                          ready
                            ? 'bg-[#E6B85C] hover:bg-[#F5D076] text-[#0A0F1A] cursor-pointer'
                            : 'bg-[#1B253A] text-[#64748B] cursor-not-allowed'
                        }`}
                      >
                        فتح واستلام
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Guild Work Contracts, Resource Bag & Guild Marks Exchange */}
      <section className="isekai-panel rounded-2xl p-5 sm:p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <h2 className="font-display text-xl font-bold text-[#F8FAFC] flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-[#E6B85C]" />
              <span>مكتب عقود النقابة واقتصاد الموارد</span>
            </h2>
            <p className="text-xs text-[#94A3B8] mt-1">
              اعمل مع الحرفيين والتجار المسالمين في الخريطة الأساسية أو فعّل العقود من هنا وتابع تقدمك.
            </p>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-[#0B1220] border border-[#10B981]/35 flex items-center gap-2 text-xs">
            <Award className="w-4 h-4 text-[#10B981]" />
            <span className="text-[#CBD5E1]">رصيد أوسمة النقابة:</span>
            <strong className="font-mono-num text-sm text-[#10B981]">{profile.guildMarks}</strong>
          </div>
        </div>

        {/* Resource Bag & Guild Exchange Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-6 p-4 rounded-xl bg-[#0B1220] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-[#F1F5F9]">حقيبة موارد قارة إيثيريا</h3>
              <button
                type="button"
                disabled={totalResources <= 0}
                onClick={() => showNotice(onSellAllResources().message)}
                className="px-3 py-1.5 text-xs font-bold text-[#0A0F1A] bg-[#E6B85C] hover:bg-[#F5D076] disabled:opacity-40 rounded-lg cursor-pointer"
              >
                بيع الكل لأوسمة النقابة
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2.5 text-xs">
              {(
                [
                  { id: 'herb', label: 'أعشاب القمر', value: 8, color: '#22C55E' },
                  { id: 'ore', label: 'خام أوريكالكوم', value: 12, color: '#F59E0B' },
                  { id: 'crystal', label: 'بلورات الأثير', value: 18, color: '#38BDF8' },
                ] as const
              ).map((res) => {
                const count = profile.gatheredResources[res.id] || 0;
                return (
                  <div key={res.id} className="p-3 rounded-lg bg-[#121B2D] border border-white/10 flex flex-col justify-between gap-2">
                    <div>
                      <div className="font-bold truncate" style={{ color: res.color }}>{res.label}</div>
                      <div className="font-mono-num text-lg font-bold text-[#F8FAFC] mt-0.5">{count}</div>
                      <div className="text-[10px] text-[#94A3B8]">{res.value} وسام / قطعة</div>
                    </div>
                    <button
                      type="button"
                      disabled={count <= 0}
                      onClick={() => showNotice(onSellSingleResource(res.id).message)}
                      className="w-full py-1 text-[11px] font-bold rounded bg-[#1B2840] hover:bg-[#253655] disabled:opacity-35 text-[#F1F5F9] cursor-pointer"
                    >
                      بيع (+{count * res.value})
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-6 p-4 rounded-xl bg-[#0B1220] border border-white/10 space-y-3">
            <h3 className="font-display text-sm font-bold text-[#F1F5F9]">استبدال أوسمة النقابة</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <button
                type="button"
                disabled={profile.guildMarks < 20}
                onClick={() => showNotice(onExchangeGuildMarks('gold').message)}
                className="p-3 rounded-lg bg-[#121B2D] hover:bg-[#1A263E] disabled:opacity-45 border border-[#E6B85C]/30 text-right space-y-1 cursor-pointer"
              >
                <div className="flex items-center justify-between text-[#E6B85C] font-bold">
                  <span>+300 ذهب</span>
                  <Coins className="w-4 h-4" />
                </div>
                <div className="font-mono-num text-[11px] text-[#94A3B8]">التكلفة: 20 وسام</div>
              </button>
              <button
                type="button"
                disabled={profile.guildMarks < 30}
                onClick={() => showNotice(onExchangeGuildMarks('gems').message)}
                className="p-3 rounded-lg bg-[#121B2D] hover:bg-[#1A263E] disabled:opacity-45 border border-[#38BDF8]/30 text-right space-y-1 cursor-pointer"
              >
                <div className="flex items-center justify-between text-[#38BDF8] font-bold">
                  <span>+12 جوهرة</span>
                  <Gem className="w-4 h-4" />
                </div>
                <div className="font-mono-num text-[11px] text-[#94A3B8]">التكلفة: 30 وسام</div>
              </button>
              <button
                type="button"
                disabled={profile.guildMarks < 65}
                onClick={() => showNotice(onExchangeGuildMarks('mythic_chest').message)}
                className="p-3 rounded-lg bg-[#121B2D] hover:bg-[#1A263E] disabled:opacity-45 border border-[#A855F7]/35 text-right space-y-1 cursor-pointer"
              >
                <div className="flex items-center justify-between text-[#C084FC] font-bold">
                  <span>صندوق أسطوري</span>
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="font-mono-num text-[11px] text-[#94A3B8]">التكلفة: 65 وسام</div>
              </button>
            </div>
          </div>
        </div>

        {/* 5 Peaceful NPC Contracts */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {NPC_JOB_LIST.map((job) => {
            const npc = OVERWORLD_MAP.worldNpcs?.find((n) => n.id === job.npcId);
            const state = profile.activeNpcJobs[job.id];
            const progress = state?.progress || 0;
            const pct = Math.min(100, Math.round((progress / job.target) * 100));
            const isCompleted = Boolean(state?.completed);
            const canClaim = Boolean(state && !isCompleted && progress >= job.target);

            return (
              <div
                key={job.id}
                className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                  canClaim
                    ? 'bg-[#17243D] border-[#E6B85C]'
                    : 'bg-[#0B1220] border-white/10'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-[#38BDF8]">{npc?.name || 'عضو النقابة'}</span>
                    <span className="font-mono-num text-[#94A3B8]">
                      {progress}/{job.target}
                    </span>
                  </div>
                  <h3 className="font-display text-sm font-bold text-[#F8FAFC]">{job.title}</h3>
                  <p className="text-xs text-[#94A3B8] leading-snug">{job.description}</p>
                  {state && (
                    <div className="w-full h-1.5 bg-[#162136] rounded-full overflow-hidden mt-1">
                      <div
                        className={`h-full ${isCompleted ? 'bg-[#10B981]' : 'bg-[#E6B85C]'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5 text-[11px]">
                  <span className="font-mono-num text-[#E6B85C]">
                    +{job.rewardGold}ذ · +{job.rewardGuildMarks}وسام · +{job.rewardGems}ج
                  </span>
                  {isCompleted ? (
                    <span className="text-[#10B981] font-bold">مُسلَّم</span>
                  ) : canClaim ? (
                    <button
                      type="button"
                      onClick={() => showNotice(onCompleteNpcJob(job.id).message)}
                      className="px-3 py-1.5 rounded-lg bg-[#E6B85C] hover:bg-[#F5D076] text-[#0A0F1A] font-bold cursor-pointer"
                    >
                      استلام الأجر
                    </button>
                  ) : state ? (
                    <span className="text-[#38BDF8] font-semibold">قيد التنفيذ</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => showNotice(onAcceptNpcJob(job.id).message)}
                      className="px-3 py-1.5 rounded-lg bg-[#1D2B44] hover:bg-[#283B5E] text-[#F1F5F9] font-bold cursor-pointer"
                    >
                      توقيع العقد
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Chests Vault */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl bg-[#141922] border border-white/10 flex flex-col justify-between gap-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-[#E59A24]">
                <Gift className="w-5 h-5" />
                <h2 className="font-display text-xl font-bold text-[#F2F4F8]">صندوق المحارب</h2>
              </div>
              <p className="text-xs text-[#9AA6B8] leading-relaxed">
                يُمنح تلقائياً كل انتصارين وعند إتمام المهام. يحتوي على 150–270 ذهب، 4–8 جواهر، خبرة، ونقطة قوة إضافية.
              </p>
            </div>
            <div className="text-left shrink-0">
              <div className="text-[11px] text-[#8F9BAE]">الرصيد</div>
              <div className="font-mono-num text-2xl font-bold text-[#F59E0B]">
                {profile.warriorChests}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/10">
            <button
              type="button"
              disabled={profile.warriorChests <= 0}
              onClick={() => handleOpen('warrior')}
              className="flex-1 py-2.5 px-4 text-sm font-bold text-[#0D1015] bg-[#E59A24] hover:bg-[#F59E0B] disabled:opacity-40 rounded-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <PackageOpen className="w-4 h-4" />
              <span>فتح صندوق ({profile.warriorChests})</span>
            </button>
            <button
              type="button"
              onClick={() => handleBuy('warrior')}
              className="py-2.5 px-4 text-xs font-semibold text-[#F2F4F8] bg-[#1C2330] hover:bg-[#263042] border border-white/10 rounded-lg whitespace-nowrap cursor-pointer"
            >
              شراء (260 ذهب)
            </button>
          </div>
        </div>

        <div className="p-6 rounded-xl bg-[#141922] border border-white/10 flex flex-col justify-between gap-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-[#38BDF8]">
                <Trophy className="w-5 h-5" />
                <h2 className="font-display text-xl font-bold text-[#F2F4F8]">الصندوق الأسطوري</h2>
              </div>
              <p className="text-xs text-[#9AA6B8] leading-relaxed">
                يُمنح عند هزيمة الزعماء وإتمام تحديات الخرائط الواسعة. يحتوي على 360–600 ذهب، 15–26 جوهرة، ونقطتي قوة.
              </p>
            </div>
            <div className="text-left shrink-0">
              <div className="text-[11px] text-[#8F9BAE]">الرصيد</div>
              <div className="font-mono-num text-2xl font-bold text-[#38BDF8]">
                {profile.mythicChests}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/10">
            <button
              type="button"
              disabled={profile.mythicChests <= 0}
              onClick={() => handleOpen('mythic')}
              className="flex-1 py-2.5 px-4 text-sm font-bold text-[#0D1015] bg-[#38BDF8] hover:bg-[#7DD3FC] disabled:opacity-40 rounded-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <PackageOpen className="w-4 h-4" />
              <span>فتح أسطوري ({profile.mythicChests})</span>
            </button>
            <button
              type="button"
              onClick={() => handleBuy('mythic')}
              className="py-2.5 px-4 text-xs font-semibold text-[#F2F4F8] bg-[#1C2330] hover:bg-[#263042] border border-white/10 rounded-lg whitespace-nowrap cursor-pointer"
            >
              شراء (18 جوهرة)
            </button>
          </div>
        </div>
      </section>

      {/* Wide Map Challenges */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-[#F2F4F8] flex items-center gap-2">
              <Compass className="w-5 h-5 text-[#38BDF8]" />
              <span>تحديات الخرائط الواسعة والمهام الميدانية</span>
            </h2>
            <p className="text-xs text-[#8F9BAE] mt-0.5">
              المهام الميدانية المكتملة داخل الساحات:{' '}
              <strong className="font-mono-num text-[#38BDF8]">{profile.missionsCompleted}</strong> · كل تحدٍ يمنح صندوقاً أسطورياً مجانياً.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MAP_CHALLENGES.map((ch) => {
            const currentVal =
              ch.metric === 'kills'
                ? profile.totalKills
                : ch.metric === 'bossKills'
                  ? profile.bossKills
                  : ch.metric === 'missions'
                    ? profile.missionsCompleted
                    : ch.metric === 'rating'
                      ? profile.rating
                      : ch.metric === 'regions'
                        ? profile.discoveredRegions.length
                        : 0;
            const claimed = profile.claimedChallenges.includes(ch.id);
            const ready = currentVal >= ch.target && !claimed;
            const pct = Math.min(100, Math.round((currentVal / ch.target) * 100));
            const arenaName =
              ch.arenaId === 'etheria_overworld'
                ? OVERWORLD_MAP.name
                : ARENAS[ch.arenaId]?.name || 'الميدان';

            return (
              <div
                key={ch.id}
                className={`p-5 rounded-xl border flex flex-col justify-between gap-4 ${
                  ready
                    ? 'bg-[#16223A] border-[#38BDF8]'
                    : 'bg-[#121B2D]/90 border-white/10'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] text-[#38BDF8] font-semibold">{arenaName}</span>
                      <h3 className="font-display text-base font-bold text-[#F2F4F8]">{ch.title}</h3>
                    </div>
                    <span className="font-mono-num text-xs text-[#9AA6B8]">
                      {Math.min(currentVal, ch.target)}/{ch.target}
                    </span>
                  </div>
                  <p className="text-xs text-[#8F9BAE] leading-relaxed">{ch.description}</p>
                  <div className="w-full h-1.5 bg-[#0D1015] rounded-full overflow-hidden mt-2">
                    <div
                      className={`h-full transition-all ${claimed ? 'bg-[#10B981]' : 'bg-[#38BDF8]'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/5 text-xs">
                  <div className="text-[#9AA6B8]">
                    <span className="font-mono-num text-[#F59E0B]">{ch.rewardGold} ذهب</span>
                    <span className="mx-1.5">·</span>
                    <span className="font-mono-num text-[#38BDF8]">{ch.rewardGems} جوهرة</span>
                    <span className="mx-1.5">·</span>
                    <span className="font-mono-num text-[#10B981]">+ صندوق أسطوري</span>
                  </div>

                  {claimed ? (
                    <span className="text-[#10B981] font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>مكتمل</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={!ready}
                      onClick={() => {
                        if (onClaimChallenge(ch.id)) {
                          showNotice(`تم استلام مكافأة تحدي «${ch.title}» + صندوق أسطوري!`);
                        }
                      }}
                      className={`px-3.5 py-1.5 rounded-md font-bold transition-colors whitespace-nowrap ${
                        ready
                          ? 'bg-[#38BDF8] hover:bg-[#7DD3FC] text-[#0D1015] cursor-pointer'
                          : 'bg-[#1C2330] text-[#647185] cursor-not-allowed'
                      }`}
                    >
                      استلام التحدي
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Quests & Milestones */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-[#F2F4F8]">مهام الساحة والإنجازات</h2>
            <p className="text-xs text-[#8F9BAE] mt-0.5">
              أُنجز <span className="font-mono-num text-[#F2F4F8]">{completedCount}/{profile.quests.length}</span> مهمة · كل مهمة تمنح أيضاً صندوق محارب مجاني.
            </p>
          </div>
          <div className="text-xs text-[#8F9BAE] flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#E59A24]" />
            <span>رتبتك الحالية: {getRankLabel(profile.rating)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {profile.quests.map((q) => {
            const pct = Math.min(100, Math.round((q.current / q.target) * 100));
            const ready = q.current >= q.target && !q.claimed;
            return (
              <div
                key={q.id}
                className={`p-5 rounded-xl border flex flex-col justify-between gap-4 ${
                  ready
                    ? 'bg-[#16223A] border-[#E6B85C]'
                    : 'bg-[#121B2D]/90 border-white/10'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-display text-base font-bold text-[#F2F4F8]">{q.title}</h3>
                    <span className="font-mono-num text-xs text-[#9AA6B8]">
                      {q.current}/{q.target}
                    </span>
                  </div>
                  <p className="text-xs text-[#8F9BAE] leading-relaxed">{q.description}</p>
                  <div className="w-full h-1.5 bg-[#0D1015] rounded-full overflow-hidden mt-2">
                    <div
                      className={`h-full transition-all ${q.claimed ? 'bg-[#10B981]' : 'bg-[#E6B85C]'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/5 text-xs">
                  <div className="text-[#9AA6B8]">
                    <span className="font-mono-num text-[#E6B85C]">{q.rewardGold} ذهب</span>
                    <span className="mx-1.5">·</span>
                    <span className="font-mono-num text-[#38BDF8]">{q.rewardGems} جوهرة</span>
                    <span className="mx-1.5">·</span>
                    <span className="font-mono-num text-[#10B981]">{q.rewardXp} XP</span>
                  </div>

                  {q.claimed ? (
                    <span className="text-[#10B981] font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>تم الاستلام</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={!ready}
                      onClick={() => onClaimQuest(q.id)}
                      className={`px-3.5 py-1.5 rounded-md font-bold transition-colors whitespace-nowrap ${
                        ready
                          ? 'bg-[#E6B85C] hover:bg-[#F5D076] text-[#0A0F1A] cursor-pointer'
                          : 'bg-[#1B253A] text-[#647185] cursor-not-allowed'
                      }`}
                    >
                      استلام المكافأة
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Monster Chain Bestiary (9 Monsters & Bosses) */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-[#F2F4F8] flex items-center gap-2">
              <Skull className="w-5 h-5 text-[#F97316]" />
              <span>سلسلة الوحوش والزعماء ({MONSTER_LIST.length} فئات)</span>
            </h2>
            <p className="text-xs text-[#8F9BAE] mt-0.5">
              تظهر الوحوش تدريجياً حسب رقم الموجة في الساحات الواسعة بذكاء التفاف وإطلاق قذائف، وتُختتم بعملاق الهاوية في الموجة 6.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MONSTER_LIST.map((m) => {
            const slainCount = profile.monsterKillsByType[m.id] || 0;
            return (
              <div
                key={m.id}
                className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                  m.isBoss
                    ? 'bg-[#1B1626] border-[#F97316]/45'
                    : 'bg-[#121B2D]/90 border-white/10'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold" style={{ color: m.accentColor }}>
                      المستوى {m.tier} · {m.roleLabel}
                    </span>
                    <span className="font-mono-num text-xs text-[#9AA6B8]">
                      هزمتهم: <strong className="text-[#F2F4F8]">{slainCount}</strong>
                    </span>
                  </div>
                  <h3 className="font-display text-base font-bold text-[#F2F4F8]">{m.name}</h3>
                  <p className="text-xs text-[#9AA6B8] leading-relaxed">{m.description}</p>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-xs">
                  <div>
                    <span className="text-[11px] text-[#7B889C] block">الصحة</span>
                    <span className="font-mono-num font-semibold text-[#F2F4F8]">{m.maxHp}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#7B889C] block">الضرر</span>
                    <span className="font-mono-num font-semibold text-[#F59E0B]">{m.damage}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#7B889C] block">المكافأة</span>
                    <span className="font-mono-num font-semibold text-[#10B981]">+{m.goldReward} ذ</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
};
