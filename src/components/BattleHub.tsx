import React, { useState } from 'react';
import {
  Award,
  BookOpen,
  Camera,
  Compass,
  Cpu,
  Flame,
  Layers,
  Lock,
  Maximize2,
  Monitor,
  Radar,
  Shield,
  Sliders,
  Smartphone,
  Sparkles,
  Swords,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type {
  AppDestination,
  ArenaId,
  CameraViewMode,
  DeviceMode,
  GameMode,
  GraphicsQuality,
  PlayerProfile,
  RenderEngineMode,
} from '../types/game';
import {
  ARENAS,
  ARENA_LIST,
  OVERWORLD_MAP,
  POWERS,
  WEAPONS,
  computeFighterDerivedStats,
  getRankLabel,
  xpForNextLevel,
} from '../data/gameCatalog';
import {
  DEFAULT_KEY_BINDINGS,
  QUALITY_LEVELS,
  RENDER_ENGINE_OPTIONS,
  formatKeyCodeLabel,
} from '../data/controlDefaults';
import { detectWebGLCapability, resolveRenderEngine } from '../engine/webglCapability';
import { AvatarPreview3D } from './AvatarPreview3D';
import { StatsRadarChart } from './StatsRadarChart';

interface BattleHubProps {
  profile: PlayerProfile;
  selectedArena: ArenaId;
  selectedMode: GameMode;
  onlinePlayers: number;
  onSelectArena: (arenaId: ArenaId) => void;
  onSelectMode: (mode: GameMode) => void;
  onStartCombat: (mode: GameMode, arenaId: ArenaId) => void;
  onNavigate: (dest: AppDestination) => void;
  onOpenStory: () => void;
  onOpenCustomizer?: () => void;
  onChangeQuality: (q: GraphicsQuality) => void;
  onChangeRenderEngine?: (mode: RenderEngineMode) => void;
  onChangeCamera: (c: CameraViewMode) => void;
  onChangeDeviceMode: (d: DeviceMode) => void;
  onToggleLandscape?: (locked: boolean) => void;
  onToggleSound: () => void;
}

const MODES: { id: GameMode; title: string; subtitle: string; meta: string }[] = [
  {
    id: 'unified_clash',
    title: 'الميدان الموحد: وحوش + أبطال',
    subtitle: 'دمج القتال الحر مع غارات الوحوش ونزال الأبطال في معركة واحدة متكاملة.',
    meta: 'موجات وحوش · أبطال منافسون · نقاط تصنيف + غنائم مضاعفة',
  },
  {
    id: 'monster_raid',
    title: 'غارة الزعيم والعمالقة',
    subtitle: 'موجات متصاعدة تختبر مهاراتك الأربع ضد سلسلة الوحوش حتى الزعماء.',
    meta: 'تحدي PvE مركز · جواهر وصناديق أسطورية',
  },
  {
    id: 'pvp_ranked',
    title: 'نزال الأبطال 1 ضد 1',
    subtitle: 'مبارزة مباشرة لرفع تصنيفك في سلم نقابة إيثيريا.',
    meta: 'تحدي PvP مصنف · +34 تصنيف عند الفوز',
  },
  {
    id: 'pvp_local',
    title: 'مبارزة محلية 1 ضد 1',
    subtitle: 'لاعبان على نفس الجهاز — الأفضل من 3 جولات.',
    meta: 'لعب مشترك فوري · لوحة تحكم مزدوجة',
  },
];

const CAMERA_OPTIONS: { id: CameraViewMode; label: string }[] = [
  { id: 'third_person', label: 'الشخص الثالث' },
  { id: 'over_shoulder', label: 'خلف الكتف' },
  { id: 'isometric_3d', label: 'إيزومتري 3D' },
  { id: 'side_fighter', label: 'جانبي قتالي' },
  { id: 'top_tactical', label: 'علوي تكتيكي' },
  { id: 'cinematic_free', label: 'سينمائي حر' },
];

export const BattleHub: React.FC<BattleHubProps> = ({
  profile,
  selectedArena,
  selectedMode,
  onlinePlayers,
  onSelectArena,
  onSelectMode,
  onStartCombat,
  onNavigate,
  onOpenStory,
  onOpenCustomizer,
  onChangeQuality,
  onChangeRenderEngine,
  onChangeCamera,
  onChangeDeviceMode,
  onToggleLandscape,
  onToggleSound,
}) => {
  const [previewAct, setPreviewAct] = useState<'idle' | 'attack' | 'power'>('idle');
  const [heroPanelMode, setHeroPanelMode] = useState<'avatar' | 'radar'>('avatar');
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const kb = profile.keyBindings || DEFAULT_KEY_BINDINGS;
  const skillKeys = [
    formatKeyCodeLabel(kb.skill0),
    formatKeyCodeLabel(kb.skill1),
    formatKeyCodeLabel(kb.skill2),
    formatKeyCodeLabel(kb.skill3),
  ];
  const webglCap = detectWebGLCapability();
  const renderMode = profile.renderEngine || 'auto';
  const activeEngine = resolveRenderEngine(renderMode);

  const arena = ARENAS[selectedArena];
  const weapon = WEAPONS[profile.avatar.weaponId];
  const equippedGearCount = Object.values(profile.equippedGear).filter(Boolean).length;
  const weaponLv = profile.weaponLevels[profile.avatar.weaponId] || 1;
  const derived = computeFighterDerivedStats(profile.avatar, weaponLv, profile.equippedGear);
  const nextXp = xpForNextLevel(profile.level);
  const xpPct = Math.min(100, Math.round((profile.xp / nextXp) * 100));

  return (
    <main className="ui-shell-container space-y-[var(--ui-section-gap)]">
      {/* Compact Isekai Guild Profile & Engine Bar */}
      <section className="isekai-panel rounded-2xl p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <div>
            <span className="text-[#94A3B8]">المستوى </span>
            <span className="font-mono-num font-bold text-[#F8FAFC]">{profile.level}</span>
            <span className="text-[#475569] mx-2">·</span>
            <span className="text-[#94A3B8]">الرتبة </span>
            <span className="font-bold text-[#E6B85C]">{getRankLabel(profile.rating)}</span>
            <span className="font-mono-num text-xs text-[#94A3B8] mr-1.5">({profile.rating})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-[#162136] rounded-full overflow-hidden border border-white/5">
              <div className="h-full bg-gradient-to-r from-[#38BDF8] to-[#E6B85C]" style={{ width: `${xpPct}%` }} />
            </div>
            <span className="font-mono-num text-xs text-[#94A3B8]">
              {profile.xp}/{nextXp} XP
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs sm:text-sm md:hidden">
            <span>
              <span className="text-[#94A3B8]">ذهب: </span>
              <span className="font-mono-num font-bold text-[#E6B85C]">{profile.gold}</span>
            </span>
            <span>
              <span className="text-[#94A3B8]">جواهر: </span>
              <span className="font-mono-num font-bold text-[#38BDF8]">{profile.gems}</span>
            </span>
            <span>
              <span className="text-[#94A3B8]">أوسمة: </span>
              <span className="font-mono-num font-bold text-[#10B981]">{profile.guildMarks}</span>
            </span>
          </div>
        </div>

        {/* Device Switcher, 5 Quality Tiers, 6 Camera Modes & Story Replay */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenStory}
            className="px-3 py-1.5 text-xs font-semibold text-[#FDE68A] bg-[#1A1A2E] hover:bg-[#232542] border border-[#E6B85C]/35 rounded-lg flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#E6B85C]" />
            <span>سِفر البداية</span>
          </button>

          <div
            className="flex items-center gap-1 p-1 bg-[#0B1220] border border-[#E6B85C]/30 rounded-lg"
            role="group"
            aria-label="تحويل وضع اللعب بين الهاتف والحاسوب"
          >
            <button
              type="button"
              onClick={() => onChangeDeviceMode('desktop')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
                profile.deviceMode === 'desktop'
                  ? 'bg-[#E6B85C] text-[#0A0F1A]'
                  : 'text-[#94A3B8] hover:text-[#F1F5F9]'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>حاسوب</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeDeviceMode('mobile')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
                profile.deviceMode === 'mobile'
                  ? 'bg-[#E6B85C] text-[#0A0F1A]'
                  : 'text-[#94A3B8] hover:text-[#F1F5F9]'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>هاتف</span>
            </button>
          </div>

          {profile.deviceMode === 'mobile' && onToggleLandscape && (
            <button
              type="button"
              onClick={() => onToggleLandscape(!profile.landscapeLocked)}
              title="فتح القتال بالوضع الأفقي الكامل تلقائياً"
              className={`px-2.5 py-1.5 text-xs font-bold rounded-lg border flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                profile.landscapeLocked
                  ? 'bg-[#38BDF8] text-[#0A0F1A] border-[#BAE6FD]'
                  : 'bg-[#0B1220] text-[#7DD3FC] border-[#38BDF8]/35 hover:bg-[#132138]'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>{profile.landscapeLocked ? 'أفقي تلقائي: مفعل' : 'تفعيل الوضع الأفقي'}</span>
            </button>
          )}

          {onChangeRenderEngine && (
            <div
              className="flex items-center gap-1 px-2 py-1 bg-[#0B1220] border border-[#E6B85C]/30 rounded-lg max-w-full min-w-0"
              title={
                webglCap.supported
                  ? `بطاقة مكتشفة: ${webglCap.rendererName} (WebGL ${webglCap.version})`
                  : 'WebGL غير متاح — المحرك الخفيف يعمل تلقائياً'
              }
            >
              <Layers className="w-3.5 h-3.5 text-[#E6B85C] shrink-0" />
              <select
                aria-label="محرك الرسوميات المستقل"
                value={renderMode}
                onChange={(e) => onChangeRenderEngine(e.target.value as RenderEngineMode)}
                className="bg-transparent text-xs font-semibold text-[#F1F5F9] focus:outline-none cursor-pointer pr-1 min-w-0 max-w-full truncate"
              >
                {RENDER_ENGINE_OPTIONS.map((opt) => (
                  <option
                    key={opt.id}
                    value={opt.id}
                    disabled={opt.id === 'webgl' && !webglCap.supported}
                    className="bg-[#0D1422] text-[#F1F5F9]"
                  >
                    المحرك: {opt.label}
                    {opt.id === 'auto'
                      ? ` (${activeEngine === 'webgl' ? 'WebGL' : 'خفيف'})`
                      : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-1 px-2 py-1 bg-[#0B1220] border border-white/10 rounded-lg max-w-full min-w-0">
            <Cpu className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
            <select
              aria-label="جودة الرسوم والأداء"
              value={profile.quality}
              onChange={(e) => onChangeQuality(e.target.value as GraphicsQuality)}
              className="bg-transparent text-xs font-semibold text-[#F1F5F9] focus:outline-none cursor-pointer pr-1 min-w-0 max-w-full truncate"
            >
              {QUALITY_LEVELS.map((q) => (
                <option key={q.id} value={q.id} className="bg-[#0D1422] text-[#F1F5F9]">
                  الجودة: {q.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 px-2 py-1 bg-[#0B1220] border border-white/10 rounded-lg max-w-full min-w-0">
            <Camera className="w-3.5 h-3.5 text-[#E6B85C] shrink-0" />
            <select
              aria-label="زاوية الكاميرا ثلاثية الأبعاد"
              value={profile.cameraView}
              onChange={(e) => onChangeCamera(e.target.value as CameraViewMode)}
              className="bg-transparent text-xs font-semibold text-[#F1F5F9] focus:outline-none cursor-pointer pr-1 min-w-0 max-w-full truncate"
            >
              {CAMERA_OPTIONS.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#0D1422] text-[#F1F5F9]">
                  الكاميرا: {c.label}
                </option>
              ))}
            </select>
          </div>

          {onOpenCustomizer && (
            <button
              type="button"
              onClick={onOpenCustomizer}
              className="px-2.5 py-1.5 text-xs font-bold text-[#38BDF8] bg-[#0B1220] hover:bg-[#14213A] border border-[#38BDF8]/35 rounded-lg flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>تخصيص التحكم والواجهة</span>
            </button>
          )}

          <button
            type="button"
            onClick={onToggleSound}
            aria-label={profile.soundEnabled ? 'كتم الصوت' : 'تشغيل الصوت'}
            className="p-2 bg-[#0B1220] border border-white/10 rounded-lg text-[#94A3B8] hover:text-[#F1F5F9] transition-colors cursor-pointer"
          >
            {profile.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </section>

      {/* Main 2-Column Hero Split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 landscape-split-12 gap-7 items-stretch">
        {/* Right Column (in RTL): Setup & Launch */}
        <div className="lg:col-span-7 landscape-span-7 flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-semibold text-[#38BDF8] flex flex-wrap items-center gap-2">
              <span>
                محرك ثنائي (WebGL 1/2 ناعم + Canvas2D خفيف) · 6 مستويات حتى المستحيلة · 6 زوايا كاميرا 360°
              </span>
              <span className="text-[#475569]">·</span>
              <span className="text-[#E6B85C]">
                {activeEngine === 'webgl'
                  ? `النشط: WebGL ${webglCap.version || 1}${webglCap.isSoftwareGl ? ' (وضع التوافق)' : ' GPU'}`
                  : 'النشط: المحرك الخفيف Canvas2D'}
              </span>
            </p>
            <h1 className="font-display ui-hero-title font-extrabold text-[#F8FAFC] max-w-2xl">
              ميثاق إيثيريا: قاتل، اعمل في النقابة، وافتح القارة
            </h1>
            <p className="text-[#94A3B8] text-sm sm:text-base leading-relaxed max-w-xl">
              قارة أساسية مفتوحة بقطر 14,000 متر تعمل ببث الخريطة الحي 100× (تضم 9 أقاليم و5 شخصيات مسالمة وعقود عمل وتجارة)، إلى جانب 6 ساحات معارك كبرى و8 سمات مع مخطط راداري وشبكة مهارات ودمج.
            </p>
          </div>

          {/* Mode Selector */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-base font-bold text-[#F1F5F9]">
                اختر نمط ساحة القتال
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('pvp')}
                className="text-xs font-medium text-[#E6B85C] hover:text-[#F5D076] transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                <span>غرف التنافس المباشر أونلاين ({onlinePlayers} متصل)</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {MODES.map((m) => {
                const active = selectedMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onSelectMode(m.id)}
                    className={`text-right p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                      active
                        ? 'bg-[#17243D] border-[#E6B85C] text-[#F8FAFC] shadow-[0_0_24px_-8px_rgba(230,184,92,0.35)]'
                        : 'isekai-card text-[#94A3B8] hover:border-[#38BDF8]/40 hover:text-[#F1F5F9]'
                    }`}
                  >
                    <div>
                      <div className="font-display text-base font-bold text-[#F8FAFC] mb-1">
                        {m.title}
                      </div>
                      <p className="text-xs leading-relaxed text-[#94A3B8]">{m.subtitle}</p>
                    </div>
                    <p className="text-[11px] font-medium text-[#E6B85C] pt-1.5 border-t border-white/5">
                      {m.meta}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active 4-Skill Loadout Summary & Primary CTAs */}
          <div className="pt-1 space-y-4">
            <div className="isekai-card rounded-xl p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#94A3B8]">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>
                    المقاتل: <strong className="text-[#F8FAFC]">{profile.avatar.name}</strong>
                  </span>
                  <span>·</span>
                  <span>
                    السلاح: <strong className="text-[#E6B85C]">{weapon.name} (م{weaponLv})</strong>
                  </span>
                  <span>·</span>
                  <span>
                    السامان: <strong className="text-[#10B981]">{equippedGearCount}/3</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('forge')}
                  className="text-[#38BDF8] hover:text-[#7DD3FC] font-semibold cursor-pointer"
                >
                  تخصيص الخانات والشبكة ({profile.unlockedSkillSlots}/4)
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {profile.avatar.powerSlots.map((pId, idx) => {
                  const pw = POWERS[pId];
                  const isUnlockedSlot = idx < profile.unlockedSkillSlots;
                  return (
                    <div
                      key={`${pId}_${idx}`}
                      className={`px-2.5 py-1.5 rounded-lg border flex items-center justify-between gap-1.5 text-[11px] ${
                        isUnlockedSlot
                          ? 'bg-[#0A101E] border-white/15'
                          : 'bg-[#070B14] border-white/5 opacity-60'
                      }`}
                    >
                      <span className="truncate font-semibold text-[#F1F5F9] flex items-center gap-1">
                        {!isUnlockedSlot && <Lock className="w-3 h-3 text-[#F59E0B] shrink-0" />}
                        <span className="truncate">{isUnlockedSlot ? pw?.name : 'خانة مقفلة'}</span>
                      </span>
                      <span className="font-mono-num font-bold text-[#E6B85C] shrink-0">
                        [{skillKeys[idx]}]
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onStartCombat(selectedMode, selectedArena)}
                className="min-h-[46px] px-7 py-3 text-base font-bold system-btn-primary rounded-xl transition-all flex items-center gap-2.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Swords className="w-5 h-5" />
                <span>انطلق إلى الساحة</span>
              </button>

              <button
                type="button"
                onClick={() => onStartCombat('world_explore', selectedArena)}
                className="min-h-[46px] px-5 py-3 text-sm font-bold text-[#0A0F1A] bg-[#38BDF8] hover:bg-[#7DD3FC] border border-[#BAE6FD]/50 rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Compass className="w-4 h-4" />
                <span>دخول عالم إيثيريا (14,000م)</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('forge')}
                className="min-h-[46px] px-4 py-3 text-sm font-semibold text-[#F1F5F9] bg-[#121B2D] hover:bg-[#1A263E] border border-white/15 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                الأفتار والسمات
                {profile.unspentStatPoints > 0 && (
                  <span className="font-mono-num text-[#E6B85C] mr-2">
                    (+{profile.unspentStatPoints})
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => onNavigate('armory')}
                className="min-h-[46px] px-4 py-3 text-sm font-semibold text-[#F1F5F9] bg-[#121B2D] hover:bg-[#1A263E] border border-white/15 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                المتجر والسامان
              </button>
            </div>
          </div>
        </div>

        {/* Left Column (in RTL): Live Interactive 3D Avatar + 8-Stat Radar Toggle */}
        <div className="lg:col-span-5 landscape-span-5 flex flex-col isekai-panel rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E6B85C]/20 bg-[#0A101E]/60">
            <div>
              <h3 className="font-display text-base font-bold text-[#F8FAFC]">
                {profile.avatar.name}
              </h3>
              <p className="text-xs text-[#94A3B8]">
                {profile.avatar.title} · {heroPanelMode === 'avatar' ? 'اسحب لتدوير المجسّم 360°' : 'رادار السمات الثماني'}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setHeroPanelMode((m) => (m === 'avatar' ? 'radar' : 'avatar'))}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md border flex items-center gap-1 cursor-pointer transition-colors ${
                  heroPanelMode === 'radar'
                    ? 'bg-[#E6B85C] text-[#0A0F1A] border-[#FDE68A]'
                    : 'bg-[#0A0F1A] text-[#38BDF8] border-[#38BDF8]/30 hover:bg-[#142038]'
                }`}
              >
                <Radar className="w-3.5 h-3.5" />
                <span>{heroPanelMode === 'avatar' ? 'الرادار' : 'الأفتار'}</span>
              </button>

              {heroPanelMode === 'avatar' && (
                <div className="flex items-center gap-1 p-1 bg-[#0A0F1A] rounded-lg border border-white/10">
                  {(
                    [
                      { id: 'idle', label: 'وقفة' },
                      { id: 'attack', label: 'هجوم' },
                      { id: 'power', label: 'قوة' },
                    ] as const
                  ).map((act) => (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => setPreviewAct(act.id)}
                      className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                        previewAct === act.id
                          ? 'bg-[#22324F] text-[#F8FAFC]'
                          : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                      }`}
                    >
                      {act.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {heroPanelMode === 'avatar' ? (
            <AvatarPreview3D
              avatar={profile.avatar}
              quality={profile.quality}
              renderEngine={profile.renderEngine}
              weaponLevel={weaponLv}
              previewAction={previewAct}
              className="flex-1 h-[clamp(240px,38dvh,380px)] lg:h-auto lg:min-h-[360px] landscape-preview-box"
            />
          ) : (
            <div className="flex-1 min-h-[240px] lg:min-h-[360px] landscape-preview-box bg-[#0B1220]/70 flex flex-col items-center justify-center p-4">
              <StatsRadarChart stats={profile.avatar.stats} compact />
              <div className="flex items-center gap-3 text-[11px] text-[#94A3B8] mt-1">
                <span>سرعة الضرب: <strong className="font-mono-num text-[#E6B85C]">{derived.attackSpeedMult}x</strong></span>
                <span>·</span>
                <span>تقليص التبريد: <strong className="font-mono-num text-[#38BDF8]">{Math.round(derived.cooldownReduction * 100)}%</strong></span>
                <span>·</span>
                <span>مضاعف الغنائم: <strong className="font-mono-num text-[#10B981]">{derived.lootMultiplier}x</strong></span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-4 divide-x divide-x-reverse divide-white/10 border-t border-[#E6B85C]/20 bg-[#0B111E]">
            <div className="p-3 text-center">
              <div className="text-[11px] text-[#94A3B8]">الصحة</div>
              <div className="font-mono-num text-sm font-semibold text-[#F8FAFC] mt-0.5">
                {derived.maxHp}
              </div>
            </div>
            <div className="p-3 text-center">
              <div className="text-[11px] text-[#94A3B8]">الهجوم</div>
              <div className="font-mono-num text-sm font-semibold text-[#E6B85C] mt-0.5">
                {derived.attackDamage}
              </div>
            </div>
            <div className="p-3 text-center">
              <div className="text-[11px] text-[#94A3B8]">السرعة</div>
              <div className="font-mono-num text-sm font-semibold text-[#38BDF8] mt-0.5">
                {derived.moveSpeed}
              </div>
            </div>
            <div className="p-3 text-center">
              <div className="text-[11px] text-[#94A3B8]">الدفاع</div>
              <div className="font-mono-num text-sm font-semibold text-[#10B981] mt-0.5">
                {Math.round(derived.armorReduction * 100)}%
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Full-Width 4-Column KPI Progress Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="isekai-card rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-[#94A3B8]">الوحوش المهزومة</p>
            <p className="font-mono-num text-2xl font-semibold text-[#F8FAFC] mt-1">
              {profile.totalKills}
            </p>
          </div>
          <Flame className="w-5 h-5 text-[#E6B85C]" />
        </div>
        <div className="isekai-card rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-[#94A3B8]">أقاليم إيثيريا المكتشفة</p>
            <p className="font-mono-num text-2xl font-semibold text-[#38BDF8] mt-1">
              {profile.discoveredRegions.length}/9
            </p>
          </div>
          <Compass className="w-5 h-5 text-[#38BDF8]" />
        </div>
        <div className="isekai-card rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-[#94A3B8]">أوسمة النقابة</p>
            <p className="font-mono-num text-2xl font-semibold text-[#E6B85C] mt-1">
              {profile.guildMarks}
            </p>
          </div>
          <Award className="w-5 h-5 text-[#E6B85C]" />
        </div>
        <div className="isekai-card rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-[#94A3B8]">صناديق جاهزة للفتح</p>
            <p className="font-mono-num text-2xl font-semibold text-[#10B981] mt-1">
              {profile.warriorChests + profile.mythicChests}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('rewards')}
            className="text-xs font-semibold text-[#E6B85C] hover:text-[#F5D076] cursor-pointer"
          >
            فتح والعقود
          </button>
        </div>
      </section>

      {/* Main 100x Larger Overworld Open Continent Showcase Card */}
      <section className="isekai-panel rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 landscape-split-12 items-stretch">
        <div className="lg:col-span-5 landscape-span-5 relative min-h-[200px] sm:min-h-[240px] bg-[#0D1422]">
          <img
            src={OVERWORLD_MAP.imagePath}
            alt={OVERWORLD_MAP.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-[#10182A] via-[#10182A]/45 to-transparent" />
          <div className="absolute bottom-3 right-3 px-3 py-1 rounded-lg bg-[#080D18]/85 border border-[#E6B85C]/35 text-[11px] font-bold text-[#E6B85C]">
            100× توسّع · 9 أحجار انتقال سريع [M]
          </div>
        </div>
        <div className="lg:col-span-7 landscape-span-7 p-4 sm:p-7 flex flex-col justify-between gap-4 sm:gap-5">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-[#38BDF8] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#E6B85C]" />
                <span>الخريطة الأساسية المفتوحة · قطر 14,000 متر (بث المقاطع الحي)</span>
              </span>
              <span className="font-mono-num text-[#E6B85C]">
                الأقاليم: {profile.discoveredRegions.length}/9 · المقاطع: {profile.exploredChunks.length} · الكنوز: {profile.openedWorldChests.length}/12
              </span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#F8FAFC]">
              {OVERWORLD_MAP.name}
            </h2>
            <p className="text-sm text-[#94A3B8] leading-relaxed">
              {OVERWORLD_MAP.description}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {OVERWORLD_MAP.componentsSummary.map((item, idx) => (
              <div key={idx} className="bg-[#0B1220] border border-white/10 rounded-lg p-3 space-y-1">
                <div className="font-display font-bold text-[#E6B85C]">{item.title}</div>
                <p className="text-[#94A3B8] leading-snug">{item.detail}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <span className="text-xs text-[#94A3B8]">
              تفاعل{' '}
              <strong className="font-mono-num text-[#F8FAFC]">
                [{formatKeyCodeLabel(kb.interact)}]
              </strong>{' '}
              لجمع الأعشاب والمعادن، التعاقد مع الشخصيات المسالمة الخمس، واضغط{' '}
              <strong className="font-mono-num text-[#38BDF8]">
                [{formatKeyCodeLabel(kb.map)}]
              </strong>{' '}
              للانتقال السريع.
            </span>
            <button
              type="button"
              onClick={() => onStartCombat('world_explore', selectedArena)}
              className="min-h-[44px] px-6 py-2.5 text-sm font-bold text-[#0A0F1A] bg-gradient-to-r from-[#E6B85C] to-[#F5D076] hover:brightness-105 rounded-xl flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <Compass className="w-4 h-4" />
              <span>دخول عالم إيثيريا الآن</span>
            </button>
          </div>
        </div>
      </section>

      {/* 6 Enlarged 3D Battle Arenas Selection + Component Clarity */}
      <section className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display ui-section-title font-bold text-[#F8FAFC]">
              ساحات المعارك الست الكبرى وتضاريسها التكتيكية
            </h2>
            <p className="text-sm text-[#94A3B8] mt-1">
              6 ساحات قتال موسّعة بقطر 96–120م تضم منصات مرتفعة (+12% ضرر)، بقع حمم وجليد ورون، محاريب دعم، ومهام ميدانية حية.
            </p>
          </div>
          <div className="text-xs text-[#94A3B8] flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#E6B85C]" />
            <span>
              الساحة المختارة: <strong className="text-[#F8FAFC]">{arena.name}</strong> (قطر{' '}
              <span className="font-mono-num text-[#E6B85C]">{Math.round(arena.radius * 2)}م</span>)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 landscape-grid-2 gap-4 sm:gap-5">
          {ARENA_LIST.map((item) => {
            const isSelected = selectedArena === item.id;
            const bonusPct = Math.round((item.rewardMultiplier - 1) * 100);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectArena(item.id)}
                className={`group text-right rounded-xl overflow-hidden border transition-all flex flex-col cursor-pointer ${
                  isSelected
                    ? 'border-[#E6B85C] bg-[#17243D] shadow-[0_0_24px_-8px_rgba(230,184,92,0.35)]'
                    : 'isekai-card hover:border-[#38BDF8]/40'
                }`}
              >
                <div className="relative aspect-video w-full overflow-hidden bg-[#1B2230]">
                  {!imgErrors[item.id] ? (
                    <img
                      src={item.imagePath}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      onError={() => setImgErrors((prev) => ({ ...prev, [item.id]: true }))}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-sm font-display font-bold text-white/80"
                      style={{
                        background: `linear-gradient(135deg, ${item.skyMid}, ${item.skyHorizon})`,
                      }}
                    >
                      {item.name}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B101D]/95 via-[#0B101D]/30 to-transparent" />
                  <div className="absolute bottom-3 inset-x-3 flex items-center justify-between text-xs">
                    <span className="font-display font-bold text-sm text-white">{item.name}</span>
                    <span className="font-mono-num text-[#E6B85C] font-semibold">
                      {bonusPct > 0 ? `+${bonusPct}% غنائم` : 'قياسي'}
                    </span>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-2.5">
                  <p className="text-xs text-[#9AA6B8] leading-relaxed">{item.description}</p>
                  <div className="text-[11px] text-[#7B889C] flex flex-wrap items-center gap-x-2 gap-y-1 pt-1.5 border-t border-white/5">
                    <span className="text-[#E6B85C] font-mono-num">قطر {Math.round(item.radius * 2)}م</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.platforms.length} منصات</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.terrainZones.length} تضاريس</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.shrines.length} محاريب</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Arena Detailed Map & 3D Component Breakdown */}
        <div className="isekai-panel rounded-2xl p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 landscape-split-12 gap-4 sm:gap-6 items-center">
          <div className="lg:col-span-4 landscape-span-4 flex flex-col items-center justify-center bg-[#0B1220] border border-white/10 rounded-xl p-3 sm:p-4 space-y-2.5 sm:space-y-3">
            <div className="w-full flex items-center justify-between text-xs text-[#94A3B8]">
              <span className="flex items-center gap-1.5 font-semibold text-[#F8FAFC]">
                <Compass className="w-3.5 h-3.5 text-[#E6B85C]" />
                خريطة تضاريس الساحة
              </span>
              <span className="font-mono-num">نصف القطر {arena.radius}م</span>
            </div>

            <svg
              viewBox={`${-(arena.radius + 4)} ${-(arena.radius + 4)} ${(arena.radius + 4) * 2} ${(arena.radius + 4) * 2}`}
              className="w-48 h-48 landscape-svg-compact overflow-visible"
              aria-label={`مخطط ساحة ${arena.name}`}
            >
              <circle cx={0} cy={0} r={arena.radius + 2.2} fill={arena.platformWall} stroke="rgba(255,255,255,0.08)" strokeWidth={0.9} />
              <circle cx={0} cy={0} r={arena.radius} fill={arena.floorMain} stroke={arena.floorTrim} strokeWidth={1.1} />
              <circle cx={0} cy={0} r={arena.radius * 0.65} fill="none" stroke={arena.floorTrim} strokeOpacity={0.25} strokeWidth={0.6} strokeDasharray="2 2" />
              <circle cx={0} cy={0} r={arena.radius * 0.32} fill={arena.floorAlt} stroke={arena.floorTrim} strokeOpacity={0.35} strokeWidth={0.6} />

              {arena.terrainZones.map((tz) => (
                <g key={tz.id} transform={`translate(${tz.x}, ${tz.z})`}>
                  <circle r={tz.radius} fill={tz.color} fillOpacity={0.25} stroke={tz.color} strokeWidth={0.6} strokeDasharray="1.8 1.4" />
                </g>
              ))}

              {arena.platforms.map((pl) => (
                <g key={pl.id} transform={`translate(${pl.x}, ${pl.z})`}>
                  <circle r={pl.radius} fill={pl.color} stroke={pl.trimColor} strokeWidth={0.8} />
                </g>
              ))}

              {arena.arches.map((arch, idx) => (
                <g key={idx} transform={`translate(${arch.x}, ${arch.z}) rotate(${(arch.rotY * 180) / Math.PI})`}>
                  <rect
                    x={-arch.width / 2}
                    y={-1.2}
                    width={arch.width}
                    height={2.4}
                    rx={0.6}
                    fill={arena.pillarAccent}
                    fillOpacity={0.85}
                  />
                </g>
              ))}

              {arena.pillars.map((p, idx) => (
                <circle
                  key={idx}
                  cx={p.x}
                  cy={p.z}
                  r={Math.max(1.8, p.radius)}
                  fill={arena.pillarColor}
                  stroke={arena.pillarAccent}
                  strokeWidth={0.7}
                />
              ))}

              {arena.shrines.map((s) => (
                <g key={s.id} transform={`translate(${s.x}, ${s.z})`}>
                  <circle r={3.4} fill={s.color} fillOpacity={0.22} />
                  <circle r={1.8} fill={s.color} stroke="#FFFFFF" strokeWidth={0.45} />
                </g>
              ))}

              <circle cx={0} cy={0} r={1.3} fill="#F2F4F8" fillOpacity={0.85} />
            </svg>

            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-[#94A3B8]">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#10B981]" /> استشفاء
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#38BDF8]" /> طاقة / صقيع
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#E6B85C]" /> غضب / مرتفع
              </span>
            </div>
          </div>

          <div className="lg:col-span-8 landscape-span-8 space-y-3 sm:space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
              <div>
                <h3 className="font-display text-xl font-bold text-[#F8FAFC]">
                  مكونات ساحة «{arena.name}»
                </h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">{arena.subtitle}</p>
              </div>
              <div className="text-xs text-[#94A3B8]">
                مكافآت الساحة:{' '}
                <strong className="text-[#E6B85C] font-mono-num">
                  +{Math.round((arena.rewardMultiplier - 1) * 100)}% غنائم وذهب
                </strong>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {arena.componentsSummary.map((comp, i) => (
                <div
                  key={i}
                  className="bg-[#0B1220] border border-white/10 rounded-lg p-4 space-y-1.5"
                >
                  <div className="font-display text-sm font-bold text-[#E6B85C]">{comp.title}</div>
                  <p className="text-xs text-[#94A3B8] leading-relaxed">{comp.detail}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-[#94A3B8]">
              <span>
                التضاريس الخاصة:{' '}
                <strong className="text-[#F8FAFC]">
                  {arena.terrainZones.map((t) => t.label).join(' · ') || 'ساحة متوازنة'}
                </strong>
              </span>
              <span className="font-mono-num text-[#10B981]">
                {arena.platforms.length} منصات مرتفعة · {arena.pillars.length} أعمدة · قطر {Math.round(arena.radius * 2)}م
              </span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

