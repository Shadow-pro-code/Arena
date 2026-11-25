import React, { useEffect, useMemo, useState } from 'react';
import {
  Eye,
  Gamepad2,
  Keyboard,
  Monitor,
  RotateCcw,
  Sliders,
  Smartphone,
  Sparkles,
  X,
} from 'lucide-react';
import type {
  GraphicsQuality,
  HudCustomizationConfig,
  HudWidgetVisibility,
  KeyActionId,
  KeyBindingsConfig,
  MobileLayoutPreset,
  RenderEngineMode,
} from '../types/game';
import {
  DEFAULT_HUD_CONFIG,
  DEFAULT_KEY_BINDINGS,
  KEY_ACTION_LABELS,
  QUALITY_LEVELS,
  RENDER_ENGINE_OPTIONS,
  formatKeyCodeLabel,
} from '../data/controlDefaults';
import { detectWebGLCapability } from '../engine/webglCapability';

interface HudCustomizerModalProps {
  open: boolean;
  onClose: () => void;
  renderEngine: RenderEngineMode;
  onChangeRenderEngine: (mode: RenderEngineMode) => void;
  quality: GraphicsQuality;
  onChangeQuality: (q: GraphicsQuality) => void;
  hudConfig: HudCustomizationConfig;
  onChangeHudConfig: (next: HudCustomizationConfig) => void;
  onResetHudConfig: () => void;
  keyBindings: KeyBindingsConfig;
  onChangeKeyBindings: (next: KeyBindingsConfig) => void;
  onResetKeyBindings: () => void;
}

type CustomizerTab = 'engine' | 'hud' | 'keys' | 'mobile';

const WIDGET_LABELS: { id: keyof HudWidgetVisibility; label: string; desc: string }[] = [
  { id: 'radar', label: 'الرادار والبوصلة', desc: 'خريطة الأعداء والمزارات والكنوز المصغرة' },
  { id: 'mission', label: 'مربع المهمة الحية', desc: 'تتبع هدف الموجة أو العقد الجانبي' },
  { id: 'biomeStrip', label: 'شريط الإقليم والمقاطع', desc: 'اسم المنطقة والأحداث في العالم المفتوح' },
  { id: 'fps', label: 'مؤشر الأداء (FPS)', desc: 'عداد الإطارات ونوع المحرك النشط' },
  { id: 'controlsHint', label: 'تلميحات الأزرار', desc: 'شريط الاختصارات أسفل الشاشة للحاسوب' },
  { id: 'floatingDamage', label: 'أرقام الضرر العائمة', desc: 'عرض الضرر والضربات الحاسمة والشفاء فوق الأهداف' },
  { id: 'bossBar', label: 'شريط صحة الزعيم / الخصم', desc: 'الشريط العلوي للزعماء ومنافسي الساحة' },
];

const MOBILE_PRESETS: { id: MobileLayoutPreset; label: string; desc: string }[] = [
  { id: 'standard', label: 'قياسي متوازن', desc: 'موضع مثالي لمعظم الهواتف والأجهزة اللوحية' },
  { id: 'compact', label: 'مضغوط للشاشات الصغيرة', desc: 'أقرب للحواف لفتح مساحة أكبر للرؤية' },
  { id: 'spread', label: 'موزّع واسع', desc: 'تباعد مريح للأصابع للأجهزة العريضة والأفقية' },
];

export const HudCustomizerModal: React.FC<HudCustomizerModalProps> = ({
  open,
  onClose,
  renderEngine,
  onChangeRenderEngine,
  quality,
  onChangeQuality,
  hudConfig,
  onChangeHudConfig,
  onResetHudConfig,
  keyBindings,
  onChangeKeyBindings,
  onResetKeyBindings,
}) => {
  const [tab, setTab] = useState<CustomizerTab>('engine');
  const [listeningAction, setListeningAction] = useState<KeyActionId | null>(null);
  const [keyNotice, setKeyNotice] = useState<string>('');

  const webglCap = useMemo(() => detectWebGLCapability(), []);

  useEffect(() => {
    if (!open) {
      setListeningAction(null);
      setKeyNotice('');
    }
  }, [open]);

  useEffect(() => {
    if (!listeningAction) return;
    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === 'Escape') {
        setListeningAction(null);
        setKeyNotice('تم إلغاء التعيين.');
        return;
      }
      const next = { ...keyBindings, [listeningAction]: e.code };
      // Clear duplicate on another action if present
      for (const k of Object.keys(next) as KeyActionId[]) {
        if (k !== listeningAction && next[k] === e.code) {
          next[k] = keyBindings[listeningAction] || DEFAULT_KEY_BINDINGS[k];
          setKeyNotice(`تم تبديل المفتاح ${formatKeyCodeLabel(e.code)} تلقائياً لتجنّب التعارض.`);
          break;
        } else {
          setKeyNotice(`تم تعيين ${formatKeyCodeLabel(e.code)} بنجاح.`);
        }
      }
      onChangeKeyBindings(next);
      setListeningAction(null);
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [listeningAction, keyBindings, onChangeKeyBindings]);

  if (!open) return null;

  const updateWidget = (id: keyof HudWidgetVisibility, val: boolean) => {
    onChangeHudConfig({
      ...hudConfig,
      widgets: { ...hudConfig.widgets, [id]: val },
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#050811]/92 flex flex-col p-1.5 sm:p-4 overflow-y-auto overscroll-contain"
      dir="rtl"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="m-auto w-full max-w-3xl max-h-full landscape-modal-card flex flex-col bg-[#0B1120] border border-cyan-400/40 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="landscape-modal-header flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0F172A] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-cyan-500/15 border border-cyan-400/35 flex items-center justify-center text-cyan-300 shrink-0">
              <Sliders className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm sm:text-lg text-white leading-tight">
                تخصيص الرسوميات والواجهة والتحكم
              </h3>
              <p className="landscape-modal-subtitle text-[11px] text-slate-400">
                اضبط محرك العرض، جودة «المستحيلة»، عناصر الشاشة، وأزرار الحاسوب والهاتف فوراً
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-slate-300 shrink-0 cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="landscape-modal-tabs flex flex-nowrap items-center gap-1.5 px-3 py-2.5 bg-[#090E1B] border-b border-white/10 overflow-x-auto no-scrollbar shrink-0">
          {[
            { id: 'engine' as const, label: 'المحرك والجودة', icon: Monitor },
            { id: 'hud' as const, label: 'واجهة القتال', icon: Eye },
            { id: 'keys' as const, label: 'أزرار الحاسوب', icon: Keyboard },
            { id: 'mobile' as const, label: 'تخطيط الهاتف', icon: Smartphone },
          ].map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center justify-center gap-1.5 py-1.5 sm:py-2 px-3 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition cursor-pointer ${
                  active
                    ? 'bg-cyan-500/20 border border-cyan-400/50 text-cyan-200'
                    : 'bg-white/5 border border-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Content */}
        <div className="landscape-modal-body flex-1 min-h-0 overflow-y-auto overscroll-contain p-3.5 sm:p-5 space-y-4 sm:space-y-5">
          {tab === 'engine' && (
            <>
              {/* GPU Probe Status Card */}
              <div className="p-3.5 rounded-xl bg-[#0F192E] border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    كشف قدرات الجهاز الحالي
                  </div>
                  <div className="text-[11px] text-slate-300 mt-1">
                    {webglCap.supported
                      ? `يدعم WebGL ${webglCap.version}.0 (${webglCap.isSoftwareGl ? 'معالج برمجي — الوضع التلقائي يُفضّل الخفيف' : 'بطاقة رسوميات فعلية جاهزة'})`
                      : 'المتصفح لا يوفر WebGL — المحرك الخفيف يعمل تلقائياً'}
                  </div>
                </div>
                <span
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-bold border self-start sm:self-auto ${
                    webglCap.supported && !webglCap.isSoftwareGl
                      ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
                      : 'bg-amber-500/15 border-amber-400/40 text-amber-200'
                  }`}
                >
                  {webglCap.rendererName.slice(0, 32)}
                </span>
              </div>

              {/* Independent Render Engine Toggle */}
              <div>
                <div className="text-xs font-bold text-slate-200 mb-2">
                  محرك الرسوميات (مستقل عن مستوى الجودة)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {RENDER_ENGINE_OPTIONS.map((opt) => {
                    const selected = renderEngine === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => onChangeRenderEngine(opt.id)}
                        className={`text-right p-3 rounded-xl border transition ${
                          selected
                            ? 'bg-cyan-500/15 border-cyan-400 text-white'
                            : 'bg-white/5 border-white/10 text-slate-300 hover:border-white/25'
                        }`}
                      >
                        <div className="font-bold text-sm">{opt.label}</div>
                        <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">{opt.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quality Levels including Impossible */}
              <div>
                <div className="text-xs font-bold text-slate-200 mb-2">
                  مستوى الجودة والتفاصيل (يشمل «الجودة المستحيلة»)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {QUALITY_LEVELS.map((q) => {
                    const active = quality === q.id;
                    const isImp = q.id === 'impossible';
                    return (
                      <button
                        key={q.id}
                        onClick={() => onChangeQuality(q.id)}
                        className={`text-right p-3 rounded-xl border transition ${
                          active
                            ? isImp
                              ? 'bg-gradient-to-br from-amber-500/25 via-rose-500/15 to-cyan-500/20 border-amber-400 text-amber-100'
                              : 'bg-cyan-500/20 border-cyan-400 text-white'
                            : isImp
                              ? 'bg-amber-500/5 border-amber-400/30 text-amber-200 hover:border-amber-400/60'
                              : 'bg-white/5 border-white/10 text-slate-300 hover:border-white/25'
                        }`}
                      >
                        <div className="font-bold text-sm flex items-center justify-between gap-1">
                          <span>{q.label}</span>
                          {isImp && <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 leading-snug">{q.shortDesc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {tab === 'hud' && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
                <div>
                  <div className="font-bold text-sm">الوضع السينمائي الصافي (Zen Mode)</div>
                  <div className="text-[11px] text-slate-400">
                    يُخفي كافة عناصر الواجهة أثناء القتال للرؤية الكاملة (يمكن تبديله بمفتاح {formatKeyCodeLabel(keyBindings.toggleHud)})
                  </div>
                </div>
                <button
                  onClick={() => onChangeHudConfig({ ...hudConfig, zenMode: !hudConfig.zenMode })}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border ${
                    hudConfig.zenMode
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                      : 'bg-white/10 border-white/15 text-slate-300'
                  }`}
                >
                  {hudConfig.zenMode ? 'مُفعّل (مخفي)' : 'مُعطّل (ظاهر)'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex justify-between text-xs font-bold mb-2">
                    <span>حجم عناصر الواجهة</span>
                    <span className="font-mono text-cyan-300">{Math.round(hudConfig.hudScale * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.75}
                    max={1.25}
                    step={0.05}
                    value={hudConfig.hudScale}
                    onChange={(e) =>
                      onChangeHudConfig({ ...hudConfig, hudScale: Number(e.target.value) })
                    }
                    className="w-full accent-cyan-400"
                  />
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex justify-between text-xs font-bold mb-2">
                    <span>شفافية اللوحات</span>
                    <span className="font-mono text-cyan-300">{Math.round(hudConfig.hudOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.45}
                    max={1}
                    step={0.05}
                    value={hudConfig.hudOpacity}
                    onChange={(e) =>
                      onChangeHudConfig({ ...hudConfig, hudOpacity: Number(e.target.value) })
                    }
                    className="w-full accent-cyan-400"
                  />
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex justify-between text-xs font-bold mb-2">
                    <span>حساسية الكاميرا والسحب</span>
                    <span className="font-mono text-cyan-300">
                      {Math.round((hudConfig.cameraSensitivity ?? 1) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={2}
                    step={0.1}
                    value={hudConfig.cameraSensitivity ?? 1}
                    onChange={(e) =>
                      onChangeHudConfig({ ...hudConfig, cameraSensitivity: Number(e.target.value) })
                    }
                    className="w-full accent-cyan-400"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-200">إظهار / إخفاء أدوات الشاشة</span>
                  <button
                    onClick={onResetHudConfig}
                    className="text-[11px] flex items-center gap-1 text-cyan-300 hover:text-cyan-200"
                  >
                    <RotateCcw className="w-3 h-3" />
                    استعادة الافتراضي
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {WIDGET_LABELS.map((w) => {
                    const checked = hudConfig.widgets[w.id];
                    return (
                      <button
                        key={w.id}
                        onClick={() => updateWidget(w.id, !checked)}
                        className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border text-right ${
                          checked
                            ? 'bg-cyan-500/12 border-cyan-400/45 text-white'
                            : 'bg-white/5 border-white/10 text-slate-400'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold">{w.label}</div>
                          <div className="text-[10px] text-slate-400">{w.desc}</div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            checked ? 'bg-cyan-400 text-slate-950' : 'bg-white/10 text-slate-400'
                          }`}
                        >
                          {checked ? 'ظاهر' : 'مخفي'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {tab === 'keys' && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-slate-300">
                  انقر على أي إجراء ثم اضغط المفتاح المطلوب من لوحة المفاتيح (أو Esc للإلغاء).
                </div>
                <button
                  onClick={() => {
                    onResetKeyBindings();
                    setKeyNotice('تمت استعادة الاختصارات الافتراضية.');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  استعادة الافتراضي
                </button>
              </div>

              {keyNotice && (
                <div className="px-3 py-2 rounded-lg bg-cyan-500/15 border border-cyan-400/40 text-xs text-cyan-200">
                  {keyNotice}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {KEY_ACTION_LABELS.map((item) => {
                  const isListening = listeningAction === item.id;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10"
                    >
                      <div className="text-xs font-bold text-slate-200">{item.label}</div>
                      <button
                        onClick={() => {
                          setListeningAction(item.id);
                          setKeyNotice('بانتظار ضغط مفتاح جديد...');
                        }}
                        className={`min-w-[82px] px-2.5 py-1 rounded-lg font-mono text-xs font-bold border transition ${
                          isListening
                            ? 'bg-amber-500 text-slate-950 border-amber-300'
                            : 'bg-[#0F172A] text-cyan-200 border-cyan-400/35 hover:border-cyan-300'
                        }`}
                      >
                        {isListening ? 'اضغط مفتاح...' : formatKeyCodeLabel(keyBindings[item.id])}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {tab === 'mobile' && (
            <>
              <div>
                <div className="text-xs font-bold text-slate-200 mb-2">قالب توزيع أزرار اللمس</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {MOBILE_PRESETS.map((p) => {
                    const active = hudConfig.mobilePreset === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => onChangeHudConfig({ ...hudConfig, mobilePreset: p.id })}
                        className={`text-right p-3 rounded-xl border transition ${
                          active
                            ? 'bg-cyan-500/20 border-cyan-400 text-white'
                            : 'bg-white/5 border-white/10 text-slate-300 hover:border-white/25'
                        }`}
                      >
                        <div className="font-bold text-sm">{p.label}</div>
                        <div className="text-[11px] text-slate-400 mt-1">{p.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="flex items-center gap-1.5">
                    <Gamepad2 className="w-4 h-4 text-cyan-300" />
                    حجم أزرار القتال والقفز للهاتف
                  </span>
                  <span className="font-mono text-cyan-300">
                    {Math.round(hudConfig.mobileButtonsScale * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.75}
                  max={1.3}
                  step={0.05}
                  value={hudConfig.mobileButtonsScale}
                  onChange={(e) =>
                    onChangeHudConfig({
                      ...hudConfig,
                      mobileButtonsScale: Number(e.target.value),
                    })
                  }
                  className="w-full accent-cyan-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                  <div className="text-xs font-bold text-cyan-200">
                    إزاحة عصا الحركة ({hudConfig.joystickOffset.x}px , {hudConfig.joystickOffset.y}px)
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span>أفقي:</span>
                    <input
                      type="range"
                      min={-60}
                      max={60}
                      step={4}
                      value={hudConfig.joystickOffset.x}
                      onChange={(e) =>
                        onChangeHudConfig({
                          ...hudConfig,
                          joystickOffset: { ...hudConfig.joystickOffset, x: Number(e.target.value) },
                        })
                      }
                      className="flex-1 accent-cyan-400"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span>رأسي:</span>
                    <input
                      type="range"
                      min={-60}
                      max={60}
                      step={4}
                      value={hudConfig.joystickOffset.y}
                      onChange={(e) =>
                        onChangeHudConfig({
                          ...hudConfig,
                          joystickOffset: { ...hudConfig.joystickOffset, y: Number(e.target.value) },
                        })
                      }
                      className="flex-1 accent-cyan-400"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                  <div className="text-xs font-bold text-amber-200">
                    إزاحة مجموعة أزرار القتال ({hudConfig.actionsOffset.x}px , {hudConfig.actionsOffset.y}px)
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span>أفقي:</span>
                    <input
                      type="range"
                      min={-60}
                      max={60}
                      step={4}
                      value={hudConfig.actionsOffset.x}
                      onChange={(e) =>
                        onChangeHudConfig({
                          ...hudConfig,
                          actionsOffset: { ...hudConfig.actionsOffset, x: Number(e.target.value) },
                        })
                      }
                      className="flex-1 accent-amber-400"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span>رأسي:</span>
                    <input
                      type="range"
                      min={-60}
                      max={60}
                      step={4}
                      value={hudConfig.actionsOffset.y}
                      onChange={(e) =>
                        onChangeHudConfig({
                          ...hudConfig,
                          actionsOffset: { ...hudConfig.actionsOffset, y: Number(e.target.value) },
                        })
                      }
                      className="flex-1 accent-amber-400"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={() =>
                  onChangeHudConfig({
                    ...hudConfig,
                    mobilePreset: DEFAULT_HUD_CONFIG.mobilePreset,
                    mobileButtonsScale: 1,
                    joystickOffset: { x: 0, y: 0 },
                    actionsOffset: { x: 0, y: 0 },
                  })
                }
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                إعادة ضبط أزرار الهاتف
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="landscape-modal-footer px-4 py-3 border-t border-white/10 bg-[#0F172A] flex items-center justify-between gap-2 shrink-0">
          <span className="text-[11px] text-slate-400 truncate">
            يُحفظ التخصيص تلقائياً في ملفك ويُطبق فوراً أثناء القتال
          </span>
          <button
            onClick={onClose}
            className="px-5 py-1.5 sm:py-2 rounded-xl bg-gradient-to-l from-cyan-500 to-blue-600 text-white text-xs font-black shadow-lg shrink-0"
          >
            تم والحفظ
          </button>
        </div>
      </div>
    </div>
  );
};
